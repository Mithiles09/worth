// Core enums matching Supabase schema
export type OrganizationType = 'COLLEGE' | 'ENTERPRISE' | 'GOVERNMENT' | 'NGO' | 'HOSPITAL' | 'GENERIC'
export type TaskCategory = 'STRUCTURED' | 'UNSTRUCTURED'
export type TaskStatus = 'DRAFT' | 'OPEN' | 'NOMINATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'VERIFICATION_PENDING' | 'PEER_APPROVED' | 'LEAD_SIGNED' | 'REJECTED' | 'CANCELLED' | 'CLOSED'
export type WalletPurpose = 'SALARY_POOL' | 'LOAN_POOL' | 'PERSONAL'
export type TransactionType = 'MINT' | 'SALARY_TRANSFER' | 'LOAN_ISSUE' | 'REVERSE_TRANSFER' | 'LOAN_REPAY' | 'TASK_REWARD' | 'BONUS' | 'BURN'
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED'
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'REPAID' | 'DEFAULTED'
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'OFFBOARDED'
export type NotificationType = 'INFO' | 'WARNING' | 'ACTION_REQUIRED' | 'SUCCESS'

// Domain entities
export interface Organization {
  id: string
  name: string
  type: OrganizationType
  template_key: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface OrgUnit {
  id: string
  organization_id: string
  parent_id?: string
  unit_type: string
  name: string
  path?: string
  lead_user_id?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string
  avatar_url?: string
  user_status: UserStatus
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_key: string
  org_unit_id?: string
  scope_level: 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'LEAD' | 'MEMBER' | 'FINANCE_ADMIN'
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  org_unit_id?: string
  purpose: WalletPurpose
  balance: number
  last_sync_tx_id?: string
  created_at: string
  updated_at: string
}

export interface TokenTransaction {
  id: string
  wallet_id_from?: string
  wallet_id_to?: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  org_unit_id: string
  title: string
  description: string
  category: TaskCategory
  status: TaskStatus
  credit_value: number
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  user_id: string
  organization_id: string
  amount_requested: number
  amount_issued: number
  amount_repaid: number
  status: LoanStatus
  created_at: string
  updated_at: string
}

export interface ApprovalInstance {
  id: string
  organization_id: string
  task_id?: string
  loan_id?: string
  action_type: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read_at?: string
  created_at: string
}
