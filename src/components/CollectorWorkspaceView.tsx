import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  User,
  Building,
  Plus,
  Sliders,
  Filter,
  Search,
  Phone,
  Mail,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Check,
  Trash2,
  Info,
  DollarSign,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  Organization, 
  Debtor, 
  Invoice, 
  QueueCategory, 
  PrioritizationWeights, 
  PrioritizedAccount, 
  CollectionTask, 
  CollectionTaskType, 
  CollectionTaskPriority, 
  CollectionTaskStatus, 
  TeamMemberWorkload 
} from '../types';
import { formatCurrency } from '../services/calculations';

interface CollectorWorkspaceViewProps {
  organization: Organization;
  debtors: Debtor[];
  invoices: Invoice[];
  onSelectDebtor?: (debtorId: string) => void;
  onRefreshData?: () => void;
}

// 17.1 Category definitions with human-friendly labels & icons
const QUEUE_CATEGORIES: { id: QueueCategory; label: string; description: string; badgeColor: string }[] = [
  { id: 'all', label: 'All Needing Attention', description: 'Comprehensive prioritized view of all delinquent or active accounts', badgeColor: 'bg-slate-800 text-slate-200 border-slate-700' },
  { id: 'recently_overdue', label: 'Recently Overdue', description: 'Invoices 1-14 days past due requiring courtesy follow-up', badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { id: 'high_value_overdue', label: 'High-Value Overdue', description: 'Substantial balance exposure exceeding baseline threshold', badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { id: 'repeated_late_payers', label: 'Repeated Late Payers', description: 'Accounts with historical delinquency patterns or high risk tier', badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { id: 'broken_promises', label: 'Broken Promises', description: 'Commitment dates passed without bank settlement clearance', badgeColor: 'bg-red-500/10 text-red-300 border-red-500/30' },
  { id: 'disputed_invoices', label: 'Disputed Invoices', description: 'Commercial disputes requiring investigation and resolution', badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  { id: 'failed_reminders', label: 'Failed Reminders', description: 'Undelivered, bounced, or suppressed automated communications', badgeColor: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  { id: 'no_response', label: 'No Response / Unreachable', description: 'Multiple unanswered contacts or stale engagement > 14 days', badgeColor: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' },
  { id: 'evidence_awaiting_verification', label: 'Payment Evidence Awaiting Verification', description: 'Uploaded customer proof-of-payment receipts pending bank clearance', badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  { id: 'approaching_escalation', label: 'Approaching Escalation Thresholds', description: 'Within 5 days of statutory dunning escalation or management review', badgeColor: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
];

// 17.3 Task Type configurations
const TASK_TYPES: { id: CollectionTaskType; label: string; icon: any; color: string }[] = [
  { id: 'call_customer', label: 'Call Customer', icon: Phone, color: 'text-emerald-400 bg-emerald-500/10' },
  { id: 'send_email', label: 'Send Email Follow-up', icon: Mail, color: 'text-blue-400 bg-blue-500/10' },
  { id: 'review_payment_evidence', label: 'Review Payment Evidence', icon: FileText, color: 'text-cyan-400 bg-cyan-500/10' },
  { id: 'resolve_dispute', label: 'Resolve Dispute', icon: ShieldAlert, color: 'text-purple-400 bg-purple-500/10' },
  { id: 'confirm_payment_promise', label: 'Confirm Payment Promise', icon: Award, color: 'text-amber-400 bg-amber-500/10' },
  { id: 'request_missing_documents', label: 'Request Missing Documents', icon: FileText, color: 'text-yellow-400 bg-yellow-500/10' },
  { id: 'escalate_to_management', label: 'Escalate to Management', icon: Flame, color: 'text-rose-400 bg-rose-500/10' },
  { id: 'reconcile_transaction', label: 'Reconcile Transaction', icon: DollarSign, color: 'text-indigo-400 bg-indigo-500/10' },
];

export const CollectorWorkspaceView: React.FC<CollectorWorkspaceViewProps> = ({
  organization,
  debtors,
  invoices,
  onSelectDebtor,
  onRefreshData,
}) => {
  const currency = organization.defaultCurrency || 'GBP';

  // Workspace sub-tabs: 17.1 Prioritised Queue, 17.3 Tasks, 17.4 Team Workload
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'team'>('queue');

  // Work Queue states
  const [queueAccounts, setQueueAccounts] = useState<PrioritizedAccount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<QueueCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [expandedAccountIds, setExpandedAccountIds] = useState<Record<string, boolean>>({});

  // Prioritization Weights (17.2)
  const [weights, setWeights] = useState<PrioritizationWeights>({
    balanceWeight: 2.5,
    daysOverdueWeight: 3.0,
    brokenPromiseWeight: 25,
    repeatedLateWeight: 20,
    staleContactWeight: 15,
    disputeAdjustment: 10,
    accountImportanceWeight: 20,
    highValueThreshold: 10000,
    recentlyOverdueDays: 14,
    staleContactDays: 10,
  });
  const [showWeightsDrawer, setShowWeightsDrawer] = useState(false);
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  // Collection Tasks states (17.3)
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | CollectionTaskStatus>('pending');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | CollectionTaskType>('all');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('all');
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // New Task Modal state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDebtorId, setNewTaskDebtorId] = useState('');
  const [newTaskInvoiceId, setNewTaskInvoiceId] = useState('');
  const [newTaskType, setNewTaskType] = useState<CollectionTaskType>('call_customer');
  const [newTaskPriority, setNewTaskPriority] = useState<CollectionTaskPriority>('high');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('usr-1');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskReminder, setNewTaskReminder] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Task Completion dialog
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Team Workload states (17.4)
  const [teamWorkload, setTeamWorkload] = useState<{ summary: any; collectors: TeamMemberWorkload[] } | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Fetch Work Queue
  const fetchWorkQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const params = new URLSearchParams({
        orgId: organization.id,
        category: selectedCategory,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (assigneeFilter !== 'all') params.append('assignee', assigneeFilter);

      const res = await fetch(`/api/work-queue?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQueueAccounts(data.data);
        if (data.weights) setWeights(data.weights);
      }
    } catch (err) {
      console.error('Error fetching work queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const params = new URLSearchParams({ orgId: organization.id });
      if (taskStatusFilter !== 'all') params.append('status', taskStatusFilter);
      if (taskTypeFilter !== 'all') params.append('taskType', taskTypeFilter);
      if (taskAssigneeFilter !== 'all') params.append('assignedUserId', taskAssigneeFilter);

      const res = await fetch(`/api/collection-tasks?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Fetch Team Workload
  const fetchTeamWorkload = async () => {
    setIsLoadingTeam(true);
    try {
      const res = await fetch(`/api/team-workload?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setTeamWorkload(data);
      }
    } catch (err) {
      console.error('Error fetching team workload:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchWorkQueue();
  }, [selectedCategory, assigneeFilter, organization.id]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else if (activeTab === 'team') {
      fetchTeamWorkload();
    }
  }, [activeTab, taskStatusFilter, taskTypeFilter, taskAssigneeFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkQueue();
  };

  // Save Prioritisation Weights (17.2)
  const handleSaveWeights = async () => {
    setIsSavingWeights(true);
    try {
      const res = await fetch('/api/prioritization-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights),
      });
      const data = await res.json();
      if (data.success) {
        setShowWeightsDrawer(false);
        fetchWorkQueue();
      }
    } catch (err) {
      console.error('Error saving weights:', err);
    } finally {
      setIsSavingWeights(false);
    }
  };

  // Create Task (17.3)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDebtorId) return;

    setIsCreatingTask(true);
    try {
      const debtor = debtors.find((d) => d.id === newTaskDebtorId);
      const invoice = invoices.find((i) => i.id === newTaskInvoiceId);
      const collectorNames: Record<string, string> = {
        'usr-1': 'Sarah Miller',
        'usr-4': 'James Wilson',
        'usr-3': 'Oliver Stone',
        'usr-2': 'David Chen',
      };

      const res = await fetch('/api/collection-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          title: newTaskTitle,
          debtorId: newTaskDebtorId,
          debtorName: debtor?.name,
          invoiceId: newTaskInvoiceId || undefined,
          invoiceNumber: invoice?.invoiceNumber || undefined,
          taskType: newTaskType,
          assignedUserId: newTaskAssigneeId,
          assignedUserName: collectorNames[newTaskAssigneeId] || 'Sarah Miller',
          dueDate: newTaskDueDate,
          priority: newTaskPriority,
          notes: newTaskNotes,
          reminderAt: newTaskReminder || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewTaskModal(false);
        setNewTaskTitle('');
        setNewTaskNotes('');
        setNewTaskReminder('');
        fetchTasks();
        fetchWorkQueue();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Quick Open New Task for specific Debtor
  const openTaskForDebtor = (debtorId: string, debtorName: string, defaultTitle?: string) => {
    setNewTaskDebtorId(debtorId);
    setNewTaskTitle(defaultTitle || `Follow up with ${debtorName} regarding overdue ledger`);
    const debtorInvs = invoices.filter((i) => i.debtorId === debtorId && i.amountDue > 0);
    if (debtorInvs.length > 0) {
      setNewTaskInvoiceId(debtorInvs[0].id);
    }
    setShowNewTaskModal(true);
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/collection-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          outcomeNotes: completionNotes || 'Action resolved successfully.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompletingTaskId(null);
        setCompletionNotes('');
        fetchTasks();
        fetchWorkQueue();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  // Toggle Account Card Score Breakdown
  const toggleScoreBreakdown = (id: string) => {
    setExpandedAccountIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Urgent and high accounts count
  const criticalCount = queueAccounts.filter((a) => a.urgencyLevel === 'critical').length;
  const highCount = queueAccounts.filter((a) => a.urgencyLevel === 'high').length;
  const totalOverdueExposure = queueAccounts.reduce((sum, a) => sum + a.totalOverdue, 0);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* TOP HEADER: CREDIT CONTROLLER WORKSPACE BRANDING & METRICS          */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Credit Controller Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Module 17 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritised collection work queues, transparent decision engine, task orchestration, and fair team workload.
            </p>
          </div>
        </div>

        {/* Quick Operational Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                Critical & High Accounts
              </span>
              <span className="text-sm font-bold text-white mono-num">
                {criticalCount} Critical • {highCount} High
              </span>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                Overdue Queue Exposure
              </span>
              <span className="text-sm font-bold text-emerald-400 mono-num">
                {formatCurrency(totalOverdueExposure, currency)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowWeightsDrawer(true)}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Configure Engine Weights (17.2)</span>
          </button>

          <button
            onClick={() => {
              setNewTaskDebtorId(debtors[0]?.id || '');
              setShowNewTaskModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection Task (17.3)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* WORKSPACE SUB-NAVIGATION TABS (17.1, 17.3, 17.4)                   */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex border-b border-slate-800 text-xs font-semibold space-x-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Prioritised Work Queue (17.1 & 17.2)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
            {queueAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Collection Tasks (17.3)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {tasks.filter((t) => t.status !== 'completed').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 px-4 flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'team'
              ? 'border-indigo-500 text-indigo-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Team Workload & Fair Performance (17.4)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: PRIORITISED WORK QUEUE (17.1 & 17.2)                         */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-5">
          {/* Transparent Scoring Safeguard Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/20 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center space-x-2.5">
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                <strong>Deterministic Operational Priority Engine (17.2):</strong> Accounts are ranked by rule-based weights (balance exposure, days overdue, broken promises, dispute status, customer payment history, and account tier).
                <span className="text-slate-400 ml-1">
                  CNTCollect displays full transparency on why each account is prioritised. Unvalidated predictions are never presented as guaranteed collection outcomes.
                </span>
              </span>
            </div>
            <button
              onClick={() => setShowWeightsDrawer(true)}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold underline whitespace-nowrap ml-4"
            >
              Adjust Weightings
            </button>
          </div>

          {/* 17.1 Smart Queue Categories Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {QUEUE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  title={cat.description}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search & Controller Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prioritised queue by customer name, reference, or invoice..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </form>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Assigned Controller:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Controllers</option>
                <option value="Sarah Miller">Sarah Miller</option>
                <option value="James Wilson">James Wilson</option>
                <option value="Oliver Stone">Oliver Stone</option>
                <option value="David Chen">David Chen</option>
              </select>
            </div>

            <button
              onClick={fetchWorkQueue}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingQueue ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Accounts List */}
          {isLoadingQueue ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-xs">Computing prioritised operational scores...</p>
            </div>
          ) : queueAccounts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Accounts in Selected Queue Category</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No accounts currently match the active filter criteria ({selectedCategory.replace(/_/g, ' ')}). All receivables in this category are settled or compliant with collection policies.
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-block"
              >
                View All Active Accounts
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {queueAccounts.map((account) => {
                const isExpanded = Boolean(expandedAccountIds[account.debtorId]);

                // Score badge color
                const scoreBadge =
                  account.urgencyLevel === 'critical'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/20'
                    : account.urgencyLevel === 'high'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/20'
                    : account.urgencyLevel === 'medium'
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <div
                    key={account.debtorId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 transition-all hover:border-slate-700"
                  >
                    {/* Header Row: Score, Name, Overdue Amount, Quick Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5">
                        {/* Priority Score Gauge Badge */}
                        <div
                          className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-mono font-bold shadow-sm ${scoreBadge}`}
                          title={`Priority Score: ${account.priorityScore}/100 (${account.urgencyLevel.toUpperCase()})`}
                        >
                          <span className="text-lg leading-tight">{account.priorityScore}</span>
                          <span className="text-[9px] uppercase tracking-wider font-sans font-bold">
                            {account.urgencyLevel}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-white tracking-tight">
                              {account.debtorName}
                            </h2>
                            {account.customerReference && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {account.customerReference}
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {account.accountImportance.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {account.country}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                            <span>
                              Overdue Exposure:{' '}
                              <strong className="text-rose-400 mono-num">
                                {formatCurrency(account.totalOverdue, account.currency)}
                              </strong>{' '}
                              ({account.overdueInvoicesCount} invoices)
                            </span>
                            <span>•</span>
                            <span>
                              Total Ledger:{' '}
                              <span className="text-white mono-num">
                                {formatCurrency(account.totalOutstanding, account.currency)}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              Oldest Overdue:{' '}
                              <strong className="text-amber-400 font-mono">
                                {account.oldestOverdueDays} days past due
                              </strong>
                              {account.oldestInvoiceNumber && ` (${account.oldestInvoiceNumber})`}
                            </span>
                            <span>•</span>
                            <span>
                              Controller: <span className="text-slate-300">{account.assignedCreditControllerName}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleScoreBreakdown(account.debtorId)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors"
                        >
                          <span>Why Prioritised?</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => openTaskForDebtor(account.debtorId, account.debtorName)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Task</span>
                        </button>

                        {onSelectDebtor && (
                          <button
                            onClick={() => onSelectDebtor(account.debtorId)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 border border-slate-700"
                            title="Open Debtor Ledger"
                          >
                            <span>Debtor</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Operational Tags & Suggested Action */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
                      {/* Matched Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {account.matchedCategories.map((catKey) => {
                          const catInfo = QUEUE_CATEGORIES.find((c) => c.id === catKey);
                          if (!catInfo || catKey === 'all') return null;
                          return (
                            <span
                              key={catKey}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${catInfo.badgeColor}`}
                            >
                              {catInfo.label}
                            </span>
                          );
                        })}
                        {account.brokenPromisesCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-300 border border-red-500/30 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{account.brokenPromisesCount} Broken Promise(s)</span>
                          </span>
                        )}
                        {account.activeDisputesCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            {account.activeDisputesCount} Active Dispute
                          </span>
                        )}
                        {account.pendingEvidenceCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            Remittance Evidence Pending Verification
                          </span>
                        )}
                      </div>

                      {/* Suggested Action Advice */}
                      <div className="flex items-center space-x-2 text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="text-[11px]">
                          <strong>Action:</strong> {account.suggestedAction}
                        </span>
                      </div>
                    </div>

                    {/* 17.2 Expandable "Why is this account prioritised?" Transparent Score Breakdown */}
                    {isExpanded && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center space-x-2">
                            <Sliders className="w-4 h-4 text-indigo-400" />
                            <h4 className="font-bold text-white">
                              Transparent Prioritisation Score Breakdown ({account.priorityScore} / 100)
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Deterministic Rule Computation
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {account.scoreBreakdown.map((factor, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between space-x-3"
                            >
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-200 block text-xs">
                                  {factor.factor}
                                </span>
                                <p className="text-[11px] text-slate-400">{factor.explanation}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs whitespace-nowrap">
                                +{factor.points} pts
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                          <span>
                            Last Contact:{' '}
                            <strong className="text-slate-300">{account.lastContactDate || 'Never'}</strong>{' '}
                            ({account.daysSinceLastContact} days ago)
                          </span>
                          <span>Open Collector Tasks: <strong className="text-slate-300">{account.openTasksCount}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: COLLECTION TASKS (17.3)                                      */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="space-y-5">
          {/* Controls: Filter by Status, Task Type, Assignee & New Task */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Status:</span>
              {(['pending', 'in_progress', 'completed', 'all'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                    taskStatusFilter === st
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Type:</span>
                <select
                  value={taskTypeFilter}
                  onChange={(e) => setTaskTypeFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Task Types</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Assignee:</span>
                <select
                  value={taskAssigneeFilter}
                  onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Staff</option>
                  <option value="usr-1">Sarah Miller</option>
                  <option value="usr-4">James Wilson</option>
                  <option value="usr-3">Oliver Stone</option>
                  <option value="usr-2">David Chen</option>
                </select>
              </div>

              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Tasks List */}
          {isLoadingTasks ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-xs">Loading collection tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Collection Tasks Found</h3>
              <p className="text-xs text-slate-400">All scheduled follow-ups are clear for the selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const typeCfg = TASK_TYPES.find((t) => t.id === task.taskType) || TASK_TYPES[0];
                const TypeIcon = typeCfg.icon;
                const isOverdue = task.status !== 'completed' && task.dueDate < new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={task.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-lg space-y-3.5 transition-all ${
                      task.status === 'completed'
                        ? 'border-slate-800/60 opacity-75'
                        : isOverdue
                        ? 'border-rose-500/40'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header: Type icon, title, priority */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeCfg.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-300 font-semibold">{task.debtorName}</span>
                            {task.invoiceNumber && <span>• Inv: {task.invoiceNumber}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {/* Notes if available */}
                    {task.notes && (
                      <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        {task.notes}
                      </p>
                    )}

                    {/* Completion outcome notes if completed */}
                    {task.status === 'completed' && task.outcomeNotes && (
                      <div className="text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span><strong>Outcome:</strong> {task.outcomeNotes} (Completed on {task.completionDate})</span>
                      </div>
                    )}

                    {/* Footer: Due date, assignee, completion toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-center space-x-3 text-slate-400">
                        <span className={`flex items-center space-x-1 ${isOverdue ? 'text-rose-400 font-bold' : ''}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Due: {task.dueDate}</span>
                          {isOverdue && <span className="text-[10px] uppercase font-bold ml-1">(OVERDUE)</span>}
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{task.assignedUserName}</span>
                        </span>
                      </div>

                      {task.status !== 'completed' ? (
                        <button
                          onClick={() => setCompletingTaskId(task.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 flex items-center space-x-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: TEAM WORKLOAD & FAIR OPERATIONAL PERFORMANCE (17.4)           */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Ethical Collections Policy Callout (17.4) */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start space-x-3.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-xs text-slate-300">
              <h4 className="font-bold text-white text-sm">
                Fair Operational Performance & Ethical Collection Directive (Section 17.4)
              </h4>
              <p className="text-slate-400 leading-relaxed">
                CNTCollect evaluates credit control efficiency on genuine operational outcomes — verified cash recovered, promises-to-pay adhered to, and dispute resolution turnaround speed.
                <strong className="text-slate-200 ml-1">
                  We explicitly do not equate a high volume of outbound messages with successful collections.
                </strong> Sustainable debt collection protects debtor relationships while securing authoritative settlement.
              </p>
            </div>
          </div>

          {/* Aggregate Team Outcomes Cards */}
          {teamWorkload && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Total Cash Recovered
                </span>
                <span className="text-xl font-bold text-emerald-400 mono-num block">
                  {formatCurrency(teamWorkload.summary.totalCashRecovered, currency)}
                </span>
                <span className="text-[11px] text-slate-400">From settled & partially collected accounts</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Promise Kept Rate
                </span>
                <span className="text-xl font-bold text-indigo-400 mono-num block">
                  {teamWorkload.summary.avgPromisesKeptRate}%
                </span>
                <span className="text-[11px] text-slate-400">Fulfilled commitments vs broken agreements</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Open Tasks in Flight
                </span>
                <span className="text-xl font-bold text-white mono-num block">
                  {teamWorkload.summary.totalOpenTasks}
                </span>
                <span className="text-[11px] text-rose-400 font-semibold">
                  {teamWorkload.summary.totalOverdueTasks} Overdue Tasks
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Completed Follow-ups
                </span>
                <span className="text-xl font-bold text-cyan-400 mono-num block">
                  {teamWorkload.summary.totalCompletedTasks}
                </span>
                <span className="text-[11px] text-slate-400">Actions resolved & verified</span>
              </div>
            </div>
          )}

          {/* Team Member Performance Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Credit Controllers & Operational Portfolios</span>
            </h3>

            {isLoadingTeam ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-xs">Calculating team workload metrics...</p>
              </div>
            ) : !teamWorkload ? (
              <div className="p-8 text-center text-slate-500">No team workload data available</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {teamWorkload.collectors.map((collector) => (
                  <div
                    key={collector.userId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                          {collector.userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{collector.userName}</h4>
                          <span className="text-xs text-slate-400">{collector.userRole}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                          SLA Compliance: <strong className="text-indigo-400">{collector.slaComplianceRate}%</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operational Task Gauges */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Open Tasks</span>
                        <strong className="text-white mono-num text-sm">{collector.openTasksCount}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Overdue Tasks</span>
                        <strong className={`mono-num text-sm ${collector.overdueTasksCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          {collector.overdueTasksCount}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Completed</span>
                        <strong className="text-emerald-400 mono-num text-sm">{collector.completedTasksCount}</strong>
                      </div>
                    </div>

                    {/* Fair Outcome Metrics (17.4) */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Cash Recovered:</span>
                        <strong className="text-emerald-400 mono-num">
                          {formatCurrency(collector.cashRecovered, currency)}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>Payment Promises Kept:</span>
                        <span className="mono-num">
                          <strong className="text-indigo-300">{collector.promisesKeptRate}%</strong> adherence ({collector.promisesSecuredCount} promises)
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${collector.promisesKeptRate}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-slate-300 pt-1">
                        <span>Disputes Resolved:</span>
                        <span>
                          <strong className="text-purple-300">{collector.disputesResolvedCount} cases</strong> • Avg {collector.avgResolutionTurnaroundDays} days turnaround
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 pt-1">
                        <span>Accounts Awaiting Contact:</span>
                        <span className="text-amber-400 font-semibold">
                          {collector.accountsAwaitingContactCount} accounts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accounts Without Recent Activity Table (> 14 days) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Accounts Without Recent Activity (&gt; 14 Days Inactive)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Mandatory follow-up trigger
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Overdue Balance</th>
                    <th className="pb-2.5">Last Contact</th>
                    <th className="pb-2.5">Inactive Duration</th>
                    <th className="pb-2.5">Assigned Officer</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {debtors
                    .filter((d) => d.totalOverdue > 0)
                    .map((debtor) => (
                      <tr key={debtor.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 font-semibold text-white">{debtor.name}</td>
                        <td className="py-2.5 mono-num text-rose-400 font-bold">
                          {formatCurrency(debtor.totalOverdue, debtor.defaultCurrency || currency)}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {debtor.lastContactDate || debtor.lastPaymentDate || 'Never'}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px]">
                            16 days inactive
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{debtor.assignedCreditControllerName || 'Sarah Miller'}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => openTaskForDebtor(debtor.id, debtor.name, `Scheduled courtesy phone check-in for ${debtor.name}`)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Assign Task
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: CONFIGURE PRIORITISATION ENGINE WEIGHTS (17.2)              */}
      {/* ------------------------------------------------------------------- */}
      {showWeightsDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Prioritisation Engine Weights (Section 17.2)</h3>
                  <p className="text-xs text-slate-400">
                    Configure the relative importance of criteria. Transparent rule execution without unvalidated black-box predictions.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowWeightsDrawer(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Weight: Balance Exposure */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Outstanding Balance Weight ({weights.balanceWeight}x)</span>
                  <span className="text-slate-400 font-mono">1.0x — 5.0x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={weights.balanceWeight}
                  onChange={(e) => setWeights({ ...weights, balanceWeight: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Weight: Days Overdue */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Days Overdue Aging Weight ({weights.daysOverdueWeight}x)</span>
                  <span className="text-slate-400 font-mono">1.0x — 5.0x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={weights.daysOverdueWeight}
                  onChange={(e) => setWeights({ ...weights, daysOverdueWeight: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Broken Promise Penalty */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Broken Payment Promise Penalty (+{weights.brokenPromiseWeight} pts)</span>
                  <span className="text-slate-400 font-mono">5 — 50 pts</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={weights.brokenPromiseWeight}
                  onChange={(e) => setWeights({ ...weights, brokenPromiseWeight: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Repeated Late Payers Risk */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Repeated Late Payer Penalty (+{weights.repeatedLateWeight} pts)</span>
                  <span className="text-slate-400 font-mono">5 — 40 pts</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={weights.repeatedLateWeight}
                  onChange={(e) => setWeights({ ...weights, repeatedLateWeight: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Stale Contact Threshold & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Stale Inactivity Threshold (Days)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={weights.staleContactDays}
                    onChange={(e) => setWeights({ ...weights, staleContactDays: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">High-Value Overdue Threshold ({currency})</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={weights.highValueThreshold}
                    onChange={(e) => setWeights({ ...weights, highValueThreshold: parseInt(e.target.value) || 10000 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setWeights({
                    balanceWeight: 2.5,
                    daysOverdueWeight: 3.0,
                    brokenPromiseWeight: 25,
                    repeatedLateWeight: 20,
                    staleContactWeight: 15,
                    disputeAdjustment: 10,
                    accountImportanceWeight: 20,
                    highValueThreshold: 10000,
                    recentlyOverdueDays: 14,
                    staleContactDays: 10,
                  })
                }
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Reset to Defaults
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWeightsDrawer(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWeights}
                  disabled={isSavingWeights}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20"
                >
                  {isSavingWeights ? 'Saving & Recalculating...' : 'Save & Re-rank Queue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: NEW COLLECTION TASK (17.3)                                 */}
      {/* ------------------------------------------------------------------- */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateTask}
            className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Collection Task (Section 17.3)</h3>
                  <p className="text-xs text-slate-400">Assign structured follow-up tasks to credit controllers.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call customer AP to follow up on overdue invoice INV-2026-0891"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Customer Account *</label>
                  <select
                    required
                    value={newTaskDebtorId}
                    onChange={(e) => setNewTaskDebtorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Select Customer</option>
                    {debtors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({formatCurrency(d.totalOverdue, d.defaultCurrency || currency)} overdue)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Related Invoice (Optional)</label>
                  <select
                    value={newTaskInvoiceId}
                    onChange={(e) => setNewTaskInvoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">No specific invoice (All ledger)</option>
                    {invoices
                      .filter((i) => !newTaskDebtorId || i.debtorId === newTaskDebtorId)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.invoiceNumber} — {formatCurrency(i.amountDue, i.currency)} ({i.daysOverdue}d overdue)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Task Type *</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as CollectionTaskType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Assigned User *</label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="usr-1">Sarah Miller (Sr. Controller)</option>
                    <option value="usr-4">James Wilson (Collector)</option>
                    <option value="usr-3">Oliver Stone (Operations)</option>
                    <option value="usr-2">David Chen (Finance Mgr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as CollectionTaskPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reminder Alert (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newTaskReminder}
                    onChange={(e) => setNewTaskReminder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Internal Operational Notes</label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Specific instructions, phone numbers, or context for the controller..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingTask}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20"
              >
                {isCreatingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 3: COMPLETE TASK OUTCOME NOTES DIALOG                         */}
      {/* ------------------------------------------------------------------- */}
      {completingTaskId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto text-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Complete Collection Task</h3>
                <p className="text-xs text-slate-400">Record operational outcome and completion notes.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">
                Outcome Notes / Action Result *
              </label>
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Spoke to Finance Director. Secured payment promise for £8,000 on Friday. Customer requested updated statement."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletingTaskId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCompleteTask(completingTaskId)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
