-- Migration: 20260921000000_ai_knowledge_folders.sql
-- Description: Create ai_knowledge_folders table with max 3 levels hierarchy and link to ai_training_config

CREATE TABLE IF NOT EXISTS public.ai_knowledge_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID NULL REFERENCES public.ai_knowledge_folders(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 3),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_knowledge_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_knowledge_folders' AND policyname = 'Allow read for all on ai_knowledge_folders'
  ) THEN
    CREATE POLICY "Allow read for all on ai_knowledge_folders"
      ON public.ai_knowledge_folders FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_knowledge_folders' AND policyname = 'Allow write for all on ai_knowledge_folders'
  ) THEN
    CREATE POLICY "Allow write for all on ai_knowledge_folders"
      ON public.ai_knowledge_folders FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.ai_training_config 
ADD COLUMN IF NOT EXISTS folder_id UUID NULL REFERENCES public.ai_knowledge_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_training_config_folder_id 
ON public.ai_training_config(folder_id);
