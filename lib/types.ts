// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export type OrganizationType = 'COLLEGE' | 'ENTERPRISE' | 'GOVERNMENT' | 'NGO' | 'HOSPITAL' | 'GENERIC';
export type TaskCategory = 'STRUCTURED' | 'UNSTRUCTURED';
export type TaskStatus = 'DRAFT' | 'OPEN' | 'NOMINATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'VERIFICATION_PENDING' | 'PEER_APPROVED' | 'LEAD_SIGNED' | 'REJECTED' | 'CANCELLED' | 'CLOSED';
export type WalletPurpose = 'SALARY_POOL' | 'LOAN_POOL' | 'PERSONAL';
export type TransactionType = 'MINT' | 'SALARY_TRANSFER' | 'LOAN_ISSUE' | 'REVERSE_TRANSFER' | 'LOAN_REPAY' | 'TASK_REWARD' | 'BONUS' | 'BURN';
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'REPAID' | 'DEFAULTED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'BENCH';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'OFFBOARDED';
export type ScopeLevelType = 'DIRECTOR' | 'DEAN' | 'ORG_UNIT_LEAD' | 'MEMBER' | 'FINANCE_ADMIN' | 'SYSTEM_ADMIN';
export type NotificationType = 'INFO' | 'WARNING' | 'ACTION_REQUIRED' | 'SUCCESS';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ============================================================================
// ORGANIZATIONS & HIERARCHY
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  template_key: string;
  logo_url?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OrgUnit {
  id: string;
  organization_id: string;
  parent_id?: string;
  unit_type: string;
  name: string;
  path: string;
  lead_user_id?: string;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export interface User {
  id: string;
  organization_id: string;
  org_unit_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  employee_id?: string;
  designation?: string;
  employment_type: EmploymentType;
  progress_percentage: number;
  quality_score: number;
  marketplace_locked: boolean;
  marketplace_lock_reason?: string;
  skills: string[];
  capacity_hours_weekly?: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  scope_level: ScopeLevelType;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    org_id: string;
    org_unit_id?: string;
    roles: ScopeLevelType[];
  };
  token: string;
}

// ============================================================================
// WALLETS & TOKENS
// ============================================================================

export interface Wallet {
  id: string;
  organization_id: string;
  owner_user_id: string;
  purpose: WalletPurpose;
  balance: string; // Using string for bigint precision
  is_locked: boolean;
  created_at: string;
}

export interface TokenTransaction {
  id: string;
  organization_id: string;
  from_wallet_id?: string;
  to_wallet_id?: string;
  amount: string;
  type: TransactionType;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  approval_instance_id?: string;
  notes?: string;
  timestamp: string;
}

export interface Loan {
  id: string;
  organization_id: string;
  user_id: string;
  amount: string;
  remaining: string;
  reason?: string;
  buffer_eligible: boolean;
  approved_by?: string;
  status: LoanStatus;
  due_by?: string;
  created_at: string;
  cleared_at?: string;
}

// ============================================================================
// TASKS & WORK
// ============================================================================

export interface TaskTypeDefinition {
  id: string;
  organization_id: string;
  category: TaskCategory;
  key: string;
  label: string;
  field_schema: Record<string, any>[];
  verification_mode: 'SELF_REPORT' | 'PROOF_UPLOAD' | 'LEAD_AUDIT' | 'AUTO_INTEGRATION';
  requires_peer_review: boolean;
  default_credit_value: string;
  is_active: boolean;
}

export interface Task {
  id: string;
  organization_id: string;
  org_unit_id: string;
  task_type_id: string;
  category: TaskCategory;
  title: string;
  description?: string;
  credit_value: string;
  min_skill_required: string[];
  creator_id: string;
  assigned_to_id?: string;
  deadline?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  requires_peer_review: boolean;
  custom_fields: Record<string, any>;
  debt_clearance_for_loan_id?: string;
  lead_signed_by?: string;
  lead_signed_at?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TaskProof {
  id: string;
  task_id: string;
  user_id: string;
  file_url?: string;
  description: string;
  submitted_at: string;
}

export interface Nomination {
  id: string;
  task_id: string;
  user_id: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

// ============================================================================
// APPROVALS & WORKFLOWS
// ============================================================================

export interface ApprovalInstance {
  id: string;
  chain_definition_id: string;
  subject_type: string;
  subject_id: string;
  current_step: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ApprovalAction {
  id: string;
  approval_instance_id: string;
  step_order: number;
  actor_id: string;
  decision: 'APPROVE' | 'REJECT';
  comment?: string;
  decided_at: string;
}

// ============================================================================
// COMPENSATION & POLICIES
// ============================================================================

export interface CompensationPolicy {
  id: string;
  organization_id: string;
  scope_type: 'ORG_WIDE' | 'ORG_UNIT' | 'ROLE' | 'USER';
  scope_id?: string;
  monthly_target_credits: string;
  baseline_minimum_credits: string;
  threshold_percentage: number;
  grace_period_days: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
}

export interface RateCard {
  id: string;
  organization_id: string;
  task_type_id: string;
  tokens_per_unit: string;
  role_multipliers: Record<string, number>;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// NOTIFICATIONS & AUDIT
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  redirection_link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  state_before?: Record<string, any>;
  state_after?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

// ============================================================================
// UI STATE & VIEWS
// ============================================================================

export interface OrgUnitSummary {
  org_unit_id: string;
  member_count: number;
  avg_progress: number;
  total_tokens_in_circulation: string;
  active_loans: number;
  structured_completion_rate: number;
  unstructured_completion_rate: number;
}

export interface DepartmentHeatmapData {
  org_unit_id: string;
  org_unit_name: string;
  task_completion_rate: number;
  token_circulation: string;
  avg_member_progress: number;
}
