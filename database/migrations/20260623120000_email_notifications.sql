-- Alter vps table
ALTER TABLE vps ADD COLUMN IF NOT EXISTS email text;

-- Alter direcciones table
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS director_name text;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS email text;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id text,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow read for admin role
CREATE POLICY "Allow select for admin" ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile_roles pr
      WHERE pr.profile_id = auth.uid() AND pr.role = 'admin'
    )
  );

-- All policy for service role (backend operations)
CREATE POLICY "Allow all for service_role" ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
