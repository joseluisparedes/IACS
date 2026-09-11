-- IACS — App Roles Catalog Migration
-- Migration: 20260906000000_app_roles.sql

CREATE TABLE IF NOT EXISTS public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'indigo',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON public.app_roles;
CREATE POLICY "Roles are viewable by authenticated users"
  ON public.app_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Roles are viewable by anon users" ON public.app_roles;
CREATE POLICY "Roles are viewable by anon users"
  ON public.app_roles FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.app_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.app_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_roles
      WHERE profile_roles.profile_id = auth.uid()
      AND profile_roles.role = 'admin'
    )
  );

-- Seed Initial System Roles
INSERT INTO public.app_roles (code, name, description, color, is_system, is_active) VALUES
  ('admin', 'Administrador General', 'Control total de la plataforma, usuarios, roles y configuración.', 'rose', true, true),
  ('registrador', 'Key user (Registrador)', 'Crea y edita iniciativas para su Vicepresidencia y Dirección asignadas.', 'blue', true, true),
  ('bp_ti', 'Business Partner TI (BP)', 'Evalúa, revisa y gestiona el flujo de iniciativas de TI.', 'indigo', true, true),
  ('invitado', 'Invitado (Solo lectura)', 'Visualización de iniciativas y reportes sin permisos de edición.', 'slate', true, true)
ON CONFLICT (code) DO NOTHING;
