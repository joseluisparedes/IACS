import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrainCircuit, User, BookOpen, MessageSquare, ShieldAlert,
  ThumbsUp, Bot, Send, RefreshCw, Plus, Trash2, GripVertical,
  ToggleLeft, ToggleRight, Upload, FileText, CheckCircle, X,
  ChevronDown, ChevronUp, Pencil, Save, AlertCircle, Loader2,
  Mic, MicOff, Paperclip, Image as ImageIcon
} from 'lucide-react';
import STTWorker from '../workers/stt.worker?worker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingEntry {
  id: string;
  layer: 'identity' | 'context' | 'examples' | 'guardrails' | 'settings';
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  source: string;
  created_at: string;
}

interface FeedbackEntry {
  id: string;
  initiative_id: string;
  message_index: number;
  user_message: string;
  agent_response: string;
  rating: 'positive' | 'negative';
  admin_approved: boolean;
  created_at: string;
}

interface ChatMsg {
  role: 'user' | 'model';
  text: string;
  options?: string[];
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'identity',      label: 'Identidad',        icon: User },
  { id: 'context',       label: 'Contexto',          icon: BookOpen },
  { id: 'examples',      label: 'Ejemplos',          icon: MessageSquare },
  { id: 'guardrails',    label: 'Guardarraíles',     icon: ShieldAlert },
  { id: 'settings',      label: 'Funciones',         icon: ToggleLeft },
  { id: 'feedback',      label: 'Retroalimentación', icon: ThumbsUp },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    manual:   { label: 'Manual',    cls: 'bg-slate-100 text-slate-600' },
    document: { label: '📄 Doc',    cls: 'bg-blue-100 text-blue-700' },
    feedback: { label: '💬 Feedback', cls: 'bg-purple-100 text-purple-700' },
  };
  const b = map[source] ?? map.manual;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>;
}

// ─── Sortable item for guardrails ────────────────────────────────────────────
function SortableGuardrail({ entry, onToggle, onDelete, onEdit }: {
  entry: TrainingEntry;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: TrainingEntry) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-3 p-4 rounded-xl border bg-white shadow-sm transition-opacity ${entry.is_active ? '' : 'opacity-50'}`}>
      <button {...attributes} {...listeners} className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <p className="flex-1 text-sm text-[#1E293B]">{entry.content}</p>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4F5AF5]"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onToggle(entry.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600">
          {entry.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AITraining() {
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const useMicSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_mic');
  const useAttachmentsSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_attachments');
  const useMic = useMicSetting ? useMicSetting.content !== 'false' : true;
  const useAttachments = useAttachmentsSetting ? useAttachmentsSetting.content !== 'false' : true;

  const enablePdfSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_pdf');
  const enableDocxSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_docx');
  const enableTxtSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_txt');
  const enableImageSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_image');

  const limitPdfSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_pdf');
  const limitDocxSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_docx');
  const limitTxtSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_txt');
  const limitImageSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_image');

  const fileTypes = {
    pdf: {
      enabled: enablePdfSetting ? enablePdfSetting.content !== 'false' : true,
      maxMb: limitPdfSetting ? parseFloat(limitPdfSetting.content) : 1.0,
    },
    docx: {
      enabled: enableDocxSetting ? enableDocxSetting.content !== 'false' : true,
      maxMb: limitDocxSetting ? parseFloat(limitDocxSetting.content) : 1.0,
    },
    txt: {
      enabled: enableTxtSetting ? enableTxtSetting.content !== 'false' : true,
      maxMb: limitTxtSetting ? parseFloat(limitTxtSetting.content) : 1.0,
    },
    image: {
      enabled: enableImageSetting ? enableImageSetting.content !== 'false' : true,
      maxMb: limitImageSetting ? parseFloat(limitImageSetting.content) : 1.0,
    },
  };

  const hasAnyAttachmentEnabled = useAttachments && Object.values(fileTypes).some(t => t.enabled);

  // Preview chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Voice (MediaRecorder + local Whisper) ─────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sttWorkerRef = useRef<Worker | null>(null);
  const transcribeResolveRef = useRef<((t: string) => void) | null>(null);
  const transcribeRejectRef = useRef<((e: Error) => void) | null>(null);

  // ── File attachment ───────────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init STT worker
  useEffect(() => {
    const worker = new STTWorker();
    sttWorkerRef.current = worker;
    worker.onmessage = (e: MessageEvent) => {
      const { type, text, error, progress } = e.data;
      if (type === 'loading') setModelLoadProgress(progress ?? 0);
      else if (type === 'ready') setModelLoadProgress(null);
      else if (type === 'result') { setModelLoadProgress(null); transcribeResolveRef.current?.(text ?? ''); }
      else if (type === 'error') { setModelLoadProgress(null); transcribeRejectRef.current?.(new Error(error)); }
    };
    worker.onerror = (err) => {
      console.error("STT Worker error:", err);
      setVoiceError("Error en el Web Worker de transcripción: " + (err.message || 'desconocido'));
      setIsTranscribing(false);
      setModelLoadProgress(null);
      transcribeRejectRef.current?.(new Error(err.message || 'Error en el worker'));
    };
    worker.postMessage({ type: 'load' });
    return () => worker.terminate();
  }, []);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const loadAll = async () => {
    setLoading(true);
    const [trainRes, fbRes] = await Promise.all([
      fetch('/api/ai-training').then(r => r.json()),
      fetch('/api/ai-feedback').then(r => r.json()),
    ]);
    setEntries(Array.isArray(trainRes) ? trainRes : []);
    setFeedback(Array.isArray(fbRes) ? fbRes : []);
    setLoading(false);
  };

  const showSave = (msg = 'Guardado ✓') => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const createEntry = async (payload: Partial<TrainingEntry>) => {
    setSaving(true);
    const res = await fetch('/api/ai-training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setEntries(prev => [...prev, data]);
    showSave();
    setSaving(false);
    return data;
  };

  const updateEntry = async (id: string, payload: Partial<TrainingEntry>) => {
    setSaving(true);
    const res = await fetch(`/api/ai-training/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setEntries(prev => prev.map(e => e.id === id ? data : e));
    showSave();
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/ai-training/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
    showSave('Eliminado');
  };

  const toggleEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) updateEntry(id, { is_active: !entry.is_active });
  };

  // ── Send preview chat (with optional file context) ────────────────────────
  const sendPreview = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    const updated: ChatMsg[] = [...chatMsgs, { role: 'user', text: msg }];
    setChatMsgs(updated);
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai-training/preview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: updated, message: msg }),
      });
      const data = await res.json();
      setChatMsgs(prev => [...prev, { role: 'model', text: data.text, options: data.options }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: 'model', text: 'Error al conectar con el agente.' }]);
    }
    setChatLoading(false);
  };

  const resetChat = () => setChatMsgs([]);

  // ── Voice handlers ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setVoiceError(null); setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) return;
        setIsTranscribing(true);
        try {
          const ab = await blob.arrayBuffer();
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          const decoded = await audioCtx.decodeAudioData(ab);
          await audioCtx.close();
          const float32 = decoded.getChannelData(0);
          const text = await new Promise<string>((resolve, reject) => {
            transcribeResolveRef.current = resolve; transcribeRejectRef.current = reject;
            sttWorkerRef.current!.postMessage({ type: 'transcribe', audio: float32 }, [float32.buffer]);
          });
          if (text.trim()) setChatInput(prev => prev ? prev + ' ' + text.trim() : text.trim());
        } catch (err: any) { setVoiceError('Error al transcribir: ' + err.message); }
        finally { setIsTranscribing(false); }
      };
      recorder.start(250); setIsRecording(true);
      recordingTimerRef.current = setInterval(() => { setRecordingSeconds(s => { if (s >= 59) { stopRecording(); return 0; } return s + 1; }); }, 1000);
    } catch (err: any) {
      setVoiceError(err.name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : 'No se pudo acceder al micrófono.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecordingSeconds(0); setIsRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
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

    if (file.size > limitBytes) { setAttachError(`El archivo supera el límite de ${limitMb} MB.`); return; }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|jpg|jpeg|png|webp)$/i)) { setAttachError('Formato no soportado.'); return; }
    setAttachedFile(file); setIsProcessingFile(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/chat/attach-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAttachedFileContent(data.content);
    } catch (err: any) { setAttachError('Error: ' + err.message); setAttachedFile(null); }
    finally { setIsProcessingFile(false); }
  };

  const removeAttachment = () => { setAttachedFile(null); setAttachedFileContent(null); setAttachError(null); };

  // ── Filtered entries by layer ─────────────────────────────────────────────
  const byLayer = (layer: TrainingEntry['layer']) => entries.filter(e => e.layer === layer).sort((a, b) => a.sort_order - b.sort_order);

  const pendingFeedback = feedback.filter(f => !f.admin_approved);

  return (
    <div className="flex gap-6 h-full min-h-[calc(100vh-8rem)]">
      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1E293B]">Entrenamiento del Agente IA</h1>
                <p className="text-xs text-[#64748B] mt-0.5">Configura el comportamiento, contexto y ejemplos del asistente de iniciativas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 text-[#4F5AF5] animate-spin" />}
              {saveMsg && <span className="text-xs text-emerald-600 font-semibold">{saveMsg}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-[#E2E8F0]">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const count = tab.id === 'feedback' ? pendingFeedback.length : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                    active ? 'border-[#4F5AF5] text-[#4F5AF5]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4F5AF5] border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'identity' && (
              <IdentityTab entries={byLayer('identity')} onCreate={createEntry} onUpdate={updateEntry} />
            )}
            {activeTab === 'context' && (
              <ContextTab entries={byLayer('context')} onCreate={createEntry} onUpdate={updateEntry} onDelete={deleteEntry} onToggle={toggleEntry} />
            )}
            {activeTab === 'examples' && (
              <ExamplesTab entries={byLayer('examples')} onCreate={createEntry} onUpdate={updateEntry} onDelete={deleteEntry} onToggle={toggleEntry} />
            )}
            {activeTab === 'guardrails' && (
              <GuardrailsTab entries={byLayer('guardrails')} onCreate={createEntry} onUpdate={updateEntry} onDelete={deleteEntry} onToggle={toggleEntry} setEntries={setEntries} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab entries={entries} onCreate={createEntry} onUpdate={updateEntry} />
            )}
            {activeTab === 'feedback' && (
              <FeedbackTab feedback={pendingFeedback} onApprove={async (fb, idealResponse) => {
                await fetch(`/api/ai-feedback/${fb.id}/approve`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ideal_response: idealResponse }),
                });
                await loadAll();
                showSave('Aprobado como ejemplo de entrenamiento ✓');
              }} onDiscard={async (id) => {
                await fetch(`/api/ai-feedback/${id}`, { method: 'DELETE' });
                setFeedback(prev => prev.filter(f => f.id !== id));
              }} />
            )}
          </>
        )}
      </div>

      {/* ── Preview Chat ─────────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-gradient-to-r from-violet-600 to-[#4F5AF5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">Chat de Prueba</span>
          </div>
          <button onClick={resetChat} title="Reiniciar chat" className="text-white/70 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-3 py-2 bg-violet-50 border-b border-[#E2E8F0]">
          <p className="text-[10px] text-violet-700 font-semibold">Usa la configuración activa guardada</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F8FAFC]">
          {chatMsgs.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Bot className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Escribe algo para probar el agente con la configuración actual</p>
            </div>
          )}
          {chatMsgs.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'model' ? 'bg-white border border-[#E2E8F0]' : 'bg-[#4F5AF5]'}`}>
                {msg.role === 'model' ? <Bot className="w-3 h-3 text-[#4F5AF5]" /> : <span className="text-white text-[8px] font-bold">TU</span>}
              </div>
              <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[calc(100%-2.5rem)] shadow-sm ${
                msg.role === 'user' ? 'bg-[#4F5AF5] text-white rounded-tr-sm' : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-[#4F5AF5]" />
              </div>
              <div className="bg-white border border-[#E2E8F0] px-3 py-2 rounded-xl rounded-tl-sm flex gap-1">
                {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-[#E2E8F0] bg-white space-y-2">
          {/* File preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-2.5 py-1.5">
              {attachedFile.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-[#4F5AF5] shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#4F5AF5] shrink-0" />}
              <span className="text-[10px] font-semibold text-[#4F5AF5] flex-1 truncate">{attachedFile.name}</span>
              {isProcessingFile ? <span className="text-[10px] text-[#94A3B8] animate-pulse">...</span> : <span className="text-[10px] text-emerald-600">✓</span>}
              <button onClick={removeAttachment} className="text-[#94A3B8] hover:text-red-500"><X className="w-3 h-3" /></button>
            </div>
          )}
          {/* Recording */}
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-red-600">Grabando</span>
              <span className="text-[10px] text-red-500 font-mono">0:{String(recordingSeconds).padStart(2, '0')}</span>
              <button onClick={stopRecording} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
            </div>
          )}
          {/* Transcribing / loading */}
          {(isTranscribing || modelLoadProgress !== null) && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5">
              <Loader2 className="w-3 h-3 text-violet-500 animate-spin shrink-0" />
              {modelLoadProgress !== null
                ? <><span className="text-[10px] font-semibold text-violet-600">Cargando Whisper... {modelLoadProgress}%</span><div className="flex-1 bg-violet-200 rounded-full h-1"><div className="h-full bg-violet-500" style={{ width: `${modelLoadProgress}%` }} /></div></>
                : <span className="text-[10px] font-semibold text-violet-600">Transcribiendo...</span>
              }
            </div>
          )}
          {/* Errors */}
          {(voiceError || attachError) && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
              <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              <span className="text-[10px] text-red-600 flex-1">{voiceError || attachError}</span>
              <button onClick={() => { setVoiceError(null); setAttachError(null); }} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
            </div>
          )}
          {/* Input row */}
          <form onSubmit={e => { e.preventDefault(); sendPreview(); }} className="flex items-center gap-1.5">
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
            {/* Attach */}
            {hasAnyAttachmentEnabled && (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={chatLoading || isProcessingFile}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${attachedFile ? 'border-[#4F5AF5] bg-[#EEF2FF] text-[#4F5AF5]' : 'border-[#E2E8F0] text-[#94A3B8] hover:text-[#4F5AF5] hover:bg-[#F8FAFC]'}`}>
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Text */}
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={isRecording ? '🎙️ Grabando...' : isTranscribing ? 'Transcribiendo...' : 'Escribe un mensaje...'}
              disabled={chatLoading || isRecording || isTranscribing}
              className={`flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:border-[#4F5AF5] transition-colors ${
                isRecording ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : isTranscribing ? 'border-violet-300 bg-violet-50 focus:ring-violet-200'
                : 'border-[#E2E8F0] text-[#1E293B] placeholder-[#94A3B8] focus:ring-[#4F5AF5]'
              }`}
            />
            {/* Mic */}
            {useMic && (
              <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={chatLoading || isTranscribing}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  isRecording ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200'
                  : isTranscribing ? 'bg-violet-100 text-violet-500 border border-violet-200'
                  : 'border border-[#E2E8F0] text-[#94A3B8] hover:text-[#4F5AF5] hover:bg-[#F8FAFC]'
                }`}>
                {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isRecording && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400 opacity-25" />}
              </button>
            )}
            {/* Send */}
            <button type="submit" disabled={(!chatInput.trim() && !attachedFile) || chatLoading || isProcessingFile || isRecording || isTranscribing}
              className="w-8 h-8 rounded-lg bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] flex items-center justify-center text-white shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[9px] text-[#94A3B8] text-center">
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
    </div>
  );
}

// ─── Tab: Identidad ────────────────────────────────────────────────────────────
function IdentityTab({ entries, onCreate, onUpdate }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
}) {
  const entry = entries[0];
  const DEFAULT = 'Eres un Analista de Negocio Senior de TI. Tu tarea es ayudar a los colaboradores a aterrizar y estructurar sus iniciativas o requerimientos de negocio mediante una conversación fluida y profesional. Tu tono es cercano pero formal. Haz preguntas concretas, de una en una, para recopilar toda la información necesaria. No termines la conversación hasta tener respuestas claras para todos los campos requeridos.';
  const [text, setText] = useState(entry?.content ?? DEFAULT);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (entry) setText(entry.content);
  }, [entry]);

  const save = async () => {
    if (entry) {
      onUpdate(entry.id, { content: text });
    } else {
      await onCreate({ layer: 'identity', title: 'Identidad del Agente', content: text, is_active: true, sort_order: 0 });
    }
    setSaved(true);
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-[#1E293B]">Identidad y Personalidad</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Define quién es el agente: su nombre, rol, tono y restricciones de comportamiento base.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94A3B8]">{wordCount} palabras</span>
          <button
            onClick={() => { setText(DEFAULT); setSaved(false); }}
            className="text-xs text-[#64748B] hover:text-[#1E293B] border border-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            Restaurar por defecto
          </button>
          <button
            onClick={save}
            disabled={saved}
            className="flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        rows={12}
        className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] resize-none font-mono leading-relaxed"
        placeholder="Describe la identidad del agente..."
      />
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">Este texto se inyecta al inicio de cada conversación con Gemini. Sé específico con el tono y las restricciones para mejores resultados.</p>
      </div>
    </div>
  );
}

// ─── Tab: Contexto ────────────────────────────────────────────────────────────
function ContextTab({ entries, onCreate, onUpdate, onDelete, onToggle }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TrainingEntry | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<{ title: string; content: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const openNew = () => { setForm({ title: '', content: '' }); setEditing(null); setShowForm(true); };
  const openEdit = (e: TrainingEntry) => { setForm({ title: e.title, content: e.content }); setEditing(e); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing) {
      onUpdate(editing.id, { title: form.title, content: form.content });
    } else {
      await onCreate({ layer: 'context', ...form, is_active: true, sort_order: entries.length });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/ai-training/upload-document', { method: 'POST', body: fd });
      const data = await res.json();
      setExtracted(data.chunks || []);
      setShowUpload(true);
    } catch {
      alert('Error al procesar el documento');
    }
    setUploading(false);
    e.target.value = '';
  };

  const approveChunk = async (chunk: { title: string; content: string }) => {
    await onCreate({ layer: 'context', ...chunk, is_active: true, sort_order: entries.length, source: 'document' });
    setExtracted(prev => prev.filter(c => c.title !== chunk.title));
  };

  return (
    <div className="space-y-4">
      {/* Upload doc modal */}
      {showUpload && extracted.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-bold text-[#1E293B]">Fichas extraídas del documento</h3>
              <button onClick={() => setShowUpload(false)} className="text-[#94A3B8] hover:text-[#1E293B]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {extracted.map((chunk, i) => (
                <div key={i} className="border border-[#E2E8F0] rounded-xl p-4 flex gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1E293B] mb-1">{chunk.title}</p>
                    <p className="text-xs text-[#64748B] line-clamp-3">{chunk.content}</p>
                  </div>
                  <button onClick={() => approveChunk(chunk)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold shrink-0">
                    <CheckCircle className="w-4 h-4" /> Agregar
                  </button>
                </div>
              ))}
              {extracted.length === 0 && <p className="text-center text-sm text-[#94A3B8] py-8">Todas las fichas han sido procesadas.</p>}
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end">
              <button onClick={() => setShowUpload(false)} className="bg-[#4F5AF5] text-white px-4 py-2 rounded-lg text-sm font-semibold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-[#1E293B]">Contexto del Negocio</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Fichas de conocimiento que el agente usa como referencia en cada conversación.</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir Documento
            </button>
            <button onClick={openNew} className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Nueva Ficha
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-4 border border-[#4F5AF5]/30 bg-[#EEF2FF] rounded-xl p-4 space-y-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título de la ficha (ej: Glosario de VPs)" className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]" />
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="Contenido del conocimiento..." className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="border border-[#E2E8F0] bg-white px-3 py-1.5 rounded-lg text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={save} className="bg-[#4F5AF5] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#3F49E0]">Guardar Ficha</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {entries.length === 0 && !showForm && (
            <div className="text-center py-12 text-[#94A3B8]">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No hay fichas de contexto. Crea una o sube un documento.</p>
            </div>
          )}
          {entries.map(e => (
            <ContextCard key={e.id} entry={e} onEdit={() => openEdit(e)} onToggle={() => onToggle(e.id)} onDelete={() => onDelete(e.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContextCard({ entry, onEdit, onToggle, onDelete }: { entry: TrainingEntry; onEdit: () => void; onToggle: () => void; onDelete: () => void; }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-opacity ${entry.is_active ? 'border-[#E2E8F0] bg-white' : 'border-dashed border-[#E2E8F0] bg-slate-50 opacity-60'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-sm font-semibold text-[#1E293B] truncate">{entry.title}</p>
          <Badge source={entry.source} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(p => !p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4F5AF5]"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600">
            {entry.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {expanded && <div className="px-4 pb-4 text-sm text-[#64748B] border-t border-[#F1F5F9] pt-3 whitespace-pre-wrap leading-relaxed">{entry.content}</div>}
    </div>
  );
}

// ─── Tab: Ejemplos ─────────────────────────────────────────────────────────────
function ExamplesTab({ entries, onCreate, onUpdate, onDelete, onToggle }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TrainingEntry | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const openNew = () => { setForm({ title: '', content: '' }); setEditing(null); setShowForm(true); };
  const openEdit = (e: TrainingEntry) => { setForm({ title: e.title, content: e.content }); setEditing(e); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing) {
      onUpdate(editing.id, { title: form.title, content: form.content });
    } else {
      await onCreate({ layer: 'examples', ...form, is_active: true, sort_order: entries.length });
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1E293B]">Ejemplos de Conversación (Few-shot)</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Pares de "el usuario dice → el agente responde" que sirven de guía al modelo.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-3 py-1.5 rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> Nuevo Ejemplo
        </button>
      </div>

      {showForm && (
        <div className="border border-[#4F5AF5]/30 bg-[#EEF2FF] rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">El usuario dice...</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Quiero automatizar los reportes de ventas" className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">El agente debería responder...</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="Ej: Entendido. ¿Con qué frecuencia se generan esos reportes y quién los consume actualmente?" className="w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="border border-[#E2E8F0] bg-white px-3 py-1.5 rounded-lg text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
            <button onClick={save} className="bg-[#4F5AF5] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#3F49E0]">Guardar Ejemplo</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 && !showForm && (
          <div className="text-center py-12 text-[#94A3B8]">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No hay ejemplos. Agrega pares de conversación ideal.</p>
          </div>
        )}
        {entries.map(e => (
          <div key={e.id} className={`rounded-xl border overflow-hidden ${e.is_active ? 'border-[#E2E8F0]' : 'border-dashed border-[#E2E8F0] opacity-50'}`}>
            <div className="grid grid-cols-2 divide-x divide-[#E2E8F0]">
              <div className="p-3 bg-blue-50">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Usuario dice</p>
                <p className="text-sm text-[#1E293B]">{e.title}</p>
              </div>
              <div className="p-3 bg-emerald-50">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Agente responde</p>
                <p className="text-sm text-[#1E293B]">{e.content}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-[#E2E8F0]">
              <Badge source={e.source} />
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-[#4F5AF5]"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onToggle(e.id)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                  {e.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => onDelete(e.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Guardarraíles ────────────────────────────────────────────────────────
function GuardrailsTab({ entries, onCreate, onUpdate, onDelete, onToggle, setEntries }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  setEntries: React.Dispatch<React.SetStateAction<TrainingEntry[]>>;
}) {
  const [newRule, setNewRule] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = entries.findIndex(e => e.id === active.id);
      const newIdx = entries.findIndex(e => e.id === over.id);
      const reordered = arrayMove(entries, oldIdx, newIdx);
      setEntries(prev => prev.map(e => {
        const found = reordered.find(r => r.id === e.id);
        return found ? { ...e, sort_order: reordered.indexOf(found) } : e;
      }));
      await fetch('/api/ai-training/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map(r => r.id) }),
      });
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) return;
    await onCreate({ layer: 'guardrails', title: `Regla ${entries.length + 1}`, content: newRule.trim(), is_active: true, sort_order: entries.length });
    setNewRule('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-4">
      <div>
        <h2 className="font-bold text-[#1E293B]">Guardarraíles</h2>
        <p className="text-xs text-[#64748B] mt-0.5">Restricciones absolutas de comportamiento. Arrastra para priorizar.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addRule(); }}
          placeholder="Ej: No revelar datos de otros usuarios ni iniciativas"
          className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
        />
        <button onClick={addRule} disabled={!newRule.trim()} className="flex items-center gap-2 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No hay reglas definidas. Agrega restricciones de comportamiento.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {entries.map(entry => (
                editing?.id === entry.id ? (
                  <div key={entry.id} className="flex gap-2 p-3 rounded-xl border border-[#4F5AF5]/40 bg-[#EEF2FF]">
                    <input
                      value={editing.text}
                      onChange={e => setEditing(prev => prev ? { ...prev, text: e.target.value } : null)}
                      autoFocus
                      className="flex-1 border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
                    />
                    <button onClick={() => { onUpdate(entry.id, { content: editing.text }); setEditing(null); }} className="bg-[#4F5AF5] text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Guardar</button>
                    <button onClick={() => setEditing(null)} className="border border-[#E2E8F0] bg-white px-3 py-1.5 rounded-lg text-sm font-semibold text-[#64748B]">Cancelar</button>
                  </div>
                ) : (
                  <SortableGuardrail
                    key={entry.id}
                    entry={entry}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onEdit={e => setEditing({ id: e.id, text: e.content })}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Tab: Retroalimentación ────────────────────────────────────────────────────
function FeedbackTab({ feedback, onApprove, onDiscard }: {
  feedback: FeedbackEntry[];
  onApprove: (fb: FeedbackEntry, idealResponse: string) => Promise<void>;
  onDiscard: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);

  const filtered = feedback.filter(f => filter === 'all' || f.rating === filter);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1E293B]">Retroalimentación de Conversaciones</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Mensajes calificados por usuarios en conversaciones reales. Apruébalos como ejemplos de entrenamiento.</p>
        </div>
        <div className="flex gap-1 bg-[#F8FAFC] rounded-lg p-1 border border-[#E2E8F0]">
          {(['all', 'negative', 'positive'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filter === f ? 'bg-white shadow-sm text-[#1E293B]' : 'text-[#64748B] hover:text-[#1E293B]'}`}>
              {f === 'all' ? 'Todos' : f === 'negative' ? '👎 Negativos' : '👍 Positivos'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No hay retroalimentación pendiente de revisión.</p>
          <p className="text-xs mt-1">Los usuarios deben calificar mensajes del agente en el chat de iniciativas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(fb => (
            <div key={fb.id} className={`rounded-xl border overflow-hidden ${fb.rating === 'negative' ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#E2E8F0] bg-white">
                <span className="text-base">{fb.rating === 'negative' ? '👎' : '👍'}</span>
                <span className="text-xs text-[#64748B]">Iniciativa: <span className="font-semibold text-[#1E293B]">{fb.initiative_id}</span></span>
                <span className="text-xs text-[#94A3B8] ml-auto">{new Date(fb.created_at).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#E2E8F0]">
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Usuario dijo</p>
                  <p className="text-sm text-[#1E293B]">{fb.user_message}</p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Agente respondió</p>
                  <p className="text-sm text-[#64748B]">{fb.agent_response}</p>
                </div>
              </div>
              {fb.rating === 'negative' && (
                <div className="px-4 py-3 bg-white border-t border-[#E2E8F0]">
                  <p className="text-xs font-semibold text-[#64748B] mb-1.5">Respuesta ideal (edita antes de aprobar):</p>
                  <textarea
                    value={editing[fb.id] ?? fb.agent_response}
                    onChange={e => setEditing(prev => ({ ...prev, [fb.id]: e.target.value }))}
                    rows={3}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] resize-none"
                  />
                </div>
              )}
              <div className="flex gap-2 px-4 py-3 bg-white border-t border-[#E2E8F0] justify-end">
                <button onClick={() => onDiscard(fb.id)} className="flex items-center gap-1.5 border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 text-[#64748B] hover:text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                   <Trash2 className="w-3.5 h-3.5" /> Descartar
                </button>
                <button
                  onClick={async () => {
                    setApproving(fb.id);
                    await onApprove(fb, editing[fb.id] ?? fb.agent_response);
                    setApproving(null);
                  }}
                  disabled={approving === fb.id}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {approving === fb.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Aprobar como Ejemplo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Configuración (SettingsTab) ───────────────────────────────────────────
function SettingsTab({ entries, onCreate, onUpdate }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
}) {
  const useMicSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_mic');
  const useAttachmentsSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_attachments');

  const useMic = useMicSetting ? useMicSetting.content !== 'false' : true;
  const useAttachments = useAttachmentsSetting ? useAttachmentsSetting.content !== 'false' : true;

  const enablePdfSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_pdf');
  const enableDocxSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_docx');
  const enableTxtSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_txt');
  const enableImageSetting = entries.find(e => e.layer === 'settings' && e.title === 'enable_image');

  const limitPdfSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_pdf');
  const limitDocxSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_docx');
  const limitTxtSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_txt');
  const limitImageSetting = entries.find(e => e.layer === 'settings' && e.title === 'max_size_image');

  const enablePdf = enablePdfSetting ? enablePdfSetting.content !== 'false' : true;
  const enableDocx = enableDocxSetting ? enableDocxSetting.content !== 'false' : true;
  const enableTxt = enableTxtSetting ? enableTxtSetting.content !== 'false' : true;
  const enableImage = enableImageSetting ? enableImageSetting.content !== 'false' : true;

  const limitPdf = limitPdfSetting ? limitPdfSetting.content : '1.0';
  const limitDocx = limitDocxSetting ? limitDocxSetting.content : '1.0';
  const limitTxt = limitTxtSetting ? limitTxtSetting.content : '1.0';
  const limitImage = limitImageSetting ? limitImageSetting.content : '1.0';

  const toggleMic = async () => {
    const newValue = (!useMic).toString();
    if (useMicSetting) {
      onUpdate(useMicSetting.id, { content: newValue });
    } else {
      await onCreate({ layer: 'settings', title: 'use_mic', content: newValue, is_active: true, sort_order: 0, source: 'manual' });
    }
  };

  const toggleAttachments = async () => {
    const newValue = (!useAttachments).toString();
    if (useAttachmentsSetting) {
      onUpdate(useAttachmentsSetting.id, { content: newValue });
    } else {
      await onCreate({ layer: 'settings', title: 'use_attachments', content: newValue, is_active: true, sort_order: 0, source: 'manual' });
    }
  };

  const toggleFileType = async (type: string) => {
    const setting = entries.find(e => e.layer === 'settings' && e.title === `enable_${type}`);
    const currentValue = setting ? setting.content !== 'false' : true;
    const newValue = (!currentValue).toString();
    if (setting) {
      onUpdate(setting.id, { content: newValue });
    } else {
      await onCreate({ layer: 'settings', title: `enable_${type}`, content: newValue, is_active: true, sort_order: 0, source: 'manual' });
    }
  };

  const updateSizeLimit = async (type: string, value: string) => {
    const setting = entries.find(e => e.layer === 'settings' && e.title === `max_size_${type}`);
    if (setting) {
      onUpdate(setting.id, { content: value });
    } else {
      await onCreate({ layer: 'settings', title: `max_size_${type}`, content: value, is_active: true, sort_order: 0, source: 'manual' });
    }
  };

  const fileTypes = {
    pdf: { enabled: enablePdf, maxMb: parseFloat(limitPdf) },
    docx: { enabled: enableDocx, maxMb: parseFloat(limitDocx) },
    txt: { enabled: enableTxt, maxMb: parseFloat(limitTxt) },
    image: { enabled: enableImage, maxMb: parseFloat(limitImage) }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-6">
      <div>
        <h2 className="font-bold text-[#1E293B]">Configuración de Funciones en el Chat</h2>
        <p className="text-xs text-[#64748B] mt-0.5">Activa o desactiva las capacidades adicionales del chat para los usuarios y pruebas.</p>
      </div>

      <div className="divide-y divide-[#E2E8F0]">
        {/* Toggle 1: Micrófono */}
        <div className="py-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <Mic className="w-4 h-4 text-violet-500" /> Entrada por Micrófono (Voz a Texto)
            </span>
            <p className="text-xs text-[#64748B]">Permite a los usuarios grabar audio con su micrófono y transcribirlo automáticamente de forma local.</p>
          </div>
          <button
            onClick={toggleMic}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
              useMic ? 'bg-violet-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                useMic ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Archivos adjuntos */}
        <div className="py-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#4F5AF5]" /> Subida de Archivos Adjuntos
            </span>
            <p className="text-xs text-[#64748B]">Permite adjuntar y leer archivos (PDF, DOCX, TXT e imágenes) para alimentar el contexto de la conversación.</p>
          </div>
          <button
            onClick={toggleAttachments}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
              useAttachments ? 'bg-[#4F5AF5]' : 'bg-slate-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                useAttachments ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {useAttachments && (
        <div className="pt-6 border-t border-[#E2E8F0] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1E293B]">Formatos de Archivo y Límites de Tamaño</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Habilita los formatos permitidos y define el tamaño máximo en Megabytes (MB) para cada uno.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PDF Limit */}
            <div className={`flex flex-col bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 space-y-3 transition-opacity ${!fileTypes.pdf.enabled ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-500" /> Archivos PDF (.pdf)
                </span>
                <button
                  onClick={() => toggleFileType('pdf')}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    fileTypes.pdf.enabled ? 'bg-red-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${fileTypes.pdf.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2E8F0]">
                <span className="text-[#64748B]">Tamaño máximo:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    disabled={!fileTypes.pdf.enabled}
                    value={limitPdf}
                    onChange={e => updateSizeLimit('pdf', e.target.value)}
                    className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-right disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[#64748B] font-semibold">MB</span>
                </div>
              </div>
            </div>

            {/* Word (DOCX) Limit */}
            <div className={`flex flex-col bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 space-y-3 transition-opacity ${!fileTypes.docx.enabled ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" /> Documentos Word (.docx)
                </span>
                <button
                  onClick={() => toggleFileType('docx')}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    fileTypes.docx.enabled ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${fileTypes.docx.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2E8F0]">
                <span className="text-[#64748B]">Tamaño máximo:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    disabled={!fileTypes.docx.enabled}
                    value={limitDocx}
                    onChange={e => updateSizeLimit('docx', e.target.value)}
                    className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-right disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[#64748B] font-semibold">MB</span>
                </div>
              </div>
            </div>

            {/* Plain Text (TXT) Limit */}
            <div className={`flex flex-col bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 space-y-3 transition-opacity ${!fileTypes.txt.enabled ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" /> Archivos de Texto (.txt)
                </span>
                <button
                  onClick={() => toggleFileType('txt')}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    fileTypes.txt.enabled ? 'bg-slate-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${fileTypes.txt.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2E8F0]">
                <span className="text-[#64748B]">Tamaño máximo:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    disabled={!fileTypes.txt.enabled}
                    value={limitTxt}
                    onChange={e => updateSizeLimit('txt', e.target.value)}
                    className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-right disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[#64748B] font-semibold">MB</span>
                </div>
              </div>
            </div>

            {/* Images Limit */}
            <div className={`flex flex-col bg-slate-50 border border-[#E2E8F0] rounded-xl p-4 space-y-3 transition-opacity ${!fileTypes.image.enabled ? 'opacity-65' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-500" /> Imágenes (JPG, PNG, WEBP)
                </span>
                <button
                  onClick={() => toggleFileType('image')}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    fileTypes.image.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${fileTypes.image.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-[#E2E8F0]">
                <span className="text-[#64748B]">Tamaño máximo:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    disabled={!fileTypes.image.enabled}
                    value={limitImage}
                    onChange={e => updateSizeLimit('image', e.target.value)}
                    className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] text-right disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[#64748B] font-semibold">MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
