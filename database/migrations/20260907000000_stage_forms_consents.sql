-- IACS — Stage Forms and Consents Migration
-- Migration: 20260907000000_stage_forms_consents.sql

-- 1. Tabla de Formularios de Etapa
CREATE TABLE IF NOT EXISTS public.stage_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Consentimientos Institucionales
CREATE TABLE IF NOT EXISTS public.stage_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Registros / Expediente de Etapas por Iniciativa
CREATE TABLE IF NOT EXISTS public.initiative_stage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id TEXT NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  stage_name TEXT,
  form_id UUID REFERENCES public.stage_forms(id) ON DELETE SET NULL,
  consent_id UUID REFERENCES public.stage_consents(id) ON DELETE SET NULL,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  form_data JSONB DEFAULT '{}'::jsonb,
  consent_accepted BOOLEAN DEFAULT true,
  consent_text_snapshot TEXT,
  action_taken TEXT DEFAULT 'approved',
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.stage_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiative_stage_records ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "stage_forms viewable by authenticated" ON public.stage_forms;
CREATE POLICY "stage_forms viewable by authenticated" ON public.stage_forms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "stage_forms manage by authenticated" ON public.stage_forms;
CREATE POLICY "stage_forms manage by authenticated" ON public.stage_forms FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "stage_consents viewable by authenticated" ON public.stage_consents;
CREATE POLICY "stage_consents viewable by authenticated" ON public.stage_consents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "stage_consents manage by authenticated" ON public.stage_consents;
CREATE POLICY "stage_consents manage by authenticated" ON public.stage_consents FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "stage_records viewable by authenticated" ON public.initiative_stage_records;
CREATE POLICY "stage_records viewable by authenticated" ON public.initiative_stage_records FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "stage_records manage by authenticated" ON public.initiative_stage_records;
CREATE POLICY "stage_records manage by authenticated" ON public.initiative_stage_records FOR ALL TO authenticated USING (true);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_stage_records_init ON public.initiative_stage_records(initiative_id);
CREATE INDEX IF NOT EXISTS idx_stage_records_node ON public.initiative_stage_records(node_id);
