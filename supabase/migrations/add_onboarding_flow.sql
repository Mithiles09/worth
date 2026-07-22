-- Tier 1: Platform Admin (separate from tenant users)
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE,
    email CITEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Tier 2: Invitations for tenant users (Director, HOD, Member, Finance)
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_unit_id UUID REFERENCES org_units(id) ON DELETE SET NULL,
    email CITEXT NOT NULL,
    intended_role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_pending_invite UNIQUE (organization_id, email, status) WHERE status = 'PENDING'
);

-- Trigger: Auto-create public.users row when auth.users is created and matching invitation exists
CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER AS $$
DECLARE 
    v_invite invitations%ROWTYPE;
BEGIN
    SELECT * INTO v_invite 
    FROM invitations
    WHERE email = NEW.email 
        AND status = 'PENDING' 
        AND expires_at > clock_timestamp()
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
        -- Create user profile
        INSERT INTO users (id, organization_id, org_unit_id, email, name, status)
        VALUES (
            NEW.id, 
            v_invite.organization_id, 
            v_invite.org_unit_id, 
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
            'ACTIVE'
        );

        -- Assign role
        INSERT INTO user_roles (user_id, role_id) 
        VALUES (NEW.id, v_invite.intended_role_id);

        -- Create personal wallet
        INSERT INTO wallets (organization_id, owner_user_id, purpose)
        VALUES (v_invite.organization_id, NEW.id, 'PERSONAL');

        -- Mark invitation as accepted
        UPDATE invitations SET status = 'ACCEPTED' WHERE id = v_invite.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Create index for faster invitation lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email_status 
ON invitations(email, status) 
WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_invitations_organization_email 
ON invitations(organization_id, email);
