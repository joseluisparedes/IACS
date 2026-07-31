import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FieldDefinition } from '../types';
import {
  Save, Loader2, Eye, EyeOff, RotateCcw,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Check, ZoomIn, ZoomOut,
  ChevronDown, ChevronUp, Search, X, Scissors, FileText, Eraser, Code, Copy, Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MM_TO_PX = 3.7795275591;
const A4_W_PX  = Math.round(210 * MM_TO_PX); // 794
const A4_H_PX  = Math.round(297 * MM_TO_PX); // 1123

interface Margins { top: number; right: number; bottom: number; left: number; }

interface VarItem {
  key: string;
  desc: string;
  group: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Variables del sistema (metadata e iniciativ/personas)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_VARIABLES: VarItem[] = [
  { key: '{{titulo_de_la_necesidad}}',      desc: 'Título de la iniciativa',          group: 'Iniciativa' },
  { key: '{{titulo}}',                       desc: 'Título de la iniciativa (alias)',   group: 'Iniciativa' },
  { key: '{{id_iniciativa}}',               desc: 'ID completo / general',            group: 'Iniciativa' },
  { key: '{{id_corta}}',                    desc: 'ID corto (ej. #INIT-MRP)',          group: 'Iniciativa' },
  { key: '{{fecha_actual}}',                desc: 'Fecha de generación del PDF',       group: 'Iniciativa' },
  { key: '{{estado_actual}}',               desc: 'Estado actual de la iniciativa',    group: 'Iniciativa' },
  { key: '{{registrador}}',                 desc: 'Nombre del Key User / Solicitante', group: 'Personas'   },
  { key: '{{direccion}}',                   desc: 'Dirección del usuario',             group: 'Personas'   },
  { key: '{{institucion}}',                 desc: 'Institución (UPN, UPC, etc.)',      group: 'Personas'   },
  { key: '{{bp_ti_asignado}}',              desc: 'BP de TI asignado',                group: 'Personas'   },
  { key: '{{fecha_requerida}}',             desc: 'Fecha requerida de entrega',        group: 'Personas'   },
  { key: '{{imagenes_adjuntas}}',           desc: 'Imágenes adjuntas (condicional)',  group: 'Archivos'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Datos de muestra para Vista Previa
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_IMAGES_HTML = `
<div style="margin-top:8px;">
  <div style="display:inline-block; margin:4px; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden; vertical-align:top; max-width:220px;">
    <div style="width:220px; height:140px; background:linear-gradient(135deg,#EEF2FF 0%,#C7D2FE 100%); display:flex; align-items:center; justify-content:center; color:#6366F1; font-size:11pt; font-weight:bold;">Imagen 1</div>
    <p style="font-size:8pt; color:#64748B; padding:4px 8px; margin:0; border-top:1px solid #E2E8F0;">ejemplo_imagen_1.jpg</p>
  </div>
  <div style="display:inline-block; margin:4px; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden; vertical-align:top; max-width:220px;">
    <div style="width:220px; height:140px; background:linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%); display:flex; align-items:center; justify-content:center; color:#92400E; font-size:11pt; font-weight:bold;">Imagen 2</div>
    <p style="font-size:8pt; color:#64748B; padding:4px 8px; margin:0; border-top:1px solid #E2E8F0;">ejemplo_imagen_2.png</p>
  </div>
</div>
`;

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  titulo_de_la_necesidad:     'Automatizar proceso de barrido de contactos inalcanzables',
  titulo:                     'Automatizar proceso de barrido de contactos inalcanzables',
  id_iniciativa:              'INIT-MRPN7JPYGA',
  id_completa:                 'INIT-MRPN7JPYGA',
  id_corta:                   '#INIT-MRP',
  fecha_actual:               new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }),
  estado_actual:              'En demanda',
  registrador:                'Pedro Antonio Guibar Flores',
  direccion:                  'Central de Admisión',
  institucion:                'UPN',
  bp_ti_asignado:             'José Luis Paredes H.',
  fecha_requerida:            '17/07/2026',
  descripcion_de_la_necesidad: 'La base de contactos de UPN (~2M registros) contiene entre un 30% y 35% de números inalcanzables (respuesta SIP 480), lo que reduce significativamente la eficiencia de las campañas outbound. Se requiere escalar el proceso de barrido de contactos inalcanzables que actualmente se realiza vía IVR.',
  objetivo:                   'Mejorar la efectividad de las campañas outbound mediante la depuración automática de números SIP 480.',
  que_pasa_si_no_lo_tenemos_en_esta_fecha: 'Se perderá presupuesto en llamadas a números no válidos durante la campaña de admisión.',
  descripcion_del_problema_o_desafio_situacion_actual: 'El barrido manual toma semanas y causa saturación de líneas y costo de telefonía innecesario.',
  es_un_proceso_nuevo:        'No (Optimización de proceso existente)',
  proceso_y_areas_impactadas:  'Negocio (gestión de campañas outbound), e-Contact (proveedor IVR), TI Omnicanal.',
  usuarios_beneficiados:      'Operadores de Call Center, Analistas de Admisión y equipo de TI',
  pilar_estrategico:          'Excelencia Operativa y Eficiencia de Costos',
  beneficio_cuantitativo_anual: 'S/. 45,000 anuales',
  beneficio_cualitativo:       'Reducción del estrés operativo, mejor experiencia del usuario final y trazabilidad de contactos.',
  es_proyecto_spo:             'Sí',
  que_escenarios_de_pruebas_debemos_considerar: 'Pruebas de volumen de 100k registros, validación de respuestas SIP 480 e integración CRM.',
  aprobacion_de_director:      'Aprobacion_Director_TI.pdf',
  situacion_deseada:           'Contar con una base de datos de contactos depurada y actualizada que permita mejorar la efectividad de las campañas de comunicación outbound.',
  imagenes_adjuntas:           SAMPLE_IMAGES_HTML,
};

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla HTML por defecto con 2 Páginas A4 explícitas
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE_HTML = `
<!-- PÁGINA 1: ENCABEZADO / PORTADA -->
<div style="text-align:center; padding-bottom:24px; margin-bottom:28px;">
  <p style="font-size:9pt; font-weight:bold; color:#EB5F46; letter-spacing:3px; text-transform:uppercase; margin:0 0 4px 0;">LAUREATE PERÚ</p>
  <p style="font-size:13pt; color:#0D0D0D; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin:0 0 20px 0;">DOCUMENTO FUNCIONAL</p>
  <p style="font-size:15pt; font-weight:bold; color:#1E293B; margin:0 0 20px 0; line-height:1.3;">{{titulo_de_la_necesidad}}</p>
  <table style="width:auto; margin:0 auto; border-collapse:collapse;">
    <tr>
      <td style="padding:3px 16px; border-right:1px solid #E2E8F0; text-align:center;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">ID Iniciativa</p>
        <p style="font-size:10pt; font-weight:bold; color:#4F5AF5; margin:0;">{{id_corta}}</p>
      </td>
      <td style="padding:3px 16px; border-right:1px solid #E2E8F0; text-align:center;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Estado</p>
        <p style="font-size:10pt; font-weight:bold; color:#059669; margin:0;">{{estado_actual}}</p>
      </td>
      <td style="padding:3px 16px; text-align:center;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Fecha de Generación</p>
        <p style="font-size:10pt; color:#1E293B; margin:0;">{{fecha_actual}}</p>
      </td>
    </tr>
  </table>
</div>

<!-- SECCIÓN 1: DATOS DE LA SOLICITUD -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">1. DATOS DE LA SOLICITUD</p>
  </div>
  <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
    <tr>
      <td style="width:50%; padding:6px 10px 6px 0; vertical-align:top; border-bottom:1px solid #F1F5F9;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Key User / Registrador</p>
        <p style="font-size:10pt; color:#1E293B; margin:0; font-weight:500;">{{registrador}}</p>
      </td>
      <td style="width:50%; padding:6px 0 6px 10px; vertical-align:top; border-bottom:1px solid #F1F5F9; border-left:1px solid #F1F5F9;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Dirección / Institución</p>
        <p style="font-size:10pt; color:#1E293B; margin:0; font-weight:500;">{{direccion}} &mdash; {{institucion}}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 10px 4px 0; vertical-align:top;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Business Partner TI Asignado</p>
        <p style="font-size:10pt; color:#1E293B; margin:0; font-weight:500;">{{bp_ti_asignado}}</p>
      </td>
      <td style="padding:8px 0 4px 10px; vertical-align:top; border-left:1px solid #F1F5F9;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 2px 0;">Fecha Requerida de Entrega</p>
        <p style="font-size:10pt; color:#1E293B; margin:0; font-weight:500;">{{fecha_requerida}}</p>
      </td>
    </tr>
  </table>
</div>

<!-- SECCIÓN 2: DESCRIPCIÓN DE LA NECESIDAD -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">2. DESCRIPCIÓN DE LA NECESIDAD</p>
  </div>
  <div style="border-radius:6px; padding:14px 16px; background:#FAFCFF; font-size:10pt; text-align:justify; line-height:1.7; color:#1E293B;">
    {{descripcion_de_la_necesidad}}
  </div>
</div>

<!-- SECCIÓN 3: IMPACTO Y BENEFICIO / ÁREAS INVOLUCRADAS -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">3. IMPACTO Y ÁREAS INVOLUCRADAS</p>
  </div>
  <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
    <tr>
      <td style="width:44%; vertical-align:top; padding-right:12px;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Beneficio Cuantitativo Anual</p>
        <div style="background:#F0FDF4; border-radius:6px; padding:12px 14px; min-height:50px;">
          <p style="font-size:12pt; font-weight:bold; color:#15803D; margin:0; line-height:1.2;">{{beneficio_cuantitativo_anual}}</p>
        </div>
      </td>
      <td style="width:56%; vertical-align:top; padding-left:12px; border-left:1px solid #E2E8F0;">
        <p style="font-size:7.5pt; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Procesos y Áreas Impactadas</p>
        <div style="border-radius:6px; padding:12px 14px; background:#FAFCFF; font-size:9.5pt; text-align:left; line-height:1.6; color:#334155; min-height:50px;">
          {{proceso_y_areas_impactadas}}
        </div>
      </td>
    </tr>
  </table>
</div>

<!-- PÁGINA 2: SECCIÓN 4: OBJETIVO -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">4. OBJETIVO</p>
  </div>
  <div style="border-radius:6px; padding:14px 16px; background:#FAFCFF; font-size:10pt; text-align:justify; line-height:1.7; color:#1E293B;">
    {{objetivo}}
  </div>
</div>

<!-- PÁGINA 2: SECCIÓN 5: QUÉ PASA SI NO LO TENEMOS -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">5. ¿QUÉ PASA SI NO LO TENEMOS PARA ESTA FECHA?</p>
  </div>
  <div style="border-radius:6px; padding:14px 16px; background:#FAFCFF; font-size:10pt; text-align:justify; line-height:1.7; color:#1E293B;">
    {{que_pasa_si_no_lo_tenemos_en_esta_fecha}}
  </div>
</div>

<!-- PÁGINA 2: SECCIÓN 6: IMÁGENES ADJUNTAS (condicional) -->
<div style="margin-bottom:24px;">
  <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
    <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">6. IMÁGENES ADJUNTAS</p>
  </div>
  <div style="border:1.5px dashed #C7D2FE; border-radius:8px; padding:16px; background:#EEF2FF; text-align:center; color:#4F5AF5; font-size:9.5pt; margin:8px 0; font-weight:bold;">
    🖼️ Bloque Condicional de Imágenes Adjuntas: {{imagenes_adjuntas}}
  </div>
</div>

<!-- PIE DE PÁGINA (Se repite automáticamente al final de cada hoja en el PDF) -->
<div class="pdf-footer" style="margin-top:32px; padding-top:12px; border-top:1px solid #E2E8F0; display:table; width:100%;">
  <div style="display:table-cell; vertical-align:middle;">
    <p style="font-size:7.5pt; color:#94A3B8; margin:0;">Documento generado por el sistema IACS &bull; Confidencial</p>
  </div>
  <div style="display:table-cell; vertical-align:middle; text-align:right;">
    <p style="font-size:7.5pt; color:#94A3B8; margin:0;">{{id_corta}} &bull; {{fecha_actual}}</p>
  </div>
</div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseStoredTemplate(raw: string): { html: string; margins: Margins } {
  const def: Margins = { top: 18, right: 20, bottom: 18, left: 20 };
  if (!raw) return { html: '', margins: def };
  try {
    let p: any = raw;
    while (typeof p === 'string' && (p.trim().startsWith('{') || p.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(p);
        p = parsed;
      } catch {
        break;
      }
    }
    if (p && typeof p === 'object' && 'html' in p) {
      return { html: p.html ?? '', margins: { ...def, ...(p.margins ?? {}) } };
    }
    if (typeof p === 'string') {
      return { html: p, margins: def };
    }
  } catch { /* legacy plain HTML */ }
  return { html: raw, margins: def };
}

function replaceVariables(html: string, data: Record<string, string>): string {
  return html.replace(/{{(.*?)}}/g, (_m, key) => {
    const k = key.trim();
    if (data[k] !== undefined) return data[k];
    const foundKey = Object.keys(data).find(dk => dk.toLowerCase() === k.toLowerCase());
    if (foundKey && data[foundKey] !== undefined) return data[foundKey];
    return `<span style="background:#FEF3C7;color:#92400E;border-radius:3px;padding:0 3px;font-size:0.88em;">${_m}</span>`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPDFTemplate() {
  const [margins,     setMargins]     = useState<Margins>({ top: 18, right: 20, bottom: 18, left: 20 });
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [message,     setMessage]     = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPreview,   setIsPreview]   = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showTableDlg, setShowTableDlg] = useState(false);
  const [tableRows,    setTableRows]    = useState(3);
  const [tableCols,    setTableCols]    = useState(3);
  const [zoom,         setZoom]         = useState(0.88);
  const [copiedVar,    setCopiedVar]    = useState<string | null>(null);
  const [pageCount,    setPageCount]    = useState(2);

  // Campos dinámicos de Supabase y Búsqueda
  const [dbFields,     setDbFields]     = useState<FieldDefinition[]>([]);
  const [varSearch,    setVarSearch]    = useState('');

  // Modo de edición: 'visual' (WYSIWYG) o 'code' (HTML plano)
  const [viewMode,        setViewMode]        = useState<'visual' | 'code'>('visual');
  const [codeHtml,        setCodeHtml]        = useState('');
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const editorRef        = useRef<HTMLDivElement>(null);
  const previewRef       = useRef<HTMLDivElement>(null);
  const canvasScrollRef  = useRef<HTMLDivElement>(null);
  const codeTextareaRef  = useRef<HTMLTextAreaElement>(null);
  const codeHighlightRef = useRef<HTMLPreElement>(null);
  const colorTextRef     = useRef<HTMLInputElement>(null);
  const colorBgRef       = useRef<HTMLInputElement>(null);
  const imageInputRef    = useRef<HTMLInputElement>(null);
  const savedRange       = useRef<Range | null>(null);
  const isInit           = useRef(false);

  // ── Función de Resaltado Visual de Coincidencias (etiquetas <mark>) ─────────
  const renderHighlightedCode = (html: string, query: string, activeIndex: number) => {
    if (!query.trim()) return html;
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      let matchCounter = 0;
      const parts = html.split(regex);
      return parts.map((part, i) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          const currentIdx = matchCounter++;
          const isActive = currentIdx === activeIndex;
          return (
            <mark
              key={i}
              className={
                isActive
                  ? "bg-[#F59E0B] text-slate-950 font-black px-1 py-0.5 rounded ring-2 ring-sky-400 shadow-md opacity-100"
                  : "bg-[#F59E0B]/60 text-white font-bold px-0.5 py-0.5 rounded opacity-90"
              }
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return html;
    }
  };

  // ── Lógica de Búsqueda y Desplazamiento en Código HTML ──────────────────────
  const codeMatches = useMemo(() => {
    if (!codeSearchQuery.trim()) return [];
    const matches: number[] = [];
    const q = codeSearchQuery.toLowerCase();
    const lowerHtml = codeHtml.toLowerCase();
    let pos = lowerHtml.indexOf(q);
    while (pos !== -1) {
      matches.push(pos);
      pos = lowerHtml.indexOf(q, pos + 1);
    }
    return matches;
  }, [codeHtml, codeSearchQuery]);

  const highlightMatch = (index: number, shouldFocusTextarea = false) => {
    if (codeMatches.length === 0 || !codeTextareaRef.current) return;
    const matchPos = codeMatches[index];
    if (matchPos === undefined) return;
    const textarea = codeTextareaRef.current;
    if (shouldFocusTextarea) {
      textarea.focus();
    }
    textarea.setSelectionRange(matchPos, matchPos + codeSearchQuery.length);

    // Calcular desplazamiento vertical
    const linesBefore = codeHtml.substring(0, matchPos).split('\n').length - 1;
    textarea.scrollTop = Math.max(0, linesBefore * 18 - 60);
  };

  const handleNextMatch = () => {
    if (codeMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % codeMatches.length;
    setCurrentMatchIndex(next);
    highlightMatch(next, false);
  };

  const handlePrevMatch = () => {
    if (codeMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + codeMatches.length) % codeMatches.length;
    setCurrentMatchIndex(prev);
    highlightMatch(prev, false);
  };

  useEffect(() => {
    if (codeMatches.length > 0) {
      setCurrentMatchIndex(0);
      highlightMatch(0, false);
    }
  }, [codeSearchQuery]);

  const padT = Math.round(margins.top    * MM_TO_PX);
  const padR = Math.round(margins.right  * MM_TO_PX);
  const padB = Math.round(margins.bottom * MM_TO_PX);
  const padL = Math.round(margins.left   * MM_TO_PX);

  // ── Recalcular número de páginas A4 ────────────────────────────────────────
  const updatePageCount = () => {
    requestAnimationFrame(() => {
      const target = isPreview ? previewRef.current : editorRef.current;
      if (target) {
        const html = target.innerHTML || codeHtml || '';
        const explicitMatches = html.match(/page-break-(before|after)|break-(before|after)/gi);
        const explicitCount = explicitMatches ? explicitMatches.length : 0;

        const scrollH = target.scrollHeight;
        const totalHeight = scrollH + padT + padB;
        const heightCount = Math.max(1, Math.ceil(totalHeight / A4_H_PX));

        const finalCount = Math.max(1, explicitCount + 1, heightCount);
        setPageCount(finalCount);
      }
    });
  };

  // ── Conmutar entre Modo Visual y Modo Código HTML (AMBOS PERMANECEN EN DOM) ─
  const toggleViewMode = () => {
    if (viewMode === 'visual') {
      if (editorRef.current) {
        setCodeHtml(editorRef.current.innerHTML);
      }
      setViewMode('code');
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML = codeHtml;
      }
      setViewMode('visual');
      if (canvasScrollRef.current) {
        canvasScrollRef.current.scrollTop = 0;
      }
      setTimeout(updatePageCount, 80);
    }
  };

  // ── Eliminar líneas decorativas (border-bottom e <hr>) ────────────────────
  const removeDecorativeLines = () => {
    const currentHtml = editorRef.current?.innerHTML || codeHtml;
    let cleanHtml = currentHtml.replace(/border-bottom\s*:[^;"]+;?/gi, '');
    cleanHtml = cleanHtml.replace(/<hr\b[^>]*\/?>/gi, '');

    setCodeHtml(cleanHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = cleanHtml;
    }

    setMessage({ text: '✓ Se han eliminado todas las líneas decorativas.', type: 'success' });
    setTimeout(() => setMessage(null), 3500);
    updatePageCount();
  };

  // ── Load Template & Fields ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, fieldsRes] = await Promise.all([
          supabase.from('site_settings').select('pdf_template').eq('id', 1).single(),
          supabase.from('initiative_fields').select('*').order('sort_order', { ascending: true })
        ]);

        if (fieldsRes.data) {
          setDbFields(fieldsRes.data);
        }

        const raw = settingsRes.data?.pdf_template ?? '';
        const { html, margins: m } = parseStoredTemplate(raw);
        setMargins(m);

        const activeHtml = html ? html : DEFAULT_TEMPLATE_HTML;
        setCodeHtml(activeHtml);

        if (editorRef.current && !isInit.current) {
          editorRef.current.innerHTML = activeHtml;
          isInit.current = true;
        }
      } catch {
        setCodeHtml(DEFAULT_TEMPLATE_HTML);
        if (editorRef.current && !isInit.current) {
          editorRef.current.innerHTML = DEFAULT_TEMPLATE_HTML;
          isInit.current = true;
        }
      } finally {
        setLoading(false);
        setTimeout(updatePageCount, 150);
      }
    })();
  }, []);

  // ── Unificar todas las variables del sistema + campos del formulario ───────
  const allVariables = useMemo(() => {
    const vars: VarItem[] = [...SYSTEM_VARIABLES];
    const existingKeys = new Set(vars.map(v => v.key.toLowerCase()));

    if (dbFields && dbFields.length > 0) {
      dbFields.forEach(f => {
        const keyTag = `{{${f.key}}}`;
        if (!existingKeys.has(keyTag.toLowerCase())) {
          existingKeys.add(keyTag.toLowerCase());
          const groupName = f.section === 'form' ? 'Formulario Inicial' : 'Campos del Formulario';
          vars.push({
            key: keyTag,
            desc: f.label,
            group: groupName,
          });
        }
      });
    }
    return vars;
  }, [dbFields]);

  // ── Datos de prueba consolidados para la Vista Previa ──────────────────────
  const dynamicSampleData = useMemo(() => {
    const sample: Record<string, string> = { ...DEFAULT_SAMPLE_DATA };
    dbFields.forEach(f => {
      if (sample[f.key] === undefined) {
        sample[f.key] = `[Ejemplo: ${f.label}]`;
      }
    });
    return sample;
  }, [dbFields]);

  // ── Filtrado de variables por término de búsqueda ──────────────────────────
  const filteredVars = useMemo(() => {
    if (!varSearch.trim()) return allVariables;
    const q = varSearch.toLowerCase();
    return allVariables.filter(
      v => v.key.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q) || v.group.toLowerCase().includes(q)
    );
  }, [allVariables, varSearch]);

  useEffect(() => {
    updatePageCount();
    const timer = setTimeout(updatePageCount, 100);
    return () => clearTimeout(timer);
  }, [isPreview, margins, zoom, viewMode]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveTemplate = async () => {
    const activeHtml = viewMode === 'code' ? codeHtml : (editorRef.current?.innerHTML ?? codeHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = activeHtml;
    }

    setSaving(true);
    setMessage(null);
    const payload = JSON.stringify({ html: activeHtml, margins });
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ pdf_template: payload })
        .eq('id', 1);
      if (error) throw error;
      setMessage({ text: '✓ Plantilla guardada correctamente.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Error al guardar: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // ── Preview ───────────────────────────────────────────────────────────────
  const togglePreview = () => {
    if (!isPreview) {
      const sourceHtml = viewMode === 'code' ? codeHtml : (editorRef.current?.innerHTML ?? codeHtml);
      const html = replaceVariables(sourceHtml, dynamicSampleData);
      setPreviewHtml(html);
      if (previewRef.current) {
        previewRef.current.innerHTML = html;
      }
    }
    setIsPreview(prev => !prev);
    if (canvasScrollRef.current) {
      canvasScrollRef.current.scrollTop = 0;
    }
    setTimeout(updatePageCount, 80);
    setTimeout(updatePageCount, 250);
  };

  // ── Cursor save / restore ─────────────────────────────────────────────────
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      try { sel.removeAllRanges(); sel.addRange(savedRange.current); } catch { /* ignore */ }
    }
  };

  // ── execCommand ───────────────────────────────────────────────────────────
  const exec = (cmd: string, val?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    updatePageCount();
  };

  // ── insertHTML at cursor ──────────────────────────────────────────────────
  const insertHtml = (html: string) => {
    if (viewMode === 'code') {
      const newHtml = codeHtml + html;
      setCodeHtml(newHtml);
      if (editorRef.current) editorRef.current.innerHTML = newHtml;
    } else {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand('insertHTML', false, html);
      if (editorRef.current) setCodeHtml(editorRef.current.innerHTML);
    }
    updatePageCount();
  };

  // ── Insert explicit page break ────────────────────────────────────────────
  const insertPageBreak = () => {
    insertHtml(`
      <div style="page-break-before:always; break-before:page; border-top:2px dashed #4F5AF5; margin:24px 0; padding:8px 0; text-align:center; background:#EEF2FF; color:#4F5AF5; font-size:8.5pt; font-weight:bold; border-radius:6px;" contenteditable="false">
        ✂️ SALTO DE PÁGINA FORZADO &mdash; INICIO DE SIGUIENTE PÁGINA A4
      </div>
      <p><br></p>
    `);
  };

  // ── insertText (variables) ────────────────────────────────────────────────
  const insertVariable = (varKey: string) => {
    if (viewMode === 'code') {
      const newHtml = codeHtml + varKey;
      setCodeHtml(newHtml);
      if (editorRef.current) editorRef.current.innerHTML = newHtml;
    } else {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand('insertText', false, varKey);
      if (editorRef.current) setCodeHtml(editorRef.current.innerHTML);
    }
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
    updatePageCount();
  };

  // ── Insert table ──────────────────────────────────────────────────────────
  const insertTable = () => {
    const hdr = `<td style="border:1px solid #94A3B8;padding:7px 10px;font-size:10pt;background:#F1F5F9;font-weight:bold;text-align:left;vertical-align:top;">&nbsp;</td>`;
    const cel = `<td style="border:1px solid #CBD5E1;padding:7px 10px;font-size:10pt;vertical-align:top;">&nbsp;</td>`;
    let html = `<table style="width:100%;border-collapse:collapse;margin:12px 0;table-layout:fixed;"><tbody>`;
    for (let r = 0; r < tableRows; r++) {
      html += '<tr>';
      for (let c = 0; c < tableCols; c++) html += r === 0 ? hdr : cel;
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    insertHtml(html);
    setShowTableDlg(false);
  };

  // ── Image from file (base64) ──────────────────────────────────────────────
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      insertHtml(`<img src="${b64}" style="max-width:100%;height:auto;display:block;margin:8px 0;" alt="imagen"/><p><br></p>`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Reset to default ──────────────────────────────────────────────────────
  const resetDefault = () => {
    if (!window.confirm('¿Restaurar la plantilla original? Se perderán los cambios actuales.')) return;
    setCodeHtml(DEFAULT_TEMPLATE_HTML);
    if (editorRef.current) editorRef.current.innerHTML = DEFAULT_TEMPLATE_HTML;
    setMargins({ top: 18, right: 20, bottom: 18, left: 20 });
    if (isPreview) setIsPreview(false);
    setTimeout(updatePageCount, 100);
  };

  // ── Margin helpers ────────────────────────────────────────────────────────
  const setMargin = (side: keyof Margins, d: number) =>
    setMargins(m => ({ ...m, [side]: Math.min(50, Math.max(0, m[side] + d)) }));

  // ── Toolbar btn ───────────────────────────────────────────────────────────
  const Btn = ({ onDown, title, children }: { onDown: (e: React.MouseEvent) => void; title: string; children: React.ReactNode }) => (
    <button onMouseDown={onDown} title={title}
      className="flex items-center justify-center w-7 h-7 rounded text-[#1E293B] hover:bg-[#EEF2FF] hover:text-[#4F5AF5] transition-colors">
      {children}
    </button>
  );

  // ── Margin row ────────────────────────────────────────────────────────────
  const MarginRow = ({ side, label }: { side: keyof Margins; label: string }) => (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[10px] font-semibold text-[#64748B] w-16">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setMargin(side, -1)} className="w-5 h-5 text-xs flex items-center justify-center rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] font-bold select-none">−</button>
        <input type="number" min="0" max="50" value={margins[side]}
          onChange={e => setMargins(m => ({ ...m, [side]: Math.max(0, Math.min(50, Number(e.target.value))) }))}
          className="w-11 text-center text-[11px] border border-[#E2E8F0] rounded h-5 focus:outline-none focus:border-[#4F5AF5]" />
        <button onClick={() => setMargin(side, 1)} className="w-5 h-5 text-xs flex items-center justify-center rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] font-bold select-none">+</button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F5AF5]" />
      </div>
    );
  }

  // Total height calculation
  const totalCanvasH = Math.max(1, pageCount) * A4_H_PX;

  return (
    <div className="flex flex-col bg-[#334155]" style={{ height: '100%', minHeight: 0 }}>

      {/* ══ HEADER ══ */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-5 py-2.5 flex items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-sm font-bold text-[#1E293B]">Plantilla del Informe Ejecutivo PDF</h1>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 hidden sm:block">
              Editor A4 Multi-hoja · Conmutador entre Modo Visual y Editor de Código HTML
            </p>
          </div>

          {/* Page counter badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg">
            <FileText className="w-3.5 h-3.5 text-[#4F5AF5]" />
            <span className="text-[11px] font-bold text-[#4F5AF5]">
              {pageCount} {pageCount === 1 ? 'Página A4' : 'Páginas A4'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {message && (
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>{message.text}</span>
          )}

          {/* Conmutador Modo Visual <-> Modo Código HTML */}
          <button
            onClick={toggleViewMode}
            disabled={isPreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              viewMode === 'code'
                ? 'bg-[#1E293B] text-sky-400 border-sky-500 hover:bg-[#0F172A]'
                : 'bg-[#F8FAFC] text-[#4F5AF5] border-[#C7D2FE] hover:bg-[#EEF2FF]'
            } disabled:opacity-40`}
          >
            {viewMode === 'code' ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
            {viewMode === 'code' ? 'Modo Visual' : '</> Código HTML'}
          </button>

          <button onClick={togglePreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
              isPreview
                ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}>
            {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isPreview ? 'Salir del Preview' : 'Vista Previa'}
          </button>
          <button onClick={resetDefault} title="Restaurar plantilla original"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </button>
          <button onClick={saveTemplate} disabled={saving || isPreview}
            className="flex items-center gap-1.5 bg-[#4F5AF5] hover:bg-[#3F49E0] disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar Plantilla
          </button>
        </div>
      </div>

      {/* ══ TOOLBAR (oculto en modo código) ══ */}
      <div className={`shrink-0 bg-white border-b border-[#E2E8F0] px-4 py-1.5 flex flex-wrap items-center gap-0.5 z-20 transition-opacity ${isPreview || viewMode === 'code' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>

        <select onMouseDown={e => e.stopPropagation()}
          onChange={e => { editorRef.current?.focus(); document.execCommand('formatBlock', false, e.target.value); e.target.value = '_'; updatePageCount(); }}
          defaultValue="_"
          className="h-7 text-[11px] border border-[#E2E8F0] rounded px-1.5 bg-white text-[#1E293B] focus:outline-none cursor-pointer">
          <option value="_" disabled>Párrafo</option>
          <option value="p">Normal</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
          <option value="h4">Título 4</option>
          <option value="blockquote">Cita</option>
        </select>

        <select onMouseDown={e => e.stopPropagation()}
          onChange={e => { editorRef.current?.focus(); document.execCommand('fontName', false, e.target.value); e.target.value = '_'; updatePageCount(); }}
          defaultValue="_"
          className="h-7 text-[11px] border border-[#E2E8F0] rounded px-1.5 bg-white text-[#1E293B] focus:outline-none cursor-pointer max-w-[110px]">
          <option value="_" disabled>Fuente</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Times New Roman, serif">Times New Roman</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="Courier New, monospace">Courier New</option>
        </select>

        <select onMouseDown={e => e.stopPropagation()}
          onChange={e => { editorRef.current?.focus(); document.execCommand('fontSize', false, e.target.value); e.target.value = '_'; updatePageCount(); }}
          defaultValue="_"
          className="h-7 w-16 text-[11px] border border-[#E2E8F0] rounded px-1 bg-white text-[#1E293B] focus:outline-none cursor-pointer">
          <option value="_" disabled>Tam.</option>
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">32pt</option>
        </select>

        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        <Btn onDown={exec('bold')}          title="Negrita (Ctrl+B)"><Bold          className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('italic')}        title="Cursiva (Ctrl+I)"><Italic        className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('underline')}     title="Subrayado (Ctrl+U)"><Underline   className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('strikeThrough')} title="Tachado"><Strikethrough           className="w-3.5 h-3.5" /></Btn>

        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        {/* Text color */}
        <button title="Color de texto"
          onMouseDown={e => { e.preventDefault(); colorTextRef.current?.click(); }}
          className="flex items-center gap-0.5 h-7 px-1.5 rounded text-[#1E293B] hover:bg-[#EEF2FF] transition-colors">
          <span className="text-[12px] font-black" style={{ textDecoration: 'underline', textDecorationColor: '#EB5F46', textDecorationThickness: '2px' }}>A</span>
          <ChevronDown className="w-2.5 h-2.5 text-[#94A3B8]" />
        </button>
        <input ref={colorTextRef} type="color" defaultValue="#1a1a2e"
          onChange={e => { editorRef.current?.focus(); document.execCommand('foreColor', false, e.target.value); updatePageCount(); }}
          className="hidden" />

        {/* Highlight color */}
        <button title="Resaltado"
          onMouseDown={e => { e.preventDefault(); colorBgRef.current?.click(); }}
          className="flex items-center gap-0.5 h-7 px-1.5 rounded text-[#1E293B] hover:bg-[#EEF2FF] transition-colors">
          <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#FDE047', padding: '0 3px', borderRadius: '2px' }}>H</span>
          <ChevronDown className="w-2.5 h-2.5 text-[#94A3B8]" />
        </button>
        <input ref={colorBgRef} type="color" defaultValue="#FDE047"
          onChange={e => { editorRef.current?.focus(); document.execCommand('hiliteColor', false, e.target.value); updatePageCount(); }}
          className="hidden" />

        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        <Btn onDown={exec('justifyLeft')}   title="Izquierda"><AlignLeft    className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('justifyCenter')} title="Centrar"><AlignCenter     className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('justifyRight')}  title="Derecha"><AlignRight      className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('justifyFull')}   title="Justificado"><AlignJustify className="w-3.5 h-3.5" /></Btn>

        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        <Btn onDown={exec('insertUnorderedList')} title="Lista viñetas"><List        className="w-3.5 h-3.5" /></Btn>
        <Btn onDown={exec('insertOrderedList')}   title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></Btn>

        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />

        <button title="Insertar tabla"
          onMouseDown={e => { e.preventDefault(); setShowTableDlg(true); }}
          className="flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold text-[#1E293B] hover:bg-[#EEF2FF] hover:text-[#4F5AF5] border border-transparent hover:border-[#C7D2FE] transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          Tabla
        </button>

        <button title="Insertar imagen desde archivo"
          onMouseDown={e => { e.preventDefault(); imageInputRef.current?.click(); }}
          className="flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold text-[#1E293B] hover:bg-[#EEF2FF] hover:text-[#4F5AF5] border border-transparent hover:border-[#C7D2FE] transition-colors">
          <Image className="w-3.5 h-3.5" />
          Imagen
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />

        {/* Salto de página button */}
        <button title="Insertar salto de página explícito"
          onMouseDown={e => { e.preventDefault(); insertPageBreak(); }}
          className="flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold text-[#4F5AF5] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] transition-colors">
          <Scissors className="w-3.5 h-3.5 text-[#4F5AF5]" />
          Salto de Página
        </button>

        {/* Quitar Líneas button */}
        <button title="Eliminar automáticamente líneas decorativas grises o bordes de la plantilla"
          onMouseDown={e => { e.preventDefault(); removeDecorativeLines(); }}
          className="flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors">
          <Eraser className="w-3.5 h-3.5 text-rose-600" />
          Quitar Líneas
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1 ml-auto">
          <button onMouseDown={e => { e.preventDefault(); setZoom(z => +(Math.max(0.5, z - 0.05)).toFixed(2)); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F5F9] text-[#64748B]" title="Reducir zoom">
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono text-[#64748B] w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onMouseDown={e => { e.preventDefault(); setZoom(z => +(Math.min(1.5, z + 0.05)).toFixed(2)); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F5F9] text-[#64748B]" title="Aumentar zoom">
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── LEFT: Margins (oculto en preview o modo código) ── */}
        <div className={`shrink-0 w-44 bg-white border-r border-[#E2E8F0] p-4 overflow-y-auto flex flex-col gap-5 transition-opacity ${isPreview || viewMode === 'code' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div>
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Márgenes (mm)</p>
            <MarginRow side="top"    label="Superior"  />
            <MarginRow side="right"  label="Derecho"   />
            <MarginRow side="bottom" label="Inferior"  />
            <MarginRow side="left"   label="Izquierdo" />
            <p className="text-[9px] text-[#CBD5E1] mt-2 leading-relaxed">Las guías azules indican los márgenes internos de cada página.</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Atajos</p>
            {[['Ctrl+B','Negrita'],['Ctrl+I','Cursiva'],['Ctrl+U','Subrayado'],['Ctrl+Z','Deshacer'],['Ctrl+Y','Rehacer']].map(([k,l]) => (
              <div key={k} className="flex items-center justify-between mb-1">
                <code className="text-[9px] bg-[#EEF2FF] text-[#4F5AF5] px-1 rounded">{k}</code>
                <span className="text-[9px] text-[#94A3B8]">{l}</span>
              </div>
            ))}
          </div>
          <div className="p-2.5 bg-[#EEF2FF] rounded-lg border border-[#C7D2FE]">
            <p className="text-[9px] text-[#4F5AF5] leading-relaxed font-medium">
              Separación de hojas A4 activa tipo Word. Las guías respetan exactamente tus márgenes.
            </p>
          </div>
        </div>

        {/* ── CENTER AREA: AMBOS CONTENEDORES PERMANECEN SIEMPRE EN EL DOM ── */}

        {/* 1. EDITOR DE CÓDIGO HTML */}
        <div style={{ display: viewMode === 'code' ? 'flex' : 'none' }} className="flex-1 flex-col bg-[#0F172A] p-4 overflow-hidden">
          {/* Header del Editor de Código con Buscador de Texto Integrado */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-[#1E293B] border border-[#334155] px-4 py-2 rounded-t-xl text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-white whitespace-nowrap">Editor de Código Fuente HTML</span>
            </div>

            {/* Buscador de texto en código HTML */}
            <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] focus-within:border-sky-500 px-2.5 py-1 rounded-lg transition-colors">
              <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <input
                type="text"
                value={codeSearchQuery}
                onChange={(e) => setCodeSearchQuery(e.target.value)}
                placeholder="Buscar texto o etiqueta (ej. SECCIÓN 1, table, registrador)..."
                className="bg-transparent text-xs text-[#38BDF8] placeholder-[#64748B] focus:outline-none w-44 sm:w-64 font-mono select-text"
              />
              {codeSearchQuery && (
                <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] font-mono shrink-0 pl-1.5 border-l border-[#334155]">
                  <span className="font-semibold text-sky-400">
                    {codeMatches.length > 0 ? `${currentMatchIndex + 1}/${codeMatches.length}` : '0/0'}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    disabled={codeMatches.length === 0}
                    title="Anterior coincidencia"
                    className="hover:text-white disabled:opacity-30 p-0.5 transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    disabled={codeMatches.length === 0}
                    title="Siguiente coincidencia"
                    className="hover:text-white disabled:opacity-30 p-0.5 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeSearchQuery('')}
                    title="Limpiar búsqueda"
                    className="hover:text-rose-400 text-slate-500 pl-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeHtml);
                  setMessage({ text: '✓ Código HTML copiado al portapapeles.', type: 'success' });
                  setTimeout(() => setMessage(null), 3000);
                }}
                className="px-3 py-1 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                Copiar HTML
              </button>
              <button
                onClick={toggleViewMode}
                className="px-3 py-1 bg-[#4F5AF5] hover:bg-[#3F49E0] text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver Resultado Visual
              </button>
            </div>
          </div>

          {/* CONTENEDOR CON CAPA DE RESALTADO VISUAL DE BÚSQUEDA */}
          <div className="relative flex-1 w-full bg-[#020617] overflow-hidden rounded-b-xl border-x border-b border-[#334155]">
            {/* Capa 1: Resaltado visual en amarillo/neón para todas las coincidencias */}
            {codeSearchQuery.trim() && (
              <pre
                ref={codeHighlightRef}
                className="absolute inset-0 p-4 font-mono text-xs leading-relaxed tracking-wide pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-transparent z-10"
                style={{ tabSize: 2, margin: 0 }}
              >
                {renderHighlightedCode(codeHtml, codeSearchQuery, currentMatchIndex)}
              </pre>
            )}

            {/* Capa 2: Editor Interactivo Textarea */}
            <textarea
              ref={codeTextareaRef}
              value={codeHtml}
              onScroll={(e) => {
                if (codeHighlightRef.current) {
                  codeHighlightRef.current.scrollTop = e.currentTarget.scrollTop;
                  codeHighlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setCodeHtml(val);
                if (editorRef.current) {
                  editorRef.current.innerHTML = val;
                }
              }}
              placeholder="Escribe o pega aquí tu código HTML..."
              className="absolute inset-0 w-full h-full bg-transparent text-[#38BDF8] font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed tracking-wide select-text whitespace-pre-wrap break-words z-20"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        {/* 2. CANVAS VISUAL A4 (WYSIWYG) */}
        <div ref={canvasScrollRef} style={{ display: viewMode === 'visual' ? 'block' : 'none', background: '#334155' }} className="flex-1 overflow-auto">
          <div className="flex justify-center py-8 px-4">
            <div style={{ width: `${A4_W_PX * zoom}px`, flexShrink: 0, position: 'relative' }}>
              {/* Zoom wrapper */}
              <div style={{
                width: `${A4_W_PX}px`,
                minHeight: `${totalCanvasH}px`,
                transformOrigin: 'top left',
                transform: `scale(${zoom})`,
                position: 'absolute',
                top: 0, left: 0,
              }}>
                {/* Continuous Page Container */}
                <div
                  style={{
                    width: `${A4_W_PX}px`,
                    minHeight: `${totalCanvasH}px`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    boxSizing: 'border-box',
                    paddingTop: padT, paddingRight: padR,
                    paddingBottom: padB, paddingLeft: padL,
                    position: 'relative',
                  }}
                >

                  {/* ─────────────────────────────────────────────────────────────
                   * 1. GUÍAS DE MÁRGENES DENTRO DE CADA PÁGINA (RESPECTAN LOS MÁRGENES)
                   * ───────────────────────────────────────────────────────────── */}
                  {!isPreview && (<>
                    {/* Guías laterales (Izquierda y Derecha) */}
                    <div style={{ position:'absolute', left:padL, top:0, bottom:0, width:1, borderLeft:'1px dashed rgba(79,90,245,0.25)', pointerEvents:'none', zIndex:5 }} />
                    <div style={{ position:'absolute', right:padR, top:0, bottom:0, width:1, borderRight:'1px dashed rgba(79,90,245,0.25)', pointerEvents:'none', zIndex:5 }} />

                    {/* Guías horizontales (Superior e Inferior) para cada página A4 */}
                    {Array.from({ length: pageCount }).map((_, idx) => {
                      const pTop = idx * A4_H_PX;
                      const pBottom = (idx + 1) * A4_H_PX;
                      return (
                        <React.Fragment key={idx}>
                          <div style={{
                            position: 'absolute',
                            top: `${pTop + padT}px`,
                            left: padL,
                            right: padR,
                            height: 1,
                            borderTop: '1px dashed rgba(79,90,245,0.25)',
                            pointerEvents: 'none',
                            zIndex: 5
                          }} />
                          <div style={{
                            position: 'absolute',
                            top: `${pBottom - padB}px`,
                            left: padL,
                            right: padR,
                            height: 1,
                            borderTop: '1px dashed rgba(79,90,245,0.25)',
                            pointerEvents: 'none',
                            zIndex: 5
                          }} />
                        </React.Fragment>
                      );
                    })}
                  </>)}

                  {/* ─────────────────────────────────────────────────────────────
                   * 2. SEPARADOR DE HOJAS ESTILO WORD (CORTE FÍSICO GRIS OSCURO)
                   * Visible TANTO en edición como en vista previa
                   * ───────────────────────────────────────────────────────────── */}
                  {Array.from({ length: Math.max(0, pageCount - 1) }).map((_, idx) => {
                    const breakY = (idx + 1) * A4_H_PX;
                    const gapH = 36; // Altura de la brecha estilo Word
                    const gapT = breakY - (gapH / 2);
                    return (
                      <div
                        key={`gap-${idx}`}
                        style={{
                          position: 'absolute',
                          top: `${gapT}px`,
                          left: 0,
                          right: 0,
                          height: `${gapH}px`,
                          backgroundColor: '#334155', // Coincide con la mesa de trabajo
                          boxShadow: 'inset 0 8px 12px -3px rgba(0,0,0,0.4), inset 0 -8px 12px -3px rgba(0,0,0,0.4)',
                          zIndex: 10,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Centered Page Break Badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          backgroundColor: '#1E293B',
                          color: '#CBD5E1',
                          fontSize: '9.5px',
                          fontWeight: 'bold',
                          padding: '4px 16px',
                          borderRadius: '14px',
                          border: '1px solid #475569',
                          letterSpacing: '0.8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                          <span style={{ color: '#E2E8F0' }}>📄 PÁGINA {idx + 1}</span>
                          <span style={{ color: '#64748B', fontSize: '8px' }}>&bull; SEPARACIÓN DE HOJA A4 &bull;</span>
                          <span style={{ color: '#E2E8F0' }}>PÁGINA {idx + 2} 📄</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable={!isPreview}
                    suppressContentEditableWarning
                    onBlur={saveSelection}
                    onInput={updatePageCount}
                    style={{
                      display: isPreview ? 'none' : 'block',
                      minHeight: totalCanvasH - padT - padB,
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11pt',
                      lineHeight: 1.5,
                      color: '#1a1a2e',
                      outline: 'none',
                      position: 'relative',
                      zIndex: 2,
                    }}
                    className="[&_table]:border-collapse [&_td]:align-top [&_th]:align-top"
                  />

                  {/* Preview */}
                  <div
                    ref={previewRef}
                    style={{
                      display: isPreview ? 'block' : 'none',
                      minHeight: totalCanvasH - padT - padB,
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11pt',
                      lineHeight: 1.5,
                      color: '#1a1a2e',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  />
                </div>
              </div>
              {/* Spacer to reserve vertical space for zoomed pages */}
              <div style={{ height: `${totalCanvasH * zoom + 40}px` }} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Variables ── */}
        <div className="shrink-0 w-64 bg-white border-l border-[#E2E8F0] overflow-y-auto p-4 z-20 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Variables ({allVariables.length})</p>
          </div>
          <p className="text-[9px] text-[#94A3B8] leading-relaxed mb-3">
            {isPreview ? 'Datos de ejemplo aplicados.' : 'Clic para insertar en el cursor.'}
          </p>

          <div className="mb-3">
            <input
              type="text"
              placeholder="🔍 Buscar campo o variable..."
              value={varSearch}
              onChange={e => setVarSearch(e.target.value)}
              className="w-full text-[11px] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F5AF5] focus:border-[#4F5AF5]"
            />
          </div>

          <div className="flex-1 space-y-4">
            {['Iniciativa', 'Personas', 'Formulario Inicial', 'Campos del Formulario', 'Archivos'].map(group => {
              const groupVars = filteredVars.filter(v => v.group === group);
              if (groupVars.length === 0) return null;
              return (
                <div key={group}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[8px] font-bold text-[#CBD5E1] uppercase tracking-widest">{group}</p>
                    <span className="text-[8px] font-mono text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{groupVars.length}</span>
                  </div>
                  <div className="space-y-1">
                    {groupVars.map(v => (
                      <button key={v.key}
                        onClick={() => !isPreview && insertVariable(v.key)}
                        disabled={isPreview}
                        className={`w-full text-left p-2 rounded-lg border transition-all ${
                          v.group === 'Archivos'
                            ? 'border-amber-200 bg-amber-50 hover:border-amber-400'
                            : 'border-[#E2E8F0] hover:border-[#4F5AF5] hover:bg-[#EEF2FF]'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}>
                        <div className="flex items-start justify-between gap-1">
                          <code className={`text-[9px] font-bold break-all leading-tight ${v.group === 'Archivos' ? 'text-amber-700' : 'text-[#4F5AF5]'}`}>{v.key}</code>
                          {copiedVar === v.key && <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[9px] text-[#64748B] mt-0.5 leading-tight font-medium">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg shrink-0">
            <p className="text-[9px] text-amber-700 leading-relaxed">
              <strong>{'{{imagenes_adjuntas}}'}</strong> se reemplaza automáticamente con las imágenes adjuntas del usuario. Si no hay imágenes, el bloque desaparece del PDF.
            </p>
          </div>
        </div>
      </div>

      {/* ══ TABLE DIALOG ══ */}
      {showTableDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTableDlg(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-72 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1E293B]">Insertar Tabla</h3>
              <button onClick={() => setShowTableDlg(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-[#64748B] block mb-1.5">Filas</label>
                <input type="number" min="1" max="20" value={tableRows}
                  onChange={e => setTableRows(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4F5AF5]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#64748B] block mb-1.5">Columnas</label>
                <input type="number" min="1" max="10" value={tableCols}
                  onChange={e => setTableCols(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4F5AF5]" />
              </div>
            </div>
            <div className="mb-5 p-3 bg-[#F8FAFC] rounded-lg overflow-auto">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tableCols, 8)}, 1fr)`, gap: '2px' }}>
                {Array.from({ length: Math.min(tableRows, 5) * Math.min(tableCols, 8) }).map((_, i) => {
                  const isHdr = Math.floor(i / Math.min(tableCols, 8)) === 0;
                  return <div key={i} className={`h-5 rounded-sm border text-[8px] flex items-center justify-center ${isHdr ? 'bg-[#EEF2FF] border-[#818CF8] text-[#4F5AF5]' : 'bg-white border-[#CBD5E1]'}`}>{isHdr ? 'H' : ''}</div>;
                })}
              </div>
              <p className="text-[9px] text-[#94A3B8] mt-2 text-center">Fila 1 = encabezados</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTableDlg(false)} className="px-4 py-2 text-xs font-semibold text-[#64748B] bg-[#F1F5F9] rounded-xl hover:bg-[#E2E8F0] transition-colors">Cancelar</button>
              <button onClick={insertTable} className="px-4 py-2 text-xs font-bold text-white bg-[#4F5AF5] rounded-xl hover:bg-[#3F49E0] transition-colors">Insertar Tabla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
