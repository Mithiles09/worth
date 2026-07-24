# WorkLedger System - Complete Deep Context Analysis
**Created for v0 Agent Understanding**  
**Last Updated:** 2026-07-24

---

## EXECUTIVE SUMMARY

WorkLedger is a **two-tier institutional token economy platform** for educational/organizational settings:

### Tier 1: Platform Admin Layer
- Platform admins create organizations via `/admin/signup`
- Separate authentication from tenant users
- Dashboard at `/admin/dashboard` shows ALL organizations (should show only creator's org)

### Tier 2: Tenant Organization Layer  
- Multiple roles within each organization (Director, Dean, Lead, Finance Admin, Member)
- Role-based dashboards with real database queries
- Multi-tenancy enforced via RLS policies (organization_id filtering)

**Current Status:** Auth system complete (Phase 2B). Next: Fix admin visibility filtering + build organization tree manager.

---

## DATABASE SCHEMA (Source of Truth)

### Core Tables

#### `organizations` (org_id, name, type)
- Stores institution information (COLLEGE, ENTERPRISE, HOSPITAL, NGO, etc.)
- One creator (platform admin) per org
- **ISSUE:** No creator_id field currently - can't filter to show only creator's orgs

#### `users` (id, organization_id, email, name, role, status)
- Every person in the system (both platform admins and tenant users)
- Links to organization_id for multi-tenancy
- Two types:
  - `role = 'PLATFORM_ADMIN'`: Can only login at `/admin/login`, can create orgs
  - Other roles (DIRECTOR, DEAN, LEAD, MEMBER, FINANCE_ADMIN): Login at `/login`, role-routed to dashboard

#### `org_units` (id, organization_id, parent_id, unit_type, name, lead_user_id)
- Hierarchical departments/divisions (path: ltree for tree queries)
- Examples: College → Department → Faculty → Team
- lead_user_id points to the Lead/Head of that unit
- **MISSING FEATURE:** No UI to create/edit org_units yet

#### `user_roles` (user_id, role_id) - JOIN table
- Maps users to roles with permission scoping
- One user can have multiple roles (multi-role support)

#### `roles` (id, organization_id, name, scope_level)
- Defines roles per organization
- scope_level: DIRECTOR, DEAN, ORG_UNIT_LEAD, MEMBER, FINANCE_ADMIN
- is_system_role: true for pre-created roles

#### `invitations` (id, organization_id, org_unit_id, email, intended_role_id, token, status)
- Non-registered users get invitation tokens
- 7-day expiration
- Token used in `/accept-invite?token=XXX` flow
- Director creates invitations via `/director/settings`

#### `wallets` (id, organization_id, owner_user_id, purpose, balance)
- Tracks token balances for users and organizational pools
- purpose: SALARY_POOL, LOAN_POOL, PERSONAL
- Each member + each organization has wallets

#### `tasks` (id, organization_id, org_unit_id, task_type_id, title, credit_value, status)
- Work assignments that earn credits/tokens
- status flow: DRAFT → OPEN → NOMINATED → ASSIGNED → IN_PROGRESS → VERIFICATION_PENDING → PEER_APPROVED → LEAD_SIGNED → CLOSED
- Tied to org_units (hierarchical scope)

#### `loans` (id, organization_id, user_id, amount, remaining, status, due_by)
- Emergency short-term loans when monthly salary falls short
- status: PENDING, ACTIVE, REPAID, DEFAULTED

#### `token_transactions` (id, organization_id, from_wallet_id, to_wallet_id, amount, type, status)
- Immutable audit trail of all token movements
- type: MINT, SALARY_TRANSFER, LOAN_ISSUE, REVERSE_TRANSFER, LOAN_REPAY, TASK_REWARD, BONUS, BURN
- **Important:** Partitioned by date (token_transactions_y2026m07, token_transactions_default)

#### `compensation_policies` (id, organization_id, scope_type, monthly_target_credits, baseline_minimum_credits)
- Defines monthly earning thresholds
- Example: Need 85% of monthly target to trigger salary release
- grace_period_days: How many days into next month to finalize

#### `approval_chain_definitions` + `approval_instances` + `approval_actions`
- Workflow engine for salary releases, loans, task verifications
- Stores approval steps, decision audit trail, who approved/rejected

#### `cycle_calendars` (id, organization_id, name, start_date, end_date)
- Monthly/quarterly/annual performance periods
- marking_periods for sub-periods within cycle

#### `audit_logs` (id, organization_id, actor_id, action, entity_type, entity_id, state_before, state_after)
- Immutable record of all changes
- Partitioned by quarter (audit_logs_y2026q3, audit_logs_default)

---

## AUTHENTICATION FLOW (Two-Tier System)

### Path 1: Platform Admin Registration & Login
```
User visits /admin/signup
  ↓ (fills form)
Calls POST /api/admin/signup
  ↓ (atomically)
1. Creates auth.users entry (Supabase Auth)
2. Creates organizations entry
3. Creates users entry with role = 'PLATFORM_ADMIN'
  ↓
Auto-login & redirect to /admin/dashboard
  ↓ (query)
SELECT organizations WHERE creator_id = current_admin.id
  ↓ 
Dashboard shows only THAT admin's organizations
  ✓ EXPECTED BEHAVIOR (currently broken - shows all orgs)
```

### Path 2: Tenant User (Organization Member) Registration
```
Director invites team member
  ↓
Director uses /director/settings to send invitation
  ↓
Creates invitations record with 7-day token
  ↓
User receives email with /accept-invite?token=XXX link
  ↓
User fills /accept-invite page (password, name)
  ↓
POST /api/invitations/accept calls:
1. Supabase Auth: Create auth.users (password hashed)
2. Supabase Webhook fires: user.created
3. /api/webhooks/supabase receives webhook
4. Creates users profile with role from invitation
5. Assigns to org_unit from invitation
  ↓
User can login at /login with email + password
  ↓
System routes to role dashboard (/director, /member, /lead, /finance, /dean)
```

### Path 3: Tenant User Login
```
User visits /login
  ↓
Enters email + password
  ↓
Supabase auth validates (auth.users table)
  ↓
Calls GET /api/auth/user route (server-side)
  ↓
Queries: users WHERE id = auth_user_id
  ↓
Gets user_roles → roles (gets scope_level)
  ↓
Route map:
  DIRECTOR → /director
  DEAN → /dean
  ORG_UNIT_LEAD → /lead
  MEMBER → /member
  FINANCE_ADMIN → /finance
  ↓
Auto-redirect to appropriate dashboard
```

---

## PAGE ROUTING MAP

### Public Pages
- `/` - Landing page
- `/admin/login` - Platform admin login
- `/admin/signup` - Platform admin registration (WORKING ✅)
- `/login` - Tenant user login (WORKING ✅)
- `/(auth)/accept-invite?token=XXX` - Invitation acceptance (WORKING ✅)

### Admin Pages (Platform Tier)
- `/admin/dashboard` - **ISSUE:** Shows all orgs, should show only creator's orgs ❌

### Application Pages (Tenant Tier)
Protected by RLS policies + auth checks:

#### `/director` (Director Dashboard)
- Org-wide metrics: member count, dept count, salary/loan pool balance
- Tabs: Structure, Approvals, Settings, Reports
- **ISSUE:** "Structure" tab not implemented - no org_units tree UI ❌
- **ISSUE:** "Manage Organization" button doesn't work ❌

#### `/director/settings` (Director Team Management)
- Add single member invitation
- Bulk CSV import of invitations
- **WORKING ✅**

#### `/lead` (Department Lead Dashboard)
- Team member list
- Verification queue for submitted tasks
- Personal performance stats
- Dual context (manager view + employee view)
- **Status:** Skeleton exists, needs data integration

#### `/member` (Individual Member Dashboard)
- Token balance
- Weekly schedule
- Progress to salary threshold
- Task marketplace
- **Status:** Skeleton exists, needs data integration

#### `/dean` (Multi-Department Dean Dashboard)
- Subtree metrics across departments
- Cross-department comparison
- Escalations from leads
- **Status:** Skeleton exists, needs data integration

#### `/finance` (Finance Admin Dashboard)
- Ledger view (token_transactions)
- Department readiness (salary eligibility)
- Batch salary reversal trigger
- **Status:** Skeleton exists, needs data integration

#### `/hod`, `/administrator` pages
- Exist but not documented in current phase

---

## COMPONENT ARCHITECTURE

### Page Components (Heavy - Fetch Data + Render)
- `app/(app)/director/page.tsx` - Director dashboard (WORKING with real data ✅)
- `app/(app)/member/page.tsx` - Member dashboard (SKELETON)
- `app/(app)/lead/page.tsx` - Lead dashboard (SKELETON)
- `app/(app)/finance/page.tsx` - Finance dashboard (SKELETON)
- `app/(app)/dean/page.tsx` - Dean dashboard (SKELETON)

### Layout Components
- `components/layout/app-layout.tsx` - Main app layout wrapper
- `components/layout/header.tsx` - Top nav with user menu
- `components/layout/sidebar.tsx` - Left sidebar with navigation

### Shared Components  
- `components/shared/stat-card.tsx` - Metric card (4-column grids)
- `components/shared/progress-gauge.tsx` - Circular progress bar

### UI Components (shadcn/ui)
- Button, Card, Input, Label, Tabs, Textarea, Dialog, etc.

### **MISSING COMPONENTS:**

#### 1. Organization Tree Manager (`components/org/OrgTreeBuilder.tsx`)
**Purpose:** Edit org_units hierarchy in `/director` settings
**Should Display:**
- Expandable tree of departments/units
- Add/remove buttons for each level
- Edit unit name + lead assignment
- Drag-to-reorder (optional)
- Search members for lead assignment

**Required for:**
- Directors to create departments before adding team members
- Currently: No way to create org_units, so can't add members to departments

**Data Interactions:**
- Query: `SELECT * FROM org_units WHERE organization_id = ? ORDER BY path`
- Create: `INSERT INTO org_units (organization_id, parent_id, unit_type, name, lead_user_id)`
- Update: `UPDATE org_units SET name = ?, lead_user_id = ? WHERE id = ?`
- Delete: Soft-delete or cascade (TBD)

#### 2. Invitation Modal (`components/director/InvitationModal.tsx`)  
**Status:** Exists in `/director/settings`, works, but needs review

#### 3. Organization Settings Component (`components/director/OrgSettingsPanel.tsx`)
**Purpose:** Roles, policies, rate cards config
**Status:** Placeholder in `/director` settings tab

#### 4. Approval Queue Component (`components/approvals/ApprovalQueueList.tsx`)
**Purpose:** Show salary + loan request approvals
**Status:** Not implemented

#### 5. Task Marketplace Browser (`components/tasks/TaskMarketplaceGrid.tsx`)
**Purpose:** Browse open tasks for members
**Status:** Not implemented

#### 6. Ledger Transaction Table (`components/finance/LedgerTable.tsx`)
**Purpose:** View token_transactions audit trail
**Status:** Not implemented

---

## MULTI-TENANCY & RLS POLICIES (Security Layer)

### How Multi-Tenancy Works

Every query includes organization_id filter (enforced at database via RLS):

```typescript
// All Supabase queries automatically filter by organization_id
const { data: users } = await supabase
  .from('users')
  .select('*')
  // ← RLS automatically adds: WHERE organization_id = get_jwt_session_org_id()
  
// Result: Users from Org A cannot see users from Org B
// Database returns ZERO rows (not "access denied")
```

### RLS Policy Examples

**On `users` table:**
```sql
CREATE POLICY "user_tenant_isolation"
  ON users
  USING (organization_id = get_jwt_session_org_id())
```

**On `organizations` table:**
```sql
CREATE POLICY "org_tenant_isolation"
  ON organizations
  USING (org_id = get_jwt_session_org_id())
```

**On `tasks` table (scoped to org_unit hierarchy):**
```sql
CREATE POLICY "task_scope"
  ON tasks
  USING (
    (organization_id = get_jwt_session_org_id()) AND
    (is_org_unit_scope_visible(org_unit_id) OR user_has_role(current_session_user_id(), 'Director'))
  )
```

**On `wallets` table (user or role-based):**
```sql
CREATE POLICY "wallet_scope"
  ON wallets
  USING (
    (organization_id = get_jwt_session_org_id()) AND
    (
      (owner_user_id = current_session_user_id()) OR  -- See own wallet
      user_has_role(current_session_user_id(), 'Director') OR  -- Directors see all
      check_user_permission(current_session_user_id(), 'finance', 'view')  -- Finance admins
    )
  )
```

### Key Security Functions

**`get_jwt_session_org_id()`** - Extracts org_id from JWT session  
**`current_session_user_id()`** - Gets logged-in user's ID  
**`user_has_role(user_id, role_name)`** - Checks if user has role  
**`check_user_permission(user_id, scope, action)`** - Fine-grained permission check  
**`is_org_unit_scope_visible(org_unit_id)`** - Checks if user can see org_unit (hierarchical)

---

## CURRENT ISSUES (What User Reported)

### ❌ Issue 1: Admin Dashboard Shows ALL Organizations
**Location:** `/app/admin/dashboard/page.tsx` line ~49
**Code:**
```typescript
const { data: orgs } = await supabase
  .from('organizations')
  .select('*')
  // ← NO WHERE clause! Gets all orgs from all admins
```

**Expected:** Only organizations created by THIS admin  
**Root Cause:** organizations table has no creator_id field  
**Fix Needed:**
1. Add `creator_id UUID` column to organizations table
2. Set creator_id = admin user id on org creation
3. Query: `WHERE creator_id = current_admin.id`

### ❌ Issue 2: "Manage Organization" Button Doesn't Work
**Location:** `/app/admin/dashboard/page.tsx` line ~95
**Code:**
```tsx
<Button variant="outline" className="w-full text-xs">Manage Organization</Button>
// ← No onClick handler, just disabled={!!schemaError}
```

**Expected:** Navigate to org management page or modal  
**Fix Needed:** Add onClick → navigate to `/admin/organization/[org_id]` page

### ❌ Issue 3: Organization Tree Maker Component Missing
**Impact:** Cannot create departments, so cannot add team members to departments  
**Location:** `/director` dashboard "Structure" tab  
**Expected Component:** Hierarchical tree UI for org_units  
**Data Model:**
```
Organization
  └─ College
      ├─ Computer Science Department (lead: Dr. A)
      │   ├─ AI/ML Lab (lead: Prof. B)
      │   └─ Systems Lab (lead: Prof. C)
      ├─ Mechanical Engineering (lead: Dr. D)
      │   └─ Robotics Lab (lead: Prof. E)
```

**UI Required:**
- Expandable tree view
- Add/edit/delete unit buttons
- Assign lead (dropdown from org members)
- Drag to reorder (optional)

### ❌ Issue 4: Cannot Test Other Pages
**Pages can't work:** `/lead`, `/member`, `/dean`, `/finance`  
**Reason:** Need employees (users) assigned to org_units (departments)  
**Blocker:** Can't create org_units without tree manager  
**Sequence to unblock:**
1. Build org tree manager
2. Director creates departments (org_units)
3. Director assigns members to departments (via invitations + org_unit_id)
4. Members login → can test their role dashboards

---

## DATA FLOW EXAMPLES

### Example 1: Director Creating Organization (Current Flow)

```
Admin fills /admin/signup
  name="MVGR College"
  email="admin@mvgr.edu"
  password="SecurePass123!"
  ↓ POST /api/admin/signup
1. Supabase Auth: Create user (admin@mvgr.edu, hashed password)
   Result: auth_user_id = "abc123"
   
2. organizations: INSERT
   org_id: "org_xyz"
   name: "MVGR College"
   type: "COLLEGE"
   created_at: now()
   
3. users: INSERT
   id: "abc123" (from auth)
   email: "admin@mvgr.edu"
   name: "Admin Name"
   role: "PLATFORM_ADMIN"
   organization_id: "org_xyz"
   
4. Webhook fires: user.created event
   /api/webhooks/supabase receives event
   Creates redundant users entry (idempotent, no error)
   ↓
✅ Auth user fully set up
✅ Organization created
✅ Admin user profile created
✅ Auto-login & redirect to /admin/dashboard
```

### Example 2: Director Adding Team Members (Current Manual Gap)

```
Director logs in → /director/settings → "Add Member"
  email="prof@mvgr.edu"
  role="LEAD"
  ↓
Creates invitations record:
  organization_id: "org_xyz"
  email: "prof@mvgr.edu"
  intended_role_id: "role_lead"
  token: "token_7dayexpiry"
  ↓
Email sent (placeholder, not real yet)
  "Join MVGR: /accept-invite?token=token_7dayexpiry"
  ↓
Prof clicks link → /accept-invite page
  Sets password + name
  ↓ POST /api/invitations/accept
1. Supabase Auth: Create user
2. Webhook fires: user.created
3. users: CREATE
   email: "prof@mvgr.edu"
   role: "LEAD" (from invitation)
   organization_id: "org_xyz"
   org_unit_id: NULL ← ❌ ISSUE: Not assigned to department!
   ↓
4. invitations: UPDATE status = 'ACCEPTED'
   ↓
✅ User can login
❌ But NOT assigned to any department (org_unit)
❌ Lead dashboard won't work without org_unit_id
```

### Example 3: Finance Admin Viewing Ledger (Real Data)

```
Finance Admin logs in → /finance dashboard
  ↓ Query token_transactions for org_xyz
SELECT *
FROM token_transactions_y2026m07  (date-partitioned table)
WHERE organization_id = 'org_xyz'
  AND timestamp BETWEEN '2026-07-01' AND '2026-07-31'
ORDER BY timestamp DESC
  ↓
Returns all transactions:
  - SALARY_TRANSFER: Salary Pool → Member1 (1000 WORK)
  - TASK_REWARD: Org Pool → Member2 (500 WORK)
  - LOAN_ISSUE: Loan Pool → Member3 (2000 WORK)
  - LOAN_REPAY: Member3 → Loan Pool (500 WORK)
  ↓
✅ Immutable audit trail visible
✅ All amounts correct
✅ Multi-tenant isolation enforced by RLS
```

---

## KEY FEATURES BY ROLE

### Platform Admin (`role = 'PLATFORM_ADMIN'`)
- **Location:** `/admin/*`
- **Capabilities:**
  - View all organizations they created (BROKEN - shows all)
  - Create new organizations (WORKING ✅)
  - Manage organization directors (NOT YET)
  - See global metrics (NOT YET)
- **Auth:** Separate login at `/admin/login` (not mixed with tenant users)

### Director (`role = 'DIRECTOR'`)
- **Location:** `/director`
- **Capabilities:**
  - View org-wide metrics (WORKING with real data ✅)
  - Manage org structure (MISSING - no tree UI)
  - Create org units/departments (MISSING)
  - Invite team members (WORKING ✅)
  - Approve salary releases (UI STUB)
  - Approve loan requests (UI STUB)
  - Configure settings (UI STUB)
  - View reports (UI STUB)

### Dean (`role = 'DEAN'`)
- **Location:** `/dean`
- **Capabilities:**
  - View metrics for assigned subtree
  - Multi-department comparison
  - Cross-dept escalations (UI STUB)
  - Reports for departments (UI STUB)

### Org Unit Lead (`role = 'ORG_UNIT_LEAD'`)
- **Location:** `/lead`
- **Capabilities:**
  - View team member list (UI STUB)
  - Verify task completions (UI STUB)
  - Approve/reject task proofs (UI STUB)
  - Dual context: manager + employee perspective (UI STUB)
  - Department performance metrics (UI STUB)

### Finance Admin (`role = 'FINANCE_ADMIN'`)
- **Location:** `/finance`
- **Capabilities:**
  - View token ledger (UI STUB)
  - Department readiness check (who's eligible for salary)
  - Batch salary reversal trigger (month-end) (UI STUB)
  - Transaction audit logs (UI STUB)
  - Reports & reconciliation (UI STUB)

### Member (`role = 'MEMBER'`)
- **Location:** `/member`
- **Capabilities:**
  - View personal token balance (UI STUB)
  - Weekly class schedule (UI STUB)
  - Progress to salary threshold (UI STUB)
  - Request salary release (UI STUB)
  - Request emergency loan (UI STUB)
  - Browse task marketplace (UI STUB)
  - Nominate self for tasks (UI STUB)

---

## BUSINESS LOGIC (Token Economy)

### Monthly Salary Release Flow

```
Month: July 1 - July 31

DAY 1-30: Members work and earn credits
  - Complete tasks → credits accumulate in wallet
  - Example: Prof earns 950 WORK tokens

DAY 31: Month-end settlement
  1. Finance checks: "Who's eligible?" (balance ≥ 85% of target)
     Compensation policy: monthly_target_credits = 1000, threshold = 85%
     Prof: 950/1000 = 95% ✓ Eligible
  
  2. Prof requests salary release
     Creates approval_instance → LEAD → DIRECTOR → FINANCE
  
  3. Lead verifies all task proofs + signs off
  4. Director approves batch
  5. Finance triggers batch reversal:
     UPDATE wallets SET balance = 0 WHERE owner = 'prof'
     Prof wallet: 950 → 0
     Salary pool wallet: 100000 → 99050 (transferred to prof's personal)
  
  6. Month complete!
     Prof now has 950 WORK in personal wallet for salary payment
```

### Emergency Loan Flow

```
Prof earns only 700 WORK (70% of target, below 85% threshold)
  ↓
Prof clicks "Request Emergency Loan"
  amount=300 WORK
  reason="Shortfall for month"
  ↓ Creates approval_instance
  
Lead approves (routine)
Director approves (routine)
Finance approves (routine)
  ↓ Batch process:
UPDATE loans SET status = 'ACTIVE' WHERE id = loan_xyz
UPDATE wallets SET balance = balance + 300 WHERE owner = 'prof'
INSERT token_transactions (LOAN_ISSUE, prof_wallet, loan_pool_wallet, 300)
  ↓
Prof wallet: 700 → 1000 (700 earned + 300 loan)
Loan record: Status = ACTIVE, amount = 300, due_date = next_month_end
  ↓
Next month:
If prof earns ≥ 1300 (to cover 1000 salary + 300 debt):
  - 1000 goes to salary release
  - 300 goes to loan repay
  - Loan marked REPAID ✓

If prof earns < 1300:
  - Salary gets priority
  - Loan balance carries to next month
  - Interest may apply (TBD)
```

---

## TECH STACK SPECIFICS

### Frontend
- **Next.js 16** - App Router (not Pages Router)
- **React 19** - Latest with RSC support
- **TypeScript** - Strict mode, no `any`
- **Tailwind CSS v4** - Utility-first styling
- **Lucide React** - SVG icons
- **shadcn/ui** - Accessible Radix-based components (Button, Card, Tabs, etc.)

### Backend
- **Next.js API Routes** - `/app/api/*` folder
- **Supabase SDK** - `@supabase/supabase-js` client
- **Service Role Key** - For server-side privileged operations (bypasses RLS)
- **Webhooks** - Supabase native events (user.created, user.deleted, user.updated)

### Database
- **Supabase (PostgreSQL)** - Managed Postgres with built-in Auth
- **RLS Policies** - All tables have row-level security
- **Triggers** - handle_new_auth_user() for auth → profile sync
- **Partitioning** - token_transactions and audit_logs partitioned by date
- **Indexes** - On email, organization_id, status columns for performance

### Deployment
- **Vercel** - Next.js hosting (auto-deploys on git push)
- **GitHub** - Source control (connected to Vercel)
- **Environment Variables** - `.env.local` for dev, Vercel Settings for prod

---

## FILE ORGANIZATION

```
/vercel/share/v0-project/
├── app/
│   ├── admin/
│   │   ├── login/page.tsx              [WORKING ✅]
│   │   ├── signup/page.tsx             [WORKING ✅]
│   │   ├── dashboard/page.tsx          [BROKEN ❌ - shows all orgs]
│   │   └── layout.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   └── signup/route.ts         [WORKING ✅]
│   │   ├── webhooks/
│   │   │   └── supabase/route.ts       [WORKING ✅]
│   │   └── invitations/
│   │       └── accept/route.ts         [WORKING ✅]
│   ├── (auth)/
│   │   ├── login/page.tsx              [WORKING ✅]
│   │   ├── accept-invite/page.tsx      [WORKING ✅]
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── director/
│   │   │   ├── page.tsx                [WORKING w/ real data ✅]
│   │   │   ├── settings/page.tsx       [WORKING ✅]
│   │   │   └── layout.tsx
│   │   ├── lead/page.tsx               [SKELETON ⚠️]
│   │   ├── member/page.tsx             [SKELETON ⚠️]
│   │   ├── finance/page.tsx            [SKELETON ⚠️]
│   │   ├── dean/page.tsx               [SKELETON ⚠️]
│   │   ├── dashboard/page.tsx          [ROLE ROUTER]
│   │   └── layout.tsx
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── shared/
│   │   ├── stat-card.tsx
│   │   └── progress-gauge.tsx
│   └── ui/                             [shadcn/ui components]
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── tabs.tsx
│       └── ...
├── lib/
│   ├── auth.ts                         [Main auth logic]
│   ├── auth-context.tsx                [React Context - may be stale]
│   ├── auth-helpers.ts                 [Utility functions]
│   ├── auth-store.ts                   [Zustand store - may be stale]
│   ├── database.types.ts               [TypeScript types from Supabase]
│   ├── security.ts                     [Password validation, HMAC verification]
│   ├── types.ts                        [Custom TypeScript interfaces]
│   ├── utils.ts                        [Utility helpers]
│   └── supabase/
│       ├── client.ts                   [Client-side Supabase setup]
│       └── server.ts                   [Server-side Supabase setup]
├── supabase/
│   └── migrations/
│       └── 20260723_add_webhook_trigger.sql   [Latest migration]
├── middleware.ts                       [Auth checks for protected routes]
├── package.json                        [Dependencies]
├── tsconfig.json                       [TypeScript config]
├── tailwind.config.ts                  [Tailwind theming]
├── next.config.ts                      [Next.js config]
└── [Documentation files]
    ├── README_START_HERE.md
    ├── ARCHITECTURE.md
    ├── OVERVIEW.md
    ├── agentscontext.md
    ├── CHECKLIST.md
    └── ... (20+ more docs)
```

---

## NEXT IMMEDIATE STEPS (For You to Fix)

### Priority 1: Fix Admin Dashboard Org Filtering
**Files to change:**
1. **Database migration:** Add `creator_id UUID` to organizations table
2. **API:** Update `/api/admin/signup/route.ts` to set creator_id
3. **Page:** Update `/app/admin/dashboard/page.tsx` to filter by creator_id

**Expected Outcome:** Admin only sees organizations they created

### Priority 2: Implement Manage Organization Button
**Files to create/update:**
1. Create page: `/app/admin/organization/[org_id]/page.tsx`
2. Add onClick handler to "Manage Organization" button
3. Show organization details + edit capabilities

### Priority 3: Build Organization Tree Manager Component
**Files to create:**
1. Component: `components/org/OrgTreeBuilder.tsx`
2. Insert into `/app/(app)/director/page.tsx` in "Structure" tab
3. Implement add/edit/delete org_units UI
4. Implement lead assignment dropdown

**Expected Outcome:** Directors can create departments before inviting members

### Priority 4: Fix Invitation Flow to Include org_unit_id
**Files to update:**
1. `/app/(app)/director/settings/page.tsx` - Add org_unit selector when inviting
2. `/app/api/invitations/accept/route.ts` - Pass org_unit_id to profile creation

**Expected Outcome:** Members assigned to departments on invite acceptance

---

## ENVIRONMENT VARIABLES NEEDED

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Used for admin operations

# Webhook Security
WEBHOOK_SIGNATURE_SECRET=xxx  # Generate: openssl rand -base64 32

# Optional (future)
SENDGRID_API_KEY=xxx  # For email invitations
SENTRY_DSN=xxx  # For error tracking
```

---

## HOW TO VERIFY YOUR UNDERSTANDING

1. **Database Knowledge:**
   - Draw the relationship between organizations → org_units → users
   - Explain why RLS policies prevent cross-org data access
   - Describe the invitation flow from director invite to member login

2. **Authentication:**
   - Trace the difference between platform admin auth and tenant user auth
   - Explain the webhook flow when a user.created event fires
   - Describe how role routing works in `/dashboard`

3. **Current Issues:**
   - Explain why admin dashboard shows all organizations
   - Describe why members can't be added without org_units
   - Explain what creator_id field would fix

4. **UI/UX:**
   - Map which pages are WORKING vs STUB vs MISSING
   - Identify which components need to be built
   - Describe the org tree UI structure needed

---

**This document is your complete understanding of WorkLedger.**  
**Use it as reference before making ANY code changes.**  
**All implementations should follow the patterns and architecture described here.**

