import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Initiative } from '../types';

interface PDFProps {
  initiative: any;
  template: string;
}

export const ExecutiveReportPDF = React.forwardRef<HTMLDivElement, PDFProps>(({ initiative, template }, ref) => {
  if (!initiative) return null;

  const { form_data } = initiative;

  const processedHtml = useMemo(() => {
    if (!template) return '';

    let html = template;
    const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Replace hardcoded extra variables
    html = html.replace(/{{id_corta}}/g, '#' + (initiative.id || '').substring(0, 8).toUpperCase());
    html = html.replace(/{{fecha_actual}}/g, today);
    html = html.replace(/{{estado_actual}}/g, initiative.status || 'Desconocido');

    // Replace form_data variables dynamically
    // Use regex to match all {{key}} inside the HTML
    html = html.replace(/{{(.*?)}}/g, (match, key) => {
      const cleanKey = key.trim();
      // Only replace if we have it in form_data, else leave it as is or empty string
      if (form_data[cleanKey] !== undefined) {
        return String(form_data[cleanKey]) || '';
      }
      return match; // Keep the placeholder if no match found
    });

    // Replace any remaining known defaults
    html = html.replace(/{{registrador}}/g, 'No especificado');
    html = html.replace(/{{direccion}}/g, 'N/A');
    html = html.replace(/{{institucion}}/g, 'N/A');
    html = html.replace(/{{bp_ti_asignado}}/g, 'No asignado');
    html = html.replace(/{{fecha_requerida}}/g, 'No especificada');
    html = html.replace(/{{descripcion_de_la_necesidad}}/g, 'Sin descripción.');
    html = html.replace(/{{beneficio_cuantitativo_anual}}/g, 'No especificado');
    html = html.replace(/{{proceso_y_areas_impactadas}}/g, 'No especificado');
    
    // Cleanup any unresolved placeholders (optional but clean)
    html = html.replace(/{{(.*?)}}/g, '');

    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'
      ],
      ALLOWED_ATTR: ['href', 'name', 'target', 'style', 'class', 'src', 'alt', 'width', 'height']
    });
  }, [template, initiative, form_data]);

  return (
    <div 
      ref={ref} 
      className="bg-white text-black p-12 font-sans print:p-8" 
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
});
