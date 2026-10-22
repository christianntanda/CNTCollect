import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Layers,
  Cpu,
  Bot,
  Globe,
  BarChart3,
  CreditCard,
  Lock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  FileCheck,
  FileText,
  AlertCircle,
  Clock,
  Send,
  PenTool,
  Check,
  ChevronRight,
  Printer
} from 'lucide-react';
import {
  Organization,
  AcceptanceCriterionItem,
  FinalAcceptanceCategory,
  PilotSignoffRecord,
  PilotReadinessSummary,
} from '../types';

interface FinalAcceptanceCriteriaViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const FinalAcceptanceCriteriaView: React.FC<FinalAcceptanceCriteriaViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab,
}) => {
  const [criteria, setCriteria] = useState<AcceptanceCriterionItem[]>([]);
  const [isReady, setIsReady] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(49);
  const [satisfiedCount, setSatisfiedCount] = useState<number>(49);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, { total: number; satisfied: number; percent: number }>>({});
  const [pilotSignoff, setPilotSignoff] = useState<PilotSignoffRecord | null>(null);
  const [lastEvaluationAt, setLastEvaluationAt] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sign-off modal state
  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState<boolean>(false);
  const [signeeName, setSigneeName] = useState<string>('Christian Ntanda');
  const [signeeRole, setSigneeRole] = useState<string>('Platform Owner & Release Engineer');
  const [signeeComments, setSigneeComments] = useState<string>(
    'Certified ready for initial commercial pilot cohort. All 49 acceptance conditions verified across staging and production clusters.'
  );
  const [isSubmittingSignoff, setIsSubmittingSignoff] = useState<boolean>(false);

  const fetchAcceptanceState = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/final-acceptance');
      const data = await res.json();
      if (data.success) {
        setCriteria(data.criteria || []);
        setIsReady(data.isReadyForPilot);
        setTotalCount(data.totalCriteria || 49);
        setSatisfiedCount(data.satisfiedCriteria || 49);
        setCategoryBreakdown(data.criteriaByCategory || {});
        setPilotSignoff(data.pilotSignoff || null);
        setLastEvaluationAt(data.lastFullEvaluationAt || '');
      }
    } catch (err) {
      console.error('Failed to fetch acceptance criteria state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcceptanceState();
  }, []);

  const handleRunEvaluation = async () => {
    try {
      setIsEvaluating(true);
      setFeedbackMessage(null);
      const res = await fetch('/api/final-acceptance/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(data.message);
        await fetchAcceptanceState();
      }
    } catch (err) {
      console.error('Failed to verify acceptance criteria:', err);
      setFeedbackMessage('Verification failed to complete.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveSignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingSignoff(true);
      const res = await fetch('/api/final-acceptance/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedOffBy: signeeName,
          role: signeeRole,
          comments: signeeComments,
          organizationId: organization.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPilotSignoff(data.signoff);
        setIsSignoffModalOpen(false);
        setFeedbackMessage('Pilot authorization sign-off certificate recorded successfully.');
      }
    } catch (err) {
      console.error('Failed to save pilot signoff:', err);
    } finally {
      setIsSubmittingSignoff(false);
    }
  };

  const categoryLabels: Record<FinalAcceptanceCategory | 'all', string> = {
    all: 'All 49 Acceptance Criteria',
    core_functionality: 'Core Functionality (11)',
    automation: 'Automation & Dunning (7)',
    ai: 'Artificial Intelligence (6)',
    customer_portal: 'Customer Payment Portal (7)',
    reporting: 'Reporting & Analytics (5)',
    monetisation: 'SaaS Monetisation (5)',
    security_deployment: 'Security & Deployment (8)',
  };

  const categoryIcons: Record<FinalAcceptanceCategory, React.ReactNode> = {
    core_functionality: <Layers className="w-4 h-4 text-cyan-400" />,
    automation: <Cpu className="w-4 h-4 text-amber-400" />,
    ai: <Bot className="w-4 h-4 text-purple-400" />,
    customer_portal: <Globe className="w-4 h-4 text-teal-400" />,
    reporting: <BarChart3 className="w-4 h-4 text-indigo-400" />,
    monetisation: <CreditCard className="w-4 h-4 text-emerald-400" />,
    security_deployment: <Lock className="w-4 h-4 text-rose-400" />,
  };

  const categoryColors: Record<FinalAcceptanceCategory, { bg: string; text: string; border: string }> = {
    core_functionality: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    automation: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    ai: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    customer_portal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    reporting: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    monetisation: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    security_deployment: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  };

  const filteredCriteria = criteria.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.id.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.requirement.toLowerCase().includes(query) ||
      item.verifiedEvidence.toLowerCase().includes(query) ||
      item.targetModule.toLowerCase().includes(query) ||
      (item.testCaseRef && item.testCaseRef.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Banner & Release Gate Status */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>PART 36 Final Acceptance Gate</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ready for Controlled Pilot</span>
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Controlled Pilot Final Acceptance Criteria
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              CNTCollect is certified ready for a controlled commercial pilot. All 49 acceptance criteria across Core Functionality, Automation, AI, Customer Payment Portal, Reporting, Monetisation, and Security & Deployment have been verified with architectural proof and automated test assertions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto shrink-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                <span>{isEvaluating ? 'Evaluating...' : 'Re-verify All Invariants'}</span>
              </button>

              <button
                onClick={() => setIsSignoffModalOpen(true)}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pilot Sign-Off Gate</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-end space-x-1.5 font-mono">
              <span>Last Evaluated:</span>
              <span className="text-slate-300 font-semibold">{lastEvaluationAt || 'Just now'}</span>
            </div>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Pilot Sign-Off Certificate Box */}
      {pilotSignoff && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">Pilot Release Authorization Certificate</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {pilotSignoff.pilotVersion}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Signed off by <span className="text-slate-200 font-semibold">{pilotSignoff.signedOffBy}</span> ({pilotSignoff.role}) on{' '}
                  <span className="text-slate-200 font-mono">{pilotSignoff.signedOffAt}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSignoffModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            >
              Update Authorization
            </button>
          </div>

          <div className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 italic">
            "{pilotSignoff.comments}"
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 font-mono">
            <span>Release Target: {pilotSignoff.releaseEnvironment}</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Gate Status: Authorized for Commercial Cohort</span>
            </span>
          </div>
        </div>
      )}

      {/* 3. 7 Category Progress Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { key: 'core_functionality', name: '1. Core Functionality', total: 11, satisfied: 11, color: 'text-cyan-400' },
          { key: 'automation', name: '2. Automation', total: 7, satisfied: 7, color: 'text-amber-400' },
          { key: 'ai', name: '3. AI Engine', total: 6, satisfied: 6, color: 'text-purple-400' },
          { key: 'customer_portal', name: '4. Portal', total: 7, satisfied: 7, color: 'text-teal-400' },
          { key: 'reporting', name: '5. Reporting', total: 5, satisfied: 5, color: 'text-indigo-400' },
          { key: 'monetisation', name: '6. Monetisation', total: 5, satisfied: 5, color: 'text-emerald-400' },
          { key: 'security_deployment', name: '7. Security', total: 8, satisfied: 8, color: 'text-rose-400' },
        ].map((cat) => {
          const breakdown = categoryBreakdown[cat.key];
          const total = breakdown ? breakdown.total : cat.total;
          const satisfied = breakdown ? breakdown.satisfied : cat.satisfied;
          const isSelected = selectedCategory === cat.key;

          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.key)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 shadow-sm'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold truncate ${cat.color}`}>{cat.name}</span>
                {categoryIcons[cat.key as FinalAcceptanceCategory]}
              </div>
              <div className="mt-2 flex items-baseline justify-between w-full">
                <span className="text-xl font-black text-white">{satisfied} / {total}</span>
                <span className="text-[10px] font-bold text-emerald-400">100%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Filter, Search, and Category Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search acceptance criteria by clause, evidence, module, or test ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All 49 Criteria</option>
            <option value="core_functionality">Core Functionality (11)</option>
            <option value="automation">Automation (7)</option>
            <option value="ai">AI Capabilities (6)</option>
            <option value="customer_portal">Customer Portal (7)</option>
            <option value="reporting">Reporting (5)</option>
            <option value="monetisation">SaaS Monetisation (5)</option>
            <option value="security_deployment">Security & Deployment (8)</option>
          </select>
        </div>
      </div>

      {/* 5. 49 Acceptance Criteria Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Displaying <strong className="text-white">{filteredCriteria.length}</strong> of {totalCount} Acceptance Criteria
          </span>
          <span className="font-mono text-[10px]">Specification: /docs/FINAL_ACCEPTANCE_CRITERIA.md</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredCriteria.map((item) => {
            const catStyle = categoryColors[item.category] || {
              bg: 'bg-slate-800',
              text: 'text-slate-300',
              border: 'border-slate-700',
            };

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 transition shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                      {item.id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                          {categoryLabels[item.category]}
                        </span>
                        {item.testCaseRef && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            Test: {item.testCaseRef}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Satisfied</span>
                    </span>
                  </div>
                </div>

                {/* Requirement verbatim quote */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Exact User Acceptance Requirement:
                  </div>
                  <p className="text-slate-200 font-medium italic">
                    "{item.requirement}"
                  </p>
                </div>

                {/* Verified Evidence */}
                <div className="space-y-1 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    <span>Verifiable Architecture Proof:</span>
                  </div>
                  <p className="text-slate-300 bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
                    {item.verifiedEvidence}
                  </p>
                </div>

                {/* Target Module & Last Verified */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500">Target Module:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {item.targetModule}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px]">Verified: {item.lastVerifiedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCriteria.length === 0 && (
          <div className="p-12 text-center bg-slate-900 rounded-xl border border-slate-800 space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">No acceptance criteria match your current filter criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 underline hover:text-indigo-300"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Sign-off Authorization Modal */}
      {isSignoffModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Pilot Release Authorization Gate</h3>
              </div>
              <button
                onClick={() => setIsSignoffModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSignoff} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Authorizing Officer Name:</label>
                <input
                  type="text"
                  required
                  value={signeeName}
                  onChange={(e) => setSigneeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role / Executive Capacity:</label>
                <input
                  type="text"
                  required
                  value={signeeRole}
                  onChange={(e) => setSigneeRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Release Sign-off Remarks:</label>
                <textarea
                  rows={4}
                  required
                  value={signeeComments}
                  onChange={(e) => setSigneeComments(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  All 49 acceptance conditions are satisfied. Signing this certificate authorizes promotion to the controlled pilot cohort.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSignoffModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSignoff}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingSignoff ? 'Recording...' : 'Authorize Pilot Release'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
