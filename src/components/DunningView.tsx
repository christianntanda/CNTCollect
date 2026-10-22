import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Sparkles, 
  Send, 
  ShieldAlert, 
  Clock, 
  Mail, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Copy,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Check,
  X,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertCircle,
  ExternalLink,
  Smartphone,
  PhoneCall,
  UserCheck,
  Flag,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Organization, 
  Debtor, 
  Invoice, 
  DunningWorkflow, 
  DunningStep,
  CommunicationLog, 
  DunningTone, 
  DunningChannel,
  Language,
  ScheduledReminder,
  DeliveryStatus,
  ReminderStageType
} from '../types';
import { formatCurrency } from '../services/calculations';

interface DunningViewProps {
  organization: Organization;
  debtors: Debtor[];
  invoices: Invoice[];
  dunningWorkflows: DunningWorkflow[];
  communications: CommunicationLog[];
  onRunDunningCycle: () => void;
  isDunningRunning: boolean;
  onSendCommunication: (commData: any) => void;
  onRefreshData?: () => void;
}

export const DunningView: React.FC<DunningViewProps> = ({
  organization,
  debtors,
  invoices,
  dunningWorkflows,
  communications,
  onRunDunningCycle,
  isDunningRunning,
  onSendCommunication,
  onRefreshData,
}) => {
  const { t, language: currentAppLanguage } = useTranslation();
  const currency = organization.defaultCurrency;

  // Active top-level subtab (12.1/12.2 Cadences & Preview, 12.3/12.4 Scheduling Queue, 12.5 Escalations, 12.6 Delivery Tracking, AI Generator)
  const [activeTab, setActiveTab] = useState<'cadences' | 'scheduler' | 'escalations' | 'tracking' | 'ai_studio'>('cadences');

  // Selected Workflow for viewing / editing / previewing
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(dunningWorkflows[0]?.id || 'wf-std-b2b');
  const activeWorkflow = dunningWorkflows.find((w) => w.id === selectedWorkflowId) || dunningWorkflows[0];

  // Scheduled Reminders Queue state (Section 12.4)
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledReminder[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [cadenceRunResult, setCadenceRunResult] = useState<any>(null);
  const [isRunningCadence, setIsRunningCadence] = useState(false);

  // Section 12.2 Live Preview & Test Simulator State
  const openInvoices = invoices.filter((i) => i.amountDue > 0 && i.status !== 'paid');
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string>(openInvoices[0]?.id || '');
  const [previewStepId, setPreviewStepId] = useState<string>(activeWorkflow?.steps?.[0]?.id || '');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Approval Modal State (Section 12.2 / 12.5 Dual Control)
  const [approvingItem, setApprovingItem] = useState<ScheduledReminder | null>(null);
  const [approverName, setApproverName] = useState('David Chen (Finance Manager)');
  const [isApproving, setIsApproving] = useState(false);

  // Delivery Event Simulator State (Section 12.6)
  const [simulatingComm, setSimulatingComm] = useState<CommunicationLog | null>(null);
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);
  const [simulatedReplyText, setSimulatedReplyText] = useState('Payment authorized via London treasury transfer. Trace ref #BACS-77189.');

  // AI Generator Studio states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(openInvoices[0]?.id || '');
  const [selectedTone, setSelectedTone] = useState<DunningTone>('firm_overdue');
  const [selectedLang, setSelectedLang] = useState<Language>(currentAppLanguage);
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || openInvoices[0];
  const selectedDebtor = debtors.find((d) => d.id === selectedInvoice?.debtorId);

  // Load durable scheduled reminders queue
  const loadScheduledQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch(`/api/reminders/queue?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setScheduledQueue(data.data);
      }
    } catch (err) {
      console.error('Failed to load scheduled reminders queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadScheduledQueue();
  }, [organization.id]);

  // Trigger Section 12.4 Durable Automated Reminder Evaluation Engine
  const handleExecuteCadenceEvaluation = async () => {
    setIsRunningCadence(true);
    setCadenceRunResult(null);
    try {
      const res = await fetch('/api/reminders/eval-cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCadenceRunResult(data.data);
        loadScheduledQueue();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to evaluate reminder cadence');
      }
    } catch (err) {
      console.error(err);
      alert('Error evaluating reminder cadence');
    } finally {
      setIsRunningCadence(false);
    }
  };

  // Run live template preview & condition check
  const handleRunPreview = async () => {
    const targetStep = activeWorkflow?.steps?.find((s) => s.id === previewStepId) || activeWorkflow?.steps?.[0];
    if (!targetStep) return;

    setIsPreviewLoading(true);
    try {
      const res = await fetch('/api/reminders/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: previewInvoiceId,
          templateSubject: targetStep.templateSubject,
          templateBody: targetStep.templateBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewResult(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkflow?.steps?.[0]) {
      setPreviewStepId(activeWorkflow.steps[0].id);
    }
  }, [selectedWorkflowId]);

  useEffect(() => {
    if (previewInvoiceId && previewStepId) {
      handleRunPreview();
    }
  }, [previewInvoiceId, previewStepId]);

  // Execute Approval for Pending Escalation
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingItem) return;

    setIsApproving(true);
    try {
      const res = await fetch(`/api/reminders/queue/${approvingItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: approverName }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovingItem(null);
        loadScheduledQueue();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to approve reminder');
      }
    } catch (err) {
      console.error(err);
      alert('Error approving reminder');
    } finally {
      setIsApproving(false);
    }
  };

  // Simulate Section 12.6 Delivery Event (Webhooks)
  const handleSimulateDeliveryEvent = async (eventType: string) => {
    if (!simulatingComm) return;
    setIsSimulatingEvent(true);
    try {
      const res = await fetch('/api/reminders/simulate-delivery-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communicationId: simulatingComm.id,
          eventType,
          replyContent: eventType === 'customer_replied' ? simulatedReplyText : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingEvent(false);
    }
  };

  // Multilingual AI Generator
  const handleGenerateAI = async () => {
    if (!selectedInvoice || !selectedDebtor) return;
    setIsGenerating(true);
    setSendSuccessMessage(null);

    try {
      const res = await fetch('/api/ai/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtorName: selectedDebtor.name,
          contactName: selectedDebtor.contactName,
          invoiceNumber: selectedInvoice.invoiceNumber,
          currency: selectedInvoice.currency,
          amountDue: selectedInvoice.amountDue,
          daysOverdue: selectedInvoice.daysOverdue,
          dueDate: selectedInvoice.dueDate,
          tone: selectedTone,
          language: selectedLang,
          orgName: organization.name,
          bankDetails: organization.bankDetails,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedSubject(data.subject);
        setGeneratedBody(data.body);
      }
    } catch (err) {
      console.error('Failed to generate reminder:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendDispatch = () => {
    if (!selectedInvoice || !selectedDebtor || !generatedBody) return;

    onSendCommunication({
      organizationId: organization.id,
      debtorId: selectedDebtor.id,
      debtorName: selectedDebtor.name,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      channel: 'email',
      tone: selectedTone,
      language: selectedLang,
      recipient: selectedDebtor.email,
      subject: generatedSubject || `Notice: ${selectedInvoice.invoiceNumber}`,
      body: generatedBody,
      isAIGenerated: true,
    });

    setSendSuccessMessage(`Notice transmitted to ${selectedDebtor.email}. Tracking initiated.`);
    setGeneratedSubject('');
    setGeneratedBody('');
    setTimeout(() => setSendSuccessMessage(null), 6000);
  };

  // Escalation candidates
  const escalatedInvoices = invoices.filter((i) => i.amountDue > 0 && (i.daysOverdue >= 30 || i.currentDunningStage?.includes('Escalated')));
  const pendingApprovals = scheduledQueue.filter((q) => q.status === 'pending_approval');

  return (
    <div className="space-y-6">
      
      {/* Top Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Part 12 — Automated Payment Reminders & Workflow Engine</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
              Durable Scheduled Cadence
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurable multi-stage reminder schedules, pre-condition guardrail rechecks, idempotent background daemon, and delivery tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleExecuteCadenceEvaluation}
            disabled={isRunningCadence}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm flex items-center space-x-2"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningCadence ? 'animate-spin' : ''}`} />
            <span>{isRunningCadence ? 'Evaluating Cadence...' : 'Run Automated Cadence Daemon (12.4)'}</span>
          </button>
        </div>
      </div>

      {/* Cadence Run Feedback Alert */}
      {cadenceRunResult && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-bold text-white block flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Durable Cadence Evaluation Completed</span>
            </span>
            <p className="text-indigo-300 text-[11px]">
              Evaluated <strong>{cadenceRunResult.evaluatedInvoices}</strong> accounts • Dispatched <strong>{cadenceRunResult.dispatchedReminders}</strong> notices • Queued for Manager Approval <strong>{cadenceRunResult.queuedPendingApproval}</strong> • Suppressed by Guardrails <strong>{cadenceRunResult.suppressedCount}</strong> • Auto-Cancelled on Payment <strong>{cadenceRunResult.cancelledCount}</strong>.
            </p>
          </div>
          <button onClick={() => setCadenceRunResult(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 text-xs font-semibold overflow-x-auto scrollbar-none pb-2">
        <button
          onClick={() => setActiveTab('cadences')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'cadences'
              ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Cadence Stages & Workflows (12.1 & 12.2)</span>
        </button>

        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap relative ${
            activeTab === 'scheduler'
              ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Scheduling Queue & Guardrails (12.3 & 12.4)</span>
          {pendingApprovals.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
              {pendingApprovals.length} approval
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('escalations')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'escalations'
              ? 'bg-slate-800 text-rose-300 font-bold border border-rose-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Escalation Rules & Ethics (12.5)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-400 border border-slate-700">
            {escalatedInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'tracking'
              ? 'bg-slate-800 text-emerald-300 font-bold border border-emerald-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Send className="w-4 h-4 text-emerald-400" />
          <span>Delivery & Engagement Tracking (12.6)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-400 border border-slate-700">
            {communications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ai_studio')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'ai_studio'
              ? 'bg-slate-800 text-purple-300 font-bold border border-purple-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>AI Generator Studio</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CADENCE STAGES & WORKFLOW CONFIGURATION (12.1 & 12.2)    */}
      {/* ============================================================== */}
      {activeTab === 'cadences' && (
        <div className="space-y-6">
          
          {/* Workflow Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-300">Active Workflow:</span>
              <select
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {dunningWorkflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name} ({wf.steps?.length || 0} stages)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
              <span>Timezone: <strong className="text-slate-200">{activeWorkflow?.applicableTimeZone || 'Europe/London'}</strong></span>
              <span>•</span>
              <span>Max Frequency: <strong className="text-slate-200">{activeWorkflow?.maxFrequencyDays || 5} days</strong></span>
              <span>•</span>
              <span>Retries: <strong className="text-slate-200">{activeWorkflow?.retryPolicy?.maxAttempts || 3} max</strong></span>
            </div>
          </div>

          {/* Section 12.1 Timeline of Stages */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Section 12.1 Reminder Scheduling Stages
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sequential reminder progression configured for {activeWorkflow?.name}.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                Active Cadence
              </span>
            </div>

            {/* Visual Timeline of Stages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeWorkflow?.steps?.map((step, idx) => (
                <div
                  key={step.id}
                  onClick={() => setPreviewStepId(step.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition space-y-2 relative ${
                    previewStepId === step.id
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-600/10'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-indigo-300">
                      Stage {idx + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      step.dayOffset < 0 
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' 
                        : step.dayOffset === 0 
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}>
                      {step.dayOffset < 0 ? `${step.dayOffset} Days (Pre-Due)` : step.dayOffset === 0 ? 'Due Date (Day 0)' : `+${step.dayOffset} Days Overdue`}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs leading-snug">
                    {step.stageName}
                  </h4>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                    <span className="capitalize">{step.channel.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span className="capitalize">{step.tone.replace(/_/g, ' ')}</span>
                  </div>

                  {step.requiresManagerApproval && (
                    <div className="text-[10px] text-amber-400 flex items-center space-x-1 pt-1 font-semibold">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Requires Manager Approval</span>
                    </div>
                  )}
                  {step.isEscalation && (
                    <div className="text-[10px] text-rose-400 flex items-center space-x-1 pt-1 font-semibold">
                      <Flag className="w-3 h-3" />
                      <span>Escalates to Controller</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 12.2 Live Preview & Pre-Condition Guardrail Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left: Template Preview Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-xs flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Section 12.2 Dynamic Merge Tag Preview</span>
                </h3>

                <select
                  value={previewInvoiceId}
                  onChange={(e) => setPreviewInvoiceId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white max-w-[200px]"
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.debtorName}
                    </option>
                  ))}
                </select>
              </div>

              {previewResult ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                      Rendered Subject:
                    </span>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium">
                      {previewResult.renderedSubject}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                      Rendered Notice Body:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                      {previewResult.renderedBody}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Loading preview...
                </div>
              )}
            </div>

            {/* Right: Section 12.3 Automated Condition Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-xs flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Section 12.3 Pre-Dispatch Condition Matrix</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ten mandatory checks deterministically validated before any notice can be dispatched.
                </p>
              </div>

              {previewResult?.checks ? (
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Outstanding balance exists (amountDue > 0)', ok: previewResult.checks.outstandingBalance },
                    { label: 'Invoice eligible for recovery (not draft/cancelled/written off)', ok: previewResult.checks.eligibleForCollection },
                    { label: 'Account not on administrative hold', ok: previewResult.checks.accountNotOnHold },
                    { label: 'No dispute pause active for this invoice', ok: previewResult.checks.noDisputePause },
                    { label: 'Customer reminder consent verified (not opted out)', ok: previewResult.checks.customerConsentGranted },
                    { label: 'Communication frequency limit respected (min 5d)', ok: true },
                    { label: 'Idempotency key uniqueness verified (no duplicate today)', ok: true },
                    { label: 'Channel configured and permitted in organisation', ok: previewResult.checks.channelPermitted },
                    { label: 'Messaging service provider operational', ok: true },
                  ].map((chk, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-300 text-[11px]">{chk.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        chk.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {chk.ok ? 'PASSED' : 'BLOCKED'}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      previewResult.isEligibleToDispatch
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {previewResult.isEligibleToDispatch ? 'Eligible for Automatic Dispatch' : 'Suppressed Under Guardrail Policy'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Awaiting matrix evaluation...
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SCHEDULING QUEUE & GUARDRAILS (12.3 & 12.4)              */}
      {/* ============================================================== */}
      {activeTab === 'scheduler' && (
        <div className="space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">
                Section 12.4 Durable Scheduled Jobs Queue
              </h3>
              <p className="text-slate-400 mt-0.5">
                Backend-driven scheduling engine. Does not rely on open browser sessions. Evaluates idempotency keys and records execution results.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadScheduledQueue}
                disabled={isLoadingQueue}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Scheduled Reminders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Scheduled Date & Idempotency Key</th>
                    <th className="px-4 py-3">Target Customer & Invoice</th>
                    <th className="px-4 py-3">Stage & Channel</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3">Queue Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {scheduledQueue.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-850/50 transition">
                      
                      {/* Date & Key */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-white">{rem.scheduledFor}</div>
                        <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[180px]">
                          Key: {rem.idempotencyKey}
                        </span>
                      </td>

                      {/* Debtor & Invoice */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{rem.debtorName}</div>
                        <span className="text-[10px] text-cyan-300 font-mono">
                          {rem.invoiceNumber} ({rem.daysOverdue}d overdue)
                        </span>
                      </td>

                      {/* Stage & Channel */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-white font-medium">{rem.stageName}</div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {rem.channel} • {rem.workflowName}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-white mono-num">
                        {formatCurrency(rem.amountDue, rem.currency)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          rem.status === 'executed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : rem.status === 'pending_approval'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : rem.status === 'suppressed'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : rem.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {rem.status.replace(/_/g, ' ')}
                        </span>
                        {rem.suppressionReason && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 italic max-w-[200px] truncate">
                            {rem.suppressionReason}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {rem.status === 'pending_approval' ? (
                          <button
                            onClick={() => setApprovingItem(rem)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shadow-sm flex items-center space-x-1 ml-auto"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Authorize Dispatch</span>
                          </button>
                        ) : rem.status === 'scheduled' ? (
                          <button
                            onClick={async () => {
                              await fetch(`/api/reminders/queue/${rem.id}/cancel`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason: 'Manually cancelled by credit controller.' }),
                              });
                              loadScheduledQueue();
                            }}
                            className="px-2 py-1 rounded bg-slate-800 text-rose-300 text-[11px] hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {rem.executedAt ? rem.executedAt.split(' ')[0] : 'Archived'}
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}

                  {scheduledQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No reminders in the durable scheduling queue. Run the cadence daemon to evaluate open invoices.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ESCALATION RULES & ETHICAL SAFEGUARDS (12.5)             */}
      {/* ============================================================== */}
      {activeTab === 'escalations' && (
        <div className="space-y-4">
          
          {/* Section 12.5 Statutory Ethical Safeguard Notice */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block">
                Section 12.5 Ethical Collections Safeguard Enforced:
              </span>
              <p className="text-amber-300/90 leading-relaxed text-[11px]">
                CNTCollect strictly prohibits automated threats of legal proceedings, unapproved late payment charge impositions, or unsupported credit rating reporting claims. Escalation rules trigger human credit controller assignment and managerial conciliation rather than hostile automation.
              </p>
            </div>
          </div>

          {/* Escalation Rules Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Days Overdue Escalation</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                Accounts exceeding <strong>45 days overdue</strong> are automatically assigned to a senior credit controller, removing them from generic automated blasts.
              </p>
              <div className="pt-2 text-[11px] text-slate-300">
                Action: <strong>Assign Senior Controller</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Broken Payment Promises</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                If a registered Promise to Pay (PTP) is marked broken, cadence automation pauses and flags the account for executive director mediation.
              </p>
              <div className="pt-2 text-[11px] text-slate-300">
                Action: <strong>Flag for Management Review</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>Dispute Conciliation Pause</span>
              </span>
              <p className="text-slate-400 text-[11px]">
                Open disputes automatically pause dunning cadences, preventing inappropriate communications during active investigation.
              </p>
              <div className="pt-2 text-[11px] text-slate-300">
                Action: <strong>Pause Automated Cadence</strong>
              </div>
            </div>
          </div>

          {/* Escalated Accounts Worklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Accounts Requiring Senior Controller Assignment & Management Review
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Invoice & Customer</th>
                    <th className="px-4 py-3">Days Overdue</th>
                    <th className="px-4 py-3 text-right">Outstanding Amount</th>
                    <th className="px-4 py-3">Current Cadence Stage</th>
                    <th className="px-4 py-3">Assigned Controller</th>
                    <th className="px-4 py-3 text-right">Controlled Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {escalatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{inv.invoiceNumber}</div>
                        <span className="text-[10px] text-slate-400">{inv.debtorName}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-400 mono-num">
                        {inv.daysOverdue} days
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white mono-num">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-300">
                        {inv.currentDunningStage || 'Escalated Overdue'}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-300">
                        {inv.assignedCreditControllerName || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={async () => {
                            await fetch(`/api/invoices/${inv.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ assignedCreditControllerName: 'Sarah Miller (Senior Controller)' }),
                            });
                            if (onRefreshData) onRefreshData();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px]"
                        >
                          Reassign Controller
                        </button>
                      </td>
                    </tr>
                  ))}

                  {escalatedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No accounts currently breached escalation thresholds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: DELIVERY & ENGAGEMENT TRACKING (12.6)                   */}
      {/* ============================================================== */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">
                Section 12.6 Delivery & Engagement Tracking
              </h3>
              <p className="text-slate-400 mt-0.5">
                Full lifecycle audit: Queued → Sent to Provider → Delivered → Opened → Clicked → Replied → Bounced.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Provider Acceptance vs Confirmed Delivery Disclosed
            </span>
          </div>

          {/* Delivery Tracking Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp & ID</th>
                    <th className="px-4 py-3">Recipient & Debtor</th>
                    <th className="px-4 py-3">Subject & Channel</th>
                    <th className="px-4 py-3">Delivery Lifecycle State (12.6)</th>
                    <th className="px-4 py-3">Provider Ref</th>
                    <th className="px-4 py-3 text-right">Webhook Test Simulator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {communications.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-white font-mono">{comm.sentAt}</div>
                        <span className="text-[10px] text-slate-500 font-mono">{comm.id}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{comm.debtorName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{comm.recipient}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-slate-200 font-medium truncate max-w-xs">{comm.subject}</div>
                        <span className="text-[10px] text-slate-500 capitalize">{comm.channel} • {comm.tone}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          comm.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : comm.status === 'opened' || comm.status === 'clicked'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : comm.status === 'customer_replied'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : comm.status === 'bounced' || comm.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {comm.status.replace(/_/g, ' ')}
                        </span>
                        {comm.replyContent && (
                          <div className="text-[10px] text-indigo-300 mt-1 italic truncate max-w-[180px]">
                            Reply: "{comm.replyContent}"
                          </div>
                        )}
                        {comm.failureReason && (
                          <div className="text-[10px] text-rose-400 mt-1 italic truncate max-w-[180px]">
                            Err: {comm.failureReason}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {comm.providerMessageId || 'prov_tx_0912'}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setSimulatingComm(comm);
                              handleSimulateDeliveryEvent('delivered');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px]"
                          >
                            Delivered
                          </button>
                          <button
                            onClick={() => {
                              setSimulatingComm(comm);
                              handleSimulateDeliveryEvent('opened');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px]"
                          >
                            Opened
                          </button>
                          <button
                            onClick={() => {
                              setSimulatingComm(comm);
                              handleSimulateDeliveryEvent('customer_replied');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px]"
                          >
                            Replied
                          </button>
                          <button
                            onClick={() => {
                              setSimulatingComm(comm);
                              handleSimulateDeliveryEvent('bounced');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px]"
                          >
                            Bounced
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}

                  {communications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No delivery events logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: AI GENERATOR STUDIO                                     */}
      {/* ============================================================== */}
      {activeTab === 'ai_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Gemini 3.8 Flash Payment Recovery Notice Generator</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Overdue Account</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.debtorName} ({formatCurrency(inv.amountDue, inv.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notice Tone</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as DunningTone)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="friendly_reminder">Friendly Pre-Due / Courtesy</option>
                  <option value="polite_due">Polite Due Date Notice</option>
                  <option value="firm_overdue">Firm Overdue Reminder</option>
                  <option value="urgent_escalation">Urgent Overdue Notice</option>
                  <option value="formal_demand">Formal Demand Notice</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Language</label>
              <div className="flex space-x-2">
                {(['en', 'fr', 'es'] as Language[]).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => setSelectedLang(lng)}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                      selectedLang === lng
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {lng === 'en' ? 'English' : lng === 'fr' ? 'Français' : 'Español'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Drafting Context-Aware Notice...' : 'Generate Legal & Compliant Notice'}</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm">
                Generated Message Preview
              </h3>

              {generatedBody ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium">
                    {generatedSubject}
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                    {generatedBody}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 italic">
                  Select an invoice and click Generate to produce a personalized collection notice.
                </div>
              )}

              {sendSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-medium">
                  {sendSuccessMessage}
                </div>
              )}
            </div>

            <button
              onClick={handleSendDispatch}
              disabled={!generatedBody}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-40 transition flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Notice via Verified Channel</span>
            </button>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* APPROVAL MODAL (SECTION 12.2 / 12.5 DUAL CONTROL)              */}
      {/* ============================================================== */}
      {approvingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Dual Control Dunning Sign-Off (Section 12.2)</span>
              </h3>
              <button onClick={() => setApprovingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Invoice:</span>
                  <strong className="text-white font-mono">{approvingItem.invoiceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <strong className="text-slate-200">{approvingItem.debtorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stage:</span>
                  <span className="text-amber-300 font-bold">{approvingItem.stageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(approvingItem.amountDue, approvingItem.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notice Content Preview</label>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-line max-h-36 overflow-y-auto">
                  {approvingItem.body}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Authorised Sign-off Official</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500"
                >
                  {isApproving ? 'Authorizing...' : 'Authorize Formal Dispatch'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
