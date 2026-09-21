import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BrainCircuit, User, BookOpen, MessageSquare, ShieldAlert,
  ThumbsUp, Bot, Send, RefreshCw, Plus, Trash2, GripVertical,
  ToggleLeft, ToggleRight, Upload, FileText, CheckCircle, X,
  ChevronDown, ChevronUp, ChevronRight, Pencil, Save, AlertCircle, Loader2,
  Mic, MicOff, Paperclip, Image as ImageIcon, HelpCircle, Sparkles,
  Brain, Copy, ExternalLink, Layers,
  Folder, FolderPlus, FolderOpen, FolderTree, MoreVertical, Search, CornerDownRight, FolderInput, ShieldCheck
} from 'lucide-react';
import { HybridSpeechRecognizer } from '../lib/speechService';
import { supabase } from '../lib/supabase';
import { formatDateDDMMYYYY } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { parseHtmlToMarkdown } from '../lib/formatHtml';
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
export interface TrainingFolder {
  id: string;
  name: string;
  parent_id: string | null;
  level: number; // 1, 2, or 3
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface TrainingEntry {
  id: string;
  layer: 'identity' | 'context' | 'examples' | 'guardrails' | 'settings';
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  source: string;
  folder_id?: string | null;
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
  { id: 'appearance',    label: 'Apariencia',       icon: Bot },
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
  const [folders, setFolders] = useState<TrainingFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Executive Sandbox State (Fase 1 CIO)
  const [sandboxEnabled, setSandboxEnabled] = useState<boolean>(true);
  const [togglingSandbox, setTogglingSandbox] = useState<boolean>(false);

  const handleToggleSandbox = async () => {
    setTogglingSandbox(true);
    const nextVal = !sandboxEnabled;
    try {
      const res = await fetch('/api/sandbox/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal })
      });
      if (!res.ok) throw new Error('Error al actualizar estado del Sandbox');
      setSandboxEnabled(nextVal);
      showSave(nextVal ? 'Sandbox de Teo ACTIVO ✓' : 'Sandbox de Teo DESACTIVADO ✓');
    } catch (err: any) {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 1, sandbox_enabled: nextVal, updated_at: new Date().toISOString() });
      if (!error) {
        setSandboxEnabled(nextVal);
        showSave(nextVal ? 'Sandbox de Teo ACTIVO ✓' : 'Sandbox de Teo DESACTIVADO ✓');
      } else {
        showSave('Error al cambiar estado');
      }
    } finally {
      setTogglingSandbox(false);
    }
  };

  const useMicSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_mic');
  const useAttachmentsSetting = entries.find(e => e.layer === 'settings' && e.title === 'use_attachments');
  const useMic = useMicSetting ? useMicSetting.content !== 'false' : true;
  const useAttachments = useAttachmentsSetting ? useAttachmentsSetting.content !== 'false' : true;

  const aiNameSetting = entries.find(e => e.layer === 'settings' && e.title === 'ai_name');
  const aiAvatarSetting = entries.find(e => e.layer === 'settings' && e.title === 'ai_avatar');
  const aiName = aiNameSetting?.content || "Asistente IA";
  const aiAvatar = aiAvatarSetting?.content || "";

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
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hybridRecognizerRef = useRef<HybridSpeechRecognizer | null>(null);
  const baseChatInputRef = useRef<string>('');

  // ── Attachment handling ──────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const loadAll = async () => {
    setLoading(true);
    const [trainRes, fbRes, folderRes] = await Promise.all([
      fetch('/api/ai-training')
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data } = await supabase
            .from('ai_training_config')
            .select('*')
            .order('layer')
            .order('sort_order', { ascending: true });
          return data || [];
        }),
      fetch('/api/ai-feedback')
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data } = await supabase
            .from('ai_feedback')
            .select('*')
            .order('created_at', { ascending: false });
          return data || [];
        }),
      fetch('/api/ai-training/folders')
        .then(async r => {
          if (!r.ok) throw new Error(`API status ${r.status}`);
          const json = await r.json();
          if (!Array.isArray(json)) throw new Error("Invalid format");
          return json;
        })
        .catch(async () => {
          const { data } = await supabase
            .from('ai_knowledge_folders')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });
          return data || [];
        }),
    ]);
    setEntries(Array.isArray(trainRes) ? trainRes : []);
    setFeedback(Array.isArray(fbRes) ? fbRes : []);
    setFolders(Array.isArray(folderRes) ? folderRes : []);

    try {
      const sRes = await fetch('/api/sandbox/status');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSandboxEnabled(Boolean(sData.enabled));
      } else {
        const { data: sDb } = await supabase
          .from('site_settings')
          .select('sandbox_enabled')
          .eq('id', 1)
          .maybeSingle();
        setSandboxEnabled(sDb?.sandbox_enabled ?? true);
      }
    } catch {
      setSandboxEnabled(true);
    }

    setLoading(false);
  };

  const showSave = (msg = 'Guardado ✓') => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const createEntry = async (payload: Partial<TrainingEntry>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setEntries(prev => [...prev, data]);
        showSave();
        setSaving(false);
        return data;
      }

      // Fallback: si el endpoint API devuelve error (ej. 401 por sesión expirada o red), guardar directo en Supabase
      console.warn("API /api/ai-training falló, ejecutando fallback directo con Supabase client...");
      const { data, error } = await supabase
        .from('ai_training_config')
        .insert([{
          layer: payload.layer,
          title: payload.title,
          content: payload.content,
          is_active: payload.is_active ?? true,
          sort_order: payload.sort_order ?? 0,
          source: payload.source ?? 'manual',
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      setEntries(prev => [...prev, data]);
      showSave();
      setSaving(false);
      return data;
    } catch (err: any) {
      console.error("Error al registrar ficha de conocimiento:", err);
      showSave("Error al guardar");
      setSaving(false);
      throw err;
    }
  };

  const updateEntry = async (id: string, payload: Partial<TrainingEntry>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ai-training/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setEntries(prev => prev.map(e => e.id === id ? data : e));
        showSave();
        setSaving(false);
        return;
      }

      // Fallback: actualizar directo en Supabase
      const { data, error } = await supabase
        .from('ai_training_config')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === id ? data : e));
      showSave();
      setSaving(false);
    } catch (err: any) {
      console.error("Error al actualizar ficha:", err);
      showSave("Error al actualizar");
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-training/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await supabase
          .from('ai_training_config')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      setEntries(prev => prev.filter(e => e.id !== id));
      showSave('Eliminado');
    } catch (err: any) {
      console.error("Error al eliminar ficha:", err);
      showSave("Error al eliminar");
    }
  };

  const toggleEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) updateEntry(id, { is_active: !entry.is_active });
  };

  // ── Folders CRUD helpers ──────────────────────────────────────────────────
  const createFolder = async (payload: { name: string; parent_id?: string | null }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai-training/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(prev => [...prev, data]);
        showSave('Carpeta creada ✓');
        return data;
      }
      throw new Error('Error al crear carpeta');
    } catch {
      let level = 1;
      if (payload.parent_id) {
        const parent = folders.find(f => f.id === payload.parent_id);
        if (parent) {
          if (parent.level >= 3) throw new Error('No se pueden crear más de 3 niveles');
          level = parent.level + 1;
        }
      }
      const { data, error } = await supabase
        .from('ai_knowledge_folders')
        .insert([{
          name: payload.name.trim(),
          parent_id: payload.parent_id || null,
          level,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      if (error) throw error;
      setFolders(prev => [...prev, data]);
      showSave('Carpeta creada ✓');
      return data;
    } finally {
      setSaving(false);
    }
  };

  const updateFolder = async (id: string, payload: { name?: string; sort_order?: number; parent_id?: string | null }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ai-training/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(prev => prev.map(f => f.id === id ? data : f));
        showSave('Carpeta actualizada ✓');
        return data;
      }
      throw new Error('Error al actualizar carpeta');
    } catch {
      const { data, error } = await supabase
        .from('ai_knowledge_folders')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setFolders(prev => prev.map(f => f.id === id ? data : f));
      showSave('Carpeta actualizada ✓');
      return data;
    } finally {
      setSaving(false);
    }
  };

  const deleteFolder = async (id: string, deleteItems = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ai-training/folders/${id}?deleteItems=${deleteItems}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadAll();
        showSave('Carpeta eliminada ✓');
        return;
      }
      throw new Error('Error al eliminar');
    } catch {
      if (deleteItems) {
        await supabase.from('ai_training_config').delete().eq('folder_id', id);
      } else {
        await supabase.from('ai_training_config').update({ folder_id: null }).eq('folder_id', id);
      }
      await supabase.from('ai_knowledge_folders').delete().eq('id', id);
      await loadAll();
      showSave('Carpeta eliminada ✓');
    } finally {
      setSaving(false);
    }
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

  // ── Voice handlers (Dual Engine: Web Speech API Live + Groq Whisper Large v3) ──
  const startRecording = useCallback(async () => {
    setVoiceError(null);
    setRecordingSeconds(0);
    baseChatInputRef.current = chatInput;

    try {
      const recognizer = new HybridSpeechRecognizer();
      hybridRecognizerRef.current = recognizer;

      await recognizer.start({
        lang: 'es-PE',
        onInterimText: (interim) => {
          const base = baseChatInputRef.current ? baseChatInputRef.current + ' ' : '';
          setChatInput(base + interim);
        },
        onFinalText: (finalText) => {
          const base = baseChatInputRef.current ? baseChatInputRef.current + ' ' : '';
          setChatInput(base + finalText);
          baseChatInputRef.current = base + finalText;
        },
        onError: (err) => {
          console.warn('[STT] Notice:', err);
        }
      });

      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 59) { stopRecording(); return 0; }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      setVoiceError(err.name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : 'No se pudo acceder al micrófono: ' + err.message);
    }
  }, [chatInput]);

  const stopRecording = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
    setIsRecording(false);

    if (hybridRecognizerRef.current) {
      setIsTranscribing(true);
      try {
        const text = await hybridRecognizerRef.current.stop();
        if (text?.trim()) {
          const base = baseChatInputRef.current ? baseChatInputRef.current + ' ' : '';
          setChatInput((base + text).trim());
        }
      } catch (err: any) {
        setVoiceError('Error al transcribir: ' + err.message);
      } finally {
        setIsTranscribing(false);
        hybridRecognizerRef.current = null;
      }
    }
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

          {/* ── Executive Sandbox Control Card (Fase 1 CIO) ──────────────────────── */}
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EB5F46] flex items-center justify-center text-white shadow-md shrink-0 ring-2 ring-white/20">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">
                    Laboratorio Teo — Sandbox Ejecutivo
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#EB5F46]/20 text-[#EB5F46] border border-[#EB5F46]/30">
                    Fase 1 • CIO
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  URL dedicada para que el CIO y jefaturas prueben a Teo capturando y articulando necesidades en vivo.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Switch Toggle */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-xs font-semibold text-slate-200">
                  Estado: {sandboxEnabled ? <strong className="text-emerald-400">ACTIVO</strong> : <strong className="text-rose-400">INACTIVO</strong>}
                </span>
                <button
                  type="button"
                  onClick={handleToggleSandbox}
                  disabled={togglingSandbox}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    sandboxEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  title={sandboxEnabled ? "Desactivar Sandbox para usuarios externos" : "Activar Sandbox"}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      sandboxEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/sandbox`;
                  navigator.clipboard.writeText(url);
                  showSave('¡Enlace Sandbox copiado para el CIO! ✓');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-colors"
                title="Copiar enlace directo para enviar al CIO por Teams o correo"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Enlace CIO</span>
              </button>

              {/* Open in New Tab Button */}
              <a
                href="/sandbox"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EB5F46] hover:bg-[#D94F37] text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Probar Sandbox</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F5AF5]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="h-4 bg-slate-200 rounded w-48 mb-1.5" />
                <div className="h-3 bg-slate-100 rounded w-72" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'identity' && (
              <IdentityTab entries={byLayer('identity')} onCreate={createEntry} onUpdate={updateEntry} />
            )}
            {activeTab === 'appearance' && (
              <AppearanceTab entries={entries} onCreate={createEntry} onUpdate={updateEntry} />
            )}
            {activeTab === 'context' && (
              <ContextTab
                entries={byLayer('context')}
                folders={folders}
                onCreate={createEntry}
                onUpdate={updateEntry}
                onDelete={deleteEntry}
                onToggle={toggleEntry}
                onCreateFolder={createFolder}
                onUpdateFolder={updateFolder}
                onDeleteFolder={deleteFolder}
              />
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {aiAvatar ? (
                <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <span className="text-xs font-semibold text-white truncate">{aiName} (Prueba)</span>
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
              <div className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center mx-auto mb-2 overflow-hidden shrink-0 shadow-sm">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <p className="text-xs">Escribe algo para probar el agente con la configuración actual</p>
            </div>
          )}
          {chatMsgs.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 overflow-hidden ${msg.role === 'model' ? 'bg-white border border-[#E2E8F0] shadow-sm' : 'bg-[#4F5AF5]'}`}>
                {msg.role === 'model' ? (
                  aiAvatar ? (
                    <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-3 h-3 text-[#4F5AF5]" />
                  )
                ) : (
                  <span className="text-white text-[8px] font-bold">TU</span>
                )}
              </div>
              <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed max-w-[calc(100%-2.5rem)] shadow-sm ${
                msg.role === 'user' ? 'bg-[#4F5AF5] text-white rounded-tr-sm' : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="prose prose-xs max-w-none text-[#1E293B] prose-p:my-1.5 prose-p:leading-relaxed prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-bold prose-headings:text-slate-900 prose-strong:font-bold prose-strong:text-slate-900 prose-hr:my-2 leading-relaxed break-words">
                    <ReactMarkdown>{parseHtmlToMarkdown(msg.text)}</ReactMarkdown>
                  </div>
                )}
                {msg.role === 'model' && msg.options && msg.options.length > 0 && i === chatMsgs.length - 1 && !chatLoading && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Sugerencias:</span>
                    <div className="flex flex-wrap gap-1">
                      {msg.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setChatInput(opt)}
                          className="text-left text-[10px] bg-violet-50 hover:bg-violet-100 text-violet-700 px-2 py-1 rounded-md transition-colors border border-violet-100 font-medium cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-3 h-3 text-[#4F5AF5]" />
                )}
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
          {isTranscribing && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5">
              <Loader2 className="w-3 h-3 text-violet-500 animate-spin shrink-0" />
              <span className="text-[10px] font-semibold text-violet-600">Transcribiendo audio con IA...</span>
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

// ─── Helpers de Formato y Archivos para la Base de Conocimiento ──────────────
function formatKnowledgeFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getKnowledgeFileMeta(fileName: string, mime?: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mime === 'application/pdf') {
    return { label: 'Documento PDF', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'pdf' };
  }
  if (lower.endsWith('.docx') || mime?.includes('word')) {
    return { label: 'Documento Word', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'docx' };
  }
  if (lower.match(/\.(png|jpg|jpeg|webp)$/i) || mime?.startsWith('image/')) {
    return { label: 'Diagrama con Visión IA', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'image' };
  }
  return { label: 'Documento de Texto', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'txt' };
}

// ─── Tab: Contexto con Sistema de Carpetas Jerárquicas (Máximo 3 Niveles) ─────
interface FolderTreeNode extends TrainingFolder {
  children: FolderTreeNode[];
  itemCount: number;
}

function ContextTab({
  entries,
  folders,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}: {
  entries: TrainingEntry[];
  folders: TrainingFolder[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateFolder: (payload: { name: string; parent_id?: string | null }) => Promise<any>;
  onUpdateFolder: (id: string, payload: { name?: string; sort_order?: number; parent_id?: string | null }) => Promise<any>;
  onDeleteFolder: (id: string, deleteItems?: boolean) => Promise<any>;
}) {
  // Navigation / Explorer state
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [entrySearchTerm, setEntrySearchTerm] = useState('');

  // Modals state
  const [folderModal, setFolderModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    parentFolder?: TrainingFolder | null;
    folderToEdit?: TrainingFolder | null;
  }>({ isOpen: false, mode: 'create' });
  const [folderNameInput, setFolderNameInput] = useState('');

  const [deleteFolderModal, setDeleteFolderModal] = useState<{
    isOpen: boolean;
    folder: TrainingFolder | null;
    deleteItems: boolean;
  }>({ isOpen: false, folder: null, deleteItems: false });

  const [moveEntryModal, setMoveEntryModal] = useState<{
    isOpen: boolean;
    entry: TrainingEntry | null;
    targetFolderId: string;
  }>({ isOpen: false, entry: null, targetFolderId: '' });

  // Entry creation / edition form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TrainingEntry | null>(null);
  const [form, setForm] = useState({ title: '', content: '', folder_id: '' });

  // Document upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [uploadSeconds, setUploadSeconds] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [extracted, setExtracted] = useState<{ title: string; content: string }[]>([]);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>('');
  const [editingChunkIdx, setEditingChunkIdx] = useState<number | null>(null);
  const [expandedChunkIdxs, setExpandedChunkIdxs] = useState<Record<number, boolean>>({});
  const [showGuide, setShowGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    };
  }, []);

  // Deleting entry confirmation
  const [deletingEntry, setDeletingEntry] = useState<TrainingEntry | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Build folder map & full path map
  const folderById = useMemo(() => new Map<string, TrainingFolder>(folders.map(f => [f.id, f])), [folders]);

  const folderPathMap = useMemo(() => {
    const map = new Map<string, string>();
    const getPath = (id: string | null): string => {
      if (!id) return '';
      const f = folderById.get(id);
      if (!f) return '';
      const parent = getPath(f.parent_id);
      return parent ? `${parent} > ${f.name}` : f.name;
    };
    folders.forEach(f => {
      map.set(f.id, getPath(f.id));
    });
    return map;
  }, [folders, folderById]);

  // Build hierarchical folder tree with counts
  const folderTree = useMemo(() => {
    const nodeMap = new Map<string, FolderTreeNode>();
    folders.forEach(f => {
      nodeMap.set(f.id, { ...f, children: [], itemCount: 0 });
    });

    entries.forEach(e => {
      if (e.folder_id && nodeMap.has(e.folder_id)) {
        nodeMap.get(e.folder_id)!.itemCount += 1;
      }
    });

    const roots: FolderTreeNode[] = [];
    folders.forEach(f => {
      const node = nodeMap.get(f.id)!;
      if (f.parent_id && nodeMap.has(f.parent_id)) {
        nodeMap.get(f.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [folders, entries]);

  // Toggle folder expansion
  const toggleFolderExpand = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Auto-expand parent folders when selectedFolderId changes
  useEffect(() => {
    if (selectedFolderId !== 'all' && selectedFolderId !== 'root') {
      const target = folderById.get(selectedFolderId);
      if (target?.parent_id) {
        setExpandedFolderIds(prev => new Set([...prev, target.parent_id!]));
      }
    }
  }, [selectedFolderId, folderById]);

  // Filter entries according to active folder and search term
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (selectedFolderId === 'root') {
      list = list.filter(e => !e.folder_id);
    } else if (selectedFolderId !== 'all') {
      list = list.filter(e => e.folder_id === selectedFolderId);
    }
    if (entrySearchTerm.trim()) {
      const q = entrySearchTerm.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
    }
    return list;
  }, [entries, selectedFolderId, entrySearchTerm]);

  // Flattened folders for selectors with depth indentation
  const flattenedFolderOptions = useMemo(() => {
    const result: { id: string; name: string; level: number; path: string }[] = [];
    const traverse = (node: FolderTreeNode, depth: number) => {
      result.push({
        id: node.id,
        name: node.name,
        level: node.level,
        path: folderPathMap.get(node.id) || node.name
      });
      node.children.forEach(c => traverse(c, depth + 1));
    };
    folderTree.forEach(r => traverse(r, 1));
    return result;
  }, [folderTree, folderPathMap]);

  // Open modal to create folder
  const handleOpenCreateFolder = (parentFolder?: TrainingFolder | null) => {
    if (parentFolder && parentFolder.level >= 3) {
      showToast('Límite alcanzado: máximo se permiten 3 niveles de carpetas.', 'error');
      return;
    }
    setFolderNameInput('');
    setFolderModal({
      isOpen: true,
      mode: 'create',
      parentFolder: parentFolder || null,
      folderToEdit: null
    });
  };

  // Open modal to rename folder
  const handleOpenEditFolder = (folder: TrainingFolder) => {
    setFolderNameInput(folder.name);
    setFolderModal({
      isOpen: true,
      mode: 'edit',
      parentFolder: null,
      folderToEdit: folder
    });
  };

  // Save folder (create or edit)
  const handleSaveFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderNameInput.trim();
    if (!name) return;

    try {
      if (folderModal.mode === 'edit' && folderModal.folderToEdit) {
        await onUpdateFolder(folderModal.folderToEdit.id, { name });
        showToast(`Carpeta renombrada a "${name}"`, 'success');
      } else {
        const created = await onCreateFolder({
          name,
          parent_id: folderModal.parentFolder ? folderModal.parentFolder.id : null
        });
        if (created?.id) {
          setSelectedFolderId(created.id);
          if (folderModal.parentFolder) {
            setExpandedFolderIds(prev => new Set([...prev, folderModal.parentFolder!.id]));
          }
        }
        showToast(`Carpeta "${name}" creada exitosamente`, 'success');
      }
      setFolderModal({ isOpen: false, mode: 'create' });
    } catch (err: any) {
      showToast(err.message || 'Error al guardar carpeta', 'error');
    }
  };

  // Open delete folder modal
  const handleOpenDeleteFolder = (folder: TrainingFolder) => {
    setDeleteFolderModal({
      isOpen: true,
      folder,
      deleteItems: false
    });
  };

  // Confirm delete folder
  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderModal.folder) return;
    try {
      const folderName = deleteFolderModal.folder.name;
      await onDeleteFolder(deleteFolderModal.folder.id, deleteFolderModal.deleteItems);
      if (selectedFolderId === deleteFolderModal.folder.id) {
        setSelectedFolderId('all');
      }
      showToast(`Carpeta "${folderName}" eliminada correctamente.`, 'info');
      setDeleteFolderModal({ isOpen: false, folder: null, deleteItems: false });
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar carpeta', 'error');
    }
  };

  // Open form for new entry
  const openNew = () => {
    const defaultFolder = selectedFolderId !== 'all' && selectedFolderId !== 'root' ? selectedFolderId : '';
    setForm({ title: '', content: '', folder_id: defaultFolder });
    setEditing(null);
    setShowForm(true);
  };

  // Open form for editing entry
  const openEdit = (e: TrainingEntry) => {
    setForm({ title: e.title, content: e.content, folder_id: e.folder_id || '' });
    setEditing(e);
    setShowForm(true);
  };

  // Save entry
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing) {
      onUpdate(editing.id, {
        title: form.title.trim(),
        content: form.content.trim(),
        folder_id: form.folder_id || null
      });
      showToast(`Ficha "${form.title}" actualizada`, 'success');
    } else {
      await onCreate({
        layer: 'context',
        title: form.title.trim(),
        content: form.content.trim(),
        folder_id: form.folder_id || null,
        is_active: true,
        sort_order: entries.length,
        source: 'manual'
      });
      showToast(`Ficha "${form.title}" agregada a la Base de Conocimiento`, 'success');
    }
    setShowForm(false);
    setEditing(null);
  };

  // Move entry modal
  const handleOpenMoveEntry = (entry: TrainingEntry) => {
    setMoveEntryModal({
      isOpen: true,
      entry,
      targetFolderId: entry.folder_id || ''
    });
  };

  const handleConfirmMoveEntry = async () => {
    if (!moveEntryModal.entry) return;
    try {
      const targetId = moveEntryModal.targetFolderId || null;
      onUpdate(moveEntryModal.entry.id, { folder_id: targetId });
      const targetName = targetId ? (folderPathMap.get(targetId) || 'la carpeta seleccionada') : 'la Raíz';
      showToast(`Ficha movida a ${targetName} ✓`, 'success');
      setMoveEntryModal({ isOpen: false, entry: null, targetFolderId: '' });
    } catch {
      showToast('Error al mover la ficha', 'error');
    }
  };

  // Document upload & drag-and-drop processing
  const processFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadingFile({ name: file.name, size: file.size, type: file.type });
    setUploadSeconds(0);

    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    uploadTimerRef.current = setInterval(() => {
      setUploadSeconds(s => s + 1);
    }, 1000);

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/ai-training/upload-document', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error al procesar el archivo', 'error');
      } else {
        setExtracted(data.chunks || []);
        setUploadTargetFolderId(selectedFolderId !== 'all' && selectedFolderId !== 'root' ? selectedFolderId : '');
        setShowUpload(true);
        showToast(`Se extrajeron ${data.chunks?.length || 1} fichas con éxito. Revisa y aprueba para guardar.`, 'info');
      }
    } catch {
      showToast('Error de conexión al procesar el archivo o diagrama.', 'error');
    } finally {
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
      setUploading(false);
      setUploadingFile(null);
      setUploadSeconds(0);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const uploadMeta = useMemo(() => {
    if (!uploadingFile) return null;
    return getKnowledgeFileMeta(uploadingFile.name, uploadingFile.type);
  }, [uploadingFile]);

  const { stageNumber, stageText, progressPercent } = useMemo(() => {
    if (uploadSeconds < 3) {
      return {
        stageNumber: 1,
        stageText: 'Transfiriendo archivo al servidor seguro...',
        progressPercent: Math.min(25, Math.max(12, uploadSeconds * 8))
      };
    }
    if (uploadSeconds < 8) {
      return {
        stageNumber: 2,
        stageText: uploadMeta?.icon === 'image'
          ? 'Analizando diagrama con Visión Artificial IA...'
          : 'Extrayendo texto y analizando estructura de contenido...',
        progressPercent: Math.min(58, 25 + (uploadSeconds - 3) * 6)
      };
    }
    if (uploadSeconds < 14) {
      return {
        stageNumber: 3,
        stageText: 'Segmentando reglas de negocio y políticas institucionales...',
        progressPercent: Math.min(88, 58 + (uploadSeconds - 8) * 5)
      };
    }
    return {
      stageNumber: 4,
      stageText: 'Estructurando y afinando fichas semánticas para TEO...',
      progressPercent: Math.min(96, 88 + (uploadSeconds - 14) * 1)
    };
  }, [uploadSeconds, uploadMeta]);

  const approveChunk = async (chunk: { title: string; content: string }) => {
    await onCreate({
      layer: 'context',
      ...chunk,
      folder_id: uploadTargetFolderId || null,
      is_active: true,
      sort_order: entries.length,
      source: 'document'
    });
    setExtracted(prev => prev.filter(c => c.title !== chunk.title));
    showToast(`Ficha "${chunk.title}" agregada a la Base de Conocimiento`, 'success');
  };

  const updateChunk = (index: number, field: 'title' | 'content', value: string) => {
    setExtracted(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleExpandChunk = (index: number) => {
    setExpandedChunkIdxs(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Helper count of entries in root
  const rootCount = entries.filter(e => !e.folder_id).length;

  // Active folder details for breadcrumbs
  const activeFolder = selectedFolderId !== 'all' && selectedFolderId !== 'root' ? folderById.get(selectedFolderId) : null;

  return (
    <div className="space-y-4">
      {/* ── Document Upload Processing Modal / Overlay de Alta Visibilidad ── */}
      {uploading && uploadingFile && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-indigo-100 overflow-hidden animate-in zoom-in-95 duration-200 p-6 sm:p-7 text-center space-y-5">
            {/* Animated Glowing AI Badge */}
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#4F5AF5] via-indigo-600 to-[#EB5F46] flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-8 ring-indigo-50/80">
              <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Procesando Documento con IA
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                TEO está extrayendo y segmentando las reglas de negocio para incorporarlas a la Base de Conocimiento.
              </p>
            </div>

            {/* File info card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${uploadMeta?.color || 'text-indigo-600 bg-indigo-50 border-indigo-200'}`}>
                {uploadMeta?.icon === 'image' ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 truncate" title={uploadingFile.name}>
                    {uploadingFile.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {formatKnowledgeFileSize(uploadingFile.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-medium text-slate-500 truncate flex items-center gap-1">
                    <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                    Destino: <strong className="text-slate-700">{activeFolder ? activeFolder.name : 'Raíz (General)'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-600 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{stageText}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-bold shrink-0">
                  {uploadSeconds}s
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-[#4F5AF5] via-violet-500 to-[#EB5F46] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Realtime 4-step checklist */}
            <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3 text-left space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${stageNumber > 1 ? 'text-emerald-500' : 'text-[#4F5AF5] animate-pulse'}`} />
                <span className={stageNumber === 1 ? 'font-bold text-[#4F5AF5]' : stageNumber > 1 ? 'text-slate-500 line-through' : 'text-slate-400'}>
                  1. Carga y validación segura del documento
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${stageNumber > 2 ? 'text-emerald-500' : stageNumber === 2 ? 'text-[#4F5AF5] animate-pulse' : 'text-slate-300'}`} />
                <span className={stageNumber === 2 ? 'font-bold text-[#4F5AF5]' : stageNumber > 2 ? 'text-slate-500 line-through' : 'text-slate-400'}>
                  2. {uploadMeta?.icon === 'image' ? 'Visión Artificial IA e interpretación de diagramas' : 'Extracción de texto y lectura de contenido'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${stageNumber > 3 ? 'text-emerald-500' : stageNumber === 3 ? 'text-[#4F5AF5] animate-pulse' : 'text-slate-300'}`} />
                <span className={stageNumber === 3 ? 'font-bold text-[#4F5AF5]' : stageNumber > 3 ? 'text-slate-500 line-through' : 'text-slate-400'}>
                  3. Segmentación semántica de políticas y reglas
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${stageNumber >= 4 ? 'text-[#4F5AF5] animate-pulse' : 'text-slate-300'}`} />
                <span className={stageNumber >= 4 ? 'font-bold text-[#4F5AF5]' : 'text-slate-400'}>
                  4. Generación de fichas institucionales para TEO
                </span>
              </div>
            </div>

            {/* Reassurance footnote */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Directriz The Architect: Preservando la integridad conceptual de cada política</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Upload Preview Modal ── */}
      {showUpload && extracted.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F5AF5]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1E293B]">Preliminar de Fichas Extraídas</h3>
                  <p className="text-xs text-[#64748B]">Revisa, edita o afina el contenido antes de integrarlo a la Base de Conocimiento.</p>
                </div>
              </div>
              <button onClick={() => setShowUpload(false)} className="text-[#94A3B8] hover:text-[#1E293B] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Carpeta de Destino en el modal de carga */}
            <div className="mx-6 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Folder className="w-4 h-4 text-amber-500" />
                <span>Carpeta de destino para las fichas:</span>
              </div>
              <select
                value={uploadTargetFolderId}
                onChange={e => setUploadTargetFolderId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] cursor-pointer"
              >
                <option value="">📂 Sin carpeta (Raíz / General)</option>
                {flattenedFolderOptions.map(f => (
                  <option key={f.id} value={f.id}>
                    {'  '.repeat(f.level - 1) + (f.level > 1 ? '↳ ' : '') + `📁 ${f.name} (Nivel ${f.level})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {extracted.map((chunk, i) => (
                <div key={i} className="border border-[#E2E8F0] bg-white rounded-xl p-4 shadow-2xs hover:border-[#4F5AF5]/40 transition-all space-y-3">
                  {editingChunkIdx === i ? (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">Título de la Ficha</label>
                        <input
                          type="text"
                          value={chunk.title}
                          onChange={e => updateChunk(i, 'title', e.target.value)}
                          className="w-full text-xs font-semibold text-[#1E293B] border border-[#CBD5E1] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">Contenido de Conocimiento</label>
                        <textarea
                          rows={6}
                          value={chunk.content}
                          onChange={e => updateChunk(i, 'content', e.target.value)}
                          className="w-full text-xs text-[#334155] border border-[#CBD5E1] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] font-sans resize-none leading-relaxed"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingChunkIdx(null)}
                          className="text-xs font-bold text-[#4F5AF5] bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mr-2">
                            Ficha {i + 1} de {extracted.length}
                          </span>
                          <h4 className="font-bold text-sm text-[#1E293B] mt-1">{chunk.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingChunkIdx(i)}
                            className="text-xs font-semibold text-[#64748B] hover:text-[#4F5AF5] hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => approveChunk(chunk)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-[#475569] bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed font-sans">
                        {expandedChunkIdxs[i] || chunk.content.length <= 220 ? chunk.content : `${chunk.content.slice(0, 220)}...`}
                        {chunk.content.length > 220 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandChunk(i)}
                            className="ml-2 font-bold text-[#4F5AF5] hover:underline cursor-pointer"
                          >
                            {expandedChunkIdxs[i] ? 'Mostrar menos' : 'Ver texto completo'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs text-[#64748B]">
                {extracted.length} {extracted.length === 1 ? 'ficha pendiente' : 'fichas pendientes'}
              </span>
              <div className="flex items-center gap-2.5">
                {extracted.length > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      for (const c of extracted) {
                        await onCreate({
                          layer: 'context',
                          ...c,
                          folder_id: uploadTargetFolderId || null,
                          is_active: true,
                          sort_order: entries.length,
                          source: 'document'
                        });
                      }
                      setExtracted([]);
                      setShowUpload(false);
                      showToast(`Se agregaron todas las fichas (${extracted.length}) a la Base de Conocimiento.`, 'success');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Agregar todas ({extracted.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-100 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Explorer Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── COLUMNA IZQUIERDA: Árbol de Carpetas (Max 3 niveles) ── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#4F5AF5]" />
              <div>
                <h3 className="font-bold text-sm text-[#1E293B]">Carpetas de Base</h3>
                <p className="text-[11px] text-[#64748B]">Jerarquía hasta 3 niveles</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateFolder(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4F5AF5] text-xs font-bold transition-colors cursor-pointer"
              title="Crear una nueva carpeta raíz (Nivel 1)"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Raíz</span>
            </button>
          </div>

          {/* Quick Nav: Todas y Sin Carpeta */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolderId('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFolderId === 'all'
                  ? 'bg-[#4F5AF5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Todas las Fichas</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedFolderId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {entries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderId('root')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedFolderId === 'root'
                  ? 'bg-[#4F5AF5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Sin Carpeta (General)</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedFolderId === 'root' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {rootCount}
              </span>
            </button>
          </div>

          {/* Buscador de carpetas */}
          {folders.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={folderSearchTerm}
                onChange={e => setFolderSearchTerm(e.target.value)}
                placeholder="Buscar carpeta..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4F5AF5]"
              />
            </div>
          )}

          {/* Renderizado del Árbol de Carpetas */}
          <div className="pt-2 border-t border-[#F1F5F9] max-h-[58vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {folders.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Folder className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                <p className="text-xs">Aún no hay carpetas creadas.</p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateFolder(null)}
                  className="mt-2 text-xs font-bold text-[#4F5AF5] hover:underline cursor-pointer"
                >
                  + Crear primera carpeta raíz
                </button>
              </div>
            ) : (
              folderTree
                .filter(node => !folderSearchTerm.trim() || node.name.toLowerCase().includes(folderSearchTerm.toLowerCase()))
                .map(rootNode => renderFolderTreeNode(rootNode))
            )}
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Fichas de la Carpeta Seleccionada ── */}
        <div
          className="lg:col-span-8 space-y-4 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-40 bg-indigo-50/95 border-2 border-dashed border-[#4F5AF5] rounded-2xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs animate-in fade-in duration-150">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-indigo-200 flex items-center justify-center text-[#4F5AF5] mb-3 animate-bounce">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Suelta tu archivo aquí</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Se procesará e integrará automáticamente en {activeFolder ? `la carpeta "${activeFolder.name}"` : 'la Base de Conocimiento'}.
              </p>
              <span className="mt-3 text-[10px] font-bold text-[#4F5AF5] bg-white px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
                Formatos permitidos: PDF, DOCX, TXT, Diagramas PNG/JPG/WEBP (hasta 25 MB)
              </span>
            </div>
          )}
          {/* Header Panel Derecho con Breadcrumbs y Acciones */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
              {/* Breadcrumb Path */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
                  <span
                    onClick={() => setSelectedFolderId('all')}
                    className="hover:text-[#4F5AF5] cursor-pointer font-semibold text-slate-500"
                  >
                    Base de Conocimiento
                  </span>
                  <span>/</span>
                  {selectedFolderId === 'all' && (
                    <span className="text-slate-800 font-bold">Todas las Fichas</span>
                  )}
                  {selectedFolderId === 'root' && (
                    <span className="text-slate-800 font-bold">Sin Carpeta (General)</span>
                  )}
                  {activeFolder && (
                    <>
                      {activeFolder.parent_id && (
                        <>
                          <span
                            onClick={() => setSelectedFolderId(activeFolder.parent_id!)}
                            className="hover:text-[#4F5AF5] cursor-pointer text-slate-500"
                          >
                            {folderById.get(activeFolder.parent_id)?.name}
                          </span>
                          <span>/</span>
                        </>
                      )}
                      <span className="text-slate-900 font-bold flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {activeFolder.name}
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Nivel {activeFolder.level}
                        </span>
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {selectedFolderId === 'all'
                    ? 'Todas las Fichas Institucionales'
                    : selectedFolderId === 'root'
                    ? 'Fichas sin Carpeta Asignada'
                    : activeFolder?.name || 'Carpeta'}
                </h2>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGuide(prev => !prev)}
                  className="p-2 rounded-xl text-slate-500 hover:text-[#4F5AF5] hover:bg-slate-100 transition-colors border border-slate-200"
                  title="¿Qué puedo subir y cómo lo interpreta Teo?"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {activeFolder && activeFolder.level < 3 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateFolder(activeFolder)}
                    className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-[#4F5AF5] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                    title={`Crear subcarpeta dentro de "${activeFolder.name}" (Nivel ${activeFolder.level + 1})`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Subcarpeta</span>
                  </button>
                )}

                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFile} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    uploading
                      ? 'border border-indigo-300 bg-indigo-50 text-[#4F5AF5] shadow-xs ring-2 ring-indigo-400/20 animate-pulse'
                      : 'border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B]'
                  }`}
                  title="Subir documento o diagrama a esta carpeta"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F5AF5]" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploading ? 'Procesando documento...' : 'Subir Doc'}</span>
                </button>

                <button
                  type="button"
                  onClick={openNew}
                  className="flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Ficha</span>
                </button>
              </div>
            </div>

            {/* Buscador de fichas */}
            <div className="mt-3.5 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={entrySearchTerm}
                onChange={e => setEntrySearchTerm(e.target.value)}
                placeholder="Buscar fichas por título o contenido..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]/20 focus:border-[#4F5AF5]"
              />
              {entrySearchTerm && (
                <button
                  onClick={() => setEntrySearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Guía Desplegable ── */}
          {showGuide && (
            <div className="bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#EEF2FF] border border-[#E2E8F0] rounded-2xl p-4 text-xs text-[#334155] shadow-xs">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4F5AF5]" />
                  <span className="font-bold text-sm text-[#1E293B]">Guía de Formatos e Interpretación de TEO</span>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-[#94A3B8] hover:text-[#1E293B]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-white rounded-xl p-3 border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Documentos de Texto (.pdf, .docx, .txt)</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed">
                    Extrae fragmentos temáticos para alimentar políticas, glosarios, normativas y reglas de negocio por carpeta.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span>Diagramas con IA Vision (.png, .jpg)</span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed">
                    Gemini Vision transcribe esquemas C4, BPMN y arquitecturas Cloud generando fichas detalladas de integración.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Formulario de Nueva / Edición de Ficha ── */}
          {showForm && (
            <div className="bg-[#EEF2FF] border border-[#4F5AF5]/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#4F5AF5]/20">
                <h4 className="font-bold text-sm text-[#1E293B]">
                  {editing ? 'Editar Ficha de Conocimiento' : 'Nueva Ficha de Conocimiento'}
                </h4>
                <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">Título de la Ficha</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Glosario de VPs y Direcciones TI"
                  className="w-full border border-[#CBD5E1] bg-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">Carpeta de Destino</label>
                <select
                  value={form.folder_id}
                  onChange={e => setForm(p => ({ ...p, folder_id: e.target.value }))}
                  className="w-full border border-[#CBD5E1] bg-white rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
                >
                  <option value="">📂 Sin carpeta (Raíz / General)</option>
                  {flattenedFolderOptions.map(f => (
                    <option key={f.id} value={f.id}>
                      {'  '.repeat(f.level - 1) + (f.level > 1 ? '↳ ' : '') + `📁 ${f.name} (Nivel ${f.level})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">Contenido de la Ficha</label>
                <textarea
                  rows={6}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Redacta la política, regla, estándar o definición técnica que TEO debe recordar..."
                  className="w-full border border-[#CBD5E1] bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] resize-none leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="px-4 py-1.5 rounded-xl bg-[#4F5AF5] hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Guardar Ficha
                </button>
              </div>
            </div>
          )}

          {/* ── Lista de Fichas ── */}
          <div className="space-y-3">
            {/* Si está subiendo y procesando un archivo, mostrar banner y skeletons activos */}
            {uploading && uploadingFile && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/50 border border-indigo-200/80 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#4F5AF5] text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-indigo-100 animate-pulse">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1E293B] truncate">
                          Extrayendo fichas de "{uploadingFile.name}"
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-[#4F5AF5] shrink-0">
                          {uploadSeconds}s
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700/90 font-medium truncate mt-0.5">
                        {stageText}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Loader2 className="w-4 h-4 text-[#4F5AF5] animate-spin" />
                  </div>
                </div>

                {/* 3 Skeletons de Fichas con efecto Shimmer */}
                {[1, 2, 3].map(n => (
                  <div key={n} className="border border-indigo-100/70 rounded-2xl p-4 bg-white/90 shadow-2xs space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-slate-200 rounded-md w-2/5" />
                      <div className="h-4 bg-indigo-100/70 rounded-md w-20" />
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-3 bg-slate-100 rounded w-11/12" />
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredEntries.length === 0 && !showForm && !uploading && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No hay fichas en esta vista</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {entrySearchTerm
                    ? 'No se encontraron fichas que coincidan con la búsqueda.'
                    : 'Esta carpeta aún no tiene fichas de conocimiento. Puedes crear una ficha o subir un documento.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openNew}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4F5AF5] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Ficha</span>
                  </button>
                  {activeFolder && activeFolder.level < 3 && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFolder(activeFolder)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4F5AF5] border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ Crear Subcarpeta</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      uploading
                        ? 'bg-indigo-50 border border-indigo-200 text-[#4F5AF5] cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{uploading ? 'Procesando archivo...' : 'Subir Documento'}</span>
                  </button>
                </div>
              </div>
            )}

            {filteredEntries.map(e => (
              <ContextCard
                key={e.id}
                entry={e}
                folderPath={e.folder_id ? folderPathMap.get(e.folder_id) : undefined}
                onEdit={() => openEdit(e)}
                onToggle={() => onToggle(e.id)}
                onDelete={() => setDeletingEntry(e)}
                onMove={() => handleOpenMoveEntry(e)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal de Crear / Renombrar Carpeta ── */}
      {folderModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setFolderModal({ isOpen: false, mode: 'create' })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveFolderSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1E293B]">
                    {folderModal.mode === 'edit'
                      ? 'Renombrar Carpeta'
                      : folderModal.parentFolder
                      ? `Nueva Subcarpeta (Nivel ${folderModal.parentFolder.level + 1} de 3)`
                      : 'Nueva Carpeta Raíz (Nivel 1 de 3)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {folderModal.parentFolder
                      ? `Dentro de "${folderModal.parentFolder.name}"`
                      : 'En la raíz de la base de conocimiento'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Carpeta</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={folderNameInput}
                  onChange={e => setFolderNameInput(e.target.value)}
                  placeholder="Ej: Políticas de Ciberseguridad"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFolderModal({ isOpen: false, mode: 'create' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!folderNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#4F5AF5] hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación de Eliminación de Carpeta ── */}
      {deleteFolderModal.isOpen && deleteFolderModal.folder && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDeleteFolderModal({ isOpen: false, folder: null, deleteItems: false })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#1E293B]">¿Eliminar carpeta de conocimiento?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Estás a punto de eliminar la carpeta <strong className="text-slate-900">"{deleteFolderModal.folder.name}"</strong> (Nivel {deleteFolderModal.folder.level}).
                </p>

                <div className="mt-3.5 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteItemsRadio"
                      checked={!deleteFolderModal.deleteItems}
                      onChange={() => setDeleteFolderModal(p => ({ ...p, deleteItems: false }))}
                      className="mt-0.5 text-[#4F5AF5] focus:ring-[#4F5AF5]"
                    />
                    <div>
                      <strong className="text-slate-800">Conservar fichas</strong>
                      <p className="text-[11px] text-slate-500">Mueve las fichas a la raíz / general para no perder información.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-200">
                    <input
                      type="radio"
                      name="deleteItemsRadio"
                      checked={deleteFolderModal.deleteItems}
                      onChange={() => setDeleteFolderModal(p => ({ ...p, deleteItems: true }))}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <strong className="text-rose-700">Eliminar carpeta y sus fichas</strong>
                      <p className="text-[11px] text-slate-500">Borra permanentemente la carpeta y todas las fichas en su interior.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setDeleteFolderModal({ isOpen: false, folder: null, deleteItems: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, eliminar carpeta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Mover Ficha a Otra Carpeta ── */}
      {moveEntryModal.isOpen && moveEntryModal.entry && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMoveEntryModal({ isOpen: false, entry: null, targetFolderId: '' })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F5AF5] shrink-0">
                <FolderInput className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-[#1E293B]">Mover Ficha a Carpeta</h3>
                <p className="text-xs text-slate-500 truncate">"{moveEntryModal.entry.title}"</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Selecciona la carpeta de destino:</label>
              <select
                value={moveEntryModal.targetFolderId}
                onChange={e => setMoveEntryModal(p => ({ ...p, targetFolderId: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F5AF5]"
              >
                <option value="">📂 Sin carpeta (Raíz / General)</option>
                {flattenedFolderOptions.map(f => (
                  <option key={f.id} value={f.id}>
                    {'  '.repeat(f.level - 1) + (f.level > 1 ? '↳ ' : '') + `📁 ${f.name} (Nivel ${f.level})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setMoveEntryModal({ isOpen: false, entry: null, targetFolderId: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveEntry}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4F5AF5] hover:bg-indigo-600 text-white shadow-xs cursor-pointer"
              >
                Mover Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación para Eliminar Ficha ── */}
      {deletingEntry && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDeletingEntry(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#1E293B]">¿Eliminar ficha de conocimiento?</h3>
                <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar la ficha <strong className="text-[#1E293B]">"{deletingEntry.title}"</strong>?
                </p>
                <div className="mt-3 bg-rose-50/80 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-700 leading-relaxed">
                  ⚠️ <strong>Esta acción no se puede deshacer.</strong> El asistente TEO dejará de usar esta información como contexto de referencia en las conversaciones.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-slate-100 border border-[#E2E8F0] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const title = deletingEntry.title;
                  onDelete(deletingEntry.id);
                  showToast(`Ficha "${title}" eliminada correctamente.`, 'info');
                  setDeletingEntry(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sí, eliminar ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast de Notificación Flotante ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100 p-0.5 rounded-md hover:bg-black/5"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Helper local function to render a node and its children recursively up to level 3
  function renderFolderTreeNode(node: FolderTreeNode) {
    const isSelected = selectedFolderId === node.id;
    const isExpanded = expandedFolderIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const canHaveChildren = node.level < 3;

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          onClick={() => setSelectedFolderId(node.id)}
          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
            isSelected
              ? 'bg-[#EEF2FF] text-[#4F5AF5] font-bold border border-[#4F5AF5]/30'
              : 'text-slate-700 hover:bg-slate-100 font-medium'
          }`}
          style={{ paddingLeft: `${Math.max(0.6, (node.level - 1) * 1.1 + 0.6)}rem` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleFolderExpand(node.id, e)}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            {isExpanded ? (
              <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#4F5AF5]' : 'text-amber-500'}`} />
            ) : (
              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#4F5AF5]' : 'text-amber-500'}`} />
            )}
            <span className="truncate max-w-[140px]" title={node.name}>{node.name}</span>
            <span className="text-[9px] font-black uppercase text-slate-400">L{node.level}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              isSelected ? 'bg-indigo-100 text-[#4F5AF5]' : 'bg-slate-100 text-slate-500'
            }`}>
              {node.itemCount}
            </span>

            {/* Menu acciones de carpeta */}
            <div className={`flex items-center gap-0.5 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {canHaveChildren && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenCreateFolder(node); }}
                  className="p-1 rounded-md bg-indigo-50/60 hover:bg-indigo-100 text-[#4F5AF5] border border-indigo-200/60"
                  title={`Crear subcarpeta dentro de "${node.name}" (Nivel ${node.level + 1})`}
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenEditFolder(node); }}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-indigo-600"
                title="Renombrar carpeta"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenDeleteFolder(node); }}
                className="p-1 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-600"
                title="Eliminar carpeta"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Subcarpetas anidadas */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-4 space-y-0.5">
            {node.children.map(child => renderFolderTreeNode(child))}
          </div>
        )}
      </div>
    );
  }
}

function ContextCard({
  entry,
  folderPath,
  onEdit,
  onToggle,
  onDelete,
  onMove
}: {
  entry: TrainingEntry;
  folderPath?: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: () => void;
}) {
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
                    <textarea
                      value={editing.text}
                      onChange={e => setEditing(prev => prev ? { ...prev, text: e.target.value } : null)}
                      autoFocus
                      rows={2}
                      className="flex-1 border border-[#E2E8F0] bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] resize-y min-h-[38px]"
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
                <span className="text-xs text-[#94A3B8] ml-auto">{formatDateDDMMYYYY(fb.created_at)}</span>
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

// ─── Tab: Apariencia (Personalización de Nombre e Icono) ─────────────────────
function AppearanceTab({ entries, onCreate, onUpdate }: {
  entries: TrainingEntry[];
  onCreate: (p: Partial<TrainingEntry>) => Promise<TrainingEntry>;
  onUpdate: (id: string, p: Partial<TrainingEntry>) => void;
}) {
  const aiNameSetting = entries.find(e => e.layer === 'settings' && e.title === 'ai_name');
  const aiAvatarSetting = entries.find(e => e.layer === 'settings' && e.title === 'ai_avatar');

  const [aiName, setAiName] = useState(aiNameSetting?.content || 'Asistente IA');
  const [aiAvatar, setAiAvatar] = useState(aiAvatarSetting?.content || '');
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (aiNameSetting) setAiName(aiNameSetting.content);
  }, [aiNameSetting]);

  useEffect(() => {
    if (aiAvatarSetting) setAiAvatar(aiAvatarSetting.content);
  }, [aiAvatarSetting]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAiName(e.target.value);
    setSaved(false);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 1.5MB for Base64 storage
    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMsg('La imagen supera el límite de 1.5 MB para el avatar.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setAiAvatar(base64Url);
        setSaved(false);
        setSuccessMsg('Imagen cargada correctamente en la vista previa.');
      } else {
        setErrorMsg('No se pudo procesar el formato de la imagen.');
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo de imagen.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (aiNameSetting) {
        onUpdate(aiNameSetting.id, { content: aiName });
      } else {
        await onCreate({ layer: 'settings', title: 'ai_name', content: aiName, is_active: true, sort_order: 0, source: 'manual' });
      }

      if (aiAvatarSetting) {
        onUpdate(aiAvatarSetting.id, { content: aiAvatar });
      } else {
        await onCreate({ layer: 'settings', title: 'ai_avatar', content: aiAvatar, is_active: true, sort_order: 0, source: 'manual' });
      }

      setSaved(true);
      setSuccessMsg('¡Configuración de la IA guardada correctamente!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg('Error al guardar en el servidor: ' + (err.message || err));
    }
  };

  const removeAvatar = () => {
    setAiAvatar('');
    setSaved(false);
    setErrorMsg(null);
    setSuccessMsg('Avatar removido. Se utilizará el icono por defecto.');
  };

  // Modern preset avatars
  const presets = [
    { name: 'Bot Azul', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60' }, 
    { name: 'Bot Morado', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100&auto=format&fit=crop&q=60' }, 
    { name: 'Bot Moderno', url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=100&auto=format&fit=crop&q=60' }, 
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Configuration Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-6">
        <div>
          <h2 className="font-bold text-[#1E293B]">Personalización del Asistente</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Configura el nombre y la foto de perfil que tus colaboradores verán en los chats y pantallas de carga.</p>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 p-0.5 rounded-lg"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600 p-0.5 rounded-lg"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* AI Name Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#475569]">Nombre del Asistente</label>
          <input
            type="text"
            value={aiName}
            onChange={handleNameChange}
            placeholder="Ej. Asistente IA, Analista de TI..."
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F5AF5] focus:border-[#4F5AF5] transition-colors"
          />
        </div>

        {/* AI Avatar Picker */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#475569] block">Foto de Perfil (Avatar)</label>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
              {aiAvatar ? (
                <>
                  <img src={aiAvatar} alt="Vista previa" className="w-full h-full object-cover" />
                  <button
                    onClick={removeAvatar}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold"
                  >
                    Eliminar
                  </button>
                </>
              ) : (
                <Bot className="w-8 h-8 text-[#94A3B8]" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <label className="inline-flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-[#E2E8F0]">
                <Upload className="w-3.5 h-3.5" />
                {isUploading ? 'Procesando...' : 'Subir imagen'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <p className="text-[10px] text-[#94A3B8]">Formatos recomendados: PNG, JPG o SVG. Máx 1.5MB.</p>
            </div>
          </div>

          {/* Preset options */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">O preseleccionar de la galería</span>
            <div className="flex gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => { setAiAvatar(preset.url); setSaved(false); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`w-10 h-10 rounded-full border overflow-hidden transition-all ${
                    aiAvatar === preset.url ? 'ring-2 ring-[#4F5AF5] border-transparent scale-105' : 'border-[#E2E8F0] hover:scale-105'
                  }`}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                </button>
              ))}
              <button
                onClick={() => { setAiAvatar(''); setSaved(false); setErrorMsg(null); setSuccessMsg(null); }}
                className={`w-10 h-10 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center text-xs font-bold text-[#64748B] hover:scale-105 transition-all ${
                  !aiAvatar ? 'ring-2 ring-[#4F5AF5] border-transparent scale-105' : ''
                }`}
                title="Avatar por defecto (Bot)"
              >
                <Bot className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saved || isUploading}
            className="flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Visual Preview Card */}
      <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between h-full min-h-[350px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#1E293B]">Vista previa en tiempo real</h3>
          <p className="text-[10px] text-[#64748B]">Así se verá la IA en la interfaz de chat de tus usuarios.</p>
        </div>

        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden max-w-sm w-full">
            {/* Mock Header */}
            <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center gap-2.5 bg-[#4F5AF5]">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {aiAvatar ? (
                  <img src={aiAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{aiName}</p>
                <p className="text-[9px] text-blue-200">En línea</p>
              </div>
            </div>

            {/* Mock Message Area */}
            <div className="p-4 space-y-3 bg-[#F8FAFC] h-32 flex flex-col justify-end">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                  {aiAvatar ? (
                    <img src={aiAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-[#4F5AF5]" />
                  )}
                </div>
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl rounded-tl-none shadow-sm text-[11px] text-[#334155] leading-relaxed max-w-[80%]">
                  Hola. Cuéntame sobre tu iniciativa de negocio.
                  <p className="text-[9px] text-[#94A3B8] mt-1 font-semibold">{aiName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
