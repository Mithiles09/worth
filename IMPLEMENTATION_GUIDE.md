# WorkLedger Two-Tier Auth & Onboarding Implementation

This document outlines the complete authentication and onboarding flow that has been implemented.

## Architecture Overview

### Two-Tier Authentication Model

**Tier 1: Platform Admin (Vendor)**
- Completely separate auth surface: `/platform/login`
- Separate Supabase `platform_admins` table (NOT subject to RLS)
- Controls: organization creation, tenant provisioning, first Director account seeding
- Route group: `(platform)/*` with dedicated layout and auth checks

**Tier 2: Tenant Users (Director, Dean, OrgUnitLead/Lead, Member, Finance)**
- Single shared login: `/login` (email + password)
- Automatic role resolution and redirect after login
- User profile stored in `public.users` (subject to RLS)
- Roles assigned via `user_roles` → `roles` junction
- Roles have `scope_level` that determines dashboard redirect

---

## Database Schema Changes

Run this SQL migration to add the required tables and triggers:

```bash
# File: supabase/migrations/add_onboarding_flow.sql
```

### Key Tables Added:

1. **`platform_admins`** - Platform vendors only (id, auth_user_id, email, name)
2. **`invitations`** - Holds pending invites with token, status, expiry
3. **Trigger: `handle_new_auth_user()`** - Auto-creates `public.users` row when auth user signs up with a matching pending invitation

---

## Authentication Flows

### Flow 1: Platform Admin Login
1. Navigate to `/platform/login`
2. Email + password (Supabase Auth)
3. Middleware checks `platform_admins` table
4. If verified → `/platform/dashboard` (org list, create new org)
5. If not verified → redirect to `/login` with error

### Flow 2: Organization Creation (Platform Admin)
1. Click "New Organization" on `/platform/dashboard`
2. Enter org name + select template (COLLEGE, MNC_BENCH, GENERIC)
3. Server action `seed_organization_from_template()`:
   - Creates `organizations` row
   - Creates root `org_units` node
   - Seeds default `roles` (Director, Dean, OrgUnitLead, Member, FinanceAdmin)
   - Seeds default `task_type_definitions` (e.g., CLASS_SESSION, EVENT_COORDINATION)
   - Seeds `rate_cards` (token values per task type)
   - Seeds `approval_chain_definitions`
4. Create first Director account:
   - Insert into `invitations` with `role_id = Director`
   - Send email with `/accept-invite?token=...` link

### Flow 3: Tenant User Accepts Invitation
1. User receives email with `/accept-invite?token={TOKEN}` link
2. Page loads invitation details (org name, role, email)
3. User sets password → Supabase Auth creates `auth.users` row
4. **Trigger fires:**
   - Creates `public.users` row with organization_id, org_unit_id, role assignment
   - Creates personal `wallet(purpose='PERSONAL')`
   - Marks invitation as `ACCEPTED`
5. User redirected to `/login`
6. User logs in with email + password

### Flow 4: Login & Dashboard Redirect
1. User navigates to `/login`
2. Enter email + password
3. On success:
   - Check if `public.users` row exists for this auth user
   - If NOT: show "Account not ready" state → "Check your email for invitation"
   - If EXISTS: 
     - Fetch user roles
     - Resolve `role.scope_level` 
     - Redirect to appropriate dashboard:
       - `DIRECTOR` → `/director`
       - `DEAN` → `/dean`
       - `ORG_UNIT_LEAD` → `/lead`
       - `MEMBER` → `/member`
       - `FINANCE_ADMIN` → `/finance`

### Flow 5: Director Invites Team Members
*Coming soon* - Director settings page with:
- Single invite form (email, name, role, org_unit)
- Bulk CSV import
- Each invite row → `INSERT INTO invitations`
- Email trigger sends invite link

---

## File Structure

```
app/
├── (platform)/
│   ├── layout.tsx              ← Platform auth guard
│   ├── login/page.tsx          ← Platform admin login (separate from tenant)
│   └── dashboard/page.tsx      ← Org list, create org
├── (auth)/
│   ├── layout.tsx              ← Shared auth layout
│   ├── login/page.tsx          ← Tenant user login (shared, role-aware redirect)
│   └── accept-invite/page.tsx  ← Set password, activate account
└── (app)/
    ├── layout.tsx              ← Tenant auth guard + profile check
    ├── dashboard/page.tsx      ← Redirect to role-specific dashboard
    ├── director/page.tsx       ← Director dashboard (org-wide view)
    ├── dean/page.tsx           ← Dean dashboard (subtree view)
    ├── lead/page.tsx           ← OrgUnitLead/HOD dashboard (dual context)
    ├── member/page.tsx         ← Member/Faculty dashboard
    └── finance/page.tsx        ← Finance admin dashboard (ledger, batch)

lib/
├── auth-helpers.ts            ← Auth utility functions
├── supabase/
│   ├── client.ts              ← Client-side Supabase
│   └── server.ts              ← Server-side Supabase

supabase/
└── migrations/
    └── add_onboarding_flow.sql ← Database schema + trigger
```

---

## Key Components

### `lib/auth-helpers.ts`
Utility functions for auth operations:
- `getCurrentUser()` - Fetch current user + profile
- `getUserRoles()` - Get user's roles with scope_level
- `getOrganizationByUserId()` - Fetch user's org
- `getPlatformAdmin()` - Check if user is platform admin
- `createInvitation()` - Create new invite
- `getInvitationByToken()` - Validate invite token
- `resolveDashboardRoute()` - Map role to dashboard path

### Role-Specific Dashboards

**Member (`/member`)**: 
- Token balance, account status, monthly progress
- Weekly schedule + open tasks sections
- Browse marketplace for opportunities

**Lead (`/lead`)**:
- Dual context toggle (Manager vs Employee)
- Team member stats, pending verifications, performance
- Manager queue view + Employee work view

**Director (`/director`)**:
- Organization-wide metrics (members, departments, pools)
- Four tabs: Structure, Approvals, Settings, Reports
- Full institution control

**Dean (`/dean`)**:
- Subtree dashboard (departments under dean)
- Escalations from leads
- Cross-department comparison

**Finance (`/finance`)**:
- Salary + Loan pool balances
- Four tabs: Ledger, Readiness, Batch Process, Reports
- Month-end batch reversal button (disabled until ready)

---

## Testing the Complete Flow

### 1. Setup Platform Admin
```sql
-- Create platform admin manually in Supabase

-- First, create auth user via Supabase dashboard or auth API
-- Copy the auth.users.id

-- Then insert into platform_admins:
INSERT INTO platform_admins (auth_user_id, email, name)
VALUES ('[AUTH_USER_ID]', 'you@workworth.io', 'Vendor Name');
```

### 2. Create Organization
1. Go to `/platform/login`
2. Sign in with platform admin email
3. Click "New Organization"
4. Fill form, select template
5. System creates org + first Director invite

### 3. Director Accepts Invite
1. Check email for `/accept-invite?token=...` link
2. Set password
3. Redirected to `/login`
4. Sign in with email + password
5. Automatically redirected to `/director`

### 4. Director Invites Members
*Coming soon UI, but core flow works via server action*

### 5. Member Accepts & Logs In
1. Email with invite link
2. Set password
3. `handle_new_auth_user()` trigger fires
4. User profile + wallet created
5. Logged in → `/member` dashboard

---

## RLS Security Model

- **`platform_admins`**: No RLS (separate from tenant world)
- **`public.users`**: RLS via `organization_id` (Director can see their org's users only)
- **`user_roles`**: RLS via user_id foreign key
- **`organizations`**: RLS via implicit `id` match
- **`wallets`**: RLS via `organization_id` or `owner_user_id`

---

## Environment Variables

Ensure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Architecture Decisions

✅ **Single `/login` for all tenant users** - role resolved server-side, routed accordingly
✅ **Separate `/platform/login`** - completely isolated vendor experience
✅ **Trigger auto-creates public.users** - decouples auth from profile, invites drive activation
✅ **Invitation token-based** - no shared secrets, short-lived tokens, expiry + revocation support
✅ **Role-scoped dashboards** - each role gets its own URL + data scope
✅ **No localStorage for auth** - Supabase session cookies only
✅ **RLS enforced server-side** - RLS policies on every table, not client-side filtering
✅ **Generic routing** - route group naming (`/lead` not `/hod`) prevents template hardcoding

---

## What's NOT Yet Implemented

These are next priorities after core auth flows work:

- [ ] Real email sending for invitations (currently just tokens in logs)
- [ ] Director invite UI (single + bulk CSV)
- [ ] Dean/Lead management pages (settings, structure, roles)
- [ ] Task marketplace integration (browse, nominate, submit proof)
- [ ] Approval workflow engine (multi-step approvals)
- [ ] Month-end batch reversal cron + atomic transfer
- [ ] Loan tracking + debt clearance tasks
- [ ] Attendance marking + task verification
- [ ] Audit logs + notifications
- [ ] On-chain wallet integration (if proceeding with Web3)

---

## Immediate Next Steps

1. **Deploy migration** - Run `supabase/migrations/add_onboarding_flow.sql`
2. **Seed platform admin** - Insert your admin account
3. **Test org creation** - Walk through platform admin flow
4. **Test invite flow** - Accept invite, login, verify redirect
5. **Add email service** - Replace token logging with Resend/Postmark
6. **Build Director invite UI** - Settings page with single/bulk form
7. **Verify RLS** - Ensure users can only see their org's data
