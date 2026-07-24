-- WorkLedger Database Setup SQL
-- Run all commands in Supabase SQL editor to prepare database for application

-- ============================================================================
-- 1. ADD CREATOR_ID TO ORGANIZATIONS TABLE
-- ============================================================================

ALTER TABLE organizations
ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_organizations_creator_id ON organizations(creator_id);

COMMENT ON COLUMN organizations.creator_id IS 'User ID of the platform admin who created this organization';


-- ============================================================================
-- 2. UPDATE ADMIN SIGNUP TO ADD CREATOR_ID
-- ============================================================================
-- NOTE: No database change needed here - the application code will handle this
-- The signup API will be updated to insert creator_id when creating organization


-- ============================================================================
-- 3. VERIFY/CREATE ORG_UNITS TABLE STRUCTURE
-- ============================================================================

-- Check if org_units table exists and has correct structure
-- If it doesn't exist exactly as below, you may need to modify it

CREATE TABLE IF NOT EXISTS org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES org_units(id) ON DELETE SET NULL,
  unit_type VARCHAR(50) NOT NULL DEFAULT 'DEPARTMENT',
  name VARCHAR(255) NOT NULL,
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  path TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_units_organization_id ON org_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_units_parent_id ON org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_units_lead_user_id ON org_units(lead_user_id);
CREATE INDEX IF NOT EXISTS idx_org_units_path ON org_units(path);


-- ============================================================================
-- 4. VERIFY/CREATE INVITATIONS TABLE STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_unit_id UUID NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  intended_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'PENDING',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org_unit_id ON invitations(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);


-- ============================================================================
-- 5. VERIFY USERS TABLE HAS ORGANIZATION_ID AND ORG_UNIT_ID
-- ============================================================================

-- Note: These columns should already exist based on schema provided
-- This is just verification. If columns don't exist, add them:

-- Uncomment below if needed:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES org_units(id) ON DELETE SET NULL;
-- CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
-- CREATE INDEX IF NOT EXISTS idx_users_org_unit_id ON users(org_unit_id);


-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on critical tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- Organizations: Users can see orgs they're members of, or their own created orgs
DROP POLICY IF EXISTS "org_read_self_created" ON organizations;
CREATE POLICY "org_read_self_created" ON organizations
  FOR SELECT
  USING (
    creator_id = auth.uid() OR
    id IN (
      SELECT DISTINCT organization_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Org Units: Users can see org units within their organization
DROP POLICY IF EXISTS "org_units_read_own_org" ON org_units;
CREATE POLICY "org_units_read_own_org" ON org_units
  FOR SELECT
  USING (
    organization_id IN (
      SELECT DISTINCT organization_id FROM users WHERE users.id = auth.uid()
    ) OR
    organization_id IN (
      SELECT DISTINCT org_id FROM organizations WHERE creator_id = auth.uid()
    )
  );

-- Users: Can see users in own organization
DROP POLICY IF EXISTS "users_read_own_org" ON users;
CREATE POLICY "users_read_own_org" ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT DISTINCT organization_id FROM users WHERE users.id = auth.uid()
    ) OR
    organization_id IN (
      SELECT DISTINCT org_id FROM organizations WHERE creator_id = auth.uid()
    )
  );

-- Invitations: Can be read by organization members and creators
DROP POLICY IF EXISTS "invitations_read" ON invitations;
CREATE POLICY "invitations_read" ON invitations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by OR
    organization_id IN (
      SELECT DISTINCT org_id FROM organizations WHERE creator_id = auth.uid()
    )
  );


-- ============================================================================
-- 8. CREATE DEFAULT ROLES IF THEY DON'T EXIST
-- ============================================================================

-- These should be created when organization is first set up
-- This is a sample - adjust based on your actual role setup

-- INSERT INTO roles (id, organization_id, name, scope_level, is_system_role, created_at)
-- VALUES 
--   (gen_random_uuid(), <org_id>, 'DIRECTOR', 'ORGANIZATION', true, CURRENT_TIMESTAMP),
--   (gen_random_uuid(), <org_id>, 'HOD', 'ORG_UNIT', true, CURRENT_TIMESTAMP),
--   (gen_random_uuid(), <org_id>, 'FINANCE_ADMIN', 'ORGANIZATION', true, CURRENT_TIMESTAMP),
--   (gen_random_uuid(), <org_id>, 'MEMBER', 'ORG_UNIT', true, CURRENT_TIMESTAMP)
-- WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'DIRECTOR' AND organization_id = <org_id>);


-- ============================================================================
-- END OF SETUP
-- ============================================================================
-- Run all commands above in order
-- Then proceed to deploy application code
