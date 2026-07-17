-- Add pdf_template column to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS pdf_template TEXT;

-- Provide a default HTML template for the PDF if it's empty
UPDATE public.site_settings
SET pdf_template = '<div style="font-family: sans-serif; color: #000; background: #fff; padding: 48px;">
  <!-- Portada -->
  <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 280mm; border-bottom: 2px solid #e5e7eb;">
    <h2 style="font-size: 1.25rem; font-weight: bold; letter-spacing: 0.1em; color: #eb5f46; text-transform: uppercase; margin-bottom: 1rem;">Laureate International Universities</h2>
    <h1 style="font-size: 2.25rem; font-weight: 800; text-align: center; color: #1e3a8a; margin-bottom: 2rem; max-width: 42rem; line-height: 1.25;">
      {{titulo_de_la_necesidad}}
    </h1>
    <div style="background-color: #eff6ff; color: #1e40af; padding: 0.5rem 1.5rem; border-radius: 9999px; font-weight: 600; margin-bottom: 3rem;">
      INFORME EJECUTIVO
    </div>
    <div style="margin-top: 5rem; text-align: center; color: #6b7280; font-family: sans-serif; display: flex; flex-direction: column; gap: 0.5rem;">
      <p style="font-weight: 500; font-size: 1.125rem; color: #374151; margin: 0;">ID de Iniciativa: <span style="font-weight: bold; color: #111827;">{{id_corta}}</span></p>
      <p style="font-size: 0.875rem; margin: 0;">Fecha de Generación: {{fecha_actual}}</p>
    </div>
  </div>

  <div style="page-break-before: always;"></div>

  <!-- Detalles Generales -->
  <div style="padding: 2rem;">
    <h3 style="font-size: 1.5rem; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #dbeafe; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Resumen de la Iniciativa</h3>
    
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      <div>
        <p style="font-size: 0.75rem; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Key User / Registrador</p>
        <p style="font-size: 1rem; font-weight: 500; color: #111827; margin: 0;">{{registrador}}</p>
      </div>
      <div>
        <p style="font-size: 0.75rem; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Dirección / Institución</p>
        <p style="font-size: 1rem; font-weight: 500; color: #111827; margin: 0;">{{direccion}} - {{institucion}}</p>
      </div>
      <div>
        <p style="font-size: 0.75rem; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">BP TI Asignado</p>
        <p style="font-size: 1rem; font-weight: 500; color: #111827; margin: 0;">{{bp_ti_asignado}}</p>
      </div>
      <div>
        <p style="font-size: 0.75rem; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Fecha Requerida</p>
        <p style="font-size: 1rem; font-weight: 500; color: #111827; margin: 0;">{{fecha_requerida}}</p>
      </div>
    </div>

    <h3 style="font-size: 1.25rem; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 2rem;">Detalle de la Necesidad</h3>
    <div style="background-color: #f9fafb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 2rem; color: #1f2937; line-height: 1.625; text-align: justify; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
      {{descripcion_de_la_necesidad}}
    </div>

    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      <div style="display: flex; flex-direction: column;">
        <h3 style="font-size: 1.125rem; font-weight: bold; color: #1e3a8a; margin-bottom: 0.5rem;">Impacto y Beneficio</h3>
        <div style="background-color: rgba(239, 246, 255, 0.5); border-radius: 0.5rem; padding: 1.25rem; flex: 1; border: 1px solid #dbeafe; display: flex; flex-direction: column; justify-content: center;">
          <p style="font-size: 0.875rem; font-weight: bold; color: #1e40af; margin-bottom: 0.5rem;">Beneficio Cuantitativo (Anual)</p>
          <p style="font-size: 1.25rem; font-weight: 800; color: #1e3a8a; word-wrap: break-word; margin: 0;">{{beneficio_cuantitativo_anual}}</p>
        </div>
      </div>
      <div style="display: flex; flex-direction: column;">
        <h3 style="font-size: 1.125rem; font-weight: bold; color: #1e3a8a; margin-bottom: 0.5rem;">Áreas Involucradas</h3>
        <div style="background-color: #f9fafb; border-radius: 0.5rem; padding: 1.25rem; flex: 1; border: 1px solid #e5e7eb;">
          <p style="font-size: 0.875rem; color: #1f2937; line-height: 1.625; word-wrap: break-word; margin: 0;">{{proceso_y_areas_impactadas}}</p>
        </div>
      </div>
    </div>
    
    <h3 style="font-size: 1.25rem; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 2rem;">Información Adicional</h3>
    
    <div style="display: flex; flex-direction: column; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f3f4f6;">
      <div style="width: 33%; font-weight: 600; color: #4b5563; font-size: 0.875rem; text-transform: capitalize;">Situación Deseada</div>
      <div style="width: 66%; color: #111827; font-size: 0.875rem; word-wrap: break-word; line-height: 1.625;">{{situacion_deseada}}</div>
    </div>
  </div>
</div>'
WHERE id = 1 AND (pdf_template IS NULL OR pdf_template = '');
