import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Bot, ChevronRight, Pencil, Save, Send, RotateCcw, ThumbsUp, ThumbsDown, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import STTWorker from '../workers/stt.worker?worker';
import { FieldDefinition } from "@/src/types";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import ReactMarkdown from "react-markdown";

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]";
const labelCls = "block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5";

// ─── Dynamic field ────────────────────────────────────────────────────────────
function DynamicField({ field, value, onChange, parentValue, disabled, optionsOverride }: {
  field: FieldDefinition; value: string; onChange: (v: string) => void; parentValue?: string;
  disabled?: boolean;
  optionsOverride?: string[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse current value if it is a JSON file representation
  let fileObj: { name: string; content?: string } | null = null;
  if (value && value.startsWith('{"name":')) {
    try {
      fileObj = JSON.parse(value);
    } catch (e) {
      // Not a valid JSON, fallback to null
    }
  }

  if (field.field_type === "date")
    return <input type="date" value={value} onChange={e => onChange(e.target.value)} required={field.is_required} disabled={disabled} className={inputCls} />;
  
  if (field.field_type === "select") {
    let options = optionsOverride || field.options;
    if (!optionsOverride) {
      if (field.depends_on && field.options_map && parentValue) {
        options = field.options_map[parentValue] || [];
      } else if (field.depends_on) {
        options = []; // Hide options if parent is not selected
      }
    }
    return (
      <select value={value} onChange={e => onChange(e.target.value)} required={field.is_required} className={inputCls} disabled={disabled || (!optionsOverride && field.depends_on ? !parentValue : false)}>
        <option value="" disabled>Selecciona...</option>
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
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Store the stringified JSON
        onChange(JSON.stringify({ name: file.originalname || file.name, content: data.content }));
      } catch (err: any) {
        setError('Error: ' + err.message);
      } finally {
        setIsUploading(false);
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

        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return <input type="text" value={value} onChange={e => onChange(e.target.value)} required={field.is_required} disabled={disabled} placeholder={`Ingresa ${field.label.toLowerCase()}...`} className={inputCls} />;
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

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
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
            {i < STEPS.length - 1 && (
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
  const { profile } = useAuth();
  const [step, setStep] = useState(1);

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [aiFields, setAiFields] = useState<FieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const [dbVps, setDbVps] = useState<any[]>([]);
  const [dbDirecciones, setDbDirecciones] = useState<any[]>([]);

  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string; options?: string[]; attachment?: { name: string; type: string } }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ratedMessages, setRatedMessages] = useState<Record<number, 'positive' | 'negative'>>({});

  // ── Voice input (MediaRecorder + local Whisper WASM) ──────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [useMic, setUseMic] = useState(true);
  const [useAttachments, setUseAttachments] = useState(true);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/fields").then(r => r.json()),
      supabase.from('vps').select('id, name'),
      supabase.from('direcciones').select('id, name, vp_id'),
      id ? supabase.from('initiatives').select('*').eq('id', id).single() : Promise.resolve({ data: null }),
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
      .then(([data, vpsRes, dirRes, draftRes, features]) => {
        if (vpsRes.data) setDbVps(vpsRes.data);
        if (dirRes.data) setDbDirecciones(dirRes.data);
        setUseMic(features.useMic !== false);
        setUseAttachments(features.useAttachments !== false);
        if (features.fileTypes) {
          setFileTypes(features.fileTypes);
        }
        
        const visibleFormFields = data.filter((f: FieldDefinition) => f.is_visible && (f.section || 'form') === 'form');
        const visibleAiFields = data.filter((f: FieldDefinition) => f.is_visible && f.section === 'ai');
        setFields(visibleFormFields);
        setAiFields(visibleAiFields);
        
        const draft = draftRes?.data;
        if (draft) {
          setFormData(draft.form_data || {});
          setChatHistory(draft.chat_history || []);
          setSummary(draft.summary || null);
          if (draft.summary) setStep(3);
          else if (draft.chat_history && draft.chat_history.length > 0) setStep(2);
          else setStep(1);
        } else {
          const initial: Record<string, string> = {};
          visibleFormFields.forEach((f: FieldDefinition) => {
            initial[f.key] = f.field_type === "select" && f.options.length > 0 ? f.options[0] : "";
          });
          setFormData(initial);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFields(false));
  }, [id]);

  const autoSave = async (currentHistory: any[], currentSummary: any) => {
    try {
      await fetch("/api/initiatives/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftIdRef.current,
          form_data: formData,
          chat_history: currentHistory,
          summary: currentSummary,
          status: "Borrador"
        }),
      });
    } catch (e) { console.error("Error auto-saving", e); }
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

  // ── File attachment handler ───────────────────────────────────────────────
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachError(null);

    let typeKey: 'pdf' | 'docx' | 'txt' | 'image' = 'txt';
    const name = file.name.toLowerCase();
    const mime = file.type;
    
    if (mime === 'application/pdf' || name.endsWith('.pdf')) typeKey = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) typeKey = 'docx';
    else if (mime.startsWith('image/')) typeKey = 'image';
    
    const typeConfig = fileTypes[typeKey];
    if (!typeConfig.enabled) {
      setAttachError(`La subida de archivos de tipo ${typeKey.toUpperCase()} está deshabilitada.`);
      return;
    }

    const limitMb = typeConfig.maxMb;
    const limitBytes = limitMb * 1024 * 1024;

    if (file.size > limitBytes) {
      setAttachError(`El archivo supera el límite de ${limitMb} MB.`);
      return;
    }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) {
      setAttachError('Formato no soportado. Usa PDF, DOCX, TXT o imagen.');
      return;
    }
    setAttachedFile(file);
    setIsProcessingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAttachedFileContent(data.content);
    } catch (err: any) {
      setAttachError('Error al procesar el archivo: ' + (err.message || 'desconocido'));
      setAttachedFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachedFileContent(null);
    setAttachError(null);
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    setIsAiTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [], message: "Hola, quiero registrar una nueva iniciativa.", initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newHist = [{ role: "model" as const, text: data.text, options: data.options }];
      setChatHistory(newHist);
      autoSave(newHist, summary);
    } catch { setChatHistory([{ role: "model", text: "Error al conectar con el asistente. Intenta de nuevo." }]); }
    finally { setIsAiTyping(false); }
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
    removeAttachment();
    setIsAiTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory, message: aiMessage || displayText, initialData: formData, aiFields }),
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
        await generateSummary(finalHistory);
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
      const res = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: fullHistory, initialData: formData, aiFields }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data);
      autoSave(chatHistory, data);
    } catch { alert("Error al generar resumen."); setStep(2); }
    finally { setIsAiTyping(false); }
  };

  const handleSave = async (status: "Borrador" | "Pendiente de aprobación") => {
    try {
      const res = await fetch("/api/initiatives/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftIdRef.current, form_data: formData, chat_history: chatHistory, summary, status }),
      });
      if (res.ok) navigate("/bandeja");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Stepper current={step} />

      {/* ── Step 1: Formulario inicial ──────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#4F5AF5] text-sm">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">1. Formulario inicial</h2>
                <p className="text-xs text-[#94A3B8]">Completa la información base antes de conversar con la IA.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleStartChat}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Campos Fijos Obligatorios */}
                  <div>
                    <label className={labelCls}>Registrador <span className="text-red-500 ml-1">*</span></label>
                    <input type="text" value={formData.registrador || ""} disabled className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Vicepresidencia <span className="text-red-500 ml-1">*</span></label>
                    <select value={formData.vicepresidencia || ""} onChange={e => setFormData({ ...formData, vicepresidencia: e.target.value, direccion: "" })} disabled={vpOptions.length <= 1} className={inputCls} required>
                      <option value="" disabled>Selecciona...</option>
                      {vpOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Dirección <span className="text-red-500 ml-1">*</span></label>
                    <select value={formData.direccion || ""} onChange={e => setFormData({ ...formData, direccion: e.target.value })} disabled={dirOptions.length <= 1 || !formData.vicepresidencia} className={inputCls} required>
                      <option value="" disabled>Selecciona...</option>
                      {dirOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Campos Dinámicos */}
                  {fields.map(field => {
                    // Omitir si existen en la configuración para evitar duplicados
                    if (["registrador", "solicitante", "vicepresidencia", "direccion"].includes(field.key.toLowerCase())) return null;

                    return (
                      <div key={field.key}>
                        <label className={labelCls}>
                          {field.label}
                          {field.is_required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <DynamicField 
                          field={field} 
                          value={formData[field.key] ?? ""} 
                          parentValue={field.depends_on ? formData[field.depends_on] : undefined}
                          onChange={v => {
                            setFormData(p => {
                              const newForm = { ...p, [field.key]: v };
                              // Reset any child fields that depend on this one
                              fields.filter(f => f.depends_on === field.key).forEach(child => {
                                newForm[child.key] = "";
                              });
                              return newForm;
                            });
                          }} 
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                type="submit"
                disabled={loadingFields || fields.length === 0}
                className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
              >
                Continuar con asistente IA
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Asistente IA ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden flex flex-col" style={{ height: 620 }}>
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center gap-3 bg-[#4F5AF5]">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">2. Asistente IA</p>
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
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#E2E8F0] shadow-sm mt-1">
                      <Bot className="w-4 h-4 text-[#4F5AF5]" />
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
                        {msg.role === "user" ? "Tú" : "IA Analista"}
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
                <button onClick={removeAttachment} className="text-[#94A3B8] hover:text-red-500 transition-colors ml-1">
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

            {/* Input row */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">

              {/* Hidden file input */}
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

              {/* Text input */}
              <input
                value={currentMessage}
                onChange={e => setCurrentMessage(e.target.value)}
                disabled={isAiTyping || isRecording || isTranscribing}
                placeholder={
                  isRecording ? '🎙️ Grabando — haz clic en ■ para transcribir...'
                  : isTranscribing ? 'Transcribiendo...'
                  : 'Escribe tu respuesta...'
                }
                className={`flex-1 border rounded-xl px-4 py-2.5 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:border-[#4F5AF5] transition-colors ${
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
          <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center">
            <Bot className="w-7 h-7 text-[#4F5AF5] animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Generando Resumen del Requerimiento</h3>
          <p className="text-sm text-[#64748B]">La IA está estructurando toda la información recopilada...</p>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-6 rounded-full bg-[#4F5AF5]/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Resumen del requerimiento ──────────────────────────── */}
      {step === 3 && !isAiTyping && summary && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,.07)] overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">3. Resumen del requerimiento</h2>
                <p className="text-xs text-[#94A3B8]">Revisa y confirma antes de enviarlo a revisión BP.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Listo para enviar al BP
            </span>
          </div>

          {/* Summary fields */}
          <div className="px-8 py-4">
            {aiFields.length > 0 ? (
              aiFields.map(f => {
                const val = summary[f.key];
                const displayVal = Array.isArray(val) ? (
                  <ul className="space-y-1 mt-1">
                    {val.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#4F5AF5] mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : val;

                return <SummaryRow key={f.key} icon="🔸" label={f.label} value={displayVal ?? <span className="text-slate-400">—</span>} />;
              })
            ) : (
              <>
                <SummaryRow icon="📌" label="Título" value={<strong>{summary.titulo}</strong>} />
                <SummaryRow icon="🎯" label="Objetivo" value={summary.objetivo} />
              </>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap gap-3 pt-4 mt-2 border-t border-[#F1F5F9]">
              {[
                { label: "Complejidad", value: summary.complejidad, color: summary.complejidad === "Alta" ? "bg-red-50 text-red-700 border border-red-100" : summary.complejidad === "Media" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100" },
                { label: "Riesgo", value: summary.riesgo, color: summary.riesgo === "Alto" ? "bg-red-50 text-red-700 border border-red-100" : summary.riesgo === "Medio" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100" },
                { label: "Prioridad", value: summary.prioridadRecomendada, color: "bg-[#EEF2FF] text-[#4F5AF5] border border-[#C7D2FE]" },
              ].map(b => (
                <span key={b.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${b.color}`}>
                  <span className="text-xs font-normal opacity-60">{b.label}:</span>
                  {b.value}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex flex-wrap gap-3 justify-between items-center">
            <button
              onClick={() => { setStep(2); setSummary(null); }}
              className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar respuestas
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => generateSummary(chatHistory)}
                className="flex items-center gap-2 border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerar
              </button>
              <button
                onClick={() => handleSave("Borrador")}
                className="flex items-center gap-2 border border-[#4F5AF5] text-[#4F5AF5] hover:bg-[#EEF2FF] px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar borrador
              </button>
              <button
                onClick={() => handleSave("Pendiente de aprobación")}
                className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#4F5AF5]/20"
              >
                <Send className="w-4 h-4" />
                Enviar a revisión BP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
