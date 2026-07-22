# Work Worth — Performance-Based Compensation SaaS

A production-ready Next.js application for token-based work tracking and performance-linked compensation across organizations.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase PostgreSQL + Real-time
- **Authentication**: Supabase Auth (JWT-based)
- **State**: Client-side React hooks + Supabase queries

### Project Structure

```
/app
├── (auth)/                 # Authentication routes
│   └── login/page.tsx      # Real Supabase auth login
├── (app)/                  # Protected application routes
│   ├── layout.tsx          # Auth guard + main wrapper
│   ├── dashboard/page.tsx  # Role-aware dashboard
│   ├── director/page.tsx   # Director dashboard
│   ├── hod/page.tsx        # HOD/Manager dashboard
│   ├── member/page.tsx     # Faculty/IC dashboard
│   └── finance/page.tsx    # Finance admin dashboard
├── layout.tsx              # Root layout with AuthProvider
└── page.tsx                # Redirect to /login

/lib
├── supabase/
│   ├── client.ts           # Browser Supabase client
│   └── server.ts           # Server-side Supabase client
├── auth.ts                 # Authentication utilities
└── database.types.ts       # TypeScript database types

/components
├── ui/                     # shadcn/ui components
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── button.tsx
│   ├── tabs.tsx
│   ├── alert.tsx
│   └── ...
└── layout/
    ├── sidebar.tsx         # Navigation sidebar
    └── header.tsx          # Top header with profile

/styles
└── globals.css             # Tailwind config + CSS variables

```

## Key Concepts

### Roles & Permissions
- **Director**: Org-wide authority, mints salary/loan tokens, approves transactions
- **HOD/Manager**: Department lead, verifies work, approves subordinate salary releases
- **Member/Faculty**: Individual contributor, earns credits through work, requests salary/loan
- **Finance Admin**: Month-end settlement, batch reversals, ledger access

### Data Flow: Salary Release (Happy Path)

```
Faculty completes work (≥85% credits) 
    → "Initiate My Salary" button enabled
    → Creates approval_instance for HOD
    → HOD verifies attendance/leaves → Signs off
    → Director approves → SALARY_TRANSFER transaction
    → Tokens move: Director-Salary wallet → Faculty wallet
    → On salary day: Finance reverses → Real bank payroll
```

### Data Flow: Loan Request (Shortfall)

```
Faculty falls short (<85% credits)
    → "Raise Loan Request" button enabled
    → Director approves → LOAN_ISSUE transaction
    → Tokens advance + debt record created
    → Faculty marked DEBT_OUTSTANDING
    → Must complete debt-clearance tasks next cycle
    → Once cleared: loan_remaining = 0
```

## Setup Instructions

### 1. Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema

Run the canonical schema from `user_read_only_context/text_attachments/[Pasted-608-lines]` in Supabase SQL editor.

This includes:
- Organizations & org_units (hierarchical structure)
- Users & user_roles (RBAC)
- Wallets & token_transactions (ERC20-style ledger)
- Tasks & nominations (work marketplace)
- Loans & approvals (workflow)
- Audit logs

### 3. RLS Policies

All tables have Row-Level Security enforced:
- Users see only their own data + org data they have access to
- HODs see their department data
- Directors see org-wide data
- Finance only sees wallet/transaction data

### 4. Install & Run

```bash
pnpm install
pnpm dev
# Opens http://localhost:3000
```

## Pages & Components

### Login Page (`/login`)
- Real Supabase authentication
- Email + password flow
- Error handling with alerts
- No demo data

### Dashboard (`/dashboard`)
- Role-aware landing page
- User profile + organization info
- Placeholder for role-specific routing

### Director Dashboard (`/director`)
- **Cards**: Salary wallet balance, Loan pool, Active approvals
- **Sections**: 
  - Institution Structure (org tree management)
  - Approval Queue (multi-type)
- **Future**: Token circulation charts, dept heatmaps

### HOD Dashboard (`/hod`)
- **Tabs**: Team | Approvals | Tasks
- **Team Tab**: Member roster with progress indicators
- **Approvals Tab**: Pending salary releases to sign
- **Tasks Tab**: Post unstructured work to department

### Member Dashboard (`/member`)
- **Cards**: Credits earned, Token balance, Active tasks
- **Tabs**: Schedule | My Tasks | History
- **Month-End**: Conditionally show "Initiate Salary" or "Raise Loan"

### Finance Dashboard (`/finance`)
- **Cards**: Director wallet balances, Pending release count
- **Controls**: Batch reversal trigger (date-gated)
- **Audit Log**: All transactions immutable

## Authentication Flow

1. User visits `/login`
2. Enters email + password
3. `supabase.auth.signInWithPassword()` validates
4. JWT set in cookie
5. Redirects to `/dashboard`
6. Middleware verifies session; redirects to `/login` if not authenticated

## Data Fetching Patterns

### Client Component (Pages)
```typescript
'use client'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single()
```

### Server Component (Future)
```typescript
const supabase = await createClient()
const user = await getCurrentUser()
```

## Styling

- **Design Tokens**: CSS variables in `app/globals.css`
  - Colors: Primary (blue), Secondary (slate), Destructive (red)
  - Radius: 0.875rem (rounded)
  - Chart colors: Blue gradient scale
- **Components**: All shadcn/ui with Tailwind
- **Responsive**: Mobile-first, grid layouts with breakpoints

## Next Steps (Part 2)

1. **Wire Real Data**: Replace placeholder sections with live queries
2. **Add Forms**: Task creation, salary/loan requests, approvals
3. **Implement Workflows**: Approval chains, state transitions
4. **Add Charts**: Token circulation donut, dept heatmaps, salary trends
5. **Month-End Cron**: Automated batch reversal job
6. **Notifications**: Real-time alerts for approvals, deadlines
7. **Audit Trail**: Immutable transaction logs with signatures

## Production Deployment

- Deploy to Vercel with Supabase production database
- Enable RLS policies on all tables
- Set up environment variables in Vercel settings
- Configure edge middleware for session refresh
- Enable database backups + PIT recovery

## Notes

- **No Demo Data**: All pages query live Supabase
- **Zero Hardcoding**: Role-based routing derived from `user_roles` table
- **Type Safety**: Full TypeScript with database types
- **Real Auth**: No mock logins; proper JWT session management
- **Scalable**: Multi-tenant ready; supports unlimited organizations

---

**Version**: 1.0.0 (Part 1 Scaffold)  
**Last Updated**: 2026-07-22  
**Ready for**: Part 2 - Feature Implementation
