import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  Copy,
  Download,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Clock,
  Layers,
  Building2,
  SlidersHorizontal,
  X,
  FileText,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Volume2,
  ListChecks,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatChatMarkdown, formatHtmlText } from '../lib/formatHtml';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { HybridSpeechRecognizer, isWebSpeechSupported } from '../lib/speechService';

interface DraftPreview {
  titulo_de_la_necesidad?: string;
  objetivo?: string;
  descripcion_de_la_necesidad?: string;
  beneficio_cuantitativo_anual?: string;
  proceso_y_areas_impactadas?: string;
  qu_pasa_si_no_lo_tenemos_en_esta_fecha?: string;
  sistemas_involucrados?: string[];
  institucion_sugerida?: string;
}

interface DimensionScore {
  score: number;
  comment: string;
}

interface Dimensions {
  problema_raiz?: DimensionScore;
  impacto_usuarios?: DimensionScore;
  metricas_exito?: DimensionScore;
  ecosistema_ti?: DimensionScore;
  restricciones_plazos?: DimensionScore;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachment?: {
    name: string;
    type?: string;
    size?: number;
  };
  options?: string[];
  timestamp: string;
}

export const TeoSandbox: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // ── Sandbox Availability State ──────────────────────────────────────────
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);

  // ── Chat State ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: '¡Hola! Soy **Teo**, tu **Business Partner de TI (BP TI) Senior** para **Laureate Perú** (UPC, UPN y Cibertec).\n\nMi misión es acompañarte a transformar tu idea o dolor operativo en una **necesidad técnica y funcional rigurosa**, lista para ser evaluada por los comités de TI.\n\nCuéntame con total libertad: **¿Qué situación, problema o mejora operativa deseas abordar en tu institución?** Puedes escribirlo, dictarlo por voz con el micrófono o arrastrar documentos con el clip 📎.',
      options: [
        'Optimización en los periodos pico de matrícula web',
        'Alerta temprana y predictiva para la retención estudiantil',
        'Automatización en convenios de pago y cobranzas con SAP'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [activeViewTab, setActiveViewTab] = useState<'chat' | 'draft'>('chat');
  const [justUpdatedDraft, setJustUpdatedDraft] = useState<boolean>(false);

  // ── Draft & Dimensions State ────────────────────────────────────────────
  const [draft, setDraft] = useState<DraftPreview>({
    titulo_de_la_necesidad: '',
    objetivo: '',
    descripcion_de_la_necesidad: '',
    beneficio_cuantitativo_anual: '',
    proceso_y_areas_impactadas: '',
    qu_pasa_si_no_lo_tenemos_en_esta_fecha: '',
    sistemas_involucrados: [],
    institucion_sugerida: 'Laureate Perú (Corporativo)'
  });

  const [dimensions, setDimensions] = useState<Dimensions>({
    problema_raiz: { score: 0, comment: 'Por iniciar conversación con Teo.' },
    impacto_usuarios: { score: 0, comment: 'Por iniciar conversación con Teo.' },
    metricas_exito: { score: 0, comment: 'Por iniciar conversación con Teo.' },
    ecosistema_ti: { score: 0, comment: 'Por iniciar conversación con Teo.' },
    restricciones_plazos: { score: 0, comment: 'Por iniciar conversación con Teo.' }
  });

  const [readinessScore, setReadinessScore] = useState<number>(0);

  // ── Audio / STT & Microphone Devices ────────────────────────────────────
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showMicSelector, setShowMicSelector] = useState<boolean>(false);

  // ── Teo Profile (Avatar & Name) ─────────────────────────────────────────
  const [aiAvatar, setAiAvatar] = useState<string>('');
  const [aiName, setAiName] = useState<string>('Teo');

  const hybridRecognizerRef = useRef<HybridSpeechRecognizer | null>(null);
  const baseInputRef = useRef<string>('');
  const timerRef = useRef<any>(null);

  // ── Attachment State ────────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    type: string;
    size: number;
    extractedText?: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Action / Modal States ───────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSavingOfficial, setIsSavingOfficial] = useState<boolean>(false);
  const [officialDraftCreatedId, setOfficialDraftCreatedId] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Auto-scroll chat ────────────────────────────────────────────────────
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  // ── Check Sandbox Status ────────────────────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch('/api/sandbox/status');
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(Boolean(data.enabled));
        } else {
          const { data } = await supabase
            .from('site_settings')
            .select('sandbox_enabled')
            .eq('id', 1)
            .maybeSingle();
          setIsEnabled(data?.sandbox_enabled ?? true);
        }
      } catch {
        setIsEnabled(true);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, []);

  // ── Load Teo Profile (Avatar & Name) ────────────────────────────────────
  useEffect(() => {
    const loadAiProfile = async () => {
      try {
        const res = await fetch('/api/config/features');
        if (res.ok) {
          const data = await res.json();
          if (data.aiAvatar) setAiAvatar(data.aiAvatar);
          if (data.aiName) setAiName(data.aiName);
        }
        const { data: dbData } = await supabase
          .from('ai_training_config')
          .select('title, content')
          .eq('layer', 'settings');
        if (dbData) {
          const av = dbData.find((e: any) => e.title === 'ai_avatar')?.content;
          const nm = dbData.find((e: any) => e.title === 'ai_name')?.content;
          if (av) setAiAvatar(av);
          if (nm) setAiName(nm);
        }
      } catch (err) {
        console.warn('Error cargando perfil de Teo:', err);
      }
    };
    loadAiProfile();
  }, []);

  // ── Initialize Microphone Devices ───────────────────────────────────────
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devs = await navigator.mediaDevices.enumerateDevices();
        const inputs = devs.filter((d) => d.kind === 'audioinput');
        setAudioDevices(inputs);
        if (inputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Error enumerating audio devices:', err);
      }
    };

    getDevices();

    return () => {
      if (hybridRecognizerRef.current) {
        hybridRecognizerRef.current.abort();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Microphone Selector Trigger & Request Permissions ───────────────────
  const refreshDevicesWithPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const devs = await navigator.mediaDevices.enumerateDevices();
      const inputs = devs.filter((d) => d.kind === 'audioinput');
      setAudioDevices(inputs);
      if (inputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
      setShowMicSelector(true);
    } catch (err: any) {
      setAudioError('Por favor permite el acceso al micrófono en el navegador para elegir el dispositivo.');
    }
  };

  // ── Voice Recording Handler (Dual Engine: Web Speech API Live + Groq Whisper Large v3 Fallback) ──
  const startRecording = useCallback(async () => {
    setAudioError(null);
    setRecordingSeconds(0);
    baseInputRef.current = inputMessage;

    try {
      const recognizer = new HybridSpeechRecognizer();
      hybridRecognizerRef.current = recognizer;

      await recognizer.start({
        deviceId: selectedDeviceId || undefined,
        lang: 'es-PE',
        onInterimText: (interim) => {
          const base = baseInputRef.current ? baseInputRef.current + ' ' : '';
          setInputMessage(base + interim);
        },
        onFinalText: (finalText) => {
          const base = baseInputRef.current ? baseInputRef.current + ' ' : '';
          setInputMessage(base + finalText);
          baseInputRef.current = base + finalText;
        },
        onError: (err) => {
          console.warn('[STT] Recognizer notice:', err);
        }
      });

      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 59) {
            stopRecording();
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado en tu navegador.'
        : `No se pudo conectar al micrófono: ${err.message}`;
      setAudioError(msg);
      showToast(msg, 'error');
    }
  }, [selectedDeviceId, inputMessage]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    if (hybridRecognizerRef.current) {
      setIsTranscribing(true);
      try {
        const text = await hybridRecognizerRef.current.stop();
        if (text?.trim()) {
          const base = baseInputRef.current ? baseInputRef.current + ' ' : '';
          const full = (base + text).trim();
          setInputMessage(full);
          showToast('¡Voz transcrita exitosamente!', 'success');
        }
      } catch (err: any) {
        console.warn('STT stop error:', err);
        setAudioError('Error al procesar voz: ' + (err.message || 'desconocido'));
      } finally {
        setIsTranscribing(false);
        hybridRecognizerRef.current = null;
      }
    }
  }, []);

  // ── Document Attachment Handler ─────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('El archivo supera el límite de 25 MB.', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/chat/attach-file', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Error al procesar el archivo');
      const data = await res.json();

      setAttachedFile({
        file,
        name: file.name,
        type: file.type || 'documento',
        size: file.size,
        extractedText: data.content || ''
      });

      showToast(`Archivo "${file.name}" cargado y listo para análisis.`, 'success');
    } catch (err: any) {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setAttachedFile({
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          extractedText: text
        });
        showToast(`Archivo "${file.name}" cargado.`, 'success');
      } else {
        showToast('No se pudo procesar el contenido del archivo.', 'error');
      }
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Send Message to Teo BP TI Engine ────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend !== undefined ? textToSend : inputMessage;
    if (!message.trim() && !attachedFile) return;

    const userText = message.trim();
    const currentAttachment = attachedFile ? { ...attachedFile } : undefined;

    // Reset input states
    setInputMessage('');
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newMsgId = 'user-' + Date.now();
    const newChatHistory: ChatMessage[] = [
      ...messages,
      {
        id: newMsgId,
        role: 'user',
        text: userText,
        attachment: currentAttachment
          ? {
              name: currentAttachment.name,
              type: currentAttachment.type,
              size: currentAttachment.size
            }
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newChatHistory);
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/sandbox/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newChatHistory.map((m) => ({ role: m.role, text: m.text })),
          message: userText,
          currentDraft: draft,
          attachment: currentAttachment
            ? {
                name: currentAttachment.name,
                type: currentAttachment.type,
                textContent: currentAttachment.extractedText
              }
            : undefined
        })
      });

      if (res.status === 403) {
        setIsEnabled(false);
        showToast('El Sandbox ha sido desactivado por la Dirección de TI.', 'error');
        return;
      }

      if (!res.ok) throw new Error('Error en el servicio cognitivo de Teo');
      const responseData = await res.json();
      const aiData = responseData.data;

      // Update Teo's response
      const teoMsg: ChatMessage = {
        id: 'teo-' + Date.now(),
        role: 'model',
        text: aiData.text || 'Entendido. Sigamos profundizando en los detalles operativos.',
        options: aiData.options || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, teoMsg]);

      // Update Draft fields in live split-screen
      if (aiData.draftPreview) {
        setDraft((prev) => ({
          ...prev,
          ...aiData.draftPreview,
          sistemas_involucrados: aiData.draftPreview.sistemas_involucrados || prev.sistemas_involucrados
        }));
        setJustUpdatedDraft(true);
        setTimeout(() => setJustUpdatedDraft(false), 6000);
      }

      // Update Maturity Dimensions
      if (aiData.dimensions) {
        setDimensions(aiData.dimensions);
      }

      // Update Readiness Score
      if (typeof aiData.readinessScore === 'number') {
        setReadinessScore(aiData.readinessScore);
      }
    } catch (err: any) {
      console.error('Error in Teo Sandbox Chat:', err);
      const errorMsg: ChatMessage = {
        id: 'teo-err-' + Date.now(),
        role: 'model',
        text: 'Hubo una breve interrupción en la conexión con el motor cognitivo. Por favor, reformula o envía nuevamente tu mensaje.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // ── Quick Option Click ──────────────────────────────────────────────────
  const handleQuickOption = (opt: string) => {
    handleSendMessage(opt);
  };

  // ── Restart Session ─────────────────────────────────────────────────────
  const handleResetSession = () => {
    if (window.confirm('¿Deseas reiniciar la sesión de prueba del Sandbox? Se limpiará la conversación y la ficha actual.')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          text: '¡Sesión reiniciada! Soy **Teo**, tu **BP TI Senior** para **Laureate Perú**.\n\nPlantea cualquier nueva iniciativa o dolor operativo con total libertad. ¿Qué desafío abordamos hoy?',
          options: [
            'Optimización en los periodos pico de matrícula web',
            'Alerta temprana y predictiva para la retención estudiantil',
            'Automatización en convenios de pago y cobranzas con SAP'
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setDraft({
        titulo_de_la_necesidad: '',
        objetivo: '',
        descripcion_de_la_necesidad: '',
        beneficio_cuantitativo_anual: '',
        proceso_y_areas_impactadas: '',
        qu_pasa_si_no_lo_tenemos_en_esta_fecha: '',
        sistemas_involucrados: [],
        institucion_sugerida: 'Laureate Perú (Corporativo)'
      });
      setDimensions({
        problema_raiz: { score: 0, comment: 'Por iniciar conversación con Teo.' },
        impacto_usuarios: { score: 0, comment: 'Por iniciar conversación con Teo.' },
        metricas_exito: { score: 0, comment: 'Por iniciar conversación con Teo.' },
        ecosistema_ti: { score: 0, comment: 'Por iniciar conversación con Teo.' },
        restricciones_plazos: { score: 0, comment: 'Por iniciar conversación con Teo.' }
      });
      setReadinessScore(0);
      setOfficialDraftCreatedId(null);
      showToast('Sesión de Sandbox reiniciada.', 'info');
    }
  };

  // ── Action 1: Copy Formatted Markdown to Clipboard ─────────────────────
  const handleCopyMarkdown = () => {
    const md = `
# LAUREATE PERÚ — FICHA DE NECESIDAD TI
**Generada y Articulada con Asistencia de Teo (BP TI Senior)**
*Nivel de Madurez / Claridad: ${readinessScore}%*

---

### 1. DATOS GENERALES
- **Título de la Necesidad:** ${draft.titulo_de_la_necesidad || 'Pendiente de definir'}
- **Institución / Alcance:** ${draft.institucion_sugerida || 'Laureate Perú (Corporativo)'}
- **Fecha de Articulación:** ${new Date().toLocaleDateString('es-PE')}

### 2. OBJETIVO SMART
${draft.objetivo || 'No especificado aún.'}

### 3. DESCRIPCIÓN DEL PROBLEMA DE NEGOCIO (DOLOR OPERATIVO)
${draft.descripcion_de_la_necesidad || 'No especificado aún.'}

### 4. IMPACTO Y BENEFICIOS
- **Beneficio Cuantitativo Anual:** ${draft.beneficio_cuantitativo_anual || 'En evaluación'}
- **Procesos y Áreas Impactadas:** ${draft.proceso_y_areas_impactadas || 'En evaluación'}

### 5. ARQUITECTURA Y ECOSISTEMA TI
- **Sistemas Involucrados:** ${draft.sistemas_involucrados?.join(', ') || 'Banner, Blackboard, etc.'}

### 6. RIESGOS Y PLAZOS
- **¿Qué pasa si no lo tenemos para esta fecha?:** ${draft.qu_pasa_si_no_lo_tenemos_en_esta_fecha || 'En evaluación'}

---
*Documento exportado desde el Laboratorio Teo (IACS)*
`.trim();

    navigator.clipboard.writeText(md);
    showToast('¡Ficha copiada al portapapeles en formato Markdown!', 'success');
  };

  // ── Action 2: Download Executive HTML / Printable Summary ───────────────
  const handleDownloadSummary = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ficha Ejecutiva — ${draft.titulo_de_la_necesidad || 'Iniciativa TI'}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; margin: 40px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 25px; }
    .header h1 { font-size: 20px; color: #EB5F46; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; }
    .header h2 { font-size: 16px; color: #0F172A; margin: 5px 0 10px; }
    .score-badge { display: inline-block; background: #EEF2FF; color: #4338CA; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 13px; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 13px; font-weight: bold; color: #FFFFFF; background: #EB5F46; padding: 6px 12px; border-radius: 4px; text-transform: uppercase; margin-bottom: 10px; }
    .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 16px; font-size: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LAUREATE PERÚ — TECNOLOGÍAS DE LA INFORMACIÓN</h1>
    <h2>Ficha Ejecutiva de Articulación de Necesidad</h2>
    <div class="score-badge">Índice de Madurez Teo: ${readinessScore}%</div>
  </div>

  <div class="section">
    <div class="section-title">1. Título de la Necesidad e Institución</div>
    <div class="box">
      <strong>Título:</strong> ${draft.titulo_de_la_necesidad || 'Pendiente'}<br>
      <strong>Institución:</strong> ${draft.institucion_sugerida || 'Laureate Perú'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Objetivo SMART</div>
    <div class="box">${draft.objetivo || 'Pendiente'}</div>
  </div>

  <div class="section">
    <div class="section-title">3. Descripción del Problema Operativo</div>
    <div class="box">${draft.descripcion_de_la_necesidad || 'Pendiente'}</div>
  </div>

  <div class="section">
    <div class="section-title">4. Impacto y Beneficio Cuantitativo</div>
    <div class="grid">
      <div class="box">
        <strong>Beneficio Anual:</strong><br>${draft.beneficio_cuantitativo_anual || 'En evaluación'}
      </div>
      <div class="box">
        <strong>Áreas y Procesos:</strong><br>${draft.proceso_y_areas_impactadas || 'En evaluación'}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">5. Ecosistema de Sistemas TI Involucrados</div>
    <div class="box">${draft.sistemas_involucrados?.join(', ') || 'Por definir'}</div>
  </div>

  <div class="section">
    <div class="section-title">6. ¿Qué pasa si no lo tenemos en la fecha requerida?</div>
    <div class="box">${draft.qu_pasa_si_no_lo_tenemos_en_esta_fecha || 'En evaluación'}</div>
  </div>

  <div class="footer">
    Documento oficial generado por el Asistente Inteligente Teo (IACS) • Laureate Perú
  </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ficha_Teo_${(draft.titulo_de_la_necesidad || 'Iniciativa').replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Ficha Ejecutiva descargada con éxito.', 'success');
  };

  // ── Action 3: Convert to Official IACS Draft ────────────────────────────
  const handleConvertToOfficialDraft = async () => {
    if (!draft.titulo_de_la_necesidad && !draft.descripcion_de_la_necesidad) {
      showToast('Aún no hay suficiente contenido articulado para crear un borrador.', 'error');
      return;
    }

    setIsSavingOfficial(true);
    try {
      const payload = {
        title: draft.titulo_de_la_necesidad || 'Iniciativa articulada en Sandbox Teo',
        description: draft.descripcion_de_la_necesidad || '',
        status: 'Borrador',
        stage: 'borrador',
        creator_id: user?.id || null,
        creator_email: user?.email || profile?.email || 'cio.sandbox@laureate.net',
        form_data: {
          titulo: draft.titulo_de_la_necesidad,
          titulo_de_la_necesidad: draft.titulo_de_la_necesidad,
          objetivo: draft.objetivo,
          descripcion_de_la_necesidad: draft.descripcion_de_la_necesidad,
          beneficio_cuantitativo_anual: draft.beneficio_cuantitativo_anual,
          proceso_y_areas_impactadas: draft.proceso_y_areas_impactadas,
          qu_pasa_si_no_lo_tenemos_en_esta_fecha: draft.qu_pasa_si_no_lo_tenemos_en_esta_fecha,
          sistemas_involucrados: draft.sistemas_involucrados,
          institucion: draft.institucion_sugerida,
          registrador: profile?.name || user?.email || 'CIO / Evaluador Sandbox'
        },
        chat_history: messages.map((m) => ({ role: m.role, text: m.text }))
      };

      const { data, error } = await supabase
        .from('initiatives')
        .insert([payload])
        .select('id')
        .single();

      if (error) throw error;

      setOfficialDraftCreatedId(data.id);
      showToast('¡Iniciativa guardada formalmente como Borrador Oficial en IACS!', 'success');
    } catch (err: any) {
      console.error('Error creating official draft:', err);
      showToast('Error al registrar la iniciativa en la base de datos oficial: ' + err.message, 'error');
    } finally {
      setIsSavingOfficial(false);
    }
  };

  // ── Render: Maintenance Screen if Disabled ──────────────────────────────
  if (!checkingStatus && isEnabled === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Laureate Perú • IACS
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Laboratorio Teo en Mantenimiento
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Esta sesión de prueba del Sandbox ha sido <strong>pausada temporalmente</strong> por la Dirección de TI.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-left space-y-1">
            <div className="font-semibold text-slate-700">¿Eres Administrador o evaluador?</div>
            <div>Activa nuevamente el servicio desde el panel de Administración de IACS para reanudar el acceso.</div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Ir al Portal Principal
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Main Executive Sandbox Split-Screen ─────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      {/* ── Executive Header ── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm flex items-center justify-center bg-slate-100 shrink-0">
              {aiAvatar ? (
                <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#EB5F46] to-[#F2826E] flex items-center justify-center text-white">
                  <Brain className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-slate-900 tracking-tight">
                  Sandbox Ejecutivo — Teo BP TI
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Fase 1 • CIO
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Laureate Perú • Articulación Socrática de Necesidades TI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Device Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={refreshDevicesWithPermission}
                title="Configurar dispositivo de micrófono"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedDeviceId
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {audioDevices.find((d) => d.deviceId === selectedDeviceId)?.label.slice(0, 20) || 'Micrófono'}
                </span>
              </button>

              {/* Dropdown de selección de micrófono */}
              {showMicSelector && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Seleccionar Micrófono
                    </span>
                    <button
                      onClick={() => setShowMicSelector(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {audioDevices.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">No se encontraron dispositivos de audio.</p>
                    ) : (
                      audioDevices.map((dev, idx) => (
                        <button
                          key={dev.deviceId || idx}
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(dev.deviceId);
                            setShowMicSelector(false);
                            showToast(`Micrófono cambiado a: ${dev.label || `Dispositivo ${idx + 1}`}`, 'info');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            selectedDeviceId === dev.deviceId
                              ? 'bg-[#FFF0ED] text-[#EB5F46] font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{dev.label || `Micrófono ${idx + 1}`}</span>
                          {selectedDeviceId === dev.deviceId && (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#EB5F46]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reiniciar sesión */}
            <button
              onClick={handleResetSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
              title="Reiniciar prueba del Sandbox"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva Sesión</span>
            </button>

            {/* Salir al inicio */}
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </header>

      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toastMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-600" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* ── Split-Screen Content ── */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* Mobile / Tablet Tab Switcher (Visible only on < lg screens) */}
        <div className="lg:hidden col-span-12 flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveViewTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeViewTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#4F5AF5]" />
            <span>Diálogo con Teo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewTab('draft')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all relative ${
              activeViewTab === 'draft'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#EB5F46]" />
            <span>Ficha IACS en Vivo</span>
            {draft.titulo_de_la_necesidad && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>

        {/* ── LEFT PANEL: Socratic Chat with Teo (Cols 1-6) ── */}
        <div className={`lg:col-span-6 xl:col-span-6 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-6.8rem)] ${
          activeViewTab === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center bg-slate-100 shrink-0">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#EB5F46] to-[#F2826E] text-white flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Entrevista con Teo (BP TI Senior)
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Especialista Laureate Perú • UPC, UPN, Cibertec
                </span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 hidden sm:inline-block">
              Método Socrático
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLastMsg = idx === messages.length - 1;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center bg-slate-100 shrink-0 mt-0.5">
                      {aiAvatar ? (
                        <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#EB5F46] to-[#F2826E] text-white flex items-center justify-center font-bold text-xs">
                          T
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-[#4F5AF5] text-white rounded-tr-sm font-normal'
                          : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-sm'
                      }`}
                    >
                      {/* Attached File Preview inside bubble */}
                      {msg.attachment && (
                        <div
                          className={`mb-2.5 p-2 rounded-xl border flex items-center gap-2 text-xs ${
                            isUser
                              ? 'bg-white/15 border-white/20 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <FileText className="w-4 h-4 shrink-0 opacity-90" />
                          <div className="truncate flex-1">
                            <span className="font-semibold">{msg.attachment.name}</span>
                          </div>
                        </div>
                      )}

                      {isUser ? (
                        <div className="whitespace-pre-wrap text-white text-sm font-normal leading-relaxed">
                          <span dangerouslySetInnerHTML={{ __html: formatHtmlText(msg.text, msg.text) }} />
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-slate max-w-none text-[#1E293B] leading-relaxed [&>p]:mb-2.5 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>li]:mb-1.5 [&>strong]:text-slate-900 [&>strong]:font-bold">
                          <ReactMarkdown>{formatChatMarkdown(msg.text)}</ReactMarkdown>
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-1.5 font-medium ${
                          isUser ? 'text-white/80 text-right' : 'text-[#94A3B8]'
                        }`}
                      >
                        {isUser ? 'Tú • ' + msg.timestamp : 'Teo (BP TI) • ' + msg.timestamp}
                      </div>
                    </div>

                    {/* Quick Response Chips (Only on the LAST model message when not typing!) */}
                    {!isUser && msg.options && msg.options.length > 0 && isLastMsg && !isAiTyping && (
                      <div className="mt-2.5 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 shadow-xs animate-in fade-in-50 duration-200">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5 px-0.5">
                          <ListChecks className="w-3.5 h-3.5 text-[#EB5F46]" />
                          <span>Selecciona una opción sugerida o escribe libremente:</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {msg.options.map((opt, optIndex) => {
                            const letter = String.fromCharCode(65 + (optIndex % 26));
                            return (
                              <button
                                key={optIndex}
                                type="button"
                                onClick={() => handleQuickOption(opt)}
                                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer bg-white hover:bg-[#EB5F46] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#EB5F46] active:scale-[0.99] hover:shadow-md hover:shadow-[#EB5F46]/15 group text-left"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-[#EB5F46] flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-200/80 group-hover:border-white transition-all shadow-2xs">
                                    {letter}
                                  </span>
                                  <span className="leading-snug transition-colors group-hover:text-white font-medium">
                                    {opt}
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 opacity-60 group-hover:opacity-100" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isAiTyping && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center bg-slate-100 shrink-0">
                  {aiAvatar ? (
                    <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover animate-pulse" />
                  ) : (
                    <div className="w-full h-full bg-[#EB5F46]/10 text-[#EB5F46] flex items-center justify-center">
                      <Brain className="w-4 h-4 animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#EB5F46] animate-ping" />
                  <span>Teo está analizando y articulando la necesidad...</span>
                </div>
              </div>
            )}

            <div ref={chatScrollRef} />
          </div>

          {/* Attached File Preview in Input Box */}
          {attachedFile && (
            <div className="px-4 py-2 bg-indigo-50/80 border-t border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-indigo-900 truncate">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-indigo-500">
                  ({(attachedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-indigo-200 text-indigo-700 rounded-md transition-colors"
                title="Quitar archivo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Audio Transcribing Alert */}
          {isTranscribing && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Transcribiendo audio del micrófono con el motor STT...</span>
            </div>
          )}

          {/* Audio Error Alert */}
          {audioError && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 flex items-center justify-between text-xs text-rose-700">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{audioError}</span>
              </div>
              <button onClick={() => setAudioError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="space-y-2"
            >
              <div className="relative border border-slate-200 focus-within:border-[#4F5AF5] focus-within:ring-2 focus-within:ring-[#4F5AF5]/20 rounded-2xl bg-white transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  disabled={isAiTyping}
                  placeholder="Escribe la necesidad con total libertad, o presiona el micrófono para hablar..."
                  className="w-full px-4 pt-3 pb-10 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none"
                />

                {/* Bottom toolbar inside input */}
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Attach File Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.xls,.txt,image/*"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile || isAiTyping}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Adjuntar documento o evidencia (PDF, Excel, Word, Imagen)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Microphone Recording Button */}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing || isAiTyping}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={
                        isRecording
                          ? 'Detener grabación'
                          : `Grabar audio (${audioDevices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Micrófono'})`
                      }
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {isRecording && <span>{recordingSeconds}s</span>}
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputMessage.trim() && !attachedFile) || isAiTyping}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#4F5AF5] hover:bg-[#3D48E0] disabled:opacity-40 disabled:hover:bg-[#4F5AF5] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <span>Enviar</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT PANEL: Real-Time Official Draft Form & Maturity (Cols 7-12) ── */}
        <div className={`lg:col-span-6 xl:col-span-6 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-6.8rem)] ${
          activeViewTab === 'draft' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Panel Header with Maturity Indicator */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#EB5F46]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ficha Oficial IACS — Laureate Perú
                </span>
                {justUpdatedDraft && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    ¡Sincronizada en vivo!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Madurez:</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    readinessScore >= 80
                      ? 'bg-emerald-100 text-emerald-700'
                      : readinessScore >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {readinessScore}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  readinessScore >= 80
                    ? 'bg-emerald-500'
                    : readinessScore >= 50
                    ? 'bg-amber-500'
                    : readinessScore > 0
                    ? 'bg-[#EB5F46]'
                    : 'bg-transparent'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, readinessScore))}%` }}
              />
            </div>

            {/* 5 Socratic Maturity Dimensions */}
            <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
              {[
                { key: 'problema_raiz', label: 'Problema', data: dimensions.problema_raiz },
                { key: 'impacto_usuarios', label: 'Usuarios', data: dimensions.impacto_usuarios },
                { key: 'metricas_exito', label: 'Métricas', data: dimensions.metricas_exito },
                { key: 'ecosistema_ti', label: 'Sistemas', data: dimensions.ecosistema_ti },
                { key: 'restricciones_plazos', label: 'Plazos', data: dimensions.restricciones_plazos }
              ].map((dim) => (
                <div
                  key={dim.key}
                  className="p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
                  title={dim.data?.comment || dim.label}
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                    {dim.label}
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {dim.data?.score ?? 0}%
                  </div>
                </div>
              ))}
            </div>

            {readinessScore === 0 && (
              <p className="text-[11px] text-slate-400 mt-2 text-center italic">
                El avance de madurez iniciará en 0% e irá aumentando conforme Teo evalúe el rigor y detalle de la necesidad durante la conversación.
              </p>
            )}
          </div>

          {/* Draft Fields View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Field 1: Título */}
            <div className={`p-3.5 rounded-2xl bg-slate-50/70 border space-y-1 transition-all duration-500 ${
              justUpdatedDraft && draft.titulo_de_la_necesidad ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50/50' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Título de la Necesidad
                </label>
                {draft.titulo_de_la_necesidad && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Articulado en vivo por Teo
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-900">
                {draft.titulo_de_la_necesidad || (
                  <span className="text-slate-400 font-normal italic">
                    Esperando que Teo sintetice el título a partir del diálogo...
                  </span>
                )}
              </p>
            </div>

            {/* Field 2: Objetivo SMART */}
            <div className={`p-3.5 rounded-2xl bg-slate-50/70 border space-y-1 transition-all duration-500 ${
              justUpdatedDraft && draft.objetivo ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50/50' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Objetivo SMART
                </label>
                {draft.objetivo && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Estructura SMART
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {draft.objetivo || (
                  <span className="text-slate-400 italic">
                    Teo estructurará un objetivo con verbo en infinitivo, impacto y medición cuantitativa.
                  </span>
                )}
              </p>
            </div>

            {/* Field 3: Descripción del Dolor Operativo */}
            <div className={`p-3.5 rounded-2xl bg-slate-50/70 border space-y-1 transition-all duration-500 ${
              justUpdatedDraft && draft.descripcion_de_la_necesidad ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50/50' : 'border-slate-200'
            }`}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Descripción del Problema Operativo
              </label>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {draft.descripcion_de_la_necesidad || (
                  <span className="text-slate-400 italic">
                    El problema de fondo será delimitado conforme el usuario responda a las repreguntas.
                  </span>
                )}
              </p>
            </div>

            {/* Field 4 & 5: Beneficios y Procesos (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Beneficio Cuantitativo Anual
                </label>
                <p className="text-xs text-emerald-950 font-medium">
                  {draft.beneficio_cuantitativo_anual || 'Por cuantificar...'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  Procesos y Áreas Impactadas
                </label>
                <p className="text-xs text-indigo-950 font-medium">
                  {draft.proceso_y_areas_impactadas || 'Por determinar...'}
                </p>
              </div>
            </div>

            {/* Field 6: Sistemas Involucrados */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sistemas y Ecosistema TI Identificados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.sistemas_involucrados && draft.sistemas_involucrados.length > 0 ? (
                  draft.sistemas_involucrados.map((sys, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    >
                      {sys}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Banner, Blackboard, Salesforce, SAP u otros según el diálogo.
                  </span>
                )}
              </div>
            </div>

            {/* Field 7: Consecuencias si no se implementa */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                ¿Qué pasa si no lo tenemos para esta fecha?
              </label>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {draft.qu_pasa_si_no_lo_tenemos_en_esta_fecha || (
                  <span className="text-slate-400 italic">
                    Riesgo institucional o cuello de botella si se retrasa.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Panel Footer: Executive Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Copiar Markdown */}
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                title="Copiar contenido de la ficha al portapapeles"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar Ficha</span>
              </button>

              {/* Descargar Resumen */}
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                title="Descargar resumen ejecutivo en HTML imprimible"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </button>

              {/* Convertir en Borrador Oficial */}
              <button
                type="button"
                onClick={handleConvertToOfficialDraft}
                disabled={isSavingOfficial || Boolean(officialDraftCreatedId)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EB5F46] hover:bg-[#D94F37] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs"
                title="Guardar como Borrador formal en IACS"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{officialDraftCreatedId ? '¡Guardado!' : 'Guardar en IACS'}</span>
              </button>
            </div>

            {/* Direct Link if Saved */}
            {officialDraftCreatedId && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <span>Iniciativa guardada como borrador oficial.</span>
                <button
                  onClick={() => navigate(`/nueva/${officialDraftCreatedId}`)}
                  className="font-bold underline flex items-center gap-1 text-emerald-900 hover:text-emerald-700"
                >
                  <span>Abrir Ficha</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeoSandbox;
