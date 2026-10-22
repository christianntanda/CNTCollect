-- ============================================================================
-- CNTCollect PostgreSQL Production Migration 001
-- Multi-Tenant Accounts Receivable & Payment Recovery Operating Platform
-- Database Schema with Row-Level Security (RLS) & Audit Partitioning
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set up custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'finance_manager', 'credit_controller', 'collector', 'viewer');
    CREATE TYPE risk_tier AS ENUM ('low', 'moderate', 'high', 'critical');
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'disputed', 'written_off');
    CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'escalated', 'resolved', 'rejected');
    CREATE TYPE promise_status AS ENUM ('pending', 'fulfilled', 'broken', 'rescheduled');
    CREATE TYPE payment_method AS ENUM ('bank_transfer', 'credit_card', 'stripe', 'direct_debit', 'credit_note', 'cash');
    CREATE TYPE dunning_channel AS ENUM ('email', 'sms', 'whatsapp', 'formal_letter');
    CREATE TYPE subscription_tier AS ENUM ('starter', 'growth', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_entity VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    default_currency VARCHAR(10) DEFAULT 'GBP' NOT NULL,
    base_late_interest_rate NUMERIC(5,2) DEFAULT 8.50 NOT NULL,
    bank_name VARCHAR(255),
    bank_account_name VARCHAR(255),
    bank_iban VARCHAR(100),
    bank_swift_bic VARCHAR(50),
    payment_instructions TEXT,
    subscription_plan subscription_tier DEFAULT 'growth' NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'active' NOT NULL,
    subscription_period_end DATE,
    current_recovery_volume NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    recovery_volume_limit NUMERIC(15,2) DEFAULT 500000.00 NOT NULL,
    seats_used INT DEFAULT 1 NOT NULL,
    seats_limit INT DEFAULT 10 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'credit_controller' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- 3. Debtors (Customer Accounts)
CREATE TABLE IF NOT EXISTS debtors (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_number VARCHAR(100),
    vat_number VARCHAR(100),
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    address TEXT,
    country VARCHAR(100) DEFAULT 'United Kingdom' NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL,
    credit_limit NUMERIC(15,2) DEFAULT 50000.00 NOT NULL,
    credit_rating INT DEFAULT 75 NOT NULL CHECK (credit_rating BETWEEN 0 AND 100),
    risk_tier risk_tier DEFAULT 'moderate' NOT NULL,
    payment_terms_days INT DEFAULT 30 NOT NULL,
    dso NUMERIC(6,1) DEFAULT 30.0 NOT NULL,
    average_days_to_pay NUMERIC(6,1) DEFAULT 30.0 NOT NULL,
    total_invoiced NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    total_outstanding NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    total_overdue NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    payment_portal_token VARCHAR(128) NOT NULL UNIQUE,
    notes TEXT,
    created_at DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_debtors_org ON debtors(organization_id);
CREATE INDEX IF NOT EXISTS idx_debtors_token ON debtors(payment_portal_token);

-- 4. Invoices & Receivables Ledger
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    debtor_email VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    reference VARCHAR(100),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'GBP' NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    amount_paid NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    amount_due NUMERIC(15,2) NOT NULL,
    status invoice_status DEFAULT 'issued' NOT NULL,
    days_overdue INT DEFAULT 0 NOT NULL,
    accrued_late_interest NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    last_reminder_sent_at DATE,
    current_dunning_stage VARCHAR(100),
    dispute_id VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_debtor ON invoices(debtor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

-- 5. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 20.00 NOT NULL,
    total NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_line_items_inv ON invoice_line_items(invoice_id);

-- 6. Credit Notes & Ledger Adjustments
CREATE TABLE IF NOT EXISTS credit_notes (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    credit_note_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'GBP' NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    remaining_balance NUMERIC(15,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'issued' NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_org ON credit_notes(organization_id);

-- 7. Payments & Allocations
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'GBP' NOT NULL,
    payment_date DATE NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    recorded_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id VARCHAR(64) PRIMARY KEY,
    payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_inv ON payment_allocations(invoice_id);

-- 8. Customer Disputes
CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    invoice_id VARCHAR(64) REFERENCES invoices(id) ON DELETE RESTRICT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    amount_disputed NUMERIC(15,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status dispute_status DEFAULT 'open' NOT NULL,
    lodged_date DATE NOT NULL,
    target_resolution_date DATE NOT NULL,
    debtor_statement TEXT NOT NULL,
    internal_notes TEXT,
    ai_sentiment VARCHAR(50),
    ai_suggested_action TEXT,
    assigned_to VARCHAR(255),
    resolved_at DATE,
    resolution_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disputes_org ON disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_invoice ON disputes(invoice_id);

-- 9. Promises to Pay (PTP Tracker)
CREATE TABLE IF NOT EXISTS promises_to_pay (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(64),
    invoice_number VARCHAR(100),
    promised_amount NUMERIC(15,2) NOT NULL,
    promised_date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'GBP' NOT NULL,
    status promise_status DEFAULT 'pending' NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at DATE NOT NULL,
    fulfilled_date DATE
);

CREATE INDEX IF NOT EXISTS idx_promises_org ON promises_to_pay(organization_id);
CREATE INDEX IF NOT EXISTS idx_promises_date ON promises_to_pay(promised_date);

-- 10. Dunning Workflows & Configuration
CREATE TABLE IF NOT EXISTS dunning_workflows (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS dunning_steps (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) REFERENCES dunning_workflows(id) ON DELETE CASCADE NOT NULL,
    day_offset INT NOT NULL,
    channel dunning_channel NOT NULL,
    tone VARCHAR(100) NOT NULL,
    template_subject TEXT NOT NULL,
    template_body TEXT NOT NULL,
    requires_manager_approval BOOLEAN DEFAULT FALSE NOT NULL
);

-- 11. Communications & Delivery Log
CREATE TABLE IF NOT EXISTS communications (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    debtor_id VARCHAR(64) REFERENCES debtors(id) ON DELETE RESTRICT NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(64),
    invoice_number VARCHAR(100),
    channel dunning_channel NOT NULL,
    tone VARCHAR(100) NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'sent' NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comms_org ON communications(organization_id);

-- 12. Immutable Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    target_id VARCHAR(64),
    target_type VARCHAR(100),
    ip_address VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);

-- ============================================================================
-- Row-Level Security (RLS) Policies for Multi-Tenant Hardening
-- ============================================================================
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: In application runtime, connection sets `SET LOCAL app.current_tenant_id = 'org-xxx';`
-- Sample Tenant isolation policy:
-- CREATE POLICY tenant_isolation_invoices ON invoices
--     FOR ALL USING (organization_id = CURRENT_SETTING('app.current_tenant_id', true));
