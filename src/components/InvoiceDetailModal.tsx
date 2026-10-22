import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Building, 
  CreditCard, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Mail, 
  Paperclip, 
  Download, 
  Edit3, 
  Save, 
  Pause, 
  Play, 
  MessageSquare, 
  ExternalLink, 
  Plus, 
  History, 
  Sparkles,
  ArrowRight,
  User,
  Check
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Invoice, Debtor, Organization, FinancialStatus, AgeingStatus, DisputeWorkflowStatus, CollectionWorkflowStatus } from '../types';
import { formatCurrency } from '../services/calculations';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  organization: Organization;
  onClose: () => void;
  onOpenRecordPayment: (invoice: Invoice) => void;
  onOpenCreditNote: (invoice: Invoice) => void;
  onOpenDispute: (invoice: Invoice) => void;
  onOpenDebtorPortal: (debtor: Debtor) => void;
  onInvoiceUpdated: (updatedInvoice: Invoice) => void;
}

type InvoiceDetailTab = 
  | 'summary' 
  | 'document' 
  | 'allocations' 
  | 'reminders' 
  | 'disputes' 
  | 'adjustments' 
  | 'audit';

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  organization,
  onClose,
  onOpenRecordPayment,
  onOpenCreditNote,
  onOpenDispute,
  onOpenDebtorPortal,
  onInvoiceUpdated,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InvoiceDetailTab>('summary');
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);

  // Controlled action states
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editPoRef, setEditPoRef] = useState(invoice.purchaseOrderRef || invoice.reference || '');
  const [editExtRef, setEditExtRef] = useState(invoice.externalAccountingRef || '');
  const [editDesc, setEditDesc] = useState(invoice.description || '');
  const [editNotes, setEditNotes] = useState(invoice.internalNotes || invoice.notes || '');
  const [editDueDate, setEditDueDate] = useState(invoice.dueDate);
  const [editTerms, setEditTerms] = useState(invoice.paymentTermsDays || 30);
  const [editController, setEditController] = useState(invoice.assignedCreditControllerName || 'Sarah Miller');
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Collection Note form
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [collectionNoteText, setCollectionNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Schedule follow-up form
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(invoice.nextReminderDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
  const [followUpReason, setFollowUpReason] = useState('Verify client remittance commitment');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Hold action state
  const [holdLoading, setHoldLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/detail`);
      const data = await res.json();
      if (data.success) {
        setDetailData(data.data);
      }
    } catch (err) {
      console.error('Error loading invoice detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [invoice.id]);

  const currentInvoice: Invoice = detailData?.invoice || invoice;
  const currentDebtor: Debtor | undefined = detailData?.debtor;
  const paymentAllocations: any[] = detailData?.paymentAllocations || [];
  const creditNotes: any[] = detailData?.creditNotes || [];
  const reminders: any[] = detailData?.reminders || [];
  const disputes: any[] = detailData?.disputes || [];
  const auditHistory: any[] = detailData?.auditHistory || [];

  // Handle Metadata Save (Controlled Action)
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMetadata(true);
    try {
      const res = await fetch(`/api/invoices/${currentInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderRef: editPoRef,
          externalAccountingRef: editExtRef,
          description: editDesc,
          internalNotes: editNotes,
          dueDate: editDueDate,
          paymentTermsDays: Number(editTerms),
          assignedCreditControllerName: editController,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingMetadata(false);
        onInvoiceUpdated(data.data);
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to update invoice metadata:', err);
    } finally {
      setSavingMetadata(false);
    }
  };

  // Handle Hold / Resume (Controlled Action)
  const handleToggleHold = async () => {
    setHoldLoading(true);
    const action = currentInvoice.collectionStatus === 'on_hold' ? 'resume' : 'hold';
    try {
      const res = await fetch(`/api/invoices/${currentInvoice.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'hold' ? 'Supervisory collection hold requested' : 'Resumed routine cadence',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onInvoiceUpdated(data.data);
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to toggle hold status:', err);
    } finally {
      setHoldLoading(false);
    }
  };

  // Handle Add Collection Note (Controlled Action)
  const handleAddCollectionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionNoteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/invoices/${currentInvoice.id}/collection-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: collectionNoteText,
          activityType: 'Invoice Collection Note',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCollectionNoteText('');
        setShowAddNoteForm(false);
        onInvoiceUpdated(data.data);
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Schedule Follow-Up (Controlled Action)
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFollowUp(true);
    try {
      const res = await fetch(`/api/invoices/${currentInvoice.id}/schedule-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpDate,
          reason: followUpReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowScheduleModal(false);
        onInvoiceUpdated(data.data);
        fetchDetail();
      }
    } catch (err) {
      console.error('Failed to schedule follow-up:', err);
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header (Section 8.4) */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h2 className="text-lg font-bold text-white tracking-tight font-mono">
                  {currentInvoice.invoiceNumber}
                </h2>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700">
                  ID: {currentInvoice.id}
                </span>

                {/* Multi-Dimensional Status Badges (Section 8.2) */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  {/* 1. Financial Status */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    currentInvoice.financialStatus === 'paid'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : currentInvoice.financialStatus === 'partially_paid'
                      ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      : currentInvoice.financialStatus === 'written_off'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : currentInvoice.financialStatus === 'draft'
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>
                    Financial: {currentInvoice.financialStatus || 'Unpaid'}
                  </span>

                  {/* 2. Ageing Status */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    currentInvoice.ageingStatus === 'overdue'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    Ageing: {currentInvoice.ageingStatus || 'Current'}
                  </span>

                  {/* 3. Dispute Status */}
                  {currentInvoice.disputeStatus === 'open' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Dispute: Open
                    </span>
                  )}

                  {/* 4. Collection Status */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    currentInvoice.collectionStatus === 'on_hold'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : currentInvoice.collectionStatus === 'paused_pending_review'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : currentInvoice.collectionStatus === 'settled'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  }`}>
                    Cadence: {(currentInvoice.collectionStatus || 'active_cadence').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3 flex-wrap">
                <span>Customer: <strong className="text-slate-200">{currentInvoice.debtorName}</strong></span>
                <span>•</span>
                <span>PO: <strong className="text-slate-300 font-mono">{currentInvoice.purchaseOrderRef || 'N/A'}</strong></span>
                <span>•</span>
                <span>Ext Ref: <strong className="text-slate-300 font-mono">{currentInvoice.externalAccountingRef || 'N/A'}</strong></span>
                <span>•</span>
                <span>Source: <strong className="text-slate-300 uppercase">{currentInvoice.source || 'manual'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Section 8.4) */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            {currentDebtor && (
              <button
                onClick={() => onOpenDebtorPortal(currentDebtor)}
                title="Open Debtor Portal for this Customer"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/25 flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Customer Portal</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 px-6 border-b border-slate-800 overflow-x-auto scrollbar-none flex space-x-1 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === 'summary' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Invoice Summary & Ageing
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'document' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Original Document</span>
          </button>

          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'allocations' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Payment Allocations ({paymentAllocations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'reminders' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Reminders ({reminders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'disputes' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Disputes ({disputes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('adjustments')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'adjustments' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Credit Notes ({creditNotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2.5 font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'audit' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditHistory.length})</span>
          </button>
        </div>

        {/* Controlled Action Bar (Section 8.4) */}
        <div className="bg-slate-900/90 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
          <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider shrink-0">
            Controlled Actions:
          </span>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Record Payment */}
            {currentInvoice.amountDue > 0 && (
              <button
                onClick={() => onOpenRecordPayment(currentInvoice)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-medium flex items-center space-x-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            {/* Issue Credit Note */}
            {currentInvoice.amountDue > 0 && (
              <button
                onClick={() => onOpenCreditNote(currentInvoice)}
                className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Credit Note</span>
              </button>
            )}

            {/* Hold / Resume Cadence */}
            <button
              onClick={handleToggleHold}
              disabled={holdLoading}
              className={`px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1 ${
                currentInvoice.collectionStatus === 'on_hold'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30'
                  : 'bg-amber-600/20 text-amber-300 border-amber-500/30 hover:bg-amber-600/30'
              }`}
            >
              {currentInvoice.collectionStatus === 'on_hold' ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Cadence</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Place On Hold</span>
                </>
              )}
            </button>

            {/* Register Dispute */}
            {currentInvoice.status !== 'disputed' && currentInvoice.amountDue > 0 && (
              <button
                onClick={() => onOpenDispute(currentInvoice)}
                className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 font-medium flex items-center space-x-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Register Dispute</span>
              </button>
            )}

            {/* Add Collection Note */}
            <button
              onClick={() => setShowAddNoteForm(!showAddNoteForm)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Add Collection Note</span>
            </button>

            {/* Schedule Follow-Up */}
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Follow-Up</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Collection Note Popover */}
          {showAddNoteForm && (
            <form onSubmit={handleAddCollectionNote} className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs animate-in fade-in">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Log Controlled Collection Note</span>
                </span>
                <button type="button" onClick={() => setShowAddNoteForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                required
                placeholder="Detail customer communication, verbal commitment, or remittance status..."
                value={collectionNoteText}
                onChange={(e) => setCollectionNoteText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                >
                  {submittingNote ? 'Recording...' : 'Register Note in Audit Trail'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: SUMMARY & AGEING */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              
              {/* Balances & Ageing Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Original Amount (Gross)</span>
                  <span className="text-xl font-bold text-white mono-num">
                    {formatCurrency(currentInvoice.originalAmount || currentInvoice.totalAmount, currentInvoice.currency)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Subtotal: {formatCurrency(currentInvoice.subtotal, currentInvoice.currency)} (Tax: {formatCurrency(currentInvoice.taxAmount, currentInvoice.currency)})
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Amount Already Paid</span>
                  <span className="text-xl font-bold text-emerald-400 mono-num">
                    {formatCurrency(currentInvoice.amountPaid, currentInvoice.currency)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {paymentAllocations.length} payment allocations
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Outstanding Balance Due</span>
                  <span className="text-xl font-bold text-indigo-300 mono-num">
                    {formatCurrency(currentInvoice.amountDue, currentInvoice.currency)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Terms: {currentInvoice.paymentTermsDays || 30} days net
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Ageing & Statutory Interest</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-xl font-bold font-mono ${
                      currentInvoice.daysOverdue > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {currentInvoice.daysOverdue} d
                    </span>
                    <span className="text-slate-500 text-xs">past due</span>
                  </div>
                  <span className="text-[11px] text-amber-300 block mono-num">
                    +{formatCurrency(currentInvoice.accruedLateInterest, currentInvoice.currency)} interest (8.5% p.a.)
                  </span>
                </div>
              </div>

              {/* Customer Info Card & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Customer Information (Section 8.4) */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-white flex items-center space-x-2">
                      <Building className="w-4 h-4 text-indigo-400" />
                      <span>Customer & Debtor Profile</span>
                    </h3>
                    {currentDebtor && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                        {currentDebtor.riskTier} Risk
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Legal Entity Name</span>
                      <span className="font-bold text-white">{currentInvoice.debtorName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block">Primary Contact</span>
                        <span>{currentDebtor?.contactName || 'Accounts Department'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Email Address</span>
                        <span className="text-slate-300">{currentInvoice.debtorEmail}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block">VAT / Tax ID</span>
                        <span className="font-mono">{currentDebtor?.vatNumber || currentDebtor?.taxId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">DSO Benchmark</span>
                        <span className="font-mono text-indigo-400">{currentDebtor?.dso || 30} days</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Billing Address</span>
                      <span className="text-slate-400">{currentDebtor?.address || 'Registered Trading Address on File'}</span>
                    </div>
                  </div>
                </div>

                {/* Permitted Invoice Metadata (Section 8.4) */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-white flex items-center space-x-2">
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                      <span>Permitted Metadata & Operational Governance</span>
                    </h3>
                    <button
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      {isEditingMetadata ? 'Cancel Edit' : 'Edit Metadata'}
                    </button>
                  </div>

                  {!isEditingMetadata ? (
                    <div className="space-y-2.5 text-slate-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block">PO Reference</span>
                          <span className="font-mono font-semibold text-white">{currentInvoice.purchaseOrderRef || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">External Accounting Ref</span>
                          <span className="font-mono font-semibold text-white">{currentInvoice.externalAccountingRef || 'None'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block">Due Date</span>
                          <span className="font-mono">{currentInvoice.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Credit Controller</span>
                          <span>{currentInvoice.assignedCreditControllerName || 'Sarah Miller'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Description / Scope</span>
                        <p className="text-slate-300">{currentInvoice.description}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Internal Instructions & Notes</span>
                        <p className="text-slate-400 whitespace-pre-wrap bg-slate-900/60 p-2 rounded-lg border border-slate-850 font-mono text-[11px]">
                          {currentInvoice.internalNotes || 'No internal comments recorded.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveMetadata} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-0.5">PO Reference</label>
                          <input
                            type="text"
                            value={editPoRef}
                            onChange={(e) => setEditPoRef(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-0.5">External Accounting Ref</label>
                          <input
                            type="text"
                            value={editExtRef}
                            onChange={(e) => setEditExtRef(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-0.5">Due Date</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-0.5">Assigned Controller</label>
                          <input
                            type="text"
                            value={editController}
                            onChange={(e) => setEditController(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">Description</label>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-0.5">Internal Notes</label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingMetadata(false)}
                          className="px-3 py-1 rounded bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingMetadata}
                          className="px-4 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                        >
                          {savingMetadata ? 'Saving...' : 'Save Metadata'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

              </div>

              {/* Line Items Table */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                  Commercial Billing Line Items
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-center">Tax %</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {(currentInvoice.lineItems || []).map((li) => (
                        <tr key={li.id}>
                          <td className="px-3 py-2.5 text-white font-medium">{li.description}</td>
                          <td className="px-3 py-2.5 text-center text-slate-300">{li.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300 mono-num">
                            {formatCurrency(li.unitPrice, currentInvoice.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-400">{li.taxRate}%</td>
                          <td className="px-3 py-2.5 text-right font-bold text-white mono-num">
                            {formatCurrency(li.total, currentInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ORIGINAL INVOICE DOCUMENT */}
          {activeTab === 'document' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center text-indigo-400">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {currentInvoice.invoiceDocument?.name || `${currentInvoice.invoiceNumber}.pdf`}
                    </h3>
                    <span className="text-slate-400 text-[11px]">
                      File Size: {currentInvoice.invoiceDocument?.size || '1.4 MB'} • Uploaded: {currentInvoice.invoiceDocument?.uploadedAt || currentInvoice.issueDate}
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const docsRes = await fetch(`/api/documents?orgId=${organization.id}&search=${encodeURIComponent(currentInvoice.invoiceNumber)}`);
                      const docsData = await docsRes.json();
                      let targetDoc = docsData.data?.[0];
                      if (!targetDoc) {
                        const upRes = await fetch('/api/documents/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            organizationId: organization.id,
                            fileName: `${currentInvoice.invoiceNumber}_Final_Tax_Invoice.pdf`,
                            category: 'invoice_document',
                            associatedEntityRef: currentInvoice.invoiceNumber,
                            customerDebtorName: currentInvoice.debtorName,
                            uploadedBy: 'Automated Invoicing Engine'
                          })
                        });
                        const upData = await upRes.json();
                        targetDoc = upData.data;
                      }

                      const signRes = await fetch(`/api/documents/${targetDoc.id}/sign-url`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ttlSeconds: 900 })
                      });
                      const signData = await signRes.json();
                      if (signData.success) {
                        const link = document.createElement('a');
                        link.href = signData.data.url;
                        link.setAttribute('download', `${currentInvoice.invoiceNumber}.pdf`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    } catch (err) {
                      console.error('Error initiating signed download:', err);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold flex items-center space-x-1.5 hover:bg-indigo-500 shadow-sm transition"
                  title="Download via time-limited signed URL (Part 28 Private Cloud Storage)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download via Signed URL</span>
                </button>
              </div>

              {/* Simulated Document Viewer */}
              <div className="p-8 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-3 font-mono">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-bold">
                  [DOCUMENT VIEWER SIMULATION: {currentInvoice.invoiceNumber}.pdf]
                </div>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  Legally compliant commercial invoice document archived with cryptographic SHA-256 seal.
                  Integrates directly with digital repository, accounting synchronizer, and customer portal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT ALLOCATIONS */}
          {activeTab === 'allocations' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                Historical Remittance Allocations for this Invoice
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Payment Date</th>
                      <th className="px-3 py-2">Transaction Reference</th>
                      <th className="px-3 py-2">Payment Method</th>
                      <th className="px-3 py-2">Recorded By</th>
                      <th className="px-3 py-2 text-right">Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {paymentAllocations.map((alloc) => (
                      <tr key={alloc.paymentId}>
                        <td className="px-3 py-2.5 text-white font-mono">{alloc.paymentDate}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-200">{alloc.referenceNumber}</td>
                        <td className="px-3 py-2.5 uppercase text-slate-400">{alloc.paymentMethod.replace('_', ' ')}</td>
                        <td className="px-3 py-2.5 text-slate-400">{alloc.recordedBy}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-400 mono-num">
                          +{formatCurrency(alloc.allocatedAmount, alloc.currency)}
                        </td>
                      </tr>
                    ))}
                    {paymentAllocations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Zero payment allocations recorded against this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REMINDER HISTORY */}
          {activeTab === 'reminders' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                Dispatched Dunning Reminders & Escalations
              </span>
              <div className="space-y-3">
                {reminders.map((rem) => (
                  <div key={rem.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-600/20 text-cyan-300">
                          {rem.channel}
                        </span>
                        <span className="font-bold text-white">{rem.subject}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">{rem.sentAt}</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] bg-slate-950 p-2.5 rounded border border-slate-850">
                      {rem.body}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>Recipient: {rem.recipient}</span>
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span className="capitalize">{rem.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    No dunning notices dispatched for this invoice yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DISPUTE HISTORY */}
          {activeTab === 'disputes' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                Lodged Disputes & Formal Queries
              </span>
              <div className="space-y-3">
                {disputes.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-300 text-sm">Dispute: {d.reason.replace(/_/g, ' ')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-slate-200 italic bg-slate-950 p-2.5 rounded border border-slate-850">
                      "{d.debtorStatement}"
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Disputed Amount: <strong className="text-white">£{d.amountDisputed.toLocaleString()}</strong></span>
                      <span>Lodged: {d.lodgedDate}</span>
                    </div>
                  </div>
                ))}
                {disputes.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    No active or historical disputes lodged on this invoice.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CREDIT NOTES & ADJUSTMENTS */}
          {activeTab === 'adjustments' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                Allocated Credit Notes & Ledger Adjustments
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Credit Note #</th>
                      <th className="px-3 py-2">Issue Date</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Adjustment Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {creditNotes.map((cn) => (
                      <tr key={cn.creditNoteId}>
                        <td className="px-3 py-2.5 font-bold text-white mono-num">{cn.creditNoteNumber}</td>
                        <td className="px-3 py-2.5 text-slate-300">{cn.issueDate}</td>
                        <td className="px-3 py-2.5 capitalize text-slate-300">{cn.reason.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2.5 capitalize text-indigo-400">{cn.status}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-rose-300 mono-num">
                          -{formatCurrency(cn.allocatedAmount, cn.currency)}
                        </td>
                      </tr>
                    ))}
                    {creditNotes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Zero credit notes or concessions allocated to this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-white block uppercase tracking-wider text-[11px]">
                Immutable Forensic Audit Trail for this Invoice
              </span>
              <div className="space-y-2">
                {auditHistory.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                    <span className="text-[10px] text-slate-500 block">Operator: {log.userName}</span>
                  </div>
                ))}
                {auditHistory.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    No specific audit trail events recorded.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Schedule Follow-Up Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Schedule Collection Follow-Up (Section 8.4)</span>
                </h4>
                <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleFollowUp} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">Follow-Up Date *</label>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Follow-Up Objective / Purpose</label>
                  <textarea
                    rows={2}
                    value={followUpReason}
                    onChange={(e) => setFollowUpReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFollowUp}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                  >
                    {submittingFollowUp ? 'Scheduling...' : 'Set Reminder Date'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-xs shrink-0">
          <div className="text-slate-400">
            Last Updated: <strong className="text-slate-200">{currentInvoice.updatedAt || currentInvoice.createdAt}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            {t('actionClose')}
          </button>
        </div>

      </div>
    </div>
  );
};
