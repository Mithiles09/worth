-- Webhook Trigger Migration
-- Handles mapping between auth.users and public.users via Supabase webhook

-- Function to handle new user creation from webhook
CREATE OR REPLACE FUNCTION public.handle_webhook_user_created()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Note: This is called by the webhook endpoint /api/webhooks/supabase
  -- The webhook endpoint handles the actual profile creation
  -- This function is kept for future direct trigger integration if needed
  NULL;
END;
$$;

-- Ensure users table has all required columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Add unique constraint on email
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Create organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- Ensure organization_members table is properly indexed
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(role);

-- RLS Policies for webhook endpoint
-- Allow service role (webhook) to create profiles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for webhooks)
-- Note: Service role always bypasses RLS in Supabase

-- Webhook endpoint can be called with minimal auth
-- Ensure webhook endpoint in /app/api/webhooks/supabase uses service role
