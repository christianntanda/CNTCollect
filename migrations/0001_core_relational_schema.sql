-- ============================================================================
-- CNTCollect Relational Database Migration: 0001_core_relational_schema.sql
-- Part 27: Relational Database Design with Strict Tenant Isolation & Invariance
-- Compliant with Sections 27.1 through 27.10
-- Target Engine: PostgreSQL 16+ / Cloud SQL
-- ============================================================================

BEGIN;

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 27.1 IDENTITY AND TENANCY
-- ============================================================================

-- Organisations (Root Tenant Entity)
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_identifier VARCHAR(100),
    country_code CHAR(2) NOT NULL,
    primary_currency CHAR(3) NOT NULL DEFAULT 'GBP',
    default_language VARCHAR(10) NOT NULL DEFAULT 'en',
    time_zone VARCHAR(64) NOT NULL DEFAULT 'Europe/London',
    financial_year_end VARCHAR(20) DEFAULT '31-12',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Users (Global Authentication Principals)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret_encrypted VARCHAR(255),
    is_platform_admin BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Roles (Tenancy-scoped or System Roles)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_roles_org_code UNIQUE (organisation_id, code)
);

-- Permissions (Granular System Capabilities)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Role Permissions (RBAC Junction)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (role_id, permission_id)
);

-- Organisation Memberships (User-Tenant Association)
CREATE TABLE IF NOT EXISTS organisation_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    job_title VARCHAR(100),
    is_owner BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_queue_id VARCHAR(64),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_org_memberships_user UNIQUE (organisation_id, user_id)
);

-- User Sessions (Stateful Security & Token Invalidation)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(128),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Invitations (Staff Onboarding Workflow)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_invitations_org_email UNIQUE (organisation_id, email, token_hash)
);

-- Organisation Settings (Tenant Preferences & Branding)
CREATE TABLE IF NOT EXISTS organisation_settings (
    organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_prefix VARCHAR(16) NOT NULL DEFAULT 'INV-',
    next_invoice_number INTEGER NOT NULL DEFAULT 1001,
    default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
    base_late_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 8.00,
    auto_dunning_enabled BOOLEAN NOT NULL DEFAULT true,
    grace_period_days INTEGER NOT NULL DEFAULT 3,
    primary_color_hex VARCHAR(7) NOT NULL DEFAULT '#4f46e5',
    logo_storage_path TEXT,
    bank_name VARCHAR(150),
    bank_account_name VARCHAR(150),
    bank_iban_encrypted TEXT,
    bank_swift_bic VARCHAR(32),
    retention_financial_years INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.2 CUSTOMER AND DEBTOR RECORDS
-- ============================================================================

-- Customers / Debtors
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_reference VARCHAR(64) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    customer_type VARCHAR(32) NOT NULL DEFAULT 'corporate', -- corporate, smb, government, individual
    company_registration_number VARCHAR(100),
    tax_identifier VARCHAR(100),
    default_currency CHAR(3) NOT NULL DEFAULT 'GBP',
    credit_limit_minor_units BIGINT NOT NULL DEFAULT 0,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    risk_tier VARCHAR(20) NOT NULL DEFAULT 'moderate', -- low, moderate, elevated, severe, critical
    behavior_segment VARCHAR(32) DEFAULT 'standard',
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, on_hold, under_review, suspended, closed
    assigned_controller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    portal_access_enabled BOOLEAN NOT NULL DEFAULT true,
    portal_token_hash VARCHAR(128) UNIQUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_customers_org_reference UNIQUE (organisation_id, customer_reference)
);

-- Customer Contacts
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_type VARCHAR(32) NOT NULL DEFAULT 'accounts_payable', -- primary, accounts_payable, purchasing, executive
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    job_title VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type VARCHAR(32) NOT NULL DEFAULT 'billing', -- billing, shipping, registered_office
    street_line1 VARCHAR(255) NOT NULL,
    street_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(32) NOT NULL,
    country_code CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Customer Preferences
CREATE TABLE IF NOT EXISTS customer_preferences (
    customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    preferred_channel VARCHAR(32) NOT NULL DEFAULT 'email', -- email, whatsapp, portal, post
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    reminder_opt_in BOOLEAN NOT NULL DEFAULT true,
    opt_in_timestamp TIMESTAMPTZ,
    opt_in_channel VARCHAR(32),
    send_statement_cadence VARCHAR(20) DEFAULT 'monthly',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Customer Notes
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category VARCHAR(32) NOT NULL DEFAULT 'general', -- general, dispute, phone_call, arrangement, warning
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Customer Documents
CREATE TABLE IF NOT EXISTS customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_type VARCHAR(32) NOT NULL, -- contract, credit_application, vat_exemption, pop_receipt, legal_notice
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.3 ACCOUNTS RECEIVABLE
-- ============================================================================

-- Currencies & Exchange Rates
CREATE TABLE IF NOT EXISTS currencies (
    code CHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(8) NOT NULL,
    decimal_places SMALLINT NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    rate NUMERIC(14, 6) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'Bank of England Benchmark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_exchange_rates_pair_date UNIQUE (from_currency, to_currency, rate_date)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(64) NOT NULL,
    purchase_order_reference VARCHAR(64),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    original_amount_minor_units BIGINT NOT NULL CHECK (original_amount_minor_units > 0),
    balance_due_minor_units BIGINT NOT NULL CHECK (balance_due_minor_units >= 0),
    tax_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(32) NOT NULL DEFAULT 'issued', -- draft, issued, overdue, partially_paid, paid, disputed, on_hold, written_off, cancelled
    dispute_status VARCHAR(32) NOT NULL DEFAULT 'none', -- none, open, under_review, resolved
    collection_status VARCHAR(32) NOT NULL DEFAULT 'active_cadence', -- active_cadence, paused_pending_review, on_hold, escalated_to_legal, settled
    last_reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    assigned_controller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_invoices_org_number UNIQUE (organisation_id, invoice_number)
);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
    unit_price_minor_units BIGINT NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    total_amount_minor_units BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_invoice_lines_seq UNIQUE (invoice_id, line_number)
);

-- Invoice Adjustments (Debit, Credit, Commercial Discount, Statutory Interest)
CREATE TABLE IF NOT EXISTS invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    adjustment_type VARCHAR(32) NOT NULL, -- commercial_discount, debit_adjustment, interest_charge, statutory_compensation, write_off
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units != 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    effective_date DATE NOT NULL,
    reason TEXT NOT NULL,
    authorized_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    audit_trail_reference VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Credit Notes
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    credit_note_number VARCHAR(64) NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    total_amount_minor_units BIGINT NOT NULL CHECK (total_amount_minor_units > 0),
    unallocated_amount_minor_units BIGINT NOT NULL CHECK (unallocated_amount_minor_units >= 0),
    issue_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, allocated, void
    reason TEXT NOT NULL,
    issued_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_credit_notes_org_number UNIQUE (organisation_id, credit_note_number)
);

-- Credit Note Allocations
CREATE TABLE IF NOT EXISTS credit_note_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    allocated_amount_minor_units BIGINT NOT NULL CHECK (allocated_amount_minor_units > 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    allocated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_reference VARCHAR(100) NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- bank_transfer, card, bacs_direct_debit, sepa_direct_debit, check, cash
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    total_amount_minor_units BIGINT NOT NULL CHECK (total_amount_minor_units > 0),
    unallocated_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL,
    reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, reconciled, unmatched, exception
    verification_status VARCHAR(32) NOT NULL DEFAULT 'unverified', -- unverified, verified_gateway, bank_cleared
    reversal_status VARCHAR(32) NOT NULL DEFAULT 'none', -- none, requested, reversed
    bank_statement_reference VARCHAR(128),
    recorded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_payments_org_ref UNIQUE (organisation_id, payment_reference)
);

-- Payment Allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    allocated_amount_minor_units BIGINT NOT NULL CHECK (allocated_amount_minor_units > 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    allocated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Payment Reversals (Chargebacks, BACS Returns, Dishonoured Checks)
CREATE TABLE IF NOT EXISTS payment_reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    reversal_date DATE NOT NULL,
    reversal_reason TEXT NOT NULL,
    reversed_amount_minor_units BIGINT NOT NULL CHECK (reversed_amount_minor_units > 0),
    authorized_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    journal_audit_ref VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Payment Evidence (Uploaded Customer Proof-of-Payment)
CREATE TABLE IF NOT EXISTS payment_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    declared_amount_minor_units BIGINT NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED_PENDING_RECONCILIATION', -- Section 25.5 Invariant
    filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    bank_transaction_reference VARCHAR(100),
    review_notes TEXT,
    verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Payment Reconciliation Records
CREATE TABLE IF NOT EXISTS payment_reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    bank_statement_line_id VARCHAR(64) NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    amount_minor_units BIGINT NOT NULL,
    confidence_level VARCHAR(20) NOT NULL DEFAULT 'high', -- automated_exact, high, medium, manual_exception
    decision_notes TEXT NOT NULL,
    matched_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    matched_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.4 COLLECTIONS
-- ============================================================================

-- Collection Workflows
CREATE TABLE IF NOT EXISTS collection_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(32) NOT NULL DEFAULT 'due_date_relative',
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_frequency_days INTEGER NOT NULL DEFAULT 3,
    applicable_time_zone VARCHAR(64) NOT NULL DEFAULT 'Europe/London',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Workflow Versions
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES collection_workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    definition_json JSONB NOT NULL,
    published_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_workflow_versions_num UNIQUE (workflow_id, version_number)
);

-- Workflow Rules
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES collection_workflows(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    day_offset INTEGER NOT NULL, -- negative: pre-due; positive: overdue
    channel VARCHAR(32) NOT NULL, -- email, whatsapp, sms, post, portal, internal_task
    template_id UUID,
    stop_conditions JSONB NOT NULL DEFAULT '["payment_received", "dispute_opened", "account_on_hold"]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    workflow_id UUID NOT NULL REFERENCES collection_workflows(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    rule_id UUID REFERENCES workflow_rules(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed', -- completed, suppressed, failed, pending_approval
    suppression_reason TEXT,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Reminder Templates
CREATE TABLE IF NOT EXISTS reminder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(150) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_reminder_templates_org_code UNIQUE (organisation_id, code, language)
);

-- Reminder Schedules
CREATE TABLE IF NOT EXISTS reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL,
    channel VARCHAR(32) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, dispatched, cancelled, suppressed
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Communication Events
CREATE TABLE IF NOT EXISTS communication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    channel VARCHAR(32) NOT NULL,
    direction VARCHAR(16) NOT NULL DEFAULT 'outbound', -- outbound, inbound
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    body_content TEXT NOT NULL,
    external_provider VARCHAR(32) NOT NULL, -- sendgrid, meta_graph_api, twilio, system
    provider_message_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Communication Delivery Events (Webhook Tracking)
CREATE TABLE IF NOT EXISTS communication_delivery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communication_events(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    event_type VARCHAR(32) NOT NULL, -- sent, delivered, opened, clicked, bounced, rejected, complaint
    occurred_at TIMESTAMPTZ NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Collection Tasks
CREATE TABLE IF NOT EXISTS collection_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    task_type VARCHAR(32) NOT NULL DEFAULT 'phone_call', -- phone_call, account_review, demand_letter, legal_review
    title VARCHAR(200) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date DATE NOT NULL,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Payment Promises (Promise to Pay)
CREATE TABLE IF NOT EXISTS payment_promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    promised_amount_minor_units BIGINT NOT NULL CHECK (promised_amount_minor_units > 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    promised_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, kept, broken, rescheduled, cancelled
    contact_person VARCHAR(150),
    notes TEXT,
    fulfilled_at TIMESTAMPTZ,
    recorded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Debtor Disputes
CREATE TABLE IF NOT EXISTS debtor_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    dispute_number VARCHAR(64) NOT NULL,
    amount_disputed_minor_units BIGINT NOT NULL CHECK (amount_disputed_minor_units > 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    category VARCHAR(64) NOT NULL, -- incorrect_amount, duplicate, goods_not_received, missing_po, tax_error, service_complaint
    customer_explanation TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open', -- open, under_review, awaiting_credit_note, resolved, rejected, closed
    reminder_pause_active BOOLEAN NOT NULL DEFAULT true,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_resolution_date DATE,
    resolved_at TIMESTAMPTZ,
    resolution_summary TEXT,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_disputes_org_number UNIQUE (organisation_id, dispute_number)
);

-- Dispute Events
CREATE TABLE IF NOT EXISTS dispute_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES debtor_disputes(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    event_type VARCHAR(32) NOT NULL, -- opened, evidence_uploaded, communication_received, note_added, status_changed, resolved
    actor_name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Collection Notes
CREATE TABLE IF NOT EXISTS collection_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    dispute_id UUID REFERENCES debtor_disputes(id) ON DELETE SET NULL,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.5 AI (STRICT DATA MINIMISATION INVARIANT)
-- "Store only necessary AI data. Avoid retaining unnecessary sensitive prompts
-- or customer message content." (Section 27.5)
-- ============================================================================

-- AI Requests Telemetry
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature_code VARCHAR(64) NOT NULL, -- draft_message, summarize_debtor, classify_reply, dispute_summary
    model_name VARCHAR(64) NOT NULL DEFAULT 'gemini-3.8-flash',
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- success, failed, rate_limited
    error_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- AI Usage Records (Tenancy Metering)
CREATE TABLE IF NOT EXISTS ai_usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    billing_period_month CHAR(7) NOT NULL, -- YYYY-MM
    request_count INTEGER NOT NULL DEFAULT 0,
    token_count BIGINT NOT NULL DEFAULT 0,
    cost_estimate_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_ai_usage_org_period UNIQUE (organisation_id, billing_period_month)
);

-- AI Generated Drafts
CREATE TABLE IF NOT EXISTS ai_generated_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    draft_type VARCHAR(32) NOT NULL, -- reminder_courteous, reminder_firm, formal_demand
    target_language VARCHAR(10) NOT NULL DEFAULT 'en',
    subject_preview TEXT,
    body_preview TEXT,
    is_reviewed_by_human BOOLEAN NOT NULL DEFAULT false,
    was_dispatched BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- AI Classifications
CREATE TABLE IF NOT EXISTS ai_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    predicted_category VARCHAR(64) NOT NULL,
    confidence_score NUMERIC(5, 2) NOT NULL,
    requires_human_confirmation BOOLEAN NOT NULL DEFAULT true,
    human_confirmed_category VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- AI Summaries (Debtor & Dispute Summaries)
CREATE TABLE IF NOT EXISTS ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    entity_type VARCHAR(32) NOT NULL, -- debtor, dispute, portfolio_weekly
    entity_id UUID NOT NULL,
    root_cause_summary TEXT,
    recommended_action TEXT,
    sentiment VARCHAR(32),
    confidence_score SMALLINT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.6 PORTAL (SELF-SERVICE DEBTOR PORTAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_portal_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    access_token_hash VARCHAR(128) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    total_logins INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS portal_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    recipient_email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS portal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    event_name VARCHAR(64) NOT NULL, -- view_invoices, download_pdf, initiated_checkout, uploaded_pop, lodge_dispute
    ip_address INET,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS customer_payment_intentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method VARCHAR(32) NOT NULL,
    amount_minor_units BIGINT NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    status VARCHAR(32) NOT NULL DEFAULT 'initiated', -- initiated, completed, abandoned, failed
    gateway_session_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS customer_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, answered, closed
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.7 REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(32) NOT NULL, -- ageing, dso, cash_flow, collector_performance
    configuration_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_report_def_org_code UNIQUE (organisation_id, code)
);

CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_view VARCHAR(64) NOT NULL,
    filter_name VARCHAR(100) NOT NULL,
    criteria_json JSONB NOT NULL,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    report_type VARCHAR(64) NOT NULL,
    file_format VARCHAR(10) NOT NULL DEFAULT 'csv',
    row_count INTEGER NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    download_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS receivables_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    as_of_date DATE NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    total_invoiced_minor_units BIGINT NOT NULL,
    total_outstanding_minor_units BIGINT NOT NULL,
    total_overdue_minor_units BIGINT NOT NULL,
    dso_days NUMERIC(6, 2) NOT NULL,
    bucket_current_minor_units BIGINT NOT NULL,
    bucket_1_30_minor_units BIGINT NOT NULL,
    bucket_31_60_minor_units BIGINT NOT NULL,
    bucket_61_90_minor_units BIGINT NOT NULL,
    bucket_90_plus_minor_units BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_snapshots_org_date_curr UNIQUE (organisation_id, as_of_date, currency)
);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    forecast_horizon_weeks INTEGER NOT NULL DEFAULT 12,
    baseline_expected_minor_units BIGINT NOT NULL,
    conservative_minor_units BIGINT NOT NULL,
    optimistic_minor_units BIGINT NOT NULL,
    run_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.8 SAAS BILLING
-- STRICT FINANCIAL SEPARATION INVARIANT:
-- "Subscription billing must be separate from customers' invoice balances.
-- Never mix these two financial domains." (Section 24 & Section 27.8)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(32) PRIMARY KEY, -- free, starter, professional, business, enterprise
    name VARCHAR(100) NOT NULL,
    monthly_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    annual_price_usd_per_month NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_custom_quote BOOLEAN NOT NULL DEFAULT false,
    is_publicly_available BOOLEAN NOT NULL DEFAULT true,
    trial_duration_days INTEGER NOT NULL DEFAULT 0,
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(32) NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_code VARCHAR(64) NOT NULL,
    is_included BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    CONSTRAINT uq_plan_features_code UNIQUE (plan_id, feature_code)
);

CREATE TABLE IF NOT EXISTS plan_limits (
    plan_id VARCHAR(32) PRIMARY KEY REFERENCES subscription_plans(id) ON DELETE CASCADE,
    max_active_invoices INTEGER NOT NULL,
    max_customers INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    monthly_ai_requests INTEGER NOT NULL,
    max_automated_workflows INTEGER NOT NULL,
    has_whatsapp_integration BOOLEAN NOT NULL DEFAULT false,
    has_custom_branding BOOLEAN NOT NULL DEFAULT false,
    has_api_access BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS organisation_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE RESTRICT,
    plan_id VARCHAR(32) NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, annual
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- trial, active, past_due, grace_period, suspended, cancelled, expired
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    grace_period_ends_at TIMESTAMPTZ,
    payment_provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
    provider_customer_id VARCHAR(128),
    provider_subscription_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES organisation_subscriptions(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    event_type VARCHAR(64) NOT NULL, -- upgraded, downgraded, renewed, payment_failed, cancelled, resumed
    previous_plan_id VARCHAR(32),
    new_plan_id VARCHAR(32),
    proration_amount_usd NUMERIC(10, 2),
    reason TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS billing_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE RESTRICT,
    provider_customer_id VARCHAR(128) NOT NULL UNIQUE,
    payment_method_last4 VARCHAR(4),
    payment_method_brand VARCHAR(32),
    billing_email VARCHAR(255) NOT NULL,
    billing_tax_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    amount_usd NUMERIC(10, 2) NOT NULL,
    tax_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'paid', -- paid, open, void, uncollectible
    provider_invoice_id VARCHAR(128),
    invoice_pdf_url TEXT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    metric_code VARCHAR(64) NOT NULL, -- active_invoices, customers, users, ai_requests, whatsapp_messages, storage_bytes
    current_value BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL, -- stripe, gocardless
    provider_event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- 27.9 PLATFORM OPERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    provider_code VARCHAR(64) NOT NULL, -- stripe, xero, quickbooks, sendgrid, meta_whatsapp, gocardless
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    configuration_encrypted JSONB NOT NULL,
    last_health_check_at TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'operational',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_integration_org_provider UNIQUE (organisation_id, provider_code)
);

CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    provider_code VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    latency_ms INTEGER,
    payload_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'inbound', -- inbound, outbound
    destination_url TEXT NOT NULL,
    event_name VARCHAR(64) NOT NULL,
    http_status_code INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Audit Logs: Part 26 Immutable Ledger
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    adjustment_reason TEXT,
    source VARCHAR(32) NOT NULL DEFAULT 'web_ui',
    correlation_id VARCHAR(128),
    ip_address INET,
    previous_record_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    approval_record JSONB
);

CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    batch_number VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL, -- invoices, customers, payments
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL,
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    rejected_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    imported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    raw_row_data JSONB NOT NULL,
    error_message TEXT NOT NULL,
    field_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    high_value_overdue_threshold_minor_units BIGINT NOT NULL DEFAULT 1000000, -- £10,000.00
    digest_frequency VARCHAR(20) NOT NULL DEFAULT 'immediate',
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_notif_pref_user_org UNIQUE (user_id, organisation_id)
);

CREATE TABLE IF NOT EXISTS support_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    case_number VARCHAR(32) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMIT;
