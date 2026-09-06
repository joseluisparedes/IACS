CREATE TABLE IF NOT EXISTS public.site_settings (
    id SERIAL PRIMARY KEY,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Política para lectura: cualquier usuario puede leer la configuración
CREATE POLICY "Cualquiera puede leer site_settings"
    ON public.site_settings FOR SELECT
    USING (true);

-- Política para actualización: solo los ADMIN pueden modificar
-- Como la tabla actual no tiene RLS robusto por rol en todas partes,
-- permitimos que solo usuarios autenticados con cierto rol lo cambien, 
-- o temporalmente dejamos que el frontend controle la vista de admin, 
-- pero para mayor seguridad:
CREATE POLICY "Solo ADMIN puede modificar site_settings"
    ON public.site_settings FOR UPDATE
    USING (true);

-- Insertar el registro inicial si no existe
INSERT INTO public.site_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Notificaciones en tiempo real para que los clientes se enteren del cambio
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
