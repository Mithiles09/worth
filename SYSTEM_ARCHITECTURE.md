# WorkLedger: Complete System Architecture & Multi-Tenant Analysis

## Executive Summary

WorkLedger is an **enterprise-grade, multi-tenant performance-based compensation SaaS** that solves the "Fixed Pay for Unequal Work" problem by:
- Tracking work through **Structured** (scheduled) and **Unstructured** (dynamic) tasks
- Converting work into **ERC20 tokens** as proof of eligibility
- Tying **monthly salary release** to demonstrated performance (≥85% credit target)
- Providing **loan mechanisms** for short-term shortfalls with debt clearance requirements

---

## PART 1: SYSTEM ARCHITECTURE

### 1.1 Multi-Tenant Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     WorkLedger SaaS Platform                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐   ┌──────────────┐ │
│  │Platform Tier │         │ Org 1 Tenant │   │ Org 2 Tenant │ │
│  │(Multi-Admin) │         │  (College A) │   │ (Enterprise) │ │
│  └──────────────┘         └──────────────┘   └──────────────┘ │
│                                                                 │
│  • Platform Admins          Each has:           Completely     │
│  • Billing                  • Director(s)       Isolated        │
│  • System Config            • HODs              Database        │
│  • Org Provisioning         • Members           Schema          │
│  • License Management       • Finance Admins    & Users         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication & Authorization Layers

```
┌───────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION STACK                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Layer 1: PLATFORM LEVEL (Supabase Auth)                         │
│  ─────────────────────────────────────────                       │
│  • Table: platform_admins (email, auth_user_id)                  │
│  • JWT Claims: { sub, email, role: "PLATFORM_ADMIN" }            │
│  • Access: /admin/* (setup organizations, manage licenses)       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Layer 2: ORGANIZATION LEVEL (Supabase Auth + JWT Claims)   │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ • Table: users (org_id, org_unit_id, email, name)          │ │
│  │ • JWT Claims: {sub, org_id, org_unit_id, role_ids[], email}│ │
│  │ • Access: /app/* (all organizational pages & features)      │ │
│  │                                                              │ │
│  │ ┌──────────────────────────────────────────────────────┐   │ │
│  │ │ Layer 3: SCOPE MIDDLEWARE (Route Guard)            │   │ │
│  │ │ ────────────────────────────────────────────────    │   │ │
│  │ │ Resolves from JWT: org_id + org_unit_id + role_ids│   │ │
│  │ │ Routes to: /(director)/, /(hod)/, /(member)/     │   │ │
│  │ │ Enforces: RLS queries, permission checks, audit   │   │ │
│  │ └──────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 1.3 Database Tenant Isolation Strategy

```
Tenant Isolation Principle:
├── Every table has: organization_id (UUID)
├── Every RLS policy checks: (organization_id = get_jwt_session_org_id())
├── Queries MUST include: WHERE organization_id = $1
├── No cross-tenant data ever visible
│
Exceptions (Platform-level only):
├── platform_admins (no org_id)
├── organization_templates
├── invitations (bridges org signup)
```

---

## PART 2: USER ONBOARDING FLOWS

### 2.1 Flow 1: Platform Admin Onboarding (SaaS Owner)

```
Step 1: Platform Admin Registration
─────────────────────────────────
POST /auth/admin/signup
├── Email
├── Password (hashed)
├── Name
└── Organization template choice (COLLEGE, ENTERPRISE, GENERIC)

    ↓
    
INSERT platform_admins (auth_user_id, email, name)
INSERT organizations (org_id, template_key, name)
SET JWT: { sub, email, role: "PLATFORM_ADMIN" }

    ↓

Step 2: Platform Admin Dashboard
──────────────────────────────────
GET /admin/dashboard
├── Tenants Created (list all org_ids)
├── Pending Invitations (count by org)
├── System Health
├── Usage Stats
└── Billing

    ↓

Step 3: Organization Initial Configuration
────────────────────────────────────────────
POST /admin/orgs/{org_id}/configure
├── Org Name, Logo, Type
├── Default Compensation Policies
│   ├── Monthly Target Credits (e.g., 850)
│   ├── Baseline Minimum (e.g., 700)
│   ├── Threshold % (e.g., 85%)
│   └── Grace Period (days)
├── Task Types (STRUCTURED, UNSTRUCTURED templates)
├── Approval Chains (who approves what)
├── Rate Cards (credits per task type/role)
└── Director Details (first user to invite)

    ↓

Step 4: Invite Director
────────────────────────
POST /admin/orgs/{org_id}/invite
├── Email
├── Role: DIRECTOR
├── Generate invitation token (expires in 7 days)
└── Send email with signup link + token

    ↓ Email: "Join [Org Name] as Director"

Step 5: Platform Admin → Idle
──────────────────────────────
Director will handle org-level user provisioning from here
Admin monitors from /admin/dashboard
```

### 2.2 Flow 2: Director Onboarding (First Org User)

```
Step 1: Director Accepts Invitation
────────────────────────────────────
Click link in email → /auth/join?token={invitation_token}
    ↓
GET /auth/join?token=...
├── Verify token is PENDING & not expired
├── Show org name + role
└── Prompt: Set password, confirm email

    ↓

Step 2: Director Registration
──────────────────────────────
POST /auth/register?token={invitation_token}
├── Email (pre-filled from invitation)
├── Password (new)
├── Name
├── Confirm subscription terms
    ↓
    INSERT auth_users (email, password_hash)
    UPDATE invitations SET status = 'ACCEPTED'
    INSERT users (org_id, email, role_id = 'DIRECTOR')
    INSERT user_roles (user_id, role_id = 'DIRECTOR')
    INSERT wallets (org_id, owner_user_id, purpose = 'SALARY_POOL')
    INSERT wallets (org_id, owner_user_id, purpose = 'LOAN_POOL')
    SET JWT: { sub, org_id, org_unit_id=null, role_ids=['DIRECTOR'] }

    ↓

Step 3: Director Onboarding Wizard
───────────────────────────────────
POST /app/director/setup/org-structure
├── Create org units (departments, divisions)
├── Assign HODs to each unit
├── Set Designation names (Professor, Senior, Junior, etc.)
└── Define Skill Taxonomies

    ↓

Step 4: Director Budget Configuration
──────────────────────────────────────
POST /app/director/setup/budget
├── Set Annual Budget Cap (e.g., $5M)
├── Set Monthly Salary Pool Allocation (e.g., $400K)
├── Set Loan Pool Reserve (e.g., $100K)
├── Mint Initial Tokens to Salary Wallet
│   └── amount = monthly_allocation / USD_per_token
└── Review token circulation strategy

    ↓

Step 5: Director Can Now
────────────────────────
✓ Invite HODs and Members
✓ View organization dashboard
✓ Configure Approval Chains
✓ Set Rate Cards
✓ Monitor token circulation
✓ Approve loans
```

### 2.3 Flow 3: HOD Onboarding (Department Manager)

```
Step 1: Director Invites HOD
─────────────────────────────
POST /app/director/team/invite
├── Email
├── Department (org_unit_id)
├── Role: ORG_UNIT_LEAD
└── Generate invitation token

    ↓ Email: "Join [Org]/[Dept] as HOD"

Step 2: HOD Accepts & Registers
────────────────────────────────
GET /auth/join?token={token}
    ↓
POST /auth/register?token={token}
├── Email (pre-filled)
├── Password
├── Name
├── Confirm role + department
    ↓
    INSERT users (org_id, org_unit_id, email, role_id='ORG_UNIT_LEAD')
    INSERT user_roles (user_id, role_ids=['ORG_UNIT_LEAD', 'MEMBER'])
    INSERT wallets (owner_user_id, purpose='PERSONAL') [HOD's own salary]
    Set JWT: {sub, org_id, org_unit_id, role_ids=['ORG_UNIT_LEAD', 'MEMBER']}

    ↓

Step 3: HOD First Login
───────────────────────
GET /app/hod/dashboard
├── Dual-Context Toggle: "Manager View" / "My Work"
├── Manager View shows:
│   ├── Team roster (members under their org_unit)
│   ├── Approval queue
│   ├── Task pool
│   └── Department heatmap
├── My Work shows:
│   ├── Their own schedule
│   ├── Their own credits
│   └── Their own wallet balance
└── Invite team members from here
```

### 2.4 Flow 4: Member/Faculty Onboarding (Individual Contributor)

```
Step 1: HOD or Director Invites Member
───────────────────────────────────────
POST /app/director/team/invite (or /app/hod/team/invite)
├── Email
├── Department (org_unit_id)
├── Designation (Professor, Associate, etc.)
├── Skills (JSON array)
├── Capacity (hours/week)
└── Role: MEMBER

    ↓ Email: "Join [Org] as Faculty Member"

Step 2: Member Accepts & Registers
───────────────────────────────────
GET /auth/join?token={token}
    ↓
POST /auth/register?token={token}
├── Email (pre-filled)
├── Password
├── Name
├── Confirm role + department
    ↓
    INSERT users (org_id, org_unit_id, email, skills, capacity_hours_weekly)
    INSERT user_roles (user_id, role_id='MEMBER')
    INSERT wallets (owner_user_id, purpose='PERSONAL')
    Set JWT: {sub, org_id, org_unit_id, role_ids=['MEMBER']}

    ↓

Step 3: Member First Login
──────────────────────────
GET /app/member/dashboard
├── Progress Gauge (credits earned this month)
├── Schedule (structured tasks auto-generated from calendar)
├── Wallet Balance (current token balance)
├── Loan Alert (if applicable)
├── Buttons:
│   ├── "Browse Marketplace" (unstructured tasks)
│   ├── "My Tasks" (assigned + nominated)
│   └── "My Attendance" (for structured work)

    ↓ Next: Member can claim tasks and start earning credits
```

### 2.5 Flow 5: Finance Admin Onboarding (Ledger Custodian)

```
Step 1: Director Invites Finance Admin
──────────────────────────────────────
POST /app/director/team/invite
├── Email
├── Role: FINANCE_ADMIN
├── Permissions: (read wallets, approve reversals)
└── Generate invitation token

    ↓ Email: "Join [Org] as Finance Admin"

Step 2: Finance Admin Registration
──────────────────────────────────
POST /auth/register?token={token}
    ↓
    INSERT users (org_id, email, role_id='FINANCE_ADMIN')
    INSERT user_roles (user_id, role_id='FINANCE_ADMIN')
    Set JWT: {sub, org_id, org_unit_id=null, role_ids=['FINANCE_ADMIN']}

    ↓

Step 3: Finance Admin First Login
──────────────────────────────────
GET /app/finance/ledger
├── See only: Wallets, Token Transactions, Batch Reversal buttons
├── Cannot see: Team, Tasks, HR data (explicit RLS scope_level='FINANCE_ADMIN')
└── Ready to trigger month-end batch reversal
```

---

## PART 3: DATA OWNERSHIP & ROLE HIERARCHY

### 3.1 Permission Matrix

```
ACTION                    PLATFORM_ADMIN    DIRECTOR    HOD    MEMBER    FINANCE
────────────────────────────────────────────────────────────────────────────────
View Org Structure             ✓              ✓         ✓      ✗         ✗
Edit Org Structure             ✓              ✓         ✗      ✗         ✗
Create Compensation Policy     ✓              ✓         ✗      ✗         ✗
Invite Users                   ✓              ✓         ✓      ✗         ✗
Approve Salary (HOD step)      ✓              ✓         ✓      ✗         ✗
Approve Salary (Dir step)      ✓              ✓         ✗      ✗         ✗
Approve Loan                   ✓              ✓         ✗      ✗         ✗
Post Unstructured Task         ✓              ✓         ✓      ✗         ✗
Verify Task (own dept)         ✓              ✓         ✓      ✗         ✗
Claim/Nominate Task            ✓              ✗         ✓      ✓         ✗
Request Salary/Loan            ✓              ✗         ✓      ✓         ✗
Batch Reverse Tokens           ✓              ✓         ✗      ✗         ✓
View Ledger (audit)            ✓              ✓         (scoped)        (scoped)    ✓
View Own Wallet                ✓              ✓         ✓      ✓         (org-wide)
```

### 3.2 Data Scope Rules

```
PLATFORM_ADMIN
└── Can see all organizations
    └── Platform metrics only
    └── Cannot see user PII across orgs

DIRECTOR (Org-wide)
└── Can see entire org
    ├── All departments
    ├── All users
    ├── All wallets
    ├── All tasks
    ├── All approval queues
    └── All ledger transactions

HOD (Department-scoped)
├── Can see own department
│   ├── Team members under org_unit_id
│   ├── Tasks in department
│   ├── Approvals for department
│   └── Department wallet (read-only)
├── Cannot see:
│   ├── Other departments
│   ├── Director-level approvals
│   └── Salary pool totals (only own dept scope)
└── AS EMPLOYEE (member role):
    ├── Can also see own tasks
    ├── Own wallet balance
    └── Own credits progress

MEMBER (Self-scoped)
├── Can see:
│   ├── Own tasks
│   ├── Own schedule
│   ├── Own wallet balance
│   ├── Own loan (if any)
│   ├── Marketplace (unstructured tasks)
│   └── Department-posted tasks
├── Cannot see:
│   ├── Other members' data
│   ├── Org structure
│   ├── Approval queues
│   └── Financial summaries

FINANCE_ADMIN (Ledger-scoped)
├── Can see:
│   ├── Wallet balances (all)
│   ├── Token transactions (all)
│   ├── Batch reversal status
│   └── Audit logs (finance actions only)
├── Cannot see:
│   ├── Team/HR data
│   ├── Individual tasks
│   ├── Org structure
│   └── User personal info
```

---

## PART 4: CORE ENTITY LIFECYCLE

### 4.1 Task Lifecycle (All States)

```
STRUCTURED TASK LIFECYCLE:
──────────────────────────
SYSTEM generates from calendar → OPEN
    ↓
Auto-assigned to faculty on schedule
    ↓
ASSIGNED
    ↓
IN_PROGRESS (faculty marks attendance during/after)
    ↓
Submit Attendance Proof (class attendance, topic taught)
    ↓
VERIFICATION_PENDING
    ↓
HOD audits weekly/monthly
    ↓
LEAD_SIGNED (credit awarded to progress_percentage)
    ↓
CLOSED (credit locked in)

UNSTRUCTURED TASK LIFECYCLE:
─────────────────────────────
DRAFT (HOD creates task definition)
    ↓
POST TO MARKETPLACE (OPEN)
    ↓
NOMINATED (members self-nominate)
    ↓
HOD accepts winning nomination or assigns directly
    ↓
ASSIGNED
    ↓
IN_PROGRESS
    ↓
Member submits evidence (documents, artifacts, screenshots)
    ↓
VERIFICATION_PENDING
    ├── If requires_peer_review = true
    │   ↓
    │   PEER_APPROVED (peer signs off first)
    │   ↓
    │   LEAD_SIGNED (HOD final approval)
    └── If requires_peer_review = false
        ↓
        LEAD_SIGNED (HOD direct approval)
    ↓
CLOSED (credit awarded)

REJECTION FLOW:
───────────────
VERIFICATION_PENDING → REJECTED (evidence insufficient)
    ↓
Member resubmits
    ↓
Back to VERIFICATION_PENDING
    ↓
(max 3 resubmissions, then escalates to Director)
```

### 4.2 Loan Lifecycle

```
START OF MONTH
    ↓
Faculty credits assessed (progress_percentage vs threshold)
    ↓
If progress < baseline minimum:
    ├── Check if buffer eligible (no repeated defaults)
    ├── If YES:
    │   ├── Auto-create LOAN with status=PENDING
    │   ├── Disable "Initiate Salary" button
    │   ├── Enable "Raise Loan Request" button
    │   └── Send notification
    │
    └── If NO:
        ├── Mark marketplace_locked = true
        ├── Send escalation to Director
        └── Require HR intervention
    
DIRECTOR REVIEWS LOAN REQUEST
    ├── Approve: 
    │   ├── Update loan status = ACTIVE
    │   ├── Transfer tokens: Director-Loan Wallet → Faculty Wallet
    │   ├── Insert token_transaction (LOAN_ISSUE)
    │   └── Send notification "Loan issued, you have debt"
    │
    └── Reject:
        ├── Update loan status = REJECTED
        └── Faculty must find another way to meet salary requirement

DURING NEXT MONTH(S):
    ├── Faculty must complete "debt-clearance" tasks
    ├── When debt-clearance task LEAD_SIGNED:
    │   ├── Calculate credit value
    │   ├── Transfer tokens back to Director-Loan Wallet
    │   ├── Update loans.remaining -= repaid_amount
    │   └── Notify faculty of progress
    │
    └── When loans.remaining = 0:
        ├── Update loan status = REPAID
        ├── Remove marketplace_locked flag
        └── Faculty eligible for full salary again

MONTH-END REVERSAL:
    ├── All loans marked ACTIVE or REPAID
    ├── Finance Admin triggers batch reverse
    ├── For each Faculty with token balance:
    │   ├── Transfer tokens: Faculty Wallet → Director-Salary Wallet
    │   └── Settle on payroll (real bank transfer outside system)
    └── Loop through until all balances zeroed for reversal
```

### 4.3 Monthly Salary Cycle State Machine

```
DAY 1-25 OF MONTH:
───────────────────
Faculty works on tasks (structured + unstructured)
├── Submit attendance (structured)
├── Nominate/claim unstructured tasks
├── Progress tracked in progress_percentage
└── Wallet balance still 0 (credits not yet transferred)

DAY 26-28 (MONTH-END TRIGGER):
──────────────────────────────
System job: month_end_credit_check() runs (scheduled via Edge Function)
    ├── For each faculty in org:
    │   ├── Load compensation_policy (most specific scope wins)
    │   ├── Compare progress_percentage vs threshold_percentage
    │   │
    │   ├── IF progress >= threshold (e.g., >= 85%):
    │   │   ├── Enable "Initiate My Salary" button
    │   │   ├── Transfer tokens: Director-Salary → Faculty Wallet
    │   │   └── Create approval_instance (SALARY_RELEASE, step 1)
    │   │
    │   ├── ELIF progress < threshold AND buffer_eligible:
    │   │   ├── Create loan (status=PENDING)
    │   │   ├── Disable salary button
    │   │   ├── Enable "Raise Loan Request" button
    │   │   └── Send notification
    │   │
    │   └── ELSE (no buffer, repeated default):
    │       ├── Mark marketplace_locked = true
    │       ├── Escalate to Director
    │       └── Notify member of HR review
    │
    └── Log system_job (status=COMPLETED)

DAY 28-30 (APPROVAL WINDOW):
─────────────────────────────
Faculty "Initiate My Salary" → Create approval request
    ↓
HOD receives notification "Verify salary request"
    ├── Review faculty's LeadSigned tasks (proof of work)
    ├── Check attendance, leaves, adjustments
    └── Approve or Reject
        ├── IF APPROVE:
        │   ├── Advance to step 2 (Director final approval)
        │   ├── Director reviews
        │   └── IF Director APPROVE:
        │       ├── Tokens transfer locked in
        │       ├── Create token_transaction (SALARY_TRANSFER, CONFIRMED)
        │       └── Faculty wallet balance set to monthly_salary_amount
        └── IF REJECT:
            ├── Salary request denied
            └── Faculty must rework or take loan if eligible

DAY 1-2 (SALARY PAYMENT DAY):
──────────────────────────────
Finance Admin view: Faculty Readiness table
    ├── Shows each faculty with confirmed salary tokens
    ├── Shows Director-Salary Wallet balance ready for reversal
    └── Button: "Trigger Batch Reverse Transfer"
        ├── Reverse all Faculty Wallets → Director-Salary Wallet
        ├── Verify Director-Salary Wallet balance restored
        ├── Signal: Ready for payroll
        └── Finance triggers real bank transfer (outside system)

CYCLE REPEATS:
──────────────
progress_percentage reset to 0
month advances
next cycle begins
```

---

## PART 5: COMPLETE PAGE MAP BY ROLE

### 5.1 Platform Admin Pages (6 pages)

```
1. /admin/login
   ├── Email + Password
   └── "Create Organization" link

2. /admin/dashboard (home after login)
   ├── Card: Active Organizations (count)
   ├── Card: Pending Invitations (count)
   ├── Card: Monthly Token Circulation (aggregate across orgs)
   ├── Table: Organizations with:
   │   ├── Org Name
   │   ├── Type (COLLEGE, ENTERPRISE, etc.)
   │   ├── Members (count)
   │   ├── Created Date
   │   ├── Status (Active/Suspended)
   │   └── Actions (View, Suspend, Delete)
   ├── Button: "+ Create Organization"
   └── Button: "System Settings"

3. /admin/orgs/new (or /admin/onboarding)
   ├── Step 1: Org Details
   │   ├── Organization Name
   │   ├── Organization Type (dropdown: COLLEGE, ENTERPRISE, etc.)
   │   ├── Logo Upload
   │   └── Next
   │
   ├── Step 2: Compensation Policies
   │   ├── Monthly Target Credits (e.g., 850)
   │   ├── Baseline Minimum (e.g., 700)
   │   ├── Threshold % (85%)
   │   ├── Grace Period (days)
   │   └── Next
   │
   ├── Step 3: Task Types & Rate Cards
   │   ├── Predefined task types (from template)
   │   ├── Edit credit values per task type
   │   ├── Add custom task types
   │   └── Next
   │
   ├── Step 4: Director Invitation
   │   ├── Email input
   │   ├── Send invitation
   │   └── Finish
   │
   └── Summary & Review

4. /admin/orgs/{org_id}
   ├── Org Settings
   │   ├── Name, Logo, Type
   │   ├── Edit compensation policies
   │   ├── View member count
   │   └── View token circulation
   ├── Team
   │   ├── List of all users by role
   │   ├── Suspend/activate users
   │   └── Reset passwords
   ├── Usage Stats
   │   ├── Tasks completed (this month)
   │   ├── Tokens minted
   │   ├── Loans issued
   │   └── Revenue metrics
   └── Actions: Suspend Org, Delete Org, Export Data

5. /admin/billing
   ├── Subscription plan (per org)
   ├── Active subscriptions table
   ├── Invoice history
   ├── Usage metrics (tasks/month, members, etc.)
   └── Billing settings

6. /admin/system-settings
   ├── Global system configuration
   ├── Email templates
   ├── Blockchain/ERC20 settings
   ├── Rate limiting rules
   ├── Feature flags
   └── Audit logs (system-level)
```

### 5.2 Director Pages (8 pages)

```
1. /app/director/dashboard (home)
   ├── HEADER: Org name, Director name, Notifications
   │
   ├── ROW 1: Key Metrics
   │   ├── Card: "Salary Pool Balance" (tokens ready)
   │   ├── Card: "Loan Pool Available" (reserve)
   │   ├── Card: "Active Loans" (count)
   │   └── Card: "Pending Approvals" (count)
   │
   ├── ROW 2: Charts
   │   ├── Chart 1: Token Circulation (donut/pie)
   │   │   ├── Director-Salary Wallet
   │   │   ├── Director-Loan Wallet
   │   │   ├── Faculty Wallets (total)
   │   │   └── Burned/Frozen
   │   │
   │   └── Chart 2: Monthly Progress Heatmap
   │       ├── Departments on Y-axis
   │       ├── Week of month on X-axis
   │       ├── Color intensity: % of faculty meeting target
   │       └── Hover: see names, credit counts
   │
   ├── ROW 3: Recent Activity
   │   ├── Task verification log
   │   ├── Salary approvals log
   │   ├── Loan approvals log
   │   └── Token transfer history
   │
   └── Sidebar Navigation:
       ├── Dashboard (current)
       ├── Organization Structure
       ├── Approvals Queue
       ├── Team & Invitations
       ├── Settings
       └── Audit Trail

2. /app/director/org-structure
   ├── Recursive tree view
   │   ├── Organization Root
   │   └── Departments (expandable)
   │       ├── HOD name
   │       ├── Member count
   │       ├── Actions (Edit, Delete, Add Members)
   │       └── Nested divisions (if any)
   │
   ├── Editor Panel (right side)
   │   ├── Add Department
   │   │   ├── Name
   │   ├── Parent (dropdown)
   │   ├── HOD (user selector)
   │   └── Save
   │
   ├── Bulk Import (CSV)
   │   ├── Upload file
   │   ├── Map columns
   │   ├── Preview
   │   └── Import
   │
   └── Export as JSON/CSV

3. /app/director/approvals
   ├── Tabs:
   │   ├── SALARY RELEASES (pending approval)
   │   │   ├── Table columns:
   │   │   │   ├── Faculty Name
   │   │   │   ├── Department
   │   │   │   ├── Month
   │   │   │   ├── Credits Earned (%)
   │   │   │   ├── Amount (tokens)
   │   │   │   ├── HOD Status (Verified/Pending)
   │   │   │   ├── Request Date
   │   │   │   └── Actions (Approve, Reject, View Details)
   │   │   │
   │   │   └── Batch Action: "Approve All" (for completed queue)
   │   │
   │   ├── LOAN REQUESTS (awaiting decision)
   │   │   ├── Table columns:
   │   │   │   ├── Faculty Name
   │   │   │   ├── Department
   │   │   │   ├── Shortfall Amount
   │   │   │   ├── Reason (buffer eligible? yes/no)
   │   │   │   ├── Request Date
   │   │   │   └── Actions (Approve, Reject, Request Info)
   │   │   │
   │   │   └── Detail panel: Review faculty's performance history
   │   │
   │   └── ESCALATIONS (marketplace locked, repeated defaults)
   │       ├── Alerts for HR intervention
   │       ├── Review metrics
   │       └── Actions (Review Case, Clear Lock, Suspend)
   │
   └── Filter: Department, Date Range, Status

4. /app/director/team-invitations
   ├── Section 1: Pending Invitations
   │   ├── Table:
   │   │   ├── Email
   │   │   ├── Role
   │   │   ├── Department
   │   │   ├── Sent Date
   │   │   ├── Expires
   │   │   └── Actions (Resend, Revoke)
   │
   ├── Section 2: Active Members
   │   ├── Filters: Role, Department, Status
   │   ├── Table:
   │   │   ├── Name
   │   │   ├── Email
   │   │   ├── Role
   │   │   ├── Department
   │   │   ├── Status (Active/Suspended)
   │   │   ├── Join Date
   │   │   └── Actions (Suspend, Reset Password, View Profile)
   │
   ├── Section 3: Invite New
   │   ├── Email input
   │   ├── Role dropdown (DIRECTOR, ORG_UNIT_LEAD, MEMBER, FINANCE_ADMIN)
   │   ├── Department (org_unit_id picker)
   │   ├── Message (optional)
   │   └── Send Invite
   │
   └── Bulk Invite (CSV upload)

5. /app/director/settings
   ├── Tab 1: Organization
   │   ├── Org Name (editable)
   │   ├── Logo (uploadable)
   │   ├── Type (read-only)
   │   └── Save
   │
   ├── Tab 2: Compensation Policies
   │   ├── Select scope (Org-wide, Department, Role)
   │   ├── Monthly Target Credits
   │   ├── Baseline Minimum
   │   ├── Threshold %
   │   ├── Grace Period
   │   ├── Effective From/To dates
   │   ├── Save
   │   └── Version history (audit trail)
   │
   ├── Tab 3: Task Types & Rate Cards
   │   ├── List of task types
   │   │   ├── Edit credit values
   │   │   ├── Edit required fields
   │   │   ├── Set peer review requirement
   │   │   └── Activate/deactivate
   │   │
   │   └── Rate cards (tokens per unit by role/multiplier)
   │
   ├── Tab 4: Approval Chains
   │   ├── Define steps for:
   │   │   ├── SALARY_RELEASE (who approves at each step)
   │   │   ├── LOAN_REQUEST
   │   │   └── TASK_VERIFICATION
   │   │
   │   └── Edit chain order and roles
   │
   └── Tab 5: Notification Rules
       ├── Email templates
       ├── Alert thresholds
       └── Escalation rules

6. /app/director/budget-config
   ├── Section 1: Pool Setup
   │   ├── Annual Budget Cap (read-only)
   │   ├── Monthly Allocation (editable)
   │   │   ├── Current value
   │   │   ├── Edit and save
   │   │   └── Effective from date
   │   │
   │   └── Loan Reserve (editable)
   │
   ├── Section 2: Token Minting
   │   ├── Card: "Director-Salary Wallet"
   │   │   ├── Current balance
   │   │   ├── Available to mint
   │   │   └── Button: "Mint [amount] Tokens"
   │   │
   │   └── Card: "Director-Loan Wallet"
   │       ├── Current balance
   │       ├── Reserved amount
   │       └── Button: "Top up Reserve"
   │
   ├── Section 3: Simulation
   │   ├── "What if" calculator
   │   ├── Inputs:
   │   │   ├── Monthly allocation
   │   │   ├── Expected loan issuance %
   │   │   └── Average salary per faculty
   │   │
   │   └── Output: Projected burn rate, runway estimate
   │
   └── Section 4: History
       ├── Minting history
       ├── Pool allocations (monthly)
       └── Burn records

7. /app/director/audit-logs
   ├── Filters:
   │   ├── Date range
   │   ├── Actor (user)
   │   ├── Action (MINT, TRANSFER, APPROVE, etc.)
   │   └── Entity Type (TASK, WALLET, LOAN, USER, etc.)
   │
   ├── Table:
   │   ├── Timestamp
   │   ├── Actor Name
   │   ├── Action
   │   ├── Entity Type
   │   ├── Entity ID (clickable to detail)
   │   ├── State Before (collapsed/expandable)
   │   ├── State After (collapsed/expandable)
   │   └── IP Address
   │
   └── Export: CSV, JSON

8. /app/director/analytics
   ├── Tab 1: Performance Dashboard
   │   ├── Chart: Avg credits by department
   │   ├── Chart: Distribution (% at target, below target, loan taken)
   │   ├── Chart: Loan repayment rate
   │   └── Chart: Task completion rate (structured vs unstructured)
   │
   ├── Tab 2: Financial Summary
   │   ├── Total tokens minted
   │   ├── Tokens in circulation (by wallet)
   │   ├── Tokens burned (cancelled tasks, etc.)
   │   ├── Projection (runway, next month cost)
   │   └── Cost per task completed
   │
   ├── Tab 3: Trends
   │   ├── Month-over-month performance
   │   ├── Loan trends (issued vs repaid)
   │   ├── Marketplace activity
   │   └── Peer review effectiveness
   │
   └── Export: PDF, CSV, PNG charts
```

### 5.3 HOD/Org Unit Lead Pages (6 pages) — Dual Context

```
CONTEXT TOGGLE (in header):
├── "My Work" (employee context) → routes to /app/hod/my-work/*
└── "Department Management" (manager context) → routes to /app/hod/management/*

EMPLOYEE CONTEXT (/app/hod/my-work/):
─────────────────────────────────────

1. /app/hod/my-work/dashboard
   ├── Header: "My Work This Month"
   ├── Progress Gauge
   │   ├── Credits target (e.g., 850)
   │   ├── Credits earned (real-time)
   │   ├── Percentage
   │   └── Color (red < 70%, yellow 70-85%, green >= 85%)
   │
   ├── Card: Wallet Balance
   │   ├── Current tokens
   │   ├── Monthly salary amount
   │   └── (greyed out until month-end review)
   │
   ├── Card: Loan Status (if applicable)
   │   ├── Loan amount taken
   │   ├── Remaining to repay
   │   ├── Next debt-clearance task due
   │   └── Alert if overdue
   │
   ├── Table: This Week's Tasks
   │   ├── Task name
   │   ├── Category (STRUCTURED/UNSTRUCTURED)
   │   ├── Status
   │   ├── Credits
   │   ├── Due date
   │   └── Actions (Start, Mark Done)
   │
   ├── Button: "Browse Marketplace" (unstructured tasks)
   └── Button: "My Attendance" (mark class attendance if structured tasks)

2. /app/hod/my-work/tasks
   ├── Filters: Category, Status, Department
   ├── Table:
   │   ├── Task Name
   │   ├── Category (STRUCTURED/UNSTRUCTURED)
   │   ├── Status
   │   ├── Credits
   │   ├── Created Date
   │   ├── Deadline
   │   └── Actions (View, Edit if Draft, Mark Complete)
   │
   ├── Details Panel (right side)
   │   ├── Full task description
   │   ├── Credit breakdown
   │   ├── Submission deadline
   │   ├── Evidence requirements
   │   └── Button: "Submit Evidence" (if IN_PROGRESS)
   │
   └── Bulk Actions: "Mark Complete" for batch

MANAGER CONTEXT (/app/hod/management/):
───────────────────────────────────────

3. /app/hod/management/dashboard
   ├── Header: "Department: [Name] - Manager View"
   │
   ├── ROW 1: Department Metrics
   │   ├── Card: "Team Size" (member count)
   │   ├── Card: "Avg Credits" (department average)
   │   ├── Card: "Tasks Verified" (this month)
   │   └── Card: "Pending Approvals" (count in queue)
   │
   ├── ROW 2: Charts
   │   ├── Chart: Team Progress Heatmap (each member vs target)
   │   ├── Chart: Task completion rate (this month)
   │   └── Chart: Approval queue depth (tasks pending HOD action)
   │
   ├── ROW 3: Recent Activity
   │   ├── Last verified tasks
   │   ├── Loan requests (if any)
   │   └── Salary approvals pending
   │
   └── Sidebar:
       ├── Dashboard
       ├── Approvals
       ├── Task Pool
       ├── Team
       └── Invite Members

4. /app/hod/management/approvals
   ├── Tabs:
   │   ├── TASK VERIFICATIONS (pending HOD sign-off)
   │   │   ├── Table:
   │   │   │   ├── Task Name
   │   │   │   ├── Member Name
   │   │   │   ├── Status (VERIFICATION_PENDING, PEER_APPROVED)
   │   │   │   ├── Evidence (file link)
   │   │   │   ├── Submitted Date
   │   │   │   ├── Credits
   │   │   │   └── Actions (Approve, Reject, Request Info)
   │   │   │
   │   │   └── Batch Action: "Verify All" (for urgent batches)
   │   │
   │   └── SALARY APPROVALS (monthly, step 1)
   │       ├── Table:
   │       │   ├── Member Name
   │       │   ├── Credits Earned
   │       │   ├── Amount (tokens)
   │       │   ├── Requested Date
   │       │   ├── Tasks Verified
   │       │   └── Actions (Approve to step 2, Hold, Reject)
   │       │
   │       └── Note: "This is step 1. Director approves step 2."
   │
   ├── Filter: Date, Status, Member
   └── Export: CSV

5. /app/hod/management/task-pool
   ├── Header: "Post New Task to Marketplace"
   │
   ├── Section 1: Browse Existing Tasks
   │   ├── Filters: Status, Category, Priority
   │   ├── Table:
   │   │   ├── Task Name
   │   │   ├── Type
   │   │   ├── Credits
   │   │   ├── Status (DRAFT, OPEN, ASSIGNED, IN_PROGRESS, etc.)
   │   │   ├── Created Date
   │   │   └── Actions (Edit, Delete if DRAFT, View Nominations)
   │   │
   │   └── Detail Panel (expandable per row)
   │
   ├── Section 2: Create New Task
   │   ├── Form:
   │   │   ├── Title
   │   │   ├── Description
   │   │   ├── Category (UNSTRUCTURED)
   │   │   ├── Task Type (dropdown)
   │   │   ├── Credit Value
   │   │   ├── Min Skills Required (multi-select)
   │   │   ├── Volunteers Needed (count)
   │   │   ├── Deadline
   │   │   ├── Requires Peer Review? (checkbox)
   │   │   ├── Priority (LOW/MEDIUM/HIGH/URGENT)
   │   │   ├── Custom Fields (JSON schema driven)
   │   │   └── Button: "Save as Draft" or "Publish to Marketplace"
   │   │
   │   └── Preview: What members will see
   │
   ├── Section 3: Batch Import Tasks (CSV)
   │   ├── Upload file
   │   ├── Map columns
   │   ├── Preview
   │   └── Import

6. /app/hod/management/team
   ├── Section 1: Roster
   │   ├── Table:
   │   │   ├── Avatar
   │   │   ├── Name
   │   │   ├── Email
   │   │   ├── Designation
   │   │   ├── Skills
   │   │   ├── This Month Credits (%)
   │   │   ├── Status (Active/Suspended)
   │   │   ├── Join Date
   │   │   └── Actions (View Profile, Edit, Suspend)
   │   │
   │   ├── Filters: Designation, Skills, Status
   │   └── Sorting: Name, Credits, Join Date
   │
   ├── Section 2: Team Analytics
   │   ├── Chart: Average progress by designation
   │   ├── Chart: Loan status distribution
   │   ├── Chart: Skills utilization
   │   └── Chart: Task completion trends
   │
   ├── Section 3: Invite New Members
   │   ├── Email input
   │   ├── Designation (dropdown)
   │   ├── Skills (multi-select)
   │   ├── Capacity (hours/week)
   │   ├── Message
   │   └── Send Invite
   │
   └── Bulk Invite (CSV)
```

### 5.4 Member/Faculty Pages (5 pages)

```
1. /app/member/dashboard (home)
   ├── Header: "My Work Dashboard"
   │
   ├── ROW 1: Progress Overview
   │   ├── Progress Gauge (center)
   │   │   ├── Credits target (e.g., 850)
   │   │   ├── Credits earned
   │   │   ├── Percentage
   │   │   └── Status (On track / At risk / Exceeded)
   │   │
   │   └── Cards (left/right):
   │       ├── Card 1: Wallet Balance (tokens)
   │       ├── Card 2: Tasks This Month (count)
   │       └── Card 3: Loan Status (if applicable)
   │
   ├── ROW 2: Quick Actions
   │   ├── Button: "Browse Marketplace" (unstructured tasks)
   │   ├── Button: "My Tasks" (detailed list)
   │   ├── Button: "Mark Attendance" (if structured work)
   │   └── Button: "Submit Evidence" (if task in progress)
   │
   ├── ROW 3: This Week's Schedule
   │   ├── Calendar view (Mon-Fri)
   │   ├── Structured tasks (auto-generated from calendar)
   │   │   ├── Class time
   │   │   ├── Location/Virtual
   │   │   ├── Credits
   │   │   └── Mark Attended (button)
   │   │
   │   └── Upcoming unstructured deadlines
   │
   ├── ROW 4: Notifications/Alerts
   │   ├── Red alert: "You're at risk of not hitting monthly target"
   │   ├── Green notification: "You've exceeded this month's target!"
   │   ├── Yellow alert: "Loan request approved - you have debt"
   │   ├── Info: "Next month's tasks will be available soon"
   │   └── "View all notifications" link
   │
   └── Sidebar:
       ├── Dashboard
       ├── My Tasks
       ├── Marketplace
       ├── My Wallet
       ├── My Attendance
       └── Profile

2. /app/member/tasks
   ├── Tabs:
   │   ├── MY TASKS (assigned or nominated)
   │   │   ├── Filters: Category, Status, Priority, Deadline
   │   │   ├── Table:
   │   │   │   ├── Task Name
   │   │   │   ├── Category (STRUCTURED/UNSTRUCTURED)
   │   │   │   ├── Status
   │   │   │   ├── Credits
   │   │   │   ├── Created Date
   │   │   │   ├── Deadline
   │   │   │   └── Actions
   │   │   │       ├── View Details
   │   │   │       ├── Start Work (if ASSIGNED)
   │   │   │       ├── Submit Evidence (if IN_PROGRESS)
   │   │   │       └── View Feedback (if REJECTED)
   │   │   │
   │   │   └── Detail Panel (expandable)
   │   │       ├── Full description
   │   │       ├── HOD contact
   │   │       ├── Submission guidelines
   │   │       ├── File attachments
   │   │       └── Comment thread (HOD feedback)
   │   │
   │   ├── AVAILABLE TASKS (in department, not yet claimed)
   │   │   ├── Browsable tasks (STRUCTURED + UNSTRUCTURED)
   │   │   ├── Filters: Category, Skills Required, Credits, Deadline
   │   │   ├── Table:
   │   │   │   ├── Task Name
   │   │   │   ├── Category
   │   │   │   ├── Posted By (HOD)
   │   │   │   ├── Credits
   │   │   │   ├── Skills Needed
   │   │   │   ├── Volunteers Needed
   │   │   │   ├── Deadline
   │   │   │   └── Actions (View, Claim/Nominate)
   │   │   │
   │   │   └── Detail Panel
   │   │       ├── Full task description
   │   │       ├── Evaluation criteria
   │   │       ├── Button: "Nominate Myself"
   │   │           └── Message: (optional)
   │   │
   │   └── COMPLETED TASKS (archive)
   │       ├── Table (read-only)
   │       ├── Credits awarded
   │       ├── Completion date
   │       └── Feedback from HOD
   │
   └── Filter: Category, Status, Priority, Deadline

3. /app/member/marketplace
   ├── Header: "Unstructured Task Marketplace"
   ├── Hero: "Earn Extra Credits By Taking On Dynamic Tasks"
   │
   ├── Filters (left sidebar):
   │   ├── Category
   │   ├── Credits Range
   │   ├── Skills Required
   │   ├── Deadline (coming soon / this week / this month)
   │   ├── Posted By (department filter)
   │   └── Relevance (recommended for me)
   │
   ├── Results Grid (center)
   │   ├── Each card shows:
   │   │   ├── Task Title
   │   │   ├── Posted By (HOD name/dept)
   │   │   ├── Credits Value (prominent)
   │   │   ├── Short Description
   │   │   ├── Skills Needed (tags)
   │   │   ├── Volunteers Needed / Nominations So Far
   │   │   ├── Deadline (countdown)
   │   │   ├── Match % (if recommended for user's skills)
   │   │   └── Button: "View & Nominate"
   │   │
   │   └── Click card → expand detail panel (right side)
   │
   ├── Detail Panel (right side):
   │   ├── Full description
   │   ├── Evaluation criteria
   │   ├── Submission guidelines
   │   ├── File attachments
   │   ├── Posted by (HOD contact)
   │   ├── Current nominations (count)
   │   ├── Can I nominate? (yes/no with reason if blocked)
   │   ├── Confidence % (if I have skills)
   │   └── Button: "Nominate Myself" with message input
   │
   ├── Sorting: Relevance, Newest, Deadline, Credits (highest)
   └── Pagination

4. /app/member/wallet
   ├── Section 1: Current Balance
   │   ├── Big number: Current token balance
   │   ├── Subtitle: "WORK Tokens"
   │   ├── Status badge: "Confirmed" or "Pending" (if salary in review)
   │   └── Last updated (timestamp)
   │
   ├── Section 2: This Month's Progress
   │   ├── Target amount (e.g., 850 credits)
   │   ├── Earned so far (e.g., 720 credits)
   │   ├── Progress bar
   │   ├── Days remaining
   │   └── Projected outcome (on track / at risk / exceeded)
   │
   ├── Section 3: Transaction History
   │   ├── Table:
   │   │   ├── Date
   │   │   ├── Type (TASK_REWARD, SALARY_TRANSFER, LOAN_ISSUE, LOAN_REPAY)
   │   │   ├── Description
   │   │   ├── Amount (+ or -)
   │   │   ├── Status (PENDING, CONFIRMED, FAILED)
   │   │   └── Blockchain Link (if applicable)
   │   │
   │   ├── Filters: Type, Date Range, Status
   │   └── Export: CSV
   │
   ├── Section 4: Salary Cycle Status
   │   ├── If target MET (≥ 85%):
   │   │   ├── Green badge: "Ready for Salary"
   │   │   ├── Message: "You've earned your full salary this month!"
   │   │   └── Button: "Initiate My Salary" (enabled)
   │   │       └── Triggers approval workflow
   │   │
   │   ├── If target NOT MET (< 85%):
   │   │   ├── Red badge: "Short of Target"
   │   │   ├── Shortfall amount
   │   │   ├── Message: "You can request a loan to cover the gap"
   │   │   ├── Button: "Raise Loan Request" (enabled)
   │   │   └── "See marketplace" (find more tasks)
   │   │
   │   └── If LOAN ACTIVE:
   │       ├── Orange badge: "Loan Active"
   │       ├── Loan amount
   │       ├── Remaining to repay
   │       ├── Message: "Complete debt-clearance tasks to repay"
   │       └── Debt-clearance tasks link
   │
   └── Section 5: Blockchain Verification
       ├── Show wallet address (if public)
       ├── Show transaction hashes
       └── "Verify on blockchain" link

5. /app/member/attendance
   ├── Header: "My Structured Work Attendance"
   │
   ├── Calendar View (month)
   │   ├── Each scheduled class/task shows:
   │   │   ├── Date
   │   │   ├── Time
   │   │   ├── Course/Task name
   │   │   ├── Duration
   │   │   ├── Status (SCHEDULED, ATTENDED, ABSENT, CANCELLED)
   │   │   └── Button: "Mark Attended"
   │   │
   │   └── Color coding: Blue (scheduled), Green (attended), Red (absent)
   │
   ├── Table View (list format)
   │   ├── Date
   │   ├── Course/Task
   │   ├── Time
   │   ├── Attendance (Yes/No/Absent)
   │   ├── Topic Taught (optional, member-supplied)
   │   ├── Notes (optional)
   │   └── Actions (Edit if pending, View if closed)
   │
   ├── Attendance Log
   │   ├── Table:
   │   │   ├── Date
   │   │   ├── Task Name
   │   │   ├── Time
   │   │   ├── Marked By (HOD audit or self-reported)
   │   │   ├── Attendance Status
   │   │   ├── Credits Awarded
   │   │   └── Evidence (proof/topic taught)
   │   │
   │   ├── Filters: Month, Course, Status
   │   └── Export: PDF (transcript-like)
   │
   └── Submission Guidelines
       ├── How to mark attendance
       ├── What counts as proof
       ├── Deadline for submissions
       └── HOD audit schedule
```

### 5.5 Finance Admin Pages (2 pages)

```
1. /app/finance/ledger (main dashboard)
   ├── Header: "Ledger & Month-End Reversal"
   │
   ├── ROW 1: Key Metrics
   │   ├── Card: "Tokens Ready for Reversal"
   │   │   ├── Total amount
   │   ├── Card: "Director-Salary Wallet Balance"
   │   │   ├── Current balance
   │   ├── Card: "Director-Loan Wallet Balance"
   │   │   ├── Current balance
   │   └── Card: "Pending Release Count"
   │       ├── Number of approved salaries awaiting batch
   │
   ├── ROW 2: Faculty Readiness Table
   │   ├── Table:
   │   │   ├── Department
   │   │   ├── Faculty Name
   │   │   ├── Status (SALARY_READY, PENDING_APPROVAL, NOT_ELIGIBLE)
   │   │   ├── Token Balance (if ready)
   │   │   ├── Director-Salary approval? (Yes/No)
   │   │   ├── HOD approval? (Yes/No)
   │   │   └── Ready for Reversal? (Yes/No)
   │   │
   │   ├── Filters: Department, Status, Readiness
   │   └── Sorting: Name, Department, Amount
   │
   ├── ROW 3: Batch Reversal Action
   │   ├── Message: "When ready, trigger batch reverse to unlock real payroll"
   │   ├── Button: "Trigger Batch Reverse Transfer"
   │   │   └── Confirmation dialog
   │   │       ├── "Reverse [X] faculty wallets?"
   │   │       ├── "Total amount to be transferred back: [amount]"
   │   │       └── "Confirm" button
   │   │
   │   └── Results (after execution):
   │       ├── Status: RUNNING, COMPLETED, FAILED
   │       ├── Count: Reversed [X] / [Y] total
   │       ├── Timestamp: Execution time
   │       └── "All faculty wallets zeroed, Director-Salary restored"
   │
   ├── ROW 4: Audit Feed (recent transactions)
   │   ├── Table:
   │   │   ├── Timestamp
   │   │   ├── Type (SALARY_TRANSFER, LOAN_ISSUE, REVERSE_TRANSFER)
   │   │   ├── From Wallet
   │   │   ├── To Wallet
   │   │   ├── Amount
   │   │   ├── Actor (who authorized)
   │   │   ├── Status (CONFIRMED, FAILED)
   │   │   └── Block Hash (if blockchain verified)
   │   │
   │   ├── Filters: Date, Type, Status
   │   └── Export: CSV, JSON
   │
   └── Sidebar:
       ├── Dashboard
       ├── Approvals (Finance step only)
       ├── Audit Trail
       └── Export Reports

2. /app/finance/approvals
   ├── Header: "Finance Approvals - Final Step"
   │
   ├── Message: "These are salary releases awaiting your final sign-off before batch reversal"
   │
   ├── Table:
   │   ├── Faculty Name
   │   ├── Department
   │   ├── Amount (tokens)
   │   ├── HOD Approval? (Yes)
   │   ├── Director Approval? (Yes)
   │   ├── Submitted Date
   │   ├── Status (PENDING_FINANCE)
   │   └── Actions
   │       ├── Button: "Approve" (marks as ready for batch reversal)
   │       ├── Button: "Hold" (requires manual review)
   │       └── Button: "Reject" (denies salary this cycle)
   │
   ├── Filters: Department, Status, Date
   ├── Batch Action: "Approve All Pending" (bulk confirm)
   └── Export: CSV

3. /app/finance/audit-logs
   ├── Complete audit trail
   ├── All token transactions (immutable log)
   ├── Filters: Date, Type, Actor, Entity
   ├── Search: Full-text search on notes/descriptions
   └── Export: CSV, JSON
```

---

## PART 6: KEY FEATURES BREAKDOWN BY ACTOR

### Director Feature Set (20+ features)

```
ORGANIZATION MANAGEMENT:
├── Create/edit organization details
├── Add/remove departments (recursive tree)
├── Assign HODs to departments
├── Define designation hierarchy
├── Configure skill taxonomy
└── View entire org structure

BUDGET & COMPENSATION:
├── Set annual budget cap
├── Set monthly salary allocation
├── Mint tokens to Salary Wallet
├── Configure loan reserve
├── Define compensation policies (scope-aware)
├── Set credit targets per department/role
├── Set grace period for buffer eligibility
├── View token circulation (real-time)
└── Simulate budget scenarios ("what-if")

APPROVALS & WORKFLOWS:
├── Review and approve salary requests (step 2)
├── Review and approve loan requests
├── Escalate problematic cases (repeated defaults)
├── Configure approval chain definitions
├── Batch approve salaries (end of month)
└── View approval history

USER MANAGEMENT:
├── Invite HODs, Members, Finance Admins
├── Resend invitations
├── Suspend/activate users
├── Reset user passwords
├── View all users in org
├── Export user list
└── Manage user roles

TASK & WORK MANAGEMENT:
├── Create task type definitions
├── Set credit values per task type
├── Define rate cards (tokens per unit)
├── Configure task verification modes
├── View all tasks in org
├── Set peer review requirements per task type
└── Monitor task completion status

ANALYTICS & REPORTING:
├── View department progress heatmap
├── View token circulation donut chart
├── Track average credits by department
├── Monitor loan issuance trends
├── View task completion rates
├── Export analytics as PDF/CSV/PNG
├── Track performance over time
└── Identify at-risk faculty

AUDIT & COMPLIANCE:
├── View complete audit logs
├── Filter logs by date, actor, action
├── Export audit logs
├── Blockchain verification (ERC20)
├── View transaction hashes
└── Generate compliance reports

SETTINGS & CONFIGURATION:
├── Edit organization name/logo
├── Manage notification rules
├── Configure email templates
├── Set system parameters
├── Manage integrations
└── Configure feature flags
```

### HOD Feature Set (15+ features)

**As Manager:**
```
DEPARTMENT MANAGEMENT:
├── View team roster
├── Invite team members
├── View team progress metrics
├── Analyze team performance
├── Track department heatmap
└── Monitor approval queue

TASK MANAGEMENT:
├── Create unstructured tasks
├── Post tasks to marketplace
├── Edit task details
├── Set credit values
├── Define skill requirements
├── Set peer review requirement
├── Batch import tasks (CSV)
├── Delete tasks (if draft)
└── View task nominations/claims

WORK VERIFICATION:
├── Review task evidence submissions
├── Approve task completions (sign-off)
├── Request additional evidence
├── Reject incomplete work
├── Batch verify multiple tasks
├── Add comments/feedback
├── View verification history
└── Audit weekly/monthly schedules

SALARY APPROVALS:
├── Review salary requests (HOD step 1)
├── Verify faculty attendance
├── Check leaves/adjustments
├── Approve salary advance (to step 2)
├── Hold salary (requires Director review)
├── Reject salary requests
├── View approval history
└── Batch approve salaries (end of month)

ANALYTICS:
├── View department progress
├── Track team averages
├── Monitor loan status
├── View task completion rate
├── Track peer review effectiveness
└── Export department reports

**As Employee:**
```
PERSONAL WORK:
├── View own schedule
├── Track own progress gauge
├── Browse marketplace (claim unstructured tasks)
├── Submit task evidence
├── Mark attendance (structured)
└── Request salary/loan (month-end)

PERSONAL WALLET:
├── View own token balance
├── View transaction history
├── Initiate salary request
├── Raise loan request
├── Track credits earned
└── View blockchain verification
```

### Member Feature Set (12+ features)

```
WORK TRACKING:
├── View weekly schedule (structured tasks)
├── Track progress gauge (real-time credits)
├── Browse marketplace (unstructured tasks)
├── Nominate self for unstructured tasks
├── View assigned tasks
├── Track task status
└── Submit evidence/proofs

ATTENDANCE:
├── Mark attendance for structured tasks
├── Record topic taught (structured)
├── View attendance history
├── Export attendance transcript
└── Submit proof (screenshots, etc.)

WALLET MANAGEMENT:
├── View wallet balance
├── View transaction history
├── View monthly progress
├── View blockchain verification
├── Export wallet statement
└── See tax/audit records

SALARY & LOAN:
├── Request salary (if target met)
├── Request loan (if target not met, buffer eligible)
├── View loan status
├── Track loan repayment progress
├── Complete debt-clearance tasks
├── View benefits of on-time payment
└── Track year-end bonus eligibility

NOTIFICATIONS:
├── Receive alerts on progress
├── Get notified of approved tasks
├── Get notified of salary readiness
├── Get notified of loan status
├── Receive escalation warnings
└── Opt-in/out of notifications

PROFILE:
├── Update personal info (name, avatar)
├── Update skills
├── Update capacity (hours/week)
├── View profile (public view)
├── View performance score
└── View leaderboard rank (opt-in)
```

### Finance Admin Feature Set (8+ features)

```
LEDGER MANAGEMENT:
├── View all wallets (all purposes)
├── View token transactions (all types)
├── Filter/search transactions
├── Export transaction history
├── View balance reconciliation
└── Verify blockchain hashes

BATCH OPERATIONS:
├── Trigger batch reverse transfer
├── Monitor batch process status
├── View reverse transaction log
├── Confirm Director-Salary Wallet restored
├── Unlock real payroll (manual trigger)
└── Handle batch failures/retries

APPROVALS:
├── View salary releases (Finance step only)
├── Approve salary batches
├── Hold salaries for review
├── Reject inappropriate entries
└── View approval history

AUDIT:
├── View complete ledger audit log
├── Filter audit logs (date, type, actor)
├── Export audit trail
├── Generate compliance reports
├── Verify blockchain records
└── Export for tax/finance teams

NOTIFICATIONS:
├── Alert when salaries ready for batch
├── Alert on transaction failures
├── Alert on reconciliation mismatches
└── Alert on policy violations
```

---

## PART 7: ADVANCED FEATURES & INTEGRATIONS

### 7.1 Future Integration Points

```
CALENDAR INTEGRATIONS:
├── Google Calendar (automatic class scheduling)
├── Outlook Calendar
├── Sync attendance from calendar events
├── Auto-generate structured tasks from calendar
└── Conflict detection (double-booking)

COMMUNICATION INTEGRATIONS:
├── Slack notifications (approvals, alerts)
├── Microsoft Teams notifications
├── Email notifications (smart batching)
├── SMS alerts (critical events)
└── In-app notifications (push)

HR INTEGRATIONS:
├── Sync employee master from HRIS
├── Pull designation/salary bands
├── Integrate with payroll system (Zoho, ADP, etc.)
├── Employee performance reviews
├── Promotion/increment eligibility
└── Offboarding workflow

DOCUMENT INTEGRATIONS:
├── Google Drive (evidence submissions)
├── OneDrive (evidence submissions)
├── Cloud storage (proofs, receipts)
├── PDF generation (compliance reports)
└── Export to Excel/CSV

PAYMENT INTEGRATIONS:
├── Bank payroll integration (real transfer)
├── Crypto exchange (if blockchain payment)
├── SWIFT transfers (international)
├── Automated reconciliation
└── Tax withholding calculation

ANALYTICS INTEGRATIONS:
├── Google Analytics (platform usage)
├── Data warehouse (BigQuery, Snowflake)
├── BI tools (Looker, Tableau, Power BI)
├── Custom dashboards
└── Predictive analytics (churn risk, etc.)

BLOCKCHAIN INTEGRATIONS:
├── ERC20 token operations
├── Smart contract interactions
├── Wallet verification
├── Transaction verification
├── Gas optimization
└── Multi-sig approval (for large transfers)
```

### 7.2 Advanced Features

```
LEADERBOARD SYSTEM:
├── Top performers (by credits earned)
├── Department rankings
├── Monthly winners
├── Year-end recognition
├── Tokenized rewards (bonus tokens)
└── Badges/achievements

SKILL-BASED MATCHING:
├── Recommend tasks based on member skills
├── Suggest peer review assignments
├── Identify skill gaps
├── Track skill development
├── Certification tracking
└── Skills marketplace

PERFORMANCE INSIGHTS:
├── Predictive analytics (will they hit target?)
├── Risk scoring (churn, default risk)
├── Peer comparison (benchmarking)
├── Trend analysis (month-over-month)
├── Anomaly detection (fraud, gaming)
└── Custom dashboards per role

CUSTOMIZATION:
├── Custom fields (per task type)
├── Custom workflows (approval chains)
├── Custom roles (beyond defaults)
├── Custom metrics (org-specific KPIs)
├── Branding (white-label theme)
└── Multi-language support

COMPLIANCE & SECURITY:
├── Role-based access control (RBAC)
├── Row-level security (RLS)
├── Encryption at rest and in transit
├── Audit logging (immutable)
├── Compliance exports (GDPR, SOX, etc.)
├── 2FA/MFA support
├── IP whitelisting
├── DLP (data loss prevention)
└── Breach detection
```

---

## PART 8: DATABASE TENANT ISOLATION STRATEGY

### 8.1 Multi-Tenant Data Architecture

```
Every query MUST follow this pattern:

SELECT * FROM table_name
WHERE organization_id = $1
AND (scope-specific filters)
AND (role-based filters)

Example:
SELECT * FROM tasks
WHERE organization_id = get_jwt_session_org_id()
AND org_unit_id = ANY(get_user_org_units())
AND (status != 'DRAFT' OR creator_id = current_user_id())

RLS Policies enforce this at database level:
1. Platform-level policies (none for org data)
2. Org-level isolation (organization_id check)
3. Scope-level isolation (org_unit_id, department check)
4. Role-level isolation (permission checks)
5. User-level isolation (self-scoped data)

Zero cross-tenant visibility. Ever.
```

### 8.2 Database Schema Organization

```
CORE ENTITIES (tenant-shared across all orgs):
├── organizations (org_id PRIMARY)
├── org_units (org_id, id hierarchy with ltree)
├── users (org_id, org_unit_id foreign key)
├── roles (org_id, system roles)
├── user_roles (bridge table)
└── permissions (bridge table)

WORK MANAGEMENT (org_id scoped):
├── tasks (org_id, org_unit_id)
├── nominations (task_id foreign key)
├── task_proofs (task_id foreign key)
├── task_peer_reviews (task_id foreign key)
├── task_type_definitions (org_id scoped)
└── rate_cards (org_id scoped)

FINANCIAL (org_id scoped):
├── wallets (org_id, owner_user_id)
├── token_transactions (org_id scoped, partitioned by month)
├── loans (org_id scoped)
├── approval_instances (org_id implicit via subject_id)
├── approval_actions (org_id implicit)
├── approval_chain_definitions (org_id scoped)
└── compensation_policies (org_id scoped)

OPERATIONS (org_id scoped):
├── system_jobs (org_id scoped, tracks month-end runs)
├── cycle_calendars (org_id scoped)
├── notifications (user_id implicit, filtered by org)
├── audit_logs (org_id scoped, partitioned by quarter)
└── invitations (org_id scoped, temporary)

PLATFORM-ONLY (no org_id):
├── platform_admins (auth_user_id unique)
├── organizations (top-level)
├── organization_templates (shared defaults)
└── (no user data visible across orgs)
```

---

## PART 9: TOKEN ECONOMICS & ERC20 IMPLEMENTATION

### 9.1 Token Model

```
Token: WORK (ERC20)
├── Supply: Mintable by Director (per org)
├── Decimals: 18 (standard ERC20)
├── Burn: Yes (cancelled tasks, penalties)
├── Pause: Yes (in emergency)
└── Upgradeable: Yes (proxy pattern)

Wallet Purposes:
├── SALARY_POOL (Director owns, mints monthly)
├── LOAN_POOL (Director owns, reserve)
└── PERSONAL (Each faculty member owns)

Token Flow:
1. Director mints monthly amount to SALARY_POOL
   Example: 500 faculty × 100 tokens avg = 50,000 tokens minted
2. Faculty earn credits → on month-end, approved salary recipients get tokens
3. Faculty Wallet balance = earned credits converted to tokens
4. Finance triggers batch reverse → all Faculty wallets → Director-Salary
5. Director-Salary balance restored to original mint amount
6. Real payroll released by Finance (outside blockchain)

Token Value:
├── 1 token = X USD (set by Director, fixed per cycle)
├── Credits to tokens: credits_earned × (salary_amount / monthly_target)
├── Example: 850 credits target, $10K salary
   └── 1 credit = $11.76 / 850 credits = $0.01384 USD/credit
```

### 9.2 Smart Contract Architecture (Custody Pattern)

```
Smart Contract Structure (2-contract system):

1. WORK Token (ERC20)
   ├── Standard ERC20 implementation
   ├── Mintable (only by authorized minters)
   ├── Burnable
   ├── Pausable (emergency only)
   ├── Snapshot (for dividend/reward audits)
   └── Access control (Director role)

2. WorkLedger Token Manager (Custom)
   ├── Custodial wallet management
   ├── Rate card enforcement (tokens per task)
   ├── Multi-sig approval (for large transfers)
   ├── Transaction validation
   ├── Batch operations
   │   ├── Batch mint (to salary pool)
   │   ├── Batch transfer (salary distribution)
   │   └── Batch reverse (reversal)
   ├── Audit trail (immutable log)
   └── Emergency pause

Key Management:
├── Director Admin Wallet (owns token, mints, manages)
│   └── Private key stored in AWS KMS (hardware encryption)
├── Salary Pool Wallet (custodial, holds monthly mint)
│   └── Private key in AWS KMS
├── Loan Pool Wallet (custodial, holds reserve)
│   └── Private key in AWS KMS
└── Faculty Wallets (non-custodial addresses, owned by faculty)
    └── (Not stored in system, member provides address)

Transaction Signing Flow:
1. User action triggers transaction on backend
2. Backend retrieves encrypted private key from DB
3. Backend calls AWS KMS to decrypt (using Master Key)
4. Signer reconstructs in-memory (never logged, never persisted)
5. Transaction signed and broadcast to blockchain
6. Signer destroyed from memory
7. Encrypted key remains locked in DB
```

---

## PART 10: ONBOARDING & DEPLOYMENT ROADMAP

### 10.1 Phased Implementation

```
PHASE 1: CORE PLATFORM FOUNDATION (Weeks 1-2)
────────────────────────────────────────────
✓ Multi-tenant architecture (database + auth)
✓ Platform Admin layer (organization provisioning)
✓ Director onboarding wizard
✓ Basic org structure management
✓ Real Supabase integration (no mocks)
✓ Protected route groups (/(director), /(hod), /(member), /(finance))
✓ Component library (shadcn/ui setup)
✓ TypeScript types (all entities)

DELIVERABLE: Platform admin can create org, invite Director

PHASE 2: WORK MANAGEMENT (Weeks 3-4)
──────────────────────────────────────
✓ Task creation (structured + unstructured)
✓ Task marketplace (browsing, nomination)
✓ Task verification workflow
✓ Proof submission & evidence handling
✓ HOD management dashboard
✓ Member task pages (my tasks, marketplace)
✓ Attendance marking (structured tasks)
✓ Task status transitions (all states)

DELIVERABLE: HOD can post tasks, members can nominate, HOD can verify

PHASE 3: COMPENSATION & APPROVALS (Weeks 5-6)
──────────────────────────────────────────────
✓ ERC20 token integration (mock contracts first, then real)
✓ Director wallet setup (Salary + Loan pools)
✓ Compensation policies (dynamic per scope)
✓ Monthly target tracking (credits earned per member)
✓ Salary request workflow (initiate, HOD verify, Director approve)
✓ Loan request workflow (raise, Director approve, debt tracking)
✓ Month-end credit check (system job)
✓ Batch reversal (Finance admin trigger)

DELIVERABLE: End-to-end salary cycle works (target met case)

PHASE 4: ADVANCED FEATURES (Weeks 7-8)
───────────────────────────────────────
✓ Leaderboards & recognition
✓ Analytics dashboards (heatmaps, charts)
✓ Audit logging (immutable)
✓ Notifications system (email + in-app)
✓ Blockchain verification (transaction hashes)
✓ Peer review workflow
✓ Debt-clearance task mechanism
✓ Marketplace lock (repeated defaults)

DELIVERABLE: Full happy path end-to-end working

PHASE 5: INTEGRATIONS (Week 9+)
────────────────────────────────
○ Calendar integration (Google, Outlook)
○ Slack/Teams notifications
○ Real payroll system connection
○ HRIS sync
○ Document storage (Google Drive, OneDrive)
○ BI/Analytics export
○ Mobile app (React Native)
```

### 10.2 Environment Setup Checklist

```
PREREQUISITES:
├── Supabase project created (postgres, auth, realtime)
├── Blockchain network chosen (Ethereum mainnet, testnet, or layer 2)
├── AWS KMS for key management configured
├── ERC20 contract deployed to blockchain
├── Environment variables set (.env.local)
├── shadcn/ui initialized in Next.js
├── Tailwind CSS configured
├── TypeScript configured
├── PostCSS configured
└── Git repository initialized

SUPABASE SETUP:
├── Database schema applied (all tables, enums, functions)
├── RLS policies enabled and tested
├── Auth providers configured (email/password minimum)
├── JWT configuration set up
├── Realtime channels enabled (optional, for notifications)
├── Storage buckets created (for task proofs)
├── Edge functions deployed (month-end job triggers)
└── Backups configured

BLOCKCHAIN SETUP:
├── Network RPC endpoint configured
├── Contract deployed (WORK token + manager)
├── Admin wallet funded (for gas, relayers)
├── Multisig wallet set up (if required)
├── Ethers.js or Web3.js configured
├── Contract ABI in codebase
└── Chain ID verified

NEXT.JS SETUP:
├── App Router configured
├── Route groups created (/(auth), /(app), /(admin))
├── Middleware configured (auth guard, scope middleware)
├── Environment variables loaded
├── API routes structure (api/auth/*, api/tasks/*, etc.)
├── Error handling global
├── Logging configured
└── Performance monitoring set up
```

---

## SUMMARY: What Gets Built

This document defines a **complete, enterprise-grade multi-tenant SaaS** with:

1. **Platform Layer** (Admins setup organizations)
2. **Organization Layer** (Director, HOD, Members work within an org)
3. **Multi-tenant Isolation** (No cross-org data leakage)
4. **ERC20 Token System** (Work → Credits → Tokens → Salary)
5. **Complex Approval Workflows** (3-4 step salary release, HOD → Director → Finance)
6. **Advanced Features** (Leaderboards, heatmaps, loan mechanism, marketplace lock)
7. **Complete Audit Trail** (Immutable ledger, blockchain verification)

**Next step**: Implement Phase 1 (Core Platform) using this architecture as the blueprint.
