import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Clock, 
  MessageSquare, 
  Scale, 
  X, 
  Check, 
  FileText,
  Search,
  Filter,
  User,
  Paperclip,
  Send,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Eye,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Layers,
  Inbox,
  Lock,
  ChevronRight,
  ExternalLink,
  History,
  Tag
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Dispute, 
  Invoice, 
  Organization, 
  Debtor, 
  DisputeCategory, 
  DisputeStatus, 
  DisputePriority 
} from '../types';
import { formatCurrency } from '../services/calculations';
import { AIDisputeSummary } from './AIDisputeSummary';

interface DisputesViewProps {
  organization: Organization;
  disputes: Dispute[];
  invoices: Invoice[];
  debtors?: Debtor[];
  onLodgeDispute: (disputeData: any) => void;
  onResolveDispute: (disputeId: string, resolutionData: any) => void;
  onRefreshData?: () => void;
}

// 15.1 Human-readable category dictionary
const DISPUTE_CATEGORIES: { id: DisputeCategory; label: string; description: string; badgeColor: string }[] = [
  { id: 'incorrect_invoice_amount', label: 'Incorrect Invoice Amount', description: 'Discrepancy in unit pricing, quantity calculation, or unexpected surcharges.', badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { id: 'duplicate_invoice', label: 'Duplicate Invoice', description: 'Customer claims an identical invoice or bill has already been issued or settled.', badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  { id: 'goods_services_not_received', label: 'Goods or Services Not Received', description: 'Delivery consignment missing, transit delay, or incomplete service fulfillment.', badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { id: 'incorrect_customer', label: 'Incorrect Customer', description: 'Invoice addressed to the wrong corporate subsidiary, legal entity, or billing party.', badgeColor: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  { id: 'missing_purchase_order', label: 'Missing Purchase Order', description: 'Client procurement mandate requires valid matching customer PO reference.', badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { id: 'incorrect_tax_treatment', label: 'Incorrect Tax Treatment', description: 'Dispute over VAT exemption, cross-border reverse charge, or wrong tax rates.', badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  { id: 'payment_already_made', label: 'Payment Already Made', description: 'Debtor asserts remittance was completed; bank reconciliation trace required.', badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { id: 'credit_note_requested', label: 'Credit Note Requested', description: 'Commercial concession, discount, rebate, or return credit note awaiting generation.', badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  { id: 'contractual_disagreement', label: 'Contractual Disagreement', description: 'Terms of sale, SLAs, volume rebates, or payment terms dispute.', badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { id: 'service_complaint', label: 'Service Complaint', description: 'Customer dissatisfaction with transit standards, support, or performance quality.', badgeColor: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
  { id: 'other', label: 'Other Query', description: 'Unclassified commercial, legal, or administrative receivables query.', badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
];

export const DisputesView: React.FC<DisputesViewProps> = ({
  organization,
  disputes,
  invoices,
  debtors = [],
  onLodgeDispute,
  onResolveDispute,
  onRefreshData,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  // View state: filters & search
  const [statusFilter, setStatusFilter] = useState<'all' | DisputeStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DisputeCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | DisputePriority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showLodgeModal, setShowLodgeModal] = useState(false);
  const [selectedDisputeForDetail, setSelectedDisputeForDetail] = useState<Dispute | null>(null);
  const [selectedDisputeForResolve, setSelectedDisputeForResolve] = useState<Dispute | null>(null);
  const [selectedDisputeForAiSummary, setSelectedDisputeForAiSummary] = useState<Dispute | null>(null);
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);

  // Detail Modal Sub-Tabs
  const [detailTab, setDetailTab] = useState<'overview' | 'notes' | 'evidence' | 'communications' | 'audit'>('overview');

  // Case Interaction States (Inside Detail Modal)
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newEvidenceName, setNewEvidenceName] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [newCommChannel, setNewCommChannel] = useState<'portal' | 'email' | 'whatsapp' | 'phone'>('email');
  const [newCommRecipient, setNewCommRecipient] = useState('');
  const [newCommMessage, setNewCommMessage] = useState('');
  const [isAddingComm, setIsAddingComm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // AI Analysis state
  const [analyzingDisputeId, setAnalyzingDisputeId] = useState<string | null>(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<Record<string, { sentiment: string; rootCause: string; suggestedAction: string }>>({});

  // Lodge Dispute Form State
  const eligibleInvoices = invoices.filter((i) => i.amountDue > 0 && i.status !== 'disputed');
  const [formDebtorId, setFormDebtorId] = useState<string>(debtors[0]?.id || '');
  const [formInvoiceId, setFormInvoiceId] = useState<string>(eligibleInvoices[0]?.id || '');
  const [formCategory, setFormCategory] = useState<DisputeCategory>('incorrect_invoice_amount');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formPriority, setFormPriority] = useState<DisputePriority>('high');
  const [formAssignee, setFormAssignee] = useState('Sarah Miller');
  const [formQueue, setFormQueue] = useState('Billing & Invoicing Queries');
  const [formChannel, setFormChannel] = useState<'portal' | 'email' | 'whatsapp' | 'phone' | 'formal_letter'>('email');
  const [formSender, setFormSender] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formInternalNotes, setFormInternalNotes] = useState('');
  const [formEvidenceName, setFormEvidenceName] = useState('');

  // Resolve Form State
  const [resolutionOutcome, setResolutionOutcome] = useState<'resolved' | 'rejected' | 'closed'>('resolved');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionActionTaken, setResolutionActionTaken] = useState('');
  const [resolutionResumeCadence, setResolutionResumeCadence] = useState(true);
  const [resolutionCreditNoteIssued, setResolutionCreditNoteIssued] = useState(false);
  const [resolutionCreditNoteNumber, setResolutionCreditNoteNumber] = useState('');

  // Synchronize initial lodge form amount when invoice changes
  const handleSelectInvoiceForLodge = (invId: string) => {
    setFormInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setFormAmount(inv.amountDue);
      setFormDebtorId(inv.debtorId);
      const debtor = debtors.find((d) => d.id === inv.debtorId);
      if (debtor) {
        setFormSender(debtor.contactName || debtor.name);
        setFormAssignee(debtor.assignedCreditControllerName || 'Sarah Miller');
      }
    }
  };

  // KPI Calculations
  const activeDisputes = disputes.filter((d) => d.status !== 'resolved' && d.status !== 'rejected' && d.status !== 'closed');
  const totalDisputedAmount = disputes
    .filter((d) => d.status !== 'resolved' && d.status !== 'rejected' && d.status !== 'closed')
    .reduce((sum, d) => sum + (d.amountDisputed || 0), 0);
  const urgentCount = disputes.filter((d) => d.priority === 'urgent' && d.status !== 'resolved' && d.status !== 'closed').length;
  const awaitingActionCount = disputes.filter((d) => (d.status === 'awaiting_internal_dept' || d.status === 'awaiting_credit_note')).length;

  // Filter list
  const filteredDisputes = disputes.filter((d) => {
    // Status filter
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    // Category filter
    if (categoryFilter !== 'all' && d.category !== categoryFilter && d.reason !== categoryFilter) return false;
    // Priority filter
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        (d.disputeNumber || '').toLowerCase().includes(q) ||
        (d.debtorName || '').toLowerCase().includes(q) ||
        (d.invoiceNumber || '').toLowerCase().includes(q) ||
        (d.customerExplanation || d.debtorStatement || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.assignedStaffMember || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Lodge Submit Handler (15.3 Steps 1-9)
  const handleLodgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find((i) => i.id === formInvoiceId);
    const debtor = debtors.find((d) => d.id === formDebtorId) || (inv ? debtors.find((d) => d.id === inv.debtorId) : null);

    const disputePayload: any = {
      invoiceId: formInvoiceId || undefined,
      debtorId: debtor?.id || inv?.debtorId,
      category: formCategory,
      reason: formCategory,
      customerExplanation: formExplanation,
      amountDisputed: Number(formAmount) || (inv ? inv.amountDue : 0),
      priority: formPriority,
      assignedStaffMember: formAssignee,
      assignedQueue: formQueue,
      originalMessageChannel: formChannel,
      originalMessageRaw: formExplanation,
      originalMessageSender: formSender || debtor?.contactName || debtor?.name || 'Customer AP Department',
      internalNotes: formInternalNotes,
      supportingEvidence: formEvidenceName
        ? [
            {
              id: `ev-${Date.now()}`,
              fileName: formEvidenceName,
              fileType: 'application/pdf',
              fileSize: '420 KB',
              uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              uploadedBy: formSender || 'Customer AP Contact',
              description: 'Customer provided supporting claim document',
            },
          ]
        : [],
    };

    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...disputePayload, organizationId: organization.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowLodgeModal(false);
        setFormExplanation('');
        setFormInternalNotes('');
        setFormEvidenceName('');
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to lodge dispute');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while lodging dispute');
    }
  };

  // Status Change Handler (15.2)
  const handleUpdateStatus = async (disputeId: string, newStatus: DisputeStatus, reason?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          transitionReason: reason || `Updated by credit controller to ${newStatus.replace(/_/g, ' ')}`,
          performedBy: 'Credit Controller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedDisputeForDetail?.id === disputeId) {
          setSelectedDisputeForDetail(data.data);
        }
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Add Note Handler
  const handleAddNote = async (disputeId: string) => {
    if (!newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newNoteText,
          author: 'Sarah Miller',
          authorRole: 'Credit Controller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteText('');
        if (selectedDisputeForDetail?.id === disputeId) {
          setSelectedDisputeForDetail(data.dispute);
        }
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Add Evidence Handler
  const handleAddEvidence = async (disputeId: string) => {
    if (!newEvidenceName.trim()) return;
    setIsAddingEvidence(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: newEvidenceName,
          fileType: 'application/pdf',
          fileSize: '390 KB',
          description: newEvidenceDesc || 'Document attached to dispute case',
          uploadedBy: 'Credit Controller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewEvidenceName('');
        setNewEvidenceDesc('');
        if (selectedDisputeForDetail?.id === disputeId) {
          setSelectedDisputeForDetail(data.dispute);
        }
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingEvidence(false);
    }
  };

  // Add Communication Handler
  const handleAddCommunication = async (disputeId: string) => {
    if (!newCommMessage.trim()) return;
    setIsAddingComm(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'outbound',
          channel: newCommChannel,
          sender: 'Sarah Miller (Credit Operations)',
          recipient: newCommRecipient || selectedDisputeForDetail?.debtorName || 'Customer AP',
          subject: `Dispute Case ${selectedDisputeForDetail?.disputeNumber || disputeId} Follow-up`,
          message: newCommMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCommMessage('');
        if (selectedDisputeForDetail?.id === disputeId) {
          setSelectedDisputeForDetail(data.dispute);
        }
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingComm(false);
    }
  };

  // Resolve Submit Handler (15.2 & 15.3 Step 9)
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisputeForResolve) return;

    try {
      const res = await fetch(`/api/disputes/${selectedDisputeForResolve.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: resolutionOutcome,
          resolutionSummary,
          actionTaken: resolutionActionTaken,
          resumeCollectionCadence: resolutionResumeCadence,
          creditNoteIssued: resolutionCreditNoteIssued,
          creditNoteNumber: resolutionCreditNoteNumber || undefined,
          resolvedBy: 'Credit Operations Lead',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDisputeForResolve(null);
        setResolutionSummary('');
        setResolutionActionTaken('');
        if (selectedDisputeForDetail?.id === selectedDisputeForResolve.id) {
          setSelectedDisputeForDetail(data.data);
        }
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to resolve dispute');
      }
    } catch (err) {
      console.error(err);
      alert('Error recording resolution');
    }
  };

  // AI Analysis (Gemini 3.8 Flash)
  const handleAnalyzeWithAI = async (dispute: Dispute) => {
    setAnalyzingDisputeId(dispute.id);
    try {
      const res = await fetch('/api/ai/analyze-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtorStatement: dispute.customerExplanation || dispute.debtorStatement,
          reason: dispute.category || dispute.reason,
          amountDisputed: dispute.amountDisputed,
          currency,
          debtorName: dispute.debtorName,
          invoiceNumber: dispute.invoiceNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysisResults((prev) => ({
          ...prev,
          [dispute.id]: {
            sentiment: data.sentiment,
            rootCause: data.rootCause,
            suggestedAction: data.suggestedAction,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to analyze dispute with AI:', err);
    } finally {
      setAnalyzingDisputeId(null);
    }
  };

  const getCategoryMeta = (cat: string) => {
    return DISPUTE_CATEGORIES.find((c) => c.id === cat) || {
      id: cat as DisputeCategory,
      label: cat.replace(/_/g, ' '),
      description: 'Query description',
      badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    };
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-500/20 text-slate-300 border border-slate-500/40">Low</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'new':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">New Case</span>;
      case 'under_review':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">Under Review</span>;
      case 'awaiting_customer':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">Awaiting Customer</span>;
      case 'awaiting_internal_dept':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">Awaiting Internal Dept</span>;
      case 'awaiting_credit_note':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">Awaiting Credit Note</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Resolved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">Rejected</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span>Dispute and Query Management</span>
            </h1>
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
              Part 15 Dedicated Module
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured customer dispute workflows, multi-category intake, reminder suppression, and evidence audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              title="Refresh disputes"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              setSelectedDisputeForAiSummary(disputes[0] || null);
              setShowAiSummaryModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 transition flex items-center space-x-1.5 border border-indigo-500/40"
            title="Generate AI Root Cause and Collector Briefing"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>AI Dispute Summary</span>
          </button>

          <button
            onClick={() => {
              if (eligibleInvoices[0]) {
                handleSelectInvoiceForLodge(eligibleInvoices[0].id);
              }
              setShowLodgeModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Lodge Dispute Case (15.3)</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active In Dispute</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mono-num">
            {formatCurrency(totalDisputedAmount, currency)}
          </div>
          <span className="text-[11px] text-slate-500">
            {activeDisputes.length} open cases in resolution
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Urgent Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white mono-num">
            {urgentCount}
          </div>
          <span className="text-[11px] text-rose-400/90 font-medium">
            Requires immediate controller intake
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Awaiting Internal Dept</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white mono-num">
            {awaitingActionCount}
          </div>
          <span className="text-[11px] text-purple-300/80">
            Pricing desk or warehouse review
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Preserved Balances</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            100% Intact
          </div>
          <span className="text-[11px] text-slate-500">
            No unauthorized balance erasure (15.3)
          </span>
        </div>
      </div>

      {/* Statutory Compliance Notice Banner (15.3 Rules) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Section 15.3 Statutory Automation & Ledger Safeguards</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                Compliant Rules Active
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When a dispute is raised, automated reminder cadences are paused and invoices marked as "Disputed". In strict compliance with financial regulations: <strong>overdue balances are preserved and NOT erased</strong>, and credit notes are never issued automatically without authorized commercial review.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Category / Status Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Dispute #, Customer Name, Invoice #, or Objection Summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Dropdown (15.1) */}
          <div className="w-full md:w-64">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All 11 Categories (15.1)</option>
              {DISPUTE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="w-full md:w-40">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs (15.2) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-800/60 pt-3">
          {[
            { id: 'all', label: 'All Cases' },
            { id: 'new', label: 'New' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'awaiting_customer', label: 'Awaiting Customer' },
            { id: 'awaiting_internal_dept', label: 'Awaiting Internal Dept' },
            { id: 'awaiting_credit_note', label: 'Awaiting Credit Note' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'closed', label: 'Closed' },
          ].map((tab) => {
            const count = tab.id === 'all' 
              ? disputes.length 
              : disputes.filter((d) => d.status === tab.id).length;
            const isActive = statusFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disputes Table Registry */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Dispute Case & Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Dispute Category (15.1)</th>
                <th className="px-4 py-3 text-right">Disputed Amount</th>
                <th className="px-4 py-3">Status (15.2)</th>
                <th className="px-4 py-3">Assigned Staff & Queue</th>
                <th className="px-4 py-3">Date Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDisputes.map((disp) => {
                const catMeta = getCategoryMeta(disp.category || disp.reason);
                const isUnderAnalysis = analyzingDisputeId === disp.id;
                const analysis = aiAnalysisResults[disp.id];

                return (
                  <React.Fragment key={disp.id}>
                    <tr className="hover:bg-slate-850/50 transition">
                      {/* Case ID & Invoice */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-xs">
                            {disp.disputeNumber || `DSP-${disp.id.slice(-4).toUpperCase()}`}
                          </span>
                          {getPriorityBadge(disp.priority || 'medium')}
                        </div>
                        <div className="text-slate-300 font-medium text-[11px] mt-0.5 flex items-center space-x-1">
                          <span>Invoice:</span>
                          <span className="text-amber-400 font-semibold">{disp.invoiceNumber || 'Account Level'}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{disp.debtorName}</div>
                        {disp.customerReference && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {disp.customerReference}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.badgeColor}`}>
                          {catMeta.label}
                        </span>
                      </td>

                      {/* Disputed Amount */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="font-bold text-amber-400 mono-num text-xs">
                          {formatCurrency(disp.amountDisputed, currency)}
                        </div>
                        <div className="text-[10px] text-emerald-400/90 font-mono">
                          Balance Preserved
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(disp.status)}
                      </td>

                      {/* Assigned Staff & Queue */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-200 text-xs">
                          {disp.assignedStaffMember || disp.assignedTo || 'Unassigned'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {disp.assignedQueue || 'Billing Queries'}
                        </div>
                      </td>

                      {/* Date Received */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-xs">
                        {disp.dateReceived || disp.lodgedDate}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedDisputeForDetail(disp);
                            setDetailTab('overview');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition inline-flex items-center space-x-1 text-xs"
                          title="Open Dispute Case Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Case File</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDisputeForAiSummary(disp);
                            setShowAiSummaryModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 transition inline-flex items-center space-x-1 text-xs font-semibold shadow-sm"
                          title="Open AI Dispute Summary & Root Cause Briefing for this case"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>AI Summary</span>
                        </button>

                        <button
                          onClick={() => handleAnalyzeWithAI(disp)}
                          disabled={isUnderAnalysis}
                          title="Run Gemini 3.8 Flash dispute analysis"
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition inline-flex items-center space-x-1 text-xs"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isUnderAnalysis ? 'animate-spin' : ''}`} />
                          <span>{isUnderAnalysis ? 'AI...' : 'AI Analyze'}</span>
                        </button>

                        {disp.status !== 'resolved' && disp.status !== 'rejected' && disp.status !== 'closed' && (
                          <button
                            onClick={() => {
                              setSelectedDisputeForResolve(disp);
                              setResolutionSummary('');
                              setResolutionActionTaken('');
                              setResolutionResumeCadence(true);
                              setResolutionOutcome('resolved');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition inline-flex items-center space-x-1 text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Customer Explanation & AI Assessment preview strip */}
                    <tr className="bg-slate-950/40 text-xs">
                      <td colSpan={8} className="px-4 py-2 border-b border-slate-800/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-slate-300 text-[11px] truncate max-w-2xl">
                            <strong className="text-slate-400 font-medium">Customer's Explanation: </strong>
                            <span className="italic">"{disp.customerExplanation || disp.debtorStatement}"</span>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 shrink-0">
                            <span>Evidence: <strong className="text-white">{disp.supportingEvidence?.length || 0}</strong> docs</span>
                            <span>Notes: <strong className="text-white">{disp.internalNotesList?.length || 0}</strong> entries</span>
                            <span>Comms: <strong className="text-white">{disp.communications?.length || 0}</strong> msgs</span>
                          </div>
                        </div>

                        {/* Inline AI Assessment Banner if analyzed */}
                        {analysis && (
                          <div className="mt-2 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="font-semibold text-indigo-300">
                                  AI Assessment ({analysis.sentiment} sentiment):
                                </span>
                                <span className="text-slate-200">{analysis.rootCause}</span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                <strong className="text-emerald-400">Policy Recommendation: </strong>
                                {analysis.suggestedAction}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] shrink-0">
                              Gemini 3.8 Flash Grounded
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {filteredDisputes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-8 h-8 text-slate-600" />
                      <p className="text-xs">No disputes matching the selected category, priority, or search criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          LODGE DISPUTE CASE MODAL (15.1, 15.2, 15.3 Steps 1-9)
      ========================================================================= */}
      {showLodgeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Lodge Customer Dispute Case (Part 15)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Creates dispute ID, suppresses reminders, and assigns queue without altering ledger balances.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowLodgeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLodgeSubmit} className="space-y-4 text-xs">
              
              {/* Target Invoice / Debtor selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice *</label>
                  <select
                    value={formInvoiceId}
                    onChange={(e) => handleSelectInvoiceForLodge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    required
                  >
                    {eligibleInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.debtorName} ({formatCurrency(inv.amountDue, inv.currency)} due)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Disputed Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold mono-num focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* 15.1 Categorized Reason and Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dispute Category (Section 15.1) *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DisputeCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    {DISPUTE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Priority *</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as DisputePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="urgent">Urgent (Overdue &gt; 60d or &gt; £10k)</option>
                    <option value="high">High (Material dispute / senior contact)</option>
                    <option value="medium">Medium (Standard query)</option>
                    <option value="low">Low (Minor clerical or tax inquiry)</option>
                  </select>
                </div>
              </div>

              {/* Intake Channel & Assigned Queue */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Inbound Channel (15.3.1)</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="portal">Debtor Self-Service Portal</option>
                    <option value="email">Inbound Billing Email</option>
                    <option value="whatsapp">WhatsApp Business Platform</option>
                    <option value="phone">Telephone Call</option>
                    <option value="formal_letter">Formal Letter of Dispute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Staff (15.3.4)</label>
                  <input
                    type="text"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    placeholder="Sarah Miller"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Resolution Queue</label>
                  <select
                    value={formQueue}
                    onChange={(e) => setFormQueue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Billing & Invoicing Queries">Billing & Invoicing Queries</option>
                    <option value="Operations Resolution Queue">Operations & Logistics Queue</option>
                    <option value="Commercial Pricing Desk">Commercial Pricing Desk</option>
                    <option value="Public Sector AP Queue">Public Sector AP Queue</option>
                  </select>
                </div>
              </div>

              {/* Customer's Explanation (15.2) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Customer's Explanation & Objection (15.2) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the customer's verbatim or summarized query, alleged defective goods, pricing variance, or reason for holding payment..."
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Supporting Evidence File Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supporting Evidence Document (15.2)</label>
                  <input
                    type="text"
                    placeholder="e.g. Discrepancy_Manifest_POD.pdf"
                    value={formEvidenceName}
                    onChange={(e) => setFormEvidenceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Confidential Staff Note</label>
                  <input
                    type="text"
                    placeholder="Internal memo for credit team..."
                    value={formInternalNotes}
                    onChange={(e) => setFormInternalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Statutory Safeguards Assurance Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-[11px] space-y-1">
                <span className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Section 15.3 Statutory Automation Safeguards Guaranteed:</span>
                </span>
                <p className="text-amber-300/80 leading-relaxed">
                  Upon lodging: (1) Outbound automated collection reminders are immediately halted for this invoice. (2) Invoice balance remains legally preserved in financial ledger. (3) No automatic credit note will be issued.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLodgeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center space-x-1.5 shadow-md shadow-amber-900/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Register Dispute Case & Pause Cadence</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CASE FILE DETAIL DRAWER / MODAL (15.2 Full Case File)
      ========================================================================= */}
      {selectedDisputeForDetail && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-auto text-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Modal Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Dispute Case File: {selectedDisputeForDetail.disputeNumber || selectedDisputeForDetail.id}</span>
                  </h2>
                  {getStatusBadge(selectedDisputeForDetail.status)}
                  {getPriorityBadge(selectedDisputeForDetail.priority || 'medium')}
                </div>
                <p className="text-xs text-slate-400">
                  Customer: <strong className="text-white">{selectedDisputeForDetail.debtorName}</strong> • Target Invoice: <strong className="text-amber-400">{selectedDisputeForDetail.invoiceNumber}</strong> • Date Received: {selectedDisputeForDetail.dateReceived || selectedDisputeForDetail.lodgedDate}
                </p>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                {selectedDisputeForDetail.status !== 'resolved' && selectedDisputeForDetail.status !== 'rejected' && selectedDisputeForDetail.status !== 'closed' && (
                  <button
                    onClick={() => {
                      setSelectedDisputeForResolve(selectedDisputeForDetail);
                      setResolutionOutcome('resolved');
                      setResolutionSummary('');
                      setResolutionActionTaken('');
                      setResolutionResumeCadence(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolve Case</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedDisputeForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Disputed Amount</span>
                <span className="font-bold text-amber-400 text-sm mono-num">
                  {formatCurrency(selectedDisputeForDetail.amountDisputed, currency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Financial Ledger Status</span>
                <span className="font-semibold text-emerald-400 text-xs flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Balance Preserved (15.3)</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Assigned Controller</span>
                <span className="font-medium text-slate-200 text-xs">
                  {selectedDisputeForDetail.assignedStaffMember || selectedDisputeForDetail.assignedTo || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-mono">Automated Dunning Cadence</span>
                <span className="font-semibold text-rose-400 text-xs flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{selectedDisputeForDetail.reminderPauseActive ? 'Paused & Suppressed' : 'Active Cadence'}</span>
                </span>
              </div>
            </div>

            {/* Sub-Tabs: Overview, Notes, Evidence, Communications, Audit */}
            <div className="flex space-x-1 border-b border-slate-800 text-xs font-medium">
              {[
                { id: 'overview', label: 'Case Overview & Claim' },
                { id: 'notes', label: `Staff Notes (${selectedDisputeForDetail.internalNotesList?.length || 0})` },
                { id: 'evidence', label: `Evidence (${selectedDisputeForDetail.supportingEvidence?.length || 0})` },
                { id: 'communications', label: `Communications (${selectedDisputeForDetail.communications?.length || 0})` },
                { id: 'audit', label: `Audit Trail (${selectedDisputeForDetail.auditHistory?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`px-3.5 py-2 border-b-2 transition ${
                    detailTab === tab.id
                      ? 'border-amber-500 text-amber-400 font-bold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body Container with scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* TAB 1: OVERVIEW & STATUS CONTROL */}
              {detailTab === 'overview' && (
                <div className="space-y-4">
                  {/* Category description & Customer Statement */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase font-mono text-[10px]">
                        Dispute Category: {getCategoryMeta(selectedDisputeForDetail.category || selectedDisputeForDetail.reason).label}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Target Resolution: {selectedDisputeForDetail.targetResolutionDate || '14 Days'}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                      <strong className="text-amber-300 block mb-1 font-semibold">Customer's Objection Statement:</strong>
                      "{selectedDisputeForDetail.customerExplanation || selectedDisputeForDetail.debtorStatement}"
                    </div>
                  </div>

                  {/* Status Transition Control (15.2 Statuses) */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <span className="font-bold text-white text-xs block">
                      Transition Case Status (Section 15.2)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'new', label: 'New' },
                        { id: 'under_review', label: 'Under Review' },
                        { id: 'awaiting_customer', label: 'Awaiting Customer' },
                        { id: 'awaiting_internal_dept', label: 'Awaiting Internal Dept' },
                        { id: 'awaiting_credit_note', label: 'Awaiting Credit Note' },
                        { id: 'resolved', label: 'Resolved' },
                        { id: 'rejected', label: 'Rejected' },
                        { id: 'closed', label: 'Closed' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          disabled={isUpdatingStatus || selectedDisputeForDetail.status === st.id}
                          onClick={() => handleUpdateStatus(selectedDisputeForDetail.id, st.id as DisputeStatus)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedDisputeForDetail.status === st.id
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Summary (If resolved/rejected) */}
                  {selectedDisputeForDetail.resolution && (
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Case Concluded: {selectedDisputeForDetail.resolution.outcome.toUpperCase()}</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400">
                          {selectedDisputeForDetail.resolution.resolutionDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        <strong>Summary: </strong>{selectedDisputeForDetail.resolution.summary}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Resolved by: <strong className="text-white">{selectedDisputeForDetail.resolution.resolvedBy}</strong> • Action: {selectedDisputeForDetail.resolution.actionTaken}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis Prompt Card */}
                  <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white text-xs">AI Dispute Root Cause & Sentiment Assessment</span>
                      </div>
                      <button
                        onClick={() => handleAnalyzeWithAI(selectedDisputeForDetail)}
                        disabled={analyzingDisputeId === selectedDisputeForDetail.id}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{analyzingDisputeId === selectedDisputeForDetail.id ? 'Evaluating...' : 'Run Gemini Assessment'}</span>
                      </button>
                    </div>

                    {aiAnalysisResults[selectedDisputeForDetail.id] ? (
                      <div className="space-y-1 text-xs pt-1">
                        <div className="text-indigo-200">
                          <strong>Sentiment: </strong>
                          <span className="capitalize font-semibold text-indigo-300">
                            {aiAnalysisResults[selectedDisputeForDetail.id].sentiment}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          <strong>Root Cause: </strong>
                          {aiAnalysisResults[selectedDisputeForDetail.id].rootCause}
                        </div>
                        <div className="text-slate-300">
                          <strong className="text-emerald-400">Recommended Step: </strong>
                          {aiAnalysisResults[selectedDisputeForDetail.id].suggestedAction}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Deploy Gemini 3.8 Flash to analyze customer sentiment, extract root cause, and formulate conciliation recommendations.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: STAFF NOTES (15.2) */}
              {detailTab === 'notes' && (
                <div className="space-y-4">
                  {/* Add Note Input */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-slate-300 font-medium text-xs">
                      Add Confidential Internal Staff Note (Section 15.2)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add case observation, warehouse feedback, or conversation note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleAddNote(selectedDisputeForDetail.id)}
                        disabled={isAddingNote || !newNoteText.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center space-x-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingNote ? 'Saving...' : 'Post Internal Note'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes Timeline */}
                  <div className="space-y-2.5">
                    {selectedDisputeForDetail.internalNotesList && selectedDisputeForDetail.internalNotesList.length > 0 ? (
                      selectedDisputeForDetail.internalNotesList.map((note) => (
                        <div key={note.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-white">
                              {note.author} <span className="text-slate-400 font-normal">({note.authorRole})</span>
                            </span>
                            <span className="text-slate-500 font-mono">{note.timestamp}</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{note.note}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-slate-500 text-xs">No internal notes recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EVIDENCE DOCUMENTS (15.2) */}
              {detailTab === 'evidence' && (
                <div className="space-y-4">
                  {/* Upload Evidence Mock / Input */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-slate-300 font-medium text-xs">
                      Attach Supporting Evidence (POD, Signed Bill of Lading, Contract Addendum)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Document File Name (e.g. Proof_of_Delivery_4412.pdf)"
                        value={newEvidenceName}
                        onChange={(e) => setNewEvidenceName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g. Signature on Gothenburg berth receipt)"
                        value={newEvidenceDesc}
                        onChange={(e) => setNewEvidenceDesc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleAddEvidence(selectedDisputeForDetail.id)}
                        disabled={isAddingEvidence || !newEvidenceName.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center space-x-1.5"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{isAddingEvidence ? 'Attaching...' : 'Attach Evidence File'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Evidence Items */}
                  <div className="space-y-2">
                    {selectedDisputeForDetail.supportingEvidence && selectedDisputeForDetail.supportingEvidence.length > 0 ? (
                      selectedDisputeForDetail.supportingEvidence.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-white font-mono text-[11px]">{ev.fileName}</div>
                              <div className="text-[10px] text-slate-400">
                                {ev.description} • {ev.fileSize} • Uploaded by {ev.uploadedBy} on {ev.uploadedAt}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                            Verified
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-slate-500 text-xs">No supporting evidence attached.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: COMMUNICATIONS THREAD (15.3.8) */}
              {detailTab === 'communications' && (
                <div className="space-y-4">
                  {/* Log Communication Form */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="block text-slate-300 font-medium text-xs">
                      Log Communication with Debtor or Internal Department (15.3.8)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={newCommChannel}
                        onChange={(e) => setNewCommChannel(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                      >
                        <option value="email">Email Notice</option>
                        <option value="whatsapp">WhatsApp Business Platform</option>
                        <option value="portal">Debtor Self-Service Portal Note</option>
                        <option value="phone">Telephone Call Log</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Recipient contact (e.g. accounts.payable@apex.co.uk)"
                        value={newCommRecipient}
                        onChange={(e) => setNewCommRecipient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-xs"
                      />
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Message content or summary of phone conversation..."
                      value={newCommMessage}
                      onChange={(e) => setNewCommMessage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleAddCommunication(selectedDisputeForDetail.id)}
                        disabled={isAddingComm || !newCommMessage.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center space-x-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAddingComm ? 'Logging...' : 'Record Communication'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="space-y-2.5">
                    {selectedDisputeForDetail.communications && selectedDisputeForDetail.communications.length > 0 ? (
                      selectedDisputeForDetail.communications.map((comm) => (
                        <div key={comm.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center space-x-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                comm.direction === 'inbound' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-indigo-500/20 text-indigo-300'
                              }`}>
                                {comm.direction} ({comm.channel})
                              </span>
                              <span className="font-semibold text-white">
                                {comm.sender} &rarr; {comm.recipient}
                              </span>
                            </div>
                            <span className="text-slate-500 font-mono">{comm.timestamp}</span>
                          </div>
                          {comm.subject && (
                            <div className="text-[11px] font-medium text-amber-300/90">{comm.subject}</div>
                          )}
                          <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-900/40 p-2 rounded-lg">
                            {comm.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-slate-500 text-xs">No communications logged yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL (15.2 Audit History) */}
              {detailTab === 'audit' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Immutable state transitions and action log for Case {selectedDisputeForDetail.disputeNumber || selectedDisputeForDetail.id}:
                  </div>
                  {selectedDisputeForDetail.auditHistory && selectedDisputeForDetail.auditHistory.length > 0 ? (
                    selectedDisputeForDetail.auditHistory.map((aud) => (
                      <div key={aud.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white flex items-center space-x-1.5">
                            <History className="w-3.5 h-3.5 text-amber-400" />
                            <span>{aud.action}</span>
                          </span>
                          <span className="text-slate-500 font-mono">{aud.timestamp}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{aud.details}</p>
                        <div className="text-[10px] text-slate-500">
                          Author: <strong className="text-slate-400">{aud.author}</strong>
                          {aud.previousStatus && aud.newStatus && (
                            <span> • Transitioned from <em>{aud.previousStatus}</em> to <strong>{aud.newStatus}</strong></span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-slate-500 text-xs">No audit history entries recorded.</p>
                  )}
                </div>
              )}

            </div>

            {/* Modal Bottom Close */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">
                Case ID: {selectedDisputeForDetail.id}
              </span>
              <button
                onClick={() => setSelectedDisputeForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Close Case File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          RESOLVE DISPUTE MODAL (15.2 Resolution & 15.3 Step 9 Cadence Resumption)
      ========================================================================= */}
      {selectedDisputeForResolve && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Resolve Dispute: {selectedDisputeForResolve.disputeNumber || selectedDisputeForResolve.invoiceNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedDisputeForResolve(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Resolution Outcome (15.2) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('resolved')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                      resolutionOutcome === 'resolved'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Resolved / Agreed
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('rejected')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                      resolutionOutcome === 'rejected'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Claim Rejected
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('closed')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                      resolutionOutcome === 'closed'
                        ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Administrative Close
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Resolution Summary & Agreed Terms (15.2) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize agreed conciliation terms, verified goods delivery, or customer's commitment to remit..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Action Taken (15.2)</label>
                <input
                  type="text"
                  placeholder="e.g. Conducted video conference; provided corrected bill of lading."
                  value={resolutionActionTaken}
                  onChange={(e) => setResolutionActionTaken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* 15.3 Step 9: Collection Cadence Resumption Safeguard */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resolutionResumeCadence}
                    onChange={(e) => setResolutionResumeCadence(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-0 mt-0.5 bg-slate-900 border-slate-700"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block">
                      Resume Automated Collection Cadence (Section 15.3 Step 9)
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      Re-activates automated reminders for any outstanding balance. If unchecked, the account remains on hold.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDisputeForResolve(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Resolution & Update Case</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Dispute Summary Modal */}
      {showAiSummaryModal && (
        <AIDisputeSummary
          dispute={selectedDisputeForAiSummary}
          disputes={disputes}
          organization={organization}
          isOpenAsModal={true}
          onClose={() => setShowAiSummaryModal(false)}
          onApplyNote={(disputeId, noteText) => {
            handleAddNote(disputeId);
          }}
          onSelectDispute={(d) => setSelectedDisputeForAiSummary(d)}
        />
      )}

    </div>
  );
};
