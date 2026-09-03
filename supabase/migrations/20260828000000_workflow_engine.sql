-- IACS Workflow Engine — Migration
-- File: supabase/migrations/20260828000000_workflow_engine.sql
-- Run: npx supabase db push (or copy to SQL Editor in Supabase dashboard)

-- 1. workflow_definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  version      integer NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','published','archived')),
  graph_json   jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  description  text,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- Only one published workflow at a time
CREATE UNIQUE INDEX IF NOT EXISTS workflow_definitions_one_published
  ON workflow_definitions(status) WHERE status = 'published';

-- 2. workflow_node_roles
CREATE TABLE IF NOT EXISTS workflow_node_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  node_id         text NOT NULL,
  role_name       text NOT NULL,
  can_edit        boolean NOT NULL DEFAULT false,
  can_approve     boolean NOT NULL DEFAULT false,
  can_reject      boolean NOT NULL DEFAULT false,
  required_fields jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_node_roles_lookup ON workflow_node_roles(workflow_id, node_id);

-- 3. workflow_transitions
CREATE TABLE IF NOT EXISTS workflow_transitions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  edge_id          text NOT NULL,
  label            text NOT NULL,
  source_node_id   text NOT NULL,
  target_node_id   text NOT NULL,
  condition_type   text NOT NULL
                   CHECK (condition_type IN ('always','field_required','vobo_check','role_only')),
  condition_config jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_lookup ON workflow_transitions(workflow_id, source_node_id);

-- 4. workflow_role_assignments
CREATE TABLE IF NOT EXISTS workflow_role_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_name   text NOT NULL,
  assigned_by uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, user_id, role_name)
);
CREATE INDEX IF NOT EXISTS idx_workflow_role_assignments_lookup ON workflow_role_assignments(workflow_id, user_id);

-- 5. workflow_audit_log
CREATE TABLE IF NOT EXISTS workflow_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflow_definitions(id),
  actor_id    uuid REFERENCES profiles(id),
  action      text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. Extend initiatives table
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS workflow_version text,
  ADD COLUMN IF NOT EXISTS current_node_id  text;

CREATE INDEX IF NOT EXISTS idx_initiatives_workflow
  ON initiatives(workflow_version, current_node_id)
  WHERE workflow_version IS NOT NULL;
