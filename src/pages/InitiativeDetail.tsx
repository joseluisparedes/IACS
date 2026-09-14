import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertTriangle, Pencil, Save, Send, X, Ban, Clock, Paperclip, FileText, Image as ImageIcon, Loader2, AlertCircle, ChevronDown, ChevronRight, Check, HelpCircle, Eye, Calendar, Video as VideoIcon, Music as AudioIcon, Volume2, Building2, Building, MapPin, User, MessageSquare, Sparkles, ShieldCheck, FileCheck2, FileSignature, Lock, Copy, Layers, Target, Cpu, UserCheck, Info, Calculator, GitBranch, Upload, Trash2, Archive } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "../lib/utils";
import { ExecutiveReportPDF } from "../components/ExecutiveReportPDF";
import { useReactToPrint } from "react-to-print";
import type { StageForm, StageConsent, InitiativeStageRecord } from "../types";
import { DEFAULT_OBSERVATION_CATEGORIES } from "../components/workflow/NodeConfigPanel";


const STATUS_STYLE: Record<string, string> = {
  "Pendiente de aprobación": "bg-[#EEF2FF] text-[#4F5AF5]",
  "Observada": "bg-amber-50 text-amber-700",
  "En demanda": "bg-emerald-50 text-emerald-700",
  "Desestimada": "bg-red-50 text-red-700",
  "Borrador": "bg-[#F1F5F9] text-[#64748B]",
};

const LABEL_MAP: Record<string, string> = {
  "direccion": "Dirección",
  "institucion": "Institución",
  "descripcion_de_la_necesidad": "Descripción de la Necesidad",
  "proceso_y_areas_impactadas": "Proceso y Áreas Impactadas",
  "beneficio_cuantitativo_anual": "Beneficio Cuantitativo Anual",
  "es_necesidad_spo": "Es Necesidad SPO",
  "registrador": "Key user",
  "fecha_requerida": "Fecha Requerida",
  "vicepresidencia": "Vicepresidencia",
  "_vobo_status": "Visto Bueno (VoBo)",
  "bp_ti_asignado": "Business Partner TI Asignado"
};

// ─── Date Input with DD/MM/YYYY Display ──────────────────────────────────────
function DateInputDDMMYYYY({
  value,
  onChange,
  onBlur,
  disabled,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  const toDDMMYYYY = (val: string): string => {
    if (!val) return "";
    const trimmed = val.trim();
    const ymd = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (ymd) {
      return `${ymd[3].padStart(2, "0")}/${ymd[2].padStart(2, "0")}/${ymd[1]}`;
    }
    const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmy) {
      return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`;
    }
    return trimmed;
  };

  const toYYYYMMDD = (val: string): string => {
    if (!val) return "";
    const trimmed = val.trim();
    const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    const ymd = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }
    return "";
  };

  const displayVal = toDDMMYYYY(value);
  const isoVal = toYYYYMMDD(value);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickerVal = e.target.value;
    if (pickerVal) {
      const formatted = toDDMMYYYY(pickerVal);
      onChange(formatted);
      if (onBlur) onBlur(formatted);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formatted = toDDMMYYYY(e.target.value);
    onChange(formatted);
    if (onBlur) onBlur(formatted);
  };

  const openCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hiddenDateRef.current && !disabled) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        try {
          hiddenDateRef.current.showPicker();
        } catch {
          hiddenDateRef.current.focus();
          hiddenDateRef.current.click();
        }
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={displayVal}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder="dd/mm/aaaa"
        disabled={disabled}
        className={`${className || ''} pr-10`}
      />
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50 p-1 rounded hover:bg-slate-100 transition-colors"
        title="Seleccionar fecha del calendario"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={isoVal}
        onChange={handleNativeChange}
        tabIndex={-1}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
      />
    </div>
  );
}

function formatLabel(k: string, fieldsMap: Record<string, string> = {}) {
  const normalizedKey = k.toLowerCase();
  if (fieldsMap && fieldsMap[normalizedKey]) {
    return fieldsMap[normalizedKey];
  }
  if (LABEL_MAP[normalizedKey]) {
    return LABEL_MAP[normalizedKey];
  }
  if (k === k.toUpperCase() || k.includes('_')) {
    return k.replace(/_/g, ' ');
  }
  return k.replace(/([A-Z])/g, ' $1').trim();
}

// ─── Force Download Helper ───────────────────────────────────────────────────
const handleForceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading file:", error);
    // Fallback: open in a new tab if fetch/blob fails (e.g. CORS block fallback)
    window.open(url, '_blank');
  }
};

// ─── MultiSelect Dropdown ───────────────────────────────────────────────────────
function MultiSelectDropdown({ options, selected, onChange, disabled, placeholder = "Selecciona opciones..." }: { options: string[], selected: string[], onChange: (val: string[]) => void, disabled?: boolean, placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (disabled) return;
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange(next);
  };

  const removeOption = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selected.filter(s => s !== opt));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full border bg-white rounded-xl px-3.5 py-2 text-sm text-[#1E293B] cursor-pointer min-h-[44px] flex items-center justify-between transition-all duration-200 shadow-xs ${
          isOpen
            ? "border-[#EB5F46] ring-2 ring-[#EB5F46]/20 bg-white"
            : "border-[#E2E8F0] hover:border-[#CBD5E1]"
        } ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed opacity-60" : ""}`}
      >
        <div className="flex flex-wrap gap-1.5 max-w-[90%] items-center">
          {selected.length === 0 ? (
            <span className="text-[#94A3B8] select-none text-xs font-normal">{placeholder}</span>
          ) : (
            selected.map(opt => (
              <span
                key={opt}
                className="flex items-center gap-1.5 bg-[#FFF0ED] border border-[#FCD9D2] text-[#EB5F46] text-xs px-2.5 py-1 rounded-lg font-semibold shadow-xs animate-in zoom-in-95 duration-150"
              >
                <span>{opt}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(e, opt)}
                    className="hover:bg-[#EB5F46]/20 text-[#EB5F46] rounded-md p-0.5 transition-colors"
                    title={`Remover ${opt}`}
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#EB5F46]" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 mt-2 bg-white/98 backdrop-blur-md border border-[#E2E8F0] rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.14)] max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="text-xs text-[#94A3B8] p-4 text-center">No hay opciones disponibles</div>
          ) : (
            options.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl transition-all duration-150 text-left font-medium ${
                    isSelected
                      ? "text-[#EB5F46] bg-[#FFF0ED] font-semibold"
                      : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#EB5F46] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#CBD5E1] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Row({ 
  label, 
  value, 
  isEditMode, 
  editValue, 
  onChange, 
  fieldConfig,
  suggestedValue,
  onAccept,
  onReject,
  isConfirmed = false,
  editConfirmed = false,
  onConfirmedChange
}: any) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isList = Array.isArray(value);

  // Parse if it's a file JSON string
  let fileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (typeof value === "string" && value.startsWith('{"name":')) {
    try {
      fileObj = JSON.parse(value);
    } catch (e) {}
  }

  let editFileObj: { name: string; content?: string; url?: string } | null = null;
  if (typeof editValue === "string" && editValue.startsWith('{"name":')) {
    try {
      editFileObj = JSON.parse(editValue);
    } catch (e) {}
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);

    let typeKey: 'pdf' | 'docx' | 'txt' | 'image' = 'txt';
    const name = file.name.toLowerCase();
    const mime = file.type;

    if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
    else if (mime.startsWith('image/')) typeKey = 'image';

    const fileTypes = fieldConfig?.options?.fileTypes || {
      pdf: { enabled: true, maxMb: 1.0 },
      docx: { enabled: true, maxMb: 1.0 },
      txt: { enabled: true, maxMb: 1.0 },
      image: { enabled: true, maxMb: 1.0 }
    };

    const config = fileTypes[typeKey] || { enabled: true, maxMb: 1.0 };
    if (!config.enabled) {
      setUploadError(`La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`);
      return;
    }

    const limitBytes = config.maxMb * 1024 * 1024;
    if (file.size > limitBytes) {
      setUploadError(`El archivo supera el límite permitido de ${config.maxMb} MB.`);
      return;
    }

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) {
      setUploadError('Formato no soportado. Usa PDF, DOCX, TXT o imágenes.');
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onChange(JSON.stringify({ 
        name: (file as any).originalname || file.name, 
        content: data.content, 
        url: data.url, 
        type: data.type || file.type 
      }));
    } catch (err: any) {
      setUploadError('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadError(null);
  };

  const displayValue = fileObj ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 w-fit">
        {fileObj.name.toLowerCase().endsWith('.png') || fileObj.name.toLowerCase().endsWith('.jpg') || fileObj.name.toLowerCase().endsWith('.jpeg') || fileObj.name.toLowerCase().endsWith('.webp') ? (
          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        )}
        <span className="text-xs font-semibold text-[#334155]">{fileObj.name}</span>
        {(fileObj.content || fileObj.url) && (
          <button 
            type="button" 
            onClick={() => setIsPreviewOpen(true)}
            className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold ml-2 underline underline-offset-2 bg-transparent border-0 cursor-pointer p-0"
          >
            Vista preliminar
          </button>
        )}
        {fileObj.url && (
          <button 
            type="button"
            onClick={() => handleForceDownload(fileObj!.url!, fileObj!.name)}
            className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold ml-2 underline underline-offset-2 bg-transparent border-0 cursor-pointer p-0"
          >
            Descargar
          </button>
        )}
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
                {fileObj.name.toLowerCase().endsWith('.png') || fileObj.name.toLowerCase().endsWith('.jpg') || fileObj.name.toLowerCase().endsWith('.jpeg') || fileObj.name.toLowerCase().endsWith('.webp') ? (
                  <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                )}
                <span className="truncate max-w-lg">{fileObj.name}</span>
              </h3>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="text-[#94A3B8] hover:text-[#1E293B] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
              {fileObj.url && (fileObj.type?.startsWith("image/") || fileObj.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)) ? (
                <img src={fileObj.url} alt={fileObj.name} className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[#E2E8F0] shadow-sm bg-white" />
              ) : fileObj.url && (fileObj.type === "application/pdf" || fileObj.name.toLowerCase().endsWith(".pdf")) ? (
                <div className="w-full h-[60vh] flex flex-col space-y-4">
                  <iframe 
                    src={fileObj.url} 
                    title={fileObj.name} 
                    className="w-full h-full rounded-lg border border-[#E2E8F0] shadow-sm bg-white"
                  />
                </div>
              ) : (
                <div className="w-full bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-inner self-stretch">
                  {fileObj.content ? (
                    <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#334155]">{fileObj.content}</pre>
                  ) : (
                    <span className="text-sm text-slate-400">Sin vista previa disponible para este formato.</span>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
              {fileObj.url && (
                <button
                  onClick={() => {
                    handleForceDownload(fileObj!.url!, fileObj!.name);
                    setIsPreviewOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#4F5AF5] hover:bg-[#3F49E0] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Descargar
                </button>
              )}
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : isList ? (
    <ul className="space-y-2">
      {value.map((v: any, i: number) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-[#4F5AF5] mt-0.5 shrink-0">•</span>
          {v}
        </li>
      ))}
    </ul>
  ) : (
    fieldConfig?.field_type === 'date' || /fecha|date/i.test(fieldConfig?.key || '')
      ? formatDateDDMMYYYY(value)
      : (value || <span className="text-[#CBD5E1]">—</span>)
  );

  let displaySuggestedValue = suggestedValue;
  if (typeof suggestedValue === "string" && suggestedValue.startsWith('{"name":')) {
    try {
      const parsed = JSON.parse(suggestedValue);
      displaySuggestedValue = `📎 ${parsed.name}`;
    } catch (e) {}
  }

  let displayPastValue = isList ? displayValue : String(value);
  if (typeof value === "string" && value.startsWith('{"name":')) {
    try {
      const parsed = JSON.parse(value);
      displayPastValue = `📎 ${parsed.name}`;
    } catch (e) {}
  }

  return (
    <div className="flex gap-4 py-3 border-b border-[#F8FAFC] last:border-0 flex-col sm:flex-row">
      <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-full sm:w-56 shrink-0 mt-0.5 break-words flex items-center gap-1">
        <span className="align-middle">{label}</span>
        {fieldConfig?.help_text && (
          <span className="relative group inline-block align-middle cursor-help">
            <HelpCircle className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#64748B] transition-colors shrink-0" />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 p-2.5 bg-[#1E293B] text-white text-[10px] font-normal normal-case leading-normal rounded-lg shadow-lg z-[999] text-center">
              {fieldConfig.help_text}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E293B]" />
            </span>
          </span>
        )}
      </p>
      <div className="flex-1 space-y-3">
        {isEditMode ? (
          fieldConfig?.field_type === "file" ? (
            <div className="space-y-2">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept={[
                  fieldConfig.options?.fileTypes?.pdf?.enabled !== false && '.pdf',
                  fieldConfig.options?.fileTypes?.docx?.enabled !== false && '.docx',
                  fieldConfig.options?.fileTypes?.txt?.enabled !== false && '.txt',
                  fieldConfig.options?.fileTypes?.image?.enabled !== false && '.jpg,.jpeg,.png,.webp'
                ].filter(Boolean).join(',')} 
                className="hidden" 
                onChange={handleFileAttach} 
              />
              
              {editFileObj ? (
                <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2 w-full max-w-md">
                  {editFileObj.name.toLowerCase().endsWith('.png') || editFileObj.name.toLowerCase().endsWith('.jpg') || editFileObj.name.toLowerCase().endsWith('.jpeg') || editFileObj.name.toLowerCase().endsWith('.webp') ? (
                    <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{editFileObj.name}</span>
                  <button 
                    type="button" 
                    onClick={handleRemove} 
                    className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex items-center gap-2 w-full max-w-md border border-dashed border-[#CBD5E1] hover:border-[#4F5AF5] bg-slate-50 hover:bg-[#EEF2FF]/30 text-[#64748B] hover:text-[#4F5AF5] px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#4F5AF5] animate-spin" />
                      <span>Procesando archivo...</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4" />
                      <span>Subir archivo...</span>
                    </>
                  )}
                </button>
              )}

              {uploadError && (
                <div className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-100 max-w-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          ) : fieldConfig?.field_type === "select" ? (
            fieldConfig.allow_multiple ? (
              (() => {
                const selectedList = Array.isArray(editValue) ? editValue : (editValue ? [editValue] : []);
                return (
                  <MultiSelectDropdown
                    options={fieldConfig.options || []}
                    selected={selectedList}
                    onChange={(next) => onChange(next)}
                    placeholder="Seleccione..."
                  />
                );
              })()
            ) : (
              <select 
                value={editValue || ""} 
                onChange={e => onChange(e.target.value)}
                className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
              >
                <option value="">Seleccione...</option>
                {fieldConfig.options?.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )
          ) : fieldConfig?.field_type === "date" ? (
            <DateInputDDMMYYYY
              value={editValue || ""}
              onChange={onChange}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
            />
          ) : isList ? (
            <textarea
              value={Array.isArray(editValue) ? editValue.join('\n') : (editValue || "")}
              onChange={e => onChange(e.target.value.split('\n'))}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white min-h-[100px] outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
              placeholder="Un elemento por línea"
            />
          ) : (
            <textarea
              value={editValue || ""}
              onChange={e => onChange(e.target.value)}
              className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white min-h-[40px] outline-none focus:border-[#4F5AF5] focus:ring-1 focus:ring-[#4F5AF5]"
              rows={typeof editValue === 'string' && editValue.length > 80 ? 4 : 1}
            />
          )
        ) : (
          <div className="text-sm text-[#1E293B] break-words">
            {displayValue}
          </div>
        )}

        {suggestedValue !== undefined && !isEditMode && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Sugerencia de cambio (BP)
            </p>
            <div className="mb-3">
              <span className="line-through text-red-400 mr-2 text-xs">{typeof value === "string" && value.startsWith('{"name":') ? displayPastValue : (isList ? displayValue : String(value))}</span>
              <span className="text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded font-medium text-sm">
                {Array.isArray(displaySuggestedValue) ? (
                   <ul className="pl-4 mt-1 space-y-1 list-disc">
                     {displaySuggestedValue.map((v, i) => <li key={i}>{v}</li>)}
                   </ul>
                ) : String(displaySuggestedValue)}
              </span>
            </div>
            {onAccept && (
              <div className="flex gap-2">
                <button onClick={onAccept} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white rounded text-xs font-semibold">Aceptar cambio</button>
                <button onClick={onReject} className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-[#64748B] rounded text-xs font-semibold">Descartar</button>
              </div>
            )}
          </div>
        )}

        {fieldConfig?.requires_confirmation && (
          isEditMode ? (
            <div className={`mt-2 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${editConfirmed ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 shadow-sm shadow-emerald-100/50' : 'bg-amber-50/30 border-amber-200/60 text-[#64748B]'}`}>
              <input
                type="checkbox"
                id={`confirm-${fieldConfig.key}`}
                checked={editConfirmed || false}
                onChange={e => onConfirmedChange && onConfirmedChange(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor={`confirm-${fieldConfig.key}`} className="text-[11px] font-semibold leading-none cursor-pointer">
                Confirmo que la información de este campo es correcta
              </label>
            </div>
          ) : (
            <div className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${isConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isConfirmed ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirmado por el usuario</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Falta confirmación de usuario</span>
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function DiffModal({ snapshot, currentData, onClose, fieldsMap }: any) {
  const pastForm = snapshot.form_data || {};
  const pastSumm = snapshot.summary || {};
  const currForm = currentData.form_data || {};
  const currSumm = currentData.summary || {};

  const changedFormKeys = Object.keys(currForm).filter(k => 
    k !== "_suggested_changes" && k !== "_observation_history" &&
    JSON.stringify(pastForm[k]) !== JSON.stringify(currForm[k])
  );
  
  const changedSummKeys = Object.keys(currSumm).filter(k => 
    JSON.stringify(pastSumm[k]) !== JSON.stringify(currSumm[k])
  );

  const hasChanges = changedFormKeys.length > 0 || changedSummKeys.length > 0;

  const renderValue = (val: any) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "string" && val.startsWith('{"name":')) {
      try {
        const parsed = JSON.parse(val);
        return `📎 ${parsed.name}`;
      } catch (e) {}
    }
    return val || "—";
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-[#1E293B]">Comparar Versiones</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white flex-1 space-y-6">
          {!hasChanges ? (
            <p className="text-center text-slate-500 py-10">No hay diferencias entre esta versión pasada y la actual.</p>
          ) : (
            <>
              {changedFormKeys.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Datos del Formulario</h3>
                  <div className="space-y-4">
                    {changedFormKeys.map(k => (
                      <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{formatLabel(k, fieldsMap)}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-red-500 font-semibold mb-1 uppercase tracking-wider">Versión Pasada</p>
                            <div className="text-sm text-red-700 bg-red-50/50 p-3 rounded-lg border border-red-100 line-through">
                              {renderValue(pastForm[k])}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-semibold mb-1 uppercase tracking-wider">Versión Actual</p>
                            <div className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                              {renderValue(currForm[k])}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changedSummKeys.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Resumen y Clasificación</h3>
                  <div className="space-y-4">
                    {changedSummKeys.map(k => (
                      <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{formatLabel(k, fieldsMap)}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-red-500 font-semibold mb-1 uppercase tracking-wider">Versión Pasada</p>
                            <div className="text-sm text-red-700 bg-red-50/50 p-3 rounded-lg border border-red-100 line-through">
                              {renderValue(pastSumm[k])}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-semibold mb-1 uppercase tracking-wider">Versión Actual</p>
                            <div className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                              {renderValue(currSumm[k])}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export interface SubNodeDef {
  id: string;
  label: string;
  role: string;
}

export interface TimelineStageDef {
  key: string;
  label: string;
  subtitle: string;
  subNodes: SubNodeDef[];
}

const WORKFLOW_STAGES_TIMELINE: TimelineStageDef[] = [
  { 
    key: 'borrador', 
    label: '1. Registro', 
    subtitle: 'Key User',
    subNodes: [
      { id: 'borrador', label: '1. Ficha de Registro', role: 'Key User' }
    ]
  },
  { 
    key: 'eval_bp', 
    label: '2. Viabilidad BP TI', 
    subtitle: 'Business Partner',
    subNodes: [
      { id: 'eval_bp', label: '2. Viabilidad BP TI', role: 'BP TI' },
      { id: 'observada', label: 'Observación BP TI', role: 'BP TI' }
    ]
  },
  { 
    key: 'aprob_bo', 
    label: '3. Patrocinio BO', 
    subtitle: 'Business Owner',
    subNodes: [
      { id: 'aprob_bo', label: '3. Patrocinio BO', role: 'Business Owner' }
    ]
  },
  { 
    key: 'aprob_vp', 
    label: '4. Aprobación VP', 
    subtitle: 'Vicepresidencia',
    subNodes: [
      { id: 'aprob_vp', label: '4. Aprobación VP', role: 'VP Negocio' }
    ]
  },
  { 
    key: 'asig_demanda', 
    label: '5. Demanda TI', 
    subtitle: 'Gestor Demanda',
    subNodes: [
      { id: 'asig_demanda', label: '5. Asignación Gestor Demanda', role: 'Gestor Demanda' },
      { id: 'asig_dominio', label: 'Asignación Líder Dominio', role: 'Gestor Demanda' }
    ]
  },
  { 
    key: 'ventana_est', 
    label: '6. Estimación', 
    subtitle: 'Líder Dominio',
    subNodes: [
      { id: 'ventana_est', label: '6. Compromiso Estimación', role: 'Líder Dominio' },
      { id: 'est_con_presupuesto', label: '7A. Estimación con Presupuesto', role: 'Líder Dominio' },
      { id: 'est_sin_presupuesto', label: '7B. Estimación sin Presupuesto', role: 'Líder Dominio' },
      { id: 'val_est_bp', label: '8A. Validación Estimación BP', role: 'BP TI' },
      { id: 'vobo_est_bo', label: '8B. VoBo Estimación BO', role: 'Business Owner' }
    ]
  },
  { 
    key: 'planificacion', 
    label: '7. Planificación', 
    subtitle: 'Producción',
    subNodes: [
      { id: 'plan_fechas', label: '9. Planificación de Fechas', role: 'Líder Dominio' },
      { id: 'val_plan_bp', label: '10. Validación Planificación BP', role: 'BP TI' },
      { id: 'aprob_plan_bo', label: '11. Aprobación Final Fechas', role: 'Business Owner' },
      { id: 'planificacion', label: '12. Pase a Producción / Cartera', role: 'Gestor Demanda' }
    ]
  }
];

const STATUS_TO_NODE: Record<string, string> = {
  'Borrador': 'borrador',
  '1. Borrador': 'borrador',
  'Pendiente de aprobación': 'eval_bp',
  '2. Evaluación BP TI': 'eval_bp',
  '3. Aprobación BO': 'aprob_bo',
  '4. Aprobación VP': 'aprob_vp',
  '5. Asignación Gestor Demanda': 'asig_demanda',
  '5. Asignación de Dominio': 'asig_demanda',
  '5. Demanda TI': 'asig_demanda',
  '6. Ventana de Estimación': 'ventana_est',
  '6. Compromiso Estimación': 'ventana_est',
  '6. Estimación': 'ventana_est',
  '7. Planificación': 'planificacion',
  '7A. Estimación con Presupuesto': 'est_con_presupuesto',
  '7B. Estimación sin Presupuesto': 'est_sin_presupuesto',
  '8A. Validación Estimación BP': 'val_est_bp',
  '8B. VoBo Estimación BO': 'vobo_est_bo',
  '9. Planificación de Fechas': 'plan_fechas',
  '10. Validación Planificación BP': 'val_plan_bp',
  '10. Validación Planificación': 'val_plan_bp',
  '11. Aprobación Final Fechas': 'aprob_plan_bo',
  '12. Planificación': 'planificacion',
  'Observada': 'observada',
  '⚠️ Observada (Hub BP TI)': 'observada',
  'En demanda': 'asig_demanda',
  'Desestimada': 'desestimada',
  '🗄️ Desestimada': 'desestimada',
  'Fin': 'end',
  'fin': 'end',
  'Finalizado': 'end',
  'end': 'end',
};

const NODE_TO_TIMELINE_KEY: Record<string, string> = {
  // Step 1: Registro
  'borrador': 'borrador',
  '1. borrador': 'borrador',

  // Step 2: Viabilidad BP TI
  'eval_bp': 'eval_bp',
  '2. evaluación bp ti': 'eval_bp',
  'pendiente de aprobación': 'eval_bp',
  'observada': 'eval_bp',
  '⚠️ observada (hub bp ti)': 'eval_bp',

  // Step 3: Patrocinio BO
  'aprob_bo': 'aprob_bo',
  '3. aprobación bo': 'aprob_bo',

  // Step 4: Aprobación VP
  'aprob_vp': 'aprob_vp',
  '4. aprobación vp': 'aprob_vp',

  // Step 5: Demanda TI
  'asig_demanda': 'asig_demanda',
  'asig_dominio': 'asig_demanda',
  '5. asignación gestor demanda': 'asig_demanda',
  '5. asignación de dominio': 'asig_demanda',
  '5. demanda ti': 'asig_demanda',
  'en demanda': 'asig_demanda',

  // Step 6: Estimación
  'ventana_est': 'ventana_est',
  'gw_presupuesto': 'ventana_est',
  'est_con_presupuesto': 'ventana_est',
  'est_sin_presupuesto': 'ventana_est',
  'val_est_bp': 'ventana_est',
  'vobo_est_bo': 'ventana_est',
  'estimacion': 'ventana_est',
  '6. ventana de estimación': 'ventana_est',
  '6. compromiso estimación': 'ventana_est',
  '6. estimación': 'ventana_est',
  '7a. estimación con presupuesto': 'ventana_est',
  '7b. estimación sin presupuesto': 'ventana_est',
  '8a. validación estimación bp': 'ventana_est',
  '8b. vobo estimación bo': 'ventana_est',

  // Step 7: Planificación
  'planificacion': 'planificacion',
  'plan_fechas': 'planificacion',
  'val_plan_bp': 'planificacion',
  'aprob_plan_bo': 'planificacion',
  'produccion': 'planificacion',
  '9. planificación de fechas': 'planificacion',
  '10. validación planificación bp': 'planificacion',
  '10. validación planificación': 'planificacion',
  '11. aprobación final fechas': 'planificacion',
  '12. planificación': 'planificacion',
  '7. planificación': 'planificacion',
  'end': 'planificacion',
  'fin': 'planificacion',
};

function getTimelineStageKey(nodeId?: string, status?: string): string {
  const cleanNode = String(nodeId || '').toLowerCase().trim();
  const cleanStatus = String(status || '').toLowerCase().trim();

  // 0. End / Fin state mapping
  if (cleanNode === 'end' || cleanNode === 'fin' || cleanStatus === 'fin' || cleanStatus === 'finalizado') {
    return 'planificacion';
  }

  // 1. Direct match by node ID in NODE_TO_TIMELINE_KEY
  if (cleanNode && NODE_TO_TIMELINE_KEY[cleanNode]) {
    return NODE_TO_TIMELINE_KEY[cleanNode];
  }
  // 2. Direct match by status in NODE_TO_TIMELINE_KEY
  if (cleanStatus && NODE_TO_TIMELINE_KEY[cleanStatus]) {
    return NODE_TO_TIMELINE_KEY[cleanStatus];
  }
  // 3. Check STATUS_TO_NODE
  if (status && STATUS_TO_NODE[status]) {
    const fromStatus = STATUS_TO_NODE[status].toLowerCase();
    if (NODE_TO_TIMELINE_KEY[fromStatus]) return NODE_TO_TIMELINE_KEY[fromStatus];
  }

  // 4. Semantic fallback based on keywords
  const combined = `${cleanNode} ${cleanStatus}`;
  if (combined.includes('borrador') || combined.includes('registro')) return 'borrador';
  if (['eval_bp', 'bp ti', 'evaluación', 'viabilidad', 'observad'].some(k => combined.includes(k))) return 'eval_bp';
  if (['aprob_bo', 'patrocinio', 'business owner', ' bo'].some(k => combined.includes(k))) return 'aprob_bo';
  if (['aprob_vp', 'vicepresiden', ' vp'].some(k => combined.includes(k))) return 'aprob_vp';
  if (['asig_demanda', 'asig_dominio', 'demanda ti', 'gestor demanda', 'dominio', 'en demanda'].some(k => combined.includes(k))) return 'asig_demanda';
  if (['ventana_est', 'estimaci', 'presupuesto', 'est_con', 'est_sin', 'val_est', 'vobo_est'].some(k => combined.includes(k))) return 'ventana_est';
  if (['planificaci', 'plan_fechas', 'val_plan', 'aprob_plan', 'producci'].some(k => combined.includes(k))) return 'planificacion';

  return 'borrador';
}

interface HistoryStateInfo {
  number: string;
  label: string;
  circleClass: string;
  badgeClass: string;
  dotColor: string;
  icon?: any;
}

function getHistoryStateInfo(stateName: string): HistoryStateInfo {
  const s = (stateName || '').toLowerCase().trim();

  if (s.includes('observad')) {
    return {
      number: '!',
      label: 'Observada',
      icon: AlertTriangle,
      circleClass: 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm animate-pulse',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500',
    };
  }
  if (s.includes('desestimad') || s.includes('rechaz')) {
    return {
      number: '✕',
      label: 'Desestimada',
      icon: Ban,
      circleClass: 'bg-rose-500 text-white ring-4 ring-rose-100 shadow-sm',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-500',
    };
  }
  if (s.includes('fin') || s.includes('producci') || s.includes('aprobación final') || s.includes('finaliz')) {
    return {
      number: '✓',
      label: '7. Planificación / Fin',
      icon: Check,
      circleClass: 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColor: 'bg-emerald-600',
    };
  }
  if (s.includes('1') || s.includes('borrador') || s.includes('registro')) {
    return {
      number: '1',
      label: '1. Registro',
      circleClass: 'bg-slate-700 text-white ring-4 ring-slate-100 shadow-sm',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      dotColor: 'bg-slate-700',
    };
  }
  if (s.includes('2') || s.includes('evaluaci') || s.includes('viabilidad') || s.includes('bp')) {
    return {
      number: '2',
      label: '2. Viabilidad BP TI',
      circleClass: 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotColor: 'bg-indigo-600',
    };
  }
  if (s.includes('3') || s.includes('patrocinio') || s.includes('aprobación bo') || s.includes('bo')) {
    return {
      number: '3',
      label: '3. Patrocinio BO',
      circleClass: 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-600',
    };
  }
  if (s.includes('4') || s.includes('vp') || s.includes('vicepresidencia')) {
    return {
      number: '4',
      label: '4. Aprobación VP',
      circleClass: 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-sm',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      dotColor: 'bg-purple-600',
    };
  }
  if (s.includes('5') || s.includes('demanda') || s.includes('asignaci')) {
    return {
      number: '5',
      label: '5. Demanda TI',
      circleClass: 'bg-teal-600 text-white ring-4 ring-teal-100 shadow-sm',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      dotColor: 'bg-teal-600',
    };
  }
  if (s.includes('6') || s.includes('estimaci') || s.includes('presupuesto')) {
    return {
      number: '6',
      label: '6. Estimación',
      circleClass: 'bg-cyan-600 text-white ring-4 ring-cyan-100 shadow-sm',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      dotColor: 'bg-cyan-600',
    };
  }
  if (s.includes('7') || s.includes('planificaci') || s.includes('fechas')) {
    return {
      number: '7',
      label: '7. Planificación',
      circleClass: 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-600',
    };
  }

  return {
    number: '•',
    label: stateName || 'Transición',
    icon: GitBranch,
    circleClass: 'bg-indigo-500 text-white ring-4 ring-indigo-50 shadow-sm',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotColor: 'bg-indigo-500',
  };
}

function formatStageFieldLabel(key: string): string {
  const map: Record<string, string> = {
    presupuesto_estimado_usd: 'Presupuesto Estimado (USD)',
    tiempo_atencion_esfuerzo: 'Tiempo Estimado de Atención (Esfuerzo)',
    justificacion_presupuesto: 'Justificación del Presupuesto',
    analista_responsable: 'Analista de TI Asignado',
    fecha_inicio_estimacion: 'Fecha Inicio Estimación',
    fecha_fin_estimacion: 'Fecha Fin Estimación',
    requiere_presupuesto: '¿Requiere Presupuesto?',
    lider_de_dominio_responsable: 'Líder de Dominio Responsable',
    plataformas_de_iniciativa: 'Tipo de Plataforma',
    tipo_solucion: 'Tipo de Solución',
    observaciones_bp: 'Observaciones BP TI',
    bp_ti_asignado: 'BP TI Asignado',
    sustento_negocio: 'Sustento del Negocio (BO)',
    prioridad_area: 'Prioridad del Área',
    kpi_impactado: 'KPI Impactado',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStageFieldValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (key === 'presupuesto_estimado_usd') {
    const num = Number(val);
    if (!isNaN(num)) {
      return `$ ${num.toLocaleString('en-US')} USD`;
    }
  }

  // Format any dates as DD/MM/YYYY
  const keyLower = (key || '').toLowerCase();
  const isDateKey = keyLower.includes('fecha') || keyLower.includes('date') || keyLower.includes('plazo') || keyLower.includes('inicio_atencion') || keyLower.includes('fin_atencion');
  const isDatePattern = typeof val === 'string' && (
    /^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/.test(val.trim()) ||
    /^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}/.test(val.trim())
  );
  if (isDateKey || isDatePattern) {
    const formatted = formatDateDDMMYYYY(val);
    if (formatted && formatted !== '—') return formatted;
  }

  return String(val);
}

export default function InitiativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [initiative, setInitiative] = useState<any>(null);
  const [fieldsMap, setFieldsMap] = useState<Record<string, string>>({});
  const [fieldsConfig, setFieldsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Stage Custody Chain & Consents State ───────────────────────────────────
  const [stageRecords, setStageRecords] = useState<InitiativeStageRecord[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'history' | 'observations'>('info');
  const [selectedTimelineStageKey, setSelectedTimelineStageKey] = useState<string | null>(null);
  const [selectedSubNodeId, setSelectedSubNodeId] = useState<string | null>(null);
  const [openPopoverStageKey, setOpenPopoverStageKey] = useState<string | null>(null);

  // Keep strictly the latest vigente record for each stage
  const latestStageRecords = useMemo(() => {
    const map = new Map<string, InitiativeStageRecord>();
    for (const rec of stageRecords) {
      const key = (rec.node_id || rec.stage_name || '').toLowerCase();
      map.set(key, rec);
    }
    return Array.from(map.values());
  }, [stageRecords]);

  const isEndWorkflowState = useMemo(() => {
    const node = String(initiative?.current_node_id || '').toLowerCase().trim();
    const st = String(initiative?.status || '').toLowerCase().trim();
    return (
      node === 'end' ||
      node === 'fin' ||
      st === 'fin' ||
      st === 'finalizado' ||
      (st.includes('fin') && !st.includes('fecha') && !st.includes('defin')) ||
      node.includes('end')
    );
  }, [initiative?.current_node_id, initiative?.status]);

  const [lastOpenStageKey, setLastOpenStageKey] = useState<string | null>(null);

  useEffect(() => {
    if (openPopoverStageKey) {
      setLastOpenStageKey(openPopoverStageKey);
    }
  }, [openPopoverStageKey]);

  const getStageVisibleSubNodes = useCallback((stageKey: string): SubNodeDef[] => {
    const stageDef = WORKFLOW_STAGES_TIMELINE.find(s => s.key === stageKey);
    const rawSubNodes = stageDef?.subNodes || [];
    if (rawSubNodes.length <= 1) return [];

    // Filtrar estados en blanco: solo mostrar los hitos que realmente ocurrieron (tienen dictamen/registro) o están actualmente activos
    const activeOrCompletedSubNodes = rawSubNodes.filter(sub => {
      const hasRecord = latestStageRecords.some(r => 
        (r.node_id || '').toLowerCase() === sub.id.toLowerCase() ||
        (r.stage_name || '').toLowerCase().includes(sub.id.toLowerCase())
      );
      const isActive = !isEndWorkflowState && initiative?.current_node_id === sub.id;
      return hasRecord || isActive;
    });

    if (activeOrCompletedSubNodes.length > 0) {
      return activeOrCompletedSubNodes;
    }

    // Para etapas futuras sin registros aún, excluimos ramas de excepción o no aplicables
    const defaultPending = rawSubNodes.filter(s => s.id !== 'observada' && s.id !== 'est_sin_presupuesto');
    return defaultPending;
  }, [latestStageRecords, isEndWorkflowState, initiative?.current_node_id]);

  const isObservedState = useMemo(() => {
    const currNode = activeWorkflow?.graph_json?.nodes?.find(
      (n: any) => n.id === (initiative?.current_node_id || STATUS_TO_NODE[initiative?.status])
    );
    return currNode?.data?.stateSubtype === "observada" || initiative?.status === "Observada" || initiative?.current_node_id === 'observada';
  }, [activeWorkflow, initiative?.current_node_id, initiative?.status]);

  const isDesestimadaState = useMemo(() => {
    const currNode = activeWorkflow?.graph_json?.nodes?.find(
      (n: any) => n.id === (initiative?.current_node_id || STATUS_TO_NODE[initiative?.status])
    );
    return currNode?.data?.stateSubtype === "desestimada" || initiative?.status === "Desestimada" || initiative?.current_node_id === 'desestimada';
  }, [activeWorkflow, initiative?.current_node_id, initiative?.status]);

  const observedStageKey = useMemo(() => {
    if (!isObservedState) return null;
    const fromNode = initiative?.form_data?._current_observation?.from_node_id;
    const fromStage = initiative?.form_data?._current_observation?.from_stage;
    if (fromNode || fromStage) {
      return getTimelineStageKey(fromNode, fromStage);
    }
    const history = initiative?.form_data?._observation_history || [];
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.action === 'Observada' && (h.from_node_id || h.from_stage)) {
        return getTimelineStageKey(h.from_node_id, h.from_stage);
      }
    }
    return 'eval_bp';
  }, [isObservedState, initiative?.form_data]);

  const desestimadaStageKey = useMemo(() => {
    if (!isDesestimadaState) return null;
    const fromNode = initiative?.form_data?._current_observation?.from_node_id;
    const fromStage = initiative?.form_data?._current_observation?.from_stage;
    if (fromNode || fromStage) {
      return getTimelineStageKey(fromNode, fromStage);
    }
    const history = initiative?.form_data?._observation_history || [];
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.action === 'Desestimada' && (h.from_node_id || h.from_stage)) {
        return getTimelineStageKey(h.from_node_id, h.from_stage);
      }
    }
    return 'eval_bp';
  }, [isDesestimadaState, initiative?.form_data]);

  const currentTimelineStageKey = useMemo(() => {
    if (isEndWorkflowState) return 'planificacion';
    if (isObservedState && observedStageKey) return observedStageKey;
    if (isDesestimadaState && desestimadaStageKey) return desestimadaStageKey;
    return getTimelineStageKey(initiative?.current_node_id, initiative?.status);
  }, [initiative?.current_node_id, initiative?.status, isEndWorkflowState, isObservedState, observedStageKey, isDesestimadaState, desestimadaStageKey]);

  const activeTimelineStepIndex = useMemo(() => {
    if (isEndWorkflowState) {
      return WORKFLOW_STAGES_TIMELINE.length; // 7 -> All 7 checks are green!
    }
    const idx = WORKFLOW_STAGES_TIMELINE.findIndex(s => s.key === currentTimelineStageKey);
    return idx !== -1 ? idx : 0;
  }, [currentTimelineStageKey, isEndWorkflowState]);

  const [activeNodeForm, setActiveNodeForm] = useState<StageForm | null>(null);
  const [activeNodeConsent, setActiveNodeConsent] = useState<StageConsent | null>(null);
  const [keyUserConsent, setKeyUserConsent] = useState<StageConsent | null>(null);
  const [stageFormData, setStageFormData] = useState<Record<string, any>>({});
  const [stageConsentAccepted, setStageConsentAccepted] = useState(false);
  const [isSubmittingStage, setIsSubmittingStage] = useState(false);
  const [aiConsensusResult, setAiConsensusResult] = useState<any | null>(null);
  const [isConsolidatingAI, setIsConsolidatingAI] = useState(false);
  const [showConsensusModal, setShowConsensusModal] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<string>("");
  
  const pdfRef = useRef<HTMLDivElement>(null);

  const generatePDF = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: `Informe_Ejecutivo_${initiative?.id?.substring(0,8)}`,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reference data for selects
  const [dbVps, setDbVps] = useState<any[]>([]);
  const [dbDirecciones, setDbDirecciones] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbAppRoles, setDbAppRoles] = useState<any[]>([]);

  // Edit Mode state
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEditAppliedRef = useRef(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFormData, setEditedFormData] = useState<any>({});
  const [editedSummary, setEditedSummary] = useState<any>({});
  
  // Compare state
  const [compareSnapshot, setCompareSnapshot] = useState<any>(null);
  
  // Asignar BP state
  const [selectedBP, setSelectedBP] = useState("");
  const [isEditingBP, setIsEditingBP] = useState(false);
  const [showDesestimarModal, setShowDesestimarModal] = useState(false);
  const [desestimarComment, setDesestimarComment] = useState("");
  // Observación & Subsanación state
  const [showObserveModal, setShowObserveModal] = useState(false);
  const [observeComment, setObserveComment] = useState("");
  const [observeCategory, setObserveCategory] = useState("General");
  const [customObserveCategory, setCustomObserveCategory] = useState("");
  const [pendingObserveTransition, setPendingObserveTransition] = useState<{ edge: any; targetNode: any; buttonLabel: string } | null>(null);
  const [subsanacionComment, setSubsanacionComment] = useState("");
  const [subsanacionFiles, setSubsanacionFiles] = useState<Array<{ name: string; url: string; size?: number; type?: string }>>([]);
  const [isUploadingSubsanacionFile, setIsUploadingSubsanacionFile] = useState(false);
  const [subsanacionUploadError, setSubsanacionUploadError] = useState<string | null>(null);
  const [showVoboRejectInput, setShowVoboRejectInput] = useState(false);
  const [voboRejectReason, setVoboRejectReason] = useState("");
  const [isVoboPreviewOpen, setIsVoboPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [editedConfirmedFields, setEditedConfirmedFields] = useState<Record<string, boolean>>({});
  const [showChatModal, setShowChatModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!initiative?.id) return;
    navigator.clipboard.writeText(initiative.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmText?: string;
    confirmStyle?: string;
    icon?: any;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const confirmAction = (title: string, message: React.ReactNode, confirmText: string, confirmStyle: string, icon: any, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, confirmText, confirmStyle, icon, onConfirm });
  };

  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const isBP = profile?.profile_roles?.some((r: any) => r.role === 'bp_ti');
  const hasTransversalRole = profile?.profile_roles?.some((r: any) => r.is_transversal);
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador') || [];
  const isRegistrador = registradorRoles.length > 0;

  const initialFd = initiative?.form_data ?? {};
  const isMine = initiative?.user_id === profile?.id || initialFd?.registrador === profile?.name;
  const isRegistradorOnly = isRegistrador && !isAdmin && !isBP && !hasTransversalRole;

  const isBPAllowed = useMemo(() => {
    if (!isBP) return false;
    if (isMine) return true;
    if (hasTransversalRole) return true;

    const bpRoles = profile?.profile_roles?.filter((r: any) => r.role === 'bp_ti') || [];
    if (bpRoles.some((r: any) => r.is_transversal)) return true;

    const bpAllowedDirIds = new Set(bpRoles.flatMap((r: any) => r.direcciones_ids || []));

    const dirName = initialFd?.direccion;
    const vpName = initialFd?.vicepresidencia;
    if (!dirName) return false;

    const vpId = dbVps.find(v => v.name === vpName)?.id;
    const dirId = dbDirecciones.find(d => d.name === dirName && (!vpId || d.vp_id === vpId))?.id;

    if (!dirId) return false;
    return bpAllowedDirIds.has(dirId);
  }, [isBP, profile, initialFd, dbVps, dbDirecciones, isMine, hasTransversalRole]);

  const canModify = useMemo(() => {
    if (isAdmin) return true;
    if (hasTransversalRole) return true;
    if (isBP) return isBPAllowed;
    if (isRegistradorOnly) return isMine;

    // Para cualquier otro rol con direcciones asignadas
    const userDirIds = new Set((profile?.profile_roles || []).flatMap((r: any) => r.direcciones_ids || []));
    const dirName = initialFd?.direccion;
    const vpName = initialFd?.vicepresidencia;
    const vpId = dbVps.find(v => v.name === vpName)?.id;
    const dirId = dbDirecciones.find(d => d.name === dirName && (!vpId || d.vp_id === vpId))?.id;
    if (dirId && userDirIds.has(dirId)) return true;

    return isMine;
  }, [isAdmin, hasTransversalRole, isBP, isBPAllowed, isRegistradorOnly, isMine, profile, initialFd, dbVps, dbDirecciones]);

  const getValueCaseInsensitive = (obj: Record<string, any>, key: string) => {
    if (!obj) return undefined;
    const cleanKey = key.toLowerCase().replace(/_/g, '').replace(/[\s\W]/g, '');
    for (const k of Object.keys(obj)) {
      const cleanK = k.toLowerCase().replace(/_/g, '').replace(/[\s\W]/g, '');
      if (cleanK === cleanKey) {
        return obj[k];
      }
    }
    return undefined;
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/initiatives")
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data: inits } = await supabase.from('initiatives').select('*');
          return inits || [];
        }),
      fetch("/api/fields")
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data: dbFields } = await supabase
            .from('initiative_fields')
            .select('*')
            .order('sort_order', { ascending: true });
          return dbFields || [];
        }),
      supabase.from('vps').select('id, name'),
      supabase.from('direcciones').select('id, name, vp_id'),
      supabase.from('allowed_users').select('name, user_roles_whitelist(*)'),
      supabase.from('site_settings').select('pdf_template').eq('id', 1).single(),
      supabase.from('app_roles').select('id, code, name')
    ])
      .then(async ([data, fieldsData, vpsRes, dirRes, usersRes, settingsRes, rolesRes]) => {
        let found = Array.isArray(data) ? data.find((i: any) => i.id === id) : null;
        if (!found && id) {
          // Direct fallback by ID
          const singleRes = await supabase.from('initiatives').select('*').eq('id', id).single();
          if (singleRes.data) found = singleRes.data;
        }
        setInitiative(found ?? null);
        loadStageCustody(found);
        if (settingsRes.data?.pdf_template) {
          setPdfTemplate(settingsRes.data.pdf_template);
        }

        if (Array.isArray(fieldsData)) {
          setFieldsConfig(fieldsData);
          const map: Record<string, string> = {};
          fieldsData.forEach(f => map[f.key.toLowerCase()] = f.label);
          setFieldsMap(map);
        }

        if (vpsRes.data) setDbVps(vpsRes.data);
        if (dirRes.data) setDbDirecciones(dirRes.data);
        if (usersRes.data) setDbUsers(usersRes.data);
        if (rolesRes?.data) setDbAppRoles(rolesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const userRolesList: string[] = useMemo(() => {
    const list = (profile?.profile_roles || [])
      .map((r: any) => (r.role || '').trim().toLowerCase())
      .filter(Boolean);
    if (isAdmin && !list.includes('admin')) list.push('admin');
    if (isBP && !list.includes('bp_ti')) list.push('bp_ti');
    if (list.length === 0) list.push('registrador');

    const roleAliases: Record<string, string[]> = {
      vicepresidente: ['vicepresidente', 'vicepresidente_del_negocio', 'vp'],
      vicepresidente_del_negocio: ['vicepresidente', 'vicepresidente_del_negocio', 'vp'],
      gestor_demanda: ['gestor_demanda', 'gestor_de_la_demanda'],
      gestor_de_la_demanda: ['gestor_demanda', 'gestor_de_la_demanda'],
      lider_dominio: ['lider_dominio', 'lider_de_dominio'],
      lider_de_dominio: ['lider_dominio', 'lider_de_dominio'],
      business_owner: ['business_owner', 'bo'],
      registrador: ['registrador', 'key_user'],
      admin: ['admin', 'administrador', 'administrador_general'],
    };

    return Array.from(new Set(
      list.flatMap(r => roleAliases[r] || [r])
    ));
  }, [profile, isAdmin, isBP]);

  const loadStageCustody = async (targetInit?: any) => {
    const initObj = targetInit || initiative;
    const currentId = id || initObj?.id;
    if (!currentId) return;

    try {
      // 1. Stage records
      try {
        const resSr = await fetch(`/api/initiatives/${currentId}/stage-records`);
        if (resSr.ok) {
          const jsonSr = await resSr.json();
          setStageRecords(jsonSr.data || []);
        } else {
          throw new Error("Fallback SR");
        }
      } catch {
        const { data: dbSr } = await supabase
          .from("initiative_stage_records")
          .select("*")
          .eq("initiative_id", currentId)
          .order("submitted_at", { ascending: true });
        if (dbSr) setStageRecords(dbSr as InitiativeStageRecord[]);
      }

      // 2. Active workflow
      let wf: any = null;
      try {
        const resWf = await fetch("/api/workflow/active");
        if (resWf.ok) {
          const jsonWf = await resWf.json();
          wf = jsonWf.data;
        }
      } catch {}
      if (!wf) {
        const { data: dbWf } = await supabase
          .from("workflow_definitions")
          .select("*, workflow_node_roles(*), workflow_transitions(*)")
          .eq("status", "published")
          .maybeSingle();
        wf = dbWf;
      }
      setActiveWorkflow(wf);

      // 3. Current node
      const currNodeId = initObj?.current_node_id || STATUS_TO_NODE[initObj?.status] || "borrador";
      const node = wf?.graph_json?.nodes?.find((n: any) => n.id === currNodeId);

      // 4. Form for current node
      // 4. Form for current node
      if (node?.data?.form_id) {
        try {
          const resF = await fetch("/api/stage-forms");
          if (resF.ok) {
            const jsonF = await resF.json();
            const foundF = (jsonF.data || []).find((f: any) => f.id === node.data.form_id || f.code === node.data.form_id);
            setActiveNodeForm(foundF || null);
          } else {
            throw new Error("Fallback F");
          }
        } catch {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.data.form_id);
          const { data: dbF } = isUuid
            ? await supabase.from("stage_forms").select("*").eq("id", node.data.form_id).maybeSingle()
            : await supabase.from("stage_forms").select("*").eq("code", node.data.form_id).maybeSingle();
          setActiveNodeForm((dbF as StageForm) || null);
        }
      } else {
        setActiveNodeForm(null);
      }

      // 5. Consent for current node & Key User registration consent
      try {
        const resC = await fetch("/api/stage-consents");
        if (resC.ok) {
          const jsonC = await resC.json();
          const consentsList = jsonC.data || [];
          if (node?.data?.consent_id) {
            const foundC = consentsList.find((c: any) => c.id === node.data.consent_id || c.code === node.data.consent_id);
            setActiveNodeConsent(foundC || null);
          } else {
            setActiveNodeConsent(null);
          }
          const foundKu = consentsList.find((c: any) => c.code === 'consent_key_user') || consentsList[0];
          setKeyUserConsent(foundKu || null);
        } else {
          throw new Error("Fallback C");
        }
      } catch {
        if (node?.data?.consent_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.data.consent_id);
          const { data: dbC } = isUuid
            ? await supabase.from("stage_consents").select("*").eq("id", node.data.consent_id).maybeSingle()
            : await supabase.from("stage_consents").select("*").eq("code", node.data.consent_id).maybeSingle();
          setActiveNodeConsent((dbC as StageConsent) || null);
        } else {
          setActiveNodeConsent(null);
        }
        const { data: dbKu } = await supabase.from("stage_consents").select("*").eq("code", "consent_key_user").maybeSingle();
        if (dbKu) setKeyUserConsent(dbKu as StageConsent);
      }
    } catch (e) {
      console.warn("Error loading stage custody in detail:", e);
    }
  };

  const currentNodeRole = useMemo(() => {
    if (!activeWorkflow || !initiative) return null;
    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || "borrador";
    return activeWorkflow.workflow_node_roles?.find(
      (r: any) => r.node_id === currNodeId && userRolesList.includes(r.role_name?.toLowerCase())
    );
  }, [activeWorkflow, initiative, userRolesList]);

  const canEditCurrentStage = useMemo(() => {
    if (isAdmin) return true;
    return Boolean(currentNodeRole?.can_edit);
  }, [isAdmin, currentNodeRole]);

  const isInitBorrador = initiative?.status === "Borrador" || (initiative?.current_node_id || STATUS_TO_NODE[initiative?.status]) === 'borrador';

  const canTransitionCurrentStage = useMemo(() => {
    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || "borrador";
    const hasConfiguredRoles = activeWorkflow?.workflow_node_roles?.some((r: any) => r.node_id === currNodeId);
    if (hasConfiguredRoles) {
      return Boolean(currentNodeRole);
    }
    if (isAdmin) return true;
    return Boolean(currentNodeRole) || (isInitBorrador && isRegistrador);
  }, [isAdmin, currentNodeRole, isInitBorrador, isRegistrador, activeWorkflow, initiative]);

  const canActOnCurrentStage = useMemo(() => {
    return canTransitionCurrentStage || canEditCurrentStage;
  }, [canTransitionCurrentStage, canEditCurrentStage]);

  const canApproveCurrentStage = canTransitionCurrentStage;
  const canRejectCurrentStage = canTransitionCurrentStage;

  const outgoingEdges = useMemo(() => {
    if (!activeWorkflow?.graph_json?.edges || !initiative) return [];
    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || "borrador";
    return activeWorkflow.graph_json.edges.filter((e: any) => e.source === currNodeId);
  }, [activeWorkflow, initiative]);

  const canUserExecuteEdge = useCallback((edge: any) => {
    const allowed = (edge.data as any)?.allowed_roles || (edge as any).allowed_roles;
    if (Array.isArray(allowed) && allowed.length > 0) {
      return allowed.some((r: string) => userRolesList.includes(r.toLowerCase()));
    }
    // Fallback retrocompatible: si la flecha no tiene roles explícitamente configurados, respetar canTransitionCurrentStage del nodo
    return canTransitionCurrentStage;
  }, [userRolesList, canTransitionCurrentStage]);

  const userOutgoingEdges = useMemo(() => {
    return outgoingEdges.filter((edge: any) => canUserExecuteEdge(edge));
  }, [outgoingEdges, canUserExecuteEdge]);

  const canDesestimar = useMemo(() => {
    return userOutgoingEdges.some((e: any) => e.target === 'desestimada');
  }, [userOutgoingEdges]);

  const observadaNode = useMemo(() => {
    return activeWorkflow?.graph_json?.nodes?.find(
      (n: any) => n.id === 'observada' || n.data?.stateSubtype === 'observada'
    );
  }, [activeWorkflow]);

  const canManageObservada = useMemo(() => {
    if (isAdmin) return true;
    if (!activeWorkflow || !initiative) return false;
    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'observada';

    // 1. Check in workflow_node_roles
    const hasRoleInWfRoles = activeWorkflow.workflow_node_roles?.some(
      (r: any) => (r.node_id === currNodeId || r.node_id === 'observada') && userRolesList.includes(r.role_name?.toLowerCase())
    );
    if (hasRoleInWfRoles) return true;

    // 2. Check in node data.roles
    const nodeObj = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === currNodeId || n.id === 'observada');
    const nodeRoles: any[] = nodeObj?.data?.roles || [];
    const hasRoleInNode = nodeRoles.some((r: any) => userRolesList.includes((r.role_name || r.role || '').toLowerCase()));
    if (hasRoleInNode) return true;

    // 3. Fallback: BP TI
    if (userRolesList.includes('bp_ti') || isBP) return true;

    return false;
  }, [isAdmin, activeWorkflow, initiative, userRolesList, isBP]);

  const observadaResponsibleRoleName = useMemo(() => {
    const nodeObj = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === 'observada' || n.data?.stateSubtype === 'observada');
    const nodeRoles: any[] = nodeObj?.data?.roles || [];
    if (nodeRoles.length > 0) {
      return nodeRoles.map((r: any) => r.role_name || r.role).join(', ');
    }
    return 'BP TI / Administrador';
  }, [activeWorkflow]);

  const observationFileOptions = useMemo(() => {
    return observadaNode?.data?.observationFileOptions || {
      allowMultiple: true,
      maxFiles: 5,
      fileTypes: {
        pdf: { enabled: true, maxMb: 25 },
        docx: { enabled: true, maxMb: 25 },
        xlsx: { enabled: true, maxMb: 25 },
        image: { enabled: true, maxMb: 25 },
        txt: { enabled: true, maxMb: 10 },
      },
    };
  }, [observadaNode]);

  const observationAcceptedExtensions = useMemo(() => {
    const ft = observationFileOptions.fileTypes || {};
    const exts: string[] = [];
    if (ft.pdf?.enabled !== false) exts.push('.pdf');
    if (ft.docx?.enabled !== false) exts.push('.docx');
    if (ft.xlsx?.enabled !== false) exts.push('.xlsx', '.xls');
    if (ft.image?.enabled !== false) exts.push('.png', '.jpg', '.jpeg', '.webp', '.drawio');
    if (ft.txt?.enabled !== false) exts.push('.txt');
    return exts.join(',');
  }, [observationFileOptions]);

  // Historial consolidado de rondas de observación, subsanación y desestimaciones (Deduplicado y limpio)
  const observationThreads = useMemo(() => {
    const history: any[] = initiative?.form_data?._observation_history || [];
    const currentObs = initiative?.form_data?._current_observation;
    const threads: Array<{
      id: string;
      roundNumber: number;
      type: 'observation' | 'desestimacion';
      stageName: string;
      nodeId?: string;
      category?: string;
      questionDate: string;
      questionBy: string;
      questionRole: string;
      questionDetails: string;
      isResolved: boolean;
      answerDate?: string;
      answerBy?: string;
      answerRole?: string;
      answerDetails?: string;
      answerFiles?: Array<{ name: string; url: string; size?: number; type?: string }>;
    }> = [];

    let currentThread: any = null;
    let roundCounter = 1;

    history.forEach((h: any, idx: number) => {
      const act = (h.action || '').toLowerCase();
      if (act.includes('desestimad')) {
        if (currentThread) {
          threads.push(currentThread);
          currentThread = null;
        }
        threads.push({
          id: `des_${idx}`,
          roundNumber: roundCounter++,
          type: 'desestimacion',
          stageName: h.from_stage || initiative?.status || 'Etapa no especificada',
          nodeId: h.from_node_id,
          questionDate: h.date,
          questionBy: h.user_name || 'Desconocido',
          questionRole: h.user_role || 'Rol no especificado',
          questionDetails: h.details || 'Iniciativa desestimada.',
          isResolved: true,
        });
      } else if (act.includes('observad')) {
        if (currentThread) {
          threads.push(currentThread);
        }
        let cat = h.category;
        let det = (h.details || '').trim();
        const catMatch = det.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (catMatch) {
          cat = cat || catMatch[1];
          det = catMatch[2];
        }
        det = det.replace(/\s*\(en etapa:\s*[^)]+\)$/i, '').trim();

        currentThread = {
          id: `obs_${idx}`,
          roundNumber: roundCounter++,
          type: 'observation',
          stageName: h.from_stage || 'Etapa no especificada',
          nodeId: h.from_node_id,
          category: cat || 'General',
          questionDate: h.date,
          questionBy: h.user_name || 'Desconocido',
          questionRole: h.user_role || 'Revisor',
          questionDetails: det || 'Observación registrada.',
          isResolved: false,
        };
      } else if (act.includes('subsanad') || act.includes('reenviad')) {
        if (currentThread) {
          currentThread.isResolved = true;
          currentThread.answerDate = h.date;
          currentThread.answerBy = h.user_name || 'Responsable';
          currentThread.answerRole = h.user_role || 'BP TI';
          currentThread.answerDetails = (h.details || '').replace(/^Subsanación:\s*/i, '').trim() || 'Subsanación completada.';
          currentThread.answerFiles = h.files || [];
          threads.push(currentThread);
          currentThread = null;
        } else {
          threads.push({
            id: `sub_${idx}`,
            roundNumber: roundCounter++,
            type: 'observation',
            stageName: h.from_stage || 'Observada',
            category: 'General',
            questionDate: h.date,
            questionBy: 'Revisor',
            questionRole: 'Evaluador',
            questionDetails: 'Observación previa registrada.',
            isResolved: true,
            answerDate: h.date,
            answerBy: h.user_name,
            answerRole: h.user_role,
            answerDetails: (h.details || '').replace(/^Subsanación:\s*/i, '').trim() || 'Subsanación completada.',
            answerFiles: h.files || [],
          });
        }
      }
    });

    if (currentThread) {
      if (currentObs && currentObs.resolved) {
        currentThread.isResolved = true;
        currentThread.answerDate = currentObs.resolved_at || currentThread.answerDate;
        currentThread.answerBy = currentObs.resolved_by || currentThread.answerBy;
        currentThread.answerDetails = currentObs.resolution_comment || currentThread.answerDetails;
        currentThread.answerFiles = (currentObs.resolution_files && currentObs.resolution_files.length > 0)
          ? currentObs.resolution_files
          : currentThread.answerFiles;
      }
      threads.push(currentThread);
    } else if (currentObs) {
      const cleanObsDetails = (currentObs.details || '').replace(/\s*\(en etapa:\s*[^)]+\)$/i, '').trim();
      const alreadyIncluded = threads.some(t => {
        if (t.questionDate && currentObs.date && t.questionDate === currentObs.date) return true;
        if (t.id === currentObs.id) return true;
        const tClean = (t.questionDetails || '').trim();
        return Boolean(tClean && cleanObsDetails && (tClean.includes(cleanObsDetails) || cleanObsDetails.includes(tClean)));
      });

      if (!alreadyIncluded) {
        threads.push({
          id: currentObs.id || 'obs_active',
          roundNumber: roundCounter++,
          type: currentObs.action === 'Desestimada' ? 'desestimacion' : 'observation',
          stageName: currentObs.from_stage || initiative?.status || 'Etapa no especificada',
          nodeId: currentObs.from_node_id,
          category: currentObs.category || 'General',
          questionDate: currentObs.date,
          questionBy: currentObs.observed_by || 'Revisor',
          questionRole: currentObs.user_role || 'Evaluador',
          questionDetails: cleanObsDetails || currentObs.details || '',
          isResolved: Boolean(currentObs.resolved),
          answerDate: currentObs.resolved_at,
          answerBy: currentObs.resolved_by,
          answerDetails: currentObs.resolution_comment,
          answerFiles: currentObs.resolution_files || [],
        });
      }
    }

    return threads;
  }, [initiative?.form_data, initiative?.status]);

  const observationCount = useMemo(() => {
    return observationThreads.length;
  }, [observationThreads]);

  // Helper to get eligible users for role_user fields (with global & scoped permission support)
  const getEligibleRoleUsers = useCallback((field: any, currentFd?: any) => {
    if (!field || !dbUsers.length) return [];
    const targetRoleRaw = (field.target_role || 'bp_ti').trim().toLowerCase();

    // Resolve target role against app_roles if a UUID or code was passed
    const matchedRoleObj = dbAppRoles.find((ar: any) => 
      ar.id?.toLowerCase() === targetRoleRaw || 
      ar.code?.toLowerCase() === targetRoleRaw || 
      ar.name?.toLowerCase() === targetRoleRaw
    );
    const targetCode = matchedRoleObj?.code?.toLowerCase() || targetRoleRaw;

    const filterByScope = field.filter_by_scope !== false;
    const formValues = currentFd || initiative?.form_data || {};
    const vpName = formValues.vicepresidencia;
    const dirName = formValues.direccion;

    const vpId = dbVps.find((v: any) => 
      v.name?.toLowerCase().trim() === vpName?.toLowerCase().trim() || 
      v.id === vpName
    )?.id;

    const dirId = dbDirecciones.find((d: any) => 
      (d.name?.toLowerCase().trim() === dirName?.toLowerCase().trim() || d.id === dirName) && 
      (!vpId || d.vp_id === vpId)
    )?.id;

    return dbUsers.filter((u: any) => {
      if (!u.user_roles_whitelist || !Array.isArray(u.user_roles_whitelist)) return false;
      return u.user_roles_whitelist.some((r: any) => {
        const userRole = (r.role || '').toLowerCase();
        // Check if role matches either the resolved code, raw target, or role id
        const roleMatches = 
          userRole === targetCode || 
          userRole === targetRoleRaw || 
          (matchedRoleObj && (userRole === matchedRoleObj.code?.toLowerCase() || userRole === matchedRoleObj.id?.toLowerCase()));
        
        if (!roleMatches) return false;

        // If not filtered by scope, any user with this role is eligible
        if (!filterByScope) return true;

        // ─── ALCANCE GLOBAL (TRANSVERSAL) ───
        // 1. Rol transversal explícito
        if (r.is_transversal === true) return true;
        // 2. Sin VP asignada (r.vp_id null/empty) significa alcance transversal / global en toda la institución
        if (!r.vp_id || r.vp_id === '') return true;

        // ─── ALCANCE POR VP / DIRECCIÓN ───
        if (vpId && (r.vp_id === vpId || (vpName && r.vp_id === vpName))) {
          // Si tiene la VP pero no tiene direcciones restringidas (array vacío o no definido), cubre toda la VP
          if (!r.direcciones_ids || !Array.isArray(r.direcciones_ids) || r.direcciones_ids.length === 0) return true;
          // Si tiene direcciones específicas y la iniciativa coincide con una de ellas
          if (dirId && r.direcciones_ids.includes(dirId)) return true;
          if (dirName && r.direcciones_ids.includes(dirName)) return true;
          // Si la dirección de la iniciativa no se pudo resolver por id, permitir si tiene la VP
          if (!dirId) return true;
        }

        return false;
      });
    });
  }, [dbUsers, dbAppRoles, dbVps, dbDirecciones, initiative?.form_data]);

  // Auto-populate & lock role_user fields and load existing stage values from initiative.form_data
  useEffect(() => {
    if (!activeNodeForm?.fields) return;

    const fdObj = initiative?.form_data || {};
    setStageFormData((prev) => {
      const updated = { ...prev };
      let changed = false;

      // Populate already saved values
      activeNodeForm.fields.forEach((field) => {
        if (updated[field.key] === undefined && fdObj[field.key] !== undefined) {
          updated[field.key] = fdObj[field.key];
          changed = true;
        }
      });

      // Role user single candidate lock
      if (dbUsers.length > 0) {
        activeNodeForm.fields.forEach((field) => {
          if (field.type === 'role_user') {
            const eligible = getEligibleRoleUsers(field);
            const uniqueNames = Array.from(new Set(eligible.map((u: any) => u.name)));
            if (uniqueNames.length === 1) {
              const onlyName = uniqueNames[0];
              if (updated[field.key] !== onlyName) {
                updated[field.key] = onlyName;
                changed = true;
              }
            }
          }
        });
      }

      return changed ? updated : prev;
    });
  }, [activeNodeForm, dbUsers, initiative?.form_data, getEligibleRoleUsers]);

  const missingStageFields = useMemo(() => {
    if (!activeNodeForm || isInitBorrador) return [];

    return (activeNodeForm.fields || [])
      .filter((f) => {
        if (!f.required) return false;
        const currentVal = stageFormData[f.key] !== undefined ? stageFormData[f.key] : (initiative?.form_data?.[f.key] || '');
        if (currentVal && typeof currentVal === 'string' && currentVal.trim()) return false;
        if (currentVal && typeof currentVal !== 'string') return false;

        // If role_user and single eligible user exists, treat as fulfilled
        if (f.type === 'role_user') {
          const eligible = getEligibleRoleUsers(f);
          if (Array.from(new Set(eligible.map((u: any) => u.name))).length === 1) return false;
        }

        return true;
      })
      .map((f) => f.label);
  }, [activeNodeForm, stageFormData, isInitBorrador, initiative?.form_data, getEligibleRoleUsers]);

  const isStageReadyToApprove = useMemo(() => {
    if (activeNodeForm && missingStageFields.length > 0) return false;
    if (activeNodeConsent && !stageConsentAccepted) return false;
    return true;
  }, [activeNodeForm, missingStageFields, activeNodeConsent, stageConsentAccepted]);

  const stageSaveTimeoutRef = useRef<any>(null);
  const handleStageFieldChange = (key: string, val: any) => {
    setStageFormData((prev) => ({ ...prev, [key]: val }));
    
    // Sync local initiative object
    setInitiative((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        form_data: {
          ...(prev.form_data || {}),
          [key]: val
        }
      };
    });

    // Auto-save debounced to Supabase so data is never lost
    if (id) {
      if (stageSaveTimeoutRef.current) clearTimeout(stageSaveTimeoutRef.current);
      stageSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const current = initiative?.form_data || {};
          const nextFd = { ...current, [key]: val };
          await supabase.from('initiatives').update({ form_data: nextFd }).eq('id', id);
        } catch (saveErr) {
          console.warn("Auto-save stage field error:", saveErr);
        }
      }, 700);
    }
  };

  const handleSubmitStageEvaluation = async (action: 'aprobado' | 'observado' = 'aprobado') => {
    if (!id || !initiative) return;
    if (action === 'aprobado' && !isStageReadyToApprove) {
      alert(`Para aprobar esta etapa debes:\n${
        missingStageFields.length > 0 ? `• Completar los campos obligatorios: ${missingStageFields.join(", ")}\n` : ""
      }${activeNodeConsent && !stageConsentAccepted ? "• Aceptar la declaración de consentimiento de esta etapa.\n" : ""}`);
      return;
    }

    setIsSubmittingStage(true);
    try {
      const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'borrador';
      const node = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === currNodeId);
      const stageName = node?.data?.label || initiative.status;

      const recordPayload = {
        node_id: currNodeId,
        stage_name: stageName,
        form_id: activeNodeForm?.id || null,
        consent_id: activeNodeConsent?.id || null,
        form_data: stageFormData,
        consent_accepted: activeNodeConsent ? stageConsentAccepted : true,
        consent_text_snapshot: activeNodeConsent?.statement || null,
        action_taken: action,
        user_id: profile?.id || null,
        user_name: profile?.name || profile?.email || "Usuario del Sistema",
        user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? "Administrador" : isBP ? "BP TI" : "Key user"),
      };

      let insertedRecord: any = null;
      try {
        const res = await fetch(`/api/initiatives/${id}/stage-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordPayload),
        });
        if (res.ok) {
          const json = await res.json();
          insertedRecord = json.data;
        }
      } catch {}

      if (!insertedRecord) {
        const { data: dbRec, error: dbErr } = await supabase
          .from("initiative_stage_records")
          .insert({
            ...recordPayload,
            initiative_id: id,
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (!dbErr && dbRec) insertedRecord = dbRec;
      }

      if (insertedRecord) {
        setStageRecords((prev) => [...prev, insertedRecord]);
      }

      if (action === "aprobado") {
        await updateInitiativeData("En demanda");
        showToast("Dictamen de etapa registrado y certificado con éxito.", "success");
      } else {
        await updateInitiativeData("Observada");
        showToast("Etapa observada formalmente con dictamen.", "warning");
      }

      setStageFormData({});
      setStageConsentAccepted(false);
    } catch (err: any) {
      console.error("Error submitting stage evaluation:", err);
      showToast(`Error al registrar dictamen: ${err.message}`, "error");
    } finally {
      setIsSubmittingStage(false);
    }
  };

  const handleConsolidateAI = async () => {
    if (!id) return;
    setIsConsolidatingAI(true);
    try {
      const res = await fetch(`/api/initiatives/${id}/consolidate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Error en consolidación TEO");
      const json = await res.json();
      setAiConsensusResult(json.data);
      setShowConsensusModal(true);
      showToast("Consolidación inteligente TEO generada exitosamente.", "success");
    } catch (err: any) {
      console.error("Error consolidating AI:", err);
      showToast("No se pudo generar la consolidación automática.", "error");
    } finally {
      setIsConsolidatingAI(false);
    }
  };

  const updateInitiativeData = async (status: string, extraUpdates: any = {}) => {
    try {
      const currentFormData = extraUpdates.form_data || initiative.form_data || {};
      const currentSummary = extraUpdates.summary || initiative.summary || {};
      const nextFormData = { ...currentFormData, ...stageFormData, ...(extraUpdates.form_data || {}) };
      if (stageFormData.bp_ti_asignado) {
        nextFormData.bp_ti_asignado = stageFormData.bp_ti_asignado;
      }

      const oldHistory = initiative.form_data?._observation_history || [];
      const newHistory = nextFormData._observation_history || [];
      const hasNewEntryAppended = newHistory.length > oldHistory.length;

      if (status !== initiative.status && !hasNewEntryAppended) {
        let userRole = 'Sistema';
        if (isAdmin) userRole = 'Administrador';
        else if (isBP) userRole = 'BP TI';
        else if (isRegistrador) userRole = 'Key user';

        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: userRole,
          action: status,
          details: `Se cambió el estado de '${initiative.status}' a '${status}'.`
        };
        nextFormData._observation_history = [
          ...oldHistory,
          newHistoryEntry
        ];
      }

      if (status !== initiative.status) {
        let actionLabel = extraUpdates.transition_label || extraUpdates.action_label;
        if (!actionLabel) {
          if (status === 'En demanda' && initiative.status === 'Desestimada') {
            actionLabel = 'Rescatar -> Demanda';
          } else if (status === 'En demanda') {
            actionLabel = 'Aprobar';
          } else if (status === 'Observada') {
            actionLabel = 'Observar';
          } else if (status === 'Desestimada') {
            actionLabel = 'Desestimar';
          } else if (status === 'Pendiente de aprobación' || status?.toLowerCase().includes('bp')) {
            if (initiative.status === 'Borrador') actionLabel = 'Enviar a aprobacion';
            else if (initiative.status === 'Observada') actionLabel = 'Reenviar (Key user)';
            else if (initiative.status === 'Desestimada') actionLabel = 'Rescatar -> Nueva';
          } else {
            actionLabel = status;
          }
        }

        const currentNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'borrador';
        const targetNodeId = extraUpdates.target_node_id || extraUpdates.current_node_id || STATUS_TO_NODE[status];

        // Enviar roles del usuario con alias para validación en el motor de flujos
        const uRole = userRolesList.join(',');

        const gwParam = extraUpdates.gateway_node_id ? `&gateway_node_id=${encodeURIComponent(extraUpdates.gateway_node_id)}` : '';
        try {
          const valRes = await fetch(
            `/api/workflow/validate-transition?current_node_id=${encodeURIComponent(currentNodeId)}&target_node_id=${encodeURIComponent(targetNodeId || '')}&user_role=${encodeURIComponent(uRole)}&transition_label=${encodeURIComponent(actionLabel)}&form_data=${encodeURIComponent(JSON.stringify(nextFormData))}${gwParam}`
          );
          if (valRes.ok) {
            const valJson = await valRes.json();
            if (valJson.data && !valJson.data.allowed) {
              alert(valJson.data.reason || 'Acción no permitida por las reglas del flujo de trabajo.');
              return;
            }
          }
        } catch (valErr) {
          console.warn("Workflow validation fallback:", valErr);
        }
      }

      const targetNode = extraUpdates?.current_node_id || extraUpdates?.target_node_id || STATUS_TO_NODE[status] || 'borrador';
      const cleanExtra = { ...(extraUpdates || {}) };
      delete cleanExtra.target_node_id;
      delete cleanExtra.transition_label;
      delete cleanExtra.gateway_node_id;

      const payload: any = { 
        status, 
        current_node_id: targetNode,
        ...cleanExtra,
        form_data: nextFormData 
      };

      let updated = false;
      try {
        const res = await fetch(`/api/initiatives/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resData = await res.json();
          updated = true;
          if (resData && resData.id) {
            Object.assign(payload, resData);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn("API update returned error status:", res.status, errData);
        }
      } catch (apiErr) {
        console.warn("API update failed, attempting Supabase direct fallback:", apiErr);
      }

      if (!updated) {
        // Direct Supabase update fallback
        const { error: sbErr } = await supabase.from('initiatives').update(payload).eq('id', id);
        if (!sbErr) {
          updated = true;
        } else {
          console.error("Supabase direct fallback error:", sbErr);
        }
      }

      if (updated) {
        const nextInit = { ...initiative, ...payload };
        setInitiative(nextInit);
        setIsEditMode(false);
        loadStageCustody(nextInit);
        showToast("Iniciativa actualizada exitosamente.", "success");
      } else {
        showToast("Error al procesar la actualización de la iniciativa.", "error");
      }
    } catch (e) { console.error(e); }
  };

  const handleVoboCorrect = async () => {
    const currentFormData = initiative.form_data || {};
    const newFormData = {
      ...currentFormData,
      _vobo_status: "correcto"
    };
    await updateInitiativeData(initiative.status, { form_data: newFormData });
  };

  const handleVoboIncorrectSubmit = async () => {
    if (!voboRejectReason.trim()) return;

    const currentFormData = initiative.form_data || {};
    const currentSummary = initiative.summary || {};

    const newHistoryEntry = {
      date: new Date().toISOString(),
      user_name: profile?.name || 'Desconocido',
      user_role: isAdmin ? 'Administrador' : (isBP ? 'BP TI' : 'Key user'),
      action: 'Observada',
      details: `Visto bueno del VP incorrecto: ${voboRejectReason}`,
      snapshot: {
        form_data: { ...currentFormData },
        summary: { ...currentSummary }
      }
    };

    const newFormData = { 
      ...currentFormData, 
      _vobo_status: "incorrecto",
      _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
    };

    await updateInitiativeData("Observada", { form_data: newFormData });
    setShowVoboRejectInput(false);
    setVoboRejectReason("");
  };

  const handleAssignBP = () => {
    if (!selectedBP) return;
    const newFormData = { ...initiative.form_data, bp_ti_asignado: selectedBP };
    updateInitiativeData(initiative.status, { form_data: newFormData });
    setIsEditingBP(false);
  };

  const startEditMode = () => {
    setEditedFormData({ ...(initiative.form_data || {}) });
    setEditedConfirmedFields(initiative.confirmed_fields || {});
    
    // Initialize editedSummary with summary data, falling back to form_data for AI fields
    const initialSummary = { ...(initiative.summary || {}) };
    fieldsConfig.forEach((f: any) => {
      if (f.section === 'ai') {
        const val = getValueCaseInsensitive(initiative.summary || {}, f.key) 
          ?? getValueCaseInsensitive(initiative.form_data || {}, f.key);
        if (val !== undefined && val !== null) {
          initialSummary[f.key] = val;
        }
      }
    });
    setEditedSummary(initialSummary);
    setIsEditMode(true);
  };

  useEffect(() => {
    if (initiative && searchParams.get('edit') === 'true' && !initialEditAppliedRef.current && canEditCurrentStage) {
      initialEditAppliedRef.current = true;
      startEditMode();
      // Clean query param from URL so it doesn't trap the user in edit mode
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  }, [initiative, searchParams, canEditCurrentStage, setSearchParams]);

  const cancelEditMode = () => {
    setIsEditMode(false);
    if (searchParams.get('edit')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSaveDraftEdits = async () => {
    if (!isEditMode) return;
    await updateInitiativeData("Borrador", {
      form_data: editedFormData,
      summary: editedSummary,
      confirmed_fields: editedConfirmedFields
    });
    setIsEditMode(false);
    if (searchParams.get('edit')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSaveObservedEdits = async () => {
    if (!isEditMode) return;
    const currentVobo = initiative.form_data?.aprobacion_de_director ?? initiative.form_data?.aprobacin_de_director;
    const editedVobo = editedFormData.aprobacion_de_director ?? editedFormData.aprobacin_de_director;
    const newFormData = { ...editedFormData };
    if (editedVobo !== currentVobo) {
      delete newFormData._vobo_status;
    }
    await updateInitiativeData("Observada", {
      form_data: newFormData,
      summary: editedSummary,
      confirmed_fields: editedConfirmedFields
    });
    setIsEditMode(false);
    if (searchParams.get('edit')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleObserve = () => {
    if (!isEditMode) return updateInitiativeData("Observada");

    // We are in edit mode, so save suggested_changes inside form_data
    const currentFormData = initiative.form_data || {};
    const currentSummary = initiative.summary || {};
    
    // Find what changed
    const changes: any = { form_data: {}, summary: {} };
    let hasChanges = false;
    
    Object.keys(editedFormData).forEach(k => {
      if (JSON.stringify(editedFormData[k]) !== JSON.stringify(currentFormData[k])) {
        changes.form_data[k] = editedFormData[k];
        hasChanges = true;
      }
    });
    Object.keys(editedSummary).forEach(k => {
      if (JSON.stringify(editedSummary[k]) !== JSON.stringify(currentSummary[k])) {
        changes.summary[k] = editedSummary[k];
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      setConfirmDialog({
        isOpen: true,
        title: "¡Hola!",
        message: "Para poder observar esta iniciativa, por favor ingresa al menos un cambio sugerido en los campos del formulario. Así el Key user sabrá exactamente qué ajustar. 😊",
        confirmText: "Entendido",
        onConfirm: () => {},
        confirmStyle: "bg-amber-500 hover:bg-amber-600",
        icon: <AlertTriangle className="w-6 h-6 text-amber-500" />
      });
      return;
    }

    confirmAction(
      "Observar Iniciativa",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de que deseas observar esta iniciativa y enviar los cambios sugeridos al Key user?</p>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Observar",
      "bg-amber-600 hover:bg-amber-500",
      <AlertTriangle className="w-6 h-6 text-amber-500" />,
      () => {
        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: isAdmin ? 'Administrador' : (isBP ? 'BP TI' : 'Key user'),
          action: 'Observada',
          details: 'Observó la iniciativa con cambios sugeridos.',
          snapshot: {
            form_data: { ...currentFormData },
            summary: { ...currentSummary }
          }
        };

        const newFormData = { 
          ...currentFormData, 
          _suggested_changes: changes,
          _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
        };
        updateInitiativeData("Observada", { form_data: newFormData });
      }
    );
  };

  const handleApprove = () => {
    confirmAction(
      "Aprobar Iniciativa",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de que deseas aprobar esta iniciativa?</p>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex gap-2 text-emerald-800">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu total revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Aprobar",
      "bg-emerald-600 hover:bg-emerald-500",
      <CheckCircle className="w-6 h-6 text-emerald-500" />,
      () => {
        const newHistoryEntry = {
          date: new Date().toISOString(),
          user: profile?.name || "Usuario Desconocido",
          role: isAdmin ? "Admin" : (isBP ? "Business Partner TI" : "Key user"),
          action: "En demanda",
          comment: isEditMode ? "Se aprobaron los cambios realizados." : "Movida a En demanda directamente sin cambios."
        };

        if (!isEditMode) {
          const currentFormData = initiative.form_data || {};
          const newFormData = { ...currentFormData };
          newFormData._observation_history = [...(newFormData._observation_history || []), newHistoryEntry];
          return updateInitiativeData("En demanda", { form_data: newFormData });
        }
        
        // Approve WITH changes applied directly
        const currentFormData = initiative.form_data || {};
        const newFormData = { ...editedFormData };
        delete newFormData._suggested_changes;
        newFormData._observation_history = [...(currentFormData._observation_history || []), newHistoryEntry];

        updateInitiativeData("En demanda", { 
          form_data: newFormData,
          summary: editedSummary
        });
      }
    );
  };

  const handleAcceptChange = (type: 'form_data' | 'summary', key: string, val: any) => {
    const currentFormData = { ...initiative.form_data };
    const suggested = JSON.parse(JSON.stringify(currentFormData._suggested_changes || { form_data: {}, summary: {} }));
    
    // Apply change
    if (type === 'form_data') {
      currentFormData[key] = val;
    }
    const currentSummary = { ...initiative.summary };
    if (type === 'summary') {
      currentSummary[key] = val;
    }

    // Remove from suggestions
    delete suggested[type][key];
    
    updateInitiativeData(initiative.status, {
      form_data: { ...currentFormData, _suggested_changes: suggested },
      summary: currentSummary
    });
  };

  const handleRejectChange = (type: 'form_data' | 'summary', key: string) => {
    const currentFormData = { ...initiative.form_data };
    const suggested = JSON.parse(JSON.stringify(currentFormData._suggested_changes || { form_data: {}, summary: {} }));
    
    delete suggested[type][key];
    
    updateInitiativeData(initiative.status, {
      form_data: { ...currentFormData, _suggested_changes: suggested }
    });
  };

  const handleAcceptAllChanges = () => {
    const currentFormData = { ...initiative.form_data };
    const currentSummary = { ...initiative.summary };
    const suggested = currentFormData._suggested_changes || { form_data: {}, summary: {} };
    
    Object.entries(suggested.form_data || {}).forEach(([k, v]) => {
      currentFormData[k] = v;
    });
    Object.entries(suggested.summary || {}).forEach(([k, v]) => {
      currentSummary[k] = v;
    });

    delete currentFormData._suggested_changes;
    
    updateInitiativeData(initiative.status, {
      form_data: currentFormData,
      summary: currentSummary
    });
  };

  const openDesestimarModal = () => {
    setDesestimarComment("");
    setShowDesestimarModal(true);
  };

  const handleDesestimarConfirm = () => {
    if (!desestimarComment.trim()) {
      showToast("Debes ingresar un motivo.", "warning");
      return;
    }

    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'borrador';
    const currNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === currNodeId);
    const currStageName = currNode?.data?.label || initiative.status;

    const currentFormData = initiative.form_data || {};
    const newHistoryEntry = {
      date: new Date().toISOString(),
      user_name: profile?.name || 'Desconocido',
      user_role: profile?.profile_roles?.[0]?.role || 'Desconocido',
      action: 'Desestimada',
      details: desestimarComment.trim(),
      from_node_id: currNodeId,
      from_stage: currStageName,
    };

    const newFormData = { 
      ...currentFormData, 
      _current_observation: {
        id: `des_${Date.now()}`,
        date: new Date().toISOString(),
        observed_by: profile?.name || 'Desconocido',
        user_role: profile?.profile_roles?.[0]?.role || 'Desconocido',
        action: 'Desestimada',
        details: desestimarComment.trim(),
        from_stage: currStageName,
        from_node_id: currNodeId,
      },
      _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
    };
    updateInitiativeData("Desestimada", { 
      current_node_id: 'desestimada', 
      target_node_id: 'desestimada', 
      form_data: newFormData 
    });
    setShowDesestimarModal(false);
    showToast("Iniciativa desestimada.", "warning");
  };

  const openObserveModal = (edge?: any, targetNode?: any, buttonLabel?: string) => {
    setObserveComment("");
    setCustomObserveCategory("");
    const targetObservada = targetNode || activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === 'observada' || n.data?.stateSubtype === 'observada');
    const cats: string[] = targetObservada?.data?.observationCategories || DEFAULT_OBSERVATION_CATEGORIES;
    setObserveCategory(cats[0] || "General");
    setPendingObserveTransition(edge ? { edge, targetNode, buttonLabel: buttonLabel || 'Observar' } : null);
    setShowObserveModal(true);
  };

  const handleObserveConfirm = async () => {
    if (!observeComment.trim()) {
      showToast("Debes ingresar el motivo o detalle de la observación.", "warning");
      return;
    }

    const finalCategory = observeCategory === '__custom__'
      ? (customObserveCategory.trim() || 'General')
      : (observeCategory || 'General');

    const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'borrador';
    const currNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === currNodeId);
    const currStageName = currNode?.data?.label || initiative.status;

    const currentFormData = initiative.form_data || {};
    const observationId = `obs_${Date.now()}`;

    const observationData = {
      id: observationId,
      date: new Date().toISOString(),
      observed_by: profile?.name || profile?.email || 'Usuario del Sistema',
      observed_by_id: profile?.id || null,
      user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? 'Administrador' : isBP ? 'BP TI' : 'Key user'),
      action: 'Observada',
      category: finalCategory,
      details: observeComment.trim(),
      from_stage: currStageName,
      from_node_id: currNodeId,
      resolved: false,
    };

    const newHistoryEntry = {
      date: new Date().toISOString(),
      user_name: profile?.name || 'Usuario del Sistema',
      user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? 'Administrador' : isBP ? 'BP TI' : 'Key user'),
      action: 'Observada',
      details: `[${finalCategory}] ${observeComment.trim()} (en etapa: ${currStageName})`,
      from_node_id: currNodeId,
      from_stage: currStageName,
    };

    if (activeNodeForm || activeNodeConsent) {
      try {
        await supabase.from("initiative_stage_records").insert({
          initiative_id: id,
          node_id: currNodeId,
          stage_name: currStageName,
          form_id: activeNodeForm?.id || null,
          consent_id: activeNodeConsent?.id || null,
          form_data: stageFormData,
          consent_accepted: activeNodeConsent ? stageConsentAccepted : false,
          consent_text_snapshot: activeNodeConsent?.statement || null,
          action_taken: 'observado',
          user_id: profile?.id || null,
          user_name: profile?.name || profile?.email || "Usuario del Sistema",
          user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? "Administrador" : isBP ? "BP TI" : "Key user"),
          submitted_at: new Date().toISOString(),
        });
      } catch (recErr) {
        console.warn("Stage record observation insert fallback:", recErr);
      }
    }

    const targetNodeId = pendingObserveTransition?.edge?.target || 'observada';
    const targetNode = pendingObserveTransition?.targetNode || activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === targetNodeId);
    const targetStatusName = targetNode?.data?.label || "Observada";

    const newFormData = {
      ...currentFormData,
      _current_observation: observationData,
      _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry],
    };

    setShowObserveModal(false);
    updateInitiativeData(targetStatusName, {
      current_node_id: targetNodeId,
      target_node_id: targetNodeId,
      transition_label: pendingObserveTransition?.buttonLabel || 'Observar',
      form_data: newFormData,
    });
    showToast("Iniciativa observada exitosamente.", "warning");
  };

  const handleSubsanacionFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      files = Array.from(e.dataTransfer.files);
    } else if (e.target && (e.target as HTMLInputElement).files) {
      files = Array.from((e.target as HTMLInputElement).files || []);
    }
    if (files.length === 0) return;

    setSubsanacionUploadError(null);
    const ft = observationFileOptions.fileTypes || {};
    const allowMultiple = observationFileOptions.allowMultiple !== false;
    const maxFiles = observationFileOptions.maxFiles || 5;

    if (!allowMultiple && (subsanacionFiles.length + files.length) > 1) {
      setSubsanacionUploadError("Solo se permite adjuntar 1 archivo en esta subsanación.");
      return;
    }

    if ((subsanacionFiles.length + files.length) > maxFiles) {
      setSubsanacionUploadError(`Se superó el límite máximo de ${maxFiles} archivo(s) permitidos.`);
      return;
    }

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      let typeKey: 'pdf' | 'docx' | 'xlsx' | 'image' | 'txt' | null = null;
      if (ext === '.pdf') typeKey = 'pdf';
      else if (ext === '.docx') typeKey = 'docx';
      else if (ext === '.xlsx' || ext === '.xls') typeKey = 'xlsx';
      else if (['.png', '.jpg', '.jpeg', '.webp', '.drawio'].includes(ext)) typeKey = 'image';
      else if (ext === '.txt') typeKey = 'txt';

      if (!typeKey || ft[typeKey]?.enabled === false) {
        setSubsanacionUploadError(`El formato "${ext}" (${file.name}) no está autorizado para esta subsanación.`);
        return;
      }

      const maxMb = Math.min(25, ft[typeKey]?.maxMb || 25);
      const limitBytes = maxMb * 1024 * 1024;
      if (file.size > limitBytes) {
        setSubsanacionUploadError(`El archivo "${file.name}" supera el límite configurado de ${maxMb} MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }
    }

    setIsUploadingSubsanacionFile(true);
    try {
      const uploaded: Array<{ name: string; url: string; size?: number; type?: string }> = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/chat/attach-file', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        uploaded.push({
          name: file.name,
          url: data.url,
          size: file.size,
          type: data.type || file.type,
        });
      }
      setSubsanacionFiles(prev => [...prev, ...uploaded]);
      showToast(`${uploaded.length} archivo(s) adjuntado(s) exitosamente.`, 'success');
    } catch (err: any) {
      setSubsanacionUploadError('Error al subir archivo: ' + (err.message || 'Error de conexión'));
      showToast('Error al subir archivo.', 'error');
    } finally {
      setIsUploadingSubsanacionFile(false);
    }
  };

  const handleRemoveSubsanacionFile = (index: number) => {
    setSubsanacionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReenviar = () => {
    if (initiative.form_data?._vobo_status === "incorrecto") {
      showToast("El visto bueno del VP es incorrecto. Debes editar la iniciativa y subir un nuevo archivo de Visto Bueno antes de reenviar.", "error");
      return;
    }

    confirmAction(
      "Reenviar a Aprobación",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de reenviar esta iniciativa para su aprobación?</p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, declaras que las subsanaciones fueron hechas bajo tu revisión y consentimiento.</span>
          </div>
        </div>
      ),
      "Sí, Reenviar",
      "bg-[#4F5AF5] hover:bg-[#3F49E0]",
      <Send className="w-6 h-6 text-[#4F5AF5]" />,
      () => {
        const currentFormData = initiative.form_data || {};
        const currentSummary = initiative.summary || {};

        const resolutionComment = subsanacionComment.trim() || 'Subsanó la iniciativa y la reenvió para su revisión.';
        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: 'Key user',
          action: 'Reenviada a Aprobación',
          details: resolutionComment,
          files: subsanacionFiles.length > 0 ? subsanacionFiles : undefined,
          snapshot: {
            form_data: { ...currentFormData },
            summary: { ...currentSummary }
          }
        };

        const currentObs = currentFormData._current_observation;
        const newFormData = { ...initiative.form_data };
        delete newFormData._suggested_changes;
        if (currentObs) {
          newFormData._current_observation = {
            ...currentObs,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: profile?.name || 'Key user',
            resolution_comment: resolutionComment,
            resolution_files: subsanacionFiles,
          };
        }
        newFormData._observation_history = [...(newFormData._observation_history || []), newHistoryEntry];
        setSubsanacionComment("");
        setSubsanacionFiles([]);
        
        updateInitiativeData("Pendiente de aprobación", { form_data: newFormData });
      }
    );
  };

  const handleEnviarAprobacion = () => {
    // Validate that all visible fields that require confirmation are checked
    const missingConfirmationFields = fieldsConfig.filter(f => {
      if (!f.is_visible) return false;
      if (!f.requires_confirmation) return false;
      
      const val = getValueCaseInsensitive(initiative.form_data || {}, f.key);
      const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
      if (isEmpty) return false;
      
      const isConfirmed = initiative.confirmed_fields && initiative.confirmed_fields[f.key];
      return !isConfirmed;
    });

    if (missingConfirmationFields.length > 0) {
      showToast(`Debes confirmar que la información mostrada para el campo "${missingConfirmationFields[0].label}" es correcta.`, "warning");
      return;
    }

    const isDisclaimerAccepted = Boolean(
      initiative.form_data?._director_declaration_accepted || 
      initiative.form_data?.declaracion_responsabilidad
    );
    if (!isDisclaimerAccepted) {
      showToast("Debes aceptar la Declaración de Responsabilidad (Consentimiento) antes de enviar la iniciativa a aprobación.", "warning");
      return;
    }

    confirmAction(
      "Enviar a Aprobación",
      (
        <div className="space-y-4">
          <p>¿Estás seguro de enviar esta iniciativa para revisión del BP?</p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, la iniciativa cambiará a estado 'Pendiente de aprobación' y será visible para el BP.</span>
          </div>
        </div>
      ),
      "Sí, Enviar a BP",
      "bg-[#4F5AF5] hover:bg-[#3F49E0]",
      <Send className="w-6 h-6 text-[#4F5AF5]" />,
      () => {
        const sendEdge = outgoingEdges.find((e: any) => e.target === 'eval_bp' || e.label?.toLowerCase().includes('ti') || e.label?.toLowerCase().includes('bp')) || outgoingEdges[0];
        const targetNodeId = sendEdge?.target || 'eval_bp';
        const targetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === targetNodeId);
        const targetStatus = targetNode?.data?.label || "2. Evaluación BP TI";

        updateInitiativeData(targetStatus, { current_node_id: targetNodeId });
      }
    );
  };

  const handleWorkflowTransition = (edge: any, targetNode: any, buttonLabel: string) => {
    let targetId = edge.target;
    let actualTargetNode = targetNode;
    let actualButtonLabel = buttonLabel;

    // Si el nodo destino es una compuerta condicional (Gateway), auto-enrutar dinámicamente según las reglas configuradas
    if (targetNode?.data?.nodeType === 'gateway' || targetId.startsWith('gw_') || targetId === 'gw_presupuesto') {
      const currentFd = { ...(initiative?.form_data || {}), ...editedFormData, ...stageFormData };
      const gwConfig = targetNode?.data?.gatewayConfig as any;
      const variable = gwConfig?.variable || (targetId === 'gw_presupuesto' ? 'requiere_presupuesto' : '');
      const rawVal = String(currentFd[variable] ?? '').trim();

      const gwEdges = activeWorkflow?.graph_json?.edges?.filter((e: any) => e.source === targetId) || [];
      const rules = gwConfig?.rules || [];

      let chosenEdge: any = null;

      // 1. Evaluar reglas configuradas en el diseñador
      for (const rule of rules) {
        if (rule.isDefault) continue;
        const ruleVal = String(rule.value || '').trim();
        const op = rule.operator || 'equals';

        let isMatch = false;
        if (op === 'equals') {
          isMatch = rawVal.toLowerCase() === ruleVal.toLowerCase();
          if (!isMatch && (/^(sí|si|true)$/i.test(rawVal) && /^(sí|si|true)$/i.test(ruleVal))) isMatch = true;
          if (!isMatch && (/^(no|false)$/i.test(rawVal) && /^(no|false)$/i.test(ruleVal))) isMatch = true;
        } else if (op === 'not_equals') {
          isMatch = rawVal.toLowerCase() !== ruleVal.toLowerCase();
        } else if (op === 'contains') {
          isMatch = rawVal.toLowerCase().includes(ruleVal.toLowerCase());
        } else if (op === 'greater_than') {
          isMatch = parseFloat(rawVal) > parseFloat(ruleVal);
        } else if (op === 'less_than') {
          isMatch = parseFloat(rawVal) < parseFloat(ruleVal);
        }

        if (isMatch) {
          chosenEdge = gwEdges.find((e: any) => e.id === rule.edgeId || e.target === rule.targetNodeId);
          if (chosenEdge) break;
        }
      }

      // 2. Si ninguna regla coincidió, verificar si existe una rama por defecto (Else)
      if (!chosenEdge) {
        const defaultRule = rules.find((r: any) => r.isDefault);
        if (defaultRule) {
          chosenEdge = gwEdges.find((e: any) => e.id === defaultRule.edgeId || e.target === defaultRule.targetNodeId);
        }
      }

      // 3. Fallback inteligente para compuertas booleanas estándar (Sí / No)
      if (!chosenEdge && gwEdges.length > 0) {
        const isYes = /^(sí|si|true)$/i.test(rawVal);
        chosenEdge = isYes
          ? gwEdges.find((e: any) => e.target === 'est_con_presupuesto' || /s[ií]/i.test(e.label || ''))
          : gwEdges.find((e: any) => e.target === 'est_sin_presupuesto' || /no/i.test(e.label || ''));
        if (!chosenEdge) chosenEdge = gwEdges[0];
      }

      if (chosenEdge) {
        targetId = chosenEdge.target;
        actualTargetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === targetId) || actualTargetNode;
        actualButtonLabel = actualTargetNode?.data?.action_label || actualTargetNode?.data?.label || actualButtonLabel;
      }
    }

    const isDesestimar = targetId === 'desestimada' || actualTargetNode?.data?.stateSubtype === 'desestimada';
    const isObservar = targetId === 'observada' || actualTargetNode?.data?.stateSubtype === 'observada';

    if (isDesestimar) {
      openDesestimarModal();
      return;
    }

    if (isObservar) {
      openObserveModal(edge, actualTargetNode, actualButtonLabel);
      return;
    }

    // Validación al salir de estado Observada
    if (isObservedState) {
      if (!subsanacionComment.trim() && subsanacionFiles.length === 0) {
        showToast("Por favor ingresa la respuesta de subsanación o adjunta un archivo de respaldo antes de continuar.", "warning");
        return;
      }
    }

    // Validaciones si estamos en Borrador
    if (isBorrador) {
      const missingConfirmationFields = fieldsConfig.filter(f => {
        if (!f.is_visible) return false;
        if (!f.requires_confirmation) return false;
        const val = getValueCaseInsensitive(initiative.form_data || {}, f.key);
        const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
        if (isEmpty) return false;
        return !(initiative.confirmed_fields && initiative.confirmed_fields[f.key]);
      });

      if (missingConfirmationFields.length > 0) {
        showToast(`Debes confirmar que la información mostrada para el campo "${missingConfirmationFields[0].label}" es correcta.`, "warning");
        return;
      }

      const isDisclaimerAccepted = Boolean(
        initiative.form_data?._director_declaration_accepted || 
        initiative.form_data?.declaracion_responsabilidad
      );
      if (!isDisclaimerAccepted) {
        showToast("Debes aceptar la Declaración de Responsabilidad (Consentimiento) antes de avanzar la iniciativa.", "warning");
        return;
      }
    }

    // Validación de campos obligatorios en el formulario de la etapa actual (solo aplica a etapas de evaluación posteriores a Borrador)
    if (!isBorrador && !isInitBorrador && activeNodeForm && missingStageFields.length > 0) {
      showToast(`Requisitos pendientes en la etapa actual:\n• ${missingStageFields.join("\n• ")}`, "warning");
      return;
    }

    if (!isBorrador && !isInitBorrador && activeNodeConsent && !stageConsentAccepted) {
      showToast("Debes marcar la casilla de aceptación de la Declaración Legal en el panel lateral.", "warning");
      return;
    }

    const targetStatusName = actualTargetNode?.data?.label || targetId;
    const actionQuestion = actualButtonLabel.match(/^(enviar|mover|pasar|avanzar|solicitar|aprobar|observar|desestimar|derivar)/i)
      ? `¿Estás seguro de ${actualButtonLabel.charAt(0).toLowerCase() + actualButtonLabel.slice(1)}?`
      : `¿Estás seguro de realizar la acción "${actualButtonLabel}"?`;

    confirmAction(
      actualButtonLabel,
      (
        <div className="space-y-4">
          <p className="text-base font-semibold text-slate-800">{actionQuestion}</p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold text-sm">Al confirmar, la iniciativa avanzará hacia <strong>{targetStatusName}</strong> según las reglas del flujo de trabajo.</span>
          </div>
        </div>
      ),
      `Sí, ${actualButtonLabel}`,
      "bg-[#4F5AF5] hover:bg-[#3F49E0]",
      <Send className="w-6 h-6 text-[#4F5AF5]" />,
      async () => {
        let updatedFd = { ...(initiative?.form_data || {}), ...editedFormData, ...stageFormData };

        // Si la iniciativa estaba en estado Observada, consolidar la resolución
        if (isObservedState) {
          const currentObs = initiative?.form_data?._current_observation;
          const resolutionRecord = {
            resolved_at: new Date().toISOString(),
            resolved_by: profile?.name || profile?.email || 'Usuario del Sistema',
            resolved_by_id: profile?.id || null,
            resolution_comment: subsanacionComment.trim() || 'Subsanación completada con archivos adjuntos.',
            resolution_files: subsanacionFiles,
          };

          const newHistoryEntry = {
            date: new Date().toISOString(),
            user_name: profile?.name || profile?.email || 'Usuario del Sistema',
            user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? "Administrador" : isBP ? "BP TI" : "Key user"),
            action: 'Subsanada',
            details: `Subsanación: ${subsanacionComment.trim() || 'Archivos de soporte adjuntados'}`,
            files: subsanacionFiles.length > 0 ? subsanacionFiles : undefined,
            from_node_id: 'observada',
            from_stage: 'Observada',
          };

          updatedFd = {
            ...updatedFd,
            _current_observation: currentObs ? { ...currentObs, resolved: true, ...resolutionRecord } : null,
            _observation_history: [...(updatedFd._observation_history || []), newHistoryEntry],
          };

          setSubsanacionComment("");
          setSubsanacionFiles([]);
        }

        // Registrar custodia legal en stage_records si aplica formulario de etapa
        if (activeNodeForm || activeNodeConsent) {
          try {
            const currNodeId = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || 'borrador';
            const node = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === currNodeId);
            const stageName = node?.data?.label || initiative.status;

            const recordPayload = {
              node_id: currNodeId,
              stage_name: stageName,
              form_id: activeNodeForm?.id || null,
              consent_id: activeNodeConsent?.id || null,
              form_data: stageFormData,
              consent_accepted: activeNodeConsent ? stageConsentAccepted : true,
              consent_text_snapshot: activeNodeConsent?.statement || null,
              action_taken: 'aprobado',
              user_id: profile?.id || null,
              user_name: profile?.name || profile?.email || "Usuario del Sistema",
              user_role: profile?.profile_roles?.[0]?.role || (isAdmin ? "Administrador" : isBP ? "BP TI" : "Key user"),
            };
            const { data: dbRec } = await supabase.from("initiative_stage_records").insert({
              ...recordPayload,
              initiative_id: id,
              submitted_at: new Date().toISOString(),
            }).select().single();
            if (dbRec) setStageRecords((prev) => [...prev, dbRec]);
          } catch (recErr) {
            console.warn("Stage record auto-insert fallback:", recErr);
          }
        }

        const isGw = targetNode?.data?.nodeType === 'gateway' || edge.target?.startsWith('gw_') || edge.target === 'gw_presupuesto';
        updateInitiativeData(targetStatusName, { 
          current_node_id: targetId,
          target_node_id: targetId,
          gateway_node_id: isGw ? edge.target : undefined,
          transition_label: actualButtonLabel,
          form_data: updatedFd
        });
      }
    );
  };


  const handleFieldChange = (type: 'form_data'|'summary', key: string, val: any) => {
    if (type === 'form_data') {
      const newForm = { ...editedFormData, [key]: val };
      if (key === 'vicepresidencia') {
        newForm.direccion = "";
        newForm.registrador = "";
      }
      if (key === 'direccion') {
        newForm.registrador = "";
      }
      setEditedFormData(newForm);
    } else {
      setEditedSummary({ ...editedSummary, [key]: val });
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center gap-3 py-20 text-[#94A3B8]">
      <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
      Cargando detalle...
    </div>
  );

  if (!initiative) return (
    <div className="text-center py-20">
      <p className="text-[#94A3B8] mb-3">No se encontró la iniciativa.</p>
      <Link to="/bandeja" className="text-[#4F5AF5] font-semibold hover:text-[#3F49E0]">← Volver a la bandeja</Link>
    </div>
  );

  const s = initiative.summary ?? {};
  const fd = initiative.form_data ?? {};
  const title = s.titulo ?? Object.values(fd)[0] ?? initiative.id;

  const currentNode = activeWorkflow?.graph_json?.nodes?.find(
    (n: any) => n.id === (initiative?.current_node_id || STATUS_TO_NODE[initiative?.status])
  );
  const currentStatusLabel = currentNode?.data?.label || initiative.status;

  const nodeSubtype = currentNode?.data?.stateSubtype;
  const isObserved = nodeSubtype === "observada" || initiative.status === "Observada";
  const isBorrador = (initiative.current_node_id || STATUS_TO_NODE[initiative.status]) === "borrador" || initiative.status === "Borrador";
  const isDesestimada = nodeSubtype === "desestimada" || initiative.status === "Desestimada";
  const isEnDemanda = nodeSubtype === "demanda" || initiative.status === "En demanda";
  const isPending = !isObserved && !isBorrador && !isDesestimada && !isEnDemanda;

  let statusStyle = STATUS_STYLE[initiative.status] || "bg-[#EEF2FF] text-[#4F5AF5] border-[#4F5AF5]/30";
  if (isBorrador) statusStyle = "bg-slate-100 text-slate-600 border-slate-200";
  else if (isObserved) statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
  else if (isDesestimada) statusStyle = "bg-red-50 text-red-700 border-red-200";
  else if (isEnDemanda) statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
  const hasSidebar = Boolean((fd.bp_ti_asignado && !isEditingBP) || (isBP || isAdmin));
  let voboFileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  const rawVoboStr = fd.aprobacion_de_director ?? fd.aprobacin_de_director;
  if (typeof rawVoboStr === "string" && rawVoboStr.startsWith('{"name":')) {
    try {
      voboFileObj = JSON.parse(rawVoboStr);
    } catch (e) {}
  }

  const chatHistory = (Array.isArray(initiative?.chat_history) && initiative.chat_history.length > 0)
    ? initiative.chat_history
    : (Array.isArray(fd?.chat_history) && fd.chat_history.length > 0 ? fd.chat_history : []);

  const unstructuredText = initiative?.unstructured_text || fd?.unstructured_text || "";
  
  const suggestedChanges = fd._suggested_changes || { form_data: {}, summary: {} };
  const hasSuggestedChanges = Object.keys(suggestedChanges.form_data).length > 0 || Object.keys(suggestedChanges.summary).length > 0;

  const validationErrors: string[] = [];
  if (isPending || isObserved) {
    const currentFd = isEditMode ? editedFormData : fd;
    const currentSummary = isEditMode ? editedSummary : s;

    const getVal = (key: string) => {
      const fdVal = getValueCaseInsensitive(currentFd, key);
      if (fdVal !== undefined && fdVal !== null && fdVal !== '') return fdVal;
      const sumVal = getValueCaseInsensitive(currentSummary, key);
      return sumVal;
    };

    if (!getVal("bp_ti_asignado")) {
      if ((isAdmin || isBP) && !isMine) {
        validationErrors.push("Debes asignar un Business Partner de TI (BP TI) a la iniciativa.");
      } else {
        validationErrors.push("El Business Partner de TI (BP TI) debe ser asignado por el equipo de TI.");
      }
    }

    const voboVal = getVal("aprobacion_de_director") ?? getVal("aprobacin_de_director");
    let currentVoboFileObj = null;
    if (voboVal) {
      if (typeof voboVal === "string" && voboVal.startsWith('{"name":')) {
        try {
          currentVoboFileObj = JSON.parse(voboVal);
        } catch (e) {}
      } else if (typeof voboVal === "object" && (voboVal as any).name) {
        currentVoboFileObj = voboVal;
      }
    }

    if (!currentVoboFileObj) {
      validationErrors.push("Debes cargar el documento de Visto Bueno (VoBo VP).");
    } else if (currentFd._vobo_status !== "correcto") {
      if (currentFd._vobo_status === "incorrecto") {
        if (isMine) {
          validationErrors.push("El VoBo fue rechazado. Debes cargar el Visto Bueno (VoBo VP) correcto.");
        } else if (isAdmin || isBP) {
          validationErrors.push("El VoBo actual es Incorrecto. El solicitante debe cargar el VoBo correcto.");
        } else {
          validationErrors.push("El VoBo fue rechazado. Debes cargar el Visto Bueno (VoBo VP) correcto.");
        }
      } else {
        if ((isAdmin || isBP) && !isMine) {
          validationErrors.push("Debes revisar y marcar el Visto Bueno (VoBo VP) como Correcto.");
        } else {
          validationErrors.push("El Business Partner de TI (BP TI) debe validar tu Visto Bueno (VoBo VP) y marcarlo como Correcto.");
        }
      }
    }

    const requiredFields = fieldsConfig.filter(f => f.is_required && f.is_visible && f.key !== 'aprobacion_de_director' && f.key !== 'aprobacin_de_director');
    requiredFields.forEach(f => {
      const val = getVal(f.key);
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        validationErrors.push(`Debes completar el campo obligatorio: "${f.label}".`);
      }
    });
  }

  const getFieldConfig = (key: string) => {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey === 'vicepresidencia') {
       return { field_type: 'select', options: dbVps.map(v => v.name) };
    }
    if (lowerKey === 'direccion') {
       const vpName = isEditMode ? editedFormData.vicepresidencia : (initiative?.form_data?.vicepresidencia);
       const vpId = dbVps.find(v => v.name === vpName)?.id;
       const dirs = dbDirecciones.filter(d => d.vp_id === vpId);
       return { field_type: 'select', options: dirs.map(d => d.name) };
    }
    if (lowerKey === 'registrador') {
       const vpName = isEditMode ? editedFormData.vicepresidencia : (initiative?.form_data?.vicepresidencia);
       const dirName = isEditMode ? editedFormData.direccion : (initiative?.form_data?.direccion);
       const vpId = dbVps.find(v => v.name === vpName)?.id;
       const dirId = dbDirecciones.find(d => d.name === dirName && d.vp_id === vpId)?.id;
       
       let availableUsers = dbUsers;
       if (vpId && dirId) {
          availableUsers = dbUsers.filter(u => 
             u.user_roles_whitelist?.some((r: any) => 
               r.role === 'registrador' && 
               (r.is_transversal || (r.vp_id === vpId && (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))))
             )
          );
       }
       const names = Array.from(new Set(availableUsers.map(u => u.name))).sort();
       return { field_type: 'select', options: names };
    }

    return fieldsConfig.find(f => f.key.toLowerCase() === lowerKey);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <Link to="/bandeja" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] mb-4 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver a la Bandeja
        </Link>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700 shadow-2xs">
                <span>{initiative.id}</span>
                <button
                  onClick={handleCopyId}
                  className="hover:text-[#4F5AF5] text-slate-400 transition-colors p-0.5"
                  title="Copiar ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {String(title)}
            </h2>
            {s.tipoIniciativa && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">{s.tipoIniciativa}</p>
            )}
          </div>

          {/* Action buttons bar: Left group (forward / editing) and Right group (observe / desestimar) */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-1">
            {/* Left-aligned actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View AI Chat / Unstructured Input Button */}
              {(chatHistory.length > 0 || (unstructuredText && unstructuredText.trim().length > 0)) && (
                <button
                  type="button"
                  onClick={() => setShowChatModal(true)}
                  className="flex items-center gap-2 border border-[#4F5AF5]/30 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F5AF5] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-xs"
                  title={chatHistory.length > 0 ? "Ver conversación completa con el asistente Teo" : "Ver texto original ingresado"}
                >
                  <MessageSquare className="w-4 h-4" />
                  {chatHistory.length > 0 ? "Ver conversación con Teo" : "Ver texto original"}
                </button>
              )}

              {/* Botón Unificado de Edición Directa (Controlado por canEditCurrentStage) */}
              {!isEditMode && canEditCurrentStage && initiative?.status !== 'Planificación' && initiative?.status !== 'Desestimada' && (
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#1E293B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
                  title="Modificar cualquier información registrada previamente"
                >
                  <Pencil className="w-4 h-4 text-[#4F5AF5]" />
                  Editar
                </button>
              )}

              {/* Botones de Transición para Avanzar Estado */}
              {!isEditMode && userOutgoingEdges
                .filter((edge: any) => {
                  const targetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === edge.target);
                  const isDesestimar = edge.target === 'desestimada' || targetNode?.data?.stateSubtype === 'desestimada';
                  const isObservar = edge.target === 'observada' || targetNode?.data?.stateSubtype === 'observada';
                  return !isDesestimar && !isObservar;
                })
                .map((edge: any) => {
                  const targetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === edge.target);
                  const buttonLabel = edge.label || targetNode?.data?.action_label || targetNode?.data?.label || 'Avanzar';
                  return (
                    <button
                      key={edge.id}
                      onClick={() => handleWorkflowTransition(edge, targetNode, buttonLabel)}
                      className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20 cursor-pointer"
                      title={`Mover iniciativa a ${targetNode?.data?.label || edge.target}`}
                    >
                      <Send className="w-4 h-4" />
                      {buttonLabel}
                    </button>
                  );
                })}

              {initiative?.status === 'En demanda' && (
                <>
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
                  >
                    <FileText className="w-4 h-4" />
                    Generar Informe (PDF)
                  </button>
                  <button
                    onClick={handleConsolidateAI}
                    disabled={isConsolidatingAI}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                    title="Sintetizar y consolidar dictámenes técnicos con TEO IA"
                  >
                    {isConsolidatingAI ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    )}
                    <span>Consolidación TEO</span>
                  </button>
                </>
              )}

              {initiative?.status === 'Desestimada' && (isAdmin || isBPAllowed) && (
                <>
                  <button
                    onClick={() => confirmAction(
                      "Mover a Nueva",
                      (
                        <div className="space-y-4">
                          <p>¿Estás seguro de regresar esta iniciativa a 'Nueva para revisión'?</p>
                          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 flex gap-2 text-slate-800">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu revisión y consentimiento.</span>
                          </div>
                        </div>
                      ),
                      "Sí, Mover a Nueva",
                      "bg-[#4F5AF5] hover:bg-[#3F49E0]",
                      <Clock className="w-6 h-6 text-[#4F5AF5]" />,
                      () => updateInitiativeData("Pendiente de aprobación")
                    )}
                    className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Mover a Nueva
                  </button>
                  <button
                    onClick={() => confirmAction(
                      "Mover a En demanda",
                      (
                        <div className="space-y-4">
                          <p>¿Estás seguro de mover esta iniciativa directamente a 'En demanda'?</p>
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex gap-2 text-emerald-800">
                            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span className="font-semibold text-sm">Al confirmar, declaras que esta acción se realiza bajo tu total revisión y consentimiento.</span>
                          </div>
                        </div>
                      ),
                      "Sí, Mover a En demanda",
                      "bg-emerald-600 hover:bg-emerald-500",
                      <CheckCircle className="w-6 h-6 text-emerald-500" />,
                      () => updateInitiativeData("En demanda")
                    )}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mover a En demanda
                  </button>
                </>
              )}

              {isEditMode && (
                <>
                  <button
                    onClick={cancelEditMode}
                    className="px-4 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  {initiative.status === "Borrador" || (initiative.status === "Observada" && isRegistrador && isMine) ? (
                    <button
                      onClick={initiative.status === "Borrador" ? handleSaveDraftEdits : handleSaveObservedEdits}
                      className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Cambios
                    </button>
                  ) : (
                    <>
                      {canRejectCurrentStage && (
                        <button
                          onClick={handleObserve}
                          className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Observar con Cambios
                        </button>
                      )}
                      {canApproveCurrentStage && (
                        <button
                          onClick={handleApprove}
                          disabled={validationErrors.length > 0}
                          title={validationErrors.length > 0 ? `Requisitos pendientes:\n${validationErrors.join('\n')}` : "Aprobar con Cambios"}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprobar con Cambios
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {isRegistrador && isMine && isObserved && !isEditMode && (
                <>
                  <button
                    onClick={startEditMode}
                    className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  {userOutgoingEdges.length === 0 && (
                    <button
                      onClick={handleReenviar}
                      className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Reenviar a Aprobación
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Right-aligned corrective actions: Observar / Desestimar (Flush to right margin) */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {!isEditMode && userOutgoingEdges
                .filter((edge: any) => {
                  const targetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === edge.target);
                  const isObservar = edge.target === 'observada' || targetNode?.data?.stateSubtype === 'observada';
                  const isDesestimar = edge.target === 'desestimada' || targetNode?.data?.stateSubtype === 'desestimada';
                  return isObservar || isDesestimar;
                })
                .map((edge: any) => {
                  const targetNode = activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === edge.target);
                  const isObservar = edge.target === 'observada' || targetNode?.data?.stateSubtype === 'observada';
                  const isDesestimar = edge.target === 'desestimada' || targetNode?.data?.stateSubtype === 'desestimada';
                  const buttonLabel = (isObservar && /desestimar/i.test(edge.label || '')) 
                    ? 'Observar' 
                    : (edge.label || targetNode?.data?.action_label || targetNode?.data?.label || (isDesestimar ? 'Desestimar' : 'Observar'));

                  if (isDesestimar) {
                    return (
                      <button
                        key={edge.id}
                        onClick={openDesestimarModal}
                        className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        title={buttonLabel}
                      >
                        <Ban className="w-4 h-4" />
                        {buttonLabel}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={edge.id}
                      onClick={() => openObserveModal(edge, targetNode, buttonLabel)}
                      className="flex items-center gap-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
                      title={buttonLabel}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      {buttonLabel}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Executive Metric Ribbon (6 Responsive Cols — No Text Truncations) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Institución */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Institución</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {Array.isArray(fd.institucion) ? fd.institucion.join(', ') : (fd.institucion || "No especificada")}
              </p>
            </div>
          </div>

          {/* Vicepresidencia */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F5AF5] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Vicepresidencia</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {fd.vicepresidencia || "No especificada"}
              </p>
            </div>
          </div>

          {/* Dirección */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Dirección Solicitante</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {fd.direccion || "No especificada"}
              </p>
            </div>
          </div>

          {/* Key User / Solicitante */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Líder Solicitante</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {fd.registrador || fd.solicitante || "No especificado"}
              </p>
            </div>
          </div>

          {/* BP TI Asignado */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Business Partner TI</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {(fd.bp_ti_asignado || stageFormData.bp_ti_asignado) ? (
                  <span className="text-[#4F5AF5] font-extrabold">{fd.bp_ti_asignado || stageFormData.bp_ti_asignado}</span>
                ) : (
                  <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">En asignación</span>
                )}
              </p>
            </div>
          </div>

          {/* Fecha y Registro */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Fecha de Registro</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                {initiative.created_at
                  ? formatDateDDMMYYYY(initiative.created_at)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Corporate Lifecycle Stepper Rail (Visual Enterprise Flow) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Banner de Estado Excepcional: Observada */}
        {isObservedState && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <AlertTriangle className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Iniciativa en Estado de Observación
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300/60">
                    Avance Pausado
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 font-medium">
                  Detenida temporalmente en etapa: <strong className="font-bold">{WORKFLOW_STAGES_TIMELINE[activeTimelineStepIndex]?.label || 'Evaluación'}</strong>. Se requiere subsanar las observaciones para continuar con el flujo corporativo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Estado Excepcional: Desestimada */}
        {isDesestimadaState && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50 to-red-50/50 border border-rose-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Ban className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                    Iniciativa Desestimada
                  </span>
                  <span className="text-[10px] font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full border border-rose-300/60">
                    Ciclo Cancelado
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-0.5 font-medium">
                  Esta iniciativa fue desestimada en la etapa <strong className="font-bold">{WORKFLOW_STAGES_TIMELINE[activeTimelineStepIndex]?.label || 'Evaluación'}</strong>. Las etapas posteriores quedan canceladas y no admiten avances.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto pb-2">
          <div className="flex items-start w-full min-w-[760px] relative">
            {WORKFLOW_STAGES_TIMELINE.map((stage, idx) => {
              const isStageObserved = isObservedState && idx === activeTimelineStepIndex;
              const isStageDesestimada = isDesestimadaState && idx === activeTimelineStepIndex;
              const isFutureAfterDesestimada = isDesestimadaState && idx > activeTimelineStepIndex;

              const isCompleted = isEndWorkflowState || idx < activeTimelineStepIndex;
              const isCurrent = !isEndWorkflowState && !isObservedState && !isDesestimadaState && idx === activeTimelineStepIndex;
              const isSelected = selectedTimelineStageKey === stage.key;
              const isLast = idx === WORKFLOW_STAGES_TIMELINE.length - 1;
              const isSegmentCompleted = isEndWorkflowState || idx < activeTimelineStepIndex;
              const stageVisibleSubNodes = getStageVisibleSubNodes(stage.key);
              const hasMultipleSubNodes = stageVisibleSubNodes.length > 1;

              return (
                <div key={stage.key} className={`flex-1 relative flex flex-col items-center ${isFutureAfterDesestimada ? 'opacity-35' : ''}`}>
                  {/* Segment connector to next step — ONLY rendered if NOT the last step! Mathematically bounded! */}
                  {!isLast && (
                    <div 
                      className={`absolute top-[18px] left-1/2 w-full h-[3px] -translate-y-1/2 z-0 transition-all duration-300 ${
                        isSegmentCompleted ? 'bg-emerald-500' : isFutureAfterDesestimada ? 'bg-slate-200 border-t border-dashed border-slate-300' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTimelineStageKey(stage.key);
                      setSelectedSubNodeId(null); // Vista consolidada automática al dar clic en la etapa macro
                      setActiveDetailTab('info');
                      if (hasMultipleSubNodes) {
                        setOpenPopoverStageKey(prev => prev === stage.key ? null : stage.key);
                      } else {
                        setOpenPopoverStageKey(null);
                      }
                    }}
                    className="flex flex-col items-center relative z-10 w-full px-1 group cursor-pointer focus:outline-none transition-all"
                    title={
                      isStageObserved
                        ? `Etapa en observación (${stage.label})`
                        : isStageDesestimada
                        ? `Etapa cancelada / desestimada (${stage.label})`
                        : isEndWorkflowState
                        ? `Etapa completada con éxito (${stage.label})`
                        : idx === 0
                        ? 'Ver Solicitud y Ficha de Registro (Key User)'
                        : isCompleted
                        ? `Ver Dictamen Vigente de ${stage.label}`
                        : isCurrent
                        ? `Etapa activa actual (${stage.label})`
                        : `Etapa futura (${stage.label} - ${stage.subtitle})`
                    }
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 group-hover:scale-105 ${
                      isStageObserved
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm animate-pulse'
                        : isStageDesestimada
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-sm'
                        : isSelected
                        ? 'ring-4 ring-indigo-200 shadow-md ' + (isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white')
                        : isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm'
                        : 'bg-white text-slate-400 border-2 border-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-600'
                    }`}>
                      {isStageObserved ? (
                        <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                      ) : isStageDesestimada ? (
                        <Ban className="w-4 h-4 stroke-[2.5]" />
                      ) : isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <span className={`text-[11px] font-bold mt-2 text-center leading-tight transition-colors px-1 ${
                      isStageObserved
                        ? 'text-amber-800 font-black'
                        : isStageDesestimada
                        ? 'text-rose-800 font-black'
                        : isSelected 
                        ? 'text-indigo-600 font-black' 
                        : isCurrent 
                        ? 'text-slate-900 font-black' 
                        : isCompleted 
                        ? 'text-slate-800 group-hover:text-indigo-600' 
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {stage.label}
                    </span>

                    <span className={`text-[10px] font-medium text-center mt-0.5 leading-tight ${
                      isStageObserved
                        ? 'text-amber-600 font-bold'
                        : isStageDesestimada
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-400'
                    }`}>
                      {isStageObserved ? 'Observada' : isStageDesestimada ? 'Desestimada' : stage.subtitle}
                    </span>

                    {/* Indicador de sub-etapas desplegables: SOLO si tiene más de 1 sub-estado */}
                    {hasMultipleSubNodes && (
                      <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-tight transition-all duration-300 ${
                        openPopoverStageKey === stage.key
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}>
                        <span>{stageVisibleSubNodes.length} pasos</span>
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-500 ease-out ${
                          openPopoverStageKey === stage.key ? 'rotate-180' : ''
                        }`} />
                      </span>
                    )}

                    {/* Sleek active pill indicator underneath selected stage when it has no sub-steps badge */}
                    {isSelected && !hasMultipleSubNodes && (
                      <span className="mt-1.5 w-5 h-1 bg-indigo-600 rounded-full transition-all duration-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Desplegable Ejecutivo tipo Toggle Suave y Elegante para los sub-estados ── */}
        {(() => {
          const activeStageKey = openPopoverStageKey || lastOpenStageKey;
          const currentStageDef = WORKFLOW_STAGES_TIMELINE.find(s => s.key === activeStageKey);
          const visibleSubNodes = activeStageKey ? getStageVisibleSubNodes(activeStageKey) : [];
          const isOpen = Boolean(openPopoverStageKey && visibleSubNodes.length > 1);

          return (
            <div 
              className={`grid transition-[grid-template-rows,opacity,margin,padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isOpen 
                  ? 'grid-rows-[1fr] opacity-100 mt-4 pt-3.5 border-t border-slate-100/90' 
                  : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <div className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                }`}>
                  {/* Barra de cabecera ligera y minimalista */}
                  <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Layers className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-black text-slate-800 tracking-tight">
                        Sub-estados de {currentStageDef?.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        ({visibleSubNodes.length} pasos)
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium italic">
                      Clic en la tarea padre para plegar
                    </span>
                  </div>

                  {/* Riel horizontal con circulitos idénticos */}
                  <div className="overflow-x-auto pb-1 pt-1">
                    <div className="flex items-start w-full min-w-[560px] relative px-2">
                      {visibleSubNodes.map((sub, sIdx) => {
                        const subRecord = latestStageRecords.find(r => 
                          (r.node_id || '').toLowerCase() === sub.id.toLowerCase() ||
                          (r.stage_name || '').toLowerCase().includes(sub.id.toLowerCase())
                        );
                        const isSubActive = !isEndWorkflowState && initiative?.current_node_id === sub.id;
                        const isSubSelected = selectedSubNodeId === sub.id && selectedTimelineStageKey === currentStageDef?.key;
                        const isSubCompleted = !!subRecord;
                        const isLastSub = sIdx === visibleSubNodes.length - 1;
                        const isSubSegmentCompleted = isSubCompleted;

                        return (
                          <div key={sub.id} className="flex-1 relative flex flex-col items-center">
                            {/* Conector acotado entre circulitos — ¡NO sobresale del último circulito! */}
                            {!isLastSub && (
                              <div 
                                className={`absolute top-[16px] left-1/2 w-full h-[2.5px] -translate-y-1/2 z-0 transition-all duration-500 ease-out ${
                                  isSubSegmentCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTimelineStageKey(currentStageDef?.key || null);
                                setSelectedSubNodeId(sub.id);
                                setActiveDetailTab('info');
                              }}
                              className="flex flex-col items-center relative z-10 w-full px-1 group cursor-pointer focus:outline-none transition-all"
                              title={`Inspeccionar dictamen de ${sub.label} (${sub.role})`}
                            >
                              {/* Circulito idéntico al macro stepper */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out group-hover:scale-105 ${
                                isSubSelected
                                  ? 'ring-4 ring-indigo-200 shadow-md bg-indigo-600 text-white'
                                  : isSubCompleted
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-50'
                                  : isSubActive
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm animate-pulse'
                                  : 'bg-white text-slate-400 border-2 border-slate-300 group-hover:border-indigo-400 group-hover:text-indigo-600'
                              }`}>
                                {isSubCompleted ? (
                                  <Check className="w-4 h-4 stroke-[3]" />
                                ) : isSubActive ? (
                                  <Clock className="w-4 h-4" />
                                ) : (
                                  sIdx + 1
                                )}
                              </div>

                              {/* Nombre del sub-estado */}
                              <span className={`text-[11px] font-bold mt-1.5 text-center leading-tight transition-colors px-1 ${
                                isSubSelected 
                                  ? 'text-indigo-600 font-black' 
                                  : isSubCompleted 
                                  ? 'text-slate-800 group-hover:text-indigo-600' 
                                  : isSubActive 
                                  ? 'text-indigo-900 font-black' 
                                  : 'text-slate-400 group-hover:text-slate-600'
                              }`}>
                                {sub.label}
                              </span>

                              {/* Rol responsable */}
                              <span className="text-[10px] text-slate-400 font-medium text-center mt-0.5 leading-tight">
                                {sub.role}
                              </span>

                              {/* Indicador de seleccionado */}
                              {isSubSelected ? (
                                <span className="mt-1.5 w-4 h-1 bg-indigo-600 rounded-full transition-all duration-300" />
                              ) : (
                                <span className="mt-1.5 w-4 h-1 bg-transparent" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tabs & Initiative Content (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-full sm:w-fit overflow-x-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveDetailTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeDetailTab === 'info'
                  ? 'bg-white text-[#4F5AF5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Información de la Necesidad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeDetailTab === 'history'
                  ? 'bg-white text-[#4F5AF5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Trazabilidad & Cambios</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('observations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeDetailTab === 'observations'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Observaciones</span>
              {observationCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                  isObservedState 
                    ? 'bg-amber-500 text-white animate-pulse' 
                    : isDesestimadaState
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {observationCount}
                </span>
              )}
            </button>
          </div>

          {activeDetailTab === 'info' && (
            <div className="space-y-6">
              {/* ── PANEL EJECUTIVO DE OBSERVACIÓN Y SUBSANACIÓN (Solo si la iniciativa está Observada) ── */}
              {isObservedState && (
                <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-md shadow-amber-500/5 overflow-hidden">
                  {/* Encabezado del dictamen de observación */}
                  <div className="px-6 py-4 bg-gradient-to-r from-amber-50 via-orange-50/30 to-amber-50/10 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">Observación Activa en la Iniciativa</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                            {initiative?.form_data?._current_observation?.category || 'General'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          Formulada por {initiative?.form_data?._current_observation?.observed_by || 'Responsable'} ({initiative?.form_data?._current_observation?.user_role || 'BP TI'})
                          {initiative?.form_data?._current_observation?.date ? ` el ${formatDateDDMMYYYY(initiative.form_data._current_observation.date)}` : ''}
                          {initiative?.form_data?._current_observation?.from_stage ? ` desde etapa "${initiative.form_data._current_observation.from_stage}"` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Detalle del cuestionamiento formulado */}
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1">
                        Detalle del Cuestionamiento / Requerimiento:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {initiative?.form_data?._current_observation?.details || 'Se requiere subsanar la iniciativa para continuar con el flujo de aprobación.'}
                      </p>
                    </div>

                    {/* Formulario de Subsanación — Solo editable por los roles con permiso sobre la caja de Observación */}
                    {canManageObservada ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                            Respuesta de Subsanación / Justificación Técnica
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">Texto y/o archivos de respaldo</span>
                        </div>

                        <textarea
                          value={subsanacionComment}
                          onChange={(e) => setSubsanacionComment(e.target.value)}
                          placeholder="Describe detalladamente las correcciones realizadas, aclaraciones técnicas o ajustes incorporados..."
                          rows={3}
                          className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-slate-800 leading-relaxed resize-none transition-all"
                        />

                        {/* Zona de subida de archivos (Cyber Neo - Max 25 MB y tipos parametrizados) */}
                        {observadaNode?.data?.allowObservationFiles !== false && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">
                              Archivos Adjuntos de Soporte
                            </label>
                            
                            <div
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleSubsanacionFileUpload(e); }}
                              className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-4 sm:p-5 text-center transition-colors bg-slate-50/50 hover:bg-amber-50/30 group"
                            >
                              <input
                                type="file"
                                id="subsanacionFileInput"
                                multiple={observationFileOptions.allowMultiple !== false}
                                accept={observationAcceptedExtensions}
                                onChange={handleSubsanacionFileUpload}
                                className="hidden"
                              />
                              <label htmlFor="subsanacionFileInput" className="cursor-pointer flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-amber-600 group-hover:border-amber-300 shadow-2xs transition-all">
                                  {isUploadingSubsanacionFile ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                                  ) : (
                                    <Upload className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="text-xs text-slate-600">
                                  <span className="font-bold text-amber-700 hover:text-amber-800">Haz clic para subir</span> o arrastra archivos aquí
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Formatos autorizados: {[
                                    observationFileOptions.fileTypes?.pdf?.enabled !== false && `PDF (${observationFileOptions.fileTypes?.pdf?.maxMb || 25} MB)`,
                                    observationFileOptions.fileTypes?.docx?.enabled !== false && `Word (${observationFileOptions.fileTypes?.docx?.maxMb || 25} MB)`,
                                    observationFileOptions.fileTypes?.xlsx?.enabled !== false && `Excel (${observationFileOptions.fileTypes?.xlsx?.maxMb || 25} MB)`,
                                    observationFileOptions.fileTypes?.image?.enabled !== false && `Imágenes / Diagramas (${observationFileOptions.fileTypes?.image?.maxMb || 25} MB)`,
                                    observationFileOptions.fileTypes?.txt?.enabled !== false && `Texto (${observationFileOptions.fileTypes?.txt?.maxMb || 10} MB)`,
                                  ].filter(Boolean).join(' • ') || 'Configuración estándar (máx. 25 MB)'}
                                </span>
                              </label>
                            </div>

                            {subsanacionUploadError && (
                              <p className="text-xs text-rose-600 font-semibold mt-1">
                                {subsanacionUploadError}
                              </p>
                            )}

                            {/* Lista de archivos adjuntos */}
                            {subsanacionFiles.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {subsanacionFiles.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 shadow-2xs animate-in fade-in"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-amber-700 hover:underline max-w-[200px] truncate"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </a>
                                    {file.size && (
                                      <span className="text-[10px] text-amber-700/80 font-normal">
                                        ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubsanacionFile(fIdx)}
                                      className="text-amber-500 hover:text-rose-600 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                                      title="Remover archivo"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notificación guía para el envío */}
                        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                          <Info className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Una vez completada tu explicación o adjuntos los archivos, utiliza los botones de acción en la barra superior para reenviar o avanzar la iniciativa.</span>
                        </div>
                      </div>
                    ) : (
                      /* Modo Lectura / Auditoría para usuarios sin rol asignado en la caja de Observación (ej. el observador) */
                      <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-amber-900">Iniciativa en Proceso de Subsanación</h4>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Esta iniciativa se encuentra observada y en custodia de <strong>{observadaResponsibleRoleName}</strong> para la resolución de los requerimientos y carga de sustento.
                          </p>
                          <p className="text-[11px] text-amber-700/80">
                            Los campos de respuesta y adjuntos están habilitados únicamente para los roles con permiso sobre el estado "Observada".
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedTimelineStageKey && selectedTimelineStageKey !== 'borrador' ? (
                <div className="space-y-6">
                  {(() => {
                    const stgDef = WORKFLOW_STAGES_TIMELINE.find(s => s.key === selectedTimelineStageKey);
                    const stgIndex = WORKFLOW_STAGES_TIMELINE.findIndex(s => s.key === selectedTimelineStageKey);
                    const matchingRecords = latestStageRecords.filter(r => 
                      r.node_id === selectedTimelineStageKey || 
                      getTimelineStageKey(r.node_id, r.stage_name) === selectedTimelineStageKey ||
                      (selectedTimelineStageKey === 'eval_bp' && /bp/i.test(r.stage_name)) ||
                      (stgDef?.subNodes || []).some(sn => sn.id.toLowerCase() === (r.node_id || '').toLowerCase())
                    );

                    return (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50/90 to-slate-50 border border-indigo-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#4F5AF5] text-white flex items-center justify-center text-xs font-black shadow-xs">
                              {stgIndex + 1}
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-500 block">
                                Detalle de Etapa Seleccionada
                              </span>
                              <h4 className="text-sm font-black text-slate-900">
                                {stgDef?.label} ({stgDef?.subtitle})
                              </h4>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineStageKey(null)}
                            className="text-xs font-bold text-[#4F5AF5] hover:text-indigo-800 hover:underline flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-2xs transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver solicitud completa</span>
                          </button>
                        </div>

                        {(() => {
                          const selectedSubDef = stgDef?.subNodes?.find(s => s.id === selectedSubNodeId);
                          const recordsToRender = selectedSubNodeId
                            ? matchingRecords.filter(r => 
                                (r.node_id || '').toLowerCase() === selectedSubNodeId.toLowerCase() ||
                                (r.stage_name || '').toLowerCase().includes(selectedSubNodeId.toLowerCase())
                              )
                            : matchingRecords;

                          return (
                            <div className="space-y-4">
                              {/* Header informativo del modo de vista */}
                              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                                <div className="flex items-center gap-2">
                                  {selectedSubNodeId ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[#4F5AF5] font-bold flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5" />
                                      <span>Sub-estado: <strong>{selectedSubDef?.label}</strong> ({selectedSubDef?.role})</span>
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Vista Consolidada General ({matchingRecords.length} sub-etapa{matchingRecords.length === 1 ? '' : 's'} con registro)</span>
                                    </span>
                                  )}
                                </div>
                                {selectedSubNodeId && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubNodeId(null)}
                                    className="text-[11px] font-bold text-[#4F5AF5] hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Ver consolidado completo</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {recordsToRender.length > 0 ? (
                                <div className="space-y-4">
                                  {recordsToRender.map((record) => (
                                    <div key={record.id} className="p-5 rounded-2xl border border-indigo-200 bg-white shadow-xs space-y-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-[#4F5AF5] flex items-center justify-center text-xs font-bold shrink-0">
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                          </span>
                                          <h4 className="text-sm font-bold text-slate-900">
                                            {record.stage_name}
                                          </h4>
                                          {record.action_taken === 'observado' && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                              Observado
                                            </span>
                                          )}
                                        </div>

                                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                          <span>
                                            Evaluado por: <strong className="text-slate-800 font-semibold">{record.user_name || 'Evaluador'}</strong> ({record.user_role || 'BP TI'})
                                          </span>
                                          <span>•</span>
                                          <span>
                                            {formatDateTimeDDMMYYYY(record.submitted_at)}
                                          </span>
                                        </div>
                                      </div>

                                      {record.consent_text_snapshot && (
                                        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] mb-1">
                                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Consentimiento Certificado Digitalmente:</span>
                                          </div>
                                          <p className="italic font-sans text-slate-700 text-[11px] leading-relaxed">
                                            "{record.consent_text_snapshot}"
                                          </p>
                                        </div>
                                      )}

                                      {record.form_data && Object.keys(record.form_data).length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                          {Object.entries(record.form_data).map(([k, v]) => {
                                            if (v === undefined || v === null || v === '' || typeof v === 'object') return null;
                                            return (
                                              <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                                  {formatStageFieldLabel(k)}
                                                </span>
                                                <span className={`font-semibold ${k === 'presupuesto_estimado_usd' ? 'text-indigo-900 font-black text-sm' : 'text-slate-800'}`}>
                                                  {formatStageFieldValue(k, v)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : selectedSubNodeId ? (
                                <div className="p-6 bg-white border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <Clock className="w-5 h-5" />
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-700">
                                    Sin registro específico para "{selectedSubDef?.label}"
                                  </h5>
                                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                                    Este sub-estado aún no cuenta con un dictamen registrado o no requiere formulario propio en esta iniciativa.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubNodeId(null)}
                                    className="text-xs font-bold text-[#4F5AF5] hover:underline cursor-pointer pt-1"
                                  >
                                    Volver a la Vista Consolidada
                                  </button>
                                </div>
                              ) : selectedTimelineStageKey === currentTimelineStageKey && !isEndWorkflowState ? (
                                <div className="p-6 bg-white border border-indigo-100 rounded-2xl shadow-xs space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#4F5AF5] flex items-center justify-center font-bold">
                                      <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">
                                        Etapa en Curso: {stgDef?.label}
                                      </h4>
                                      <p className="text-xs text-slate-500">
                                        Responsable: <strong>{stgDef?.subtitle}</strong>
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    Esta etapa se encuentra actualmente activa en el ciclo de vida. Los evaluadores correspondientes están tramitando las validaciones o completando los formularios requeridos.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-center space-y-2">
                                  <p className="text-xs font-semibold text-slate-500">
                                    {isEndWorkflowState
                                      ? 'Etapa finalizada satisfactoriamente en el flujo de la iniciativa.'
                                      : 'Esta etapa aún no ha sido alcanzada en el ciclo de vida de la iniciativa.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
          {(isPending || (isBorrador && isAdmin)) && (isBP || isAdmin) && voboFileObj && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4F5AF5]" />
                  Validación de Visto Bueno (VoBo VP)
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  fd._vobo_status === "correcto" ? "bg-emerald-50 text-emerald-700"
                  : fd._vobo_status === "incorrecto" ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
                }`}>
                  {fd._vobo_status === "correcto" ? "Vobo Validado"
                   : fd._vobo_status === "incorrecto" ? "Vobo Rechazado"
                   : "Pendiente de Validación"}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Para poder aprobar esta iniciativa, debes revisar el documento cargado por el solicitante como visto bueno de la vicepresidencia.
                </p>

                {/* File box */}
                <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 w-fit">
                  {voboFileObj.name.toLowerCase().endsWith('.png') || voboFileObj.name.toLowerCase().endsWith('.jpg') || voboFileObj.name.toLowerCase().endsWith('.jpeg') || voboFileObj.name.toLowerCase().endsWith('.webp') ? (
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-[#334155]">{voboFileObj.name}</span>
                  {(voboFileObj.content || voboFileObj.url) && (
                    <button 
                      type="button" 
                      onClick={() => setIsVoboPreviewOpen(true)}
                      className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold ml-2 underline underline-offset-2 bg-transparent border-0 cursor-pointer p-0"
                    >
                      Vista preliminar
                    </button>
                  )}
                  {voboFileObj.url && (
                    <button 
                      type="button"
                      onClick={() => handleForceDownload(voboFileObj!.url!, voboFileObj!.name)}
                      className="text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold ml-2 underline underline-offset-2 bg-transparent border-0 cursor-pointer p-0"
                    >
                      Descargar
                    </button>
                  )}
                </div>

                {/* Vobo Preview Modal */}
                {isVoboPreviewOpen && (
                  <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
                      <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
                        <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
                          {voboFileObj.name.toLowerCase().endsWith('.png') || voboFileObj.name.toLowerCase().endsWith('.jpg') || voboFileObj.name.toLowerCase().endsWith('.jpeg') || voboFileObj.name.toLowerCase().endsWith('.webp') ? (
                            <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                          )}
                          <span className="truncate max-w-lg">{voboFileObj.name}</span>
                        </h3>
                        <button 
                          onClick={() => setIsVoboPreviewOpen(false)} 
                          className="text-[#94A3B8] hover:text-[#1E293B] transition-colors p-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex items-center justify-center min-h-[300px]">
                        {voboFileObj.url && (voboFileObj.type?.startsWith("image/") || voboFileObj.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)) ? (
                          <img src={voboFileObj.url} alt={voboFileObj.name} className="max-w-full max-h-[60vh] object-contain rounded-lg border border-[#E2E8F0] shadow-sm bg-white" />
                        ) : voboFileObj.url && (voboFileObj.type === "application/pdf" || voboFileObj.name.toLowerCase().endsWith(".pdf")) ? (
                          <div className="w-full h-[60vh] flex flex-col space-y-4">
                            <iframe 
                              src={voboFileObj.url} 
                              title={voboFileObj.name} 
                              className="w-full h-full rounded-lg border border-[#E2E8F0] shadow-sm bg-white"
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-inner self-stretch">
                            {voboFileObj.content ? (
                              <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#334155]">{voboFileObj.content}</pre>
                            ) : (
                              <span className="text-sm text-slate-400">Sin vista previa disponible para este formato.</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
                        {voboFileObj.url && (
                          <button
                            onClick={() => {
                              handleForceDownload(voboFileObj!.url!, voboFileObj!.name);
                              setIsVoboPreviewOpen(false);
                            }}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#4F5AF5] hover:bg-[#3F49E0] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            Descargar
                          </button>
                        )}
                        <button
                          onClick={() => setIsVoboPreviewOpen(false)}
                          className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Actions */}
                {!showVoboRejectInput ? (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleVoboCorrect}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        fd._vobo_status === "correcto"
                        ? "bg-emerald-600 text-white"
                        : "border border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Visto Bueno es Correcto
                    </button>
                    <button
                      onClick={() => setShowVoboRejectInput(true)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        fd._vobo_status === "incorrecto"
                        ? "bg-red-600 text-white"
                        : "border border-red-600 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Visto Bueno es Incorrecto
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#FFFBEB] border border-amber-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Indicar motivo de observación del VoBo</h4>
                    <textarea
                      value={voboRejectReason}
                      onChange={(e) => setVoboRejectReason(e.target.value)}
                      placeholder="Escribe aquí el motivo por el cual el Visto Bueno no es correcto..."
                      rows={3}
                      className="w-full border border-amber-200 bg-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleVoboIncorrectSubmit}
                        disabled={!voboRejectReason.trim()}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm"
                      >
                        Confirmar Observación
                      </button>
                      <button
                        onClick={() => {
                          setShowVoboRejectInput(false);
                          setVoboRejectReason("");
                        }}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {canModify && isObserved && hasSuggestedChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-amber-800 text-sm mb-1">Cambios Sugeridos</h4>
                <p className="text-amber-700 text-sm leading-relaxed mb-3">
                  El aprobador ha observado esta iniciativa y dejado sugerencias de cambio. Por favor revisa los campos abajo, acepta las sugerencias o aplica tus propias correcciones, y luego haz clic en "Reenviar a Aprobación".
                </p>
                <button
                  onClick={handleAcceptAllChanges}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 transition-colors text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Aceptar todos los cambios
                </button>
              </div>
            </div>
          )}



          {initiative.status === "Observada" && (
            <div className="bg-amber-50 border border-amber-250 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2 w-full">
                  <h4 className="text-sm font-bold text-amber-900">Motivo de Observación</h4>
                  
                  {(() => {
                    const history = fd._observation_history || [];
                    const lastObs = [...history].reverse().find((h: any) => h.action === "Observada");
                    
                    if (!lastObs) {
                      return <p className="text-xs text-amber-700">No se especificó un detalle en el historial.</p>;
                    }

                    return (
                      <div className="text-xs text-amber-800 space-y-1.5 bg-white/60 p-3 rounded-lg border border-amber-200/50">
                        <div className="flex justify-between items-center text-[10px] text-amber-600 font-bold uppercase">
                          <span>Observado por: {lastObs.user_name || lastObs.user} ({lastObs.user_role || lastObs.role || "BP TI"})</span>
                          <span>{lastObs.date ? formatDateTimeDDMMYYYY(lastObs.date) : ""}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm mt-1">
                          {lastObs.details || lastObs.comment || "Observó la iniciativa con cambios sugeridos."}
                        </p>
                      </div>
                    );
                  })()}

                  {hasSuggestedChanges && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-bold text-amber-800">Campos con modificaciones sugeridas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(suggestedChanges.form_data || {}).map(k => (
                          <span key={k} className="bg-white border border-amber-200 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                            {formatLabel(k, fieldsMap)}
                          </span>
                        ))}
                        {Object.keys(suggestedChanges.summary || {}).map(k => (
                          <span key={k} className="bg-white border border-amber-200 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                            {formatLabel(k, fieldsMap)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}





{/* ─── Executive Bento Cards (Structured VP Business Case) ─── */}
          {(() => {
            const normalFields = fieldsConfig.filter(f => f.is_visible && (f.section || 'form') === 'form' && f.key !== 'aprobacion_de_director' && f.key !== 'aprobacin_de_director');
            const voboField = fieldsConfig.find(f => f.is_visible && (f.key === 'aprobacion_de_director' || f.key === 'aprobacin_de_director'));
            const allFields = voboField ? [...normalFields, voboField] : normalFields;

            const renderFieldRow = (f: any) => {
              const k = f.key;
              const v = getValueCaseInsensitive(fd, k) ?? "";
              return (
                <Row 
                  key={k} 
                  label={f.label} 
                  value={v}
                  isEditMode={isEditMode}
                  editValue={getValueCaseInsensitive(editedFormData, k) ?? ""}
                  onChange={(val: any) => handleFieldChange('form_data', k, val)}
                  fieldConfig={f}
                  suggestedValue={suggestedChanges.form_data[k]}
                  onAccept={canModify && isObserved && suggestedChanges.form_data[k] !== undefined ? () => handleAcceptChange('form_data', k, suggestedChanges.form_data[k]) : undefined}
                  onReject={canModify && isObserved && suggestedChanges.form_data[k] !== undefined ? () => handleRejectChange('form_data', k) : undefined}
                  isConfirmed={initiative.confirmed_fields?.[k] || false}
                  editConfirmed={editedConfirmedFields[k] || false}
                  onConfirmedChange={(checked: boolean) => setEditedConfirmedFields(prev => ({ ...prev, [k]: checked }))}
                />
              );
            };

            const businessKeys = ['titulo', 'objetivo', 'descripcin_del_problema_o_desafo_situacin_actual', 'descripcion_de_la_necesidad', 'qu_pasa_si_no_lo_tenemos_en_esta_fecha', 'fecha_requerida'];
            const strategicKeys = ['pilar_estratgico', 'beneficio_cuantitativo_anual', 'beneficio_cualitativo', 'es_proyecto_spo'];
            const operationalKeys = ['proceso_y_areas_impactadas', 'es_un_proceso_nuevo', 'usuarios_beneficiados', 'qu_escenarios_de_pruebas_debemos_considerar'];
            const headerKeys = ['institucion', 'vicepresidencia', 'direccion', 'registrador', 'solicitante', 'bp_ti_asignado'];

            const businessFields = allFields.filter(f => businessKeys.includes(f.key));
            const strategicFields = allFields.filter(f => strategicKeys.includes(f.key));
            const operationalFields = allFields.filter(f => operationalKeys.includes(f.key));
            const additionalFields = allFields.filter(f => 
              !businessKeys.includes(f.key) && 
              !strategicKeys.includes(f.key) && 
              !operationalKeys.includes(f.key) &&
              (!headerKeys.includes(f.key) || isEditMode)
            );

            return (
              <div className="space-y-6">
                {/* 1. Propósito y Caso de Negocio */}
                {businessFields.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4F5AF5] flex items-center justify-center font-bold">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            1. Propósito & Caso de Negocio
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Definición del dolor del negocio, objetivos y justificación de impacto.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4F5AF5] border border-indigo-100/80">
                        Estratégico
                      </span>
                    </div>
                    <div className="px-6 py-2 divide-y divide-slate-100">
                      {businessFields.map(renderFieldRow)}
                    </div>
                  </div>
                )}

                {/* 2. Retorno e Impacto Estratégico */}
                {strategicFields.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 to-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            2. Retorno & Alineación Estratégica
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Pilar institucional, retorno financiero estimado y clasificación SPO.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/80">
                        Retorno & Valor
                      </span>
                    </div>
                    <div className="px-6 py-2 divide-y divide-slate-100">
                      {strategicFields.map(renderFieldRow)}
                    </div>
                  </div>
                )}

                {/* 3. Alcance Operativo y Pruebas */}
                {operationalFields.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/40 to-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            3. Alcance Operativo & Escenarios de Prueba
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Procesos afectados, usuarios impactados y criterios de validación operativa.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100/80">
                        Operación
                      </span>
                    </div>
                    <div className="px-6 py-2 divide-y divide-slate-100">
                      {operationalFields.map(renderFieldRow)}
                    </div>
                  </div>
                )}

                {/* 4. Información Adicional (si existen otros campos) */}
                {additionalFields.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            4. Datos Complementarios
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Información técnica y organizacional adicional registrada.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-2 divide-y divide-slate-100">
                      {additionalFields.map(renderFieldRow)}
                    </div>
                  </div>
                )}

                {/* 5. Estimación Técnica & Presupuesto (Líder de Dominio) */}
                {Boolean(
                  fd.presupuesto_estimado_usd ||
                  fd.tiempo_atencion_esfuerzo ||
                  fd.justificacion_presupuesto ||
                  fd.analista_responsable ||
                  fd.fecha_fin_estimacion
                ) && (
                  <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/30">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#4F5AF5] text-white flex items-center justify-center font-bold shadow-xs">
                          <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Estimación Técnica & Presupuesto (Líder de Dominio)
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Evaluación técnica, esfuerzo de desarrollo y sustento presupuestal de TI.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4F5AF5] border border-indigo-200">
                        Etapa 6: Estimación TI
                      </span>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {fd.presupuesto_estimado_usd && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100/80 shadow-2xs">
                            <span className="text-[10px] uppercase font-extrabold text-indigo-600 block mb-1">
                              Presupuesto Estimado Necesario
                            </span>
                            <span className="text-xl font-black text-indigo-950 block">
                              {formatStageFieldValue('presupuesto_estimado_usd', fd.presupuesto_estimado_usd)}
                            </span>
                          </div>
                        )}

                        {fd.tiempo_atencion_esfuerzo && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Tiempo Estimado de Atención
                            </span>
                            <span className="text-base font-black text-slate-800 block">
                              {fd.tiempo_atencion_esfuerzo}
                            </span>
                            <span className="text-[10px] text-slate-400">Esfuerzo estimado de TI</span>
                          </div>
                        )}

                        {fd.requiere_presupuesto && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              ¿Requiere Presupuesto?
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              /s[ií]/i.test(fd.requiere_presupuesto)
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {fd.requiere_presupuesto}
                            </span>
                          </div>
                        )}

                        {fd.analista_responsable && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Analista Responsable Asignado
                            </span>
                            <span className="text-xs font-bold text-slate-800 block">
                              {fd.analista_responsable}
                            </span>
                          </div>
                        )}

                        {(fd.fecha_inicio_estimacion || fd.fecha_fin_estimacion) && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Ventana de Estimación
                            </span>
                            <span className="text-xs font-bold text-slate-800 block">
                              {fd.fecha_inicio_estimacion || '—'} al {fd.fecha_fin_estimacion || '—'}
                            </span>
                          </div>
                        )}

                        {fd.lider_de_dominio_responsable && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Líder de Dominio
                            </span>
                            <span className="text-xs font-bold text-slate-800 block">
                              {fd.lider_de_dominio_responsable}
                            </span>
                          </div>
                        )}
                      </div>

                      {fd.justificacion_presupuesto && (
                        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/70 space-y-1">
                          <span className="text-[10px] uppercase font-extrabold text-indigo-700 block">
                            Justificación del Presupuesto Requerido
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                            {fd.justificacion_presupuesto}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Support attachments */}
          {((editedFormData.attachments && Array.isArray(editedFormData.attachments)) ||
            (fd.attachments && Array.isArray(fd.attachments)) ||
            isEditMode) && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="text-sm font-bold text-[#1E293B]">Archivos de soporte cargados</h3>
                {isEditMode && (
                  <div>
                    <input
                      type="file"
                      id="support-file-upload"
                      className="hidden"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = '';
                        if (files.length === 0) return;
                        
                        const currentAttachments = Array.isArray(editedFormData.attachments) ? [...editedFormData.attachments] : [];
                        for (const file of files) {
                          try {
                            const dataF = new FormData();
                            dataF.append('file', file);
                            const res = await fetch('/api/chat/attach-file', { method: 'POST', body: dataF });
                            const resData = await res.json();
                            if (!res.ok) {
                              showToast(resData.error || `Error al subir el archivo "${file.name}"`, "error");
                              continue;
                            }
                            if (resData.url) {
                              currentAttachments.push({
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                url: resData.url
                              });
                            }
                          } catch (err: any) {
                            console.error("Error uploading support file:", err);
                            showToast(`Error de red al subir el archivo "${file.name}": ` + err.message, "error");
                          }
                        }
                        setEditedFormData((prev: any) => ({
                          ...prev,
                          attachments: currentAttachments
                        }));
                      }}
                    />
                    <label
                      htmlFor="support-file-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Adjuntar archivos
                    </label>
                  </div>
                )}
              </div>
              <div className="px-6 py-4">
                {(() => {
                  const attachmentsToRender = isEditMode
                    ? (editedFormData.attachments || [])
                    : (fd.attachments || []);
                  
                  if (attachmentsToRender.length === 0) {
                    return <p className="text-xs text-slate-400 text-center py-4">No hay archivos cargados.</p>;
                  }
                  
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachmentsToRender.map((file: any, fileIdx: number) => {
                        const isImage = file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
                        const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|webm|mov)$/i);
                        const isAudio = file.type?.startsWith('audio/') || file.name?.match(/\.(mp3|wav|ogg|m4a)$/i);
                        return (
                          <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
                            {isImage ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isVideo ? (
                              <VideoIcon className="w-4 h-4 text-purple-600 shrink-0" />
                            ) : isAudio ? (
                              <AudioIcon className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#1E293B] truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-[#64748B]">
                                {file.size ? (file.size / 1024).toFixed(0) + ' KB' : 'Adjunto'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {file.url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile({ url: file.url, name: file.name, type: file.type })}
                                  className="text-[#64748B] hover:text-[#4F5AF5] transition-colors p-1"
                                  title="Vista previa"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {file.url && (
                                <button
                                  type="button"
                                  onClick={() => handleForceDownload(file.url, file.name)}
                                  className="text-[#94A3B8] hover:text-[#4F5AF5] transition-colors p-1"
                                  title="Descargar"
                                >
                                  <span className="text-xs font-semibold underline">Descargar</span>
                                </button>
                              )}
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedFormData((prev: any) => ({
                                      ...prev,
                                      attachments: (prev.attachments || []).filter((_: any, idx: number) => idx !== fileIdx)
                                    }));
                                  }}
                                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors shrink-0"
                                  title="Eliminar archivo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Declaración de Responsabilidad (Consentimiento) */}
          {(isBorrador || isEditMode) ? (
            <div className={`rounded-2xl p-5 border transition-all ${
              Boolean(isEditMode ? editedFormData._director_declaration_accepted : (fd._director_declaration_accepted || fd.declaracion_responsabilidad))
                ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20'
                : 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
            }`}>
              <label className="flex items-start gap-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(isEditMode ? editedFormData._director_declaration_accepted : (fd._director_declaration_accepted || fd.declaracion_responsabilidad))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (isEditMode) {
                      setEditedFormData({
                        ...editedFormData,
                        _director_declaration_accepted: checked,
                        declaracion_responsabilidad: checked
                      });
                    } else {
                      const nextFd = {
                        ...(initiative.form_data || {}),
                        _director_declaration_accepted: checked,
                        declaracion_responsabilidad: checked
                      };
                      updateInitiativeData(initiative.status, { form_data: nextFd });
                    }
                  }}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-[#4F5AF5] focus:ring-[#4F5AF5] shrink-0 cursor-pointer"
                />
                {(() => {
                  const currentConsent = keyUserConsent || activeNodeConsent;
                  const cTitle = currentConsent?.title || "Declaración y Sustento del Solicitante (Key User)";
                  const cStatement = currentConsent?.statement || "Declaro bajo responsabilidad que la información consignada en esta solicitud es veraz, responde a una necesidad legítima de las operaciones o estrategia institucional, y cuenta con la documentación de sustento requerida para su análisis por TI.";
                  const cVersion = currentConsent?.version;

                  return (
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {cTitle}
                        </h4>
                        {cVersion && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            v{cVersion}
                          </span>
                        )}
                        {Boolean(isEditMode ? editedFormData._director_declaration_accepted : (fd._director_declaration_accepted || fd.declaracion_responsabilidad)) ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ Consentimiento Aceptado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pendiente de Aceptar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {cStatement}
                      </p>
                    </div>
                  );
                })()}
              </label>
            </div>
          ) : (fd._director_declaration_accepted || fd.declaracion_responsabilidad) ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 shadow-sm shadow-emerald-500/5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    {(keyUserConsent || activeNodeConsent)?.title || "Declaración y Sustento del Solicitante (Key User)"}
                  </h4>
                  {(keyUserConsent || activeNodeConsent)?.version && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                      v{(keyUserConsent || activeNodeConsent)?.version}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Consentimiento Aceptado
                  </span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {(keyUserConsent || activeNodeConsent)?.statement || "Declaro bajo responsabilidad que la información consignada en esta solicitud es veraz, responde a una necesidad legítima de las operaciones o estrategia institucional, y cuenta con la documentación de sustento requerida para su análisis por TI."}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    {(keyUserConsent || activeNodeConsent)?.title || "Declaración y Sustento del Solicitante (Key User)"}
                  </h4>
                  {(keyUserConsent || activeNodeConsent)?.version && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      v{(keyUserConsent || activeNodeConsent)?.version}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {(keyUserConsent || activeNodeConsent)?.statement || "Declaro bajo responsabilidad que la información consignada en esta solicitud es veraz, responde a una necesidad legítima de las operaciones o estrategia institucional, y cuenta con la documentación de sustento requerida para su análisis por TI."}
                </p>
              </div>
            </div>
          )}

                {/* Dictámenes Vigentes de Etapas Previas Integrados en la Solicitud Completa */}
                {selectedTimelineStageKey === null && latestStageRecords.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#4F5AF5]" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Evaluaciones & Dictámenes Vigentes de Etapas Previas
                      </h3>
                    </div>
                    {latestStageRecords.map((record) => (
                      <div key={record.id} className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              {record.stage_name}
                            </h4>
                            {record.action_taken === 'observado' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Observado
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>
                              Evaluado por: <strong className="text-slate-800 font-semibold">{record.user_name || 'Evaluador'}</strong> ({record.user_role || 'BP TI'})
                            </span>
                            <span>•</span>
                            <span>
                              {formatDateTimeDDMMYYYY(record.submitted_at)}
                            </span>
                          </div>
                        </div>

                        {/* Consent certification pill */}
                        {record.consent_text_snapshot && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] mb-1">
                              <Lock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Consentimiento Certificado Digitalmente:</span>
                            </div>
                            <p className="italic font-sans text-slate-700 text-[11px] leading-relaxed">
                              "{record.consent_text_snapshot}"
                            </p>
                          </div>
                        )}

                        {/* Form data */}
                        {record.form_data && Object.keys(record.form_data).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                            {Object.entries(record.form_data).map(([k, v]) => {
                              if (v === undefined || v === null || v === '' || typeof v === 'object') return null;
                              return (
                                <div key={k} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                    {formatStageFieldLabel(k)}
                                  </span>
                                  <span className={`font-semibold ${k === 'presupuesto_estimado_usd' ? 'text-indigo-900 font-black' : 'text-slate-800'}`}>
                                    {formatStageFieldValue(k, v)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: TRAZABILIDAD Y HISTORIAL */}
          {activeDetailTab === 'history' && (
            <div className="space-y-6">
              {/* Observation / Revision History */}
              {fd._observation_history && fd._observation_history.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-indigo-50/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Historial de Revisiones y Transiciones</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Auditoría cronológica del flujo y cambios de estado</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-[#4F5AF5] border border-indigo-100 shrink-0">
                      {fd._observation_history.length} transiciones
                    </span>
                  </div>

                  <div className="px-6 py-6 space-y-6">
                    {fd._observation_history.map((h: any, i: number) => {
                      const match = (h.details || '').match(/Se cambi[oó] el estado de '([^']+)' a '([^']+)'/i);
                      const isTransition = Boolean(match);
                      const fromState = match ? match[1] : null;
                      const toState = match ? match[2] : (h.action || '');
                      const targetState = toState || h.action || '';
                      const targetInfo = getHistoryStateInfo(targetState);
                      const fromInfo = fromState ? getHistoryStateInfo(fromState) : null;
                      const isLast = i === fd._observation_history.length - 1;

                      return (
                        <div key={i} className="flex gap-4 relative group">
                          {/* Vertical connector line */}
                          {!isLast && (
                            <div className="absolute top-9 left-[17px] bottom-[-24px] w-[2.5px] bg-gradient-to-b from-slate-200 via-slate-200 to-slate-100 rounded-full z-0" />
                          )}

                          {/* Bolita de movimiento: correlativo secuencial con color de estado */}
                          <div 
                            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs relative z-10 transition-transform duration-200 group-hover:scale-110 cursor-default select-none shadow-2xs ${targetInfo.circleClass}`}
                            title={`Movimiento #${i + 1}: ${targetInfo.label}`}
                          >
                            <span>{i + 1}</span>
                            {targetState.toLowerCase().includes('observad') && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-700 text-white flex items-center justify-center ring-2 ring-white">
                                <AlertTriangle className="w-2 h-2" />
                              </span>
                            )}
                          </div>

                          {/* Contenido interactivo del evento */}
                          <div className="flex-1 min-w-0 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/70 hover:border-slate-300 rounded-xl p-4 transition-all duration-200 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-5 h-5 rounded-full bg-slate-200/90 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {(h.user_name || "U").substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-black text-slate-900">
                                  {h.user_name || "Usuario"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50/80 text-indigo-700 border border-indigo-100/80">
                                  {h.user_role || "Sistema"}
                                </span>
                              </div>

                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 shrink-0">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatDateTimeDDMMYYYY(h.date)}
                              </span>
                            </div>

                            {/* Transición visual dinámica de estados */}
                            {isTransition && fromState && toState ? (
                              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200/90 shadow-2xs">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">De:</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${fromInfo?.dotColor || 'bg-slate-400'}`} />
                                  <span>{fromState}</span>
                                </div>

                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${targetInfo.badgeClass}`}>
                                  <span className="text-[9px] opacity-70 font-black uppercase tracking-wider">A:</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${targetInfo.dotColor}`} />
                                  <span>{toState}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${targetInfo.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${targetInfo.dotColor}`} />
                                  <span>{h.action || targetInfo.label}</span>
                                </span>
                              </div>
                            )}

                            {/* Comentarios u observaciones adicionales si no son solo la frase de cambio */}
                            {h.details && !h.details.toLowerCase().startsWith("se cambi") && (
                              <div className="mt-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
                                <p className="font-medium text-slate-800">{h.details}</p>
                              </div>
                            )}

                            {/* Archivos adjuntos de soporte en la observación o subsanación */}
                            {h.files && Array.isArray(h.files) && h.files.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {h.files.map((file: any, fIdx: number) => (
                                  <a
                                    key={fIdx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors shadow-2xs"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                    {file.size && (
                                      <span className="text-[10px] text-slate-400 font-normal">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Comparación de snapshot si existe */}
                            {h.snapshot && (
                              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                <button 
                                  type="button"
                                  onClick={() => setCompareSnapshot(h.snapshot)} 
                                  className="text-[11px] font-bold text-[#4F5AF5] bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-indigo-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Comparar vs Actual</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Sin historial de cambios registrado aún</h4>
                  <p className="text-xs text-slate-400 mt-1">Los cambios de estado, observaciones y dictámenes aprobados aparecerán aquí cronológicamente.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONVERSACIÓN, OBSERVACIONES Y DESESTIMACIONES */}
          {activeDetailTab === 'observations' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Encabezado del Tab */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        Historial de Observaciones
                      </h3>
                      <p className="text-xs text-slate-400 font-normal">
                        Trazabilidad de cuestionamientos, acuerdos y respuestas de subsanación
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
                      {observationThreads.length} {observationThreads.length === 1 ? 'ronda registrada' : 'rondas registradas'}
                    </span>
                  </div>
                </div>

                {/* Banner de alerta de estado actual */}
                {isObservedState && (
                  <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        Observación Activa en Proceso de Subsanación
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Esta iniciativa requiere correcciones técnicas o documentación de sustento antes de poder continuar en el flujo de aprobación.
                      </p>
                    </div>
                  </div>
                )}

                {isDesestimadaState && (
                  <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-start gap-3">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">
                        Iniciativa Desestimada
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                        El requerimiento fue formalmente desestimado según las justificaciones documentadas en este historial.
                      </p>
                    </div>
                  </div>
                )}

                {/* Listado de Rondas y Dictámenes */}
                <div className="p-6 space-y-6">
                  {observationThreads.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Sin observaciones registradas
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Esta iniciativa no presenta cuestionamientos ni antecedentes de desestimación en su ciclo de vida.
                      </p>
                    </div>
                  ) : (
                    observationThreads.map((thread, tIdx) => {
                      const isDesestimacion = thread.type === 'desestimacion';

                      if (isDesestimacion) {
                        return (
                          <div 
                            key={thread.id || tIdx} 
                            className="rounded-2xl border border-rose-200/90 bg-white overflow-hidden shadow-xs hover:border-rose-300 transition-all"
                          >
                            {/* Header Desestimación */}
                            <div className="px-5 py-3 bg-rose-50/70 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                  <Ban className="w-3 h-3" /> Dictamen de Desestimación
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  Etapa: <strong className="text-slate-700">{thread.stageName}</strong>
                                </span>
                              </div>
                              {thread.questionDate && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {formatDateTimeDDMMYYYY(thread.questionDate)}
                                </span>
                              )}
                            </div>

                            {/* Contenido Desestimación */}
                            <div className="p-5 space-y-3">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold">
                                  {(thread.questionBy || 'U').substring(0, 2).toUpperCase()}
                                </div>
                                <span>Desestimado por: <strong className="text-slate-900">{thread.questionBy}</strong></span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                                  {thread.questionRole}
                                </span>
                              </div>
                              <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                <p className="font-normal text-slate-700">{thread.questionDetails}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Tarjeta de Ronda de Observación
                      return (
                        <div 
                          key={thread.id || tIdx} 
                          className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
                        >
                          {/* Encabezado de la Ronda */}
                          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold shadow-2xs">
                                Ronda {thread.roundNumber}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                                {thread.category || 'General'}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Origen: <strong className="text-slate-700">{thread.stageName}</strong>
                              </span>
                            </div>

                            <div>
                              {thread.isResolved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Subsanada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendiente de Subsanación
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-5 sm:p-6 space-y-4">
                            {/* Mensaje 1: Cuestionamiento formulado por el Revisor */}
                            <div className="flex gap-3.5 items-start">
                              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {(thread.questionBy || 'BO').substring(0, 2).toUpperCase()}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">{thread.questionBy}</span>
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                                      {thread.questionRole}
                                    </span>
                                  </div>
                                  {thread.questionDate && (
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {formatDateTimeDDMMYYYY(thread.questionDate)}
                                    </span>
                                  )}
                                </div>

                                <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-50/90 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                  <p className="font-normal text-slate-700">{thread.questionDetails}</p>
                                </div>
                              </div>
                            </div>

                            {/* Conector sutil de conversación */}
                            <div className="ml-4 pl-0.5 border-l-2 border-slate-200/80 h-3" />

                            {/* Mensaje 2: Respuesta y Evidencias de Subsanación */}
                            {thread.isResolved ? (
                              <div className="flex gap-3.5 items-start">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {(thread.answerBy || 'BP').substring(0, 2).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900">{thread.answerBy || 'Responsable de Subsanación'}</span>
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                        {thread.answerRole || 'BP TI'}
                                      </span>
                                    </div>
                                    {thread.answerDate && (
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        {formatDateTimeDDMMYYYY(thread.answerDate)}
                                      </span>
                                    )}
                                  </div>

                                  <div className="p-4 rounded-2xl rounded-tl-sm bg-emerald-50/30 border border-emerald-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap space-y-3">
                                    <p className="font-normal text-slate-700">{thread.answerDetails || 'Subsanación técnica registrada.'}</p>

                                    {/* Archivos probatorios de sustento adjuntados */}
                                    {thread.answerFiles && thread.answerFiles.length > 0 && (
                                      <div className="pt-3 border-t border-emerald-200/60 space-y-2">
                                        <span className="text-[11px] font-semibold text-emerald-900 block">
                                          Documentos de sustento adjuntos ({thread.answerFiles.length}):
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          {thread.answerFiles.map((file: any, fIdx: number) => {
                                            const ext = (file.name || '').split('.').pop()?.toUpperCase() || 'DOC';
                                            return (
                                              <div 
                                                key={fIdx}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 shadow-2xs hover:border-emerald-400 transition-colors"
                                              >
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                                                  {ext}
                                                </span>
                                                <a 
                                                  href={file.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="font-medium text-slate-800 hover:text-emerald-600 hover:underline max-w-[200px] truncate"
                                                  title={file.name}
                                                >
                                                  {file.name}
                                                </a>
                                                {file.size && (
                                                  <span className="text-[10px] text-slate-400">
                                                    {(file.size / 1024 < 1024) 
                                                      ? `${(file.size / 1024).toFixed(0)} KB` 
                                                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                                                  </span>
                                                )}
                                                <a
                                                  href={file.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                                  title="Ver archivo"
                                                >
                                                  <Eye className="w-3.5 h-3.5" />
                                                </a>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Subsanación pendiente */
                              <div className="flex gap-3.5 items-start">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                  <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                </div>
                                <div className="flex-1 p-3.5 rounded-2xl rounded-tl-sm bg-slate-50/80 border border-dashed border-slate-300 text-xs text-slate-600">
                                  <span className="font-bold text-slate-800 block mb-0.5">Subsanación en Proceso</span>
                                  <p className="text-slate-500 leading-relaxed">
                                    Esperando respuesta técnica y documentos de soporte por parte de los roles asignados ({observadaResponsibleRoleName}).
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

    {/* Right Column: Stage Form & Decision Panel (Sticky on Desktop) */}
    <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 space-y-5">
{/* ══════════════════════════════════════════════════════════════════ */}
          {/* ── FICHA DE DICTAMEN & CONSENTIMIENTO DE ETAPA (ACTIVA) ────────── */}
          {(activeNodeForm || activeNodeConsent) && canActOnCurrentStage && initiative.status !== 'Desestimada' && initiative.status !== 'Borrador' && (initiative.current_node_id || STATUS_TO_NODE[initiative.status]) !== 'borrador' && (
            <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md shadow-indigo-500/5 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-white to-indigo-50/30 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F5AF5] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      {activeNodeForm?.name || activeNodeConsent?.title || (
                        `Información por Completar por ${
                          (userRolesList[0] === 'bp_ti' || isBP || /bp/i.test(activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === (initiative.current_node_id || STATUS_TO_NODE[initiative.status]))?.data?.label || ''))
                            ? 'el BP TI'
                            : (userRolesList[0] === 'business_owner' ? 'el Business Owner' : (userRolesList[0] === 'vp' ? 'la Vicepresidencia' : (userRolesList[0] || 'el Responsable')))
                        }`
                      )}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      Requerido
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Stage Form Dynamic Fields */}
                {activeNodeForm && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Criterios y Evaluación Técnica
                      </h4>
                      {activeNodeForm.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{activeNodeForm.description}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(activeNodeForm.fields || []).map((field) => {
                        const val = stageFormData[field.key] !== undefined ? stageFormData[field.key] : (initiative?.form_data?.[field.key] ?? '');
                        return (
                          <div
                            key={field.id}
                            className="w-full"
                          >
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                              <textarea
                                rows={3}
                                value={val}
                                onChange={(e) => handleStageFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder || 'Detalla tus observaciones o sustento...'}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                              />
                            ) : field.type === 'select' ? (
                              <select
                                value={val}
                                onChange={(e) => handleStageFieldChange(field.key, e.target.value)}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                              >
                                <option value="">Selecciona una opción...</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!val}
                                  onChange={(e) => handleStageFieldChange(field.key, e.target.checked)}
                                  className="w-4 h-4 rounded-md text-[#4F5AF5] focus:ring-[#4F5AF5] cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  {field.placeholder || 'Confirmar verificación de este criterio'}
                                </span>
                              </label>
                            ) : field.type === 'date' ? (
                              <DateInputDDMMYYYY
                                value={val || ''}
                                onChange={(nextVal) => handleStageFieldChange(field.key, nextVal)}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                              />
                            ) : field.type === 'number' ? (
                              <input
                                type="number"
                                value={val}
                                onChange={(e) => handleStageFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder || '0'}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                              />
                            ) : field.type === 'file' ? (
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  id={`stage_file_${field.key}`}
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const ft = field.fileOptions?.fileTypes;
                                    let typeKey: 'pdf' | 'docx' | 'xlsx' | 'image' | 'txt' = 'txt';
                                    const name = file.name.toLowerCase();
                                    if (name.endsWith('.pdf')) typeKey = 'pdf';
                                    else if (name.endsWith('.docx')) typeKey = 'docx';
                                    else if (name.endsWith('.xlsx') || name.endsWith('.xls')) typeKey = 'xlsx';
                                    else if (name.match(/\.(png|jpg|jpeg|webp)$/)) typeKey = 'image';

                                    const cfg = ft?.[typeKey] || { enabled: true, maxMb: 25 };
                                    if (ft && !cfg.enabled) {
                                      alert(`El formato ${typeKey.toUpperCase()} no está permitido.`);
                                      return;
                                    }
                                    if (file.size > (cfg.maxMb || 25) * 1024 * 1024) {
                                      alert(`El archivo supera el tamaño máximo de ${cfg.maxMb} MB.`);
                                      return;
                                    }

                                    try {
                                      const fd = new FormData();
                                      fd.append('file', file);
                                      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
                                      const data = await res.json();
                                      if (data.error) throw new Error(data.error);
                                      handleStageFieldChange(field.key, JSON.stringify({
                                        name: file.name,
                                        url: data.url,
                                        type: data.type || file.type,
                                        size: file.size
                                      }));
                                    } catch (err: any) {
                                      alert('Error al subir archivo: ' + err.message);
                                    }
                                  }}
                                />
                                {val ? (() => {
                                  let fileData: any = null;
                                  try { fileData = JSON.parse(val); } catch {}
                                  return (
                                    <div className="flex items-center gap-2 p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs">
                                      <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                                      <span className="font-semibold text-slate-700 truncate flex-1">{fileData?.name || val}</span>
                                      {fileData?.url && (
                                        <a
                                          href={fileData.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold text-[#4F5AF5] hover:underline"
                                        >
                                          Ver
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleStageFieldChange(field.key, '')}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })() : (
                                  <label
                                    htmlFor={`stage_file_${field.key}`}
                                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-indigo-50/50 border border-dashed border-slate-300 hover:border-indigo-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer transition-all"
                                  >
                                    <Paperclip className="w-4 h-4 text-indigo-500" />
                                    <span>{field.placeholder || 'Adjuntar archivo de sustento'}</span>
                                  </label>
                                )}
                              </div>
                            ) : field.type === 'role_user' ? (() => {
                              const eligibleUsers = getEligibleRoleUsers(field, fd);
                              const uniqueNames: string[] = Array.from(new Set(eligibleUsers.map((u: any) => String(u.name || '')))).filter(Boolean).sort();
                              const isSingle = uniqueNames.length === 1;
                              const currentValue = val || (isSingle ? uniqueNames[0] : (fd[field.key] || ''));

                              if (isSingle) {
                                const roleText = (field.target_role === 'bp_ti' || !field.target_role || /bp/i.test(field.label)) ? 'como BP TI' : 'con este rol';
                                return (
                                  <div className="space-y-1.5">
                                    <input
                                      type="text"
                                      value={uniqueNames[0]}
                                      disabled
                                      readOnly
                                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-100/80 border border-slate-200 text-slate-700 rounded-xl cursor-not-allowed font-medium select-none focus:outline-none"
                                    />
                                    <p className="text-[11px] text-slate-400 font-normal">
                                      * Asignado automáticamente: única persona asociada {roleText} para esta dirección.
                                    </p>
                                  </div>
                                );
                              }

                              if (uniqueNames.length === 0) {
                                return (
                                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>No hay usuarios activos registrados con este rol con alcance en esta dirección o transversal.</span>
                                  </div>
                                );
                              }

                              return (
                                <select
                                  value={currentValue}
                                  onChange={(e) => {
                                    handleStageFieldChange(field.key, e.target.value);
                                    if (field.key === 'bp_ti_asignado') setSelectedBP(e.target.value);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                                >
                                  <option value="">{field.placeholder || 'Selecciona un responsable...'}</option>
                                  {uniqueNames.map((name: string) => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              );
                            })() : (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleStageFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder || ''}
                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
                              />
                            )}

                            {field.helpText && field.type !== 'role_user' && (
                              <p className="text-[10px] text-slate-400 mt-1">{field.helpText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stage Consent Declaration */}
                {activeNodeConsent && (
                  <div className="pt-2">
                    <div className="border-b border-slate-100 pb-2 mb-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Declaración de Consentimiento Legal
                      </h4>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="active_stage_consent_check"
                          checked={stageConsentAccepted}
                          onChange={(e) => setStageConsentAccepted(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded-md text-[#4F5AF5] border-indigo-300 focus:ring-[#4F5AF5] cursor-pointer"
                        />
                        <label
                          htmlFor="active_stage_consent_check"
                          className="text-xs text-slate-800 leading-relaxed cursor-pointer font-sans select-none"
                        >
                          <strong className="block text-slate-900 font-bold mb-0.5">
                            {activeNodeConsent.title}
                          </strong>
                          "{activeNodeConsent.statement}"
                        </label>
                      </div>

                      <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Certificación de custodia IACS
                        </span>
                        <span className="font-mono">Versión oficial v{activeNodeConsent.version}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status / Block Warning Banner */}
                {!isStageReadyToApprove && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Requisitos de etapa pendientes:</span>
                      {missingStageFields.length > 0 && (
                        <span>• Campos obligatorios sin completar: <strong>{missingStageFields.join(', ')}</strong>. </span>
                      )}
                      {activeNodeConsent && !stageConsentAccepted && (
                        <span>• Debes marcar la casilla de aceptación de la declaración legal.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stage Info Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-slate-400">
                    * Los datos completados se guardan automáticamente.
                  </span>
                  <span className="text-[11px] font-semibold text-[#4F5AF5] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Completa la información y avanza con el botón superior
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* If stage form is not active for this user, show executive stage overview */}
          {!((activeNodeForm || activeNodeConsent) && canActOnCurrentStage && initiative.status !== 'Desestimada' && initiative.status !== 'Borrador' && (initiative.current_node_id || STATUS_TO_NODE[initiative.status]) !== 'borrador') && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#4F5AF5] flex items-center justify-center font-bold shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Estado del Requerimiento</h3>
                  <span className="text-xs font-semibold text-slate-500">Resumen y trazabilidad de flujo</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-500">Estado Actual:</span>
                  <span className="font-bold text-slate-800">{initiative.status}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-500">Dictámenes Registrados:</span>
                  <span className="font-bold text-[#4F5AF5]">{stageRecords.length} certificados</span>
                </div>
                {fd.bp_ti_asignado && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <span className="font-semibold text-indigo-700">BP TI Responsable:</span>
                    <span className="font-bold text-indigo-900">{fd.bp_ti_asignado}</span>
                  </div>
                )}
              </div>

              {/* Dictamen de Estimación Técnica a Validar (Solo visible durante etapas de validación 8A o 8B) */}
              {(() => {
                const currNode = (initiative as any)?.current_node_id || STATUS_TO_NODE[initiative?.status] || "";
                const isPendingValidation = currNode === 'val_est_bp' || currNode === 'vobo_est_bo';
                if (!isPendingValidation) return null;
                const hasEstimationData = Boolean(fd.presupuesto_estimado_usd || fd.tiempo_atencion_esfuerzo || fd.justificacion_presupuesto);
                if (!hasEstimationData) return null;

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#4F5AF5] text-white flex items-center justify-center text-xs font-bold">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Estimación Técnica a Validar
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {fd.presupuesto_estimado_usd && (
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Presupuesto</span>
                          <strong className="text-sm font-black text-[#4F5AF5]">
                            {formatStageFieldValue('presupuesto_estimado_usd', fd.presupuesto_estimado_usd)}
                          </strong>
                        </div>
                      )}
                      {fd.tiempo_atencion_esfuerzo && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Esfuerzo TI</span>
                          <strong className="text-xs font-bold text-slate-800">{fd.tiempo_atencion_esfuerzo}</strong>
                        </div>
                      )}
                    </div>
                    {fd.justificacion_presupuesto && (
                      <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Justificación</span>
                        <p className="text-slate-700 italic text-[11px] leading-relaxed">
                          "{fd.justificacion_presupuesto}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick Transition actions if available */}
              {!isEditMode && userOutgoingEdges.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Acciones de Transición Disponibles
                  </span>
                  <div className="space-y-2">
                    {userOutgoingEdges.map((edge) => {
                      const targetNode = activeWorkflow?.graph_json?.nodes?.find((n) => n.id === edge.target);
                      const isObservar = edge.target === 'observada' || targetNode?.data?.stateSubtype === 'observada';
                      const isDesestimar = edge.target === 'desestimada' || targetNode?.data?.stateSubtype === 'desestimada';
                      const buttonLabel = (isObservar && /desestimar/i.test(edge.label || '')) 
                        ? 'Observar' 
                        : (edge.label || targetNode?.data?.action_label || targetNode?.data?.label || 'Avanzar');

                      if (isObservar) {
                        return (
                          <button
                            key={edge.id}
                            onClick={() => handleWorkflowTransition(edge, targetNode, buttonLabel)}
                            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-600/20 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{buttonLabel}</span>
                          </button>
                        );
                      }

                      if (isDesestimar) {
                        return (
                          <button
                            key={edge.id}
                            onClick={() => handleWorkflowTransition(edge, targetNode, buttonLabel)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{buttonLabel}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={edge.id}
                          onClick={() => handleWorkflowTransition(edge, targetNode, buttonLabel)}
                          className="w-full flex items-center justify-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#4F5AF5]/20 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{buttonLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Help / Info Pill */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#4F5AF5]" />
              <span>Custodia Digital IACS</span>
            </div>
            <p className="leading-relaxed">
              Las aprobaciones, consentimientos y evaluaciones técnicas son registrados con firma electrónica e inmutabilidad en base de datos.
            </p>
          </div>
        </div>
      </div>

      {compareSnapshot && (
        <DiffModal 
          snapshot={compareSnapshot} 
          currentData={initiative} 
          onClose={() => setCompareSnapshot(null)} 
          fieldsMap={fieldsMap}
        />
      )}

      {/* Observation Modal */}
      {showObserveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col border border-amber-200">
            <div className="px-6 py-4 border-b border-amber-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Registrar Observación</h3>
                  <span className="text-[11px] text-amber-800 font-medium block">Etapa origen: {currentStatusLabel}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowObserveModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categoría de la Observación
                </label>
                {(() => {
                  const targetObservada = pendingObserveTransition?.targetNode || activeWorkflow?.graph_json?.nodes?.find((n: any) => n.id === 'observada' || n.data?.stateSubtype === 'observada');
                  const categoriesList: string[] = targetObservada?.data?.observationCategories || DEFAULT_OBSERVATION_CATEGORIES;

                  return (
                    <div className="space-y-2">
                      <select
                        value={observeCategory}
                        onChange={(e) => setObserveCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      >
                        {categoriesList.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__custom__">Otra (especificar)...</option>
                      </select>

                      {observeCategory === '__custom__' && (
                        <input
                          type="text"
                          value={customObserveCategory}
                          onChange={(e) => setCustomObserveCategory(e.target.value)}
                          placeholder="Escribe la categoría personalizada..."
                          className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 animate-in fade-in"
                          autoFocus
                        />
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motivo y Detalle de la Observación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={observeComment}
                  onChange={(e) => setObserveComment(e.target.value)}
                  placeholder="Detalla con precisión qué aspecto de la iniciativa debe ser corregido, aclarado o complementado..."
                  rows={4}
                  className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm text-slate-800 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Esta observación quedará formalmente registrada en la custodia legal de IACS y se habilitará la sección de subsanación con soporte de archivos para el responsable.</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowObserveModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleObserveConfirm}
                className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                Confirmar Observación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desestimar Modal */}
      {showDesestimarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B]">Motivo para Desestimar</h3>
              <button onClick={() => setShowDesestimarModal(false)} className="text-[#94A3B8] hover:text-[#1E293B] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#64748B] mb-4">
                Por favor, ingresa el motivo por el cual se desestima esta iniciativa. Este comentario quedará registrado en el historial.
              </p>
              <textarea
                value={desestimarComment}
                onChange={(e) => setDesestimarComment(e.target.value)}
                placeholder="Ej. El proyecto ya no está alineado a la estrategia actual..."
                className="w-full h-32 p-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-transparent resize-none text-sm"
              />
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                onClick={() => setShowDesestimarModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDesestimarConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#F1F5F9] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] flex items-center gap-2">
                {confirmDialog.icon}
                {confirmDialog.title}
              </h3>
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="text-[#94A3B8] hover:text-[#1E293B] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-sm text-[#64748B] leading-relaxed">
              {confirmDialog.message}
            </div>
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-sm flex items-center gap-2 ${confirmDialog.confirmStyle || "bg-slate-700 hover:bg-slate-800"}`}
              >
                {confirmDialog.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Preview File Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E2E8F0] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2 min-w-0">
                {previewFile.type?.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                )}
                <span className="font-semibold text-sm text-[#1E293B] truncate" title={previewFile.name}>
                  {previewFile.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold border border-[#4F5AF5]/20 hover:border-[#4F5AF5] px-3 py-1.5 rounded-lg bg-white transition-colors"
                >
                  Abrir en nueva pestaña
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="text-[#64748B] hover:text-[#1E293B] bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50 min-h-[300px]">
              {previewFile.type?.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              ) : previewFile.type?.startsWith('video/') || previewFile.name.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-lg shadow-sm"
                />
              ) : previewFile.type?.startsWith('audio/') || previewFile.name.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-[#E2E8F0] text-center space-y-4">
                  <div className="w-14 h-14 bg-indigo-50 text-[#4F5AF5] rounded-full flex items-center justify-center mx-auto">
                    <Volume2 className="w-7 h-7" />
                  </div>
                  <p className="font-semibold text-sm text-[#1E293B] truncate" title={previewFile.name}>{previewFile.name}</p>
                  <audio src={previewFile.url} controls autoPlay className="w-full" />
                </div>
              ) : (
                <div className="text-center p-8 max-w-md">
                  <div className="w-16 h-16 bg-[#EEF2FF] text-[#4F5AF5] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-[#1E293B] mb-2">Vista previa no disponible</h4>
                  <p className="text-xs text-[#64748B] mb-4">Este tipo de archivo no puede previsualizarse directamente aquí. Por favor ábrelo en una nueva pestaña para verlo o descargarlo.</p>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Abrir archivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Read-only Chat History Modal ────────────────────────────────────── */}
      {showChatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowChatModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <span className="text-[#4F5AF5] text-sm">💬</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Historial de Conversación con IA</h3>
                  <p className="text-[10px] text-[#94A3B8]">Consulta las respuestas y contexto que dieron origen a esta iniciativa.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChatModal(false)} 
                className="text-[#94A3B8] hover:text-[#475569] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Conversations */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50 flex-grow">
              {chatHistory.length === 0 && (!unstructuredText || unstructuredText.trim() === "") ? (
                <div className="text-center py-10 text-[#94A3B8]">
                  No hay mensajes ni texto registrados en esta conversación.
                </div>
              ) : chatHistory.length === 0 && unstructuredText ? (
                <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-2">
                  <span className="text-[11px] font-bold text-[#4F5AF5] uppercase tracking-wider block">Texto original ingresado por el solicitante:</span>
                  <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">{unstructuredText}</p>
                </div>
              ) : (
                chatHistory.map((msg: any, i: number) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-[#94A3B8] mb-1 px-1">
                      {msg.role === 'user' ? (fd.registrador || 'Key user') : 'Teo (IA)'}
                    </span>
                    <div 
                      className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#4F5AF5] text-white rounded-tr-none' 
                          : 'bg-white text-[#334155] border border-[#E2E8F0] rounded-tl-none'
                      }`}
                    >
                      {msg.attachment && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold mb-2 w-fit ${
                          msg.role === 'user' 
                            ? 'bg-white/20 text-white' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Archivo adjunto: {msg.attachment.name}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setShowChatModal(false)}
                className="bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Cerrar vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL DE CONSOLIDACIÓN INTELIGENTE TEO ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showConsensusModal && aiConsensusResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200 border border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-[#4F5AF5] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">
                      Consolidación de Consenso Técnico — TEO
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                      IA Síntesis
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100">
                    Especificación definitiva integrando requerimientos de negocio y dictámenes de custodia.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConsensusModal(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[75vh] space-y-6 text-slate-800">
              {/* Verdict Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Dictamen Final Consolidado
                  </span>
                  <h3 className="text-lg font-black text-emerald-950">
                    {aiConsensusResult.titulo_consolidado || initiative?.form_data?.titulo}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                  {aiConsensusResult.dictamen_final_teo || 'Aprobado con Consenso Pleno'}
                </span>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#4F5AF5]" />
                  Resumen Ejecutivo de Consenso
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                  {aiConsensusResult.resumen_ejecutivo_consenso}
                </div>
              </div>

              {/* Alcance Técnico Aprobado */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Alcance Técnico & Funcional Aprobado
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {aiConsensusResult.alcance_tecnico_aprobado}
                </div>
              </div>

              {/* Viabilidad & Presupuesto (Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Viabilidad & Matriz de Riesgos
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {aiConsensusResult.viabilidad_y_riesgos_resumen}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    Compromisos Presupuestales & ROI
                  </h4>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    {aiConsensusResult.compromisos_presupuestales_o_roi}
                  </p>
                </div>
              </div>

              {/* Requerimientos Técnicos Clave */}
              {Array.isArray(aiConsensusResult.requerimientos_tecnicos_consolidados) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Requerimientos Técnicos Clave Acordados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiConsensusResult.requerimientos_tecnicos_consolidados.map((req: string, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-start gap-2 shadow-2xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan de Fases Sugerido */}
              {Array.isArray(aiConsensusResult.plan_de_fases_sugerido) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#4F5AF5]" />
                    Hoja de Ruta & Fases Sugeridas
                  </h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4">Fase</th>
                          <th className="py-2.5 px-4">Duración</th>
                          <th className="py-2.5 px-4">Entregables Clave</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiConsensusResult.plan_de_fases_sugerido.map((fase: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{fase.fase}</td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{fase.duracion_estimada}</td>
                            <td className="py-2.5 px-4 text-slate-700">{fase.entregables}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mensaje Oficial para Comité */}
              {aiConsensusResult.mensaje_para_comite && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Recomendación Formal para el Comité de Gobierno TI
                  </h4>
                  <p className="text-xs text-indigo-900 italic leading-relaxed">
                    "{aiConsensusResult.mensaje_para_comite}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(aiConsensusResult, null, 2));
                  showToast("Especificación de consenso copiada al portapapeles.", "success");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Copiar JSON
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConsensusModal(false)}
                  className="px-5 py-2 text-xs font-bold bg-[#4F5AF5] hover:bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md text-white ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 shadow-emerald-500/10' 
              : toast.type === 'warning'
                ? 'bg-amber-600 border-amber-500 shadow-amber-500/10'
                : 'bg-red-600 border-red-500 shadow-red-500/10'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-white" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-white" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-white" />}
            <span className="text-xs font-semibold">{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Footer Area with empty space */}
      <div className="h-20" />
      
      {/* Componente Oculto para PDF */}
      <div className="hidden">
        <ExecutiveReportPDF ref={pdfRef} initiative={initiative} template={pdfTemplate} />
      </div>
    </div>
  );
}
