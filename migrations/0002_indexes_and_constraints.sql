-- ============================================================================
-- CNTCollect Relational Database Migration: 0002_indexes_and_constraints.sql
-- Part 27.10: Tenant-Aware Composite Indexes, Partial Indexes, and Integrity
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TENANT-AWARE COMPOSITE INDEXES & PERFORMANCE OPTIMISATIONS
-- Rule 27.10: Every organisation-owned entity must have tenant-aware indexes
-- ----------------------------------------------------------------------------

-- Organisations & Memberships
CREATE INDEX IF NOT EXISTS idx_org_slug ON organisations (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON organisation_memberships (user_id, organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_role ON organisation_memberships (role_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON user_sessions (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token_hash) WHERE accepted_at IS NULL;

-- Customers / Debtors
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers (organisation_id, account_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_tier ON customers (organisation_id, risk_tier) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_ref ON customers (organisation_id, customer_reference);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_cust ON customer_contacts (organisation_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_tenant_cust ON customer_addresses (organisation_id, customer_id);

-- Invoices (Core High-Throughput AR Table)
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_due ON invoices (organisation_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_cust ON invoices (organisation_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_num ON invoices (organisation_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_overdue_exposure ON invoices (organisation_id, balance_due_minor_units) WHERE balance_due_minor_units > 0 AND status = 'overdue';
CREATE INDEX IF NOT EXISTS idx_invoices_dispute_pause ON invoices (organisation_id, dispute_status) WHERE dispute_status != 'none';
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id);

-- Adjustments & Credit Notes
CREATE INDEX IF NOT EXISTS idx_adjustments_tenant_invoice ON invoice_adjustments (organisation_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant_cust ON credit_notes (organisation_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_cn ON credit_note_allocations (credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_inv ON credit_note_allocations (invoice_id);

-- Payments & Reversals & Allocations
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON payments (organisation_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_recon ON payments (organisation_id, reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_cust ON payments (organisation_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reversals_payment ON payment_reversals (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_tenant_status ON payment_evidence (organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_tenant ON payment_reconciliation_records (organisation_id, matched_at DESC);

-- Collections & Workflows
CREATE INDEX IF NOT EXISTS idx_workflow_executions_idempotency ON workflow_executions (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant_inv ON workflow_executions (organisation_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_tenant_date ON reminder_schedules (organisation_id, scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_communication_events_tenant_cust ON communication_events (organisation_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_delivery_comm ON communication_delivery_events (communication_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_tenant_assignee ON collection_tasks (organisation_id, assigned_user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_promises_tenant_status_date ON payment_promises (organisation_id, status, promised_date);
CREATE INDEX IF NOT EXISTS idx_disputes_tenant_status ON debtor_disputes (organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_tenant_inv ON debtor_disputes (organisation_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute ON dispute_events (dispute_id, created_at ASC);

-- AI Telemetry & Metering
CREATE INDEX IF NOT EXISTS idx_ai_requests_tenant_created ON ai_requests (organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_tenant_entity ON ai_summaries (organisation_id, entity_type, entity_id);

-- Portal & Self-Service
CREATE INDEX IF NOT EXISTS idx_portal_accounts_token ON customer_portal_accounts (access_token_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_portal_events_tenant_cust ON portal_events (organisation_id, customer_id, occurred_at DESC);

-- SaaS Subscriptions & Invoicing (Strict Separation)
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON organisation_subscriptions (organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices (organisation_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_metric ON usage_records (organisation_id, metric_code);
CREATE INDEX IF NOT EXISTS idx_billing_webhooks_event ON billing_webhook_events (provider_event_id);

-- Audit Trail (Forensic Immutability & Chained Hash Verification)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs (organisation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs (organisation_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs (record_hash);

-- ----------------------------------------------------------------------------
-- 2. IMMUTABLE AUDIT TRAIL TRIGGER (PREVENT ROW UPDATE OR DELETE)
-- Invariant: "Protect audit records from ordinary user deletion" (Section 26)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PART 26 INVARIANT VIOLATION: Audit log records are cryptographically chained and permanently immutable. Modification or deletion is strictly prohibited by financial operations security policy.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

COMMIT;
