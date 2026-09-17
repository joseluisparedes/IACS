import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Bot, ChevronRight, Pencil, Save, Send, RotateCcw, ThumbsUp, ThumbsDown, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon, AlertCircle, ChevronDown, Check, BrainCircuit, MessageSquare, HelpCircle, ArrowLeft, PlusCircle, Eye, Calendar, Trash2, Video as VideoIcon, Music as AudioIcon, Volume2, Download, ListChecks } from "lucide-react";
import STTWorker from '../workers/stt.worker?worker';
import { FieldDefinition } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import ReactMarkdown from "react-markdown";
import { EnterpriseDatePicker } from "../components/common/EnterpriseDatePicker";
import { parseHtmlToMarkdown, formatHtmlText } from "../lib/formatHtml";

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#EB5F46]/20 focus:border-[#EB5F46] transition-all disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]";
const labelCls = "block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5";

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

// ─── Stable Auto-Resize Textarea (Prevents layout shift and scroll jump) ──────
function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  required,
  disabled,
  placeholder,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      // Preserve current height temporarily to avoid collapse jump, then fit to scrollHeight
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 42)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      rows={1}
    />
  );
}

// ─── Title Quality Validator ──────────────────────────────────────────────────
function validateTitleQuality(title: string | undefined | null): { isValid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'El campo "Título" es obligatorio.' };
  }

  const trimmed = title.trim();
  if (trimmed.length < 10) {
    return { isValid: false, error: 'El título es demasiado corto (mínimo 10 caracteres). Ingresa un título descriptivo del proyecto.' };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return { isValid: false, error: 'El título debe contener al menos 3 palabras descriptivas del proyecto o necesidad.' };
  }

  const genericPatterns = [
    /^\s*iniciativa\s+de\s+mejora(\s+para|\s+de)?\s*/i,
    /^\s*iniciativa\s+para\s*/i,
    /^\s*nueva\s+iniciativa/i,
    /^\s*iniciativa\s+sin\s+t[ií]tulo/i,
    /^\s*mejora\s+para\s*/i,
    /^\s*proyecto\s+de\s+mejora/i,
    /^\s*solicitud\s+de\s+mejora/i,
    /^\s*prueba/i,
    /^\s*test/i,
  ];

  const isGeneric = genericPatterns.some(pattern => pattern.test(trimmed));
  if (isGeneric && words.length <= 5) {
    return { 
      isValid: false, 
      error: `El título "${trimmed}" es demasiado genérico. Por favor especifica el proyecto o solución concreta (ej: "Automatización del proceso de barrido de contactos inalcanzables").` 
    };
  }

  return { isValid: true };
}

// ─── Date Parsing Helper ──────────────────────────────────────────────────────
const addSafeMonthsClient = (baseDate: Date, months: number): Date => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  const target = new Date(year, month + months, 1);
  const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, maxDays));
  return target;
};

const parseQuarterDate = (val: string): string | null => {
  if (!val) return null;
  const trimmed = val.trim().toUpperCase();
  const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanStr = removeAccents(trimmed);

  // 1. Quarters (e.g. Q4 2026, 4T 2026)
  const qMatch = cleanStr.match(/(?:Q([1-4])|([1-4])T)[^\d]*(\d{4})/i);
  if (qMatch) {
    const q = parseInt(qMatch[1] || qMatch[2], 10);
    const year = qMatch[3];
    const quarterEndDates: Record<number, string> = {
      1: `31/03/${year}`,
      2: `30/06/${year}`,
      3: `30/09/${year}`,
      4: `31/12/${year}`
    };
    return quarterEndDates[q] || null;
  }

  // 2. Month + Year (e.g. Diciembre 2026, 15 de Septiembre 2026)
  const months: Record<string, string> = {
    ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
    JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12'
  };
  for (const [mName, mNum] of Object.entries(months)) {
    if (cleanStr.includes(mName)) {
      const yMatch = cleanStr.match(/\d{4}/);
      const year = yMatch ? yMatch[0] : new Date().getFullYear().toString();
      const dayMatch = cleanStr.match(new RegExp(`(?:^|[^\\d])(\\d{1,2})\\s*(?:DE\\s+)?${mName}`));
      if (dayMatch) {
        return `${dayMatch[1].padStart(2, '0')}/${mNum}/${year}`;
      }
      const lastDay = new Date(parseInt(year, 10), parseInt(mNum, 10), 0).getDate();
      return `${String(lastDay).padStart(2, '0')}/${mNum}/${year}`;
    }
  }

  const now = new Date();

  // 3. "INMEDIATAMENTE", "HOY", "ASAP", "LO ANTES POSIBLE", "URGENTE"
  if (cleanStr.includes('INMEDIATAMENTE') || cleanStr.includes('HOY') || cleanStr.includes('ASAP') || cleanStr.includes('ANTES POSIBLE') || cleanStr.includes('URGENTE')) {
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 4. "FIN DE ANO", "CIERRE DE ANO"
  if (cleanStr.includes('FIN DE ANO') || cleanStr.includes('CIERRE DE ANO')) {
    const yMatch = cleanStr.match(/\d{4}/);
    const year = yMatch ? yMatch[0] : now.getFullYear().toString();
    return `31/12/${year}`;
  }

  // 5. "PROXIMO MES", "MES SIGUIENTE"
  if (cleanStr.includes('PROXIMO MES') || cleanStr.includes('MES SIGUIENTE')) {
    const targetDate = addSafeMonthsClient(now, 1);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 6. "ESTE MES", "FIN DE MES"
  if (cleanStr.includes('ESTE MES') || cleanStr.includes('FIN DE MES')) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 7. "DENTRO DE X MESES", "EN X MESES", "PROXIMOS X MESES"
  const mMatch = cleanStr.match(/(?:DENTRO DE|EN|PROXIMOS)\s+(?:LOS\s+)?(\d{1,2})\s+MESES?/);
  if (mMatch) {
    const numMonths = parseInt(mMatch[1], 10);
    const targetDate = addSafeMonthsClient(now, numMonths);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 8. "DENTRO DE X DIAS", "EN X DIAS"
  const dMatch = cleanStr.match(/(?:DENTRO DE|EN)\s+(\d{1,3})\s+DIAS?/);
  if (dMatch) {
    const numDays = parseInt(dMatch[1], 10);
    const targetDate = new Date(now.valueOf() + numDays * 86400000);
    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const year = targetDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return null;
};

// ─── Modern Enterprise Date Input with DD/MM/YYYY Display ─────────────────
function DateInputDDMMYYYY({
  value,
  onChange,
  onBlur,
  required,
  disabled,
  className
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <EnterpriseDatePicker
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}

// ─── Dynamic field ────────────────────────────────────────────────────────────
function DynamicField({ field, value, onChange, parentValue, disabled, optionsOverride, onUploadingChange, onBlur, onPreview }: {
  field: FieldDefinition; value: string; onChange: (v: string) => void; parentValue?: string;
  disabled?: boolean;
  optionsOverride?: string[];
  onUploadingChange?: (uploading: boolean) => void;
  onBlur?: (val?: string) => void;
  onPreview?: (file: { url: string; name: string; type?: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse current value if it is a JSON file representation, attachment text, or file URL
  let fileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (value && typeof value === "string" && value.trim() !== "") {
    if (value.startsWith('{"name":')) {
      try {
        fileObj = JSON.parse(value);
      } catch (e) { /* Not JSON */ }
    }
    if (!fileObj && value.includes('[Archivo adjunto:')) {
      const match = value.match(/\[Archivo adjunto:\s*([^\]]+)\]/);
      if (match) {
        fileObj = { name: match[1].trim() };
      }
    }
    if (!fileObj && (value.match(/\.(png|jpg|jpeg|pdf|docx|txt|webp)$/i) || value.startsWith('http'))) {
      fileObj = { name: value.split('/').pop() || value, url: value.startsWith('http') ? value : undefined };
    }
  }

  if (field.field_type === "date") {
    return (
      <DateInputDDMMYYYY
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={field.is_required}
        disabled={disabled}
        className={inputCls}
      />
    );
  }
  
  if (field.field_type === "select") {
    let options = optionsOverride || field.options;
    if (!optionsOverride) {
      if (field.depends_on && field.options_map && parentValue) {
        options = field.options_map[parentValue] || [];
      } else if (field.depends_on) {
        options = []; // Hide options if parent is not selected
      }
    }
    if (field.allow_multiple) {
      const selectedList = Array.isArray(value) ? value : (value ? [value] : []);
      return (
        <MultiSelectDropdown
          options={options}
          selected={selectedList}
          onChange={(next) => { 
            onChange(next as any); 
            const valStr = Array.isArray(next) ? next.join(", ") : String(next);
            onBlur?.(valStr); 
          }}
          disabled={disabled || (!optionsOverride && field.depends_on ? !parentValue : false)}
          placeholder="Seleccionar"
        />
      );
    }
    return (
      <select 
        value={value} 
        onChange={e => { 
          const val = e.target.value;
          onChange(val); 
          onBlur?.(val); 
        }} 
        onBlur={onBlur ? () => onBlur(value) : undefined} 
        required={field.is_required} 
        className={inputCls} 
        disabled={disabled || (!optionsOverride && field.depends_on ? !parentValue : false)}
      >
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.field_type === "file") {
    const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setError(null);

      // 1. Client-side validation using field.options configuration
      let typeKey: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image' = 'txt';
      const name = file.name.toLowerCase();
      const mime = file.type;

      if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
      else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
      else if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.ms-excel' || name.endsWith('.xlsx') || name.endsWith('.xls')) typeKey = 'xlsx';
      else if (mime.startsWith('image/')) typeKey = 'image';

      // Fallback default config if options is empty/invalid
      const fileTypes = field.fileOptions?.fileTypes || (field.options as any)?.fileTypes || {
        pdf: { enabled: true, maxMb: 25.0 },
        docx: { enabled: true, maxMb: 25.0 },
        xlsx: { enabled: true, maxMb: 25.0 },
        txt: { enabled: true, maxMb: 5.0 },
        image: { enabled: true, maxMb: 10.0 }
      };

      const config = fileTypes[typeKey] || { enabled: true, maxMb: 25.0 };
      if (!config.enabled) {
        setError(`La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`);
        return;
      }

      const limitBytes = (config.maxMb || 25.0) * 1024 * 1024;
      if (file.size > limitBytes) {
        setError(`El archivo supera el límite permitido de ${config.maxMb || 25.0} MB.`);
        return;
      }

      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|xlsx|xls|txt|jpg|jpeg|png|webp)$/i)) {
        setError('Formato no soportado. Usa PDF, Word, Excel, TXT o imágenes.');
        return;
      }

      setIsUploading(true);
      onUploadingChange?.(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Store the stringified JSON
        onChange(JSON.stringify({ 
          name: (file as any).originalname || file.name, 
          content: data.content, 
          url: data.url, 
          type: data.type || file.type 
        }));
      } catch (err: any) {
        setError('Error: ' + err.message);
      } finally {
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    };

    const handleRemove = () => {
      onChange('');
      setError(null);
    };

    return (
      <div className="space-y-2">
        <input 
          ref={fileInputRef} 
          type="file" 
          accept={[
            field.fileOptions?.fileTypes?.pdf?.enabled !== false && (field.options as any)?.fileTypes?.pdf?.enabled !== false && '.pdf',
            field.fileOptions?.fileTypes?.docx?.enabled !== false && (field.options as any)?.fileTypes?.docx?.enabled !== false && '.docx',
            field.fileOptions?.fileTypes?.xlsx?.enabled !== false && (field.options as any)?.fileTypes?.xlsx?.enabled !== false && '.xlsx,.xls',
            field.fileOptions?.fileTypes?.txt?.enabled !== false && (field.options as any)?.fileTypes?.txt?.enabled !== false && '.txt',
            field.fileOptions?.fileTypes?.image?.enabled !== false && (field.options as any)?.fileTypes?.image?.enabled !== false && '.jpg,.jpeg,.png,.webp'
          ].filter(Boolean).join(',')} 
          className="hidden" 
          onChange={handleFileAttach} 
          disabled={disabled}
        />
        
        {fileObj ? (() => {
          const isImage = Boolean(
            fileObj.name?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ||
            fileObj.type?.startsWith('image/')
          );

          return (
            <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2">
              {isImage ? (
                <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
              )}
              <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{fileObj.name}</span>
              
              {/* Vista previa SOLO para imágenes */}
              {isImage && fileObj.url && (
                <button 
                  type="button" 
                  onClick={() => onPreview?.({ url: fileObj.url || '', name: fileObj.name, type: fileObj.type })}
                  className="text-[#4F5AF5] hover:text-[#3F49E0] transition-colors p-1"
                  title="Ver imagen"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {/* Botón de descarga para todos los archivos con url */}
              {fileObj.url && (
                <a 
                  href={fileObj.url}
                  download={fileObj.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4F5AF5] hover:text-[#3F49E0] transition-colors p-1 flex items-center"
                  title="Descargar archivo"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              <button 
                type="button" 
                onClick={handleRemove} 
                disabled={disabled} 
                className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })() : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={`flex items-center gap-2 w-full border border-dashed border-[#CBD5E1] hover:border-[#4F5AF5] bg-slate-50 hover:bg-[#EEF2FF]/30 text-[#64748B] hover:text-[#4F5AF5] px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
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

        {/* File type/size hint */}
        {(() => {
          const ft = field.fileOptions?.fileTypes || (field.options as any)?.fileTypes || {
            pdf: { enabled: true, maxMb: 25.0 },
            docx: { enabled: true, maxMb: 25.0 },
            xlsx: { enabled: true, maxMb: 25.0 },
            txt: { enabled: true, maxMb: 5.0 },
            image: { enabled: true, maxMb: 10.0 },
          };
          const parts: string[] = [];
          if (ft.pdf?.enabled) parts.push(`PDF (máx. ${ft.pdf.maxMb} MB)`);
          if (ft.docx?.enabled) parts.push(`DOCX (máx. ${ft.docx.maxMb} MB)`);
          if (ft.xlsx?.enabled) parts.push(`Excel (máx. ${ft.xlsx.maxMb} MB)`);
          if (ft.txt?.enabled) parts.push(`TXT (máx. ${ft.txt.maxMb} MB)`);
          if (ft.image?.enabled) parts.push(`Imagen (máx. ${ft.image.maxMb} MB)`);
          if (parts.length === 0) return null;
          return (
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              <span className="font-semibold">Formatos permitidos:</span> {parts.join(' · ')}
            </p>
          );
        })()}

        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (field.field_type === "text") {
    return (
      <AutoResizeTextarea
        value={value}
        onChange={onChange}
        onBlur={onBlur ? () => onBlur(value) : undefined}
        required={field.is_required}
        disabled={disabled}
        placeholder={`Ingresa ${field.label.toLowerCase()}...`}
        className={`${inputCls} min-h-[42px] overflow-hidden resize-none py-2.5 leading-relaxed`}
      />
    );
  }

  // Fallback for any other type not explicitly handled (though text should cover most strings)
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur ? () => onBlur(value) : undefined} required={field.is_required} disabled={disabled} placeholder={`Ingresa ${field.label.toLowerCase()}...`} className={inputCls} />;
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#F1F5F9] last:border-0">
      <div className="w-6 shrink-0 text-[#4F5AF5] text-base mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm text-[#1E293B]">{value}</div>
      </div>
    </div>
  );
}

// ─── Corporate Lifecycle Workflow Timeline (Línea de Tiempo con Círculos Verdes) ───
const WORKFLOW_STAGES_TIMELINE = [
  { key: 'borrador', label: 'Registro', subtitle: 'Key User' },
  { key: 'eval_bp', label: 'Viabilidad BP TI', subtitle: 'Business Partner' },
  { key: 'aprob_bo', label: 'Patrocinio BO', subtitle: 'Business Owner' },
  { key: 'aprob_vp', label: 'Aprobación VP', subtitle: 'Vicepresidencia' },
  { key: 'asig_demanda', label: 'Demanda TI', subtitle: 'Gestor Demanda' },
  { key: 'ventana_est', label: 'Estimación', subtitle: 'Líder Dominio' },
  { key: 'planificacion', label: 'Planificación', subtitle: 'Producción' }
];

function WorkflowTimelineStepper({ current }: { current: number }) {
  const currentSubStepLabel = current === 1 
    ? 'Formulario y Documentos iniciales' 
    : current === 2 
    ? 'Conversación con Asistente IA (Teo)' 
    : 'Resumen y Validación de Ficha';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5 mb-8">
      {/* Cabecera institucional con aviso de estado Borrador */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Estado: 1. Borrador
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
            Hasta antes de enviar al BP TI, la iniciativa permanece en borrador
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4F5AF5] bg-[#EEF2FF] border border-[#E0E7FF] px-2.5 py-1 rounded-lg">
          <span className="text-slate-500">Paso {current} de 3:</span>
          <span className="font-bold text-[#4F5AF5]">{currentSubStepLabel}</span>
        </div>
      </div>

      {/* Línea de tiempo corporativa con círculos verdes y etapas conectadas */}
      <div className="overflow-x-auto pt-2 pb-2">
        <div className="flex items-start w-full min-w-[720px] relative">
          {WORKFLOW_STAGES_TIMELINE.map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === WORKFLOW_STAGES_TIMELINE.length - 1;

            return (
              <div key={stage.key} className="flex-1 relative flex flex-col items-center">
                {/* Conector entre etapas */}
                {!isLast && (
                  <div 
                    className="absolute top-[18px] left-1/2 w-full h-[3px] -translate-y-1/2 z-0 bg-slate-200"
                  />
                )}

                <div
                  className="flex flex-col items-center relative z-10 w-full px-1 focus:outline-none"
                  title={isFirst ? "Etapa activa: Registro en Borrador" : `Etapa futura: ${stage.label} (${stage.subtitle})`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    isFirst
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                      : 'bg-white text-slate-400 border-2 border-slate-300'
                  }`}>
                    {isFirst ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>

                  <span className={`text-[11px] font-bold mt-2 text-center leading-tight transition-colors px-1 ${
                    isFirst ? 'text-slate-900 font-black' : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </span>

                  <span className="text-[10px] font-medium text-center mt-0.5 leading-tight text-slate-400">
                    {stage.subtitle}
                  </span>

                  {isFirst && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                      En edición
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InitiativeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const draftIdRef = useRef(id || "INIT-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000).toString(36).toUpperCase());
  // localStorage key for offline backup of the current session
  const localKey = `iacs_draft_${draftIdRef.current}`;
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const isAnyFileUploading = Object.values(uploadingFields).some(Boolean);

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [aiFields, setAiFields] = useState<FieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const step1FieldsCount = useMemo(() => {
    const dynamicStep1 = fields.filter(f => 
      f.ask_in_initial_form === true && 
      !['registrador', 'solicitante', 'vicepresidencia', 'direccion'].includes(f.key.toLowerCase())
    );
    return 2 + dynamicStep1.length;
  }, [fields]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [keyUserConsent, setKeyUserConsent] = useState<any>(null);
  const [selectedPath, setSelectedPath] = useState<'direct' | 'unstructured'>('direct');
  const [isAnalyzingInitialDoc, setIsAnalyzingInitialDoc] = useState<boolean>(false);

  useEffect(() => {
    (window as any).isInitiativeProcessInProgress = (step > 1 || !!id);
    return () => {
      (window as any).isInitiativeProcessInProgress = false;
    };
  }, [step, id]);
  // Countdown before generating summary after chat finishes
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const countdownHistoryRef = useRef<any[]>([]);
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<string[]>([]);

  const removeAccents = (str: string) =>
    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  const normaliseKey = (k: string) => {
    if (!k) return "";
    let norm = removeAccents(k.toLowerCase()).replace(/[^a-z0-9]/g, '');
    // Handle database key distortions like 'qu' vs 'que', 'descripcin' vs 'descripcion'
    norm = norm.replace(/^que/, 'qu').replace(/descripcion/g, 'descripcin');
    return norm;
  };

  // Merges AI summary data into a formData object using normalised key matching.
  // If no DB field matches the AI key, the AI key is used as-is.
  const mergeAISummary = (base: Record<string, any>, summaryData: Record<string, any>) => {
    const allFormFields = [...fields, ...aiFields];
    const merged = { ...base };

    Object.entries(summaryData).forEach(([aiKey, val]) => {
      if (val === undefined || val === null || val === '') return;

      // 1. Try exact key match
      let targetField = allFormFields.find(f => f.key === aiKey);

      // 2. Try normalised key match
      if (!targetField) {
        const normAI = normaliseKey(aiKey);
        targetField = allFormFields.find(f => normaliseKey(f.key) === normAI);
      }

      // 3. Try label match
      if (!targetField) {
        const normAILabel = normaliseKey(aiKey);
        targetField = allFormFields.find(f => normaliseKey(f.label) === normAILabel);
      }

      if (targetField) {
        let finalVal = val;

        // Date field processing (e.g. Q4 DEL 2026 -> 31/12/2026, Próximo mes -> 30/09/2026, YYYY-MM-DD -> DD/MM/YYYY)
        if (targetField.field_type === 'date' && typeof val === 'string') {
          const flexDate = parseQuarterDate(val);
          if (flexDate) {
            finalVal = flexDate;
          } else {
            const ymd = val.trim().match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
            if (ymd) {
              finalVal = `${ymd[3].padStart(2, "0")}/${ymd[2].padStart(2, "0")}/${ymd[1]}`;
            }
          }
        }

        // Select field processing (Fuzzy option matching)
        if (targetField.field_type === 'select' && targetField.options && targetField.options.length > 0) {
          if (typeof val === 'string') {
            const normVal = removeAccents(val.toLowerCase().trim());
            const exactOpt = targetField.options.find(o => removeAccents(o.toLowerCase().trim()) === normVal);
            if (exactOpt) {
              finalVal = exactOpt;
            } else {
              const partialOpt = targetField.options.find(o => removeAccents(o.toLowerCase().trim()).includes(normVal) || normVal.includes(removeAccents(o.toLowerCase().trim())));
              if (partialOpt) {
                finalVal = partialOpt;
              }
            }
          } else if (Array.isArray(val) && targetField.allow_multiple) {
            finalVal = val.map(item => {
              if (typeof item !== 'string') return item;
              const normItem = removeAccents(item.toLowerCase().trim());
              const match = targetField.options.find(o => removeAccents(o.toLowerCase().trim()) === normItem);
              return match || item;
            });
          }
        }

        merged[targetField.key] = finalVal;
      } else {
        // No matching field key – store as-is so data isn't lost
        merged[aiKey] = val;
      }
    });
    return merged;
  };

  // ── Countdown timer effect ────────────────────────────────────────────────
  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds === 0) {
      setCountdownSeconds(null);
      generateSummary(countdownHistoryRef.current);
      return;
    }
    const timer = setTimeout(() => setCountdownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownSeconds]);
  const [unstructuredText, setUnstructuredText] = useState("");
  const [aiWarnings, setAiWarnings] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  
  const [dbVps, setDbVps] = useState<any[]>([]);
  const [dbDirecciones, setDbDirecciones] = useState<any[]>([]);

  const getMediaCategory = (type?: string, name?: string): 'image' | 'video' | 'audio' | 'document' => {
    if (type?.startsWith('image/') || name?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) return 'image';
    if (type?.startsWith('video/') || name?.match(/\.(mp4|webm|mov|mkv|avi)$/i)) return 'video';
    if (type?.startsWith('audio/') || name?.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) return 'audio';
    return 'document';
  };

  const [chatHistory, setChatHistory] = useState<{
    role: "user" | "model";
    text: string;
    options?: string[];
    allowMultiple?: boolean;
    attachment?: {
      name: string;
      type: string;
      url?: string | null;
      size?: number;
      category?: 'image' | 'video' | 'audio' | 'document';
    };
  }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ratedMessages, setRatedMessages] = useState<Record<number, 'positive' | 'negative'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message, type });
  };

  const deleteAttachmentFromChat = (fileName: string, historyIndex?: number) => {
    // 1. Remove from formData.attachments
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((f: any) => f.name !== fileName)
    }));

    // 2. Clear from current attached states if it was active
    if (attachedFile?.name === fileName) {
      setAttachedFile(null);
      setAttachedFileContent(null);
    }

    // 3. Update chatHistory if historyIndex is given
    if (historyIndex !== undefined && historyIndex >= 0) {
      setChatHistory(prev => {
        const updated = [...prev];
        if (updated[historyIndex]) {
          const oldText = updated[historyIndex].text;
          const isOnlyAttachment = oldText === `[Adjunto: ${fileName}]` || oldText.startsWith('[Adjunto:');
          updated[historyIndex] = {
            ...updated[historyIndex],
            attachment: undefined,
            text: isOnlyAttachment ? '[Evidencia eliminada]' : oldText
          };
        }
        return updated;
      });
    }

    showToast(`Evidencia "${fileName}" eliminada de la iniciativa.`, 'warning');
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ── Voice input (MediaRecorder + local Whisper WASM) ──────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [useMic, setUseMic] = useState(true);
  const [useAttachments, setUseAttachments] = useState(true);
  const [aiName, setAiName] = useState("Asistente IA");
  const [aiAvatar, setAiAvatar] = useState("");
  const [fileTypes, setFileTypes] = useState({
    pdf: { enabled: true, maxMb: 25.0 },
    docx: { enabled: true, maxMb: 25.0 },
    xlsx: { enabled: true, maxMb: 25.0 },
    txt: { enabled: true, maxMb: 5.0 },
    image: { enabled: true, maxMb: 10.0 },
  });
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState<number | null>(null); // null = not loading, 0-100 = downloading
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sttWorkerRef = useRef<Worker | null>(null);
  const transcribeResolveRef = useRef<((text: string) => void) | null>(null);
  const transcribeRejectRef = useRef<((e: Error) => void) | null>(null);

  // Initialise the STT worker once
  useEffect(() => {
    const worker = new STTWorker();
    sttWorkerRef.current = worker;
    worker.onmessage = (e: MessageEvent) => {
      const { type, text, error, progress } = e.data;
      if (type === 'loading') {
        setModelLoadProgress(progress ?? 0);
      } else if (type === 'ready') {
        setModelLoadProgress(null);
      } else if (type === 'result') {
        setModelLoadProgress(null);
        transcribeResolveRef.current?.(text ?? '');
      } else if (type === 'error') {
        setModelLoadProgress(null);
        transcribeRejectRef.current?.(new Error(error));
      }
    };
    worker.onerror = (err) => {
      console.error("STT Worker error:", err);
      setVoiceError("Error en el Web Worker de transcripción: " + (err.message || 'desconocido'));
      setIsTranscribing(false);
      setModelLoadProgress(null);
      transcribeRejectRef.current?.(new Error(err.message || 'Error en el worker'));
    };
    // Pre-load the model in the background on first render
    worker.postMessage({ type: 'load' });
    return () => { worker.terminate(); };
  }, []);

  // ── File attachment ──────────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isDraggingSupport, setIsDraggingSupport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
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
      id ? supabase.from('initiatives').select('*').eq('id', id).single() : Promise.resolve({ data: null }),
      supabase.from('ai_training_config').select('*').eq('layer', 'settings'),
      fetch("/api/config/features").then(r => r.json()).catch(() => ({
        useMic: true,
        useAttachments: true,
        fileTypes: {
          pdf: { enabled: true, maxMb: 25.0 },
          docx: { enabled: true, maxMb: 25.0 },
          xlsx: { enabled: true, maxMb: 25.0 },
          txt: { enabled: true, maxMb: 5.0 },
          image: { enabled: true, maxMb: 10.0 }
        }
      }))
    ])
      .then(([data, vpsRes, dirRes, draftRes, configRes, features]) => {
        if (vpsRes.data) setDbVps(vpsRes.data);
        if (dirRes.data) setDbDirecciones(dirRes.data);
        setUseMic(features.useMic !== false);
        setUseAttachments(features.useAttachments !== false);
        
        // Load custom AI Name and Avatar directly from DB config to bypass backend server caching/restart issues
        if (configRes.data) {
          const nameItem = configRes.data.find((e: any) => e.title === 'ai_name');
          const avatarItem = configRes.data.find((e: any) => e.title === 'ai_avatar');
          if (nameItem?.content) setAiName(nameItem.content);
          if (avatarItem?.content) setAiAvatar(avatarItem.content);
        } else {
          // Fallback
          if (features.aiName) setAiName(features.aiName);
          if (features.aiAvatar) setAiAvatar(features.aiAvatar);
        }

        // Align fileTypes with the form's file field (adjuntos_sustento in form_registro_iniciativa)
        const fileField = data.find((f: any) => f.field_type === 'file' || f.key === 'adjuntos_sustento');
        const formTypes = fileField?.fileOptions?.fileTypes || (fileField?.options as any)?.fileTypes;
        if (formTypes && typeof formTypes === 'object' && Object.keys(formTypes).length > 0) {
          setFileTypes(prev => ({
            ...prev,
            ...formTypes
          }));
        } else if (features?.fileTypes) {
          setFileTypes(prev => ({
            ...prev,
            ...features.fileTypes
          }));
        }
        
        const allVisibleFormFields = data.filter((f: FieldDefinition) => f.is_visible && (f.section || 'form') === 'form');
        const visibleAiFields = data.filter((f: FieldDefinition) => f.is_visible && f.section === 'ai');
        setFields(allVisibleFormFields);
        setAiFields(visibleAiFields);

        fetch('/api/stage-consents')
          .then(r => r.json())
          .then(json => {
            const list = json.data || [];
            const found = list.find((c: any) => c.code === 'consent_key_user') || list[0];
            if (found) setKeyUserConsent(found);
          })
          .catch(() => {});
        
        const draft = draftRes?.data;
        if (draft) {
          // Backend draft found — use it and clear any stale local backup
          const rawFData = { ...(draft.form_data || {}) };
          const hasSummary = draft.summary && typeof draft.summary === 'object' && Object.keys(draft.summary).length > 0 && (draft.summary.titulo || draft.summary.objetivo);
          const reachedSummary = Boolean(rawFData._reached_summary);
          const fData = hasSummary
            ? mergeAISummary(rawFData, draft.summary)
            : rawFData;
          setFormData(fData);
          setConfirmedFields(draft.confirmed_fields || {});
          setUnstructuredText(draft.unstructured_text || "");
          setChatHistory(draft.chat_history || []);
          setSummary(draft.summary || null);
          setDisclaimerAccepted(Boolean(rawFData._director_declaration_accepted || rawFData.declaracion_responsabilidad));
          if (hasSummary || reachedSummary) {
            setStep(3);
          } else if (draft.chat_history && draft.chat_history.length > 0) {
            setStep(2);
          } else if (draft.unstructured_text) {
            setStep(3);
          } else {
            setStep(1);
          }
          setSelectedPath(fData.selectedPath || (draft.unstructured_text ? 'unstructured' : 'direct'));
          try { localStorage.removeItem(localKey); } catch (_) {}
        } else {
          // No backend draft — check localStorage for a local backup.
          // First, purge any stale iacs_draft_* entries that belong to OTHER sessions
          // to prevent residual data from contaminating this fresh form.
          if (!id) {
            try {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('iacs_draft_') && k !== localKey) {
                  try {
                    const stale = JSON.parse(localStorage.getItem(k) || '{}');
                    // Remove if the draft's own recorded ID differs from localKey's suffix
                    // (i.e., it was an orphan from a previous unfinished session)
                    if (stale.id && stale.id !== draftIdRef.current) {
                      keysToRemove.push(k);
                    }
                  } catch (_) {
                    keysToRemove.push(k); // malformed entry — also remove
                  }
                }
              }
              keysToRemove.forEach(k => localStorage.removeItem(k));
            } catch (_) {}
          }

          let restored = false;
          try {
            const local = localStorage.getItem(localKey);
            if (local) {
              const parsed = JSON.parse(local);
              if (parsed.form_data) {
                const rawFData = { ...parsed.form_data };
                const fData = parsed.summary
                  ? mergeAISummary(rawFData, parsed.summary)
                  : rawFData;
                setFormData(fData);
                setDisclaimerAccepted(Boolean(rawFData._director_declaration_accepted || rawFData.declaracion_responsabilidad));
                setSelectedPath(fData.selectedPath || 'direct');
              }
              if (parsed.confirmed_fields) {
                setConfirmedFields(parsed.confirmed_fields);
              }
              if (parsed.unstructured_text) {
                setUnstructuredText(parsed.unstructured_text);
              }
              if (parsed.chat_history?.length > 0) {
                setChatHistory(parsed.chat_history);
                if (parsed.summary) {
                  setSummary(parsed.summary);
                  setStep(3);
                } else {
                  setStep(2);
                }
                restored = true;
              }
            }
          } catch (_) {}

          if (!restored) {
            // Fresh session — reset completely to Step 1 Options Screen
            const initial: Record<string, any> = {};
            allVisibleFormFields.forEach((f: FieldDefinition) => {
              if (f.field_type === "select") {
                initial[f.key] = f.allow_multiple ? [] : "";
              } else {
                initial[f.key] = "";
              }
            });
            setFormData(initial);
            setConfirmedFields({});
            setUnstructuredText("");
            setChatHistory([]);
            setSummary(null);
            setAiWarnings({});
            setStep(1);
            setSelectedPath('direct');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFields(false));
  }, [id, location.pathname, location.search]);

  const autoSave = async (currentHistory: any[], currentSummary: any, currentFormData = formData, forcedStatus?: string) => {
    // Always save to localStorage first as a reliable offline backup
    try {
      localStorage.setItem(localKey, JSON.stringify({
        id: draftIdRef.current,
        form_data: currentFormData,
        chat_history: currentHistory,
        summary: currentSummary,
        confirmed_fields: confirmedFields,
        unstructured_text: unstructuredText,
        savedAt: new Date().toISOString(),
      }));
    } catch (_) { /* localStorage may be unavailable in private mode */ }

    const hasReachedSummary = Boolean(currentFormData?._reached_summary);
    const hasValidSummary = Boolean(currentSummary && typeof currentSummary === 'object' && Object.keys(currentSummary).length > 0 && (currentSummary.titulo || currentSummary.objetivo));
    const isRealBorrador = forcedStatus === "Borrador" || hasReachedSummary || hasValidSummary;
    const computedStatus = forcedStatus || (isRealBorrador ? "Borrador" : "Chat pendiente");
    const computedNodeId = isRealBorrador ? "borrador" : null;

    // Sync to backend — include user_id so the draft appears in "Chats pendientes" for this user
    const initiativePayload = {
      id: draftIdRef.current,
      form_data: {
        ...currentFormData,
        _director_declaration_accepted: disclaimerAccepted || currentFormData?._director_declaration_accepted || false
      },
      chat_history: currentHistory,
      summary: currentSummary,
      confirmed_fields: confirmedFields,
      unstructured_text: unstructuredText,
      status: computedStatus,
      current_node_id: computedNodeId,
      user_id: profile?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let synced = false;
    try {
      const res = await fetch("/api/initiatives/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initiativePayload),
      });
      if (res.ok) synced = true;
    } catch (e) {
      console.warn("Error auto-saving to backend API (Render may be sleeping), attempting Supabase fallback:", e);
    }

    if (!synced) {
      try {
        await supabase.from('initiatives').upsert([initiativePayload]);
      } catch (sbErr) {
        console.warn("Direct Supabase autoSave fallback also failed:", sbErr);
      }
    }
  };

  // Compute allowed options based on user roles
  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const isTransversal = profile?.profile_roles?.some((r: any) => r.is_transversal);
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador' || r.role === 'admin') || [];

  const allowedVps = (isAdmin || isTransversal) 
    ? dbVps 
    : dbVps.filter(vp => registradorRoles.some((r: any) => r.vp_id === vp.id));
    
  const selectedVp = dbVps.find(vp => vp.name === formData.vicepresidencia);
  
  let allowedDirecciones: any[] = [];
  if (selectedVp) {
    if (isAdmin || isTransversal) {
      allowedDirecciones = dbDirecciones.filter(d => d.vp_id === selectedVp.id);
    } else {
      const rolesForVp = registradorRoles.filter((r: any) => r.vp_id === selectedVp.id);
      if (rolesForVp.length > 0) {
        const vpDirs = dbDirecciones.filter(d => d.vp_id === selectedVp.id);
        const userDirIds = new Set(rolesForVp.flatMap((r: any) => r.direcciones_ids || []));
        
        if (rolesForVp.some((r: any) => r.direcciones_ids?.length === vpDirs.length)) {
           allowedDirecciones = vpDirs;
        } else {
           allowedDirecciones = vpDirs.filter(d => userDirIds.has(d.id));
        }
      }
    }
  }

  const vpOptions = allowedVps.map(v => v.name);
  const dirOptions = allowedDirecciones.map(d => d.name);

  // Auto-populate locked fields
  useEffect(() => {
     if (!profile || fields.length === 0) return;
     let newFormData = { ...formData };
     let changed = false;

     if (profile?.name && newFormData.registrador !== profile.name) {
       newFormData.registrador = profile.name;
       changed = true;
     }

     if (profile?.email && newFormData.registrador_email !== profile.email) {
       newFormData.registrador_email = profile.email;
       changed = true;
     }

     if (vpOptions.length === 1 && newFormData.vicepresidencia !== vpOptions[0]) {
       newFormData.vicepresidencia = vpOptions[0];
       changed = true;
     }

     if (dirOptions.length === 1 && newFormData.direccion !== dirOptions[0]) {
       newFormData.direccion = dirOptions[0];
       changed = true;
     }

     if (newFormData.direccion && !dirOptions.includes(newFormData.direccion)) {
       newFormData.direccion = dirOptions.length === 1 ? dirOptions[0] : "";
       changed = true;
     }

     if (changed) {
       setFormData(newFormData);
     }
  }, [profile, vpOptions.length, dirOptions.length, formData.vicepresidencia, fields.length]); 

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isAiTyping]);

  // ── MediaRecorder voice setup ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setVoiceError(null);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 500) return;

        setIsTranscribing(true);
        try {
          // Decode audio in browser and resample to 16 kHz Float32Array for Whisper
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          await audioCtx.close();

          // Mix down to mono Float32Array
          const float32 = decoded.getChannelData(0);

          // Send to the local Whisper worker
          const text = await new Promise<string>((resolve, reject) => {
            transcribeResolveRef.current = resolve;
            transcribeRejectRef.current = reject;
            sttWorkerRef.current!.postMessage({ type: 'transcribe', audio: float32 }, [float32.buffer]);
          });

          if (text.trim()) {
            setCurrentMessage(prev => prev ? prev + ' ' + text.trim() : text.trim());
          }
        } catch (err: any) {
          setVoiceError('Error al transcribir: ' + (err.message || 'desconocido'));
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 59) { stopRecording(); return 0; } // auto-stop at 60s
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Habilita el micrófono en la configuración del navegador.'
        : 'No se pudo acceder al micrófono: ' + err.message;
      setVoiceError(msg);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const rateMessage = async (index: number, rating: 'positive' | 'negative') => {
    if (ratedMessages[index]) return; // already rated
    const agentMsg = chatHistory[index];
    const userMsg = chatHistory[index - 1];
    if (!agentMsg || agentMsg.role !== 'model') return;
    setRatedMessages(prev => ({ ...prev, [index]: rating }));
    try {
      const initiativeId = draftIdRef.current;
      await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiative_id: initiativeId,
          message_index: index,
          user_message: userMsg?.text ?? '',
          agent_response: agentMsg.text,
          rating,
        }),
      });
    } catch (e) { console.error('Error saving feedback', e); }
  };

  // ── File attachment handler (chat / step-1 strip) ───────────────────────
  const processFile = async (file: File, context: 'chat' | 'support' = 'support') => {
    setAttachError(null);

    let typeKey: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'image' = 'txt';
    const name = file.name.toLowerCase();
    const mime = file.type || '';

    if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
    else if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.ms-excel' || name.endsWith('.xlsx') || name.endsWith('.xls')) typeKey = 'xlsx';
    else if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || name.match(/\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|mov|mp3|wav|ogg|m4a)$/i)) typeKey = 'image';

    const typeConfig = fileTypes[typeKey] || { enabled: true, maxMb: 25.0 };
    if (!typeConfig.enabled) {
      const errorMsg = `La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`;
      setAttachError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    const limitMb = typeConfig.maxMb;
    const limitBytes = limitMb * 1024 * 1024;

    if (file.size > limitBytes) {
      const errorMsg = `El archivo supera el límite de ${limitMb} MB.`;
      setAttachError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4'
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|xlsx|xls|txt|jpg|jpeg|png|webp|gif|svg|mp4|webm|mov|mp3|wav|ogg|m4a)$/i)) {
      const errorMsg = 'Formato no soportado. Usa PDF, Word, Excel, TXT o multimedia.';
      setAttachError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }
    setAttachedFile(file);
    setUploadingFile(file);
    setIsProcessingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAttachedFileContent(data.content);

      const category = data.category || getMediaCategory(file.type, file.name);
      const attachmentMeta = {
        name: file.name,
        content: data.content,
        url: data.url,
        size: file.size,
        type: file.type,
        category
      };

      setFormData(prev => {
        const current = prev.attachments || [];
        if (current.some((f: any) => f.name === file.name)) return prev;
        return {
          ...prev,
          attachments: [...current, attachmentMeta]
        };
      });

      if (context === 'chat' && step === 2 && selectedPath === 'direct') {
        setTimeout(() => {
          submitMessage('', attachmentMeta);
        }, 100);
      } else {
        setAttachedFile(null);
        setAttachedFileContent(null);
      }
    } catch (err: any) {
      const errorMsg = 'Error al procesar el archivo: ' + (err.message || 'desconocido');
      showToast(errorMsg, 'error');
      setAttachedFile(null);
    } finally {
      setIsProcessingFile(false);
      setUploadingFile(null);
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ctx = (step === 2 && selectedPath === 'direct') ? 'chat' : 'support';
    await processFile(file, ctx);
  };


  const removeAttachment = (fileName?: string) => {
    setAttachedFile(null);
    setAttachedFileContent(null);
    setAttachError(null);
    if (fileName && typeof fileName === 'string') {
      setFormData(prev => {
        const current = prev.attachments || [];
        return {
          ...prev,
          attachments: current.filter((f: any) => f.name !== fileName)
        };
      });
    }
  };

  const handleAnalyzeText = async () => {
    if (!unstructuredText.trim()) return;
    setIsAnalyzing(true);
    setError("");
    try {
      let textToAnalyze = unstructuredText.trim();
      const attachments = formData.attachments || [];
      const docAttachments = attachments.filter((f: any) => 
        f.content && !f.type?.startsWith('image/') && !f.type?.startsWith('video/') && !f.type?.startsWith('audio/') && !f.name?.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov|mp3|wav|ogg)$/i)
      );
      if (docAttachments.length > 0) {
        const fileContents = docAttachments
          .map((f: any) => `[Documento adjunto: ${f.name}]\n${f.content}`)
          .join('\n\n');
        textToAnalyze = `${fileContents}\n\n${textToAnalyze}`;
      }

      const res = await fetch("/api/fields/analyze-unstructured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze })
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? "Error al analizar texto.");
      }
      const data = await res.json();
      
      let updatedFormData = { ...formData };
      Object.entries(data.values || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          let valStr = v as string;
          if (k === 'titulo' && typeof valStr === 'string' && valStr.trim()) {
            valStr = valStr.trim().charAt(0).toUpperCase() + valStr.trim().slice(1);
          }
          updatedFormData[k] = valStr;
        }
      });

      setFormData(updatedFormData);
      setAiWarnings(data.warnings || {});

      // Build summary object for Step 3
      const summaryObj = {
        titulo: updatedFormData.titulo || updatedFormData.titulo_de_la_necesidad || "Iniciativa de TI",
        objetivo: updatedFormData.objetivo || "Optimizar procesos de negocio",
        descripcion_de_la_necesidad: updatedFormData.descripcion_de_la_necesidad || unstructuredText.trim(),
        fecha_requerida: updatedFormData.fecha_requerida || "",
        vicepresidencia: updatedFormData.vicepresidencia || "",
        direccion: updatedFormData.direccion || "",
        ...data.values
      };
      setSummary(summaryObj);

      // Transition to Step 2 (Revisión con IA y Envío a Aprobación)
      setStep(2);
      const updatedFormDataWithSummary = {
        ...updatedFormData,
        _reached_summary: true,
      };
      setFormData(updatedFormDataWithSummary);
      autoSave([], summaryObj, updatedFormDataWithSummary, "Borrador");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al procesar el texto con la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateField = async (fieldKey: string, value: string, label: string) => {
    if (selectedPath !== 'direct' || unstructuredText.trim() === "") return;
    try {
      const res = await fetch("/api/fields/validate-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey,
          value,
          label,
          context: formData
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      setAiWarnings(prev => {
        const next = { ...prev };
        if (data.warning) {
          next[fieldKey] = data.warning;
        } else {
          delete next[fieldKey];
        }
        return next;
      });
    } catch (e) {
      console.error("Error validating field:", e);
    }
  };

  const startChatSession = async (customFormData?: Record<string, any>) => {
    const currentData = customFormData || formData;
    setSelectedPath('direct');
    setStep(2);

    const welcomeText = `¡Hola! Soy Teo, tu asesor de arquitectura y proyectos de TI. Cuéntame qué necesidad, dolor operativo o mejora deseas abordar. También puedes adjuntar documentos o evidencias de sustento con el botón del clip 📎 para analizarlos y estructurar tu iniciativa en conjunto.`;
    const initialHist = [{
      role: "model" as const,
      text: welcomeText,
      options: [],
      allowMultiple: false
    }];

    setSelectedMultiOptions([]);
    setChatHistory(initialHist);
    setIsAiTyping(false);
    if (!id && draftIdRef.current) {
      navigate(`/nueva/${draftIdRef.current}`, { replace: true });
    }
    await autoSave(initialHist, summary, currentData);
  };

  const handleStartChat = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    if (unstructuredText.trim() !== "") {
      setIsAiTyping(true);
      const summaryData: Record<string, any> = {};
      aiFields.forEach(f => {
        summaryData[f.key] = formData[f.key] || "";
      });
      setSummary(summaryData);
      setStep(3);
      setIsAiTyping(false);
      await autoSave([], summaryData);
      return;
    }

    await startChatSession();
  };

  const submitMessage = async (userText: string, customAttachment?: any) => {
    const activeAttached = customAttachment || (attachedFile ? {
      name: attachedFile.name,
      type: attachedFile.type,
      url: (formData.attachments || []).find((a: any) => a.name === attachedFile.name)?.url || null,
      size: attachedFile.size,
      category: getMediaCategory(attachedFile.type, attachedFile.name)
    } : undefined);

    if (!userText.trim() && !activeAttached) return;
    setSelectedMultiOptions([]);

    // Build the actual text to display in chat
    const displayText = userText.trim() || (activeAttached ? `[Adjunto: ${activeAttached.name}]` : '');

    // Build the message sent to the AI (include file content or media indicator)
    let aiMessage = userText.trim();
    if (activeAttached) {
      const isMedia = activeAttached.category === 'image' || activeAttached.category === 'video' || activeAttached.category === 'audio' || activeAttached.type?.startsWith('image/') || activeAttached.type?.startsWith('video/') || activeAttached.type?.startsWith('audio/');
      if (isMedia) {
        aiMessage = `[El usuario adjuntó el archivo multimedia: ${activeAttached.name} (${activeAttached.type || activeAttached.category})]\n${aiMessage ? 'Mensaje del usuario: ' + aiMessage : ''}`.trim();
      } else if (attachedFileContent || activeAttached.content) {
        const fileText = attachedFileContent || activeAttached.content;
        aiMessage = `[El usuario adjuntó el archivo: ${activeAttached.name}]\n---\n${fileText}\n---\n${aiMessage ? 'Mensaje del usuario: ' + aiMessage : 'Por favor analiza este archivo en el contexto de la iniciativa.'}`;
      }
    }

    const attachment = activeAttached;
    const newHistory = [...chatHistory, { role: "user" as const, text: displayText, attachment }];
    setChatHistory(newHistory);
    setCurrentMessage("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
    removeAttachment();
    setIsAiTyping(true);

    const fieldsForAI = [...fields, ...aiFields].filter(f => !["registrador", "solicitante"].includes(f.key.toLowerCase()));

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: chatHistory, message: aiMessage || displayText, initialData: formData, aiFields: fieldsForAI }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.extractedFields && (data.extractedFields.titulo || data.extractedFields.objetivo)) {
        setFormData(prev => ({
          ...prev,
          ...(data.extractedFields.titulo ? { titulo: data.extractedFields.titulo } : {}),
          ...(data.extractedFields.objetivo ? { objetivo: data.extractedFields.objetivo } : {})
        }));
      }
      let text = data.text as string;
      const options = data.options;
      const allowMultiple = Boolean(data.allow_multiple);
      setSelectedMultiOptions([]);
      if (text.includes("[INFORMACION_COMPLETA]")) {
        text = text.replace("[INFORMACION_COMPLETA]", "").trim();
        const finalHistory = text ? [...newHistory, { role: "model" as const, text, options, allowMultiple }] : newHistory;
        if (text) setChatHistory(finalHistory);
        autoSave(finalHistory, summary);
        // Start 3-second countdown so user can read the last AI message
        countdownHistoryRef.current = finalHistory;
        setCountdownSeconds(3);
      } else {
        const finalHistory = [...newHistory, { role: "model" as const, text, options, allowMultiple }];
        setChatHistory(finalHistory);
        autoSave(finalHistory, summary);
      }
    } catch { setChatHistory([...newHistory, { role: "model", text: "Error al enviar. Intenta de nuevo." }]); }
    finally { setIsAiTyping(false); }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) stopRecording();
    submitMessage(currentMessage);
  };

  const generateSummary = async (fullHistory: any[]) => {
    setIsAiTyping(true);
    setStep(3);
    try {
      const fieldsToSummarize = [...fields, ...aiFields].filter(f => !["registrador", "solicitante"].includes(f.key.toLowerCase()));
      const res = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: fullHistory, initialData: formData, aiFields: fieldsToSummarize }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
      const mergedFormData = {
        ...mergeAISummary({ ...formData }, data || {}),
        _reached_summary: true,
      };
      setFormData(mergedFormData);
      await autoSave(fullHistory, data, mergedFormData, "Borrador");
    } catch { showToast("Error al generar resumen.", "error"); setStep(2); }
    finally { setIsAiTyping(false); }
  };

  const validateAllFields = (isSubmitting = false) => {
    const errors: string[] = [];
    
    // In Step 1 (advancing to chat), only validate fields actually shown in Step 1
    const vpInStep1 = !!fields.find(f => f.key === 'vicepresidencia')?.ask_in_initial_form;
    const dirInStep1 = !!fields.find(f => f.key === 'direccion')?.ask_in_initial_form;

    if (isSubmitting || selectedPath === 'unstructured' || vpInStep1) {
      if (!formData.vicepresidencia) {
        errors.push("El campo Vicepresidencia es obligatorio.");
      }
    }

    if (isSubmitting || selectedPath === 'unstructured' || dirInStep1) {
      if (!formData.direccion) {
        errors.push("El campo Dirección es obligatorio.");
      }
    }
    
    // Check dynamic required fields (both fixed form fields and AI fields)
    let fieldsToValidate = (selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3)) 
      ? [...fields, ...aiFields] 
      : fields;

    if (!isSubmitting && selectedPath === 'direct' && step === 1) {
      fieldsToValidate = fields.filter(f => f.ask_in_initial_form === true);
    }

    fieldsToValidate.forEach(field => {
      // Omit fixed fields handled manually
      if (["registrador", "solicitante", "vicepresidencia", "direccion"].includes(field.key.toLowerCase())) return;
      
      const val = formData[field.key];
      let isEmpty = val === undefined || val === null || (Array.isArray(val) && val.length === 0);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === "" || trimmed === "null" || trimmed === "{}") isEmpty = true;
      }

      if (field.is_required && isEmpty) {
        errors.push(`El campo "${field.label}" es obligatorio.`);
      }
      if (field.requires_confirmation && !isEmpty && !confirmedFields[field.key]) {
        errors.push(`Debes confirmar que la información mostrada para el campo "${field.label}" es correcta.`);
      }

      // Check title quality for title fields
      const isTitleField = field.key.toLowerCase() === 'titulo' || field.key.toLowerCase() === 'titulo_de_la_necesidad' || field.label.toLowerCase().includes('título') || field.label.toLowerCase().includes('titulo');
      if (isTitleField && !isEmpty) {
        const titleRes = validateTitleQuality(val);
        if (!titleRes.isValid && titleRes.error) {
          errors.push(titleRes.error);
        }
      }
    });

    // Check if there are any active warnings shown
    const activeWarnings = Object.keys(aiWarnings).filter(k => 
      fieldsToValidate.some(f => f.key === k) && aiWarnings[k]
    );
    if (activeWarnings.length > 0) {
      errors.push("Por favor resuelve todas las alertas de información faltante antes de continuar.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleSaveWithValidation = (status: "Borrador" | "Pendiente de aprobación") => {
    const { isValid, errors } = validateAllFields(true);
    if (!isValid) {
      setFormErrors(errors);
      showToast("Por favor completa todos los campos obligatorios antes de continuar.", "error");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormErrors([]);
    
    if (status === "Pendiente de aprobación") {
      if (!disclaimerAccepted) {
        showToast("Por favor marca la casilla de Declaración de Responsabilidad y Veracidad al final del formulario antes de enviar a aprobación.", "error");
        const el = document.getElementById('consent-disclaimer-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setShowConsentModal(true);
    } else {
      handleSave(status);
    }
  };

  const handleStartChatWithValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateAllFields(false);
    if (!isValid) {
      setFormErrors(errors);
      showToast("Por favor completa los campos obligatorios del formulario.", "error");
      return;
    }
    setFormErrors([]);

    // Detect if the user uploaded a file in any field of type 'file' (e.g. "ARCHIVOS CON LA NECESIDAD")
    const fileField = fields.find(f => f.field_type === 'file' && formData[f.key]);
    let uploadedFileMeta: { url: string; name: string; type?: string; size?: number } | null = null;
    if (fileField && formData[fileField.key]) {
      try {
        const parsed = typeof formData[fileField.key] === 'string' ? JSON.parse(formData[fileField.key]) : formData[fileField.key];
        if (parsed && (parsed.url || parsed.name)) {
          uploadedFileMeta = parsed;
        }
      } catch (e) {
        if (typeof formData[fileField.key] === 'string' && formData[fileField.key].startsWith('http')) {
          uploadedFileMeta = { url: formData[fileField.key], name: formData[fileField.key].split('/').pop() || 'archivo' };
        }
      }
    }

    // If an attached file was uploaded in the form, process via analyze-initial-document
    if (uploadedFileMeta && uploadedFileMeta.url) {
      setIsAnalyzingInitialDoc(true);
      try {
        const res = await fetch("/api/chat/analyze-initial-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: uploadedFileMeta.url,
            fileName: uploadedFileMeta.name,
            vicepresidencia: formData.vicepresidencia || "",
            direccion: formData.direccion || "",
            registrador: profile?.name || "Key user"
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Error al procesar el documento inicial.");
        }
        const data = await res.json();

        // Update formData with extracted values
        let updatedFormData = { ...formData, ...(data.extractedValues || {}) };
        if (data.attachment) {
          const existing = updatedFormData.attachments || [];
          if (!existing.some((a: any) => a.name === data.attachment.name)) {
            updatedFormData.attachments = [...existing, data.attachment];
          }
        }
        setFormData(updatedFormData);

        // Build initial summary
        const summaryObj = {
          titulo: updatedFormData.titulo || "Iniciativa de TI",
          objetivo: updatedFormData.objetivo || "Optimización de procesos",
          descripcion_de_la_necesidad: updatedFormData.descripcion_de_la_necesidad || "",
          vicepresidencia: updatedFormData.vicepresidencia,
          direccion: updatedFormData.direccion,
          ...(data.extractedValues || {})
        };
        setSummary(summaryObj);

        // Set initial chat message from Teo
        const newHist = [{
          role: "model" as const,
          text: data.greetingMessage,
          options: data.options || [],
          allowMultiple: Boolean(data.allow_multiple)
        }];
        setSelectedMultiOptions([]);
        setChatHistory(newHist);

        setStep(2);
        await autoSave(newHist, summaryObj, updatedFormData);
      } catch (err: any) {
        console.error("Error analyzing initial doc:", err);
        showToast(err.message || "Error al analizar el documento con Teo.", "error");
      } finally {
        setIsAnalyzingInitialDoc(false);
      }
      return;
    }

    // Otherwise standard start chat session
    handleStartChat(e);
  };

  const handleSave = async (status: "Borrador" | "Pendiente de aprobación") => {
    if (isSaving) return;
    setIsSaving(true);
    const updatedFormData = { 
      ...formData, 
      _reached_summary: true,
      _director_declaration_accepted: disclaimerAccepted,
      declaracion_responsabilidad: disclaimerAccepted
    };
    const initiativePayload = { 
      id: draftIdRef.current, 
      form_data: updatedFormData, 
      chat_history: chatHistory, 
      summary, 
      status, 
      current_node_id: status === "Pendiente de aprobación" ? "eval_bp" : "borrador",
      confirmed_fields: confirmedFields, 
      unstructured_text: unstructuredText,
      user_id: profile?.id ?? null,
      updated_at: new Date().toISOString()
    };
    try {
      let saved = false;
      try {
        const res = await fetch("/api/initiatives/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initiativePayload),
        });
        if (res.ok) saved = true;
      } catch (apiErr) {
        console.warn("API draft save failed, attempting Supabase direct fallback:", apiErr);
      }

      if (!saved) {
        // Direct Supabase upsert fallback
        const { error: sbErr } = await supabase.from('initiatives').upsert([initiativePayload]);
        if (!sbErr) saved = true;
      }

      if (saved) {
        try { localStorage.removeItem(localKey); } catch (_) {}
        if (status === "Borrador") {
          showToast('Cambios guardados con éxito en el borrador.', 'success');
          if (!id && draftIdRef.current) {
            navigate(`/nueva/${draftIdRef.current}`, { replace: true });
          }
        } else {
          navigate("/bandeja");
        }
      } else {
        showToast('Error al guardar la iniciativa. Por favor intenta nuevamente.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error al guardar. Por favor verifica tu conexión.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (id && loadingFields) {
    return (
      <div className="max-w-5xl xl:max-w-6xl mx-auto py-20 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4F5AF5] shadow-sm">
          <div className="w-6 h-6 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1E293B]">Cargando borrador...</h3>
          <p className="text-xs text-[#64748B] mt-1">Recuperando la información y el estado de la iniciativa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto transition-all">
      {/* Hidden file input for general attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[
          fileTypes.pdf?.enabled && '.pdf',
          fileTypes.docx?.enabled && '.docx',
          fileTypes.xlsx?.enabled && '.xlsx,.xls',
          fileTypes.txt?.enabled && '.txt',
          fileTypes.image?.enabled && '.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a'
        ].filter(Boolean).join(',')}
        className="hidden"
        onChange={handleFileAttach}
      />
      {/* Línea de tiempo corporativa con círculos verdes: solo se muestra en la pantalla de resumen */}
      {((selectedPath === 'unstructured' && step === 2) || (selectedPath !== 'unstructured' && step === 3)) && (
        <WorkflowTimelineStepper current={step} />
      )}

      {/* ── Visual State: Teo analizando documento inicial ── */}
      {isAnalyzingInitialDoc && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 flex flex-col items-center text-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-[#C7D2FE]">
            {aiAvatar ? (
              <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover animate-bounce" />
            ) : (
              <Bot className="w-8 h-8 text-[#4F5AF5] animate-bounce" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Teo está analizando tu documento</h3>
          <p className="text-sm text-[#64748B] max-w-md">
            Leyendo la información del archivo adjunto y estructurando los requerimientos para iniciar la conversación...
          </p>
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-2 h-7 rounded-full bg-[#4F5AF5] animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      )}

      {((step === 1 && selectedPath === 'direct') || (step >= 2 && selectedPath === 'unstructured') || step === 3) && !isAiTyping && !isAnalyzingInitialDoc && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9] flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#4F5AF5] text-sm">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  {step === 3 
                    ? '3. Revisión y Envío a Aprobación' 
                    : '1. Registro de Requerimiento y Documentación'}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {step === 3
                    ? 'Revisa y completa la información de la iniciativa validada por Teo.' 
                    : 'Ingresa los datos base y adjunta el documento de sustento para que Teo lo analice.'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleStartChatWithValidation}>
            <div className="px-8 py-6">
              {loadingFields ? (
                <div className="flex items-center justify-center py-10 text-[#94A3B8] gap-3">
                  <div className="w-5 h-5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                  Cargando campos...
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-10 text-[#94A3B8]">
                  No hay campos configurados. Ve a <strong className="text-[#1E293B]">Administración</strong> para agregar campos.
                </div>
              ) : (
                <>
                  {((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3)) && (
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#1E293B] mb-0.5">Validación de Información sugerida por la IA</h4>
                        <p className="text-[11px] text-[#64748B] leading-relaxed">
                          Este resumen y los campos asociados han sido completados de forma automática por el asistente de Inteligencia Artificial. Recuerde que la IA puede cometer errores o interpretar incorrectamente algunos datos, por lo que <span className="font-semibold text-amber-700">se requiere siempre una revisión y validación humana</span> de toda la información antes de guardar la iniciativa o enviarla a aprobación.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Campos Fijos Obligatorios */}
                  <div>
                    <label className={labelCls}>Vicepresidencia <span className="text-red-500 ml-1">*</span></label>
                    <select
                      value={formData.vicepresidencia || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, vicepresidencia: val, direccion: "" });
                        setAiWarnings(prev => {
                          const next = { ...prev };
                          delete next.vicepresidencia;
                          return next;
                        });
                        validateField("vicepresidencia", val, "Vicepresidencia");
                      }}
                      onBlur={() => validateField("vicepresidencia", formData.vicepresidencia || "", "Vicepresidencia")}
                      disabled={vpOptions.length <= 1}
                      className={inputCls}
                      required
                    >
                      <option value="" disabled>Selecciona...</option>
                      {vpOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {aiWarnings.vicepresidencia && (!formData.vicepresidencia || String(formData.vicepresidencia).trim() === "") && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.vicepresidencia}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Dirección <span className="text-red-500 ml-1">*</span></label>
                    <select
                      value={formData.direccion || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, direccion: val });
                        setAiWarnings(prev => {
                          const next = { ...prev };
                          delete next.direccion;
                          return next;
                        });
                        validateField("direccion", val, "Dirección");
                      }}
                      onBlur={() => validateField("direccion", formData.direccion || "", "Dirección")}
                      disabled={dirOptions.length <= 1 || !formData.vicepresidencia}
                      className={inputCls}
                      required
                    >
                      <option value="" disabled>Selecciona...</option>
                      {dirOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {aiWarnings.direccion && (!formData.direccion || String(formData.direccion).trim() === "") && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.direccion}</span>
                      </div>
                    )}
                  </div>

                  {/* Campos Dinámicos */}
                  {((selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3)) 
                      ? [...fields, ...aiFields] 
                      : fields.filter(f => f.ask_in_initial_form === true)
                    ).map(field => {
                    // Omitir si existen en la configuración para evitar duplicados
                    if (["registrador", "solicitante", "vicepresidencia", "direccion"].includes(field.key.toLowerCase())) return null;

                    return (
                      <div key={field.key}>
                        <label className={labelCls}>
                          <span className="align-middle">{field.label}</span>
                          {field.is_required && <span className="text-red-500 ml-1 align-middle">*</span>}
                          {field.help_text && (
                            <span className="relative group inline-block ml-1.5 align-middle cursor-help">
                              <HelpCircle className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#64748B] transition-colors" />
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 p-2.5 bg-[#1E293B] text-white text-[10px] font-normal normal-case leading-normal rounded-lg shadow-lg z-[999] text-center">
                                {field.help_text}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1E293B]" />
                              </span>
                            </span>
                          )}
                        </label>
                        <DynamicField 
                          field={field} 
                          value={formData[field.key] ?? ""} 
                          parentValue={field.depends_on ? formData[field.depends_on] : undefined}
                          onUploadingChange={uploading => {
                            setUploadingFields(prev => ({
                              ...prev,
                              [field.key]: uploading
                            }));
                          }}
                          onChange={v => {
                            setFormData(p => {
                              const newForm = { 
                                ...p, 
                                [field.key]: v,
                              };
                              // Reset any child fields that depend on this one
                              fields.filter(f => f.depends_on === field.key).forEach(child => {
                                newForm[child.key] = "";
                              });
                              return newForm;
                            });
                            setConfirmedFields(prev => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                            setAiWarnings(prev => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                          }} 
                          onBlur={(val) => validateField(field.key, typeof val === 'string' ? val : (formData[field.key] ?? ""), field.label)}
                          onPreview={setPreviewFile}
                        />
                        {(field.key.toLowerCase() === 'titulo' || field.key.toLowerCase() === 'titulo_de_la_necesidad' || field.label.toLowerCase().includes('título') || field.label.toLowerCase().includes('titulo')) && (formData[field.key] !== undefined && formData[field.key] !== "") && !validateTitleQuality(formData[field.key]).isValid && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-start gap-2 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{validateTitleQuality(formData[field.key]).error}</span>
                          </div>
                        )}
                        {field.requires_confirmation && (formData[field.key] !== undefined && formData[field.key] !== "") && (
                          <div className={`mt-2 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${confirmedFields[field.key] ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 shadow-sm shadow-emerald-100/50' : 'bg-amber-50/30 border-amber-200/60 text-[#64748B]'}`}>
                            <input 
                              type="checkbox"
                              id={`confirm-${field.key}`}
                              checked={confirmedFields[field.key] || false}
                              onChange={e => setConfirmedFields(prev => ({ ...prev, [field.key]: e.target.checked }))}
                              className="rounded border-[#CBD5E1] text-[#4F5AF5] focus:ring-[#4F5AF5] w-4 h-4 cursor-pointer"
                            />
                            <label htmlFor={`confirm-${field.key}`} className="text-xs font-semibold cursor-pointer select-none">
                              He validado y confirmo esta información.
                            </label>
                          </div>
                        )}
                        {aiWarnings[field.key] && (!formData[field.key] || String(formData[field.key]).trim() === "" || (Array.isArray(formData[field.key]) && formData[field.key].length === 0)) && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{aiWarnings[field.key]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Evidencias y archivos adjuntos en el resumen (Paso 3) */}
                {((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3)) && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#4F5AF5]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Archivos de Sustento y Evidencias Adjuntas
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {((formData.attachments && formData.attachments.length) || 0)} archivo(s)
                      </span>
                    </div>

                    {(!formData.attachments || formData.attachments.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-xs text-slate-400">
                        No se han adjuntado evidencias complementarias a esta iniciativa.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formData.attachments.map((file: any, fileIdx: number) => {
                          const isImage = Boolean(
                            file.category === 'image' ||
                            file.type?.startsWith('image/') ||
                            file.name?.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)
                          );
                          const isVideo = Boolean(
                            file.category === 'video' ||
                            file.type?.startsWith('video/') ||
                            file.name?.match(/\.(mp4|webm|mov)$/i)
                          );
                          const isAudio = Boolean(
                            file.category === 'audio' ||
                            file.type?.startsWith('audio/') ||
                            file.name?.match(/\.(mp3|wav|ogg|m4a)$/i)
                          );

                          return (
                            <div
                              key={fileIdx}
                              className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  {isImage ? (
                                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                                  ) : isVideo ? (
                                    <VideoIcon className="w-4 h-4 text-purple-600" />
                                  ) : isAudio ? (
                                    <AudioIcon className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {file.size ? `${(file.size / 1024).toFixed(0)} KB` : 'Archivo adjunto'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Vista previa SOLO para imágenes */}
                                {isImage && file.url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile({ url: file.url, name: file.name, type: file.type })}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#4F5AF5] hover:bg-slate-100 transition-colors"
                                    title="Ver imagen"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Botón de descarga para todos los archivos con url */}
                                {file.url && (
                                  <a
                                    href={file.url}
                                    download={file.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#4F5AF5] hover:bg-slate-100 transition-colors flex items-center"
                                    title="Descargar archivo"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                )}

                                {/* Botón para eliminar */}
                                <button
                                  type="button"
                                  onClick={() => deleteAttachmentFromChat(file.name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Quitar archivo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            </div>



            {/* Form Validation Errors */}
            {formErrors.length > 0 && (
              <div className="px-8 py-4 border-t border-[#F1F5F9] bg-red-50/50">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm text-red-700">
                    <p className="font-bold">Por favor, corrige los siguientes errores:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                      {formErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer and Checkbox (Only on final review step before BP submission) */}
            {((selectedPath === 'unstructured' && step >= 2) || (selectedPath === 'direct' && step === 3)) && (
              <div id="consent-disclaimer-section" className="px-8 py-5 border-t border-[#F1F5F9] bg-[#FFFBEB]/30">
                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${disclaimerAccepted ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'}`}>
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-amber-400 text-[#4F5AF5] focus:ring-[#4F5AF5] transition-colors cursor-pointer shrink-0"
                  />
                  <label htmlFor="disclaimer-checkbox" className="text-xs text-amber-950 leading-relaxed select-none cursor-pointer flex-1">
                    <span className="font-bold text-amber-900 block mb-0.5">
                      {keyUserConsent?.title || "Declaración y Sustento del Solicitante (Key User)"}
                      {keyUserConsent?.version && (
                        <span className="ml-1.5 font-mono text-[10px] text-amber-800 bg-amber-100/80 border border-amber-300 px-1.5 py-0.2 rounded">
                          v{keyUserConsent.version}
                        </span>
                      )}:
                    </span>
                    <span>
                      {keyUserConsent?.statement || "Declaro bajo responsabilidad que la información consignada en esta solicitud es veraz, responde a una necesidad legítima de las operaciones o estrategia institucional, y cuenta con la documentación de sustento requerida para su análisis por TI."}
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className={`px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex flex-wrap items-center gap-3 ${
              step === 1 ? 'justify-center' : 'justify-between'
            }`}>
              {/* Left side actions (hidden on step 1) */}
              {step !== 1 && (
                <div>
                  {(chatHistory.length > 0 || (unstructuredText && unstructuredText.trim().length > 0)) && (
                    <button
                      type="button"
                      onClick={() => setShowChatModal(true)}
                      className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      title={chatHistory.length > 0 ? "Ver el historial de chat con la IA" : "Ver el texto original ingresado"}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {chatHistory.length > 0 ? "Ver conversación" : "Ver texto original"}
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className={`flex flex-wrap gap-3 ${step === 1 ? 'justify-center w-full' : ''}`}>
                {selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveWithValidation("Borrador")}
                      disabled={isSaving || isProcessingFile}
                      className="flex items-center justify-center gap-2 border border-[#4F5AF5] text-[#4F5AF5] hover:bg-[#EEF2FF] disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                      title="Guardar los cambios realizados en el borrador"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveWithValidation("Pendiente de aprobación")}
                      disabled={isSaving || isProcessingFile}
                      className="flex items-center justify-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar a aprobación de BP TI
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={loadingFields || fields.length === 0 || isAnyFileUploading || isProcessingFile || isAnalyzingInitialDoc}
                    className="flex items-center justify-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20 cursor-pointer"
                  >
                    {isAnalyzingInitialDoc ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Teo está analizando tu documento...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>{fields.some(f => f.field_type === 'file' && formData[f.key]) ? "Analizar documento y conversar con Teo" : "Continuar con Teo"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Asistente IA ────────────────────────────────────────── */}
      {step === 2 && selectedPath === 'direct' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col transition-all" style={{ height: 'min(760px, calc(100vh - 200px))', minHeight: 640 }}>
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center gap-3 bg-[#4F5AF5]">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {aiAvatar ? (
                <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{aiName}</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest">Analista de Negocio Senior</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {!id && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Volver al formulario
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-blue-100">En línea</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#F8FAFC]">
            {chatHistory.map((msg, i) => {
              const isLastMsg = i === chatHistory.length - 1;
              return (
                <div key={i} className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                  {/* Avatar */}
                  {msg.role === "model" ? (
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#E2E8F0] shadow-sm mt-1 overflow-hidden">
                      {aiAvatar ? (
                        <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="w-4 h-4 text-[#4F5AF5]" />
                      )}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#4F5AF5] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <span className="text-white text-[10px] font-bold">
                        {profile?.name?.substring(0, 2).toUpperCase() || "TU"}
                      </span>
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div className="flex flex-col gap-2 min-w-0">
                    {/* File attachment preview & action card */}
                    {msg.attachment && (
                      <div className={`rounded-2xl border p-2.5 shadow-sm transition-all ${
                        msg.role === 'user'
                          ? 'bg-[#3F49E0]/40 border-blue-300/40 text-white self-end max-w-sm w-full'
                          : 'bg-slate-100 border-[#E2E8F0] text-[#1E293B] self-start max-w-sm w-full'
                      }`}>
                        {/* Image Preview / Thumbnail */}
                        {(msg.attachment.category === 'image' || msg.attachment.type.startsWith('image/') || msg.attachment.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) && (
                          <div className="relative group rounded-xl overflow-hidden mb-2 bg-black/20">
                            {msg.attachment.url ? (
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name}
                                onClick={() => setPreviewFile({ url: msg.attachment!.url!, name: msg.attachment!.name, type: msg.attachment!.type })}
                                className="w-full max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                              />
                            ) : (
                              <div className="h-32 flex items-center justify-center bg-slate-200/50 rounded-xl text-xs text-slate-500">
                                <ImageIcon className="w-8 h-8 opacity-50" />
                              </div>
                            )}
                            {msg.attachment.url && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ url: msg.attachment!.url!, name: msg.attachment!.name, type: msg.attachment!.type })}
                                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-semibold backdrop-blur-sm"
                                title="Ver en grande"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ampliar
                              </button>
                            )}
                          </div>
                        )}

                        {/* Video Preview */}
                        {(msg.attachment.category === 'video' || msg.attachment.type.startsWith('video/') || msg.attachment.name.match(/\.(mp4|webm|mov)$/i)) && (
                          <div className="rounded-xl overflow-hidden mb-2 bg-black">
                            {msg.attachment.url ? (
                              <video
                                src={msg.attachment.url}
                                controls
                                className="w-full max-h-44 rounded-xl"
                              />
                            ) : (
                              <div className="h-32 flex items-center justify-center bg-slate-800 text-white text-xs">
                                <VideoIcon className="w-8 h-8 opacity-50" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Audio Preview */}
                        {(msg.attachment.category === 'audio' || msg.attachment.type.startsWith('audio/') || msg.attachment.name.match(/\.(mp3|wav|ogg|m4a)$/i)) && (
                          <div className="mb-2">
                            {msg.attachment.url ? (
                              <audio
                                src={msg.attachment.url}
                                controls
                                className="w-full h-9 rounded-lg"
                              />
                            ) : (
                              <div className="p-2 bg-slate-200 rounded-lg flex items-center gap-2 text-xs">
                                <AudioIcon className="w-4 h-4" /> <span>Audio adjunto</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Meta info & Action row */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {msg.attachment.category === 'image' || msg.attachment.type.startsWith('image/') ? (
                              <ImageIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                            ) : msg.attachment.category === 'video' || msg.attachment.type.startsWith('video/') ? (
                              <VideoIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                            ) : msg.attachment.category === 'audio' || msg.attachment.type.startsWith('audio/') ? (
                              <AudioIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 shrink-0 opacity-90" />
                            )}
                            <span className="text-xs font-semibold truncate" title={msg.attachment.name}>
                              {msg.attachment.name}
                            </span>
                            {msg.attachment.size ? (
                              <span className="text-[10px] opacity-75 shrink-0">
                                ({(msg.attachment.size / 1024).toFixed(0)} KB)
                              </span>
                            ) : null}
                          </div>

                          {/* Action buttons: Preview & Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            {msg.attachment.url && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ url: msg.attachment!.url!, name: msg.attachment!.name, type: msg.attachment!.type })}
                                className="p-1 rounded hover:bg-white/20 text-inherit transition-colors"
                                title="Ver vista previa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteAttachmentFromChat(msg.attachment!.name, i)}
                              className="p-1 rounded hover:bg-red-500/30 text-red-200 hover:text-white transition-colors"
                              title="Eliminar evidencia"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#4F5AF5] text-white rounded-tr-sm"
                        : "bg-white text-[#1E293B] border border-[#E2E8F0] rounded-tl-sm"
                    }`}>
                      {msg.role === "model" ? (
                        <div className="prose prose-sm prose-slate max-w-none">
                          <ReactMarkdown>{parseHtmlToMarkdown(msg.text)}</ReactMarkdown>
                        </div>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: formatHtmlText(msg.text, msg.text) }} />
                      )}
                      <p className={`text-[10px] mt-1.5 font-medium ${msg.role === "user" ? "text-white/80 text-right" : "text-[#94A3B8]"}`}>
                        {msg.role === "user" ? "Tú" : aiName}
                      </p>
                    </div>

                    {/* 👍/👎 feedback buttons for model messages */}
                    {msg.role === "model" && !isAiTyping && (
                      <div className="flex gap-1 mt-0.5">
                        {ratedMessages[i] ? (
                          <span className="text-[10px] text-[#94A3B8] italic">
                            {ratedMessages[i] === 'positive' ? '✓ Calificado como útil' : '✓ Calificado como mejorable'}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => rateMessage(i, 'positive')}
                              title="Respuesta útil"
                              className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-emerald-600 transition-colors px-2 py-1 rounded-md hover:bg-emerald-50"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Útil</span>
                            </button>
                            <button
                              onClick={() => rateMessage(i, 'negative')}
                              title="Respuesta mejorable"
                              className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>Mejorable</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Opciones sugeridas si es el último mensaje y es de la IA (Soporta selección única o múltiple) */}
                    {msg.role === "model" && msg.options && msg.options.length > 0 && isLastMsg && !isAiTyping && (
                      <div className="mt-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 shadow-xs animate-in fade-in-50 duration-200">
                        {/* Cabecera explicativa de opciones */}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5 px-0.5">
                          <ListChecks className="w-3.5 h-3.5 text-[#EB5F46]" />
                          <span>{msg.allowMultiple ? "Selecciona una o más opciones:" : "Selecciona una opción para responder:"}</span>
                        </div>

                        {/* Listado de tarjetas interactivas */}
                        <div className="flex flex-col gap-2">
                          {msg.options.map((opt, optIndex) => {
                            const isSelected = selectedMultiOptions.includes(opt);
                            const letter = String.fromCharCode(65 + (optIndex % 26));

                            // Modo 1: Selección simple (un toque responde inmediatamente)
                            if (!msg.allowMultiple) {
                              return (
                                <button
                                  key={optIndex}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMultiOptions([]);
                                    submitMessage(opt);
                                  }}
                                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer bg-white hover:bg-[#EB5F46] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#EB5F46] active:scale-[0.99] hover:shadow-md hover:shadow-[#EB5F46]/15 group text-left"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-[#EB5F46] flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-200/80 group-hover:border-white transition-all shadow-2xs">
                                      {letter}
                                    </span>
                                    <span className="leading-snug transition-colors group-hover:text-white">
                                      {opt}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 opacity-60 group-hover:opacity-100" />
                                </button>
                              );
                            }

                            // Modo 2: Selección múltiple (con checkbox y selector acumulativo)
                            return (
                              <button
                                key={optIndex}
                                type="button"
                                onClick={() => {
                                  setSelectedMultiOptions(prev =>
                                    prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                                  );
                                }}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.99] text-left border ${
                                  isSelected
                                    ? "bg-[#EB5F46] text-white border-[#EB5F46] shadow-sm ring-2 ring-[#EB5F46]/20"
                                    : "bg-white hover:bg-[#FFF0ED] border-slate-200/90 hover:border-[#EB5F46] text-slate-700 hover:text-[#EB5F46]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className={`w-4 h-4 rounded border-slate-300 pointer-events-none shrink-0 ${
                                    isSelected ? "accent-white" : "accent-[#EB5F46]"
                                  }`}
                                />
                                <span className="flex-1 leading-snug">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Barra de envío para selección múltiple */}
                        {msg.allowMultiple && (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                            <button
                              type="button"
                              disabled={selectedMultiOptions.length === 0}
                              onClick={() => {
                                const combinedText = selectedMultiOptions.join(", ");
                                setSelectedMultiOptions([]);
                                submitMessage(combinedText);
                              }}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-98 ${
                                selectedMultiOptions.length > 0
                                  ? "bg-[#EB5F46] hover:bg-[#c94a32] text-white shadow-[#EB5F46]/20 cursor-pointer"
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Enviar opciones seleccionadas {selectedMultiOptions.length > 0 ? `(${selectedMultiOptions.length})` : ""}</span>
                            </button>
                            {selectedMultiOptions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedMultiOptions([])}
                                className="text-xs text-slate-500 hover:text-slate-700 underline px-1 cursor-pointer"
                              >
                                Limpiar selección
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-11">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-[#E2E8F0] bg-white space-y-2">

            {/* File preview strip */}
            {attachedFile && (
              <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-3 py-2">
                {attachedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : attachedFile.type.startsWith('video/') ? (
                  <VideoIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : attachedFile.type.startsWith('audio/') ? (
                  <AudioIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#4F5AF5] truncate">{attachedFile.name}</span>
                    <span className="text-[10px] text-[#64748B] shrink-0">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <span className="text-[9.5px] text-[#64748B]">Se adjuntará como evidencia de soporte documental</span>
                </div>
                {isProcessingFile ? (
                  <span className="text-[10px] text-[#94A3B8] shrink-0 animate-pulse">Procesando...</span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-semibold shrink-0">✓ Listo</span>
                )}
                <button onClick={() => removeAttachment()} className="text-[#94A3B8] hover:text-red-500 transition-colors ml-1" title="Quitar archivo">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-red-600">Grabando...</span>
                <span className="text-xs text-red-500 font-mono">
                  0:{String(recordingSeconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-red-400 ml-auto">Máx. 60s</span>
                <button onClick={stopRecording} className="text-red-500 hover:text-red-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Transcribing / model loading indicator */}
            {(isTranscribing || modelLoadProgress !== null) && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                <svg className="animate-spin w-3.5 h-3.5 text-violet-500 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                {modelLoadProgress !== null ? (
                  <>
                    <span className="text-xs font-semibold text-violet-600">Cargando modelo Whisper...</span>
                    <div className="flex-1 bg-violet-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-violet-500 transition-all" style={{ width: `${modelLoadProgress}%` }} />
                    </div>
                    <span className="text-[10px] text-violet-500 shrink-0">{modelLoadProgress}%</span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-violet-600">Transcribiendo localmente...</span>
                )}
              </div>
            )}

            {/* Voice or attach errors */}
            {(voiceError || attachError) && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{voiceError || attachError}</span>
                <button onClick={() => { setVoiceError(null); setAttachError(null); }} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* ── Countdown Banner (shown when AI finished and summary is about to generate) */}
            {countdownSeconds !== null && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col items-center gap-2 py-3 px-4 bg-gradient-to-r from-[#4F5AF5]/10 via-[#7B84F7]/10 to-[#4F5AF5]/10 border border-[#4F5AF5]/30 rounded-xl">
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative w-9 h-9 shrink-0">
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke="#4F5AF5" strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 15}`}
                          strokeDashoffset={`${2 * Math.PI * 15 * (1 - countdownSeconds / 3)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#4F5AF5]">
                        {countdownSeconds}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1E293B]">Preparando resumen…</p>
                      <p className="text-[10px] text-[#64748B]">En {countdownSeconds}s se generará el resumen con toda la información recopilada.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input row */}
            <form onSubmit={handleSendMessage} className={`flex items-center gap-2 ${countdownSeconds !== null ? 'pointer-events-none opacity-40' : ''}`}>

              {/* Attach button */}
              {useAttachments && Object.values(fileTypes).some(t => t.enabled) && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAiTyping || isProcessingFile}
                  title="Adjuntar archivo"
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                    attachedFile
                      ? 'border-[#4F5AF5] bg-[#EEF2FF] text-[#4F5AF5]'
                      : 'border-[#E2E8F0] text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#4F5AF5]'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}

              {/* Text input as textarea for paragraph-like readability */}
              <textarea
                ref={chatInputRef}
                value={currentMessage}
                onChange={e => {
                  setCurrentMessage(e.target.value);
                  // Auto-grow height up to 150px
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={e => {
                  // Submit on Enter key without shift
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isAiTyping && !isRecording && !isTranscribing) {
                      submitMessage(currentMessage);
                    }
                  }
                }}
                rows={1}
                disabled={isAiTyping || isRecording || isTranscribing}
                placeholder={
                  isRecording ? '🎙️ Grabando — haz clic en ■ para transcribir...'
                  : isTranscribing ? 'Transcribiendo...'
                  : 'Escribe tu respuesta...'
                }
                style={{ resize: 'none' }}
                className={`flex-1 border rounded-xl px-4 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-[#4F5AF5] transition-colors leading-relaxed min-h-[42px] max-h-[150px] align-middle ${
                  isRecording
                    ? 'border-red-300 bg-red-50 focus:ring-red-200'
                    : isTranscribing
                      ? 'border-violet-300 bg-violet-50 focus:ring-violet-200'
                      : 'border-[#E2E8F0] focus:ring-[#4F5AF5]'
                }`}
              />

              {/* Mic button */}
              {useMic && (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isAiTyping || isTranscribing}
                  title={isRecording ? "Detener grabación" : "Grabar por voz"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 relative ${
                    isRecording
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20 animate-pulse'
                      : isTranscribing
                        ? 'bg-violet-100 text-violet-500 border border-violet-200'
                        : 'border border-[#E2E8F0] text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#4F5AF5]'
                  }`}
                >
                  {isTranscribing ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {/* Recording pulsing ring */}
                  {isRecording && (
                    <span className="absolute inset-0 rounded-xl animate-ping bg-red-400 opacity-30" />
                  )}
                </button>
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={(!currentMessage.trim() && !attachedFile) || isAiTyping || isProcessingFile || isRecording || isTranscribing}
                className="w-9 h-9 rounded-xl bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] flex items-center justify-center text-white transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Disclaimer & formats hint */}
            <div className="space-y-1 text-center pt-0.5">
              <p className="text-[10.5px] text-[#475569] flex items-center justify-center gap-1.5 font-medium bg-slate-50 border border-slate-200/60 rounded-lg py-1 px-2.5">
                <span className="text-blue-500">📎</span>
                <span>Puedes adjuntar <strong>documentación y archivos de sustento</strong> como apoyo para el análisis de tu necesidad.</span>
              </p>
              <p className="text-[10px] text-[#94A3B8]">
                {(() => {
                  const parts: string[] = [];
                  if (useMic) parts.push("🎙️ Voz local");
                  if (useAttachments) {
                    const enabledTypes: string[] = [];
                    if (fileTypes.pdf?.enabled) enabledTypes.push(`PDF (máx. ${fileTypes.pdf.maxMb} MB)`);
                    if (fileTypes.docx?.enabled) enabledTypes.push(`DOCX (máx. ${fileTypes.docx.maxMb} MB)`);
                    if (fileTypes.xlsx?.enabled) enabledTypes.push(`Excel (máx. ${fileTypes.xlsx.maxMb} MB)`);
                    if (fileTypes.txt?.enabled) enabledTypes.push(`TXT (máx. ${fileTypes.txt.maxMb} MB)`);
                    if (fileTypes.image?.enabled) enabledTypes.push(`Imágenes/Multimedia (máx. ${fileTypes.image.maxMb} MB)`);
                    if (enabledTypes.length > 0) parts.push(`📎 Formatos permitidos: ${enabledTypes.join(", ")}`);
                  }
                  return parts.join("  ·  ");
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Generando ───────────────────────────────────────────── */}
      {step === 3 && isAiTyping && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0">
            {aiAvatar ? (
              <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover animate-bounce" />
            ) : (
              <Bot className="w-7 h-7 text-[#4F5AF5] animate-bounce" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Generando Resumen del Requerimiento</h3>
          <p className="text-sm text-[#64748B]">{aiName} está estructurando toda la información recopilada...</p>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-6 rounded-full bg-[#4F5AF5]/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
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
                  <p className="text-[10px] text-[#94A3B8]">Consulta las respuestas y archivos que compartiste con el agente.</p>
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
                chatHistory.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-[#94A3B8] mb-1 px-1">
                      {msg.role === 'user' ? 'Tú (Key user)' : aiName}
                    </span>
                    <div 
                      className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#4F5AF5] text-white rounded-tr-none' 
                          : 'bg-white text-[#334155] border border-[#E2E8F0] rounded-tl-none'
                      }`}
                    >
                      {/* Attached File display inside modal */}
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
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatHtmlText(msg.text, msg.text) }} />
                      ) : (
                        <div className="prose prose-xs sm:prose-sm max-w-none text-[#334155] leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>li]:mb-1 [&>strong]:text-slate-900 [&>strong]:font-bold">
                          <ReactMarkdown>{parseHtmlToMarkdown(msg.text)}</ReactMarkdown>
                        </div>
                      )}
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

      {/* Custom Consent Dialog Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  {keyUserConsent?.title || "Declaración y Sustento del Solicitante (Key User)"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {keyUserConsent?.statement || "Declaro bajo responsabilidad que la información consignada en esta solicitud es veraz, responde a una necesidad legítima de las operaciones o estrategia institucional, y cuenta con la documentación de sustento requerida para su análisis por TI."}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="flex-grow px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConsentModal(false);
                  handleSave("Pendiente de aprobación");
                }}
                className="flex-grow flex items-center justify-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-md shadow-[#4F5AF5]/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aceptar y Enviar
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
                {previewFile.type?.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                  <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : previewFile.type?.startsWith('video/') || previewFile.name.match(/\.(mp4|webm|mov)$/i) ? (
                  <VideoIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                ) : previewFile.type?.startsWith('audio/') || previewFile.name.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                  <AudioIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
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

      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md text-white ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 shadow-emerald-500/10' 
              : toast.type === 'warning'
                ? 'bg-amber-600 border-amber-500 shadow-amber-500/10'
                : 'bg-red-600 border-red-500 shadow-red-500/10'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 shrink-0 text-white" />}
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
