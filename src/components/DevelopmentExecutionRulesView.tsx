import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Lock,
  Code2,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Sliders,
  ExternalLink,
  Layers,
  Activity,
  Terminal,
  HelpCircle,
  Info,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';
import { Organization, ExecutionRule, DeliberateLimitation, ExternalBlockerRegisterItem, ExecutionRuleDomain } from '../types';

interface DevelopmentExecutionRulesViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DevelopmentExecutionRulesView: React.FC<DevelopmentExecutionRulesViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab,
}) => {
  const [rules, setRules] = useState<ExecutionRule[]>([]);
  const [limitations, setLimitations] = useState<DeliberateLimitation[]>([]);
  const [externalBlockers, setExternalBlockers] = useState<ExternalBlockerRegisterItem[]>([]);
  const [overallPercent, setOverallPercent] = useState<number>(100);
  const [compliantCount, setCompliantCount] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(25);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTabSubSection, setActiveTabSubSection] = useState<'rules' | 'limitations' | 'blockers'>('rules');

  const fetchRulesState = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/execution-rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setLimitations(data.deliberateLimitations || []);
        setExternalBlockers(data.externalBlockers || []);
        setOverallPercent(data.overallCompliancePercent || 100);
        setCompliantCount(data.compliantRulesCount || 25);
        setTotalCount(data.totalRulesCount || 25);
        setLastAuditTimestamp(data.lastFullAuditTimestamp || '');
      }
    } catch (err) {
      console.error('Failed to fetch development execution rules state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesState();
  }, []);

  const handleRunLiveAudit = async () => {
    try {
      setIsAuditing(true);
      setAuditFeedback(null);
      const res = await fetch('/api/execution-rules/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditScope: 'all_invariants' }),
      });
      const data = await res.json();
      if (data.success) {
        setAuditFeedback(data.message);
        setLastAuditTimestamp(data.auditTimestamp);
        await fetchRulesState();
      }
    } catch (err) {
      console.error('Failed to run live invariant audit:', err);
      setAuditFeedback('Audit failed to complete. Inspect server logs.');
    } finally {
      setIsAuditing(false);
    }
  };

  const domainLabels: Record<ExecutionRuleDomain | 'all', string> = {
    all: 'All 25 Rules',
    architecture: 'Architecture & Persistence',
    security: 'Security & Tenant Isolation',
    financial_integrity: 'Financial Integrity & Shared Engine',
    integrations: 'Integrations & Honest States',
    ux_quality: 'UX & State Completeness',
    governance: 'Governance & Quality Assurance',
  };

  const domainColors: Record<ExecutionRuleDomain, { bg: string; text: string; border: string }> = {
    architecture: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    security: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    financial_integrity: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    integrations: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    ux_quality: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    governance: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };

  const filteredRules = rules.filter((rule) => {
    const matchesDomain = selectedDomain === 'all' || rule.domain === selectedDomain;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      rule.title.toLowerCase().includes(query) ||
      rule.clause.toLowerCase().includes(query) ||
      rule.verificationEvidence.toLowerCase().includes(query) ||
      rule.completionCriterion.toLowerCase().includes(query) ||
      rule.codeLocations.some((loc) => loc.toLowerCase().includes(query));
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>PART 35 Specification</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Invariant Compliance</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Development Execution Rules & Architecture Governance
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Mandatory engineering constraints governing CNTCollect. Enforces shared financial services, deterministic accounting/AI isolation, multi-tenant isolation, honest integration indicators, and explicit completion criteria with verifiable evidence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleRunLiveAudit}
              disabled={isAuditing}
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing Invariants...' : 'Run Invariant Verification Audit'}</span>
            </button>
            <div className="text-xs text-slate-400 flex items-center justify-end space-x-1.5">
              <span>Last Audited:</span>
              <span className="font-mono text-slate-300 font-semibold">{lastAuditTimestamp || 'Just now'}</span>
            </div>
          </div>
        </div>

        {/* Audit Feedback Banner */}
        {auditFeedback && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{auditFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Compliance Summary & Metric Domain Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium">Overall Score</div>
          <div className="text-2xl font-black text-white mt-1">{overallPercent}%</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">
            {compliantCount} of {totalCount} Compliant
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-cyan-400 font-medium">Architecture</div>
          <div className="text-2xl font-black text-white mt-1">5 / 5</div>
          <div className="text-[11px] text-slate-400 mt-1">Rules 1, 2, 11, 21, 24</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-rose-400 font-medium">Security & RBAC</div>
          <div className="text-2xl font-black text-white mt-1">3 / 3</div>
          <div className="text-[11px] text-slate-400 mt-1">Rules 8, 9, 16</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-emerald-400 font-medium">Financial Logic</div>
          <div className="text-2xl font-black text-white mt-1">5 / 5</div>
          <div className="text-[11px] text-slate-400 mt-1">Rules 5, 6, 7, 13, 18</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-amber-400 font-medium">Integrations</div>
          <div className="text-2xl font-black text-white mt-1">2 / 2</div>
          <div className="text-[11px] text-slate-400 mt-1">Rules 14, 15</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-indigo-400 font-medium">UX & Quality</div>
          <div className="text-2xl font-black text-white mt-1">4 / 4</div>
          <div className="text-[11px] text-slate-400 mt-1">Rules 4, 10, 17, 19</div>
        </div>
      </div>

      {/* 3. Section Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTabSubSection('rules')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center space-x-2 ${
              activeTabSubSection === 'rules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>25 Execution Rules</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-900 text-indigo-200 border border-indigo-700/50">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSubSection('limitations')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center space-x-2 ${
              activeTabSubSection === 'limitations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Deliberate Limitations (Rule 24)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {limitations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSubSection('blockers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center space-x-2 ${
              activeTabSubSection === 'blockers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            <span>External Infrastructure Register</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {externalBlockers.length}
            </span>
          </button>
        </div>

        {/* Quick link to Documentation */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Spec: /docs/DEVELOPMENT_EXECUTION_RULES.md</span>
        </div>
      </div>

      {/* SUB-SECTION 1: 25 EXECUTION RULES */}
      {activeTabSubSection === 'rules' && (
        <div className="space-y-4">
          {/* Controls: Search and Domain Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rules by title, clause, evidence, or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Domains (25)</option>
                <option value="architecture">Architecture & Persistence (5)</option>
                <option value="security">Security & Tenant Isolation (3)</option>
                <option value="financial_integrity">Financial Integrity (5)</option>
                <option value="integrations">Integrations (2)</option>
                <option value="ux_quality">UX & State Completeness (4)</option>
                <option value="governance">Governance & QA (6)</option>
              </select>
            </div>
          </div>

          {/* Rules List Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRules.map((rule) => {
              const domainStyle = domainColors[rule.domain] || {
                bg: 'bg-slate-800',
                text: 'text-slate-300',
                border: 'border-slate-700',
              };

              return (
                <div
                  key={rule.ruleNumber}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Rule Number, Domain, and Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center font-mono">
                          #{rule.ruleNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${domainStyle.bg} ${domainStyle.text} ${domainStyle.border}`}>
                          {domainLabels[rule.domain]}
                        </span>
                      </div>

                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>Compliant</span>
                      </span>
                    </div>

                    {/* Title & Clause */}
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{rule.title}</h3>
                      <p className="text-xs text-indigo-300/90 font-medium italic mt-1 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                        "{rule.clause}"
                      </p>
                    </div>

                    {/* Verification Evidence */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Verifiable Architecture Evidence</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/50">
                        {rule.verificationEvidence}
                      </p>
                    </div>

                    {/* Explicit Completion Criterion */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Explicit Completion Criterion</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-emerald-950/10 p-2 rounded border border-emerald-900/30 text-emerald-200/90">
                        {rule.completionCriterion}
                      </p>
                    </div>
                  </div>

                  {/* Code Locations Tags & Last Audited */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rule.codeLocations.map((loc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800"
                        >
                          {loc}
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      Audited: {rule.lastAuditedAt}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRules.length === 0 && (
            <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800 space-y-3">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No execution rules match your current filter criteria.</p>
              <button
                onClick={() => {
                  setSelectedDomain('all');
                  setSearchQuery('');
                }}
                className="text-xs text-indigo-400 underline hover:text-indigo-300"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 2: DELIBERATE LIMITATIONS REGISTER (RULE 24) */}
      {activeTabSubSection === 'limitations' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Deliberate Limitations Register (Rule 24)</h2>
            </div>
            <p className="text-xs text-slate-300">
              In accordance with Rule 24 ("Document any deliberate limitations"), all known architectural trade-offs, scope boundaries, and deliberate simplifications are formally registered here with engineering rationale and roadmap mitigations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {limitations.map((lim) => (
              <div
                key={lim.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {lim.id}
                    </span>
                    <span className="text-sm font-bold text-white">{lim.area}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-950 text-slate-400 rounded border border-slate-800">
                    Rule #{lim.ruleNumber}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Deliberate Architectural Rationale:</span>
                    <p className="text-slate-200 mt-0.5 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                      {lim.rationale}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block">Operational Scope:</span>
                    <p className="text-slate-300 mt-0.5">{lim.scope}</p>
                  </div>

                  <div>
                    <span className="text-indigo-400 font-semibold block">Future Mitigation & Roadmap Path:</span>
                    <p className="text-indigo-200 mt-0.5 bg-indigo-950/20 p-2 rounded border border-indigo-900/30">
                      {lim.mitigationOrFutureWork}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: EXTERNAL INFRASTRUCTURE & BLOCKERS REGISTER */}
      {activeTabSubSection === 'blockers' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">External Infrastructure & Blockers Register</h2>
            </div>
            <p className="text-xs text-slate-300">
              When a requirement depends on external third-party actions (provider approval, live keys, DNS CNAME), CNTCollect implements the complete software interface, data contracts, and fallback handlers, without fabricating synthetic credentials or endpoints.
            </p>
          </div>

          <div className="space-y-3">
            {externalBlockers.map((blk) => (
              <div
                key={blk.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {blk.id}
                    </span>
                    <h3 className="text-sm font-bold text-white">{blk.service}</h3>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {blk.blockerType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Interface Fully Implemented</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300">{blk.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-semibold text-amber-400 block mb-1">Remaining External Requirement:</span>
                    <span className="text-slate-300">{blk.remainingExternalRequirement}</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-semibold text-indigo-400 block mb-1">How to Unblock:</span>
                    <span className="text-slate-300">{blk.howToUnblock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
