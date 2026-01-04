-- Ernest Database Schema
-- Run this in your Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- CORE: Workspaces & Users
-- ============================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business context
  business_type TEXT,
  business_description TEXT,
  target_market TEXT,
  country_code TEXT DEFAULT 'US',

  -- AI context storage
  ai_context JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- NODES: Core Business Components
-- ============================================

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  tagline TEXT,

  colors JSONB DEFAULT '{
    "primary": "#2563eb",
    "secondary": "#64748b",
    "accent": "#f59e0b",
    "background": "#ffffff",
    "foreground": "#0f172a",
    "muted": "#f1f5f9",
    "destructive": "#ef4444"
  }',
  fonts JSONB DEFAULT '{
    "heading": "Inter",
    "body": "Inter"
  }',
  logo_url TEXT,
  favicon_url TEXT,

  tone_of_voice TEXT DEFAULT 'professional',
  brand_values TEXT[],
  writing_guidelines TEXT,
  border_radius TEXT DEFAULT 'md',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

CREATE TABLE overviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  problems TEXT[],
  existing_alternatives TEXT,
  solutions TEXT[],
  unique_value_proposition TEXT,
  high_level_concept TEXT,
  unfair_advantage TEXT,

  customer_segments JSONB DEFAULT '[]',
  early_adopters TEXT,
  channels TEXT[],
  revenue_streams JSONB DEFAULT '[]',

  key_metrics TEXT[],
  key_resources TEXT[],
  key_activities TEXT[],
  key_partners TEXT[],
  cost_structure JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  domain TEXT,
  deployment_url TEXT,
  status TEXT DEFAULT 'draft',
  last_deployed_at TIMESTAMPTZ,

  meta_title TEXT,
  meta_description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,

  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, slug)
);

CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT DEFAULT 'Business Flow',
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- ============================================
-- DYNAMIC: AI-Generated Internal Tools
-- ============================================

CREATE TABLE internal_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'layout-grid',

  schema_definition JSONB NOT NULL,
  ui_definition JSONB NOT NULL,
  connections JSONB DEFAULT '[]',
  tool_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

CREATE TABLE internal_tool_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES internal_tools(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_records_tool ON internal_tool_records(tool_id);
CREATE INDEX idx_tool_records_data ON internal_tool_records USING gin(data);

-- ============================================
-- SHARED: Cross-cutting concerns
-- ============================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',

  actor_type TEXT DEFAULT 'user',
  actor_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_workspace ON activities(workspace_id, created_at DESC);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  context_type TEXT,
  context_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  status TEXT DEFAULT 'complete',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================
-- KNOWLEDGE: RAG for AI context
-- ============================================

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  embedding VECTOR(1536),

  source_type TEXT NOT NULL,
  source_id UUID,
  chunk_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_workspace ON knowledge_chunks(workspace_id);
CREATE INDEX idx_knowledge_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_knowledge(
  p_workspace_id UUID,
  p_embedding VECTOR(1536),
  p_match_count INT DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.source_type,
    kc.source_id,
    1 - (kc.embedding <=> p_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.workspace_id = p_workspace_id
    AND 1 - (kc.embedding <=> p_embedding) > p_match_threshold
  ORDER BY kc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- ============================================
-- INTEGRATIONS
-- ============================================

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  status TEXT DEFAULT 'disconnected',
  config JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

-- ============================================
-- SUBSCRIPTIONS & BILLING
-- ============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive',
  plan_id TEXT DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_subscription ON subscriptions(stripe_subscription_id);

-- Stripe Connect accounts (for user payments)
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- User's customers (managed via Stripe Connect)
CREATE TABLE user_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, stripe_customer_id)
);

CREATE INDEX idx_user_customers_workspace ON user_customers(workspace_id);
CREATE INDEX idx_user_customers_email ON user_customers(email);

-- User's invoices
CREATE TABLE user_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES user_customers(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  status TEXT,
  amount_due INTEGER,
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_invoices_workspace ON user_invoices(workspace_id);
CREATE INDEX idx_user_invoices_customer ON user_invoices(customer_id);
CREATE INDEX idx_user_invoices_stripe ON user_invoices(stripe_invoice_id);

-- User's subscriptions (for their customers)
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES user_customers(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  status TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  interval TEXT,
  interval_count INTEGER DEFAULT 1,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_workspace ON user_subscriptions(workspace_id);
CREATE INDEX idx_user_subscriptions_customer ON user_subscriptions(customer_id);
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);

-- Cal.com connections
CREATE TABLE calcom_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  calcom_api_key TEXT NOT NULL,
  status TEXT DEFAULT 'connected',
  user_id TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- Cal.com bookings
CREATE TABLE calcom_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  calcom_booking_id TEXT NOT NULL,
  attendee_name TEXT,
  attendee_email TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  event_type_id TEXT,
  event_type_name TEXT,
  location TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, calcom_booking_id)
);

CREATE INDEX idx_calcom_bookings_workspace ON calcom_bookings(workspace_id);
CREATE INDEX idx_calcom_bookings_start ON calcom_bookings(start_time);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_tool_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_has_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Workspace policies
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (user_has_workspace_access(id));

CREATE POLICY "Users can update their workspaces"
  ON workspaces FOR UPDATE
  USING (user_has_workspace_access(id));

CREATE POLICY "Users can insert workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Workspace members policies
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Members can insert workspace members"
  ON workspace_members FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id) OR user_id = auth.uid());

-- Generic policy for workspace-scoped tables
CREATE POLICY "Workspace members can access brands"
  ON brands FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access overviews"
  ON overviews FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access websites"
  ON websites FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access website_pages"
  ON website_pages FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access flows"
  ON flows FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access internal_tools"
  ON internal_tools FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access internal_tool_records"
  ON internal_tool_records FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access activities"
  ON activities FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access conversations"
  ON conversations FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access messages"
  ON messages FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access knowledge_chunks"
  ON knowledge_chunks FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access integrations"
  ON integrations FOR ALL
  USING (user_has_workspace_access(workspace_id));

-- Enable RLS for billing tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calcom_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can access subscriptions"
  ON subscriptions FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access stripe_connect_accounts"
  ON stripe_connect_accounts FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access user_customers"
  ON user_customers FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access user_invoices"
  ON user_invoices FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access user_subscriptions"
  ON user_subscriptions FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access calcom_connections"
  ON calcom_connections FOR ALL
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can access calcom_bookings"
  ON calcom_bookings FOR ALL
  USING (user_has_workspace_access(workspace_id));
