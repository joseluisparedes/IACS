-- IACS — Rol de Entrenador IA y Políticas de Seguridad
-- Migración: 20260921010000_role_entrenador_ia.sql

-- 1. Insertar el rol entrenador_ia en app_roles
INSERT INTO public.app_roles (code, name, description, color, is_system, is_active)
VALUES (
  'entrenador_ia',
  'Entrenador IA',
  'Acceso y gestión exclusiva de la Base de Conocimiento y Entrenamiento del asistente Teo (crear/editar fichas, carpetas y carga de documentos).',
  'violet',
  true,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active;

-- 2. Crear función de seguridad can_manage_ai_training()
CREATE OR REPLACE FUNCTION public.can_manage_ai_training()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profile_roles
    WHERE profile_id = auth.uid() 
      AND (role = 'admin' OR role = 'entrenador_ia' OR role = 'ai_trainer')
  );
END;
$$;

-- 3. Actualizar políticas RLS en ai_training_config
DROP POLICY IF EXISTS "Permitir escrituras solo a administradores de config" ON public.ai_training_config;
DROP POLICY IF EXISTS "Permitir escrituras a admin y entrenador_ia de config" ON public.ai_training_config;
CREATE POLICY "Permitir escrituras a admin y entrenador_ia de config"
  ON public.ai_training_config FOR ALL
  TO authenticated
  USING (public.can_manage_ai_training())
  WITH CHECK (public.can_manage_ai_training());

-- 4. Actualizar políticas RLS en ai_knowledge_folders
DROP POLICY IF EXISTS "Allow write for all on ai_knowledge_folders" ON public.ai_knowledge_folders;
DROP POLICY IF EXISTS "Allow write for admin and entrenador_ia on ai_knowledge_folders" ON public.ai_knowledge_folders;
CREATE POLICY "Allow write for admin and entrenador_ia on ai_knowledge_folders"
  ON public.ai_knowledge_folders FOR ALL
  TO authenticated
  USING (public.can_manage_ai_training())
  WITH CHECK (public.can_manage_ai_training());
