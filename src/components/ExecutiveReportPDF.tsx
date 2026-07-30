import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface PDFProps {
  initiative: any;
  template: string;
}

interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ── Parse template stored as JSON {html, margins} or plain HTML (legacy) ─────
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

// ── Detect if a string looks like a stored file JSON {name, url, type} ────────
function tryParseFileObj(val: any): { name: string; url?: string; type?: string } | null {
  if (!val || typeof val !== 'string') return null;
  try {
    const obj = JSON.parse(val);
    if (obj && typeof obj === 'object' && obj.name) return obj;
  } catch { /* not JSON */ }
  return null;
}

const IMAGE_EXTS = /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i;

// ── Build HTML for attached images section ─────────────────────────────────────
function buildImagesHtml(form_data: Record<string, any>): string {
  const images: Array<{ name: string; url: string }> = [];

  Object.values(form_data ?? {}).forEach(val => {
    const file = tryParseFileObj(val);
    if (!file || !file.url) return;
    const isImage =
      (file.type && file.type.startsWith('image/')) ||
      IMAGE_EXTS.test(file.name ?? '');
    if (isImage) {
      images.push({ name: file.name, url: file.url });
    }
  });

  if (images.length === 0) return ''; // ← condicional: sin imágenes = sin sección

  const imgCards = images.map(img => `
    <div style="display:inline-block; margin:6px; vertical-align:top; max-width:220px; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">
      <img src="${img.url}" alt="${img.name}"
        style="width:220px; max-height:150px; object-fit:contain; display:block; background:#F8FAFC;" />
      <p style="font-size:7.5pt; color:#64748B; padding:4px 8px; margin:0; border-top:1px solid #E2E8F0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${img.name}</p>
    </div>
  `).join('');

  return `
    <div style="margin-bottom:24px; page-break-inside:avoid; break-inside:avoid;">
      <div style="background:#EB5F46; padding:8px 14px; border-radius:6px; margin-bottom:12px; text-align:center;">
        <p style="font-size:9.5pt; font-weight:bold; color:#ffffff; text-transform:uppercase; letter-spacing:1.5px; margin:0; text-align:center;">IMÁGENES ADJUNTAS</p>
      </div>
      <div style="text-align:center;">${imgCards}</div>
    </div>
  `;
}

// ── Replace all {{variables}} with actual initiative data ──────────────────────
function buildProcessedHtml(rawHtml: string, initiative: any): string {
  if (!rawHtml) return '';

  const form_data: Record<string, any> = initiative?.form_data ?? {};
  const summary: Record<string, any> = initiative?.summary ?? {};
  const today = new Date().toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let html = rawHtml;

  // 1. Special system variables
  html = html.replace(/{{id_iniciativa}}/g, String(initiative?.id ?? ''));
  html = html.replace(/{{id_completa}}/g, String(initiative?.id ?? ''));
  html = html.replace(/{{id_corta}}/g, '#' + (initiative?.id ?? '').substring(0, 8).toUpperCase());
  html = html.replace(/{{fecha_actual}}/g, today);
  html = html.replace(/{{estado_actual}}/g, initiative?.status ?? '');
  html = html.replace(
    /{{titulo_de_la_necesidad}}/g,
    summary?.title ?? form_data?.titulo_de_la_necesidad ?? initiative?.title ?? ''
  );

  // 2. Images section (condicional — vacío si no hay imágenes)
  html = html.replace(/{{imagenes_adjuntas}}/g, buildImagesHtml(form_data));

  // 3. Summary fields
  html = html.replace(/{{(.*?)}}/g, (match, key) => {
    const k = key.trim();
    if (summary[k] !== undefined && summary[k] !== null) return String(summary[k]);
    return match;
  });

  // 4. form_data fields (case-insensitive fallback)
  html = html.replace(/{{(.*?)}}/g, (match, key) => {
    const k = key.trim();
    if (form_data[k] !== undefined && form_data[k] !== null) {
      const file = tryParseFileObj(form_data[k]);
      if (file) return file.name ?? '—';
      return String(form_data[k]);
    }
    for (const fdKey of Object.keys(form_data)) {
      if (fdKey.toLowerCase() === k.toLowerCase() && form_data[fdKey] !== null) {
        const file = tryParseFileObj(form_data[fdKey]);
        if (file) return file.name ?? '—';
        return String(form_data[fdKey]);
      }
    }
    return '—';
  });

  // 5. Inyectar la clase "pdf-footer" al bloque de pie de página para que se repita en TODAS las páginas
  if (!html.includes('class="pdf-footer"')) {
    html = html.replace(
      /(<!--\s*PIE DE PÁGINA\s*-->\s*<div)/gi,
      '$1 class="pdf-footer"'
    );
    html = html.replace(
      /(<div\b[^>]*style="[^"]*border-top[^"]*"[^>]*>\s*<div[^>]*>\s*<p[^>]*>Documento generado)/gi,
      '<div class="pdf-footer" $1'
    );
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'div', 'br', 'hr',
      'b', 'i', 'strong', 'em', 'u', 's', 'strike', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'img',
      'a',
    ],
    ALLOWED_ATTR: [
      'href', 'name', 'target', 'rel',
      'style', 'class',
      'src', 'alt', 'width', 'height',
      'colspan', 'rowspan',
    ],
    FORCE_BODY: false,
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const ExecutiveReportPDF = React.forwardRef<HTMLDivElement, PDFProps>(
  ({ initiative, template }, ref) => {
    if (!initiative) return null;

    const { html: rawHtml, margins } = useMemo(
      () => parseStoredTemplate(template),
      [template]
    );

    const processedHtml = useMemo(
      () => buildProcessedHtml(rawHtml, initiative),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rawHtml, initiative?.id, initiative?.status, initiative?.form_data]
    );

    return (
      <div ref={ref}>
        {/*
         * ─ CSS REGULARES DE IMPRESIÓN Y PIE DE PÁGINA REPETITIVO ─
         * Define los márgenes nativos a nivel de motor de impresión para TODAS las páginas.
         */}
        <style>{`
          @page {
            size: A4 portrait;
            margin-top: ${margins.top}mm;
            margin-right: ${margins.right}mm;
            margin-bottom: ${margins.bottom + 8}mm;
            margin-left: ${margins.left}mm;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Pie de página fijo que se REPITE al final de CADA HOJA (Pág 1, 2, 3... N) */
            .pdf-footer, footer, [data-footer="true"] {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              padding-top: 6px !important;
              padding-bottom: 4px !important;
              border-top: 1px solid #E2E8F0 !important;
              z-index: 9999 !important;
              margin: 0 !important;
            }
            /* Garantizar que cajas, bordes, tablas o secciones no se dividan por la mitad */
            table, tr, td, blockquote, img,
            div[style*="border"],
            div[style*="margin-bottom"] {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            /* Ocultar visualmente la barra descriptiva del salto de página en la impresión PDF final */
            div[style*="page-break-before"],
            div[style*="break-before"] {
              break-before: page !important;
              page-break-before: always !important;
              border: none !important;
              background: transparent !important;
              color: transparent !important;
              height: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              font-size: 0 !important;
              line-height: 0 !important;
              overflow: hidden !important;
            }
          }
        `}</style>

        {/* ─ Contenedor de contenido sin padding interno para delegar los márgenes a @page en TODAS las páginas ─ */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.5',
            color: '#1a1a2e',
            backgroundColor: '#ffffff',
          }}
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </div>
    );
  }
);

ExecutiveReportPDF.displayName = 'ExecutiveReportPDF';
