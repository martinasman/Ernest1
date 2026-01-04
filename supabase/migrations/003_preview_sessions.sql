-- Preview sessions for Fly.io live preview
-- Tracks ephemeral VMs for website preview

CREATE TABLE IF NOT EXISTS preview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Fly.io machine info
  machine_id TEXT NOT NULL,
  machine_ip TEXT,
  region TEXT DEFAULT 'arn',

  -- Preview URLs
  preview_url TEXT,
  sync_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'running', 'stopping', 'stopped', 'error')),
  error_message TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),

  -- Metadata
  files_synced_at TIMESTAMPTZ,
  file_count INTEGER DEFAULT 0
);

-- Index for fast workspace lookups
CREATE INDEX IF NOT EXISTS idx_preview_sessions_workspace ON preview_sessions(workspace_id);

-- Index for cleanup queries (find expired sessions)
CREATE INDEX IF NOT EXISTS idx_preview_sessions_expires ON preview_sessions(expires_at) WHERE status = 'running';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_preview_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER preview_sessions_updated_at
  BEFORE UPDATE ON preview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_preview_sessions_updated_at();

-- RLS policies
ALTER TABLE preview_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see preview sessions for workspaces they're members of
CREATE POLICY "Users can view own workspace preview sessions"
  ON preview_sessions
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create preview sessions for their workspaces
CREATE POLICY "Users can create preview sessions"
  ON preview_sessions
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their preview sessions
CREATE POLICY "Users can update own preview sessions"
  ON preview_sessions
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete their preview sessions
CREATE POLICY "Users can delete own preview sessions"
  ON preview_sessions
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE preview_sessions IS 'Tracks ephemeral Fly.io VMs for live website preview';
COMMENT ON COLUMN preview_sessions.machine_id IS 'Fly.io machine ID';
COMMENT ON COLUMN preview_sessions.preview_url IS 'Public URL for the Vite preview (port 5173)';
COMMENT ON COLUMN preview_sessions.sync_url IS 'Internal URL for file sync server (port 3001)';
