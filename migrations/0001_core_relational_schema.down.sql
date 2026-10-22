-- ============================================================================
-- CNTCollect Relational Database Rollback: 0001_core_relational_schema.down.sql
-- Part 27: Rollback for Core Normalized Schema Tables (Foreign Key Safe Order)
-- ============================================================================

BEGIN;

-- 27.9 Platform Operations
DROP TABLE IF EXISTS support_cases CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS import_errors CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS integration_events CASCADE;
DROP TABLE IF EXISTS integration_configurations CASCADE;

-- 27.8 SaaS Monetisation & Subscriptions
DROP TABLE IF EXISTS billing_webhook_events CASCADE;
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS billing_invoices CASCADE;
DROP TABLE IF EXISTS billing_customers CASCADE;
DROP TABLE IF EXISTS subscription_events CASCADE;
DROP TABLE IF EXISTS organisation_subscriptions CASCADE;
DROP TABLE IF EXISTS plan_limits CASCADE;
DROP TABLE IF EXISTS plan_features CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- 27.7 Reporting & Snapshots
DROP TABLE IF EXISTS forecast_runs CASCADE;
DROP TABLE IF EXISTS receivables_snapshots CASCADE;
DROP TABLE IF EXISTS report_exports CASCADE;
DROP TABLE IF EXISTS saved_filters CASCADE;
DROP TABLE IF EXISTS report_definitions CASCADE;

-- 27.6 Portal
DROP TABLE IF EXISTS customer_queries CASCADE;
DROP TABLE IF EXISTS customer_payment_intentions CASCADE;
DROP TABLE IF EXISTS portal_events CASCADE;
DROP TABLE IF EXISTS portal_invitations CASCADE;
DROP TABLE IF EXISTS customer_portal_accounts CASCADE;

-- 27.5 AI Governance
DROP TABLE IF EXISTS ai_summaries CASCADE;
DROP TABLE IF EXISTS ai_classifications CASCADE;
DROP TABLE IF EXISTS ai_generated_drafts CASCADE;
DROP TABLE IF EXISTS ai_usage_records CASCADE;
DROP TABLE IF EXISTS ai_requests CASCADE;

-- 27.4 Collections & Workflows
DROP TABLE IF EXISTS collection_notes CASCADE;
DROP TABLE IF EXISTS dispute_events CASCADE;
DROP TABLE IF EXISTS debtor_disputes CASCADE;
DROP TABLE IF EXISTS payment_promises CASCADE;
DROP TABLE IF EXISTS collection_tasks CASCADE;
DROP TABLE IF EXISTS communication_delivery_events CASCADE;
DROP TABLE IF EXISTS communication_events CASCADE;
DROP TABLE IF EXISTS reminder_schedules CASCADE;
DROP TABLE IF EXISTS reminder_templates CASCADE;
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflow_rules CASCADE;
DROP TABLE IF EXISTS workflow_versions CASCADE;
DROP TABLE IF EXISTS collection_workflows CASCADE;

-- 27.3 Accounts Receivable
DROP TABLE IF EXISTS payment_reconciliation_records CASCADE;
DROP TABLE IF EXISTS payment_evidence CASCADE;
DROP TABLE IF EXISTS payment_reversals CASCADE;
DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS credit_note_allocations CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS invoice_adjustments CASCADE;
DROP TABLE IF EXISTS invoice_lines CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- 27.2 Customer & Debtor Records
DROP TABLE IF EXISTS customer_documents CASCADE;
DROP TABLE IF EXISTS customer_notes CASCADE;
DROP TABLE IF EXISTS customer_preferences CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customer_contacts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 27.1 Identity & Tenancy
DROP TABLE IF EXISTS organisation_settings CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS organisation_memberships CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;

COMMIT;
