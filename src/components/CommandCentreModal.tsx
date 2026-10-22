import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Command,
  Sparkles,
  FileText,
  Users,
  CreditCard,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  X,
  PlusCircle,
  FileCheck,
  FileSpreadsheet,
  Layers,
  Send,
  Lock,
  ExternalLink,
  Ban,
  Activity,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Rocket,
  Compass,
  Scale,
  Award
} from 'lucide-react';
import {
  Organization,
  GlobalSearchResult,
  CommandIntent,
  CommandActionType
} from '../types';

export interface CommandCentreModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  onNavigateTab: (tab: string) => void;
  onOpenNewInvoiceModal: () => void;
  onOpenRecordPaymentModal: () => void;
  onRunDunningCycle?: () => void;
}

const EXAMPLE_AI_PROMPTS = [
  'Show invoices more than 30 days overdue.',
  'Prepare a polite reminder for invoice INV-1005.',
  'Summarise this customer\'s payment history.',
  'Show payment promises due this week.',
  'List invoices awaiting dispute resolution.',
  'Generate an ageing report for this month.'
];

export const CommandCentreModal: React.FC<CommandCentreModalProps> = ({
  isOpen,
  onClose,
  organization,
  onNavigateTab,
  onOpenNewInvoiceModal,
  onOpenRecordPaymentModal,
  onRunDunningCycle
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<'search' | 'ai'>('search');

  // AI Command Assistant State (Section 29.1)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiIntent, setAiIntent] = useState<CommandIntent | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [userConfirmedMutation, setUserConfirmedMutation] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setExecutionMessage(null);
      setUserConfirmedMutation(false);
    }
  }, [isOpen]);

  // Debounced Global Search
  useEffect(() => {
    if (mode !== 'search' || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?orgId=${organization.id}&q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.results);
        }
      } catch (err) {
        console.error('Failed to search records:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, mode, organization.id]);

  // Execute AI Natural Language Interpretation
  const handleInterpretQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsInterpreting(true);
    setAiIntent(null);
    setExecutionMessage(null);
    setUserConfirmedMutation(false);

    try {
      const res = await fetch('/api/command-centre/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText.trim(),
          organizationId: organization.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiIntent(data.data);
      }
    } catch (err) {
      console.error('Failed to interpret natural language query:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  // Execute Command Intent
  const handleExecuteIntent = () => {
    if (!aiIntent) return;

    if (aiIntent.actionClassification === 'MUTATION_REQUIRES_CONFIRMATION' && !userConfirmedMutation) {
      alert('Please confirm the action checkbox before executing mutations or external communication dispatch.');
      return;
    }

    setExecutionMessage(`Command executed: ${aiIntent.previewData.summary}`);
    setTimeout(() => {
      if (aiIntent.navigationTarget) {
        onNavigateTab(aiIntent.navigationTarget);
      }
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-12 sm:pt-20 p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100 text-xs animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header / Mode Switcher */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">CNTCollect Command Centre</span>
              <span className="text-[10px] text-slate-500 font-mono ml-2">Part 29 • {organization.name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setMode('search')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  mode === 'search' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Global Search
              </button>
              <button
                onClick={() => setMode('ai')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center space-x-1 ${
                  mode === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>AI Assistant (29.1)</span>
              </button>
            </div>

            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 relative">
          {mode === 'search' ? (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search invoices, customers, payments, disputes, payment promises, or vault documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-3">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInterpretQuery(aiPrompt);
                }}
                className="relative"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 absolute left-3.5 top-3" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder='Enter natural-language request (e.g., "Show invoices more than 30 days overdue")...'
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-500/40 rounded-2xl pl-10 pr-20 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={isInterpreting || !aiPrompt.trim()}
                  className="absolute right-2 top-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center space-x-1"
                >
                  <span>{isInterpreting ? 'Thinking...' : 'Interpret'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </form>

              {/* Example AI Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">
                  Try Examples:
                </span>
                {EXAMPLE_AI_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setAiPrompt(prompt);
                      handleInterpretQuery(prompt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition text-left truncate max-w-[280px]"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          
          {/* MODE: GLOBAL SEARCH RESULTS */}
          {mode === 'search' && (
            <div className="space-y-3">
              {searchQuery.trim() ? (
                <>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Search Results ({searchResults.length})</span>
                    <span className="font-mono text-[10px]">Filtered by Tenant [{organization.name}]</span>
                  </div>

                  <div className="space-y-1.5">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => {
                          onNavigateTab(result.targetTab);
                          onClose();
                        }}
                        className="p-3 bg-slate-950/70 hover:bg-slate-800/60 rounded-xl border border-slate-800/80 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400">
                            {result.type === 'invoice' && <FileText className="w-4 h-4" />}
                            {result.type === 'debtor' && <Users className="w-4 h-4" />}
                            {result.type === 'payment' && <CreditCard className="w-4 h-4" />}
                            {result.type === 'dispute' && <ShieldAlert className="w-4 h-4" />}
                            {result.type === 'promise' && <Clock className="w-4 h-4" />}
                            {result.type === 'document' && <FileCheck className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white group-hover:text-indigo-300">
                                {result.title}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {result.type}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              {result.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-slate-500 group-hover:text-indigo-400">
                          <span className="text-[10px] hidden sm:inline">Jump to {result.targetTab}</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}

                    {searchResults.length === 0 && !isSearching && (
                      <div className="py-8 text-center text-slate-500 space-y-1">
                        <Search className="w-6 h-6 mx-auto text-slate-600" />
                        <p className="text-xs">No records found matching "{searchQuery}".</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Common Quick Actions (12 Shortcuts mandated in Part 29) */
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Common Action Shortcuts (Part 29)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onNavigateTab('invoices');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Search Invoices</span>
                        <span className="text-[10px] text-slate-400">Browse receivables register & status</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('debtors');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Search Customers / Debtors</span>
                        <span className="text-[10px] text-slate-400">Credit ratings & contact profiles</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('invoices');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">View Overdue Accounts</span>
                        <span className="text-[10px] text-slate-400">Delinquent balances needing action</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenNewInvoiceModal();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Create Invoice Record</span>
                        <span className="text-[10px] text-slate-400">Manual entry with line item calculation</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenRecordPaymentModal();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Record a Payment</span>
                        <span className="text-[10px] text-slate-400">Remittance settlement & allocation</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('dunning');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Send className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Generate Reminder Draft</span>
                        <span className="text-[10px] text-slate-400">AI drafted dunning notices</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('dunning');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Review Failed Reminders</span>
                        <span className="text-[10px] text-slate-400">Delivery bounce & retry inspection</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('disputes');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Review Open Disputes</span>
                        <span className="text-[10px] text-slate-400">Customer discrepancies & hold status</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('promises');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Review Payment Promises</span>
                        <span className="text-[10px] text-slate-400">PTP adherence & broken commitments</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('payments');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <FileCheck className="w-4 h-4 text-teal-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Review Payment Evidence</span>
                        <span className="text-[10px] text-slate-400">Bank slips awaiting dual verification</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('collector_workspace');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Create Collection Task</span>
                        <span className="text-[10px] text-slate-400">Collector workspace triage & worklist</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('reports');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Open Financial Reports</span>
                        <span className="text-[10px] text-slate-400">Aged debt, DSO, and cash forecasting</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('integrations');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Access Integration Status</span>
                        <span className="text-[10px] text-slate-400">ERP, Webhook & Banking gateways</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('testing');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Run Quality Assurance Tests</span>
                        <span className="text-[10px] text-slate-400">Unit, E2E & Requirements Matrix (31)</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('observability');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Activity className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Error Observability & SRE</span>
                        <span className="text-[10px] text-slate-400">Health checks, alerts & safe retries (32)</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('readiness');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Rocket className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Production Readiness & Launch (33)</span>
                        <span className="text-[10px] text-slate-400">18-point checklist, environment matrix & docs</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('roadmap');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Implementation Roadmap (34)</span>
                        <span className="text-[10px] text-slate-400">9-phase delivery sequence & criteria matrix</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('rules_compliance');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Execution Rules & Governance (35)</span>
                        <span className="text-[10px] text-slate-400">25 mandatory execution rules & invariant verification</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onNavigateTab('final_acceptance');
                        onClose();
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center space-x-2.5 transition"
                    >
                      <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white block">Final Pilot Acceptance (36)</span>
                        <span className="text-[10px] text-slate-400">49 verified criteria & controlled pilot authorization</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE: AI COMMAND ASSISTANCE (29.1) */}
          {mode === 'ai' && (
            <div className="space-y-4">
              {isInterpreting && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs font-medium">Interpreting natural language command with Gemini 3.8 Flash...</p>
                </div>
              )}

              {executionMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{executionMessage}</span>
                </div>
              )}

              {aiIntent && !isInterpreting && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase font-bold">
                          {aiIntent.intentType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: {aiIntent.targetDomain.toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          aiIntent.actionClassification === 'READ_ONLY_AUTOMATIC'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}>
                          {aiIntent.actionClassification === 'READ_ONLY_AUTOMATIC' ? 'Read-Only (Auto-Executable)' : 'Mutation (Requires Confirmation)'}
                        </span>
                      </div>
                      <p className="text-slate-300 font-medium text-xs">
                        {aiIntent.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Action Preview Card (Rule: Show a preview of the action and affected records before execution) */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Execution Preview ({aiIntent.previewData.affectedCount} Records):
                    </span>

                    <p className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      {aiIntent.previewData.summary}
                    </p>

                    {aiIntent.previewData.records.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {aiIntent.previewData.records.map((rec) => (
                          <div key={rec.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
                            <div>
                              <strong className="text-white block">{rec.title}</strong>
                              <span className="text-slate-400 text-[10px]">{rec.subtitle}</span>
                            </div>
                            {rec.amount !== undefined && (
                              <span className="font-bold text-white font-mono">
                                {rec.currency || 'GBP'} {Number(rec.amount).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {aiIntent.previewData.proposedChanges && aiIntent.previewData.proposedChanges.length > 0 && (
                      <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1 text-[11px] text-amber-200">
                        <strong className="text-amber-300 block">Proposed Operational Changes:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                          {aiIntent.previewData.proposedChanges.map((change, idx) => (
                            <li key={idx}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Safeguard: Do not execute ambiguous or destructive commands without confirmation */}
                    {aiIntent.actionClassification === 'MUTATION_REQUIRES_CONFIRMATION' && (
                      <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl space-y-2">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userConfirmedMutation}
                            onChange={(e) => setUserConfirmedMutation(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-0 mt-0.5 bg-slate-950 border-slate-700"
                          />
                          <div className="space-y-0.5">
                            <span className="font-semibold text-white block">
                              Authorize Action Execution (Approval Safeguard)
                            </span>
                            <span className="text-slate-400 text-[10px] block">
                              {aiIntent.previewData.approvalReason || 'I confirm that this action modifies business state or prepares external communication.'}
                            </span>
                          </div>
                        </label>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAiIntent(null)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                      >
                        Dismiss
                      </button>

                      <button
                        type="button"
                        onClick={handleExecuteIntent}
                        disabled={aiIntent.actionClassification === 'MUTATION_REQUIRES_CONFIRMATION' && !userConfirmedMutation}
                        className={`px-4 py-1.5 rounded-xl text-white font-bold transition flex items-center space-x-1.5 ${
                          aiIntent.actionClassification === 'MUTATION_REQUIRES_CONFIRMATION' && !userConfirmedMutation
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {aiIntent.actionClassification === 'READ_ONLY_AUTOMATIC' ? 'View Matching Records' : 'Authorize & Execute'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Shortcut Legend */}
        <div className="bg-slate-950 px-5 py-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> to close</span>
            <span>Switch to AI with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Tab</kbd></span>
          </div>
          <span className="font-mono text-[10px]">Tenant: {organization.name}</span>
        </div>

      </div>
    </div>
  );
};
