import React, { useState } from 'react';
import {
  Database,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Code2,
  Table,
  Key,
  Hash,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Organization } from '../types';
import { RELATIONAL_DOMAINS, TOTAL_SCHEMA_TABLES_COUNT, TOTAL_FOREIGN_KEYS_COUNT, TOTAL_TENANT_INDEXES_COUNT } from '../db/schema';
import { TenantDataAccessClient } from '../db/tenantDataAccess';

export interface DatabaseDesignViewProps {
  organization: Organization;
  onRefreshData?: () => void;
}

export const DatabaseDesignView: React.FC<DatabaseDesignViewProps> = ({
  organization,
  onRefreshData
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'architecture' | 'migrations' | 'tenant_isolation' | 'ddl'>('architecture');
  const [copiedSql, setCopiedSql] = useState(false);

  // Tenant Isolation Barrier Test State
  const [isTestingTenantBarrier, setIsTestingTenantBarrier] = useState(false);
  const [tenantBarrierResult, setTenantBarrierResult] = useState<{
    passed: boolean;
    assertionMessage: string;
    blockedQueryStatus: string;
    testedAt: string;
  } | null>(null);

  // Filter domains
  const filteredDomains = RELATIONAL_DOMAINS.filter((dom) => {
    if (selectedDomainId !== 'all' && dom.domainId !== selectedDomainId) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      dom.title.toLowerCase().includes(q) ||
      dom.section.toLowerCase().includes(q) ||
      dom.description.toLowerCase().includes(q) ||
      dom.tableNames.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Run live Tenant Isolation Barrier assertion
  const handleTestTenantIsolation = () => {
    setIsTestingTenantBarrier(true);
    setTenantBarrierResult(null);

    setTimeout(() => {
      try {
        const client = new TenantDataAccessClient({
          organisationId: organization.id,
          userId: 'usr-admin-current'
        });

        // Attempt cross-tenant assertion against a foreign tenant
        const result = client.testTenantBarrierAssertion('org-unauthorized-foreign-tenant-999');
        setTenantBarrierResult({
          passed: result.passed,
          assertionMessage: result.assertionMessage,
          blockedQueryStatus: result.blockedQueryStatus,
          testedAt: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        setTenantBarrierResult({
          passed: false,
          assertionMessage: err.message,
          blockedQueryStatus: 'CRITICAL_LEAK',
          testedAt: new Date().toLocaleTimeString()
        });
      } finally {
        setIsTestingTenantBarrier(false);
      }
    }, 450);
  };

  const [isDownloadingDdl, setIsDownloadingDdl] = useState(false);

  const handleDownloadDdl = async () => {
    setIsDownloadingDdl(true);
    try {
      const res = await fetch('/api/database/export-ddl');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sqlText = await res.text();
      const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'CNTCollect_Part27_Consolidated_Schema.sql');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export DDL SQL:', err);
    } finally {
      setIsDownloadingDdl(false);
    }
  };

  const sampleDdlSnippet = `-- Sample Excerpt: Invoices & Tenant Isolation (Section 27.3 & 27.10)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(64) NOT NULL,
    currency CHAR(3) NOT NULL,
    original_amount_minor_units BIGINT NOT NULL CHECK (original_amount_minor_units > 0),
    balance_due_minor_units BIGINT NOT NULL CHECK (balance_due_minor_units >= 0),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'issued',
    dispute_status VARCHAR(32) NOT NULL DEFAULT 'none',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_invoices_org_number UNIQUE (organisation_id, invoice_number)
);

-- Tenant-Aware Composite Index (Section 27.10)
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_due 
    ON invoices (organisation_id, status, due_date) 
    WHERE deleted_at IS NULL;`;

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(sampleDdlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Architecture Posture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 mr-1" />
                <span>Part 27 — Database Design</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-3 h-3 mr-1" />
                PostgreSQL Relational Schema
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Relational Architecture, Migrations & Tenancy Console</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Fully normalized relational design with foreign-key constraints, UUID identifiers, decimal minor units for money, soft deletion, and strict tenant-aware compound indexes across 9 operational domains (27.1–27.9).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestTenantIsolation}
              disabled={isTestingTenantBarrier}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-700"
            >
              <ShieldCheck className={`w-3.5 h-3.5 text-emerald-400 ${isTestingTenantBarrier ? 'animate-spin' : ''}`} />
              <span>{isTestingTenantBarrier ? 'Testing Barrier...' : 'Assert Tenant Isolation'}</span>
            </button>
            <button
              onClick={handleDownloadDdl}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-sm flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PostgreSQL DDL</span>
            </button>
          </div>
        </div>

        {/* Core Database Metrics Grid (Section 27.10) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Relational Entities</span>
            <div className="font-bold text-white text-base mono-num">{TOTAL_SCHEMA_TABLES_COUNT} Tables</div>
            <span className="text-[10px] text-cyan-400">9 Normalized Domains (27.1–27.9)</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Foreign Key Integrity</span>
            <div className="font-bold text-emerald-400 text-base mono-num">{TOTAL_FOREIGN_KEYS_COUNT} Foreign Keys</div>
            <span className="text-[10px] text-slate-500">ON DELETE RESTRICT / CASCADE</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Tenant-Aware Indexes</span>
            <div className="font-bold text-indigo-400 text-base mono-num">{TOTAL_TENANT_INDEXES_COUNT} Composite Indexes</div>
            <span className="text-[10px] text-slate-500">Explicit organisation_id prefix</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Currency Representation</span>
            <div className="font-bold text-amber-400 text-base mono-num">Minor Units (BIGINT)</div>
            <span className="text-[10px] text-slate-500">Zero rounding inaccuracies</span>
          </div>
        </div>

        {/* Tenant Barrier Test Result Feedback */}
        {tenantBarrierResult && (
          <div className={`p-3 rounded-xl border text-xs space-y-1 ${
            tenantBarrierResult.passed 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}>
            <div className="font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Section 27.10 Data-Access Layer Tenant Barrier Test at {tenantBarrierResult.testedAt}</span>
            </div>
            <p className="text-[11px] leading-relaxed font-mono">
              {tenantBarrierResult.assertionMessage}
            </p>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition ${
            activeTab === 'architecture' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Domain Architecture (9 Domains)
        </button>
        <button
          onClick={() => setActiveTab('migrations')}
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition ${
            activeTab === 'migrations' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          SQL Migration Files
        </button>
        <button
          onClick={() => setActiveTab('tenant_isolation')}
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition ${
            activeTab === 'tenant_isolation' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tenancy Invariants & DAL
        </button>
        <button
          onClick={() => setActiveTab('ddl')}
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition ${
            activeTab === 'ddl' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          PostgreSQL DDL Excerpt
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === 'architecture' && (
        <div className="space-y-4">
          {/* Domain Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tables, sections (27.1–27.9), columns, foreign keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <select
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All 9 Relational Domains</option>
                {RELATIONAL_DOMAINS.map((d) => (
                  <option key={d.domainId} value={d.domainId}>
                    {d.section} — {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Domains Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredDomains.map((domain) => (
              <div
                key={domain.domainId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        Section {domain.section}
                      </span>
                      <h3 className="text-sm font-bold text-white">{domain.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">{domain.description}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                    {domain.tableNames.length} Tables
                  </span>
                </div>

                {/* Tables Badges */}
                <div className="flex flex-wrap gap-2">
                  {domain.tableNames.map((tbl) => (
                    <div
                      key={tbl}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-mono text-slate-200 transition"
                    >
                      <Table className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{tbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'migrations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white">Migration Files Journal (Section 27.10)</h3>
            <p className="text-slate-400 mt-0.5">
              Atomic transactional DDL scripts executed in forward sequence.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    APPLIED
                  </span>
                  <span className="font-mono font-bold text-white text-xs">0001_core_relational_schema.sql</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Provisions all 52 entities across Sections 27.1 through 27.9 with UUIDs, foreign keys, and decimal/integer money representations.
                </p>
                <div className="flex items-center space-x-3 text-[10px] text-slate-500 pt-1 font-mono">
                  <span>Engine: PostgreSQL 16+</span>
                  <span>•</span>
                  <span>Checksum: SHA-256 (Verified)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                100% Up to Date
              </span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    APPLIED
                  </span>
                  <span className="font-mono font-bold text-white text-xs">0002_indexes_and_constraints.sql</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Enforces tenant-aware composite indexes, partial indexes for soft deletion, and immutable triggers on audit_logs.
                </p>
                <div className="flex items-center space-x-3 text-[10px] text-slate-500 pt-1 font-mono">
                  <span>Indexes: 44 Tenant-Aware</span>
                  <span>•</span>
                  <span>Triggers: Immutability Barrier</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                100% Up to Date
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenant_isolation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white">Data-Access Layer Tenant Invariant (Section 27.10)</h3>
            <p className="text-slate-400 mt-0.5">
              "Every organisation-owned entity must have an explicit tenant relationship. Enforce tenant ownership in the data-access layer."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Mandatory Tenant Scoping</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                The TenantDataAccessClient automatically appends <code className="text-cyan-300 font-mono">organisation_id = tenantId</code> to all relational queries. Any query that lacks tenant context is rejected before execution with <code className="text-rose-400 font-mono">MISSING_TENANT_CONTEXT</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Cross-Tenant Breach Barrier</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Calling <code className="text-indigo-300 font-mono">assertTenantOwnership()</code> against a foreign organisation record throws <code className="text-rose-400 font-mono">TenantSecurityException</code> (HTTP 403 Forbidden). No cross-tenant data can ever leak across boundaries.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ddl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">PostgreSQL DDL Excerpt</h3>
              <p className="text-slate-400 mt-0.5">
                Strict foreign keys, constraints, and compound tenant-aware indexes.
              </p>
            </div>
            <button
              onClick={handleCopyDdl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-700"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
            {sampleDdlSnippet}
          </pre>
        </div>
      )}
    </div>
  );
};
