-- ============================================================================
-- CNTCollect Relational Database Rollback: 0002_indexes_and_constraints.down.sql
-- Part 27: Rollback for Tenant-Aware Composite Indexes, Triggers, and Constraints
-- ============================================================================

BEGIN;

-- Drop Triggers & Trigger Functions
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_modification();

-- Drop Audit Trail Indexes
DROP INDEX IF EXISTS idx_audit_logs_hash;
DROP INDEX IF EXISTS idx_audit_logs_correlation;
DROP INDEX IF EXISTS idx_audit_logs_tenant_entity;
DROP INDEX IF EXISTS idx_audit_logs_tenant_timestamp;

-- Drop SaaS Subscription Indexes
DROP INDEX IF EXISTS idx_billing_webhooks_event;
DROP INDEX IF EXISTS idx_usage_records_tenant_metric;
DROP INDEX IF EXISTS idx_billing_invoices_tenant;
DROP INDEX IF EXISTS idx_subscriptions_tenant_status;

-- Drop Portal Indexes
DROP INDEX IF EXISTS idx_portal_events_tenant_cust;
DROP INDEX IF EXISTS idx_portal_accounts_token;

-- Drop AI Metering Indexes
DROP INDEX IF EXISTS idx_ai_summaries_tenant_entity;
DROP INDEX IF EXISTS idx_ai_requests_tenant_created;

-- Drop Collections & Workflow Indexes
DROP INDEX IF EXISTS idx_dispute_events_dispute;
DROP INDEX IF EXISTS idx_disputes_tenant_inv;
DROP INDEX IF EXISTS idx_disputes_tenant_status;
DROP INDEX IF EXISTS idx_promises_tenant_status_date;
DROP INDEX IF EXISTS idx_collection_tasks_tenant_assignee;
DROP INDEX IF EXISTS idx_communication_delivery_comm;
DROP INDEX IF EXISTS idx_communication_events_tenant_cust;
DROP INDEX IF EXISTS idx_reminder_schedules_tenant_date;
DROP INDEX IF EXISTS idx_workflow_executions_tenant_inv;
DROP INDEX IF EXISTS idx_workflow_executions_idempotency;

-- Drop Reconciliation & Payments Indexes
DROP INDEX IF EXISTS idx_reconciliation_records_tenant;
DROP INDEX IF EXISTS idx_payment_evidence_tenant_status;
DROP INDEX IF EXISTS idx_payment_reversals_payment;
DROP INDEX IF EXISTS idx_payment_allocations_invoice;
DROP INDEX IF EXISTS idx_payment_allocations_payment;
DROP INDEX IF EXISTS idx_payments_tenant_cust;
DROP INDEX IF EXISTS idx_payments_tenant_recon;
DROP INDEX IF EXISTS idx_payments_tenant_date;

-- Drop Adjustments & Credit Note Indexes
DROP INDEX IF EXISTS idx_credit_note_allocations_inv;
DROP INDEX IF EXISTS idx_credit_note_allocations_cn;
DROP INDEX IF EXISTS idx_credit_notes_tenant_cust;
DROP INDEX IF EXISTS idx_adjustments_tenant_invoice;

-- Drop Invoices Indexes
DROP INDEX IF EXISTS idx_invoice_lines_invoice;
DROP INDEX IF EXISTS idx_invoices_dispute_pause;
DROP INDEX IF EXISTS idx_invoices_overdue_exposure;
DROP INDEX IF EXISTS idx_invoices_tenant_num;
DROP INDEX IF EXISTS idx_invoices_tenant_cust;
DROP INDEX IF EXISTS idx_invoices_tenant_status_due;

-- Drop Customer & Tenancy Indexes
DROP INDEX IF EXISTS idx_customer_addresses_tenant_cust;
DROP INDEX IF EXISTS idx_customer_contacts_tenant_cust;
DROP INDEX IF EXISTS idx_customers_tenant_ref;
DROP INDEX IF EXISTS idx_customers_tenant_tier;
DROP INDEX IF EXISTS idx_customers_tenant_status;
DROP INDEX IF EXISTS idx_invitations_token;
DROP INDEX IF EXISTS idx_user_sessions_lookup;
DROP INDEX IF EXISTS idx_memberships_role;
DROP INDEX IF EXISTS idx_memberships_user_org;
DROP INDEX IF EXISTS idx_org_slug;

COMMIT;
