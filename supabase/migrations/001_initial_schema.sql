-- =============================================
-- PIVOTMCP Initial Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. tenants
-- =============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to resolve tenant_id from auth.uid()
CREATE OR REPLACE FUNCTION get_tenant_id_for_user(user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM tenants WHERE owner_user_id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Convenience wrapper using auth.uid()
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT get_tenant_id_for_user(auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create tenant on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenants (owner_user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  USING (owner_user_id = auth.uid());

-- =============================================
-- 2. connections_x
-- =============================================
CREATE TABLE connections_x (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  encrypted_bearer_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('ok', 'invalid', 'rate_limited', 'untested')),
  x_user_id TEXT,
  x_username TEXT,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_connections_x_tenant ON connections_x(tenant_id);

ALTER TABLE connections_x ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for connections_x"
  ON connections_x FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 3. tracked_accounts
-- =============================================
CREATE TABLE tracked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  x_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  is_competitor BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  memo TEXT,
  cursor_since_id TEXT,
  followers_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, x_user_id)
);

CREATE INDEX idx_tracked_accounts_tenant ON tracked_accounts(tenant_id);

ALTER TABLE tracked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tracked_accounts"
  ON tracked_accounts FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 4. posts
-- =============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracked_account_id UUID NOT NULL REFERENCES tracked_accounts(id) ON DELETE CASCADE,
  post_x_id TEXT NOT NULL,
  text TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  quotes_count INTEGER NOT NULL DEFAULT 0,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  media_type TEXT NOT NULL DEFAULT 'none' CHECK (media_type IN ('none', 'photo', 'video', 'animated_gif', 'mixed')),
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  theme TEXT DEFAULT 'other',
  is_hit BOOLEAN NOT NULL DEFAULT false,
  raw_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, post_x_id)
);

CREATE INDEX idx_posts_tenant ON posts(tenant_id);
CREATE INDEX idx_posts_tracked_account ON posts(tracked_account_id);
CREATE INDEX idx_posts_posted_at ON posts(posted_at);
CREATE INDEX idx_posts_media_type ON posts(media_type);
CREATE INDEX idx_posts_is_hit ON posts(is_hit);
CREATE INDEX idx_posts_text_search ON posts USING gin(to_tsvector('simple', COALESCE(text, '')));

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for posts"
  ON posts FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 5. account_snapshots
-- =============================================
CREATE TABLE account_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracked_account_id UUID NOT NULL REFERENCES tracked_accounts(id) ON DELETE CASCADE,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  tweet_count INTEGER NOT NULL DEFAULT 0,
  listed_count INTEGER NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_tenant ON account_snapshots(tenant_id);
CREATE INDEX idx_snapshots_tracked_account ON account_snapshots(tracked_account_id);

ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for account_snapshots"
  ON account_snapshots FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 6. fetch_jobs
-- =============================================
CREATE TABLE fetch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracked_account_id UUID NOT NULL REFERENCES tracked_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'rate_limited', 'cancelled')),
  mode TEXT NOT NULL DEFAULT 'light' CHECK (mode IN ('light')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  estimated_requests INTEGER,
  actual_requests INTEGER NOT NULL DEFAULT 0,
  posts_fetched INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fetch_jobs_tenant ON fetch_jobs(tenant_id);
CREATE INDEX idx_fetch_jobs_status ON fetch_jobs(status);

ALTER TABLE fetch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for fetch_jobs"
  ON fetch_jobs FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 7. api_call_logs
-- =============================================
CREATE TABLE api_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fetch_job_id UUID REFERENCES fetch_jobs(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  estimated_units INTEGER NOT NULL DEFAULT 1,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_call_logs_tenant ON api_call_logs(tenant_id);
CREATE INDEX idx_api_call_logs_created_at ON api_call_logs(created_at);
CREATE INDEX idx_api_call_logs_endpoint ON api_call_logs(endpoint);

ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for api_call_logs"
  ON api_call_logs FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- 8. analysis_cache
-- =============================================
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tracked_account_id UUID REFERENCES tracked_accounts(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL DEFAULT '{}',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 day'),
  UNIQUE (tenant_id, cache_key, period_start, period_end)
);

CREATE INDEX idx_analysis_cache_tenant ON analysis_cache(tenant_id);
CREATE INDEX idx_analysis_cache_key ON analysis_cache(cache_key);

ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for analysis_cache"
  ON analysis_cache FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================
-- Updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_x_updated_at
  BEFORE UPDATE ON connections_x FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_accounts_updated_at
  BEFORE UPDATE ON tracked_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fetch_jobs_updated_at
  BEFORE UPDATE ON fetch_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
