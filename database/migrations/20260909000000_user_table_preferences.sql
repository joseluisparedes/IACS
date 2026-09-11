-- Migration: 20260909000000_user_table_preferences.sql
-- Description: User table preferences for column order, widths, and visibility

CREATE TABLE IF NOT EXISTS user_table_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, table_id)
);

CREATE INDEX IF NOT EXISTS idx_user_table_prefs_lookup 
  ON user_table_preferences(user_id, table_id);

ALTER TABLE user_table_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_table_preferences' 
    AND policyname = 'Users can manage their own table preferences'
  ) THEN
    CREATE POLICY "Users can manage their own table preferences"
      ON user_table_preferences
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
