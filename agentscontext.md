# WorkLedger Agent Context

**Last Updated:** 2026-07-23  
**Status:** Auth System Implementation (Phase 2B In Progress)  
**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Tailwind CSS

---

## USER REQUIREMENTS & FEEDBACK

### Phase 1 - Initial Build (COMPLETE ✅)
- Built two-tier authentication system (platform admin + tenant users)
- Created role-based dashboards (member, lead, dean, director, finance)
- Integrated Supabase for real data persistence
- All dashboards connected to real database (NO mock data)
- Proper RLS policies for multi-tenant security

### Phase 2 - Accept-Invite + Director Invite (ISSUES FOUND)
- ✅ Fixed routing conflicts (/(admin), /(auth), /(app) separated)
- ✅ Created accept-invite flow (7-day tokens, password strength meter)
- ✅ Created director invite UI (single + bulk CSV)
- ❌ **CRITICAL ISSUES FOUND:**
  1. No admin signup page - platform admins can only login, not register
  2. Auth.users created in Supabase but NOT mapped to public.users table
  3. Roles and organization_id missing when users auth - causes dashboard errors
  4. No webhook/trigger to handle auth → profile mapping
  5. Director adding members doesn't properly create profiles with roles

### Phase 2B - Auth System Complete (IN PROGRESS)
**User Request:** "bruh there is no signup page for admin atleast and also creating acc with signup is creating in authentication table in supabse but roles , organisation id evrythig related isnt even mapped causing eroor on errors i want you yocode that trgiers or webhooks also once a admin is signing up his org evyrthing is created and when admin adds mebers hias also everything perfectly nd dont overwrie.mds just code whats needed"

**Requirements:**
1. Create admin signup page (`/admin/signup`) with organization creation
2. Build admin signup API that atomically creates organization + platform_admin user
3. Implement Supabase Auth webhook to map auth.users → public.users profiles
4. Add SQL triggers to handle auth events properly
5. Ensure director invites always create profiles with roles + org_id
6. No overwrites to existing .md files (except this one)
7. Only update OVERVIEW.md with specific changes

---

## WHAT WAS BUILT (V1 - COMPLETE)

### Database Schema
```
public.organizations (org_id, name, created_by, created_at)
  ├─ public.org_units (org_unit_id, org_id, name, head_id)
  ├─ public.organization_members (org_member_id, org_id, user_id, role)
  └─ public.users (user_id, email, first_name, last_name, org_id, role)

public.invitations (invite_id, email, org_id, role, token, expires_at)
public.audit_logs (log_id, user_id, org_id, action, changes)
```

### Auth System (Partial - Broken)
- Supabase Auth for email + password
- Session-based with secure cookies
- Rate limiting (5 failed attempts)
- Auto-redirect by role
- ❌ **MISSING:** Webhook to map auth.users to public.users

### Pages Created
```
/login                          [TENANT LOGIN - WORKS ✅]
/admin/login                    [PLATFORM ADMIN LOGIN - WORKS ✅]
/admin/dashboard                [PLATFORM ADMIN DASHBOARD - WORKS ✅]
/accept-invite                  [INVITE ACCEPTANCE - WORKS ✅]
/director/settings              [TEAM INVITE MANAGEMENT - WORKS ✅]
/dashboard                      [MAIN DASHBOARD - ROLE-BASED]
  ├─ /member                    [MEMBER DASHBOARD]
  ├─ /lead                      [ORG UNIT LEAD DASHBOARD]
  ├─ /dean                      [DEAN DASHBOARD]
  ├─ /director                  [DIRECTOR DASHBOARD]
  └─ /finance                   [FINANCE DASHBOARD]
```

### Components Created
- LoginPage (with security features)
- AdminLoginPage
- AcceptInvitePage (with password strength meter)
- DirectorSettingsPage (single + bulk invite)
- DirectorDashboard (with team metrics)
- RoleDashboards (member, lead, dean, director, finance)

### Security Features
- Password strength validation (5 criteria)
- Rate limiting (5 failed attempts = 15 min lockout)
- Input sanitization
- CSRF tokens
- Security headers (CSP, XSS protection)
- Token hashing
- Email validation

---

## WHAT NEEDS TO BE BUILT (V2 - IN PROGRESS)

### 1. Admin Signup Flow (NEW PAGE)
**File:** `/app/admin/signup/page.tsx`
- Organization name input
- Admin email input
- Admin name input
- Password input (with strength meter)
- Organization type selection (optional)
- Create organization + create platform_admin user atomically
- Redirect to /admin/dashboard on success

### 2. Admin Signup API Endpoint (NEW)
**File:** `/app/api/admin/signup/route.ts`
```
POST /api/admin/signup
Body: {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

Returns:
- User created in auth.users
- Organization created in public.organizations
- User profile created in public.users with role: PLATFORM_ADMIN
- org_id properly linked
```

### 3. Supabase Auth Webhook Handler (NEW)
**File:** `/app/api/webhooks/supabase/route.ts`
```
POST /api/webhooks/supabase
- Supabase sends auth events (user.created, user.deleted)
- Verify HMAC signature for security
- On user.created: Create public.users profile if not exists
- Handle metadata: org_id, role, etc.
```

### 4. SQL Trigger for Auth → Profile Mapping (NEW MIGRATION)
**File:** `/supabase/migrations/YYYYMMDD_webhook_trigger.sql`
```sql
-- Trigger on auth.users when created
-- Automatically creates public.users profile if public.handle_new_user() doesn't exist
-- Maps user_id, email, created_at to public.users
-- Handles organization_id from metadata if available
```

### 5. Enhanced Invitation Handler (UPDATE)
**File:** Update `/app/api/invitations/accept/route.ts`
- Verify token not expired
- Create user in auth.users (triggers webhook)
- Create public.users profile with role from invitation
- Verify org_id matches invitation org_id
- Set user status to ACTIVE
- Return redirect to /dashboard with role routing

### 6. Director Member Creation (UPDATE)
**File:** Update logic in `/app/(app)/director/settings/page.tsx`
- When adding member: Create public.invitations record
- Send email with activation link (once email service integrated)
- Ensure role + org_id always set correctly in invitation
- No profile created until user accepts invite

---

## FOLDER STRUCTURE

```
/vercel/share/v0-project/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── signup/                         [NEW - BUILD]
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   └── layout.tsx                      [DONE ✅]
│   ├── api/
│   │   ├── admin/
│   │   │   └── signup/
│   │   │       └── route.ts                [NEW - BUILD]
│   │   ├── webhooks/
│   │   │   └── supabase/
│   │   │       └── route.ts                [NEW - BUILD]
│   │   ├── invitations/
│   │   │   └── accept/
│   │   │       └── route.ts                [UPDATE - VERIFY]
│   │   └── ...
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── accept-invite/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   └── layout.tsx                      [DONE ✅]
│   ├── (app)/
│   │   ├── director/
│   │   │   ├── page.tsx                    [DONE ✅]
│   │   │   ├── settings/
│   │   │   │   └── page.tsx                [DONE ✅]
│   │   │   └── layout.tsx
│   │   ├── member/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── lead/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── dean/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── finance/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   ├── dashboard/
│   │   │   └── page.tsx                    [DONE ✅]
│   │   └── layout.tsx                      [DONE ✅]
│   ├── page.tsx                            [DONE ✅]
│   └── layout.tsx                          [DONE ✅]
├── components/
│   ├── ui/
│   │   ├── button.tsx                      [DONE ✅]
│   │   ├── card.tsx                        [DONE ✅]
│   │   ├── input.tsx                       [DONE ✅]
│   │   ├── label.tsx                       [DONE ✅]
│   │   ├── tabs.tsx                        [DONE ✅]
│   │   ├── badge.tsx                       [DONE ✅]
│   │   ├── textarea.tsx                    [DONE ✅]
│   │   └── ...
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       [DONE ✅]
│   │   ├── server.ts                       [DONE ✅]
│   │   └── admin.ts                        [DONE ✅]
│   ├── security.ts                         [DONE ✅ - 249 lines]
│   ├── auth-helpers.ts                     [DONE ✅]
│   └── ...
├── supabase/
│   └── migrations/
│       ├── add_onboarding_flow.sql         [DONE ✅]
│       ├── add_invitations.sql             [DONE ✅]
│       ├── add_rbac.sql                    [DONE ✅]
│       ├── add_organizations.sql           [DONE ✅]
│       └── YYYYMMDD_webhook_trigger.sql    [NEW - BUILD]
├── agentscontext.md                        [NEW - THIS FILE]
├── OVERVIEW.md                             [UPDATE - CHANGES ONLY]
├── BUILD_STATUS.md
├── PHASE_2_COMPLETE.md
├── DEPLOYMENT_GUIDE.md
├── README_PHASE2.md
├── ROUTING_FIXES.md
└── ...
```

---

## ALL COMPONENTS (A-Z) - CURRENT & FUTURE

### UI Components (shadcn/ui)
- Alert
- Badge
- Button ✅
- Card ✅
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input ✅
- Label ✅
- Popover
- Select
- Tabs ✅
- Table
- Textarea ✅
- Toast
- Toggle
- Tooltip

### Custom Components (Project-Specific)
- AcceptInvitePage ✅
- AdminDashboard ✅
- AdminLoginPage ✅
- DirectorDashboard ✅
- DirectorSettingsPage ✅
- DashboardLayout ✅
- FinanceDashboard ✅
- LoginPage ✅
- MemberDashboard ✅
- OrgUnitLeadDashboard ✅
- DeanDashboard ✅
- RoleRouter (redirects by role) ✅
- AdminSignupPage (NEW - BUILD)
- SignupForm (NEW - BUILD)

### Hooks (Custom React)
- useAuth (future - for auth context)
- useOrganization (future - for org context)
- useRoles (future - role permissions)

### Utilities & Libraries
- security.ts (249 lines of crypto, validation, headers) ✅
- auth-helpers.ts (auth utilities) ✅
- Supabase client library ✅
- Supabase server library ✅
- Supabase admin library ✅

### API Routes
- /api/admin/signup (NEW - BUILD)
- /api/webhooks/supabase (NEW - BUILD)
- /api/invitations/accept (EXISTS - UPDATE)
- /api/users/profile (future)
- /api/organizations/create (future)

### Database Migrations
- add_onboarding_flow.sql ✅
- add_invitations.sql ✅
- add_rbac.sql ✅
- add_organizations.sql ✅
- YYYYMMDD_webhook_trigger.sql (NEW - BUILD)

---

## NEXT IMMEDIATE TASKS (Priority Order)

### CRITICAL (DO FIRST)
1. **Create admin signup page** (`/app/admin/signup/page.tsx`)
   - Form to collect org name + admin details
   - Password strength meter
   - Beautiful responsive UI

2. **Create admin signup API** (`/app/api/admin/signup/route.ts`)
   - Atomic transaction: create org + create user + create profile
   - Verify email uniqueness
   - Hash password (Supabase handles this)
   - Return auth session

3. **Create Supabase webhook handler** (`/app/api/webhooks/supabase/route.ts`)
   - Receive auth.users events from Supabase
   - Verify HMAC signature
   - Create public.users profile on user.created event
   - Map org_id + role from metadata

4. **Create SQL webhook trigger** (`/supabase/migrations/yyyymmdd_webhook_trigger.sql`)
   - Function `handle_new_user()` that creates public.users profile
   - Called on auth.users INSERT
   - Handles metadata for org_id + role

5. **Update invitation accept endpoint** (`/app/api/invitations/accept/route.ts`)
   - Verify invitation token valid + not expired
   - Create user in auth.users (webhook fires)
   - Create public.users profile with role from invitation
   - Link to organization from invitation

### HIGH PRIORITY (DO NEXT)
6. Email integration (for invitations)
7. Forgot password flow
8. Task marketplace backend
9. Approval workflows

### MEDIUM PRIORITY
10. Admin analytics/metrics
11. Audit logs UI
12. Report generation
13. User management (admin view)

---

## KEY ARCHITECTURE DECISIONS

### Auth Flow
```
ADMIN SIGNUP:
  /admin/signup (form)
    ↓
  /api/admin/signup (POST)
    ↓
  Create supabase auth.users
    ↓
  Webhook: /api/webhooks/supabase
    ↓
  Create public.users profile (PLATFORM_ADMIN)
    ↓
  Create public.organizations
    ↓
  Redirect to /admin/dashboard

TENANT INVITE:
  Director invites via /director/settings
    ↓
  Create public.invitations record
    ↓
  Send email with /accept-invite?token=
    ↓
  User clicks link
    ↓
  /accept-invite?token= (form)
    ↓
  /api/invitations/accept (POST)
    ↓
  Create supabase auth.users
    ↓
  Webhook: /api/webhooks/supabase
    ↓
  Create public.users profile (with role from invitation)
    ↓
  Link to organization
    ↓
  Redirect to /dashboard (role router)

REGULAR LOGIN:
  /login (form)
    ↓
  /api/auth/signin (Supabase handles)
    ↓
  Supabase returns session
    ↓
  Query public.users for org_id + role
    ↓
  Role router: /(app)/director | /(app)/member | etc.
```

### Security Decisions
- Webhook HMAC verification (prevent unauthorized profile creation)
- Rate limiting (5 failed attempts per IP)
- Strong password enforcement (12+ chars, complexity)
- Token expiry (7 days for invitations)
- RLS policies on all tables
- organization_id scoping (prevent cross-tenant access)
- No mock data (100% real database)

### Database Decisions
- Separate auth.users (Supabase managed) from public.users (app-managed)
- Webhook handler maps them together
- Invitations table for async user creation
- Audit logs for compliance
- Org units for hierarchical structure

---

## DEBUGGING TIPS FOR AGENTS

### Auth isn't working?
1. Check if Supabase webhook is configured in project settings
2. Verify HMAC_SECRET environment variable is set
3. Check if public.users profile was created
4. Query: `SELECT * FROM public.users WHERE email = 'test@example.com'`

### Users can login but get dashboard errors?
1. User likely exists in auth.users but NOT in public.users
2. Check webhook isn't firing (check logs)
3. Manually create profile or trigger webhook
4. Query: `SELECT * FROM auth.users WHERE email = ?`

### Invitations not working?
1. Verify token not expired: `SELECT * FROM public.invitations WHERE token = ?`
2. Check if user already exists in auth.users
3. Verify org_id in invitation matches target org
4. Check role is valid (MEMBER, ORG_UNIT_LEAD, DEAN, FINANCE_ADMIN)

### Role routing not working?
1. Verify public.users has role set
2. Check RLS policies aren't blocking queries
3. Query: `SELECT user_id, role, org_id FROM public.users WHERE user_id = ?`

---

## IMPORTANT ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (server-only)
WEBHOOK_SIGNATURE_SECRET=xxx (for HMAC verification)
```

---

## TESTING CHECKLIST (Before Deployment)

- [ ] Admin can signup with new organization
- [ ] Organization created automatically with admin as PLATFORM_ADMIN
- [ ] Admin can login to /admin/dashboard
- [ ] Admin can see organization metrics
- [ ] Director can invite team member (single form)
- [ ] Director can bulk invite via CSV
- [ ] Invited member gets email with activation link
- [ ] Member clicks link → /accept-invite
- [ ] Member sets password and accepts
- [ ] Member auto-created in public.users with role
- [ ] Member can login to /dashboard
- [ ] Member routed to correct dashboard (/member, /lead, etc.)
- [ ] Webhook logs show user profile creation
- [ ] HMAC signature verification works
- [ ] Rate limiting blocks after 5 failed attempts
- [ ] Password strength meter works
- [ ] Dark mode works on all pages
- [ ] Mobile responsive on 375px width

---

## QUICK REFERENCE - WHAT EACH FILE DOES

| File | Purpose | Status |
|------|---------|--------|
| /app/admin/signup/page.tsx | Admin registration form | NEW - BUILD |
| /app/api/admin/signup/route.ts | Atomic org + user creation | NEW - BUILD |
| /app/api/webhooks/supabase/route.ts | Auth → profile mapping | NEW - BUILD |
| migrations/webhook_trigger.sql | SQL trigger for auth events | NEW - BUILD |
| /app/(auth)/accept-invite/page.tsx | Tenant user activation | DONE ✅ |
| /app/(auth)/login/page.tsx | Tenant login page | DONE ✅ |
| /app/admin/login/page.tsx | Platform admin login | DONE ✅ |
| /app/admin/dashboard/page.tsx | Platform admin view | DONE ✅ |
| /app/(app)/director/settings/page.tsx | Team invite management | DONE ✅ |
| /app/(app)/dashboard/page.tsx | Main role-based router | DONE ✅ |
| lib/security.ts | Crypto + validation utilities | DONE ✅ |
| lib/auth-helpers.ts | Auth utilities | DONE ✅ |
| lib/supabase/client.ts | Supabase client | DONE ✅ |

---

## NOTES FOR FUTURE AGENTS

- DO NOT overwrite existing .md files (only update OVERVIEW.md with changes)
- DO use TypeScript strict mode
- DO follow existing component patterns in the codebase
- DO add security checks (HMAC, CSRF, XSS prevention)
- DO test API endpoints with both success and error cases
- DO handle edge cases (user already exists, org name taken, etc.)
- DO NOT commit environment variables to git
- DO use Supabase RLS for data security (not client-side checks)
- DO implement proper error handling and user feedback
- DO log security-relevant events for audit trail

---

**Last Status Update:** Auth system 60% complete - waiting for admin signup + webhooks implementation

**Next Agent Should:**
1. Read this file completely
2. Read OVERVIEW.md for recent changes
3. Check current TypeScript errors: `pnpm tsc --noEmit`
4. Start with admin signup page + API endpoint
5. Then implement webhook handler
6. Then create SQL trigger migration
7. Test entire flow end-to-end
