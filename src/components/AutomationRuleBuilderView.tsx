import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Play,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Copy,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Sliders,
  Settings2,
  Info,
  HelpCircle,
  ExternalLink,
  Send,
  Bot,
  FileText,
  UserCheck,
  UserPlus,
  Bell,
  ArrowUpRight,
  Lock,
  RotateCcw,
  Activity,
  History,
  Layers,
  Sparkles,
  DollarSign,
  Building,
  Mail,
  MessageSquare,
  CheckSquare,
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';
import {
  Organization,
  Invoice,
  Debtor,
  User as TeamUser,
  AutomationRule,
  AutomationTriggerType,
  ConditionField,
  ConditionOperator,
  AutomationCondition,
  AutomationActionType,
  AutomationAction,
  AutomationRuleSafety,
  RuleExecutionLog,
  AutomationRuleVersion
} from '../types';
import { formatCurrency } from '../services/calculations';

interface AutomationRuleBuilderViewProps {
  organization: Organization;
  debtors: Debtor[];
  invoices: Invoice[];
  teamUsers: TeamUser[];
  currentUser?: TeamUser;
  onRefreshData?: () => void;
}

// 21.1 Trigger Documentation Metadata
export const TRIGGER_CATALOGUE: Record<AutomationTriggerType, {
  label: string;
  category: string;
  description: string;
  iconName: string;
  hasOffset?: boolean;
  offsetLabel?: string;
}> = {
  invoice_created: {
    label: 'Invoice Created',
    category: 'Billing & Ingestion',
    description: 'Fires immediately when a new commercial invoice is uploaded, imported from ERP/CSV, or manually created.',
    iconName: 'FileText',
  },
  invoice_approaching_due: {
    label: 'Invoice Approaching Due Date',
    category: 'Early Intervention',
    description: 'Fires N days prior to invoice contractual maturity for polite courtesy remittance reminders.',
    iconName: 'Clock',
    hasOffset: true,
    offsetLabel: 'Days Before Due Date',
  },
  invoice_overdue: {
    label: 'Invoice Becomes Overdue',
    category: 'Delinquency',
    description: 'Fires as soon as contractual due date elapses without full verified payment reconciliation.',
    iconName: 'AlertTriangle',
    hasOffset: true,
    offsetLabel: 'Days Past Due Date',
  },
  payment_recorded: {
    label: 'Payment Recorded',
    category: 'Cash Operations',
    description: 'Fires when a customer payment receipt is entered into the system or received from bank feeds.',
    iconName: 'DollarSign',
  },
  payment_allocated: {
    label: 'Payment Allocated',
    category: 'Cash Operations',
    description: 'Fires when an unallocated cash receipt is applied to one or more specific invoice balances.',
    iconName: 'CheckCircle2',
  },
  payment_reversed: {
    label: 'Payment Reversed / Bounced',
    category: 'Risk & Reversal',
    description: 'Fires when a bank wire fails, direct debit is returned unpaid, or card payment is charged back.',
    iconName: 'RotateCcw',
  },
  promise_created: {
    label: 'Payment Promise (PTP) Created',
    category: 'Commitment Tracking',
    description: 'Fires when a formal customer commitment to pay on a specific date is secured by a collector.',
    iconName: 'Calendar',
  },
  promise_missed: {
    label: 'Payment Promise Missed',
    category: 'Commitment Tracking',
    description: 'Fires when a promised settlement date passes without receiving the committed funds in the ledger.',
    iconName: 'AlertOctagon',
  },
  customer_response_received: {
    label: 'Customer Response Received',
    category: 'Customer Engagement',
    description: 'Fires when customer sends an inbound email, WhatsApp reply, or submits a portal query.',
    iconName: 'MessageSquare',
  },
  dispute_opened: {
    label: 'Dispute Opened',
    category: 'Dispute & Governance',
    description: 'Fires when a formal commercial dispute or invoice query is lodged by the customer or credit controller.',
    iconName: 'ShieldAlert',
  },
  dispute_resolved: {
    label: 'Dispute Resolved',
    category: 'Dispute & Governance',
    description: 'Fires when a commercial dispute is marked as resolved, conciliated, or goodwill credit note applied.',
    iconName: 'ShieldCheck',
  },
  reminder_failed: {
    label: 'Reminder Failed / Bounced',
    category: 'Technical Safeguards',
    description: 'Fires when email delivery encounters a hard bounce, WhatsApp template fails, or SMS drops.',
    iconName: 'AlertCircle',
  },
  balance_zero: {
    label: 'Invoice Balance Reaches Zero',
    category: 'Settlement & Close',
    description: 'Fires when total payments and authorized credit notes fully satisfy the outstanding invoice balance.',
    iconName: 'CheckSquare',
  },
};

// 21.2 Condition Field Metadata
export const CONDITION_FIELDS: Record<ConditionField, {
  label: string;
  type: 'number' | 'string' | 'select';
  description: string;
  options?: { value: string; label: string }[];
}> = {
  days_overdue: {
    label: 'Days Overdue',
    type: 'number',
    description: 'Number of calendar days elapsed since invoice contractual due date.',
  },
  outstanding_amount: {
    label: 'Outstanding Amount',
    type: 'number',
    description: 'Current remaining collectible balance on invoice in ledger currency.',
  },
  currency: {
    label: 'Invoice Currency',
    type: 'select',
    description: 'Contractual settlement currency of the receivable.',
    options: [
      { value: 'GBP', label: 'GBP (£)' },
      { value: 'EUR', label: 'EUR (€)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'ZAR', label: 'ZAR (R)' },
    ],
  },
  customer_category: {
    label: 'Customer Category',
    type: 'select',
    description: 'Classification segment of debtor organisation.',
    options: [
      { value: 'enterprise', label: 'Enterprise / Corporate' },
      { value: 'sme', label: 'SME / Commercial' },
      { value: 'government', label: 'Public Sector / NHS' },
      { value: 'individual', label: 'Sole Trader / Retail' },
    ],
  },
  invoice_status: {
    label: 'Invoice Status',
    type: 'select',
    description: 'Current ledger state of the invoice.',
    options: [
      { value: 'issued', label: 'Issued / Current' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'on_hold', label: 'Administrative Hold' },
      { value: 'disputed', label: 'Disputed' },
      { value: 'paid', label: 'Fully Paid' },
    ],
  },
  payment_history: {
    label: 'Payment History / Risk Tier',
    type: 'select',
    description: 'Assessed customer payment reliability and credit risk grade.',
    options: [
      { value: 'low', label: 'Low Risk (Punctual Payer)' },
      { value: 'moderate', label: 'Moderate Risk (Occasional Delays)' },
      { value: 'elevated', label: 'Elevated Risk (Frequent Extensions)' },
      { value: 'high', label: 'High Risk (Severe Delinquency)' },
      { value: 'critical', label: 'Critical Risk (Insolvency Watch)' },
    ],
  },
  reminder_count: {
    label: 'Reminders Already Sent',
    type: 'number',
    description: 'Cumulative number of prior reminders dispatched for this invoice.',
  },
  dispute_status: {
    label: 'Dispute Status',
    type: 'select',
    description: 'Active commercial dispute state on the receivable.',
    options: [
      { value: 'none', label: 'None (Undisputed)' },
      { value: 'open', label: 'Open Dispute' },
      { value: 'under_investigation', label: 'Under Investigation' },
      { value: 'resolved', label: 'Resolved / Closed' },
    ],
  },
  assigned_controller: {
    label: 'Assigned Credit Controller',
    type: 'string',
    description: 'Name or ID of team member responsible for this account.',
  },
  communication_preference: {
    label: 'Customer Communication Preference',
    type: 'select',
    description: 'Preferred primary dispatch channel consented by debtor.',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'sms', label: 'SMS' },
      { value: 'postal', label: 'Postal Letter' },
    ],
  },
  account_hold_status: {
    label: 'Account Hold Status',
    type: 'select',
    description: 'Whether the debtor account is under legal or credit hold.',
    options: [
      { value: 'active', label: 'Active (No Hold)' },
      { value: 'on_hold', label: 'On Hold (Credit Suspended)' },
    ],
  },
};

// 21.3 Action Types Metadata
export const ACTION_CATALOGUE: Record<AutomationActionType, {
  label: string;
  category: string;
  description: string;
  iconName: string;
  isExternalCommunication?: boolean;
}> = {
  send_approved_reminder: {
    label: 'Send Approved Reminder',
    category: 'Outbound Communications',
    description: 'Transmits a compliant, template-governed payment reminder via Email, WhatsApp, or SMS.',
    iconName: 'Send',
    isExternalCommunication: true,
  },
  generate_ai_draft: {
    label: 'Generate AI Contextual Draft',
    category: 'AI Assistance',
    description: 'Creates a tailored, human-reviewable email draft analyzing debtor sentiment and payment history.',
    iconName: 'Bot',
    isExternalCommunication: false,
  },
  create_followup_task: {
    label: 'Create Follow-up Task',
    category: 'Workload & Collector Queue',
    description: 'Generates a prioritized task in the Collector Workspace with a specific due date offset.',
    iconName: 'CheckSquare',
    isExternalCommunication: false,
  },
  assign_account: {
    label: 'Assign Account / Controller',
    category: 'Workload & Collector Queue',
    description: 'Reallocates the debtor account or invoice to a designated credit controller or specialist team.',
    iconName: 'UserCheck',
    isExternalCommunication: false,
  },
  notify_staff_member: {
    label: 'Notify Internal Staff Member',
    category: 'Internal Alerts',
    description: 'Sends an internal notification or email alert to the finance manager, sales director, or account owner.',
    iconName: 'Bell',
    isExternalCommunication: false,
  },
  escalate_account: {
    label: 'Escalate Account',
    category: 'Delinquency & Legal',
    description: 'Moves the receivable into formal management review, pre-action protocol, or legal recovery queue.',
    iconName: 'ArrowUpRight',
    isExternalCommunication: false,
  },
  pause_reminders: {
    label: 'Pause Automated Reminders',
    category: 'Governance & Safeguards',
    description: 'Freezes all automated dunning dispatches (e.g. during active commercial dispute or mediation).',
    iconName: 'Lock',
    isExternalCommunication: false,
  },
  request_human_approval: {
    label: 'Request Human Approval',
    category: 'Governance & Safeguards',
    description: 'Suspends execution and routes the proposed action to a senior manager for affirmative sign-off.',
    iconName: 'ShieldAlert',
    isExternalCommunication: false,
  },
  update_workflow_status: {
    label: 'Update Workflow Status',
    category: 'Ledger Operations',
    description: 'Modifies the operational invoice status (e.g. set to on_hold, under_investigation, or escalated).',
    iconName: 'Sliders',
    isExternalCommunication: false,
  },
  generate_report: {
    label: 'Generate Report / Statement',
    category: 'Reporting & Analytics',
    description: 'Generates an on-demand PDF customer statement, ageing report, or dispute audit snapshot.',
    iconName: 'FileSpreadsheet',
    isExternalCommunication: false,
  },
  notify_customer_payment_verified: {
    label: 'Notify Customer: Payment Verified',
    category: 'Settlement & Close',
    description: 'Sends formal settlement acknowledgment and zero-balance statement to customer upon verified clearance.',
    iconName: 'CheckCircle2',
    isExternalCommunication: true,
  },
};

export const AutomationRuleBuilderView: React.FC<AutomationRuleBuilderViewProps> = ({
  organization,
  debtors,
  invoices,
  teamUsers,
  currentUser,
  onRefreshData,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'catalogue' | 'executions' | 'safety'>('catalogue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTriggerFilter, setSelectedTriggerFilter] = useState<string>('all');

  // Rules state from API
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executionLogs, setExecutionLogs] = useState<RuleExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals state
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [dryRunRule, setDryRunRule] = useState<AutomationRule | null>(null);
  const [dryRunResults, setDryRunResults] = useState<any | null>(null);
  const [isDryRunLoading, setIsDryRunLoading] = useState(false);

  // Test mode modal
  const [testModeRule, setTestModeRule] = useState<AutomationRule | null>(null);
  const [testTargetInvoiceId, setTestTargetInvoiceId] = useState<string>('');
  const [testExecutionResult, setTestExecutionResult] = useState<any | null>(null);
  const [isTestingLoading, setIsTestingLoading] = useState(false);

  // Version history modal
  const [versionHistoryRule, setVersionHistoryRule] = useState<AutomationRule | null>(null);

  // High-Volume Confirmation Modal (21.4)
  const [highVolumeConfirmModal, setHighVolumeConfirmModal] = useState<{
    rule: AutomationRule;
    matchedCount: number;
    threshold: number;
  } | null>(null);

  // Fetch rules from API
  const fetchRules = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/automation-rules?orgId=${organization.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRules(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load automation rules:', err);
      setErrorMsg('Failed to fetch automation rules from server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch execution history logs from API
  const fetchExecutionLogs = async () => {
    try {
      const res = await fetch(`/api/automation-rules/executions?orgId=${organization.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setExecutionLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to load execution logs:', err);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchExecutionLogs();
  }, [organization.id]);

  // Handle Rule Activation Toggle with High-Volume Safeguard (21.4)
  const handleToggleRule = async (rule: AutomationRule, forceConfirm = false) => {
    try {
      const res = await fetch(`/api/automation-rules/${rule.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedHighVolume: forceConfirm,
          updatedBy: currentUser?.name || 'Alice Morgan (Admin)',
        }),
      });
      const data = await res.json();

      if (data.requiresHighVolumeConfirmation && !forceConfirm) {
        // Show High Volume Confirmation Modal
        setHighVolumeConfirmModal({
          rule,
          matchedCount: data.matchedCount,
          threshold: data.threshold,
        });
        return;
      }

      if (data.success) {
        setHighVolumeConfirmModal(null);
        setSuccessBanner(data.message);
        setTimeout(() => setSuccessBanner(null), 4000);
        await fetchRules();
      } else {
        setErrorMsg(data.error || 'Failed to toggle rule state.');
      }
    } catch (err: any) {
      console.error('Error toggling rule:', err);
      setErrorMsg('Network error while toggling rule status.');
    }
  };

  // Handle Dry-Run Preview (21.4)
  const handleRunDryRun = async (rule: AutomationRule) => {
    setDryRunRule(rule);
    setDryRunResults(null);
    setIsDryRunLoading(true);
    try {
      const res = await fetch(`/api/automation-rules/${rule.id}/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setDryRunResults(data);
      } else {
        setErrorMsg(data.error || 'Dry-run evaluation failed.');
      }
    } catch (err) {
      console.error('Error during dry-run:', err);
      setErrorMsg('Dry-run network request failed.');
    } finally {
      setIsDryRunLoading(false);
    }
  };

  // Handle Test Mode Execution (21.4)
  const handleRunTestMode = async (rule: AutomationRule) => {
    setTestModeRule(rule);
    setTestTargetInvoiceId(invoices[0]?.id || '');
    setTestExecutionResult(null);
  };

  const executeTestMode = async () => {
    if (!testModeRule) return;
    setIsTestingLoading(true);
    try {
      const res = await fetch(`/api/automation-rules/${testModeRule.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetInvoiceId: testTargetInvoiceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestExecutionResult(data);
        await fetchExecutionLogs();
        await fetchRules();
      } else {
        setErrorMsg(data.error || 'Test mode execution failed.');
      }
    } catch (err) {
      console.error('Test execution error:', err);
      setErrorMsg('Test execution failed.');
    } finally {
      setIsTestingLoading(false);
    }
  };

  // Handle Delete Rule
  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!window.confirm(`Are you sure you want to delete automation rule "${ruleName}"? This action is logged to the forensic audit trail.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/automation-rules/${ruleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessBanner(`Rule "${ruleName}" deleted successfully.`);
        setTimeout(() => setSuccessBanner(null), 3000);
        await fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
      const matchesTrigger = selectedTriggerFilter === 'all' || r.triggerType === selectedTriggerFilter;
      return matchesSearch && matchesCategory && matchesTrigger;
    });
  }, [rules, searchQuery, selectedCategory, selectedTriggerFilter]);

  // Aggregate Metrics
  const metricsSummary = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.isActive).length;
    const inTest = rules.filter((r) => r.safety?.isTestMode).length;
    const totalExecutions = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);
    const successExecutions = rules.reduce((acc, r) => acc + (r.successCount || 0), 0);
    const successRate = totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 100;
    return { total, active, inTest, totalExecutions, successRate };
  }, [rules]);

  // Start Create New Rule
  const handleOpenCreateRule = () => {
    const defaultNewRule: AutomationRule = {
      id: '',
      organizationId: organization.id,
      name: '',
      description: '',
      category: 'delinquency',
      isActive: false,
      version: 1,
      triggerType: 'invoice_overdue',
      triggerConfig: { overdueDaysThreshold: 7 },
      conditions: [
        {
          id: `cond-${Date.now()}-1`,
          field: 'days_overdue',
          operator: 'greater_than_or_equal',
          value: 7,
          logicalOperator: 'AND',
        },
        {
          id: `cond-${Date.now()}-2`,
          field: 'outstanding_amount',
          operator: 'greater_than',
          value: 100,
          logicalOperator: 'AND',
        },
        {
          id: `cond-${Date.now()}-3`,
          field: 'dispute_status',
          operator: 'equals',
          value: 'none',
        },
      ],
      actions: [
        {
          id: `act-${Date.now()}-1`,
          actionType: 'send_approved_reminder',
          parameters: {
            channel: 'email',
            tone: 'firm_overdue',
            customNote: 'Standard statutory 7-day reminder notice.',
          },
        },
        {
          id: `act-${Date.now()}-2`,
          actionType: 'create_followup_task',
          parameters: {
            taskTitle: 'Conduct follow-up verification call',
            taskType: 'call_debtor',
            priority: 'medium',
            dueOffsetDays: 3,
          },
        },
      ],
      safety: {
        isTestMode: true, // Default to test mode for safety (21.4)
        duplicatePreventionCooldownHours: 24,
        maxRetries: 2,
        retryBackoffSeconds: 30,
        preventInfiniteLoops: true,
        requiresHighVolumeConfirmation: true,
        highVolumeThreshold: 10,
      },
      versionsHistory: [],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Alice Morgan (Admin)',
      updatedAt: new Date().toISOString(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
    };
    setEditingRule(defaultNewRule);
    setIsBuilderOpen(true);
  };

  // Start Edit Existing Rule
  const handleOpenEditRule = (rule: AutomationRule) => {
    // Clone rule so edits don't mutate local state prematurely
    setEditingRule(JSON.parse(JSON.stringify(rule)));
    setIsBuilderOpen(true);
  };

  // Save Rule from Builder
  const handleSaveRule = async (ruleData: AutomationRule, changelogNote: string) => {
    try {
      const isNew = !ruleData.id;
      const url = isNew ? '/api/automation-rules' : `/api/automation-rules/${ruleData.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        ...ruleData,
        changelog: changelogNote || (isNew ? 'Initial rule creation in Visual Builder' : 'Rule configuration updated'),
        updatedBy: currentUser?.name || 'Alice Morgan (Admin)',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsBuilderOpen(false);
        setEditingRule(null);
        setSuccessBanner(data.message || 'Rule saved successfully.');
        setTimeout(() => setSuccessBanner(null), 4000);
        await fetchRules();
      } else {
        alert(data.error || 'Failed to save automation rule.');
      }
    } catch (err: any) {
      console.error('Save rule error:', err);
      alert('Network error while saving automation rule.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Banner & Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  Automation Rule Builder
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                    Part 21 Standard
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Visual and structured workflow orchestrator with trigger-condition-action pipelines, dry-run previews, recursion guards, and volume safeguards.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchRules}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 active:scale-95 transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleOpenCreateRule}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Automation Rule</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Configured Rules</div>
            <div className="text-xl font-bold text-white mt-1">{metricsSummary.total}</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active in Production
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-1">{metricsSummary.active}</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-amber-400 font-medium">In Test / Simulation Mode</div>
            <div className="text-xl font-bold text-amber-300 mt-1">{metricsSummary.inTest}</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Total Lifetime Runs</div>
            <div className="text-xl font-bold text-white mt-1">{metricsSummary.totalExecutions.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-xs text-cyan-400 font-medium">Pipeline Reliability</div>
            <div className="text-xl font-bold text-cyan-300 mt-1">{metricsSummary.successRate}%</div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 text-sm">
        <button
          onClick={() => setActiveTab('catalogue')}
          className={`pb-3 px-4 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'catalogue'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Automation Rules Catalogue ({filteredRules.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('executions');
            fetchExecutionLogs();
          }}
          className={`pb-3 px-4 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'executions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Execution History & Forensic Logs (21.4)</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`pb-3 px-4 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'safety'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Safety, Idempotency & Volume Safeguards</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATION RULES CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search rules by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="delinquency">Delinquency</option>
                <option value="early_due">Early Due / Pre-Due</option>
                <option value="payment">Cash & Payments</option>
                <option value="dispute">Dispute Governance</option>
                <option value="onboarding">Onboarding</option>
                <option value="compliance">Compliance</option>
              </select>

              {/* Trigger Filter */}
              <select
                value={selectedTriggerFilter}
                onChange={(e) => setSelectedTriggerFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Trigger Types</option>
                {Object.entries(TRIGGER_CATALOGUE).map(([key, trig]) => (
                  <option key={key} value={key}>
                    {trig.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 text-xs">
              Showing {filteredRules.length} of {rules.length} rules
            </div>
          </div>

          {/* Rules Cards List */}
          {filteredRules.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No automation rules match your criteria</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create custom trigger-condition-action automation workflows to manage reminders, task allocation, dispute holds, and payment confirmations.
              </p>
              <button
                onClick={handleOpenCreateRule}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition"
              >
                Create First Automation Rule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRules.map((rule) => {
                const trigMeta = TRIGGER_CATALOGUE[rule.triggerType] || {
                  label: rule.triggerType,
                  category: 'General',
                  description: '',
                };

                return (
                  <div
                    key={rule.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md ${
                      rule.isActive
                        ? 'border-slate-800 hover:border-slate-700'
                        : 'border-slate-800/60 opacity-80'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <h3 className="text-base font-bold text-white tracking-tight">{rule.name}</h3>

                          {/* Version Badge */}
                          <button
                            onClick={() => setVersionHistoryRule(rule)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-indigo-500/30 hover:bg-slate-700 transition flex items-center space-x-1"
                            title="Click to view rule version history"
                          >
                            <span>v{rule.version || 1}</span>
                            <History className="w-2.5 h-2.5 text-indigo-400" />
                          </button>

                          {/* Category Badge */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {rule.category?.toUpperCase() || 'GENERAL'}
                          </span>

                          {/* Test Mode Badge */}
                          {rule.safety?.isTestMode && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Test Mode (No External Comm)</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">{rule.description}</p>
                      </div>

                      {/* Right Controls: Active Toggle & Primary Action Buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 ${
                            rule.isActive
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          <span>{rule.isActive ? 'Active' : 'Inactive'}</span>
                        </button>

                        {/* Dry Run Preview Button */}
                        <button
                          onClick={() => handleRunDryRun(rule)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center space-x-1"
                          title="Simulate rule against database without executing actions"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Dry-Run</span>
                        </button>

                        {/* Test Mode Single-Entity Runner */}
                        <button
                          onClick={() => handleRunTestMode(rule)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center space-x-1"
                          title="Test rule against specific invoice"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="hidden sm:inline">Test</span>
                        </button>

                        {/* Edit Rule Button */}
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                          title="Edit rule workflow"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Rule Button */}
                        <button
                          onClick={() => handleDeleteRule(rule.id, rule.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Pipeline Visual Flow: Trigger -> Conditions -> Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                      {/* Step 1: Trigger (21.1) */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-indigo-400" />
                          <span>Trigger Event (21.1)</span>
                        </div>
                        <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                          <span>{trigMeta.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{trigMeta.description}</p>
                        {rule.triggerConfig?.approachingDaysOffset !== undefined && (
                          <div className="text-[10px] text-indigo-300 font-mono">
                            Offset: {rule.triggerConfig.approachingDaysOffset} days before due
                          </div>
                        )}
                        {rule.triggerConfig?.overdueDaysThreshold !== undefined && (
                          <div className="text-[10px] text-amber-300 font-mono">
                            Threshold: {rule.triggerConfig.overdueDaysThreshold} days past due
                          </div>
                        )}
                      </div>

                      {/* Step 2: Conditions (21.2) */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                          <Filter className="w-3 h-3 text-cyan-400" />
                          <span>Evaluation Conditions (21.2) ({rule.conditions?.length || 0})</span>
                        </div>
                        {(!rule.conditions || rule.conditions.length === 0) ? (
                          <div className="text-[11px] text-slate-500 italic">No conditions (fires on all trigger events)</div>
                        ) : (
                          <div className="space-y-1">
                            {rule.conditions.map((cond, idx) => (
                              <div
                                key={cond.id || idx}
                                className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-mono"
                              >
                                <span className="text-cyan-400 font-medium">
                                  {CONDITION_FIELDS[cond.field]?.label || cond.field}
                                </span>
                                <span className="text-slate-500">
                                  {cond.operator === 'equals'
                                    ? '='
                                    : cond.operator === 'not_equals'
                                    ? '!='
                                    : cond.operator === 'greater_than'
                                    ? '>'
                                    : cond.operator === 'greater_than_or_equal'
                                    ? '>='
                                    : cond.operator === 'less_than'
                                    ? '<'
                                    : cond.operator === 'less_than_or_equal'
                                    ? '<='
                                    : cond.operator}
                                </span>
                                <span className="text-slate-200 font-semibold">{String(cond.value)}</span>
                                {idx < rule.conditions.length - 1 && (
                                  <span className="text-[10px] text-slate-500 font-sans">
                                    [{cond.logicalOperator || 'AND'}]
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Step 3: Actions (21.3) */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Actions Pipeline (21.3) ({rule.actions?.length || 0})</span>
                        </div>
                        {(!rule.actions || rule.actions.length === 0) ? (
                          <div className="text-[11px] text-rose-400 italic">No actions configured</div>
                        ) : (
                          <div className="space-y-1">
                            {rule.actions.map((act, idx) => {
                              const actMeta = ACTION_CATALOGUE[act.actionType] || { label: act.actionType };
                              return (
                                <div
                                  key={act.id || idx}
                                  className="flex items-center space-x-1.5 text-[11px] text-slate-300"
                                >
                                  <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[9px] shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-emerald-300">{actMeta.label}</span>
                                  {act.parameters?.channel && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                                      {act.parameters.channel}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Info: Execution count & Safety Policies (21.4) */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/60 gap-2">
                      <div className="flex items-center space-x-4">
                        <span>
                          Runs: <strong className="text-white">{rule.executionCount || 0}</strong>
                        </span>
                        <span>
                          Success: <strong className="text-emerald-400">{rule.successCount || 0}</strong>
                        </span>
                        <span>
                          Cooldown: <strong>{rule.safety?.duplicatePreventionCooldownHours || 24}h</strong>
                        </span>
                        <span>
                          Retries: <strong>{rule.safety?.maxRetries || 2}</strong>
                        </span>
                      </div>

                      <div className="text-slate-500">
                        {rule.lastExecutedAt
                          ? `Last executed: ${rule.lastExecutedAt}`
                          : `Created on ${rule.createdAt?.split('T')[0] || '2026-09-01'}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXECUTION HISTORY & FORENSIC LOGS (21.4) */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Rule Execution History & Forensic Audit Log</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Every automated and test-mode workflow evaluation is logged with idempotency keys, condition evaluations, and duration.
                </p>
              </div>
              <button
                onClick={fetchExecutionLogs}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Logs</span>
              </button>
            </div>

            {executionLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No execution logs recorded yet. Use Dry-Run or Test Mode to generate execution entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Rule Name</th>
                      <th className="py-2.5 px-3">Trigger Entity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Conditions Evaluated</th>
                      <th className="py-2.5 px-3">Actions Taken</th>
                      <th className="py-2.5 px-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {executionLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                          {log.ruleName}
                          {log.isTestRun && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              TEST
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-semibold text-indigo-300">{log.triggerEntityName}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({log.triggerEntityType})</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.status === 'skipped_conditions'
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : log.status === 'blocked_by_safety'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            {log.conditionsEvaluated?.map((c, i) => (
                              <div key={i} className="flex items-center space-x-1 text-[10px]">
                                {c.passed ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <X className="w-3 h-3 text-rose-400" />
                                )}
                                <span>{c.field}: {c.actual} (wanted {c.expected})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div className="space-y-0.5">
                            {log.actionsExecuted?.map((a, i) => (
                              <div key={i} className="text-[10px] text-emerald-300">
                                • {a.summary}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">
                          {log.durationMs}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SAFETY, IDEMPOTENCY & VOLUME SAFEGUARDS (21.4) */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safeguard 1: Infinite Workflow Loop Prevention */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Infinite Workflow Loop Prevention (Section 21.4)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rules cannot trigger cascades that self-reference the same entity within a continuous call stack. When an action updates an invoice balance or state, recursion counters are evaluated. Any chain exceeding depth limit 3 is automatically halted and flagged for supervisor review.
              </p>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Active Recursion Guard Enabled</span>
                </div>
                <div className="text-slate-400 text-[11px]">Maximum execution depth: 3 hops • Max runtime budget: 2,500ms</div>
              </div>
            </div>

            {/* Safeguard 2: High-Volume Message Dispatch Guard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>High-Volume Confirmation Requirement (Section 21.4)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Before any rule that dispatches external customer communications (Email, WhatsApp, or SMS) can be activated in production, the engine calculates the matched recipient cohort. If more than 10 external messages would be triggered, explicit human confirmation is strictly mandated.
              </p>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs space-y-1">
                <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enforced Threshold: 10 Outbound Messages</span>
                </div>
                <div className="text-slate-400 text-[11px]">Unconfirmed bulk activations are rejected at the API boundary.</div>
              </div>
            </div>

            {/* Safeguard 3: Duplicate Suppression & Idempotency */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Clock className="w-5 h-5" />
                <span>Duplicate Prevention & Cooldown Windows</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every action execution generates an SHA-256 idempotency key combining the Rule ID, Target Entity ID, and Date Window. Configurable cooldown periods (e.g. 24h, 72h) ensure identical automated messages are never dispatched twice to the same contact.
              </p>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs space-y-1">
                <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Default Cooldown: 24 Hours (Configurable per rule)</span>
                </div>
                <div className="text-slate-400 text-[11px]">Prevents customer harassment and duplicate invoice notices.</div>
              </div>
            </div>

            {/* Safeguard 4: Rule Versioning & Forensic Audit */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <History className="w-5 h-5" />
                <span>Immutable Versioning & Audit Logging</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Modifications to triggers, conditions, or actions automatically increment the rule's version number (e.g. v1 to v2) and append to an immutable changelog recording the timestamp, author, and parameter diffs.
              </p>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs space-y-1">
                <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Forensic Audit Trail Recorded</span>
                </div>
                <div className="text-slate-400 text-[11px]">All changes synced with statutory audit log table.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VISUAL & STRUCTURED RULE BUILDER (Sections 21.1, 21.2, 21.3, 21.4) */}
      {/* ========================================================================= */}
      {isBuilderOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingRule.id ? `Edit Automation Rule (v${editingRule.version || 1})` : 'Create New Automation Rule'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure trigger, conditions, actions, and safety guardrails.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBuilderOpen(false);
                  setEditingRule(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Section 1: General Info */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rule Metadata & Category</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Rule Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="e.g. 7-Day Overdue Escalation Notice"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={editingRule.category}
                      onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="delinquency">Delinquency</option>
                      <option value="early_due">Early Due / Pre-Due</option>
                      <option value="payment">Cash & Payments</option>
                      <option value="dispute">Dispute Governance</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="compliance">Compliance</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Rule Description</label>
                    <textarea
                      rows={2}
                      value={editingRule.description}
                      onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                      placeholder="Explain the commercial or operational intent behind this automated workflow..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Trigger Event (21.1) */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. Trigger Event (21.1)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Trigger Type</label>
                    <select
                      value={editingRule.triggerType}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          triggerType: e.target.value as AutomationTriggerType,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-medium"
                    >
                      {Object.entries(TRIGGER_CATALOGUE).map(([key, trig]) => (
                        <option key={key} value={key}>
                          {trig.label} ({trig.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Offset Parameter for Approaching or Overdue triggers */}
                  {editingRule.triggerType === 'invoice_approaching_due' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Days Before Due Date Offset
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={editingRule.triggerConfig?.approachingDaysOffset ?? 3}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            triggerConfig: {
                              ...editingRule.triggerConfig,
                              approachingDaysOffset: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {editingRule.triggerType === 'invoice_overdue' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Days Overdue Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={editingRule.triggerConfig?.overdueDaysThreshold ?? 7}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            triggerConfig: {
                              ...editingRule.triggerConfig,
                              overdueDaysThreshold: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  {TRIGGER_CATALOGUE[editingRule.triggerType]?.description}
                </div>
              </div>

              {/* Section 3: Conditions Builder (21.2) */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    <span>2. Evaluation Conditions (21.2)</span>
                  </h4>
                  <button
                    onClick={() => {
                      const newCond: AutomationCondition = {
                        id: `cond-${Date.now()}`,
                        field: 'days_overdue',
                        operator: 'greater_than',
                        value: 0,
                        logicalOperator: 'AND',
                      };
                      setEditingRule({
                        ...editingRule,
                        conditions: [...(editingRule.conditions || []), newCond],
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Condition</span>
                  </button>
                </div>

                {(!editingRule.conditions || editingRule.conditions.length === 0) ? (
                  <div className="text-center py-4 text-slate-500 italic text-xs">
                    No conditions added. This rule will evaluate as TRUE for every trigger event.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingRule.conditions.map((cond, idx) => {
                      const fieldMeta = CONDITION_FIELDS[cond.field];

                      return (
                        <div
                          key={cond.id || idx}
                          className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          {/* Field Selector */}
                          <div className="flex-1 min-w-[150px]">
                            <select
                              value={cond.field}
                              onChange={(e) => {
                                const newField = e.target.value as ConditionField;
                                const updated = [...editingRule.conditions];
                                updated[idx].field = newField;
                                // Reset value default based on type
                                if (CONDITION_FIELDS[newField]?.type === 'number') updated[idx].value = 0;
                                else if (CONDITION_FIELDS[newField]?.options?.length) {
                                  updated[idx].value = CONDITION_FIELDS[newField].options![0].value;
                                } else updated[idx].value = '';
                                setEditingRule({ ...editingRule, conditions: updated });
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            >
                              {Object.entries(CONDITION_FIELDS).map(([fKey, fMeta]) => (
                                <option key={fKey} value={fKey}>
                                  {fMeta.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Operator */}
                          <div className="w-32">
                            <select
                              value={cond.operator}
                              onChange={(e) => {
                                const updated = [...editingRule.conditions];
                                updated[idx].operator = e.target.value as ConditionOperator;
                                setEditingRule({ ...editingRule, conditions: updated });
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                            >
                              <option value="equals">=</option>
                              <option value="not_equals">!=</option>
                              <option value="greater_than">&gt;</option>
                              <option value="greater_than_or_equal">&gt;=</option>
                              <option value="less_than">&lt;</option>
                              <option value="less_than_or_equal">&lt;=</option>
                              <option value="contains">contains</option>
                              <option value="in_list">in list</option>
                            </select>
                          </div>

                          {/* Value Input */}
                          <div className="flex-1 min-w-[140px]">
                            {fieldMeta?.type === 'select' ? (
                              <select
                                value={cond.value}
                                onChange={(e) => {
                                  const updated = [...editingRule.conditions];
                                  updated[idx].value = e.target.value;
                                  setEditingRule({ ...editingRule, conditions: updated });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              >
                                {fieldMeta.options?.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={fieldMeta?.type === 'number' ? 'number' : 'text'}
                                value={cond.value}
                                onChange={(e) => {
                                  const updated = [...editingRule.conditions];
                                  updated[idx].value =
                                    fieldMeta?.type === 'number' ? Number(e.target.value) : e.target.value;
                                  setEditingRule({ ...editingRule, conditions: updated });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              />
                            )}
                          </div>

                          {/* Logic Operator if not last */}
                          {idx < editingRule.conditions.length - 1 && (
                            <div className="w-20">
                              <select
                                value={cond.logicalOperator || 'AND'}
                                onChange={(e) => {
                                  const updated = [...editingRule.conditions];
                                  updated[idx].logicalOperator = e.target.value as 'AND' | 'OR';
                                  setEditingRule({ ...editingRule, conditions: updated });
                                }}
                                className="w-full bg-slate-800 text-indigo-300 font-bold border border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            onClick={() => {
                              const updated = editingRule.conditions.filter((_, i) => i !== idx);
                              setEditingRule({ ...editingRule, conditions: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4: Action Pipeline Builder (21.3) */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>3. Execution Actions Pipeline (21.3)</span>
                  </h4>
                  <button
                    onClick={() => {
                      const newAct: AutomationAction = {
                        id: `act-${Date.now()}`,
                        actionType: 'send_approved_reminder',
                        parameters: {
                          channel: 'email',
                          tone: 'polite_reminder',
                        },
                      };
                      setEditingRule({
                        ...editingRule,
                        actions: [...(editingRule.actions || []), newAct],
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Action</span>
                  </button>
                </div>

                {(!editingRule.actions || editingRule.actions.length === 0) ? (
                  <div className="text-center py-4 text-rose-400 italic text-xs">
                    No actions configured. A workflow rule must include at least one action.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingRule.actions.map((act, idx) => {
                      const actMeta = ACTION_CATALOGUE[act.actionType];

                      return (
                        <div
                          key={act.id || idx}
                          className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-200 text-xs">
                                {actMeta?.label || act.actionType}
                              </span>
                              {actMeta?.isExternalCommunication && (
                                <span className="px-2 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Outbound External Message
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const updated = editingRule.actions.filter((_, i) => i !== idx);
                                setEditingRule({ ...editingRule, actions: updated });
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">Action Type</label>
                              <select
                                value={act.actionType}
                                onChange={(e) => {
                                  const updated = [...editingRule.actions];
                                  updated[idx].actionType = e.target.value as AutomationActionType;
                                  setEditingRule({ ...editingRule, actions: updated });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              >
                                {Object.entries(ACTION_CATALOGUE).map(([aKey, aMeta]) => (
                                  <option key={aKey} value={aKey}>
                                    {aMeta.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Contextual Parameters depending on Action Type */}
                            {act.actionType === 'send_approved_reminder' && (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5">Channel</label>
                                <select
                                  value={act.parameters?.channel || 'email'}
                                  onChange={(e) => {
                                    const updated = [...editingRule.actions];
                                    updated[idx].parameters = { ...updated[idx].parameters, channel: e.target.value as any };
                                    setEditingRule({ ...editingRule, actions: updated });
                                  }}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                >
                                  <option value="email">Email</option>
                                  <option value="whatsapp">WhatsApp</option>
                                  <option value="sms">SMS</option>
                                </select>
                              </div>
                            )}

                            {act.actionType === 'create_followup_task' && (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5">Task Title</label>
                                <input
                                  type="text"
                                  value={act.parameters?.taskTitle || ''}
                                  onChange={(e) => {
                                    const updated = [...editingRule.actions];
                                    updated[idx].parameters = { ...updated[idx].parameters, taskTitle: e.target.value };
                                    setEditingRule({ ...editingRule, actions: updated });
                                  }}
                                  placeholder="e.g. Call Finance Director regarding disputed PO"
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                            )}

                            {act.actionType === 'notify_staff_member' && (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5">Recipient Role / Email</label>
                                <input
                                  type="text"
                                  value={act.parameters?.notificationRecipient || ''}
                                  onChange={(e) => {
                                    const updated = [...editingRule.actions];
                                    updated[idx].parameters = { ...updated[idx].parameters, notificationRecipient: e.target.value };
                                    setEditingRule({ ...editingRule, actions: updated });
                                  }}
                                  placeholder="e.g. credit.manager@company.co.uk"
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 5: Safety Guardrails & Policies (21.4) */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>4. Safety, Idempotency & Recursion Policies (21.4)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Test Mode */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">Test Mode (Safe Run)</span>
                      <input
                        type="checkbox"
                        checked={editingRule.safety?.isTestMode ?? true}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            safety: { ...editingRule.safety, isTestMode: e.target.checked },
                          })
                        }
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      When enabled, actions are simulated in the audit trail without transmitting real customer messages.
                    </p>
                  </div>

                  {/* Cooldown Window */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <label className="block font-semibold text-white text-xs">Duplicate Cooldown</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={editingRule.safety?.duplicatePreventionCooldownHours ?? 24}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            safety: {
                              ...editingRule.safety,
                              duplicatePreventionCooldownHours: Number(e.target.value),
                            },
                          })
                        }
                        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <span className="text-slate-400 text-xs">hours</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Suppresses duplicate actions on same invoice.</p>
                  </div>

                  {/* High Volume Threshold */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-1.5">
                    <label className="block font-semibold text-white text-xs">High-Volume Limit</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={editingRule.safety?.highVolumeThreshold ?? 10}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            safety: {
                              ...editingRule.safety,
                              highVolumeThreshold: Number(e.target.value),
                            },
                          })
                        }
                        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <span className="text-slate-400 text-xs">recipients</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Prompts confirmation if matched batch exceeds count.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsBuilderOpen(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (!editingRule.name.trim()) {
                      alert('Please provide a rule name.');
                      return;
                    }
                    if (!editingRule.actions || editingRule.actions.length === 0) {
                      alert('Please configure at least one action.');
                      return;
                    }
                    const note = prompt('Optional changelog note for this rule version:', 'Updated rule configuration in visual builder');
                    handleSaveRule(editingRule, note || 'Updated in Visual Rule Builder');
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Automation Rule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DRY-RUN PREVIEW SIMULATION (Section 21.4) */}
      {/* ========================================================================= */}
      {dryRunRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Dry-Run Simulation: {dryRunRule.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluates rule conditions against live database records without writing data or dispatching messages.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDryRunRule(null);
                  setDryRunResults(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {isDryRunLoading ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-slate-400">Simulating evaluation over live receivables portfolio...</p>
                </div>
              ) : dryRunResults ? (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Records Evaluated</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {dryRunResults.totalRecordsEvaluated}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-cyan-400 uppercase">Matching Invoices</div>
                      <div className="text-lg font-bold text-cyan-300 mt-0.5">
                        {dryRunResults.matchedCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 uppercase">Simulated Actions</div>
                      <div className="text-lg font-bold text-emerald-300 mt-0.5">
                        {dryRunResults.simulatedActionsCount}
                      </div>
                    </div>
                  </div>

                  {/* Safety Check Notice */}
                  {dryRunResults.safetyReport?.highVolumeAlert && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        High-Volume Alert: Activating this rule in production would exceed safety threshold (
                        {dryRunResults.matchedCount} records matched).
                      </span>
                    </div>
                  )}

                  {/* Matched Records Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200">Matching Records & Evaluation Breakdown</h4>
                    {dryRunResults.matchedItems?.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                        No invoices currently in the database satisfy all specified conditions.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dryRunResults.matchedItems.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-white">
                                {item.invoiceNumber} — {item.debtorName}
                              </div>
                              <div className="text-emerald-400 font-mono font-bold">
                                {formatCurrency(item.amountDue, item.currency)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              {item.evaluations?.map((ev: any, j: number) => (
                                <span
                                  key={j}
                                  className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 flex items-center space-x-1"
                                >
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>
                                    {ev.field}: {ev.actual}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => {
                  setDryRunRule(null);
                  setDryRunResults(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TEST MODE SINGLE-ENTITY RUNNER (Section 21.4) */}
      {/* ========================================================================= */}
      {testModeRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Test Mode Runner: {testModeRule.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Executes real test evaluation against a chosen invoice with live condition inspection.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTestModeRule(null);
                  setTestExecutionResult(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Select Target Invoice for Test Run
                </label>
                <select
                  value={testTargetInvoiceId}
                  onChange={(e) => setTestTargetInvoiceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.debtorName} ({formatCurrency(inv.amountDue, inv.currency)}, {inv.daysOverdue}d overdue, status: {inv.status})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={executeTestMode}
                disabled={isTestingLoading}
                className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Play className={`w-4 h-4 ${isTestingLoading ? 'animate-spin' : ''}`} />
                <span>{isTestingLoading ? 'Evaluating Workflow...' : 'Execute Test Run'}</span>
              </button>

              {testExecutionResult && (
                <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Execution Result</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        testExecutionResult.rulePassed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {testExecutionResult.rulePassed ? 'PASSED — ACTIONS DISPATCHED' : 'CONDITIONS FAILED'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Duration: <strong className="text-white">{testExecutionResult.durationMs}ms</strong> • Logged
                    to forensic audit table.
                  </div>

                  {/* Conditions Inspection */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
                    <div className="font-semibold text-slate-300 text-[10px] uppercase">Condition Results:</div>
                    {testExecutionResult.conditionsEvaluated?.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2 text-[11px] p-1.5 rounded bg-slate-900 border border-slate-800"
                      >
                        {c.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span className="font-medium text-slate-200">{c.field}</span>
                        <span className="text-slate-400">
                          (Actual: {c.actual} | Expected: {c.expected})
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions Taken */}
                  {testExecutionResult.rulePassed && testExecutionResult.actionsExecuted?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
                      <div className="font-semibold text-slate-300 text-[10px] uppercase">Simulated Actions:</div>
                      {testExecutionResult.actionsExecuted.map((a: any, i: number) => (
                        <div key={i} className="text-[11px] text-emerald-300 p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {a.summary}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => {
                  setTestModeRule(null);
                  setTestExecutionResult(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VERSION HISTORY AUDIT TRAIL (Section 21.4) */}
      {/* ========================================================================= */}
      {versionHistoryRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Version Audit Trail: {versionHistoryRule.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Complete immutable changelog of rule modifications pursuant to Section 21.4.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVersionHistoryRule(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {(!versionHistoryRule.versionsHistory || versionHistoryRule.versionsHistory.length === 0) ? (
                <div className="py-8 text-center text-slate-500 italic">No previous versions on record.</div>
              ) : (
                <div className="space-y-3">
                  {versionHistoryRule.versionsHistory.map((ver, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300">Version {ver.version}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{ver.updatedAt}</span>
                      </div>
                      <p className="text-slate-200">{ver.changelog}</p>
                      <div className="flex items-center space-x-4 text-[10px] text-slate-400">
                        <span>Author: <strong className="text-slate-300">{ver.updatedBy}</strong></span>
                        <span>Conditions: <strong className="text-slate-300">{ver.conditionsCount}</strong></span>
                        <span>Actions: <strong className="text-slate-300">{ver.actionsCount}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setVersionHistoryRule(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: HIGH-VOLUME EXTERNAL MESSAGE CONFIRMATION (Section 21.4) */}
      {/* ========================================================================= */}
      {highVolumeConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">High-Volume Message Safeguard</h3>
                <p className="text-xs text-amber-300/80">Section 21.4 Protective Authorization</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Activating the automation rule <strong className="text-white">"{highVolumeConfirmModal.rule.name}"</strong> will immediately evaluate <strong className="text-amber-300 font-bold">{highVolumeConfirmModal.matchedCount} records</strong> in your portfolio that meet its criteria.
            </p>

            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Matched Recipient Batch:</span>
                <strong className="text-amber-400">{highVolumeConfirmModal.matchedCount} recipients</strong>
              </div>
              <div className="flex justify-between">
                <span>Configured Safety Threshold:</span>
                <strong className="text-slate-400">{highVolumeConfirmModal.threshold} messages</strong>
              </div>
              <div className="flex justify-between">
                <span>Actions Included:</span>
                <strong className="text-slate-300">
                  {highVolumeConfirmModal.rule.actions.map((a) => a.actionType).join(', ')}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Pursuant to Section 21.4, activating rules capable of sending large volumes of external messages requires affirmative confirmation to prevent accidental mass customer communications.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setHighVolumeConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel & Keep Inactive
              </button>

              <button
                onClick={() => handleToggleRule(highVolumeConfirmModal.rule, true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Activate Workflow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
