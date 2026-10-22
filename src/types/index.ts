export type Language = 'en' | 'fr' | 'es';

// Section 6.2 Eight Core Enterprise Roles:
// A. Platform Super Administrator (platform_admin)
// B. Organisation Owner (owner)
// C. Organisation Administrator (admin)
// D. Finance Manager (finance_manager)
// E. Credit Controller (credit_controller)
// F. Finance Viewer (viewer)
// G. Auditor (auditor)
// H. Customer Portal User (customer_portal)
// Plus legacy collector role
export type UserRole = 
  | 'platform_admin' 
  | 'owner' 
  | 'admin' 
  | 'finance_manager' 
  | 'credit_controller' 
  | 'collector' 
  | 'viewer' 
  | 'auditor' 
  | 'customer_portal';

export interface UserPermission {
  canManageOrganization: boolean;
  canIssueInvoices: boolean;
  canRecordPayments: boolean;
  canIssueCreditNotes: boolean;
  canManageDisputes: boolean;
  canRunDunning: boolean;
  canApproveLegalEscalation: boolean;
  canManageTeam: boolean;
  canConfigureIntegrations: boolean;
  canApproveHighImpactActions: boolean;
  canViewAuditLogs: boolean;
  canAccessCustomerPortalOnly: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export type HighImpactActionType = 
  | 'write_off' 
  | 'material_adjustment' 
  | 'refund' 
  | 'account_closure' 
  | 'payment_details_change';

export interface HighImpactApproval {
  id: string;
  organizationId: string;
  actionType: HighImpactActionType;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  targetId: string;
  targetType: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
  recoveryCodesRemaining?: number;
  debtorId?: string; // For customer_portal users
  avatarUrl?: string;
}

export type RiskTier = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

// Section 7.1 Customer Types
export type CustomerType = 'business' | 'individual' | 'enterprise' | 'government_nonprofit';

// Section 7.1 Account Status
export type CustomerAccountStatus = 'active' | 'suspended' | 'under_review' | 'disputed' | 'closed';

export interface CustomerAddress {
  street: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  country: string;
}

export interface CustomerContact {
  name: string;
  email: string;
  phone: string;
  roleTitle?: string;
}

export interface CustomerConsent {
  reminderConsent: boolean;
  marketingConsent?: boolean;
  consentTimestamp: string;
  consentChannel: 'digital_portal' | 'written_mandate' | 'contract_clause' | 'email_optin';
}

export interface CustomerDocument {
  id: string;
  name: string;
  type: 'contract' | 'vat_cert' | 'credit_agreement' | 'delivery_note' | 'correspondence';
  uploadedAt: string;
  size: string;
  url?: string;
}

export interface CustomerInternalNote {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  content: string;
  category: 'credit_review' | 'collection_call' | 'settlement' | 'dispute' | 'general';
  isFlagged?: boolean;
}

// Section 7.3 Debtor Behaviour Analysis
export interface DebtorBehaviorAnalysis {
  latePaymentFrequency: 'rare' | 'occasional' | 'frequent' | 'chronic';
  averageHistoricalDelayDays: number;
  overdueInvoiceCount: number;
  balanceTrend: 'improving' | 'stable' | 'deteriorating';
  brokenPromisesCount: number;
  disputeFrequencyRate: number; // percentage, e.g. 15%
  daysSinceLastPayment: number;
  partialPaymentTendency: 'none' | 'moderate' | 'high';
  transparentRuleExplanation: string[];
  riskTier: RiskTier;
  manualOverrideNote?: string;
  lastReviewedBy?: string;
  lastReviewedAt?: string;
}

// Section 7.1 & 7.2 Complete Customer Record & Profile
export interface Debtor {
  id: string;
  organizationId: string;
  name: string;
  customerType: CustomerType;
  companyNumber?: string;
  vatNumber?: string;
  taxId?: string;
  customerReference?: string;
  billingAddress: CustomerAddress;
  deliveryAddress?: CustomerAddress;
  country: string;
  primaryContact: CustomerContact;
  accountsPayableContact?: CustomerContact;
  email: string;
  phone: string;
  additionalEmails?: string[];
  additionalPhones?: string[];
  preferredLanguage: Language;
  defaultCurrency: string;
  paymentTermsDays: number;
  creditLimit: number;
  creditRating: number; // 0-100
  riskTier: RiskTier;
  status: CustomerAccountStatus;
  assignedCreditControllerId?: string;
  assignedCreditControllerName?: string;
  internalNotes?: string;
  internalNotesList?: CustomerInternalNote[];
  communicationPreferences: ('email' | 'sms' | 'whatsapp' | 'postal')[];
  consent: CustomerConsent;
  dso: number;
  averageDaysToPay: number;
  totalInvoiced: number;
  totalOutstanding: number;
  totalOverdue: number;
  overdueInvoiceCount: number;
  lastPaymentDate?: string;
  lastContactDate?: string;
  historicalPaymentBehavior?: {
    onTimePaymentRate: number;
    averagePaymentDelayDays: number;
    totalPaidInvoices: number;
    totalBrokenPromises: number;
    disputeFrequencyRate: number;
  };
  behaviorAnalysis?: DebtorBehaviorAnalysis;
  documents?: CustomerDocument[];
  paymentPortalToken: string;
  notes?: string;
  createdAt: string;
  // Legacy compatibility aliases
  address?: string;
  contactName?: string;
  telephone?: string;
}

export type FinancialStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'written_off' | 'cancelled';
export type AgeingStatus = 'current' | 'overdue';
export type DisputeWorkflowStatus = 'none' | 'open' | 'under_investigation' | 'resolved' | 'active' | 'disputed';
export type CollectionWorkflowStatus = 'active_cadence' | 'paused_pending_review' | 'on_hold' | 'escalated_to_legal' | 'settled';

// Section 8.2 Clearly defined statuses
export type InvoiceStatus = 
  | 'draft' 
  | 'issued' 
  | 'partially_paid' 
  | 'paid' 
  | 'overdue' 
  | 'disputed' 
  | 'on_hold' 
  | 'written_off' 
  | 'cancelled';

export type InvoiceSource = 'manual' | 'erp_sync' | 'csv_import' | 'api' | 'xero' | 'quickbooks';

export interface InvoiceDocumentRef {
  id: string;
  name: string;
  url?: string;
  size: string;
  uploadedAt: string;
  mimeType?: string;
}

export interface InvoiceCollectionActivityRef {
  date: string;
  type: string;
  summary: string;
  performedBy: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 20 for 20%
  total: number;
  amount?: number;
}

// Section 8.1 & 8.2 Complete Invoice Record
export interface Invoice {
  id: string; // Internal record ID
  organizationId: string;
  invoiceNumber: string;
  debtorId: string;
  debtorName: string;
  debtorEmail: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  originalAmount: number; // Original amount (total Amount)
  currency: string;  // e.g. 'EUR', 'USD', 'GBP'
  taxAmount: number; // Tax amount where applicable
  subtotal: number;
  amountPaid: number; // Amount already paid
  amountDue: number;  // Outstanding balance
  paymentTermsDays: number; // Payment terms
  description: string;
  purchaseOrderRef?: string; // Purchase order reference
  externalAccountingRef?: string; // External accounting system reference (e.g. Xero, SAP, NetSuite)
  invoiceDocument?: InvoiceDocumentRef; // Original invoice document
  internalNotes?: string;
  status: InvoiceStatus;
  
  // Section 8.2 Multi-dimensional status modeling
  financialStatus: FinancialStatus;
  ageingStatus: AgeingStatus;
  disputeStatus: DisputeWorkflowStatus;
  collectionStatus: CollectionWorkflowStatus;

  source: InvoiceSource;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  lineItems: InvoiceLineItem[];
  daysOverdue: number;
  accruedLateInterest: number;
  nextReminderDate?: string;
  assignedCreditControllerId?: string;
  assignedCreditControllerName?: string;
  lastCollectionActivity?: InvoiceCollectionActivityRef;
  currentDunningStage?: string;
  disputeId?: string;
  notes?: string;

  // Compatibility aliases
  totalAmount: number;
  reference?: string;
}

export interface CreditNoteAllocation {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
}

export interface CreditNote {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  creditNoteNumber: string;
  issueDate: string;
  currency: string;
  amount: number;
  remainingBalance: number;
  reason: 'commercial_discount' | 'pricing_error' | 'damaged_goods' | 'goodwill_settlement' | 'cancellation';
  allocations: CreditNoteAllocation[];
  status: 'draft' | 'issued' | 'allocated' | 'void';
  issuedBy: string;
  notes?: string;
}

// -------------------------------------------------------------
// PART 11 — PAYMENT MANAGEMENT & RECONCILIATION TYPES
// -------------------------------------------------------------

export type PaymentMethod = 
  | 'bank_transfer' 
  | 'card' 
  | 'credit_card' 
  | 'instant_electronic' 
  | 'direct_debit' 
  | 'cash' 
  | 'stripe' 
  | 'credit_note' 
  | 'other';

export type PaymentSource = 
  | 'manual' 
  | 'bank_feed' 
  | 'gateway_webhook' 
  | 'csv_statement' 
  | 'portal_proof' 
  | 'accounting_sync';

export type PaymentReconciliationStatus = 
  | 'unreconciled' 
  | 'partially_reconciled' 
  | 'fully_reconciled' 
  | 'reconciled'
  | 'matched'
  | 'flagged'
  | 'ignored';

export type PaymentVerificationStatus = 
  | 'verified' 
  | 'pending_verification' 
  | 'unverified' 
  | 'rejected';

export interface PaymentSupportingDocument {
  id: string;
  name: string;
  size?: string;
  url?: string;
  uploadedAt: string;
  mimeType?: string;
}

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
  allocatedAt?: string;
}

// Section 11.1 Complete Payment Record
export interface Payment {
  id: string; // Unique payment ID
  organizationId: string;
  debtorId: string;
  debtorName: string;
  paymentDate: string; // YYYY-MM-DD
  recordedDate: string; // ISO datetime
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  bankReference?: string;
  gatewayReference?: string;
  source: PaymentSource;
  reconciliationStatus: PaymentReconciliationStatus;
  verificationStatus: PaymentVerificationStatus;
  recordedBy: string;
  supportingDocument?: PaymentSupportingDocument;
  notes?: string;
  allocations: PaymentAllocation[];
  unallocatedAmount: number;
  overpaymentAmount: number;
  creditBalanceAmount?: number;
  reversalStatus?: 'reversed' | 'active';
  reversedAt?: string;
  reversalReason?: string;
  reversedBy?: string;
  // Compatibility alias
  referenceNumber: string;
}

// Section 11.4 Proof of Payment & Verification Tasks
export interface PaymentVerificationTask {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  bankReference?: string;
  documentName: string;
  documentSize?: string;
  documentUrl?: string;
  submittedAt: string;
  customerNotes?: string;
  status: 'pending_review' | 'verified' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  matchedPaymentId?: string;
}

// Section 11.5 Bank Statement Lines & Reconciliation
export interface SuggestedMatchOption {
  targetType: 'invoice' | 'payment';
  targetId: string;
  reference: string;
  debtorName: string;
  amount: number;
  currency: string;
  confidenceScore: number; // 0 to 100
  matchReasons: string[];
}

export interface BankStatementLine {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  currency: string;
  statementId: string;
  status: 'unmatched' | 'suggested' | 'matched' | 'ignored';
  matchedPaymentId?: string;
  matchedInvoiceId?: string;
  matchedAt?: string;
  matchedBy?: string;
  suggestedMatches?: SuggestedMatchOption[];
}

export interface ReconciliationRecord {
  id: string;
  organizationId: string;
  statementLineId: string;
  statementLineRef: string;
  paymentId?: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  matchedBy: string;
  matchedAt: string;
  confidenceLevel: 'exact' | 'high' | 'medium' | 'manual_override';
  notes?: string;
  decisionNotes?: string;
}

// -------------------------------------------------------------
// PART 15 — DISPUTE AND QUERY MANAGEMENT TYPES
// -------------------------------------------------------------

// 15.1 Dispute Categories
export type DisputeCategory =
  | 'incorrect_invoice_amount'
  | 'duplicate_invoice'
  | 'goods_services_not_received'
  | 'incorrect_customer'
  | 'missing_purchase_order'
  | 'incorrect_tax_treatment'
  | 'payment_already_made'
  | 'credit_note_requested'
  | 'contractual_disagreement'
  | 'service_complaint'
  | 'other'
  // Backward compatibility aliases
  | 'pricing_discrepancy'
  | 'damaged_or_missing_goods'
  | 'service_incomplete'
  | 'terms_disagreement';

export type DisputeReason = DisputeCategory;

// 15.2 Dispute Statuses
export type DisputeStatus =
  | 'new'
  | 'under_review'
  | 'awaiting_customer'
  | 'awaiting_internal_dept'
  | 'awaiting_credit_note'
  | 'resolved'
  | 'rejected'
  | 'closed'
  // Backward compatibility aliases
  | 'open'
  | 'escalated';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DisputeSupportingEvidence {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  fileUrl?: string;
  description?: string;
}

export interface DisputeInternalNote {
  id: string;
  timestamp: string;
  author: string;
  authorRole: string;
  note: string;
}

export interface DisputeAuditEntry {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  details: string;
  previousStatus?: DisputeStatus;
  newStatus?: DisputeStatus;
}

export interface DisputeCommunicationRecord {
  id: string;
  timestamp: string;
  direction: 'inbound' | 'outbound' | 'internal';
  channel: 'portal' | 'email' | 'whatsapp' | 'phone' | 'internal_memo';
  sender: string;
  recipient: string;
  subject?: string;
  message: string;
}

export interface DisputeResolution {
  outcome: 'resolved' | 'rejected' | 'closed';
  summary: string;
  actionTaken: string;
  creditNoteIssued?: boolean;
  creditNoteNumber?: string;
  resumedDunning: boolean;
  resolvedBy: string;
  resolutionDate: string;
}

export interface Dispute {
  id: string;
  organizationId: string;
  disputeNumber?: string;
  customer?: string;
  debtorId: string;
  debtorName: string;
  customerReference?: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceAmount?: number;
  invoiceBalance?: number;
  invoiceDueDate?: string;
  amountDisputed: number;
  currency?: string;
  category: DisputeCategory;
  reason: DisputeReason; // alias for category
  customerExplanation: string;
  debtorStatement: string; // alias for customerExplanation
  dateReceived: string;
  lodgedDate: string; // alias for dateReceived
  targetResolutionDate?: string;
  supportingEvidence?: DisputeSupportingEvidence[];
  assignedStaffMember?: string;
  assignedQueue?: string;
  assignedTo?: string; // alias
  priority: DisputePriority;
  status: DisputeStatus;
  internalNotesList?: DisputeInternalNote[];
  internalNotes?: string;
  resolution?: DisputeResolution;
  resolutionDate?: string;
  resolvedAt?: string; // alias
  resolutionSummary?: string; // alias
  auditHistory?: DisputeAuditEntry[];
  communications?: DisputeCommunicationRecord[];
  originalMessage?: {
    channel: 'portal' | 'email' | 'whatsapp' | 'phone' | 'formal_letter';
    receivedAt: string;
    rawContent: string;
    sender: string;
  };
  reminderPauseActive: boolean;
  aiSentiment?: 'cooperative' | 'frustrated' | 'aggressive' | 'ambiguous';
  aiSuggestedAction?: string;
  aiRootCause?: string;
}

export type PromiseStatus = 'pending' | 'fulfilled' | 'broken' | 'rescheduled' | 'kept' | 'cancelled';

export interface PromiseToPay {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  promisedAmount: number;
  promisedDate: string;
  currency: string;
  status: PromiseStatus;
  contactPerson: string;
  notes?: string;
  createdAt: string;
  fulfilledDate?: string;
}

export type CollectionActivityType = 
  | 'phone_call' 
  | 'in_person_meeting' 
  | 'formal_letter' 
  | 'legal_escalation' 
  | 'settlement_negotiation' 
  | 'field_visit' 
  | 'portal_interaction';

export type CollectionActivityOutcome = 
  | 'spoke_to_ap' 
  | 'left_voicemail' 
  | 'dispute_raised' 
  | 'promise_secured' 
  | 'escalated_to_legal' 
  | 'no_answer' 
  | 'agreed_payment_plan' 
  | 'payment_received';

export interface CollectionActivity {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  activityType: CollectionActivityType;
  title: string;
  description: string;
  performedBy: string;
  performedAt: string;
  outcome?: CollectionActivityOutcome;
  followUpDate?: string;
  followUpAssignee?: string;
}

export type DunningChannel = 'email' | 'sms' | 'whatsapp' | 'formal_letter';
export type DunningTone = 
  | 'friendly_reminder' 
  | 'polite_due' 
  | 'firm_overdue' 
  | 'urgent_escalation' 
  | 'formal_demand' 
  | 'legal_preaction';

export type ReminderStageType = 
  | 'courtesy_before_due'
  | 'due_date'
  | 'first_overdue'
  | 'second_overdue'
  | 'formal_followup'
  | 'credit_controller_escalation'
  | 'management_review';

export interface DunningStep {
  id: string;
  stageName: string;
  stageType: ReminderStageType;
  dayOffset: number; // e.g. -3 (before due), 0 (due date), 7, 14, 30, 45, 60
  channel: DunningChannel;
  tone: DunningTone;
  templateSubject: string;
  templateBody: string;
  requiresManagerApproval?: boolean;
  isEscalation?: boolean;
  escalationAction?: 'assign_senior_controller' | 'create_followup_task' | 'notify_finance_manager' | 'flag_management_review' | 'pause_automation';
}

export type ReminderTrigger = 
  | 'due_date_relative' 
  | 'overdue_threshold' 
  | 'broken_promise' 
  | 'balance_threshold' 
  | 'customer_agreement';

export type ReminderStopCondition = 
  | 'payment_received' 
  | 'dispute_opened' 
  | 'account_on_hold' 
  | 'promise_to_pay_active' 
  | 'customer_excluded';

export interface DunningWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  trigger: ReminderTrigger;
  eligibleRules: {
    customerTiers?: RiskTier[];
    minBalance?: number;
    currencies?: string[];
    paymentTermsDays?: number[];
    customerTypes?: ('business' | 'individual')[];
  };
  steps: DunningStep[];
  applicableTimeZone: string;
  maxFrequencyDays: number; // Maximum communication frequency guardrail (Section 12.2 & 12.3)
  retryPolicy: {
    maxAttempts: number;
    retryIntervalHours: number;
  };
  stopConditions: ReminderStopCondition[];
  escalationRule?: {
    triggerAfterDays: number;
    action: 'assign_senior_controller' | 'create_followup_task' | 'notify_finance_manager' | 'flag_management_review' | 'pause_automation';
    notifyEmail?: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Compatibility
  targetRiskTier?: RiskTier[];
}

// Section 12.4 Durable Scheduled Reminder Jobs Queue
export type ScheduledReminderStatus = 
  | 'scheduled' 
  | 'pending_approval' 
  | 'executed' 
  | 'suppressed' 
  | 'cancelled' 
  | 'failed';

export interface ScheduledReminder {
  id: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  debtorId: string;
  debtorName: string;
  debtorEmail: string;
  workflowId: string;
  workflowName: string;
  stepId: string;
  stageName: string;
  dayOffset: number;
  channel: DunningChannel;
  scheduledFor: string; // YYYY-MM-DD
  executedAt?: string;
  status: ScheduledReminderStatus;
  idempotencyKey: string;
  subject: string;
  body: string;
  recipient: string;
  amountDue: number;
  currency: string;
  daysOverdue: number;
  suppressionReason?: string;
  executionError?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Section 12.6 Complete Delivery & Engagement Tracking
export type DeliveryStatus = 
  | 'queued' 
  | 'sent_to_provider' 
  | 'delivered' 
  | 'failed' 
  | 'bounced' 
  | 'rejected' 
  | 'opened' 
  | 'clicked' 
  | 'customer_replied' 
  | 'cancelled' 
  | 'suppressed';

export interface CommunicationLog {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  channel: DunningChannel;
  tone: DunningTone;
  language: Language;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  status: DeliveryStatus;
  isAIGenerated: boolean;
  // Section 12.6 Delivery & Engagement Milestones
  providerMessageId?: string;
  providerStatus?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  replyContent?: string;
  failureReason?: string;
  idempotencyKey?: string;
  triggeredBy?: string;
}

export interface BackgroundJob {
  id: string;
  name: string;
  schedule: string; // e.g. "Every hour" or cron
  type: 'dunning_cadence' | 'late_interest_accrual' | 'erp_sync' | 'ptp_check' | 'cash_forecast_refresh';
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRunAt: string;
  nextRunAt: string;
  itemsProcessed: number;
}

export type AuditEventType =
  | 'INVOICE_CREATED'
  | 'INVOICE_MUTATED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_ALLOCATED'
  | 'PAYMENT_REVERSED'
  | 'CREDIT_NOTE_ISSUED'
  | 'DEBT_WRITTEN_OFF'
  | 'DISPUTE_STATUS_CHANGED'
  | 'REMINDER_GENERATED'
  | 'REMINDER_DELIVERED'
  | 'WORKFLOW_CHANGED'
  | 'USER_ROLE_CHANGED'
  | 'INTEGRATION_CONFIGURED'
  | 'DATA_EXPORTED'
  | 'SUBSCRIPTION_CHANGED'
  | 'SENSITIVE_ADMIN_ACCESS'
  | 'SECURITY_POLICY_CHANGED';

export type AuditActionSource =
  | 'web_ui'
  | 'api_v1'
  | 'automated_engine'
  | 'webhook'
  | 'background_job'
  | 'system_daemon';

export interface AuditApprovalRecord {
  approverId?: string;
  approverName?: string;
  approvalTimestamp?: string;
  dualSignoffRef?: string;
  ticketId?: string;
  comments?: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  timestamp: string;
  userId: string;
  userName: string;
  eventType?: AuditEventType | string;
  entityType?: string;
  entityId?: string;
  action: string;
  category: 'invoice' | 'payment' | 'credit_note' | 'dispute' | 'dunning' | 'promise' | 'system' | 'settings' | 'team' | 'security' | 'compliance' | 'integration';
  details: string;
  targetId?: string;
  targetType?: string;
  previousValue?: Record<string, any> | string;
  newValue?: Record<string, any> | string;
  adjustmentReason?: string;
  source?: AuditActionSource | string;
  correlationId?: string;
  approvalRecord?: AuditApprovalRecord;
  ipAddress?: string;
  userAgent?: string;
  recordHash?: string;
  previousRecordHash?: string;
  isVerifiedTamperProof?: boolean;
}

export interface OrganizationAddress {
  street: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  country: string;
}

export interface ArContact {
  name: string;
  email: string;
  phone: string;
}

export interface InvoiceNumberingConfig {
  prefix: string;
  nextNumber: number;
  padding: number;
}

export interface ReminderPreferences {
  gracePeriodDays: number;
  defaultChannels: ('email' | 'sms' | 'whatsapp')[];
  autoDunningEnabled: boolean;
  escalationOverdueDays: number;
  escalateToRole: UserRole;
  senderIdentity: {
    fromName: string;
    fromEmail: string;
    whatsappSenderNumber?: string;
  };
}

export interface DocumentBranding {
  logoUrl?: string;
  primaryColor?: string;
  headerNote?: string;
  footerNote?: string;
}

export interface DataRetentionPreferences {
  financialAuditRetentionYears: number;
  autoArchiveResolvedDisputesDays: number;
  purgeCommunicationsAfterMonths: number;
}

export interface Organization {
  id: string;
  name: string;
  legalEntity: string;
  registrationNumber: string;
  taxId?: string;
  country?: string;
  industry?: string;
  businessEmail?: string;
  telephone?: string;
  defaultLanguage?: Language;
  defaultCurrency: string;
  supportedCurrencies?: string[];
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeZone?: string;
  financialYearEnd?: string;
  address?: OrganizationAddress;
  arContact?: ArContact;
  invoiceNumbering?: InvoiceNumberingConfig;
  reminderPreferences?: ReminderPreferences;
  branding?: DocumentBranding;
  dataRetention?: DataRetentionPreferences;
  baseLateInterestRate: number; // e.g., 8.0%
  defaultPaymentTermsDays?: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    iban: string;
    swiftBic: string;
    paymentInstructions: string;
  };
  subscriptionPlan: 'starter' | 'growth' | 'enterprise';
  subscriptionStatus: 'active' | 'trial' | 'past_due';
  subscriptionPeriodEnd: string;
  currentRecoveryVolume: number;
  recoveryVolumeLimit: number;
  seatsUsed: number;
  seatsLimit: number;
  maxSeats?: number;
  createdAt?: string;
  emailVerified?: boolean;
}

export interface AgingBuckets {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  total: number;
}

export interface FinancialMetrics {
  totalReceivables: number;
  totalOverdue: number;
  dso: number; // Days Sales Outstanding in days
  cei: number; // Collection Effectiveness Index in %
  averageDaysDelinquent: number;
  totalCollectedThisMonth: number;
  disputedAmountTotal: number;
  openPromisesTotal: number;
  totalCreditNotesAmount: number;
  aging: AgingBuckets;
  cashForecast: {
    period30Days: number;
    period60Days: number;
    period90Days: number;
  };
}

export interface IntegrationStatus {
  service: 'stripe' | 'twilio' | 'sendgrid' | 'xero' | 'quickbooks' | 'whatsapp';
  name: string;
  category: 'payments' | 'sms' | 'email' | 'accounting_erp' | 'messaging';
  isConfigured: boolean;
  status: 'ready' | 'needs_credentials' | 'simulated_sandbox';
  description: string;
  apiKeyMasked?: string;
  lastSyncAt?: string;
}

// -------------------------------------------------------------
// PART 9 — CSV AND SPREADSHEET IMPORT TYPES
// -------------------------------------------------------------

export type ImportEntityType = 'invoices' | 'customers' | 'payments';

export type ImportWorkflowStage = 
  | 'upload'
  | 'file_validation'
  | 'header_detection'
  | 'column_mapping'
  | 'data_preview'
  | 'format_validation'
  | 'duplicate_detection'
  | 'error_identification'
  | 'user_confirmation'
  | 'processing'
  | 'summary'
  | 'error_report';

export interface ColumnMappingConfig {
  [sourceHeader: string]: string; // Maps CSV/XLSX header name to CNTCollect field key
}

export interface MappingTemplate {
  id: string;
  name: string;
  entityType: ImportEntityType;
  mappings: ColumnMappingConfig;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ImportRowError {
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportRowPreview {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: Record<string, any>;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  errors: ImportRowError[];
  isCreditNote?: boolean;
}

export interface ImportBatchRecord {
  id: string;
  organizationId: string;
  batchNumber: string;
  filename: string;
  fileFormat: 'csv' | 'xlsx' | 'xls';
  fileSizeFormatted: string;
  entityType: ImportEntityType;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  idempotencyKey: string;
  status: 'completed' | 'partial' | 'failed';
  createdAt: string;
  createdBy: string;
  sourceReference: string;
  rejectedRowsData: {
    rowIndex: number;
    data: Record<string, any>;
    reasons: string[];
  }[];
}

// -------------------------------------------------------------
// PART 10 — ACCOUNTS RECEIVABLE ENGINE TYPES
// -------------------------------------------------------------

export type FinancialAdjustmentType = 
  | 'debit_adjustment' 
  | 'credit_adjustment' 
  | 'tax_adjustment' 
  | 'commercial_discount' 
  | 'bad_debt_write_off' 
  | 'reversal';

export interface FinancialAdjustment {
  id: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  debtorId: string;
  debtorName: string;
  type: FinancialAdjustmentType;
  amount: number;
  amountMinorUnits: number; // Integer cents to prevent binary float inaccuracies
  currency: string;
  effectiveDate: string;
  reason: string;
  authorizedBy: string;
  auditTrailId: string;
  createdAt: string;
}

export interface PaymentReversal {
  id: string;
  organizationId: string;
  originalPaymentId: string;
  originalPaymentRef: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  currency: string;
  reversalDate: string;
  reason: string;
  authorizedBy: string;
  affectedInvoices: {
    invoiceId: string;
    invoiceNumber: string;
    restoredAmount: number;
  }[];
  auditTrailId: string;
  createdAt: string;
}

export interface CustomAgeingConfig {
  id: string;
  organizationId: string;
  name: string;
  buckets: {
    id: string;
    label: string;
    minDays: number;
    maxDays: number;
  }[];
  isDefault: boolean;
  updatedAt: string;
}

// -------------------------------------------------------------
// PART 13 — EMAIL AND WHATSAPP INTEGRATIONS TYPES
// -------------------------------------------------------------

export type EmailProviderType = 'sendgrid' | 'postmark' | 'ses' | 'resend' | 'custom_smtp';

export interface VerifiedSender {
  email: string;
  name: string;
  status: 'verified' | 'pending' | 'failed';
  dkimStatus: 'valid' | 'pending' | 'invalid';
  spfStatus: 'valid' | 'pending' | 'invalid';
  isDefault: boolean;
}

export interface EmailBrandingConfig {
  logoUrl?: string;
  primaryColor: string;
  companyHeader: string;
  footerNote: string;
  complianceDisclaimer: string;
}

export interface EmailRetryPolicy {
  maxAttempts: number;
  retryIntervalHours: number;
  backoffStrategy: 'exponential' | 'fixed';
}

export interface EmailIntegrationConfig {
  id: string;
  organizationId: string;
  provider: EmailProviderType;
  providerName: string;
  apiKeyMasked?: string;
  apiEndpoint?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  verifiedSenders: VerifiedSender[];
  replyToAddress: string;
  branding: EmailBrandingConfig;
  retryPolicy: EmailRetryPolicy;
  webhookEndpoint: string;
  webhookSigningSecret?: string;
  isConfigured: boolean;
  isValidated: boolean;
  lastValidatedAt?: string;
  validationDetails?: string;
}

export type EmailSuppressionReason = 
  | 'hard_bounce' 
  | 'soft_bounce_max' 
  | 'spam_complaint' 
  | 'unsubscribe' 
  | 'manual_suppression';

export interface EmailSuppressionItem {
  id: string;
  organizationId: string;
  email: string;
  reason: EmailSuppressionReason;
  addedAt: string;
  source: string;
  details?: string;
}

export interface EmailTemplateItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  subject: string;
  plainText: string;
  htmlContent: string;
  variables: string[];
  category: 'pre_due' | 'due_date' | 'overdue' | 'final_notice' | 'payment_receipt';
  isDefault: boolean;
  updatedAt: string;
}

export type WhatsAppProviderType = 'meta_cloud_api' | 'twilio' | 'infobip' | '360dialog' | 'messagebird';

export interface WhatsAppPolicyCompliance {
  requiresApprovedTemplateOutside24hWindow: boolean;
  enforceCustomerConsent: boolean;
  allowSessionFreeformWithin24h: boolean;
  customerServiceWindowHours: number;
}

export interface WhatsAppIntegrationConfig {
  id: string;
  organizationId: string;
  provider: WhatsAppProviderType;
  providerName: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  displayName: string;
  apiKeyMasked?: string;
  webhookVerificationToken: string;
  isConfigured: boolean;
  isValidated: boolean;
  status: 'active' | 'unavailable' | 'needs_credentials';
  lastValidatedAt?: string;
  validationDetails?: string;
  policyCompliance: WhatsAppPolicyCompliance;
}

export interface WhatsAppTemplateItem {
  id: string;
  organizationId: string;
  templateName: string;
  metaTemplateId: string;
  category: 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  bodyText: string;
  parameters: string[];
  quickReplyButtons?: string[];
  lastApprovedAt?: string;
}

export interface UnifiedCommunicationItem extends CommunicationLog {
  templateId?: string;
  templateName?: string;
  sender?: string;
  senderName?: string;
  scheduledAt?: string;
  provider?: string;
  providerReference?: string;
  triggeredBy?: string;
  securePaymentLink?: string;
}

// -------------------------------------------------------------
// PART 14 — AI COMMUNICATION ASSISTANT TYPES
// -------------------------------------------------------------

export type AiMessageTone = 
  | 'friendly' 
  | 'professional' 
  | 'courteous_firm' 
  | 'formal' 
  | 'final_escalation';

export type AiClassificationCategory = 
  | 'payment_completed' 
  | 'payment_scheduled' 
  | 'request_invoice_copy' 
  | 'request_statement' 
  | 'payment_dispute' 
  | 'amount_discrepancy' 
  | 'incorrect_invoice' 
  | 'request_extension' 
  | 'request_instalments' 
  | 'general_query' 
  | 'opt_out' 
  | 'unclear_response';

export interface AiMessageDraft {
  versionId: string;
  versionLabel: string;
  subject: string;
  body: string;
  tone: AiMessageTone;
  language: string;
  targetCustomerName: string;
  targetInvoiceNumber: string;
  verifiedAmountDue: number;
  currency: string;
  dueDate: string;
  paymentInstructions: string;
  requiresHumanReview: boolean;
  model: string;
}

export interface AiClassificationResult {
  category: AiClassificationCategory;
  categoryLabel: string;
  confidenceScore: number; // 0 - 100
  requiresHumanReview: boolean;
  extractedPaymentDate?: string;
  isPromiseToPay: boolean;
  promisedAmount?: number;
  disputeIndicatorsFound: boolean;
  reasoning: string;
  suggestedAction: string;
  model: string;
}

export interface AiDebtorSummaryResult {
  debtorId: string;
  debtorName: string;
  verifiedFacts: {
    totalOutstanding: number;
    currency: string;
    openInvoicesCount: number;
    oldestOverdueDays: number;
    oldestInvoiceNumber: string;
    recentPaymentsCount: number;
    recentPaymentsTotal: number;
    recentRemindersCount: number;
    activeDisputesCount: number;
    activePromisesCount: number;
  };
  aiInterpretation: {
    paymentBehaviorSummary: string;
    riskAssessment: 'low' | 'moderate' | 'elevated' | 'severe';
    likelyDisputeFlags: string[];
    suggestedNextAction: string;
    priorityRating: 'standard' | 'high' | 'immediate';
  };
  model: string;
  generatedAt: string;
}

export interface AiAssistantMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  estimatedTokensUsed: number;
  averageLatencyMs: number;
  modelInUse: string;
  rateLimitStatus: 'healthy' | 'throttled';
  promptInjectionDefenseActive: boolean;
}

// -------------------------------------------------------------
// PART 16 — CUSTOMER PAYMENT PORTAL TYPES
// -------------------------------------------------------------

export interface PortalTokenInfo {
  token: string;
  debtorId: string;
  debtorName: string;
  expiresAt: string;
  scope: 'full_portal' | 'invoice_only';
  invoiceId?: string;
  invoiceNumber?: string;
  isRevoked: boolean;
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface PortalAccountSummary {
  debtorId: string;
  customerName: string;
  defaultCurrency: string;
  totalOutstanding: number;
  totalOverdue: number;
  unpaidInvoicesCount: number;
  paidInvoicesCount: number;
  upcomingDueCount: number;
  activePromisesCount: number;
  openDisputesCount: number;
}

export interface PortalStatementRequestRecord {
  id: string;
  debtorId: string;
  requestedAt: string;
  period: 'last_30_days' | 'current_quarter' | 'year_to_date' | 'all_open';
  format: 'pdf' | 'csv';
  status: 'ready' | 'generating';
  downloadUrl: string;
  fileName: string;
}

export type PortalPaymentGatewayType = 
  | 'stripe_card' 
  | 'open_banking' 
  | 'sepa_direct_debit' 
  | 'faster_payments' 
  | 'international_wire';

export interface PortalPaymentCheckoutPayload {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  gateway: PortalPaymentGatewayType;
  paymentMethodToken: string;
  cardholderName?: string;
  idempotencyKey: string;
}

// -------------------------------------------------------------
// PART 17 — COLLECTION PRIORITISATION AND WORK MANAGEMENT TYPES
// -------------------------------------------------------------

// 17.1 Work Queue Categories
export type QueueCategory = 
  | 'all'
  | 'recently_overdue'
  | 'high_value_overdue'
  | 'repeated_late_payers'
  | 'broken_promises'
  | 'disputed_invoices'
  | 'failed_reminders'
  | 'no_response'
  | 'evidence_awaiting_verification'
  | 'approaching_escalation';

// 17.2 Prioritisation Engine Configuration
export interface PrioritizationWeights {
  balanceWeight: number; // 1.0 - 5.0
  daysOverdueWeight: number; // 1.0 - 5.0
  brokenPromiseWeight: number; // 5 - 50 points
  repeatedLateWeight: number; // 5 - 40 points
  staleContactWeight: number; // 5 - 30 points
  disputeAdjustment: number; // -30 to +30 points
  accountImportanceWeight: number; // 5 - 40 points
  highValueThreshold: number; // e.g. 10000
  recentlyOverdueDays: number; // e.g. 14
  staleContactDays: number; // e.g. 10
}

export interface ScoreFactor {
  factor: string;
  points: number;
  explanation: string;
}

export interface PrioritizedAccount {
  debtorId: string;
  debtorName: string;
  customerReference?: string;
  country?: string;
  currency: string;
  tier: RiskTier;
  accountImportance: 'strategic' | 'key_account' | 'standard' | 'high_risk';
  totalOutstanding: number;
  totalOverdue: number;
  overdueInvoicesCount: number;
  totalInvoicesCount: number;
  oldestOverdueDays: number;
  oldestInvoiceNumber?: string;
  priorityScore: number; // 0 - 100
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  scoreBreakdown: ScoreFactor[];
  matchedCategories: QueueCategory[];
  lastContactDate?: string;
  daysSinceLastContact?: number;
  brokenPromisesCount: number;
  activeDisputesCount: number;
  pendingEvidenceCount: number;
  failedRemindersCount: number;
  unansweredContactsCount: number;
  approachingEscalation: boolean;
  assignedCreditControllerName?: string;
  openTasksCount: number;
  suggestedAction: string;
}

// 17.3 Collection Task Types & Interface
export type CollectionTaskType = 
  | 'call_customer'
  | 'send_email'
  | 'review_payment_evidence'
  | 'resolve_dispute'
  | 'confirm_payment_promise'
  | 'request_missing_documents'
  | 'escalate_to_management'
  | 'reconcile_transaction';

export type CollectionTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CollectionTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CollectionTask {
  id: string;
  organizationId: string;
  title: string;
  debtorId: string;
  debtorName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  taskType: CollectionTaskType;
  assignedUserId: string;
  assignedUserName: string;
  assignedUserRole?: string;
  dueDate: string; // YYYY-MM-DD
  priority: CollectionTaskPriority;
  status: CollectionTaskStatus;
  notes?: string;
  reminderAt?: string; // YYYY-MM-DD HH:MM
  completionDate?: string; // YYYY-MM-DD HH:MM
  completedBy?: string;
  outcomeNotes?: string;
  createdAt: string;
  createdBy: string;
}

// 17.4 Team Workload & Fair Performance Metrics
export interface TeamMemberWorkload {
  userId: string;
  userName: string;
  userRole: string;
  openTasksCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  accountsAwaitingContactCount: number;
  accountsWithoutRecentActivityCount: number;
  cashRecovered: number;
  promisesSecuredCount: number;
  promisesKeptRate: number; // Percentage 0-100%
  disputesResolvedCount: number;
  avgResolutionTurnaroundDays: number;
  slaComplianceRate: number; // Percentage 0-100%
  totalActionsLogged: number;
}

// -------------------------------------------------------------
// PART 18 — CASH FLOW FORECASTING TYPES
// -------------------------------------------------------------

export type ForecastHorizon = '7_days' | '14_days' | '30_days' | '60_days' | '90_days' | 'custom';

export type ForecastStreamType = 
  | 'contractually_due' 
  | 'customer_promised' 
  | 'historical_pattern' 
  | 'ai_assisted' 
  | 'confirmed_payments';

export interface ForecastCategoryBreakdown {
  contractuallyDue: number;
  customerPromised: number;
  historicalPatternEstimate: number;
  aiAssistedEstimate: number;
  confirmedPayments: number;
  totalExpected: number;
  invoicesCount: number;
  promisesCount: number;
}

export interface ForecastAssumptions {
  ptpAdherenceRate: number; // default 88%
  disputeHoldDiscount: number; // default 25% (i.e. 75% restricted)
  historicalPaymentDelayWeight: number; // default 70% weight on debtor's average payment delay
  cadenceLiftBoost: number; // 0 - 20%
  currencyMode: 'separated_by_currency' | 'ecb_reference_rates';
  customHorizonDays: number; // e.g. 45 or 120
}

export interface ForecastLineItem {
  id: string;
  invoiceId?: string;
  invoiceNumber: string;
  debtorId: string;
  debtorName: string;
  currency: string;
  amountDue: number;
  originalAmount: number;
  amountPaid: number;
  dueDate: string;
  expectedDate: string;
  daysUntilExpected: number;
  streamType: ForecastStreamType;
  streamLabel: string;
  confidenceScore: number; // 0 - 100%
  isDisputed: boolean;
  hasActivePromise: boolean;
  debtorAvgPaymentDelayDays: number;
  reasoning: string;
}

export interface CurrencyForecastSummary {
  currency: string;
  period7Days: ForecastCategoryBreakdown;
  period14Days: ForecastCategoryBreakdown;
  period30Days: ForecastCategoryBreakdown;
  period60Days: ForecastCategoryBreakdown;
  period90Days: ForecastCategoryBreakdown;
  customPeriod?: {
    days: number;
    breakdown: ForecastCategoryBreakdown;
  };
}

export interface CashForecastResponse {
  organizationId: string;
  generatedAt: string;
  assumptions: ForecastAssumptions;
  currencies: string[];
  activeCurrency: string;
  byCurrency: Record<string, CurrencyForecastSummary>;
  consolidated?: CurrencyForecastSummary;
  lineItems: ForecastLineItem[];
  exchangeRates: Record<string, number>;
}

// -------------------------------------------------------------
// PART 19 — REPORTING AND ANALYTICS TYPES
// -------------------------------------------------------------

export type StandardReportId =
  | 'ar_summary'
  | 'outstanding_invoices'
  | 'overdue_invoices'
  | 'receivables_ageing'
  | 'customer_statement'
  | 'payment_history'
  | 'collection_activity'
  | 'reminder_performance'
  | 'promise_to_pay'
  | 'dispute_summary'
  | 'controller_workload'
  | 'payment_reconciliation'
  | 'unallocated_payments'
  | 'customer_behaviour'
  | 'cash_flow_forecast'
  | 'bad_debt_writeoff'
  | 'collection_cost_efficiency'
  | 'saas_subscription_usage';

export interface ReportDefinition {
  id: StandardReportId;
  name: string;
  number: number;
  category: 'receivables' | 'collections' | 'reconciliation' | 'operations' | 'administration';
  description: string;
  isSensitive?: boolean;
  minRoleRequired?: UserRole;
}

export interface ReportFilterOptions {
  dateFrom: string;
  dateTo: string;
  debtorId: string;
  invoiceId: string;
  currency: string;
  country: string;
  creditController: string;
  ageingBucket: 'all' | 'current' | '1_30' | '31_60' | '61_90' | '90_plus';
  paymentStatus: 'all' | 'paid' | 'partially_paid' | 'unpaid';
  disputeStatus: 'all' | 'disputed' | 'undisputed';
  reminderStatus: 'all' | 'delivered' | 'bounced' | 'opened' | 'pending';
  paymentMethod: 'all' | 'bank_transfer' | 'card_payment' | 'instant_payment' | 'direct_debit';
}

export interface ReportExportLogPayload {
  reportId: StandardReportId;
  reportName: string;
  organizationId: string;
  exportFormat: 'csv' | 'xlsx' | 'pdf';
  rowCount: number;
  totalFinancialValue?: number;
  currency: string;
  appliedFilters: Record<string, any>;
  exportedBy: string;
  exportedByRole: string;
}

// -------------------------------------------------------------
// PART 20 — COLLECTION PERFORMANCE METRICS TYPES
// -------------------------------------------------------------

export type CohortBasis = 'issued_date' | 'due_date' | 'opening_balance';

export interface CollectionRateConfig {
  cohortBasis: CohortBasis;
  cohortStartDate: string;
  cohortEndDate: string;
  collectionPeriodDays: number;
}

export type DaysOverduePopulationType = 
  | 'outstanding_overdue' 
  | 'paid_in_period' 
  | 'cohort_issued_last_90d';

export type AttributionWindowDays = 3 | 7 | 14 | 30;

export interface MetricDefinitionDoc {
  metricId: string;
  name: string;
  formula: string;
  methodology: string;
  populationIncluded: string;
  populationExcluded: string;
  operationalLimitations: string[];
}

export interface ReminderAttributionEvent {
  invoiceId: string;
  invoiceNumber: string;
  debtorName: string;
  reminderId: string;
  reminderSentAt: string;
  reminderChannel: string;
  paymentId: string;
  paymentDate: string;
  paymentAmount: number;
  currency: string;
  daysBetweenReminderAndPayment: number;
  isWithinAttributionWindow: boolean;
}

export interface OverdueBalanceMovementWaterfall {
  currency: string;
  openingOverdue: number;
  newlyOverdue: number;
  recoveredOverdue: number;
  writtenOff: number;
  disputeAdjustments: number;
  closingOverdue: number;
}

// -------------------------------------------------------------
// PART 21 — AUTOMATION RULE BUILDER TYPES
// -------------------------------------------------------------

// 21.1 Trigger Types
export type AutomationTriggerType =
  | 'invoice_created'
  | 'invoice_approaching_due'
  | 'invoice_overdue'
  | 'payment_recorded'
  | 'payment_allocated'
  | 'payment_reversed'
  | 'promise_created'
  | 'promise_missed'
  | 'customer_response_received'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'reminder_failed'
  | 'balance_zero';

// 21.2 Condition Field Types
export type ConditionField =
  | 'days_overdue'
  | 'outstanding_amount'
  | 'currency'
  | 'customer_category'
  | 'invoice_status'
  | 'payment_history'
  | 'reminder_count'
  | 'dispute_status'
  | 'assigned_controller'
  | 'communication_preference'
  | 'account_hold_status';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'in_list';

export interface AutomationCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number;
  logicalOperator?: 'AND' | 'OR'; // chained with next condition
}

// 21.3 Action Types
export type AutomationActionType =
  | 'send_approved_reminder'
  | 'generate_ai_draft'
  | 'create_followup_task'
  | 'assign_account'
  | 'notify_staff_member'
  | 'escalate_account'
  | 'pause_reminders'
  | 'request_human_approval'
  | 'update_workflow_status'
  | 'generate_report'
  | 'notify_customer_payment_verified';

export interface AutomationAction {
  id: string;
  actionType: AutomationActionType;
  parameters: {
    channel?: 'email' | 'whatsapp' | 'sms';
    templateId?: string;
    tone?: string;
    taskTitle?: string;
    taskType?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueOffsetDays?: number;
    assigneeName?: string;
    assigneeId?: string;
    notificationRecipient?: string;
    notificationMessage?: string;
    escalationStage?: string;
    newStatus?: string;
    reportFormat?: 'csv' | 'pdf';
    requiresApproval?: boolean;
    customNote?: string;
  };
}

// 21.4 Safety and Execution Policies
export interface AutomationRuleSafety {
  isTestMode: boolean; // Dry-run / test payload only
  duplicatePreventionCooldownHours: number; // e.g. 24h
  maxRetries: number; // 0, 1, 2, 3
  retryBackoffSeconds: number;
  preventInfiniteLoops: boolean; // recursion guard
  requiresHighVolumeConfirmation: boolean; // prompt if > 10 messages
  highVolumeThreshold: number; // default 10
}

export interface AutomationRuleVersion {
  version: number;
  updatedAt: string;
  updatedBy: string;
  changelog: string;
  triggerType: AutomationTriggerType;
  conditionsCount: number;
  actionsCount: number;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: 'onboarding' | 'early_due' | 'delinquency' | 'payment' | 'dispute' | 'compliance';
  isActive: boolean;
  version: number;
  triggerType: AutomationTriggerType;
  triggerConfig?: {
    approachingDaysOffset?: number; // e.g. 3 days before due
    overdueDaysThreshold?: number; // e.g. 7 days past due
  };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  safety: AutomationRuleSafety;
  versionsHistory: AutomationRuleVersion[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  organizationId: string;
  timestamp: string;
  triggerType: AutomationTriggerType;
  triggerEntityId: string;
  triggerEntityName: string;
  triggerEntityType: 'Invoice' | 'Payment' | 'Promise' | 'Dispute' | 'Debtor';
  isTestRun: boolean;
  isDryRun: boolean;
  status: 'success' | 'failed' | 'blocked_by_safety' | 'skipped_conditions';
  conditionsEvaluated: {
    field: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  actionsExecuted: {
    actionType: string;
    summary: string;
    status: 'completed' | 'queued_approval' | 'simulated';
  }[];
  durationMs: number;
  errorMessage?: string;
  idempotencyKey: string;
}

// -------------------------------------------------------------
// PART 22 — NOTIFICATIONS AND FOLLOW-UP MANAGEMENT TYPES
// -------------------------------------------------------------

export type NotificationCategory =
  | 'delinquency'
  | 'disputes_promises'
  | 'cash_recon'
  | 'integrations'
  | 'subscription'
  | 'security';

export type NotificationType =
  | 'newly_overdue_invoice'
  | 'high_value_overdue'
  | 'new_customer_dispute'
  | 'failed_payment_reminder'
  | 'incoming_customer_reply'
  | 'upcoming_payment_promise'
  | 'missed_payment_promise'
  | 'uploaded_payment_evidence'
  | 'unreconciled_payment'
  | 'integration_failure'
  | 'subscription_status_change'
  | 'important_security_event';

export type NotificationSeverity = 'info' | 'warning' | 'urgent' | 'critical';

export interface AppNotification {
  id: string;
  organizationId: string;
  type: NotificationType;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  readAt?: string;
  targetTab: string; // e.g. 'invoices', 'disputes', 'promises', 'payments', 'integrations', 'admin', 'auditlog'
  targetEntityId?: string;
  targetEntityType?: 'Invoice' | 'Debtor' | 'Dispute' | 'Promise' | 'Payment' | 'Integration' | 'Security';
  targetEntityName?: string;
  amount?: number;
  currency?: string;
  allowedRoles: UserRole[];
  isConfidentialCustomerInfo?: boolean;
  sanitizedMessageForViewers?: string;
  emailDispatched?: boolean;
  emailDispatchedTo?: string;
}

export interface NotificationTypePreference {
  inApp: boolean;
  email: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  organizationId: string;
  emailEnabled: boolean;
  emailAddress: string;
  highValueOverdueThreshold: number;
  promiseAdvanceHours: number;
  digestFrequency: 'immediate' | 'hourly' | 'daily_morning';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  typesConfig: Record<NotificationType, NotificationTypePreference>;
}

// -------------------------------------------------------------
// PART 23 — INTEGRATIONS FRAMEWORK TYPES
// -------------------------------------------------------------

export type IntegrationCategory =
  | 'email'
  | 'whatsapp'
  | 'payments'
  | 'accounting_erp'
  | 'webhooks'
  | 'api_framework';

export type IntegrationConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'pending_verification'
  | 'error'
  | 'syncing'
  | 'disabled';

export type IntegrationReadiness =
  | 'live_tested'
  | 'adapter_available'
  | 'roadmap_specification';

export interface IntegrationConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'url';
  required: boolean;
  valueMasked?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

export interface IntegrationWebhookInfo {
  isSupported: boolean;
  isListening: boolean;
  endpointUrl: string;
  signatureAlgorithm: 'HMAC-SHA256' | 'Bearer-Secret' | 'Ed25519';
  secretMasked?: string;
  lastPayloadAt?: string;
  lastPayloadStatus?: 'success' | 'rejected_signature' | 'error';
  replayAttackProtection: boolean;
}

export interface IntegrationExecutionEvent {
  timestamp: string;
  eventType: string;
  summary: string;
  durationMs?: number;
  payloadRef?: string;
  diagnosticDetails?: string;
}

export interface IntegrationErrorInfo {
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  resolutionAdvice: string;
}

export interface ComprehensiveIntegration {
  id: string;
  organizationId: string;
  provider: string; // e.g. 'SendGrid', 'Meta WhatsApp Cloud API', 'Stripe', 'Xero', 'QuickBooks Online', 'Sage', 'GoCardless'
  category: IntegrationCategory;
  description: string;
  connectionStatus: IntegrationConnectionStatus;
  isEnabled: boolean;
  readiness: IntegrationReadiness;
  jurisdictionsSupported: string[]; // e.g. ['UK', 'EU', 'US', 'ZA']
  requiredConfigs: IntegrationConfigField[];
  webhookInfo?: IntegrationWebhookInfo;
  lastSuccessfulEvent?: IntegrationExecutionEvent;
  lastError?: IntegrationErrorInfo;
  documentation: {
    overview: string;
    setupSteps: string[];
    requiredScopes: string[];
    rateLimitPolicy: string;
    apiEndpointsUsed: string[];
  };
  permissionsAndLimitations: {
    tenantIsolationRule: string;
    dataAccessScopes: string[];
    readOnlyOptions: boolean;
    operationalLimits: string[];
  };
}

// 23.5 Secure Inbound Webhook Event Record
export interface InboundWebhookEvent {
  id: string;
  organizationId: string;
  provider: string;
  eventType: string;
  timestamp: string;
  headers: Record<string, string>;
  rawPayload: Record<string, any>;
  signatureValid: boolean;
  idempotencyKey: string;
  processingStatus: 'processed' | 'rejected_signature' | 'rejected_duplicate' | 'error';
  processingDurationMs: number;
  processingError?: string;
  entityAffected?: string;
  verifiedByServer: boolean; // Confirms payment/event was cryptographically verified, not client-trusted
}

// 23.6 API Framework Keys & Logs
export type ApiKeyScope =
  | 'invoices:read'
  | 'invoices:write'
  | 'debtors:read'
  | 'debtors:write'
  | 'payments:read'
  | 'payments:write'
  | 'disputes:read'
  | 'promises:read'
  | 'reports:read'
  | 'webhooks:manage';

export interface ExternalApiKey {
  id: string;
  organizationId: string;
  keyName: string;
  keyPrefix: string; // e.g. 'cnt_live_a982...'
  scopes: ApiKeyScope[];
  status: 'active' | 'revoked' | 'expired';
  rateLimitPerMinute: number;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  lastUsedAt?: string;
  totalRequests: number;
}

export interface ExternalApiRequestLog {
  id: string;
  apiKeyId: string;
  keyName: string;
  organizationId: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  statusCode: number;
  ipAddress: string;
  latencyMs: number;
  rateLimitRemaining: number;
  idempotencyKey?: string;
  errorMessage?: string;
}

// -------------------------------------------------------------
// PART 24 — SUBSCRIPTION BILLING AND MONETISATION TYPES
// -------------------------------------------------------------

export type SubscriptionPlanId = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export type SubscriptionBillingInterval = 'monthly' | 'annual';

export interface PlanFeatureLimits {
  maxOrganizations: number;
  maxUsers: number;
  maxActiveInvoices: number;
  maxCustomers: number;
  monthlyAiRequestsLimit: number;
  monthlyAiTokensLimit: number;
  monthlyRemindersLimit: number;
  monthlyWhatsAppLimit: number;
  monthlyEmailLimit: number;
  storageMbLimit: number;
  apiRequestsPerMinute: number;
  allowAutomatedWorkflows: boolean;
  allowAdvancedIntegrations: boolean;
  allowAdvancedAnalytics: boolean;
  allowCustomBranding: boolean;
  allowUnlimitedAi: boolean;
  allowCashForecast: boolean;
  allowReconciliation: boolean;
  allowApiAccess: boolean;
  allowMultiDepartment: boolean;
  allowCustomWorkflows: boolean;
  supportTier: 'community_standard' | 'standard_email' | 'priority_sla' | 'dedicated_account_manager';
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  targetAudience: string;
  monthlyPriceUsd: number;
  annualPriceUsdPerMonth: number;
  annualBillingTotalUsd: number;
  currency: string;
  isCustomQuote: boolean;
  isPopular?: boolean;
  isPubliclyAvailable: boolean;
  trialDurationDays: number;
  gracePeriodDays: number;
  limits: PlanFeatureLimits;
  featureBullets: string[];
  restrictions: string[];
  commercialPricingDisclaimer: string;
}

export interface SubscriberUsageMetrics {
  activeInvoicesCount: number;
  customersCount: number;
  usersCount: number;
  aiRequestsThisMonth: number;
  aiTokensThisMonth: number;
  remindersDispatchedThisMonth: number;
  whatsAppMessagesThisMonth: number;
  emailVolumeThisMonth: number;
  storageMbUsed: number;
  apiRequestsThisMonth: number;
}

export interface SubscriptionPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  billingEmail: string;
  hostedProvider: 'stripe_billing' | 'mock_provider';
}

export interface SubscriptionInvoice {
  id: string;
  organizationId: string;
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  currency: string;
  taxAmount: number;
  taxRatePercent: number;
  planName: string;
  billingInterval: SubscriptionBillingInterval;
  status: 'paid' | 'open' | 'past_due' | 'void';
  paymentReference?: string;
  hostedInvoiceUrl?: string;
  downloadPdfUrl?: string;
  taxInvoiceDetails: {
    cntCollectVatNumber: string;
    cntCollectAddress: string;
    subscriberVatNumber?: string;
    domainSeparationNotice: string;
  };
}

export interface OrganizationSubscriptionState {
  organizationId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingInterval: SubscriptionBillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  gracePeriodEndsAt?: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: SubscriptionPaymentMethod;
  invoices: SubscriptionInvoice[];
  activeDiscountPercent: number;
  latestWebhookEventRef?: string;
  verifiedByPaymentGateway: boolean;
}

export interface PlanChangeHistoryRecord {
  id: string;
  organizationId: string;
  timestamp: string;
  changedByUserId: string;
  changedByUserName: string;
  previousPlanId: SubscriptionPlanId;
  newPlanId: SubscriptionPlanId;
  previousInterval: SubscriptionBillingInterval;
  newInterval: SubscriptionBillingInterval;
  reason?: string;
  effectiveDate: string;
}

export interface CommercialPlanAdminAudit {
  id: string;
  timestamp: string;
  adminUserId: string;
  adminUserName: string;
  planId: SubscriptionPlanId;
  action: 'price_modified' | 'limit_updated' | 'availability_toggled' | 'features_edited';
  details: string;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
}

// -------------------------------------------------------------
// PART 25 — SECURITY AND DATA PROTECTION TYPES
// -------------------------------------------------------------

export type FinancialSafeguardRuleId =
  | 'NO_FABRICATED_PAYMENTS'
  | 'NO_EMAIL_BANK_CHANGE'
  | 'NO_UNVERIFIED_POP'
  | 'NO_UNAUTHORIZED_DISBURSEMENT'
  | 'NO_AI_WRITEOFF'
  | 'NO_HIDDEN_ADJUSTMENTS'
  | 'NO_AUDIT_DELETION'
  | 'NO_UNVERIFIED_INVOICE_ACCESS'
  | 'NO_UNSUPPORTED_FRAUD_ALLEGATIONS'
  | 'NO_UNAPPROVED_LEGAL_THREATS';

export interface FinancialSafeguardCheck {
  ruleId: FinancialSafeguardRuleId;
  ruleNumber: number;
  name: string;
  invariantDescription: string;
  status: 'enforced' | 'tested_passed';
  enforcementMechanism: string;
  lastTestedAt: string;
  violationsPreventedCount: number;
  testOutcomeMessage?: string;
  securityDomain: 'Ledger Integrity' | 'Anti-Phishing' | 'Cash Controls' | 'AI Boundaries' | 'Audit Immutability' | 'Communications Compliance';
}

export type DsrRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
export type DsrStatus = 'pending_identity_verification' | 'in_review' | 'statutory_conflict_checked' | 'fulfilled' | 'rejected';
export type PrivacyJurisdiction = 'POPIA_ZA' | 'GDPR_EU_UK' | 'CCPA_US' | 'GENERIC_GLOBAL';

export interface DataSubjectRequest {
  id: string;
  organizationId: string;
  debtorId?: string;
  debtorName?: string;
  requesterName: string;
  requesterEmail: string;
  requestType: DsrRequestType;
  jurisdiction: PrivacyJurisdiction;
  status: DsrStatus;
  dateSubmitted: string;
  statutoryDueDate: string;
  identityVerificationMethod: 'two_factor_email' | 'government_id' | 'portal_credential';
  identityVerified: boolean;
  statutoryConflictNote?: string; // e.g. "Erasure cannot delete active unpaid invoices or 7-year HMRC/SARS tax ledger records."
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  exportDataSummary?: {
    personalDataRecords: number;
    financialTransactionsRetained: number;
    communicationsRedacted: number;
    downloadUrl?: string;
  };
}

export interface DataRetentionPolicy {
  id: string;
  organizationId: string;
  entityType: 'financial_records' | 'personal_information' | 'communications' | 'audit_events' | 'uploaded_documents';
  jurisdiction: PrivacyJurisdiction;
  retentionPeriodYears: number;
  statutoryLegalBasis: string; // e.g. "Section 29 SARS Tax Administration Act / Companies Act 2006 s.386"
  autoPurgeEnabled: boolean;
  requiresDualApprovalForPurge: boolean;
  lastPurgeRunAt?: string;
  recordsPreservedCount: number;
}

export interface SecurityIncidentRecord {
  id: string;
  organizationId: string;
  incidentDate: string;
  detectionDate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'regulator_notified' | 'closed';
  affectedRecordsCount: number;
  affectedDataTypes: string[];
  description: string;
  rootCause: string;
  remediationSteps: string;
  popiaSection22Notified: boolean;
  gdprArticle33Notified: boolean;
  informationRegulatorNotificationDate?: string;
  dataSubjectsNotifiedDate?: string;
  closedAt?: string;
}

export interface BankDetailsChangeRequest {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  channel: 'unsolicited_email' | 'formal_signed_letter' | 'in_person_mandate';
  requestedBankName: string;
  requestedAccountNumber: string;
  requestedRoutingCode: string;
  status: 'pending_callback_verification' | 'verified_dual_signoff' | 'rejected_phishing_suspected';
  callbackPhoneNumberUsed?: string;
  callbackVerifierName?: string;
  callbackTimestamp?: string;
  secondaryApproverName?: string;
  dualSignoffCompleted: boolean;
  antiPhishingCheckSummary: string;
}

export interface VulnerabilityAuditItem {
  id: string;
  packageName: string;
  installedVersion: string;
  fixedVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cveId: string;
  title: string;
  status: 'patched' | 'remediated' | 'mitigated';
}

export interface SecurityHeaderAudit {
  name: string;
  value: string;
  recommendedValue: string;
  status: 'enforced' | 'warning';
  purpose: string;
}

export interface RoPARecord {
  id: string;
  processingActivity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjectTypes: string[];
  recipients: string[];
  internationalTransfers: string;
  retentionPeriod: string;
  securityMeasures: string;
}

// ============================================================================
// PART 28 — FILE STORAGE AND DOCUMENT MANAGEMENT
// ============================================================================

export type DocumentCategory = 
  | 'invoice_document'
  | 'proof_of_payment'
  | 'credit_note'
  | 'dispute_evidence'
  | 'imported_file'
  | 'exported_report';

export type MalwareScanStatus = 'clean' | 'scanning' | 'quarantined' | 'threat_detected';

export type StorageAccessTier = 'private_restricted' | 'tenant_internal' | 'portal_restricted';

export interface StoredDocument {
  id: string;
  organizationId: string;
  fileName: string;
  originalFileName: string;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  formattedSize: string;
  storagePath: string; // Cloud Object Storage path e.g. gs://cntcollect-vault-{tenant}/...
  bucketName: string;
  sha256Checksum: string;
  encryptionAlgorithm: 'AES-256-GCM' | 'Google-Managed-KMS';
  malwareScanStatus: MalwareScanStatus;
  malwareScanDetails?: string;
  scannedAt?: string;
  uploadedBy: string;
  uploadedByUserId: string;
  uploadedAt: string;
  retentionYears: number;
  retentionExpiresAt: string;
  isUnderLegalHold: boolean;
  isSoftDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  associatedEntityId?: string;
  associatedEntityType?: 'invoice' | 'payment' | 'dispute' | 'credit_note' | 'debtor' | 'report' | 'import';
  associatedEntityRef?: string;
  description?: string;
  customerDebtorId?: string;
  customerDebtorName?: string;
}

export interface SignedDownloadUrl {
  url: string;
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
  generatedAt: string;
  generatedByUserId: string;
}

export interface DocumentAccessLog {
  id: string;
  documentId: string;
  documentName: string;
  organizationId: string;
  action: 'UPLOAD' | 'SIGNED_URL_GENERATED' | 'DOWNLOAD_ACCESSED' | 'MALWARE_SCAN' | 'LEGAL_HOLD_APPLIED' | 'SECURE_DELETED';
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  outcome: 'permitted' | 'blocked_unauthorized' | 'blocked_malware_quarantined' | 'blocked_legal_hold';
  details: string;
}

export interface DocumentStorageStats {
  totalDocuments: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  categoryCounts: Record<DocumentCategory, number>;
  cleanFilesCount: number;
  quarantinedCount: number;
  legalHoldCount: number;
  activeSignedUrlsCount: number;
}

// ============================================================================
// PART 29 — COMMAND CENTRE & GLOBAL SEARCH
// ============================================================================

export type CommandActionType = 
  | 'search_invoices'
  | 'search_customers'
  | 'view_overdue'
  | 'create_invoice'
  | 'record_payment'
  | 'generate_reminder_draft'
  | 'review_failed_reminders'
  | 'review_open_disputes'
  | 'review_promises'
  | 'review_payment_evidence'
  | 'create_collection_task'
  | 'open_reports'
  | 'access_integrations';

export interface CommandIntent {
  query: string;
  intentType: string;
  actionClassification: 'READ_ONLY_AUTOMATIC' | 'MUTATION_REQUIRES_CONFIRMATION';
  riskLevel: 'low' | 'medium' | 'high_impact';
  targetDomain: 'invoices' | 'debtors' | 'reminders' | 'disputes' | 'promises' | 'reports' | 'payments' | 'integrations' | 'tasks';
  explanation: string;
  previewData: {
    summary: string;
    affectedCount: number;
    records: Array<{
      id: string;
      title: string;
      subtitle: string;
      amount?: number;
      currency?: string;
      status?: string;
    }>;
    proposedChanges?: string[];
    requiresApproval: boolean;
    approvalReason?: string;
  };
  navigationTarget?: string;
  model: string;
  confidenceScore: number;
}

export interface GlobalSearchResult {
  id: string;
  type: 'invoice' | 'debtor' | 'payment' | 'dispute' | 'promise' | 'document' | 'task';
  title: string;
  subtitle: string;
  status?: string;
  amount?: number;
  currency?: string;
  date?: string;
  targetTab: string;
  entityId: string;
}

// ============================================================================
// PART 30 — PERFORMANCE AND SCALABILITY
// ============================================================================

export interface ScalabilityMetrics {
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  activeDatabaseConnections: number;
  maxDatabaseConnections: number;
  cacheHitRatePercent: number;
  cachedQueriesCount: number;
  rateLimiterTokensRemaining: number;
  rateLimiterWindowSeconds: number;
  activeWorkerThreads: number;
  uptimeSeconds: number;
}

export interface DeadLetterJob {
  id: string;
  jobType: string;
  jobName: string;
  organizationId: string;
  payload: any;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string;
  errorStack?: string;
  status: 'dead_letter' | 'requeued' | 'discarded';
  lastAttemptAt: string;
}

// ============================================================================
// PART 31 — TESTING AND QUALITY ASSURANCE
// ============================================================================

export type TestSuiteCategory = 
  | 'unit' 
  | 'integration' 
  | 'e2e' 
  | 'disputes' 
  | 'tenant_isolation' 
  | 'financial_edge_cases';

export type TestExecutionStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface TestAssertion {
  description: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  durationMs?: number;
}

export interface TestCaseResult {
  id: string;
  title: string;
  category: TestSuiteCategory;
  section: string; // e.g. "31.1", "31.2", "31.3", "31.4", "31.5", "31.6"
  requirementRef: string;
  moduleRef: string;
  status: TestExecutionStatus;
  assertions: TestAssertion[];
  durationMs: number;
  executedAt?: string;
  errorMessage?: string;
  logs?: string[];
}

export interface RequirementsMatrixEntry {
  requirementId: string;
  section: string;
  title: string;
  description: string;
  category: TestSuiteCategory;
  testCaseId: string;
  testStatus: TestExecutionStatus;
  moduleName: string;
  isModuleComplete: boolean;
  assertionsCount: number;
  lastVerifiedAt: string;
}

export interface TestingSuiteSummary {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  runningCount: number;
  totalAssertions: number;
  overallDurationMs: number;
  requirementsCount: number;
  completedModulesCount: number;
  totalModulesCount: number;
  completionRatePercent: number;
  lastRunTimestamp: string;
}

// ============================================================================
// PART 32 — ERROR HANDLING AND OBSERVABILITY
// ============================================================================

export type ErrorCategory =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'import'
  | 'integration'
  | 'ai'
  | 'payment'
  | 'reminder'
  | 'network'
  | 'rate_limit'
  | 'database'
  | 'storage'
  | 'system';

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ObservabilityIncident {
  id: string;
  timestamp: string;
  organizationId: string;
  errorCode: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userFriendlyMessage: string;
  diagnosticDetails: string;
  sanitizedContext: Record<string, any>;
  isRetryable: boolean;
  retryCount: number;
  maxRetries: number;
  status: 'active' | 'investigating' | 'resolved' | 'retried';
  resolvedAt?: string;
  resolvedBy?: string;
  traceId: string;
  targetEntityId?: string;
  targetEntityType?: string;
}

export interface SubsystemHealth {
  name: string;
  key: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: string;
  details: string;
}

export interface OperationalAlert {
  id: string;
  severity: ErrorSeverity;
  title: string;
  description: string;
  affectedSubsystem: string;
  triggeredAt: string;
  isAcknowledged: boolean;
  suggestedRemediation?: string;
}

export interface NinePointTrackingStatus {
  domainKey: string;
  domainName: string;
  metricLabel: string;
  currentStatus: 'healthy' | 'degraded' | 'monitored';
  trackedCountOrValue: string;
  lastIncidentAt: string;
  autoRemediation: string;
}

export interface ObservabilityDashboardState {
  healthChecks: SubsystemHealth[];
  activeAlerts: OperationalAlert[];
  incidents: ObservabilityIncident[];
  ninePointTracking?: NinePointTrackingStatus[];
  metrics: {
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRatePercent: number;
    activeIncidentsCount: number;
    failedJobsCount: number;
    failedRemindersCount: number;
    failedWebhooksCount: number;
  };
}

// ==========================================
// PART 33: DEPLOYMENT AND PRODUCTION READINESS TYPES
// ==========================================

export type DeploymentCheckStatus = 'passed' | 'warning' | 'failed' | 'pending';

export interface DeploymentCheckItem {
  id: string;
  checkNumber: number;
  title: string;
  requirementClause: string;
  category: 'database' | 'security' | 'infrastructure' | 'communications' | 'financial' | 'compliance';
  status: DeploymentCheckStatus;
  verificationDetails: string;
  lastVerifiedAt: string;
  remediationGuide: string;
  isAutomatedCheck: boolean;
}

export interface EnvironmentConfigItem {
  env: 'development' | 'test' | 'staging' | 'production';
  name: string;
  nodeEnv: string;
  databaseEngine: string;
  storageProvider: string;
  paymentGatewayMode: string;
  emailProviderMode: string;
  authProviderMode: string;
  secretsStorageMechanism: string;
  rateLimitingEnabled: boolean;
  backupCadence: string;
  isCompliant: boolean;
}

export interface ProductionBlocker {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  subsystem: string;
  blockerReason: string;
  requiredAction: string;
  responsibleRole: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface DocumentationMetadata {
  id: string;
  title: string;
  filename: string;
  category: 'api' | 'admin' | 'user' | 'setup' | 'architecture' | 'checklist';
  description: string;
  lastUpdated: string;
  readingTimeMinutes: number;
}

// ==========================================
// PART 34: IMPLEMENTATION ROADMAP TYPES
// ==========================================

export interface RoadmapDeliverable {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  moduleRef: string;
  testCaseRef?: string;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  subtitle: string;
  description: string;
  deliverables: RoadmapDeliverable[];
  acceptanceCriteria: string;
  acceptanceCriteriaMet: boolean;
  verificationDetails: string;
  targetViewTab: string;
  lastVerifiedAt: string;
  status: 'completed' | 'in_progress' | 'pending';
}

export interface RoadmapState {
  phases: RoadmapPhase[];
  overallProgressPercent: number;
  completedPhasesCount: number;
  totalPhasesCount: number;
  totalDeliverablesCount: number;
  completedDeliverablesCount: number;
}

// ==========================================
// PART 35: DEVELOPMENT EXECUTION RULES TYPES
// ==========================================

export type ExecutionRuleDomain = 
  | 'architecture' 
  | 'security' 
  | 'financial_integrity' 
  | 'integrations' 
  | 'ux_quality' 
  | 'governance';

export type ExecutionRuleStatus = 'compliant' | 'monitoring' | 'blocked_by_external';

export interface ExecutionRule {
  ruleNumber: number;
  title: string;
  domain: ExecutionRuleDomain;
  clause: string;
  status: ExecutionRuleStatus;
  codeLocations: string[];
  verificationEvidence: string;
  lastAuditedAt: string;
  completionCriterion: string;
  deliberateLimitations?: string[];
}

export interface DeliberateLimitation {
  id: string;
  ruleNumber: number;
  area: string;
  rationale: string;
  scope: string;
  mitigationOrFutureWork: string;
}

export interface ExternalBlockerRegisterItem {
  id: string;
  service: string;
  blockerType: 'missing_credentials' | 'provider_approval' | 'external_infrastructure' | 'runtime_sandbox';
  description: string;
  requiredInterfaceImplemented: boolean;
  remainingExternalRequirement: string;
  howToUnblock: string;
}

export interface ExecutionRulesState {
  rules: ExecutionRule[];
  deliberateLimitations: DeliberateLimitation[];
  externalBlockers: ExternalBlockerRegisterItem[];
  overallCompliancePercent: number;
  compliantRulesCount: number;
  totalRulesCount: number;
  lastFullAuditTimestamp: string;
}

// ==========================================
// PART 36: FINAL ACCEPTANCE CRITERIA TYPES
// ==========================================

export type FinalAcceptanceCategory =
  | 'core_functionality'
  | 'automation'
  | 'ai'
  | 'customer_portal'
  | 'reporting'
  | 'monetisation'
  | 'security_deployment';

export type AcceptanceStatus = 'satisfied' | 'monitoring' | 'pending';

export interface AcceptanceCriterionItem {
  id: string;
  category: FinalAcceptanceCategory;
  title: string;
  requirement: string;
  status: AcceptanceStatus;
  verifiedEvidence: string;
  testCaseRef?: string;
  targetModule: string;
  lastVerifiedAt: string;
}

export interface PilotSignoffRecord {
  signedOffBy: string;
  role: string;
  organizationId: string;
  signedOffAt: string;
  comments: string;
  pilotVersion: string;
  releaseEnvironment: string;
  isAuthorized: boolean;
}

export interface PilotReadinessSummary {
  isReadyForPilot: boolean;
  totalCriteria: number;
  satisfiedCriteria: number;
  percentSatisfied: number;
  criteriaByCategory: Record<
    FinalAcceptanceCategory,
    { total: number; satisfied: number; percent: number }
  >;
  criteria: AcceptanceCriterionItem[];
  pilotSignoff: PilotSignoffRecord | null;
  lastFullEvaluationAt: string;
}
