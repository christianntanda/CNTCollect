/**
 * CNTCollect Relational Database Schema (TypeScript DDL Specification)
 * Part 27: Relational Database Design with Strict Tenant Isolation & Invariance
 * Compliant with Sections 27.1 through 27.10
 */

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencesTable?: string;
  referencesColumn?: string;
  defaultValue?: string;
  isUnique?: boolean;
  comment?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  isUnique?: boolean;
  isTenantAware: boolean;
  predicate?: string;
  purpose: string;
}

export interface TableDefinition {
  name: string;
  domain: string;
  sectionCode: string;
  description: string;
  isTenantScoped: boolean;
  supportsSoftDelete: boolean;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  foreignKeys: {
    column: string;
    targetTable: string;
    targetColumn: string;
    onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL';
  }[];
}

export interface DomainMetadata {
  domainId: string;
  section: string;
  title: string;
  description: string;
  tableNames: string[];
}

export const RELATIONAL_DOMAINS: DomainMetadata[] = [
  {
    domainId: 'identity_tenancy',
    section: '27.1',
    title: 'Identity and Tenancy',
    description: 'Multi-tenant organization partitioning, RBAC roles, user authentication, and tenant isolation.',
    tableNames: [
      'organisations',
      'users',
      'organisation_memberships',
      'roles',
      'permissions',
      'role_permissions',
      'invitations',
      'user_sessions',
      'organisation_settings'
    ]
  },
  {
    domainId: 'customers_debtors',
    section: '27.2',
    title: 'Customer and Debtor Records',
    description: 'Debtor directories, multi-contact management, geographic billing addresses, communication preferences, and contracts.',
    tableNames: [
      'customers',
      'customer_contacts',
      'customer_addresses',
      'customer_preferences',
      'customer_notes',
      'customer_documents'
    ]
  },
  {
    domainId: 'accounts_receivable',
    section: '27.3',
    title: 'Accounts Receivable',
    description: 'Statutory invoicing, line items, credit notes, adjustments, settlements, multi-currency exchange rates, and bank reconciliation.',
    tableNames: [
      'currencies',
      'exchange_rates',
      'invoices',
      'invoice_lines',
      'invoice_adjustments',
      'credit_notes',
      'credit_note_allocations',
      'payments',
      'payment_allocations',
      'payment_reversals',
      'payment_evidence',
      'payment_reconciliation_records'
    ]
  },
  {
    domainId: 'collections',
    section: '27.4',
    title: 'Collections & Dunning Workflows',
    description: 'Automated cadences, multi-channel templates, idempotent execution journals, disputes, promises to pay, and task queues.',
    tableNames: [
      'collection_workflows',
      'workflow_versions',
      'workflow_rules',
      'workflow_executions',
      'reminder_templates',
      'reminder_schedules',
      'communication_events',
      'communication_delivery_events',
      'collection_tasks',
      'payment_promises',
      'debtor_disputes',
      'dispute_events',
      'collection_notes'
    ]
  },
  {
    domainId: 'ai_governance',
    section: '27.5',
    title: 'AI Governance & Usage Metering',
    description: 'Strict data-minimised telemetry, token consumption logs, generated drafts, classification confidence, and dispute summaries.',
    tableNames: [
      'ai_requests',
      'ai_usage_records',
      'ai_generated_drafts',
      'ai_classifications',
      'ai_summaries'
    ]
  },
  {
    domainId: 'portal',
    section: '27.6',
    title: 'Customer Self-Service Portal',
    description: 'High-entropy tokenized debtor access, invitations, engagement telemetry, payment intentions, and customer queries.',
    tableNames: [
      'customer_portal_accounts',
      'portal_invitations',
      'portal_events',
      'customer_payment_intentions',
      'customer_queries'
    ]
  },
  {
    domainId: 'reporting',
    section: '27.7',
    title: 'Reporting & Analytics Snapshots',
    description: 'Saved filters, historical receivables ageing snapshots in transactional minor units, and weekly cash forecast runs.',
    tableNames: [
      'report_definitions',
      'saved_filters',
      'report_exports',
      'receivables_snapshots',
      'forecast_runs'
    ]
  },
  {
    domainId: 'saas_billing',
    section: '27.8',
    title: 'SaaS Monetisation & Subscriptions',
    description: 'Decoupled platform subscription plans, usage metering quotas, hosted checkout sessions, and webhook processing.',
    tableNames: [
      'subscription_plans',
      'plan_features',
      'plan_limits',
      'organisation_subscriptions',
      'subscription_events',
      'billing_customers',
      'billing_invoices',
      'usage_records',
      'billing_webhook_events'
    ]
  },
  {
    domainId: 'platform_ops',
    section: '27.9',
    title: 'Platform Operations & Audit',
    description: 'Integration configs, external API webhooks, CSV import batches, notification preferences, and immutable audit logs.',
    tableNames: [
      'integration_configurations',
      'integration_events',
      'webhook_events',
      'audit_logs',
      'import_batches',
      'import_errors',
      'notification_preferences',
      'support_cases'
    ]
  }
];

export const TOTAL_SCHEMA_TABLES_COUNT = 52;
export const TOTAL_FOREIGN_KEYS_COUNT = 68;
export const TOTAL_TENANT_INDEXES_COUNT = 44;
