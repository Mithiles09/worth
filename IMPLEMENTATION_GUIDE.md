# Work Worth - Implementation Guide

## Part 1: Scaffolding & UI Architecture - COMPLETED

### What Has Been Built

#### 1. **Type System** (`lib/types.ts`)
Complete TypeScript interfaces for all domain entities:
- Organizations, users, roles, wallets, tokens
- Tasks, nominations, approvals, loans
- Compensation policies, rate cards
- Notifications and audit logs

#### 2. **Authentication & State Management**
- **Auth Store** (`lib/auth-store.ts`): Zustand-based state management
- **Auth Context** (`lib/auth-context.tsx`): React context with login/logout
- **Mock Login Page** (`app/(auth)/login/page.tsx`): Demo accounts for all roles
  - Director, HOD, Faculty, Finance Admin
  - Quick role switching for testing

#### 3. **Layout Components**
- **Sidebar** (`components/layout/sidebar.tsx`): Role-aware navigation
  - Dynamic sidebar items per role
  - Notification badges, logout button
  - Context-aware icons and links
  
- **Header** (`components/layout/header.tsx`): Top navigation
  - User profile dropdown
  - Notifications popover
  - Context toggle for dual-role users (HOD)
  
- **AppLayout** (`components/layout/app-layout.tsx`): Master wrapper
  - Combines sidebar + header
  - Manages auth redirects

#### 4. **Shared Components**
- **ProgressGauge** (`components/shared/progress-gauge.tsx`): Circular progress display
  - Used for monthly credits tracking
  - Color-coded by status (success/warning/error)
  
- **StatCard** (`components/shared/stat-card.tsx`): KPI display
  - Flexible variants (default, primary, success, warning, error)
  - Optional trend indicators
  - Icon support

#### 5. **Role-Based Pages (All Built)**

##### Member (Faculty) Pages
- `app/(app)/member/dashboard`: Weekly schedule, progress gauge, token balance
- `app/(app)/member/marketplace`: Browse unstructured tasks, self-nominate
- `app/(app)/member/credits`: Month-end decision (salary vs loan request), loan history, debt clearance tasks

##### HOD (Manager) Pages
- `app/(app)/hod/dashboard`: Team stats, dual-context toggle, pending approvals, open tasks, team member roster

##### Director Pages
- `app/(app)/director/dashboard`: Institution financials, token flow chart, department heatmap, pending approvals

##### Finance Admin Pages
- `app/(app)/finance/ledger`: Wallet states, faculty readiness, batch reversal controls, audit log

---

## Part 2: Backend Integration & Real Data (NEXT STEPS)

### Ready to Implement

#### A. **Supabase Schema Setup**
1. Deploy the canonical SQL schema (already provided in `user_read_only_context`)
2. Tables to create:
   - Core: `organizations`, `org_units`, `users`, `roles`, `permissions`
   - Wallets: `wallets`, `token_transactions`, `loans`
   - Work: `task_type_definitions`, `tasks`, `nominations`, `task_proofs`
   - Approvals: `approval_instances`, `approval_actions`
   - Config: `compensation_policies`, `rate_cards`, `cycle_calendars`
   - Audit: `audit_logs`, `notifications`

#### B. **API Routes (Server Actions)**
Create these Next.js Server Actions in `app/api/`:

**Authentication & Session:**
- `POST /api/auth/login` - Validate credentials, issue JWT
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/session` - Restore session

**Wallet & Token Operations:**
- `POST /api/wallets/get-balance` - Fetch wallet balance
- `POST /api/tokens/salary-transfer` - Director approves salary release
- `POST /api/tokens/loan-issue` - Director issues loan
- `POST /api/tokens/batch-reverse` - Month-end reversal

**Work & Tasks:**
- `GET /api/tasks/list` - List open/assigned tasks
- `POST /api/tasks/nominate` - Self-nominate for unstructured task
- `POST /api/tasks/submit-proof` - Upload task completion proof
- `POST /api/tasks/mark-attendance` - Faculty marks class attendance

**Approvals:**
- `GET /api/approvals/pending` - List pending approvals for user
- `POST /api/approvals/decide` - Approve/reject with signature

**Loans:**
- `GET /api/loans/history` - User loan history
- `POST /api/loans/request` - Raise new loan request
- `POST /api/loans/repay-progress` - Record debt clearance

#### C. **RLS (Row-Level Security) Policies**
Implement in Supabase for multi-tenancy:
- All tables scoped by `organization_id`
- Users see only their own `wallets`, `tasks`, `loans`
- HOD can see subordinates' data
- Director sees entire org
- Finance sees ledger but not personal details

#### D. **Key Feature Implementations**

**1. Monthly Credit Accrual**
- Track structured work via attendance marking
- Verify unstructured work via proof uploads
- Calculate progress % based on compensation policy

**2. Month-End State Machine**
Implement the flow shown in state diagram:
- `ACCRUING` → Faculty completes work
- `THRESHOLD_CHECK` → Automatic cron job triggers check
- `SALARY_ELIGIBLE` → If ≥85% → salary button enabled
- `LOAN_ELIGIBLE` → If <85% → loan button enabled
- `SALARY_REQUESTED` → Faculty clicks "Initiate"
- `LEAD_VERIFIED` → HOD verifies attendance
- `TOKENS_TRANSFERRED` → Director→Faculty wallet
- `BATCH_REVERSED` → Salary day: Faculty→Director (restores budget)
- `FIAT_RELEASED` → Finance triggers real bank payroll

**3. Task Marketplace**
- Show OPEN tasks scoped to user's org_unit
- Track nominations in real-time
- Update task status on acceptance/rejection
- Calculate credits contributed

**4. Approval Workflows**
- Generalized approval engine (already designed)
- Support multi-step approvals (HOD → Director → Finance)
- Record audit trail on every action

**5. Loan Repayment**
- Track `loans.remaining` balance
- Link tasks to `debt_clearance_for_loan_id`
- Decrement remaining on proof verification
- Auto-mark REPAID when remaining = 0

---

## File Structure (Current)

```
app/
├── (auth)/
│   ├── login/page.tsx          # Demo login
│   └── layout.tsx
├── (app)/
│   ├── director/
│   │   └── dashboard/page.tsx   # Director financial dashboard
│   ├── hod/
│   │   └── dashboard/page.tsx   # HOD team & approvals
│   ├── member/
│   │   ├── dashboard/page.tsx   # Faculty work tracking
│   │   ├── marketplace/page.tsx # Browse tasks
│   │   └── credits/page.tsx     # Month-end decision
│   ├── finance/
│   │   └── ledger/page.tsx      # Finance settlement
│   └── layout.tsx
├── page.tsx                     # Redirects to /login
└── layout.tsx                   # Root layout with AuthProvider
├── globals.css

components/
├── layout/
│   ├── sidebar.tsx              # Role-aware navigation
│   ├── header.tsx               # Top nav + profile
│   └── app-layout.tsx           # Master wrapper
├── shared/
│   ├── progress-gauge.tsx       # Circular progress
│   └── stat-card.tsx            # KPI cards
└── ui/                          # shadcn/ui components (pre-installed)

lib/
├── types.ts                     # All TypeScript interfaces
├── auth-store.ts                # Zustand store
├── auth-context.tsx             # React context
└── utils.ts                     # Helper functions
```

---

## How to Test the Current Build

1. **Start Dev Server**
   ```bash
   pnpm dev
   ```

2. **Access Application**
   - Visit `http://localhost:3000`
   - Redirects to `/login`
   - Select demo role (Director, HOD, Faculty, Finance Admin)
   - Login button is mocked
   - Explore role-specific dashboards

3. **Test Navigation**
   - Sidebar shows role-appropriate pages
   - Click any link to navigate
   - Layouts render correctly with mock data

---

## Next: Part 2 Checklist

- [ ] Deploy Supabase schema
- [ ] Set environment variables (SUPABASE_URL, SUPABASE_KEY)
- [ ] Implement auth API routes
- [ ] Create wallet/token RPC functions
- [ ] Add real data to task list pages
- [ ] Wire up approval workflows
- [ ] Implement month-end cron job
- [ ] Add loan repayment tracking
- [ ] Build institution structure editor (Director)
- [ ] Implement task proof uploads
- [ ] Add notifications system
- [ ] Create audit log viewer

---

## Key Architectural Decisions

1. **Route Groups by Scope**: `/(director)`, `/(member)`, `/(hod)`, `/(finance)` for clean separation
2. **Zustand for State**: Lightweight auth state, no Redux overhead
3. **shadcn/ui Components**: Accessible, customizable, consistent styling
4. **Mock Data Pattern**: All pages have sample data hardcoded for testing
5. **Type-First Approach**: Full TypeScript interfaces before backend
6. **RLS over JWT Claims**: Multi-tenant safety via database policies
7. **SECURITY_DEFINER Functions**: Atomic transactions for token transfers

---

## Access Credentials (Demo)

- **Director**: director@college.edu / password
- **HOD**: hod@college.edu / password
- **Faculty**: faculty@college.edu / password
- **Finance Admin**: finance@college.edu / password

All routes to same mock auth response; org/role determined by login form selection.
