import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Bot, ChevronRight, Pencil, Save, Send, RotateCcw, ThumbsUp, ThumbsDown, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon, AlertCircle, ChevronDown, Check, BrainCircuit, MessageSquare, HelpCircle, ArrowLeft, PlusCircle, Eye } from "lucide-react";
import STTWorker from '../workers/stt.worker?worker';
import { FieldDefinition } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import ReactMarkdown from "react-markdown";

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]";
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

  // Parse current value if it is a JSON file representation
  let fileObj: { name: string; content?: string; url?: string; type?: string } | null = null;
  if (value && typeof value === "string" && value.startsWith('{"name":')) {
    try {
      fileObj = JSON.parse(value);
    } catch (e) {
      // Not a valid JSON, fallback to null
    }
  }

  if (field.field_type === "date")
    return <input type="date" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur ? () => onBlur(value) : undefined} required={field.is_required} disabled={disabled} className={inputCls} />;
  
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
      let typeKey: 'pdf' | 'docx' | 'txt' | 'image' = 'txt';
      const name = file.name.toLowerCase();
      const mime = file.type;

      if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
      else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
      else if (mime.startsWith('image/')) typeKey = 'image';

      // Fallback default config if options is empty/invalid
      const fileTypes = field.options?.fileTypes || {
        pdf: { enabled: true, maxMb: 1.0 },
        docx: { enabled: true, maxMb: 1.0 },
        txt: { enabled: true, maxMb: 1.0 },
        image: { enabled: true, maxMb: 1.0 }
      };

      const config = fileTypes[typeKey] || { enabled: true, maxMb: 1.0 };
      if (!config.enabled) {
        setError(`La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`);
        return;
      }

      const limitBytes = config.maxMb * 1024 * 1024;
      if (file.size > limitBytes) {
        setError(`El archivo supera el límite permitido de ${config.maxMb} MB.`);
        return;
      }

      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) {
        setError('Formato no soportado. Usa PDF, DOCX, TXT o imágenes.');
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
          name: file.originalname || file.name, 
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
            field.options?.fileTypes?.pdf?.enabled !== false && '.pdf',
            field.options?.fileTypes?.docx?.enabled !== false && '.docx',
            field.options?.fileTypes?.txt?.enabled !== false && '.txt',
            field.options?.fileTypes?.image?.enabled !== false && '.jpg,.jpeg,.png,.webp'
          ].filter(Boolean).join(',')} 
          className="hidden" 
          onChange={handleFileAttach} 
          disabled={disabled}
        />
        
        {fileObj ? (
          <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-3 py-2">
            {fileObj.name.toLowerCase().endsWith('.png') || fileObj.name.toLowerCase().endsWith('.jpg') || fileObj.name.toLowerCase().endsWith('.jpeg') || fileObj.name.toLowerCase().endsWith('.webp') ? (
              <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
            )}
            <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{fileObj.name}</span>
            {fileObj.url && (
              <button 
                type="button" 
                onClick={() => onPreview?.({ url: fileObj.url || '', name: fileObj.name, type: fileObj.type })}
                className="text-[#4F5AF5] hover:text-[#3F49E0] transition-colors p-1"
                title="Ver vista previa"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button" 
              onClick={handleRemove} 
              disabled={disabled} 
              className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
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
          const ft = field.options?.fileTypes || {
            pdf: { enabled: true, maxMb: 1.0 },
            docx: { enabled: true, maxMb: 1.0 },
            txt: { enabled: true, maxMb: 1.0 },
            image: { enabled: true, maxMb: 1.0 },
          };
          const parts: string[] = [];
          if (ft.pdf?.enabled) parts.push(`PDF (máx. ${ft.pdf.maxMb} MB)`);
          if (ft.docx?.enabled) parts.push(`DOCX (máx. ${ft.docx.maxMb} MB)`);
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
      <textarea
        value={value}
        onChange={e => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
          onChange(e.target.value);
        }}
        onBlur={onBlur ? () => onBlur(value) : undefined}
        required={field.is_required}
        disabled={disabled}
        placeholder={`Ingresa ${field.label.toLowerCase()}...`}
        className={`${inputCls} min-h-[42px] overflow-hidden resize-none py-2.5 leading-relaxed`}
        style={{ height: value ? 'auto' : undefined }}
        ref={(el) => {
          if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }
        }}
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

// ─── Step breadcrumb ──────────────────────────────────────────────────────────
const STEPS = [
  { n: "1", label: "Formulario inicial" },
  { n: "2", label: "Asistente IA" },
  { n: "3", label: "Resumen" },
  { n: "4", label: "Revisión BP" },
];

function Stepper({ current, path }: { current: number; path: 'unstructured' | 'direct' | 'select' }) {
  const steps = path === 'unstructured' ? [
    { n: "1", label: "Describe tu necesidad" },
    { n: "2", label: "Revisión con IA" },
  ] : [
    { n: "1", label: "Formulario inicial" },
    { n: "2", label: "Asistente IA" },
    { n: "3", label: "Resumen" },
    { n: "4", label: "Revisión BP" },
  ];

  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-[#EEF2FF] text-[#4F5AF5]"
              : done ? "text-[#4F5AF5]"
              : "text-[#94A3B8]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                active ? "bg-[#4F5AF5] text-white"
                : done ? "bg-[#4F5AF5] text-white"
                : "bg-[#E2E8F0] text-[#94A3B8]"
              }`}>
                {done ? "✓" : s.n}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] mx-1 shrink-0" />
            )}
          </div>
        );
      })}
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
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);
  const [selectedPath, setSelectedPath] = useState<'select' | 'direct' | 'unstructured'>('select');
  useEffect(() => {
    (window as any).isInitiativeProcessInProgress = (selectedPath !== 'select');
    return () => {
      (window as any).isInitiativeProcessInProgress = false;
    };
  }, [selectedPath]);
  // Countdown before generating summary after chat finishes
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const countdownHistoryRef = useRef<any[]>([]);

  // ── Key-normaliser for AI summary merging ─────────────────────────────────
  // Normalises a key to lowercase with no underscores/spaces so keys coming
  // from the AI (camelCase, snake_case, with spaces) can be matched against
  // the field keys stored in the database.
  const normaliseKey = (k: string) => k.toLowerCase().replace(/[_\s]/g, '');

  // Merges AI summary data into a formData object using normalised key matching.
  // If no DB field matches the AI key, the AI key is used as-is.
  const mergeAISummary = (base: Record<string, any>, summaryData: Record<string, any>) => {
    const allFieldKeys = [...fields, ...aiFields].map(f => f.key);
    const merged = { ...base };
    Object.entries(summaryData).forEach(([aiKey, val]) => {
      if (val === undefined || val === null || val === '') return;
      // Try to find an exact match first
      if (allFieldKeys.includes(aiKey)) {
        merged[aiKey] = val;
        return;
      }
      // Normalised match
      const normAI = normaliseKey(aiKey);
      const matchedKey = allFieldKeys.find(k => normaliseKey(k) === normAI);
      if (matchedKey) {
        merged[matchedKey] = val;
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

  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string; options?: string[]; attachment?: { name: string; type: string } }[]>([]);
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
    pdf: { enabled: true, maxMb: 1.0 },
    docx: { enabled: true, maxMb: 1.0 },
    txt: { enabled: true, maxMb: 1.0 },
    image: { enabled: true, maxMb: 1.0 },
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
      fetch("/api/fields").then(r => r.json()),
      supabase.from('vps').select('id, name'),
      supabase.from('direcciones').select('id, name, vp_id'),
      id ? supabase.from('initiatives').select('*').eq('id', id).single() : Promise.resolve({ data: null }),
      supabase.from('ai_training_config').select('*').eq('layer', 'settings'),
      fetch("/api/config/features").then(r => r.json()).catch(() => ({
        useMic: true,
        useAttachments: true,
        fileTypes: {
          pdf: { enabled: true, maxMb: 1.0 },
          docx: { enabled: true, maxMb: 1.0 },
          txt: { enabled: true, maxMb: 1.0 },
          image: { enabled: true, maxMb: 1.0 }
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

        if (features.fileTypes) {
          setFileTypes(features.fileTypes);
        }
        
        const normalFormFields = data.filter((f: FieldDefinition) => f.is_visible && (f.section || 'form') === 'form' && f.key !== 'aprobacin_de_director');
        const voboField = data.find((f: FieldDefinition) => f.is_visible && f.key === 'aprobacin_de_director');
        const allVisibleFormFields = voboField ? [...normalFormFields, voboField] : normalFormFields;
        const visibleAiFields = data.filter((f: FieldDefinition) => f.is_visible && f.section === 'ai');
        setFields(allVisibleFormFields);
        setAiFields(visibleAiFields);
        
        const draft = draftRes?.data;
        if (draft) {
          // Backend draft found — use it and clear any stale local backup
          const rawFData = { ...(draft.form_data || {}) };
          const fData = draft.summary
            ? mergeAISummary(rawFData, draft.summary)
            : rawFData;
          setFormData(fData);
          setConfirmedFields(draft.confirmed_fields || {});
          setUnstructuredText(draft.unstructured_text || "");
          setChatHistory(draft.chat_history || []);
          setSummary(draft.summary || null);
          if (draft.summary) setStep(3);
          else if (draft.chat_history && draft.chat_history.length > 0) setStep(2);
          else setStep(1);
          setSelectedPath(fData.selectedPath || 'direct');
          try { localStorage.removeItem(localKey); } catch (_) {}
        } else {
          // No backend draft — check localStorage for a local backup
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
            // Fresh session
            const initial: Record<string, any> = {};
            allVisibleFormFields.forEach((f: FieldDefinition) => {
              if (f.field_type === "select") {
                initial[f.key] = f.allow_multiple ? [] : "";
              } else {
                initial[f.key] = "";
              }
            });
            setFormData(initial);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFields(false));
  }, [id]);

  const autoSave = async (currentHistory: any[], currentSummary: any, currentFormData = formData) => {
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

    // Sync to backend — include user_id so the draft appears in "Chats en curso" for this user
    try {
      await fetch("/api/initiatives/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftIdRef.current,
          form_data: currentFormData,
          chat_history: currentHistory,
          summary: currentSummary,
          confirmed_fields: confirmedFields,
          unstructured_text: unstructuredText,
          status: "Borrador",
          user_id: profile?.id ?? null,
        }),
      });
    } catch (e) { console.error("Error auto-saving to backend (session backed up locally)", e); }
  };

  // Compute allowed options based on user roles
  const isAdmin = profile?.profile_roles?.some((r: any) => r.role === 'admin');
  const registradorRoles = profile?.profile_roles?.filter((r: any) => r.role === 'registrador' || r.role === 'admin') || [];

  const allowedVps = isAdmin 
    ? dbVps 
    : dbVps.filter(vp => registradorRoles.some((r: any) => r.vp_id === vp.id));
    
  const selectedVp = dbVps.find(vp => vp.name === formData.vicepresidencia);
  
  let allowedDirecciones: any[] = [];
  if (selectedVp) {
    if (isAdmin) {
      allowedDirecciones = dbDirecciones.filter(d => d.vp_id === selectedVp.id);
    } else {
      const rolesForVp = registradorRoles.filter((r: any) => r.vp_id === selectedVp.id);
      if (rolesForVp.length > 0) {
        const vpDirs = dbDirecciones.filter(d => d.vp_id === selectedVp.id);
        const userDirIds = new Set(rolesForVp.flatMap((r: any) => r.direcciones_ids));
        
        if (rolesForVp.some((r: any) => r.direcciones_ids.length === vpDirs.length)) {
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

    let typeKey: 'pdf' | 'docx' | 'txt' | 'image' = 'txt';
    const name = file.name.toLowerCase();
    const mime = file.type;

    if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
    else if (mime.startsWith('image/')) typeKey = 'image';

    const typeConfig = fileTypes[typeKey];
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
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) {
      const errorMsg = 'Formato no soportado. Usa PDF, DOCX, TXT o imagen.';
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

      setFormData(prev => {
        const current = prev.attachments || [];
        if (current.some((f: any) => f.name === file.name)) return prev;
        return {
          ...prev,
          attachments: [...current, {
            name: file.name,
            content: data.content,
            url: data.url,
            size: file.size,
            type: file.type
          }]
        };
      });

      if (context === 'chat' && step === 2 && selectedPath === 'unstructured') {
        setTimeout(() => {
          submitMessage(`He subido un archivo de soporte llamado: ${file.name}. Por favor analízalo.`);
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
    const ctx = (step === 2 && selectedPath === 'unstructured') ? 'chat' : 'support';
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
      let textToAnalyze = unstructuredText;
      const attachments = formData.attachments || [];
      if (attachments.length > 0) {
        const fileContents = attachments
          .map((f: any) => `[Archivo: ${f.name}]\n---\n${f.content || 'Sin contenido'}\n---`)
          .join('\n\n');
        textToAnalyze = `${fileContents}\n\n[Mensaje del usuario]: ${textToAnalyze}`;
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
      
      setFormData(prev => {
        const next = { ...prev };
        Object.entries(data.values || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            next[k] = v as string;
          }
        });
        return next;
      });

      setAiWarnings(data.warnings || {});
      setStep(2);
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

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setStep(2);
    setIsAiTyping(true);

    await autoSave([], null);

    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: [], message: "Hola, quiero registrar una nueva iniciativa.", initialData: formData, aiFields }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const newHist = [{ role: "model" as const, text: data.text, options: data.options }];
        setChatHistory(newHist);
        autoSave(newHist, summary);
        setIsAiTyping(false);
        return; // success
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          // Wait 2 seconds before retrying (lets the server wake up)
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries exhausted
    setChatHistory([{ role: "model", text: "Error al conectar con el asistente. Por favor recarga la página e intenta de nuevo." }]);
    setIsAiTyping(false);
  };

  const submitMessage = async (userText: string) => {
    if (!userText.trim() && !attachedFile) return;

    // Build the actual text to display in chat
    const displayText = userText.trim() || (attachedFile ? `[Adjunto: ${attachedFile.name}]` : '');

    // Build the message sent to the AI (include file content if any)
    let aiMessage = userText.trim();
    if (attachedFileContent && attachedFile) {
      aiMessage = `[El usuario adjuntó el archivo: ${attachedFile.name}]\n---\n${attachedFileContent}\n---\n${aiMessage ? 'Mensaje del usuario: ' + aiMessage : 'Por favor analiza este archivo en el contexto de la iniciativa.'}`;
    }

    const attachment = attachedFile ? { name: attachedFile.name, type: attachedFile.type } : undefined;
    const newHistory = [...chatHistory, { role: "user" as const, text: displayText, attachment }];
    setChatHistory(newHistory);
    setCurrentMessage("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
    removeAttachment();
    setIsAiTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: chatHistory, message: aiMessage || displayText, initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      let text = data.text as string;
      const options = data.options;
      if (text.includes("[INFORMACION_COMPLETA]")) {
        text = text.replace("[INFORMACION_COMPLETA]", "").trim();
        const finalHistory = text ? [...newHistory, { role: "model" as const, text, options }] : newHistory;
        if (text) setChatHistory(finalHistory);
        autoSave(finalHistory, summary);
        // Start 3-second countdown so user can read the last AI message
        countdownHistoryRef.current = finalHistory;
        setCountdownSeconds(3);
      } else {
        const finalHistory = [...newHistory, { role: "model" as const, text, options }];
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
      const fieldsToSummarize = [...fields, ...aiFields].filter(f => !["registrador", "solicitante", "vicepresidencia", "direccion"].includes(f.key.toLowerCase()));
      const res = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: fullHistory, initialData: formData, aiFields: fieldsToSummarize }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
      const mergedFormData = mergeAISummary({ ...formData }, data || {});
      setFormData(mergedFormData);
      autoSave(fullHistory, data, mergedFormData);
    } catch { showToast("Error al generar resumen.", "error"); setStep(2); }
    finally { setIsAiTyping(false); }
  };

  const validateAllFields = () => {
    const errors: string[] = [];
    
    // Check fixed required fields
    if (!formData.vicepresidencia) {
      errors.push("El campo Vicepresidencia es obligatorio.");
    }
    if (!formData.direccion) {
      errors.push("El campo Dirección es obligatorio.");
    }
    
    // Check dynamic required fields (both fixed form fields and AI fields)
    const allVisibleFields = (selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3)) ? [...fields, ...aiFields] : fields;
    allVisibleFields.forEach(field => {
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
    });

    // Check if there are any active warnings shown
    const activeWarnings = Object.keys(aiWarnings).filter(k => 
      allVisibleFields.some(f => f.key === k) && aiWarnings[k]
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
    const { isValid, errors } = validateAllFields();
    if (!isValid) {
      setFormErrors(errors);
      showToast("Por favor completa todos los campos obligatorios antes de continuar.", "error");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormErrors([]);
    
    if (status === "Pendiente de aprobación") {
      if (!disclaimerAccepted) {
        showToast("Debes aceptar la declaración de responsabilidad indicando que tu Director tiene conocimiento antes de enviar a aprobación.", "warning");
        return;
      }
      setShowConsentModal(true);
    } else {
      handleSave(status);
    }
  };

  const handleStartChatWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors } = validateAllFields();
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    handleStartChat(e);
  };

  const handleSave = async (status: "Borrador" | "Pendiente de aprobación") => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/initiatives/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: draftIdRef.current, 
          form_data: { 
            ...formData, 
            _director_declaration_accepted: disclaimerAccepted 
          }, 
          chat_history: chatHistory, 
          summary, 
          status, 
          confirmed_fields: confirmedFields, 
          unstructured_text: unstructuredText 
        }),
      });
      if (res.ok) {
        // Clear the local backup now that it's safely on the server
        try { localStorage.removeItem(localKey); } catch (_) {}
        navigate("/bandeja");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Error al guardar: ${err.error || res.statusText || 'Error desconocido'}`, 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast('Error de red al guardar. El servidor puede estar despertando, por favor intenta de nuevo en unos segundos.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hidden file input for general attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[
          fileTypes.pdf.enabled && '.pdf',
          fileTypes.docx.enabled && '.docx',
          fileTypes.txt.enabled && '.txt',
          fileTypes.image.enabled && '.jpg,.jpeg,.png,.webp'
        ].filter(Boolean).join(',')}
        className="hidden"
        onChange={handleFileAttach}
      />
      {selectedPath !== 'select' && <Stepper current={step} path={selectedPath} />}

      {/* ── Step 1: Formulario inicial ──────────────────────────────────── */}
      {/* ── Step 1: Formulario inicial o Selección de Flujo ────────────────── */}
      {step === 1 && selectedPath === 'select' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto py-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-2xl font-bold text-[#1E293B] mb-2">¿Cómo deseas registrar tu necesidad?</h2>
            <p className="text-sm text-[#64748B]">Elige el método que mejor se adapte a tu situación actual.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300 delay-100">
            {/* Opción A */}
            <button
              onClick={() => {
                setSelectedPath('unstructured');
                setFormData(prev => ({ ...prev, selectedPath: 'unstructured' }));
              }}
              className="group bg-white p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#4F5AF5] hover:shadow-xl hover:shadow-[#4F5AF5]/5 transition-all text-left flex flex-col justify-between min-h-[240px] shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#4F5AF5]/5 to-transparent rounded-bl-full" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] text-[#4F5AF5] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1E293B] group-hover:text-[#4F5AF5] transition-colors mb-2">Yo tengo todo claro</h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                  Redacta tu requerimiento en texto libre. La Inteligencia Artificial interpretará tus palabras para completar el formulario y te alertará si falta algún dato esencial.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#4F5AF5] gap-1 group-hover:gap-2 transition-all">
                Comenzar con texto libre <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Opción B */}
            <button
              onClick={() => {
                setSelectedPath('direct');
                setFormData(prev => ({ ...prev, selectedPath: 'direct' }));
                setAiWarnings({});
              }}
              className="group bg-white p-8 rounded-2xl border border-[#E2E8F0] hover:border-[#4F5AF5] hover:shadow-xl hover:shadow-[#4F5AF5]/5 transition-all text-left flex flex-col justify-between min-h-[240px] shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#EB5F46]/5 to-transparent rounded-bl-full" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFF0ED] to-[#FFE2DD] text-[#EB5F46] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm relative z-10">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1E293B] group-hover:text-[#EB5F46] transition-colors mb-2">Necesito acompañamiento</h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                  Rellena el formulario paso a paso manualmente. Ideal si necesitas ayuda estructurando tu idea desde cero con la guía interactiva del asistente.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#EB5F46] gap-1 group-hover:gap-2 transition-all">
                Rellenar formulario paso a paso <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 1 && selectedPath === 'unstructured' && !isAnalyzing && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9]">
            <button
              onClick={() => setSelectedPath('select')}
              className="flex items-center gap-1 text-[#64748B] hover:text-[#1E293B] text-xs font-semibold mb-3.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a opciones
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#4F5AF5]">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">Describe tu necesidad en texto libre</h2>
                <p className="text-xs text-[#94A3B8]">La IA analizará lo que escribas para rellenar los campos de la iniciativa.</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className={labelCls}>Detalla tu propuesta de requerimiento o idea</label>
              <textarea
                value={unstructuredText}
                onChange={e => setUnstructuredText(e.target.value)}
                placeholder="Ej: Necesitamos una aplicación web para el área de Operaciones que automatice la carga de facturas en PDF, extraiga el total y lo envíe por correo al BP. Esto nos ahorrará 10 horas semanales. Lo requerimos a más tardar el 15 de agosto. La VP de Operaciones ya dio su visto bueno..."
                className="w-full min-h-[220px] border border-[#E2E8F0] bg-white rounded-xl p-4 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors resize-y leading-relaxed"
                disabled={isAnalyzing}
              />
            </div>

            {/* ATTACHMENT STRIP FOR STEP 1 */}
            {useAttachments && Object.values(fileTypes).some(t => t.enabled) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#64748B]">Documentos o archivos de soporte (opcional):</span>
                    {(() => {
                      const parts: string[] = [];
                      if (fileTypes.pdf?.enabled) parts.push(`PDF (máx. ${fileTypes.pdf.maxMb} MB)`);
                      if (fileTypes.docx?.enabled) parts.push(`DOCX (máx. ${fileTypes.docx.maxMb} MB)`);
                      if (fileTypes.txt?.enabled) parts.push(`TXT (máx. ${fileTypes.txt.maxMb} MB)`);
                      if (fileTypes.image?.enabled) parts.push(`Imagen (máx. ${fileTypes.image.maxMb} MB)`);
                      return parts.length > 0 ? (
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">{parts.join(' · ')}</p>
                      ) : null;
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing || isProcessingFile}
                    className="flex items-center gap-1.5 text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-semibold transition-colors shrink-0"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Adjuntar archivo
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.attachments || []).map((file: any, fileIdx: number) => (
                    <div key={fileIdx} className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {file.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" /> : <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />}
                      <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{file.name}</span>
                      <span className="text-[10px] text-[#64748B] shrink-0">{file.size ? (file.size / 1024).toFixed(0) + ' KB' : ''}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold shrink-0">✓ Listo</span>
                      <button onClick={() => removeAttachment(file.name)} className="text-[#94A3B8] hover:text-red-500 transition-colors ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {isProcessingFile && uploadingFile && (
                    <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl px-3 py-2 animate-pulse">
                      {uploadingFile.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-[#64748B] shrink-0" /> : <FileText className="w-4 h-4 text-[#64748B] shrink-0" />}
                      <span className="text-xs font-semibold text-[#64748B] flex-1 truncate">{uploadingFile.name}</span>
                      <span className="text-[10px] text-[#64748B] shrink-0">{uploadingFile.size ? (uploadingFile.size / 1024).toFixed(0) + ' KB' : ''}</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-[#4F5AF5] font-semibold shrink-0">
                        <div className="w-3.5 h-3.5 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                        Cargando...
                      </span>
                    </div>
                  )}
                </div>

                {attachError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{attachError}</span>
                    <button onClick={() => setAttachError(null)} className="ml-auto text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end gap-3">
            <button
              onClick={() => setSelectedPath('select')}
              disabled={isAnalyzing}
              className="py-2.5 px-5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAnalyzeText}
              disabled={isAnalyzing || !unstructuredText.trim() || isProcessingFile}
              className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  La IA está procesando la información ingresada...
                </>
              ) : (
                <>
                  Analizar Propuesta <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 1 && selectedPath === 'unstructured' && isAnalyzing && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0">
            {aiAvatar ? (
              <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover animate-bounce" />
            ) : (
              <Bot className="w-7 h-7 text-[#4F5AF5] animate-bounce" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Analizando Propuesta</h3>
          <p className="text-sm text-[#64748B]">{aiName} está procesando la información ingresada...</p>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1.5 h-6 rounded-full bg-[#4F5AF5]/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )}

      {((step === 1 && selectedPath === 'direct') || (step === 2 && selectedPath === 'unstructured') || (step === 3 && selectedPath === 'direct')) && !isAiTyping && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9] flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#4F5AF5] text-sm">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  {selectedPath === 'unstructured' 
                    ? '2. Revisión con IA' 
                    : step === 3 
                      ? '3. Revisión con IA' 
                      : '1. Formulario inicial'}
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  {selectedPath === 'unstructured' || step === 3
                    ? 'Revisa y completa la información de la iniciativa validada por la IA.' 
                    : 'Completa la información base antes de conversar con la IA.'}
                </p>
              </div>
            </div>
            {!id && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPath('select');
                  setAiWarnings({});
                }}
                className="text-xs font-semibold text-[#4F5AF5] hover:text-[#3F49E0] transition-colors border border-[#E2E8F0] hover:border-[#4F5AF5] px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver a opciones
              </button>
            )}
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
                  {((selectedPath === 'unstructured' && step === 2) || (selectedPath === 'direct' && step === 3)) && (
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
                    <label className={labelCls}>Key user <span className="text-red-500 ml-1">*</span></label>
                    <input type="text" value={formData.registrador || ""} disabled className={inputCls} />
                  </div>
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
                    {aiWarnings.vicepresidencia && (
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
                    {aiWarnings.direccion && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{aiWarnings.direccion}</span>
                      </div>
                    )}
                  </div>

                  {/* Campos Dinámicos */}
                  {((selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3)) ? [...fields, ...aiFields] : fields).map(field => {
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
                              const newForm = { ...p, [field.key]: v };
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
                        {aiWarnings[field.key] && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-start gap-1.5 font-medium leading-relaxed">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{aiWarnings[field.key]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            </div>

            {/* Archivos de soporte (opcional) */}
            {useAttachments && Object.values(fileTypes).some(t => t.enabled) && (
              <div className="px-8 pb-8 pt-6 border-t border-[#F1F5F9] space-y-4 bg-slate-50/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B]">Archivos de soporte cargados</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">Estos archivos de soporte sustentan la propuesta analizada por la IA.</p>
                    {(() => {
                      const parts: string[] = [];
                      if (fileTypes.pdf?.enabled) parts.push(`PDF (máx. ${fileTypes.pdf.maxMb} MB)`);
                      if (fileTypes.docx?.enabled) parts.push(`DOCX (máx. ${fileTypes.docx.maxMb} MB)`);
                      if (fileTypes.txt?.enabled) parts.push(`TXT (máx. ${fileTypes.txt.maxMb} MB)`);
                      if (fileTypes.image?.enabled) parts.push(`Imagen (máx. ${fileTypes.image.maxMb} MB)`);
                      return parts.length > 0 ? (
                        <p className="text-[10px] text-[#94A3B8] mt-1 font-medium">{parts.join(' · ')}</p>
                      ) : null;
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="flex items-center gap-1.5 text-xs text-[#4F5AF5] hover:text-[#3F49E0] font-bold transition-colors border border-[#4F5AF5]/20 hover:border-[#4F5AF5] px-3 py-1.5 rounded-lg bg-[#EEF2FF]/30 shrink-0"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Adjuntar archivo
                  </button>
                </div>

                {/* Drag-and-drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSupport(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSupport(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingSupport(false); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingSupport(false);
                    const files = Array.from(e.dataTransfer.files);
                    for (const file of files) {
                      await processFile(file, 'support');
                    }
                  }}
                  onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                  className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                    ${
                      isDraggingSupport
                        ? 'border-[#4F5AF5] bg-[#EEF2FF] scale-[1.01]'
                        : 'border-[#CBD5E1] bg-white hover:border-[#4F5AF5]/50 hover:bg-[#EEF2FF]/20'
                    }
                    ${isProcessingFile ? 'pointer-events-none opacity-70' : ''}
                  `}
                >
                  {/* Drop overlay text */}
                  {isDraggingSupport && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-[#4F5AF5] flex items-center justify-center shadow-lg shadow-[#4F5AF5]/30 animate-bounce">
                        <Paperclip className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-bold text-[#4F5AF5]">Suelta para adjuntar</p>
                    </div>
                  )}

                  <div className={`p-4 transition-opacity duration-150 ${isDraggingSupport ? 'opacity-0' : 'opacity-100'}`}>
                    {(!formData.attachments || formData.attachments.length === 0) && !uploadingFile ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-[#94A3B8]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#475569]">Arrastra archivos aquí o <span className="text-[#4F5AF5] underline underline-offset-2">haz clic para explorar</span></p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">Puedes subir varios archivos</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(formData.attachments || []).map((file: any, fileIdx: number) => (
                          <div key={fileIdx} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                            {file.type?.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#1E293B] truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-[#64748B]">
                                {file.size ? (file.size / 1024).toFixed(0) + ' KB' : 'Adjunto'}
                              </p>
                            </div>
                            {file.url && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setPreviewFile({ url: file.url || '', name: file.name, type: file.type }); }}
                                className="text-[#4F5AF5] hover:text-[#3F49E0] transition-colors p-1"
                                title="Ver vista previa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeAttachment(file.name); }}
                              className="text-[#94A3B8] hover:text-red-500 transition-colors p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {isProcessingFile && uploadingFile && (
                          <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 shadow-sm animate-pulse">
                            {uploadingFile.type?.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-[#64748B] shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#64748B] truncate" title={uploadingFile.name}>
                                {uploadingFile.name}
                              </p>
                              <p className="text-[10px] text-[#64748B]">
                                {uploadingFile.size ? (uploadingFile.size / 1024).toFixed(0) + ' KB' : 'Adjunto'}
                              </p>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] text-[#4F5AF5] font-semibold shrink-0">
                              <div className="w-3 h-3 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                              Cargando...
                            </span>
                          </div>
                        )}
                        {/* Añadir más */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          disabled={isProcessingFile}
                          className="flex items-center justify-center gap-2 border border-dashed border-[#CBD5E1] hover:border-[#4F5AF5] hover:bg-[#EEF2FF]/30 text-[#94A3B8] hover:text-[#4F5AF5] rounded-xl p-3 text-xs font-semibold transition-all"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> Añadir otro archivo
                        </button>
                      </div>
                    )}
                    {/* Upload spinner when empty */}
                    {isProcessingFile && uploadingFile && (!formData.attachments || formData.attachments.length === 0) && (
                      <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 shadow-sm animate-pulse mt-2">
                        {uploadingFile.type?.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4 text-[#64748B] shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#64748B] truncate">{uploadingFile.name}</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-[10px] text-[#4F5AF5] font-semibold shrink-0">
                          <div className="w-3 h-3 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                          Cargando...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Disclaimer and Checkbox */}
            {(selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3) || step === 3) && (
              <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#FFFBEB]/30">
                <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-100/70">
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#E2E8F0] text-[#4F5AF5] focus:ring-[#4F5AF5] transition-colors cursor-pointer"
                  />
                  <label htmlFor="disclaimer-checkbox" className="text-xs text-amber-900 leading-relaxed select-none cursor-pointer">
                    <span className="font-bold">Declaración de Responsabilidad:</span> Estoy conforme con la información mostrada y soy consciente de la información que estoy registrando y aceptando.
                  </label>
                </div>
              </div>
            )}

            <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex flex-wrap justify-between items-center gap-3">
              {/* Left side actions */}
              <div>
                {(selectedPath === 'unstructured' || step === 3) && chatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowChatModal(true)}
                    className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    title="Ver el historial de chat con la IA"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ver conversación
                  </button>
                )}
              </div>

              {/* Right side actions */}
              <div className="flex flex-wrap gap-3">
                {selectedPath === 'unstructured' || (selectedPath === 'direct' && step === 3) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveWithValidation("Borrador")}
                      disabled={isSaving || isProcessingFile}
                      className="flex items-center justify-center gap-2 border border-[#4F5AF5] text-[#4F5AF5] hover:bg-[#EEF2FF] disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-[#4F5AF5] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar en borrador
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
                      Enviar a aprobación de BP
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={loadingFields || fields.length === 0 || isAnyFileUploading || isProcessingFile}
                    className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
                  >
                    {unstructuredText.trim() !== "" ? "Revisar Resumen" : "Continuar con asistente IA"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Asistente IA ────────────────────────────────────────── */}
      {step === 2 && selectedPath === 'direct' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden flex flex-col" style={{ height: 620 }}>
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
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-blue-100">En línea</span>
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
                    {/* File attachment badge */}
                    {msg.attachment && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                        msg.role === 'user'
                          ? 'bg-blue-400/20 border-blue-300/30 text-blue-100 self-end'
                          : 'bg-slate-100 border-[#E2E8F0] text-[#64748B]'
                      }`}>
                        {msg.attachment.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate max-w-[140px]">{msg.attachment.name}</span>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#4F5AF5] text-white rounded-tr-sm"
                        : "bg-white text-[#1E293B] border border-[#E2E8F0] rounded-tl-sm"
                    }`}>
                      {msg.role === "model" ? (
                        <div className="prose prose-sm prose-slate max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                      <p className={`text-[10px] mt-1.5 font-medium ${msg.role === "user" ? "text-blue-200 text-right" : "text-[#94A3B8]"}`}>
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

                    {/* Opciones sugeridas si es el último mensaje y es de la IA */}
                    {msg.role === "model" && msg.options && msg.options.length > 0 && isLastMsg && !isAiTyping && (
                      <div className="flex flex-wrap gap-2">
                        {msg.options.map((opt, optIndex) => (
                          <button
                            key={optIndex}
                            onClick={() => submitMessage(opt)}
                            className="bg-white hover:bg-[#EEF2FF] border border-[#CBD5E1] hover:border-[#4F5AF5] text-[#4F5AF5] px-4 py-2 rounded-full text-xs font-semibold transition-colors shadow-sm"
                          >
                            {opt}
                          </button>
                        ))}
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
                {attachedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-[#4F5AF5] shrink-0" /> : <FileText className="w-4 h-4 text-[#4F5AF5] shrink-0" />}
                <span className="text-xs font-semibold text-[#4F5AF5] flex-1 truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-[#64748B] shrink-0">{(attachedFile.size / 1024).toFixed(0)} KB</span>
                {isProcessingFile ? (
                  <span className="text-[10px] text-[#94A3B8] shrink-0 animate-pulse">Procesando...</span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-semibold shrink-0">✓ Listo</span>
                )}
                <button onClick={() => removeAttachment()} className="text-[#94A3B8] hover:text-red-500 transition-colors ml-1">
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
                  title={isRecording ? 'Detener grabación y transcribir' : 'Grabar mensaje de voz'}
                  className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200'
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

            {/* Voice hint */}
            <p className="text-[10px] text-[#94A3B8] text-center">
              {(() => {
                const parts: string[] = [];
                if (useMic) parts.push("🎙️ Voz local");
                if (useAttachments) {
                  const enabledTypes: string[] = [];
                  if (fileTypes.pdf.enabled) enabledTypes.push(`PDF (máx. ${fileTypes.pdf.maxMb} MB)`);
                  if (fileTypes.docx.enabled) enabledTypes.push(`DOCX (máx. ${fileTypes.docx.maxMb} MB)`);
                  if (fileTypes.txt.enabled) enabledTypes.push(`TXT (máx. ${fileTypes.txt.maxMb} MB)`);
                  if (fileTypes.image.enabled) enabledTypes.push(`imagen (máx. ${fileTypes.image.maxMb} MB)`);
                  if (enabledTypes.length > 0) parts.push(`📎 ${enabledTypes.join(", ")}`);
                }
                return parts.join("  ·  ");
              })()}
            </p>
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
              {chatHistory.length === 0 ? (
                <div className="text-center py-10 text-[#94A3B8]">
                  No hay mensajes registrados en esta conversación.
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

      {/* Custom Consent Dialog Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Declaración de Responsabilidad</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Por la presente declaras que toda la información y documentación cargada para este requerimiento está bajo tu responsabilidad, conformidad y consentimiento. ¿Confirmas el envío a aprobación de BP?
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
