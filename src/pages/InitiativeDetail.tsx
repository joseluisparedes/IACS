import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Pencil, Save, Send, X, Ban, Clock, Paperclip, FileText, Image as ImageIcon, Loader2, AlertCircle, ChevronDown, Check, HelpCircle, Eye } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

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
        className={`w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm text-[#1E293B] cursor-pointer min-h-[42px] flex items-center justify-between transition-colors focus:ring-2 focus:ring-[#4F5AF5] ${
          isOpen ? "ring-2 ring-[#4F5AF5] border-[#4F5AF5]" : ""
        } ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-wrap gap-1.5 max-w-[90%]">
          {selected.length === 0 ? (
            <span className="text-[#94A3B8] select-none text-xs">{placeholder}</span>
          ) : (
            selected.map(opt => (
              <span
                key={opt}
                className="flex items-center gap-1 bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F5AF5] text-xs px-2 py-0.5 rounded-md font-semibold"
              >
                {opt}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(e, opt)}
                    className="hover:bg-blue-100 rounded-full p-0.5 text-[#4F5AF5] ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-100">
          {options.length === 0 ? (
            <div className="text-xs text-slate-400 p-3 text-center">No hay opciones disponibles</div>
          ) : (
            options.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center justify-between w-full px-3.5 py-2 text-sm rounded-lg hover:bg-[#F8FAFC] transition-colors text-left font-medium ${
                    isSelected ? "text-[#4F5AF5] bg-[#EEF2FF]/40 font-semibold" : "text-[#475569]"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#4F5AF5]" />}
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
        name: file.originalname || file.name, 
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
    value || <span className="text-[#CBD5E1]">—</span>
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
      <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-full sm:w-40 shrink-0 mt-0.5 break-words flex items-center gap-1">
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
            <input 
              type="date" 
              value={editValue || ""} 
              onChange={e => onChange(e.target.value)}
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

export default function InitiativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [initiative, setInitiative] = useState<any>(null);
  const [fieldsMap, setFieldsMap] = useState<Record<string, string>>({});
  const [fieldsConfig, setFieldsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

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

  // Edit Mode state
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
  const [showVoboRejectInput, setShowVoboRejectInput] = useState(false);
  const [voboRejectReason, setVoboRejectReason] = useState("");
  const [isVoboPreviewOpen, setIsVoboPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [editedConfirmedFields, setEditedConfirmedFields] = useState<Record<string, boolean>>({});

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
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador') || [];
  const isRegistrador = registradorRoles.length > 0;

  const initialFd = initiative?.form_data ?? {};
  const isMine = initiative?.user_id === profile?.id || initialFd?.registrador === profile?.name;
  const isRegistradorOnly = isRegistrador && !isAdmin && !isBP;

  const isBPAllowed = useMemo(() => {
    if (!isBP) return false;
    if (isMine) return true;

    const bpRoles = profile?.profile_roles?.filter((r: any) => r.role === 'bp_ti') || [];
    const bpAllowedDirIds = new Set(bpRoles.flatMap((r: any) => r.direcciones_ids || []));

    const dirName = initialFd?.direccion;
    const vpName = initialFd?.vicepresidencia;
    if (!dirName) return false;

    const vpId = dbVps.find(v => v.name === vpName)?.id;
    const dirId = dbDirecciones.find(d => d.name === dirName && (!vpId || d.vp_id === vpId))?.id;

    if (!dirId) return false;
    return bpAllowedDirIds.has(dirId);
  }, [isBP, profile, initialFd, dbVps, dbDirecciones, isMine]);

  const canModify = useMemo(() => {
    if (isAdmin) return true;
    if (isBP) return isBPAllowed;
    if (isRegistradorOnly) return isMine;
  }, [isAdmin, isBP, isBPAllowed, isRegistradorOnly, isMine]);

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
      fetch("/api/initiatives").then(r => r.json()),
      fetch("/api/fields").then(r => r.json()),
      supabase.from('vps').select('id, name'),
      supabase.from('direcciones').select('id, name, vp_id'),
      supabase.from('allowed_users').select('name, user_roles_whitelist(*)')
    ])
      .then(([data, fieldsData, vpsRes, dirRes, usersRes]) => {
        const found = Array.isArray(data) ? data.find((i: any) => i.id === id) : null;
        setInitiative(found ?? null);

        if (Array.isArray(fieldsData)) {
          setFieldsConfig(fieldsData);
          const map: Record<string, string> = {};
          fieldsData.forEach(f => map[f.key.toLowerCase()] = f.label);
          setFieldsMap(map);
        }

        if (vpsRes.data) setDbVps(vpsRes.data);
        if (dirRes.data) setDbDirecciones(dirRes.data);
        if (usersRes.data) setDbUsers(usersRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateInitiativeData = async (status: string, extraUpdates: any = {}) => {
    try {
      const currentFormData = extraUpdates.form_data || initiative.form_data || {};
      const currentSummary = extraUpdates.summary || initiative.summary || {};
      const nextFormData = { ...currentFormData };

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

      const payload = { 
        status, 
        ...extraUpdates,
        form_data: nextFormData 
      };

      const res = await fetch(`/api/initiatives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInitiative((prev: any) => ({ ...prev, ...payload }));
        setIsEditMode(false);
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

  const cancelEditMode = () => {
    setIsEditMode(false);
  };

  const handleSaveDraftEdits = async () => {
    if (!isEditMode) return;
    await updateInitiativeData("Borrador", {
      form_data: editedFormData,
      summary: editedSummary,
      confirmed_fields: editedConfirmedFields
    });
    setIsEditMode(false);
  };

  const handleSaveObservedEdits = async () => {
    if (!isEditMode) return;
    const currentVobo = initiative.form_data?.aprobacin_de_director;
    const editedVobo = editedFormData.aprobacin_de_director;
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

    const currentFormData = initiative.form_data || {};
    const newHistoryEntry = {
      date: new Date().toISOString(),
      user_name: profile?.name || 'Desconocido',
      user_role: profile?.profile_roles?.[0]?.role || 'Desconocido',
      action: 'Desestimada',
      details: desestimarComment.trim()
    };

    const newFormData = { 
      ...currentFormData, 
      _observation_history: [...(currentFormData._observation_history || []), newHistoryEntry]
    };
    updateInitiativeData("Desestimada", { form_data: newFormData });
    setShowDesestimarModal(false);
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

        const newHistoryEntry = {
          date: new Date().toISOString(),
          user_name: profile?.name || 'Desconocido',
          user_role: 'Key user',
          action: 'Reenviada a Aprobación',
          details: 'Subsanó la iniciativa y la reenvió para su revisión.',
          snapshot: {
            form_data: { ...currentFormData },
            summary: { ...currentSummary }
          }
        };

        // Clear any remaining suggested changes and set back to Pending
        const newFormData = { ...initiative.form_data };
        delete newFormData._suggested_changes;
        newFormData._observation_history = [...(newFormData._observation_history || []), newHistoryEntry];
        
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
        updateInitiativeData("Pendiente de aprobación");
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
  const statusStyle = STATUS_STYLE[initiative.status] ?? "bg-[#F1F5F9] text-[#64748B]";
  const isPending = initiative.status === "Pendiente de aprobación";
  const isObserved = initiative.status === "Observada";
  let voboFileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (typeof fd.aprobacin_de_director === "string" && fd.aprobacin_de_director.startsWith('{"name":')) {
    try {
      voboFileObj = JSON.parse(fd.aprobacin_de_director);
    } catch (e) {}
  }
  
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

    const voboVal = getVal("aprobacin_de_director");
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

    const requiredFields = fieldsConfig.filter(f => f.is_required && f.is_visible && f.key !== 'aprobacin_de_director');
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
               r.vp_id === vpId && 
               (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))
             )
          );
       }
       const names = Array.from(new Set(availableUsers.map(u => u.name))).sort();
       return { field_type: 'select', options: names };
    }

    return fieldsConfig.find(f => f.key.toLowerCase() === lowerKey);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <Link to="/bandeja" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a la Bandeja
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{initiative.id}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                {initiative.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#1E293B]">{String(title)}</h2>
            {s.tipoIniciativa && (
              <p className="text-sm text-[#64748B] mt-1">{s.tipoIniciativa}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isPending && (isAdmin || isBPAllowed) && !isEditMode && (
              <>
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Modo Edición
                </button>
                <button
                  onClick={openDesestimarModal}
                  className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Desestimar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={validationErrors.length > 0}
                  title={validationErrors.length > 0 ? `Requisitos pendientes:\n${validationErrors.join('\n')}` : "Aprobar iniciativa"}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
              </>
            )}

            {isObserved && (isAdmin || isBPAllowed) && !isEditMode && (
              <>
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Modo Edición
                </button>
                <button
                  onClick={() => confirmAction(
                    "Mover a Revisión",
                    (
                      <div className="space-y-4">
                        <p>¿Estás seguro de regresar esta iniciativa observada a 'Pendiente de aprobación'?</p>
                        <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 flex gap-2 text-slate-800">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <span className="font-semibold text-sm">Al confirmar, volverá a la bandeja de pendientes de aprobación.</span>
                        </div>
                      </div>
                    ),
                    "Sí, Mover a Revisión",
                    "bg-[#4F5AF5] hover:bg-[#3F49E0]",
                    <Clock className="w-6 h-6 text-[#4F5AF5]" />,
                    () => {
                      const currentFormData = initiative.form_data || {};
                      delete currentFormData._suggested_changes;
                      updateInitiativeData("Pendiente de aprobación", { form_data: currentFormData });
                    }
                  )}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Mover a Revisión
                </button>
                <button
                  onClick={openDesestimarModal}
                  className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Desestimar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={validationErrors.length > 0}
                  title={validationErrors.length > 0 ? `Requisitos pendientes:\n${validationErrors.join('\n')}` : "Aprobar iniciativa"}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
              </>
            )}

            {initiative?.status === 'En demanda' && (isAdmin || isBPAllowed) && (
              <button
                onClick={openDesestimarModal}
                className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Ban className="w-4 h-4" />
                Desestimar
              </button>
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
                    <button
                      onClick={handleObserve}
                      className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Observar con Cambios
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={validationErrors.length > 0}
                      title={validationErrors.length > 0 ? `Requisitos pendientes:\n${validationErrors.join('\n')}` : "Aprobar con Cambios"}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar con Cambios
                    </button>
                  </>
                )}
              </>
            )}
            

            {isRegistrador && isMine && isObserved && !isEditMode && (
              <>
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={handleReenviar}
                  className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
                >
                  <Send className="w-4 h-4" />
                  Reenviar a Aprobación
                </button>
              </>
            )}

            {isRegistrador && isMine && initiative.status === "Borrador" && !isEditMode && (
              <>
                <button
                  onClick={startEditMode}
                  className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar Borrador
                </button>
                <button
                  onClick={handleEnviarAprobacion}
                  className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
                >
                  <Send className="w-4 h-4" />
                  Enviar a BP
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {(isPending || isObserved) && (isBPAllowed || isAdmin) && validationErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-800">Requisitos Pendientes para Aprobación</h4>
            <p className="text-xs text-amber-700 leading-normal">
              Para poder pasar esta iniciativa a estado 'En demanda', se deben cumplir las siguientes condiciones obligatorias:
            </p>
            <ul className="list-disc pl-4 text-xs text-amber-700 space-y-1 mt-2">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {isPending && (isBP || isAdmin) && voboFileObj && (
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
                          <span>{lastObs.date ? new Date(lastObs.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ""}</span>
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

          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Resumen del Requerimiento</h3>
            </div>
            <div className="px-6 py-2">
              {fieldsConfig
                .filter(f => f.is_visible && f.section === 'ai' && !["titulo", "complejidad", "riesgo", "prioridadRecomendada", "beneficiosCualitativos"].includes(f.key))
                .map(f => {
                  const k = f.key;
                  const v = getValueCaseInsensitive(s, k) ?? getValueCaseInsensitive(fd, k) ?? "";
                  return (
                    <Row 
                      key={k} 
                      label={f.label} 
                      value={v}
                      isEditMode={isEditMode}
                      editValue={getValueCaseInsensitive(editedSummary, k) ?? ""}
                      onChange={(val: any) => handleFieldChange('summary', k, val)}
                      fieldConfig={f}
                      suggestedValue={suggestedChanges.summary[k]}
                      onAccept={canModify && isObserved && suggestedChanges.summary[k] !== undefined ? () => handleAcceptChange('summary', k, suggestedChanges.summary[k]) : undefined}
                      onReject={canModify && isObserved && suggestedChanges.summary[k] !== undefined ? () => handleRejectChange('summary', k) : undefined}
                      isConfirmed={initiative.confirmed_fields?.[k] || false}
                      editConfirmed={editedConfirmedFields[k] || false}
                      onConfirmedChange={(checked: boolean) => setEditedConfirmedFields(prev => ({ ...prev, [k]: checked }))}
                    />
                  );
                })}
            </div>
          </div>

          {/* Qualitative benefits */}
          {(() => {
            const qualVal = s.beneficiosCualitativos ?? fd.beneficiosCualitativos ?? fd.beneficio_cualitativo ?? "";
            if (!qualVal || (typeof qualVal === 'string' && qualVal.trim() === "")) return null;
            return (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F1F5F9]">
                  <h3 className="text-sm font-bold text-[#1E293B]">Beneficios Cualitativos</h3>
                </div>
                <div className="px-6 py-2">
                  <Row
                    label="Beneficios Cualitativos"
                    value={qualVal}
                    isEditMode={isEditMode}
                    editValue={editedSummary.beneficiosCualitativos ?? editedSummary.beneficio_cualitativo ?? ""}
                    onChange={(val: any) => handleFieldChange('summary', 'beneficiosCualitativos', val)}
                    suggestedValue={suggestedChanges.summary.beneficiosCualitativos}
                    onAccept={canModify && isObserved && suggestedChanges.summary.beneficiosCualitativos ? () => handleAcceptChange('summary', 'beneficiosCualitativos', suggestedChanges.summary.beneficiosCualitativos) : undefined}
                    onReject={canModify && isObserved && suggestedChanges.summary.beneficiosCualitativos ? () => handleRejectChange('summary', 'beneficiosCualitativos') : undefined}
                    isConfirmed={initiative.confirmed_fields?.beneficiosCualitativos || initiative.confirmed_fields?.beneficio_cualitativo || false}
                    editConfirmed={editedConfirmedFields.beneficiosCualitativos || editedConfirmedFields.beneficio_cualitativo || false}
                    onConfirmedChange={(checked: boolean) => setEditedConfirmedFields(prev => ({ ...prev, beneficiosCualitativos: checked, beneficio_cualitativo: checked }))}
                  />
                </div>
              </div>
            );
          })()}

          {/* Form data */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Datos del Formulario</h3>
            </div>
            <div className="px-6 py-2">
              {fieldsConfig
                .filter(f => f.is_visible && (f.section || 'form') === 'form')
                .map(f => {
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
                })}
            </div>
          </div>

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
                        const isImage = file.type?.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                        return (
                          <div key={fileIdx} className="flex items-center gap-2 bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
                            {isImage ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
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

          {/* Declaración de Responsabilidad de Director */}
          {fd._director_declaration_accepted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 shadow-sm shadow-emerald-500/5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Declaración de Responsabilidad</h4>
                <p className="text-xs text-emerald-700 leading-relaxed font-semibold">
                  El solicitante declaró bajo su responsabilidad que la información ingresada es verídica y que la iniciativa cuenta con el conocimiento y aprobación de, como mínimo, su <span className="font-bold">Director</span>.
                </p>
              </div>
            </div>
          )}

          {/* Observation History */}
          {fd._observation_history && fd._observation_history.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <h3 className="text-sm font-bold text-[#1E293B]">Historial de Revisiones</h3>
              </div>
              <div className="px-6 py-4 space-y-6">
                {fd._observation_history.map((h: any, i: number) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Vertical line connector */}
                    {i !== fd._observation_history.length - 1 && (
                      <div className="absolute top-8 left-[13px] bottom-[-24px] w-0.5 bg-[#E2E8F0]" />
                    )}
                    <div className="w-7 h-7 shrink-0 rounded-full bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center relative z-10">
                       <span className="text-[10px] font-bold text-[#64748B]">{(h.user_name || "Usuario").substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1">
                        {new Date(h.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-[#1E293B]">
                            <span className="font-bold">{h.user_name || "Usuario"}</span> <span className="text-[#64748B] text-xs">({h.user_role || "Sistema"})</span>
                          </p>
                          <p className="text-xs text-[#4F5AF5] font-semibold mt-0.5">{h.action}</p>
                          {h.details && <p className="text-sm text-[#475569] mt-1">{h.details}</p>}
                        </div>
                        {h.snapshot && (
                          <button onClick={() => setCompareSnapshot(h.snapshot)} className="text-[10px] font-bold text-[#4F5AF5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-2 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 border border-[#C7D2FE]">
                            Comparar vs Actual
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* BP Asignado */}
          {(fd.bp_ti_asignado && !isEditingBP) ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F1F5F9] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1E293B]">BP Asignado</h3>
                {(isBP || isAdmin) && (
                  <button onClick={() => {
                    setSelectedBP(fd.bp_ti_asignado);
                    setIsEditingBP(true);
                  }} className="text-[#94A3B8] hover:text-[#4F5AF5] transition-colors" title="Editar BP">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-5">
                <span className="font-semibold text-[#4F5AF5]">{fd.bp_ti_asignado}</span>
              </div>
            </div>
          ) : (isBP || isAdmin) ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F1F5F9] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1E293B]">Asignar BP</h3>
                {fd.bp_ti_asignado && (
                  <button onClick={() => setIsEditingBP(false)} className="text-[#94A3B8] hover:text-[#EF4444] transition-colors" title="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-5 space-y-3">
                <select 
                  value={selectedBP} 
                  onChange={e => setSelectedBP(e.target.value)}
                  className="w-full text-sm border border-[#E2E8F0] rounded-md px-3 py-2 bg-white outline-none focus:border-[#4F5AF5]"
                >
                  <option value="">Seleccione un BP...</option>
                  {(() => {
                    const vpId = dbVps.find(v => v.name === fd.vicepresidencia)?.id;
                    const dirId = dbDirecciones.find(d => d.name === fd.direccion && d.vp_id === vpId)?.id;
                    let eligibleBPs: any[] = [];
                    if (vpId && dirId) {
                      eligibleBPs = dbUsers.filter(u => 
                        u.user_roles_whitelist?.some((r: any) => 
                          r.role === 'bp_ti' && 
                          r.vp_id === vpId && 
                          (r.direcciones_ids?.length === 0 || r.direcciones_ids?.includes(dirId))
                        )
                      );
                    }
                    return Array.from(new Set(eligibleBPs.map(u => u.name))).sort().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ));
                  })()}
                </select>
                <button 
                  onClick={handleAssignBP}
                  disabled={!selectedBP}
                  className="w-full bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Guardar Asignación
                </button>
              </div>
            </div>
          ) : null}

          {/* AI Classification */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Clasificación IA</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                { label: "Complejidad", value: s.complejidad },
                { label: "Riesgo", value: s.riesgo },
                { label: "Prioridad sugerida", value: s.prioridadRecomendada },
              ].map(item => (
                <div key={item.label} className="flex flex-col py-2 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-[#64748B] text-xs uppercase tracking-wider font-semibold mb-1">{item.label}</span>
                  <span className="font-medium text-[#1E293B]">{item.value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#1E293B]">Información</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider mb-1">Fecha de registro</span>
                <span className="text-[#1E293B]">
                  {initiative.created_at
                    ? new Date(initiative.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
                    : "—"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider mb-1">ID</span>
                <span className="text-[#1E293B] font-mono text-xs">{initiative.id}</span>
              </div>
            </div>
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
              {previewFile.type?.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
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
    </div>
  );
}
