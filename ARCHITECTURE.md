# WorkLedger Architecture Diagram

## System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          WorkLedger Two-Tier System                         │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐   ┌─────────────────────────────────┐
│       VENDOR / PLATFORM TIER        │   │   TENANT / ORGANIZATION TIER     │
│                                     │   │                                   │
│  Platform Admin @ /platform/*       │   │  Director @ /director           │
│  ├── Separate Auth (/platform/login)│   │  ├── Organization metrics       │
│  ├── Create Organizations           │   │  ├── Department management      │
│  ├── Seed Directors                 │   │  ├── Approvals queue            │
│  └── Manage Settings                │   │  └── Settings + Reports         │
│                                     │   │                                   │
│  platform_admins table (no RLS)     │   │  Dean @ /dean                   │
│                                     │   │  ├── Subtree overview           │
│                                     │   │  ├── Multi-dept comparison      │
│                                     │   │  └── Escalations                │
│                                     │   │                                   │
│                                     │   │  Lead @ /lead                   │
│                                     │   │  ├── Team verification queue    │
│                                     │   │  ├── Performance metrics        │
│                                     │   │  ├── Dual context toggle        │
│                                     │   │  └── Employee self-view         │
│                                     │   │                                   │
│                                     │   │  Finance @ /finance             │
│                                     │   │  ├── Ledger view                │
│                                     │   │  ├── Department readiness       │
│                                     │   │  ├── Batch reversal (atomic)    │
│                                     │   │  └── Reports + reconciliation   │
│                                     │   │                                   │
│                                     │   │  Member @ /member               │
│                                     │   │  ├── Token balance              │
│                                     │   │  ├── Weekly schedule            │
│                                     │   │  ├── Progress to threshold      │
│                                     │   │  └── Marketplace browsing       │
└─────────────────────────────────────┘   └─────────────────────────────────┘
         ▲                                          ▲
         │ (Separate auth)                         │ (Shared auth w/ routing)
         │                                          │
         ▼                                          ▼
    ┌─────────────────────────────────────────────────────┐
    │           Supabase Auth (Email + Password)          │
    │                                                     │
    │  auth.users (platform_admin_users)                 │
    │  auth.users (tenant_org_users)                     │
    │                                                     │
    │  Session Cookies (Secure, HttpOnly)               │
    └────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────────┐           ┌────────────────────────┐
    │  platform   │           │   Supabase PostgreSQL  │
    │  _admins    │           │   with RLS Policies    │
    │  (no RLS)   │           │                        │
    │             │           │  MULTI-TENANT TABLES:  │
    └─────────────┘           │  ├── organizations     │
                              │  ├── org_units         │
                              │  ├── users             │
                              │  ├── roles             │
                              │  ├── user_roles        │
                              │  ├── wallets           │
                              │  ├── invitations       │
                              │  ├── tasks             │
                              │  ├── loans             │
                              │  ├── approvals         │
                              │  ├── rate_cards        │
                              │  └── audit_logs        │
                              │                        │
                              │  RLS Filters:          │
                              │  - organization_id     │
                              │  - user_id             │
                              │  - owner_user_id       │
                              └────────────────────────┘
```

---

## Authentication & Authorization Flow

```
                            ┌─────────────────────┐
                            │   User Visits App    │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
            ┌──────────────────┐           ┌──────────────────────┐
            │  Platform Admin? │           │  Tenant User?        │
            └────────┬─────────┘           └────────┬─────────────┘
                     │                              │
          YES        │        NO          YES        │        NO
        ┌───────┐    │    ┌───────┐    ┌───────┐    │    ┌────────┐
        ▼       ▼    ▼    ▼       ▼    ▼       ▼    ▼    ▼        ▼
    /platform   │         │   /login   │  /auth │         │    /public
    /login      │         │           │   only │         │
               │         │           └───────┘        │
               ▼         ▼                             ▼
       ┌─────────────────────┐              ┌──────────────────────┐
       │  Supabase Auth      │              │  Auth Check          │
       │  Check platform_    │              │  1. Get auth session │
       │  admins RLS policy  │              │  2. Query public.    │
       └────────┬────────────┘              │     users profile    │
                │                           └────────┬─────────────┘
        ┌───────┴────────┐                          │
        │                │                  ┌───────┴────────┐
      YES               NO                 YES              NO
        │                │                  │               │
        ▼                ▼                  ▼               ▼
    /platform        /login            Fetch             "Account
    /dashboard       (error)           user_roles        not ready"
        │                               │
        │                    ┌──────────┴──────────┐
        │                    │                     │
        ▼                    ▼                     ▼
    Org List          Get role.              Show:
    + Create          scope_level            - Check email
    + Seed            │                      - Link to /
      Director        ▼                        accept-invite
                ┌──────────────────────┐
                │  Route Map:          │
                ├──────────────────────┤
                │ DIRECTOR      →      │
                │ /director            │
                │                      │
                │ DEAN          →      │
                │ /dean                │
                │                      │
                │ ORG_UNIT_LEAD →      │
                │ /lead                │
                │                      │
                │ MEMBER        →      │
                │ /member              │
                │                      │
                │ FINANCE_ADMIN →      │
                │ /finance             │
                └──────┬───────────────┘
                       │
                       ▼
                ┌──────────────┐
                │  Dashboard   │
                │  (Real Data) │
                └──────────────┘
```

---

## Data Flow: Dashboard Load

```
User at /director (Director Dashboard)
│
├─ useEffect hook
│  └─ Get current auth user
│
├─ Query: organizations
│  └─ RLS filter: organization_id = user.organization_id
│  └─ Result: { name, type, id }
│
├─ Query: users (count members)
│  └─ RLS filter: organization_id = user.organization_id
│  └─ Result: member_count
│
├─ Query: org_units (count departments)
│  └─ RLS filter: organization_id = user.organization_id
│  └─ Result: dept_count
│
├─ Query: wallets (org pools)
│  └─ RLS filter: organization_id = user.organization_id
│  └─ RLS filter: purpose IN ('SALARY_POOL', 'LOAN_POOL')
│  └─ Result: { salary_pool_balance, loan_pool_balance }
│
├─ Display: All real data
│  ├─ "Members: 47"
│  ├─ "Departments: 5"
│  ├─ "Salary Pool: 50000 WORK"
│  └─ "Loan Pool: 15000 WORK"
│
└─ Render: Four tabs
   ├─ Structure (editable)
   ├─ Approvals (queue)
   ├─ Settings (config)
   └─ Reports (analytics)

KEY: Every query includes RLS filters!
     Database prevents accessing other orgs' data.
```

---

## Multi-Tenancy Isolation

```
┌────────────────────────────────────────────────────────────┐
│                    Supabase Database                        │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────┐    ┌──────────────────────────┐
│   Organization A         │    │   Organization B         │
│   (Org ID: org_123)      │    │   (Org ID: org_456)      │
│                          │    │                          │
│ Users (5):              │    │ Users (3):              │
│ ├─ director_a           │    │ ├─ director_b          │
│ ├─ lead_a1              │    │ ├─ member_b1           │
│ ├─ lead_a2              │    │ └─ member_b2           │
│ ├─ member_a1            │    │                        │
│ └─ member_a2            │    │ Wallets:               │
│                          │    │ ├─ director_b wallet  │
│ Wallets:                 │    │ ├─ member_b1 wallet   │
│ ├─ director_a wallet    │    │ ├─ member_b2 wallet   │
│ ├─ member_a1 wallet     │    │ ├─ salary_pool_b      │
│ ├─ member_a2 wallet     │    │ └─ loan_pool_b        │
│ ├─ salary_pool_a        │    │                        │
│ └─ loan_pool_a          │    │ Approvals (2):         │
│                          │    │ ├─ salary_request_b1  │
│ Approvals (7):           │    │ └─ loan_request_b2    │
│ ├─ salary_request_a1    │    │                        │
│ ├─ salary_request_a2    │    │ Tasks (4):             │
│ ├─ loan_request_a1      │    │ ├─ event_b1           │
│ ├─ loan_request_a2      │    │ ├─ event_b2           │
│ ├─ task_verify_a1       │    │ ├─ class_b1           │
│ ├─ task_verify_a2       │    │ └─ class_b2           │
│ └─ task_verify_a3       │    │                        │
│                          │    │ Loans (1):            │
│ Tasks (8):               │    │ └─ loan_b2_shortfall │
│ ├─ event_a1             │    │                        │
│ ├─ event_a2             │    │                        │
│ ├─ class_a1             │    │                        │
│ ├─ class_a2             │    │                        │
│ ├─ class_a3             │    │                        │
│ ├─ meeting_a1           │    │                        │
│ ├─ mentoring_a1         │    │                        │
│ └─ mentoring_a2         │    │                        │
│                          │    │                        │
│ Loans (3):               │    │                        │
│ ├─ loan_a1_shortfall    │    │                        │
│ ├─ loan_a2_shortfall    │    │                        │
│ └─ loan_a3_emergency    │    │                        │
└──────────────────────────┘    └──────────────────────────┘

RLS RULES (Enforced by Database):
┌─────────────────────────────────────────────────────────────┐
│ User from Org A CANNOT:                                     │
│ ├─ Query users where organization_id != org_123           │
│ ├─ Query wallets where organization_id != org_123         │
│ ├─ Update approvals where organization_id != org_123      │
│ └─ Delete tasks from Organization B                        │
│                                                             │
│ Database returns: ZERO rows (not "access denied")          │
│ Result: Org A is completely isolated from Org B data       │
└─────────────────────────────────────────────────────────────┘
```

---

## Dashboard Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      Platform Admin                          │
│                  /platform/login                            │
│              /platform/dashboard                            │
│         (Separate auth tier, creates orgs)                 │
└─────────────┬───────────────────────────────────────────────┘
              │ (Creates organization + seeds Director)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Organization                            │
│                     (Org ID: xyz)                            │
└─────────────────────────────────────────────────────────────┘
    │
    ├─ /director (Organization-wide view)
    │  ├─ Org-wide metrics
    │  ├─ All departments + members
    │  ├─ Salary + Loan pools
    │  └─ Approvals, settings, reports
    │
    ├─ /dean (Multi-department subtree)
    │  ├─ Departments report to this dean
    │  ├─ Aggregated metrics for subtree
    │  ├─ Escalations from leads
    │  └─ Cross-dept comparison
    │
    ├─ /lead (Single department)
    │  ├─ Team member list
    │  ├─ Verification queue
    │  ├─ Dual context (manager + employee)
    │  └─ Performance metrics
    │
    ├─ /member (Individual contributor)
    │  ├─ Personal token balance
    │  ├─ Weekly schedule
    │  ├─ Progress to salary threshold
    │  └─ Task marketplace
    │
    └─ /finance (Org-wide ledger)
       ├─ Salary + Loan pool balances
       ├─ Transaction ledger
       ├─ Department readiness
       └─ Month-end batch reversal

KEY: Each user sees data filtered by organization_id (via RLS)
     Views are determined by role.scope_level
     Hierarchical access (Lead → Dean → Director)
```

---

## Invitation & Account Creation Flow

```
Platform Admin                Director Accept Invite        Tenant User Login
at /platform                  at /accept-invite             at /login
│                             │                             │
├─ Create Org                 │                             │
├─ Seed roles                 │                             │
├─ Insert into                │                             │
│  invitations table          │                             │
│  (status='PENDING')         │                             │
│                             │                             │
├─ Email: "Join..."           │                             │
│  Link: /accept-invite?token │                             │
│                             ├─ User clicks link          │
│                             ├─ Loads invitation details  │
│                             ├─ Enters name               │
│                             ├─ Sets password             │
│                             │                             │
│                             ├─ Calls Supabase Auth:      │
│                             │  signup(email, password)   │
│                             │                             │
│                             ├─ Auth user created ✓       │
│                             │                             │
│                             ├─ TRIGGER FIRES:            │
│                             │  handle_new_auth_user()    │
│                             │  ├─ Create public.users    │
│                             │  ├─ Set org_unit_id        │
│                             │  ├─ Create wallet          │
│                             │  ├─ Assign role via        │
│                             │  │  user_roles             │
│                             │  └─ Mark invite ACCEPTED   │
│                             │                             │
│                             ├─ Redirect: /login          │
│                             │                             │
│                             │                             │
│                             │                             ├─ User navigates /login
│                             │                             ├─ Enters email + password
│                             │                             ├─ Supabase validates
│                             │                             ├─ Query public.users ✓
│                             │                             ├─ Fetch user.user_roles
│                             │                             ├─ Get role.scope_level
│                             │                             ├─ Route map resolve
│                             │                             │  (e.g., DIRECTOR)
│                             │                             ├─ Redirect: /director
│                             │                             │
│                             │                             └─ Dashboard shows
│                             │                                real data ✓

KEY: Trigger decouples auth from profile
     Invitation can be revoked before accepted
     No shared secrets (just tokens)
     Email delivery optional (currently just tokens in logs)
```

---

## Role Resolution Algorithm

```
At Login:

user_email = input
user_password = input

auth_user = await supabase.auth.signIn(user_email, user_password)
if (!auth_user) {
  show_error("Invalid credentials")
  return
}

public_user = query public.users where id = auth_user.id
if (!public_user) {
  show_state("Account not ready")
  show_message("Check email for invite link")
  return
}

user_roles = query user_roles where user_id = public_user.id
  join roles where id = user_roles.role_id

if (user_roles.length == 0) {
  show_error("No roles assigned")
  return
}

// Take first role (multi-role support TODO)
primary_role = user_roles[0]
scope_level = primary_role.scope_level

route_map = {
  "PLATFORM_ADMIN": "/platform/dashboard",
  "DIRECTOR": "/director",
  "DEAN": "/dean",
  "ORG_UNIT_LEAD": "/lead",
  "MEMBER": "/member",
  "FINANCE_ADMIN": "/finance"
}

target_route = route_map[scope_level]
if (target_route) {
  redirect(target_route)
}
```

---

## Month-End Batch Reversal (Finance)

```
Before Month-End:
┌─────────────────────────────────────────────────────┐
│ Salary Pool: 100,000 WORK                           │
│                                                     │
│ Faculty Wallets (after earning):                   │
│ ├─ Faculty A: 1200 WORK (verified ✓)              │
│ ├─ Faculty B: 950 WORK (verified ✓)               │
│ ├─ Faculty C: 500 WORK (pending verification)     │
│ └─ Faculty D: 800 WORK (verified ✓)               │
└─────────────────────────────────────────────────────┘

Finance Admin clicks "Trigger Batch Reverse Transfer"
(Only available after all department readiness == 100%)

Database Transaction:
│
├─ Find all faculty in this org with VERIFIED status
├─ Create transfer records (audit trail):
│  ├─ Faculty A: 1200 → salary pool
│  ├─ Faculty B: 950 → salary pool
│  └─ Faculty D: 800 → salary pool
│  (Faculty C skipped, pending verification)
│
├─ Atomic transfer (ACID guaranteed):
│  BEGIN TRANSACTION
│    UPDATE wallets
│    SET balance = balance - 1200
│    WHERE owner_user_id = 'faculty_a'
│
│    UPDATE wallets
│    SET balance = balance - 950
│    WHERE owner_user_id = 'faculty_b'
│
│    UPDATE wallets
│    SET balance = balance - 800
│    WHERE owner_user_id = 'faculty_d'
│
│    UPDATE wallets
│    SET balance = balance + (1200 + 950 + 800)
│    WHERE purpose = 'SALARY_POOL'
│  COMMIT
│
└─ Insert audit log record

After Month-End:
┌─────────────────────────────────────────────────────┐
│ Salary Pool: 100,000 + 2,950 = 102,950 WORK        │
│ (Restored budget + overflow)                         │
│                                                     │
│ Faculty Wallets:                                    │
│ ├─ Faculty A: 0 WORK (reversed ✓)                  │
│ ├─ Faculty B: 0 WORK (reversed ✓)                  │
│ ├─ Faculty C: 500 WORK (stays pending)             │
│ └─ Faculty D: 0 WORK (reversed ✓)                  │
│                                                     │
│ Next: Finance triggers real bank payroll release   │
└─────────────────────────────────────────────────────┘

If any step fails:
  ROLLBACK entire transaction
  Salary pool returns to 100,000
  All faculty wallets unchanged
  Admin sees error + audit log
```

---

## Security Layers

```
Layer 1: Authentication
├─ Supabase Auth (secure, session-based)
├─ Email + password + optional 2FA
├─ Session cookies (HttpOnly, Secure, SameSite)
└─ No tokens exposed to client

Layer 2: Authorization (RLS)
├─ organization_id filter on every table
├─ user_id filter for personal data
├─ Scope_level determines dashboard access
└─ Database rejects unauthorized queries

Layer 3: Audit
├─ Every transaction logged
├─ User action + timestamp + change recorded
├─ Immutable ledger for finance (hash chain ready)
└─ Finance can export audit logs for compliance

Layer 4: Validation
├─ TypeScript type checking (compile-time)
├─ Supabase column constraints (runtime)
├─ Server-side validation on all inputs
└─ No client-side logic that bypasses server

Layer 5: Data Isolation
├─ Platform admins (no RLS, separate tier)
├─ Organizations (completely isolated via org_id)
├─ Users (can only access own + subordinates' data)
└─ Finance (sees all but not permitted to modify user profiles)
```

This multi-layered approach ensures security at every level!
