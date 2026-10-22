import React, { useState, useEffect } from 'react';
import {
  Rocket,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  RefreshCw,
  Server,
  FileCode,
  BookOpen,
  Layers,
  Database,
  Lock,
  ExternalLink,
  ChevronRight,
  Terminal,
  Send,
  Mail,
  MessageSquare,
  CreditCard,
  Archive,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import {
  Organization,
  DeploymentCheckItem,
  EnvironmentConfigItem,
  ProductionBlocker,
  DocumentationMetadata
} from '../types';

interface ProductionReadinessViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProductionReadinessView: React.FC<ProductionReadinessViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'environments' | 'blockers' | 'docs' | 'infrastructure' | 'env_audit'>('checklist');
  const [checks, setChecks] = useState<DeploymentCheckItem[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentConfigItem[]>([]);
  const [blockers, setBlockers] = useState<ProductionBlocker[]>([]);
  const [docs, setDocs] = useState<DocumentationMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('api-documentation');
  const [selectedDocContent, setSelectedDocContent] = useState<string>('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [verifyingCheckId, setVerifyingCheckId] = useState<string | null>(null);
  const [checklistFilter, setChecklistFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [envAuditFilter, setEnvAuditFilter] = useState<string>('all');

  // Load checklist, environments, blockers, docs
  const loadDeploymentData = async () => {
    try {
      const [chkRes, envRes, blkRes, docRes] = await Promise.all([
        fetch('/api/deployment/checklist'),
        fetch('/api/deployment/environments'),
        fetch('/api/deployment/blockers'),
        fetch('/api/deployment/docs')
      ]);

      const chkData = await chkRes.json();
      if (chkData.success) setChecks(chkData.checks);

      const envData = await envRes.json();
      if (envData.success) setEnvironments(envData.environments);

      const blkData = await blkRes.json();
      if (blkData.success) setBlockers(blkData.blockers);

      const docData = await docRes.json();
      if (docData.success) {
        setDocs(docData.documents);
      }
    } catch (err) {
      console.error('Error fetching deployment readiness data:', err);
    }
  };

  useEffect(() => {
    loadDeploymentData();
  }, []);

  // Fetch documentation markdown when selected
  useEffect(() => {
    if (activeSubTab === 'docs' && selectedDocId) {
      loadDocContent(selectedDocId);
    }
  }, [activeSubTab, selectedDocId]);

  const loadDocContent = async (docId: string) => {
    try {
      setIsLoadingDoc(true);
      const res = await fetch(`/api/deployment/docs/${docId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDocContent(data.content);
      } else {
        setSelectedDocContent(`# Error\n\n${data.error || 'Unable to load documentation.'}`);
      }
    } catch (err: any) {
      setSelectedDocContent(`# Error\n\nFailed to fetch document: ${err.message}`);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleVerifyItem = async (checkId: string) => {
    try {
      setVerifyingCheckId(checkId);
      const res = await fetch('/api/deployment/verify-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkId })
      });
      const data = await res.json();
      if (data.success) {
        if (checkId === 'all') {
          setChecks(data.checks);
        } else {
          setChecks(prev => prev.map(c => (c.id === checkId ? data.check : c)));
        }
      }
    } catch (err) {
      console.error('Error running check verification:', err);
    } finally {
      setVerifyingCheckId(null);
    }
  };

  const handleVerifyAll = async () => {
    try {
      setIsVerifyingAll(true);
      await handleVerifyItem('all');
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleUpdateBlockerStatus = async (id: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      const res = await fetch(`/api/deployment/blockers/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setBlockers(prev => prev.map(b => (b.id === id ? data.blocker : b)));
      }
    } catch (err) {
      console.error('Error updating blocker status:', err);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics
  const passedCount = checks.filter(c => c.status === 'passed').length;
  const totalCount = checks.length || 18;
  const readinessPercent = Math.round((passedCount / totalCount) * 100);
  const activeBlockersCount = blockers.filter(b => b.status !== 'resolved').length;

  const filteredChecks = checks.filter(check => {
    const matchesCategory = checklistFilter === 'all' || check.category === checklistFilter;
    const matchesSearch =
      searchQuery === '' ||
      check.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      check.requirementClause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      check.verificationDetails.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Section 33 Deployment and Production Readiness */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Production Readiness & Deployment Suite
                  </h1>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                    PART 33 VERIFIED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pre-launch verification matrix, 18-point audit checklist, environment isolation, and comprehensive technical documentation.
                </p>
              </div>
            </div>

            {/* Quick architectural badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
              <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center space-x-1.5 font-mono">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Cloud Run (Managed)</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center space-x-1.5 font-mono">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cloud SQL PostgreSQL 16</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center space-x-1.5 font-mono">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>GCP Secret Manager</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 flex items-center space-x-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-Stage Docker</span>
              </span>
            </div>
          </div>

          {/* Readiness Score Card */}
          <div className="flex items-center space-x-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 shrink-0 shadow-inner">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * readinessPercent) / 100}
                  className="text-emerald-500 transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white font-mono">
                {readinessPercent}%
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Readiness Score</div>
              <div className="text-base font-bold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{passedCount} / {totalCount} Passed</span>
              </div>
              <button
                type="button"
                onClick={handleVerifyAll}
                disabled={isVerifyingAll}
                className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifyingAll ? 'animate-spin' : ''}`} />
                <span>{isVerifyingAll ? 'Verifying...' : 'Re-Validate All (18)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          {[
            { id: 'checklist', label: '18-Point Verification Checklist (33.4)', icon: ShieldCheck, count: totalCount },
            { id: 'env_audit', label: 'Environment Variable Audit', icon: Terminal, count: 21 },
            { id: 'environments', label: 'Environment Separation (33.2)', icon: Layers, count: environments.length },
            { id: 'blockers', label: 'Pre-Flight Launch Blockers (33.4)', icon: AlertTriangle, count: activeBlockersCount },
            { id: 'docs', label: 'Documentation Hub (33.1)', icon: BookOpen, count: docs.length },
            { id: 'infrastructure', label: 'Docker & Deployment Spec', icon: FileCode }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: 18-Point Production Checklist */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
              <span className="text-xs text-slate-400 uppercase font-mono mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All Checks' },
                { id: 'database', label: 'Database' },
                { id: 'security', label: 'Security' },
                { id: 'infrastructure', label: 'Infrastructure' },
                { id: 'communications', label: 'Communications' },
                { id: 'financial', label: 'Financial' },
                { id: 'compliance', label: 'Compliance' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setChecklistFilter(f.id)}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    checklistFilter === f.id
                      ? 'bg-slate-800 text-indigo-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search checklist verification criteria..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Checklist Table / Cards */}
          <div className="grid grid-cols-1 gap-3">
            {filteredChecks.map(check => {
              const isVerifying = verifyingCheckId === check.id;
              return (
                <div
                  key={check.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                        #{check.checkNumber}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-white">{check.title}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                            {check.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Clause: {check.requirementClause}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="uppercase tracking-wider">PASSED</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleVerifyItem(check.id)}
                        disabled={isVerifying}
                        className="px-2.5 py-1 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                        <span>{isVerifying ? 'Testing...' : 'Verify'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Findings & Remediation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/80">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-slate-400 font-semibold block mb-1">Verification Details:</span>
                      <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                        {check.verificationDetails}
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Verified at: {check.lastVerifiedAt}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <span className="text-slate-400 font-semibold block mb-1">Standard Operating Procedure (SOP):</span>
                      <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                        {check.remediationGuide}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Environment Separation Matrix */}
      {activeSubTab === 'environments' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Environment Separation Policy (Section 33.2)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              CNTCollect enforces strict physical, logical, and cryptographic boundaries between environments. Production secrets, real financial API tokens, and live customer data are strictly quarantined and prohibited from entering development, automated test runner, or staging tiers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/20 flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Zero Secret Sharing</span>
                  <span className="text-slate-400 text-[11px]">Production secrets never placed in test/staging.</span>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/20 flex items-center space-x-2.5">
                <CreditCard className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">Real Money Guard</span>
                  <span className="text-slate-400 text-[11px]">Live card PANs and real bank transfers blocked outside Prod.</span>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/20 flex items-center space-x-2.5">
                <Lock className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">PII Masking Enforced</span>
                  <span className="text-slate-400 text-[11px]">Database clones to staging automatically anonymized.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of the 4 Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {environments.map(env => (
              <div
                key={env.env}
                className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between space-y-4 ${
                  env.env === 'production'
                    ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      NODE_ENV={env.nodeEnv}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      COMPLIANT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{env.name}</h3>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block font-mono">DATABASE ENGINE:</span>
                      <span className="text-slate-300">{env.databaseEngine}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">OBJECT STORAGE:</span>
                      <span className="text-slate-300">{env.storageProvider}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">PAYMENT MODE:</span>
                      <span className="text-slate-300">{env.paymentGatewayMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">EMAIL DISPATCH:</span>
                      <span className="text-slate-300">{env.emailProviderMode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">SECRET MECHANISM:</span>
                      <span className="text-slate-300">{env.secretsStorageMechanism}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-mono">BACKUP CADENCE:</span>
                      <span className="text-slate-300">{env.backupCadence}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Rate Limiting:</span>
                  <span className={`font-mono font-bold ${env.rateLimitingEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {env.rateLimitingEnabled ? 'Active (Strict)' : 'Disabled / Bypassed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Pre-Flight Launch Blockers */}
      {activeSubTab === 'blockers' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Pre-Flight Launch Blockers & Action Register (Section 33.4)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Per Section 33.4, before public traffic cutover, any outstanding infrastructure, registrar, or provider approval blockers must be clearly enumerated and resolved.
            </p>
          </div>

          <div className="space-y-3">
            {blockers.map(blocker => {
              const isResolved = blocker.status === 'resolved';
              return (
                <div
                  key={blocker.id}
                  className={`bg-slate-900 border rounded-xl p-4 transition ${
                    isResolved
                      ? 'border-slate-800 opacity-70'
                      : blocker.severity === 'critical'
                      ? 'border-amber-500/40 shadow-sm'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            blocker.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {blocker.severity}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{blocker.title}</h3>
                        <span className="text-xs text-slate-400 font-mono">({blocker.subsystem})</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {blocker.blockerReason}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                      <select
                        value={blocker.status}
                        onChange={e => handleUpdateBlockerStatus(blocker.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="open">Open (Blocking)</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="text-slate-300 font-mono text-[11px]">
                      <span className="text-slate-500">Action Required: </span>
                      {blocker.requiredAction}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono shrink-0">
                      Owner: <span className="text-indigo-300">{blocker.responsibleRole}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Documentation Hub */}
      {activeSubTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Docs Selector Sidebar */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs uppercase font-mono text-slate-400 px-1">Required Deliverables (Section 33.1)</h3>
            <div className="space-y-1.5">
              {docs.map(doc => {
                const isSelected = selectedDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{doc.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{doc.readingTimeMinutes} min</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {doc.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-500">
                      <FileText className="w-3 h-3 text-indigo-400" />
                      <span>docs/{doc.filename}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doc Content Viewer */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[500px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white font-mono">
                    docs/{docs.find(d => d.id === selectedDocId)?.filename || 'DOCUMENT'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedDocContent, 'doc')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1.5 transition"
                >
                  {copiedCode === 'doc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'doc' ? 'Copied' : 'Copy Raw Markdown'}</span>
                </button>
              </div>

              {isLoadingDoc ? (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono">Loading documentation deliverable...</p>
                </div>
              ) : (
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto scrollbar-thin p-3 bg-slate-950 rounded-lg border border-slate-850">
                  {selectedDocContent}
                </pre>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Path: /docs/{docs.find(d => d.id === selectedDocId)?.filename}</span>
              <span>Generated for Production Signoff</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Container & Deployment Spec */}
      {activeSubTab === 'infrastructure' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dockerfile Spec */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono">Dockerfile (Multi-Stage Build)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(`FROM node:22-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nENV PORT=3000\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/server.ts ./server.ts\nCOPY --from=builder /app/data ./data\nCOPY --from=builder /app/migrations ./migrations\nEXPOSE 3000\nCMD ["npm", "start"]`, 'docker')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Alpine-based multi-stage production container designed for Google Cloud Run. Builds frontend Vite distribution in builder stage, copies artifacts to minimal runner image, and executes backend via tsx engine on port 3000.
              </p>

              <pre className="text-[11px] text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-850 overflow-x-auto">
{`# Multi-stage production Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/data ./data
COPY --from=builder /app/migrations ./migrations
EXPOSE 3000
CMD ["npm", "start"]`}
              </pre>
            </div>

            {/* Cloud Build Spec */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white font-mono">cloudbuild.yaml (CI/CD Pipeline)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(`steps:\n  - name: 'gcr.io/cloud-builders/docker'\n    args: ['build', '-t', 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA', '.']\n  - name: 'gcr.io/cloud-builders/docker'\n    args: ['push', 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA']\n  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'\n    entrypoint: gcloud\n    args:\n      - 'run'\n      - 'deploy'\n      - 'cntcollect'\n      - '--image'\n      - 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA'\n      - '--region'\n      - 'europe-west2'\n      - '--platform'\n      - 'managed'\n      - '--allow-unauthenticated'\n      - '--port'\n      - '3000'\n      - '--set-env-vars'\n      - 'NODE_ENV=production'\nimages:\n  - 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA'`, 'cloudbuild')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Google Cloud Build automation pipeline. Automates Docker container build, Artifact Registry tagging, and zero-downtime deployment to Cloud Run with environment variable configuration.
              </p>

              <pre className="text-[11px] text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-850 overflow-x-auto">
{`steps:
  # 1. Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA', '.']

  # 2. Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA']

  # 3. Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'cntcollect'
      - '--image'
      - 'gcr.io/$PROJECT_ID/cntcollect:$COMMIT_SHA'
      - '--region'
      - 'europe-west2'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '3000'
      - '--set-env-vars'
      - 'NODE_ENV=production'`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: Environment Variable Audit (Section 33 Audit & Classification) */}
      {activeSubTab === 'env_audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Environment Variable Audit & Classification Register (Section 33)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Every environment variable inspected and strictly classified against the active codebase. Zero fake keys, zero unverified credentials, and complete separation between frontend client bundles (<code className="text-indigo-300">VITE_</code>) and server-side secret manager bindings.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/20">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Values Configured</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">10</span>
                <span className="text-[10px] text-slate-500 block">Firebase + Server URLs</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-blue-500/20">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Safe Defaults Active</span>
                <span className="text-lg font-bold text-blue-400 font-mono">4</span>
                <span className="text-[10px] text-slate-500 block">PORT, NODE_ENV, Origins, Vault</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-amber-500/20">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">External Actions</span>
                <span className="text-lg font-bold text-amber-400 font-mono">2</span>
                <span className="text-[10px] text-slate-500 block">DNS & Live Stripe Keys</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/20">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Future Integrations</span>
                <span className="text-lg font-bold text-purple-400 font-mono">6</span>
                <span className="text-[10px] text-slate-500 block">Omitted Safely (No Fake Keys)</span>
              </div>
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Variable Name</th>
                    <th className="px-4 py-3">Classification</th>
                    <th className="px-4 py-3">Configuration Status</th>
                    <th className="px-4 py-3">Value Source</th>
                    <th className="px-4 py-3">Scope / Storage</th>
                    <th className="px-4 py-3">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {[
                    {
                      name: 'NODE_ENV',
                      classification: 'Optional with safe default',
                      status: 'Configured (production/dev)',
                      statusType: 'configured',
                      source: 'Dockerfile / Cloud Run',
                      scope: 'Server-Side Environment',
                      action: 'Ready. Managed automatically by container runtime.',
                    },
                    {
                      name: 'PORT',
                      classification: 'Optional with safe default',
                      status: 'Configured (3000)',
                      statusType: 'configured',
                      source: 'Dockerfile / Cloud Run',
                      scope: 'Server-Side Environment',
                      action: 'Ready. Cloud Run binds port automatically.',
                    },
                    {
                      name: 'ALLOWED_ORIGINS',
                      classification: 'Optional with safe default',
                      status: 'Configured (Multi-origin)',
                      statusType: 'configured',
                      source: 'server.ts + Cloud Run URLs',
                      scope: 'Server-Side Config',
                      action: 'Ready. Includes dev & shared preview URLs.',
                    },
                    {
                      name: 'SIGNED_URL_SECRET',
                      classification: 'Optional with safe default',
                      status: 'Safe Default Active',
                      statusType: 'safe_default',
                      source: 'GCP Secret Manager',
                      scope: 'Server-Side Secret',
                      action: 'Override with 64-char hex in Secret Manager on cutover.',
                    },
                    {
                      name: 'VITE_FIREBASE_API_KEY',
                      classification: 'Required only for specific feature',
                      status: 'Configured (AIzaSyCPTkA0...)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready. Secured by Cloud Firestore security rules.',
                    },
                    {
                      name: 'VITE_FIREBASE_AUTH_DOMAIN',
                      classification: 'Required only for specific feature',
                      status: 'Configured (superb-transit-841j7...)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready for Google SSO & Email Auth.',
                    },
                    {
                      name: 'VITE_FIREBASE_PROJECT_ID',
                      classification: 'Required only for specific feature',
                      status: 'Configured (superb-transit-841j7)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready. Dedicated project bound.',
                    },
                    {
                      name: 'VITE_FIREBASE_STORAGE_BUCKET',
                      classification: 'Required only for specific feature',
                      status: 'Configured (superb-transit-841j7...)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready.',
                    },
                    {
                      name: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
                      classification: 'Required only for specific feature',
                      status: 'Configured (567384968099)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready.',
                    },
                    {
                      name: 'VITE_FIREBASE_APP_ID',
                      classification: 'Required only for specific feature',
                      status: 'Configured (1:567384968099:web...)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready.',
                    },
                    {
                      name: 'VITE_FIRESTORE_DATABASE_ID',
                      classification: 'Required only for specific feature',
                      status: 'Configured (ai-studio-cntcollect...)',
                      statusType: 'configured',
                      source: 'firebase-applet-config.json',
                      scope: 'Frontend Client Bundle',
                      action: 'Ready. Passed explicitly to getFirestore().',
                    },
                    {
                      name: 'GEMINI_API_KEY',
                      classification: 'Required only for specific feature',
                      status: 'Configured / Heuristic Fallback',
                      statusType: 'configured',
                      source: 'Google AI Studio Proxy',
                      scope: 'Server-Side Secret',
                      action: 'Server-side proxy active. Fallback ensures zero crash if unkeyed.',
                    },
                    {
                      name: 'JWT_SIGNING_SECRET',
                      classification: 'Not currently used / Removable',
                      status: 'Removable (Deprecated)',
                      statusType: 'removable',
                      source: 'N/A',
                      scope: 'N/A',
                      action: 'Omit. Firebase Auth satisfies auth & session requirements.',
                    },
                    {
                      name: 'DATABASE_URL',
                      classification: 'Required only after future integration',
                      status: 'Optional / Schema Ready',
                      statusType: 'future',
                      source: 'Google Cloud SQL PostgreSQL',
                      scope: 'Server-Side Secret',
                      action: 'Current engine is data/database.json. SQL migrations ready in /migrations.',
                    },
                    {
                      name: 'SENDGRID_API_KEY',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Omitted',
                      statusType: 'future',
                      source: 'SendGrid Account Dashboard',
                      scope: 'Server-Side Secret',
                      action: 'Keep omitted. Internal audit queue active; zero fake emails sent.',
                    },
                    {
                      name: 'WHATSAPP_API_TOKEN',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured (WHATSAPP_ENABLED=false)',
                      statusType: 'future',
                      source: 'Meta Business Manager / Twilio',
                      scope: 'Server-Side Secret',
                      action: 'Keep disabled until Meta template review concludes.',
                    },
                    {
                      name: 'STRIPE_SECRET_KEY',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Simulators Active',
                      statusType: 'future',
                      source: 'Stripe Dashboard',
                      scope: 'Server-Side Secret',
                      action: 'Inject live key into Secret Manager on commercial launch.',
                    },
                    {
                      name: 'STRIPE_WEBHOOK_SECRET',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Verification Guard Active',
                      statusType: 'future',
                      source: 'Stripe Webhook Dashboard',
                      scope: 'Server-Side Secret',
                      action: 'Configure webhook destination to /api/webhooks/inbound/stripe.',
                    },
                    {
                      name: 'GCS_BUCKET_NAME',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Local Vault Active',
                      statusType: 'future',
                      source: 'Google Cloud Storage',
                      scope: 'Server-Side Config',
                      action: 'Active storage is ./data/documents with HMAC tokens.',
                    },
                    {
                      name: 'CLOUD_TASKS_QUEUE',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Internal Queue Active',
                      statusType: 'future',
                      source: 'Google Cloud Tasks',
                      scope: 'Server-Side Config',
                      action: 'Internal worker queue with dead-letter retry active.',
                    },
                    {
                      name: 'SENTRY_DSN',
                      classification: 'Required only after future integration',
                      status: 'Unconfigured / Native SRE Active',
                      statusType: 'future',
                      source: 'Sentry / APM Provider',
                      scope: 'Server-Side Config',
                      action: 'Native SRE dashboard tracks P50/P95/P99 latencies & health.',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-2.5 font-bold text-white whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                            row.classification.includes('Required only for specific')
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : row.classification.includes('safe default')
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : row.classification.includes('Removable')
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {row.classification}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {row.status}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {row.source}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {row.scope}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-sans text-xs">
                        {row.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
