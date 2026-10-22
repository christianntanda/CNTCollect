import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building, 
  User, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  CreditCard, 
  Calendar, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  Plus, 
  Save, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Tag, 
  Paperclip, 
  Check, 
  Sparkles, 
  Upload, 
  RefreshCw, 
  Lock,
  Eye,
  History,
  FileCheck
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Debtor, 
  Organization, 
  Invoice, 
  Payment, 
  CreditNote, 
  Dispute, 
  PromiseToPay, 
  CommunicationLog, 
  CollectionActivity, 
  CustomerInternalNote, 
  CustomerDocument,
  RiskTier,
  CustomerAccountStatus,
  CustomerType
} from '../types';
import { formatCurrency } from '../services/calculations';

interface CustomerProfileModalProps {
  debtor: Debtor;
  organization: Organization;
  onClose: () => void;
  onOpenDebtorPortal: (debtor: Debtor) => void;
  onOpenPromiseModal: (debtor: Debtor) => void;
  onCustomerUpdated: (updatedDebtor: Debtor) => void;
}

type ProfileTab = 
  | 'overview' 
  | 'invoices' 
  | 'payments' 
  | 'communications' 
  | 'promises_disputes' 
  | 'collections_notes' 
  | 'documents' 
  | 'behavior_analysis' 
  | 'timeline';

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  debtor,
  organization,
  onClose,
  onOpenDebtorPortal,
  onOpenPromiseModal,
  onCustomerUpdated,
}) => {
  const { t } = useTranslation();
  const currency = debtor.defaultCurrency || organization.defaultCurrency;

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sub-tabs
  const [invoiceSubTab, setInvoiceSubTab] = useState<'outstanding' | 'paid' | 'credit_notes'>('outstanding');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'financial' | 'collections' | 'communications' | 'notes_docs'>('all');

  // Form states for adding Note
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'credit_review' | 'collection_call' | 'settlement' | 'dispute' | 'general'>('general');
  const [noteIsFlagged, setNoteIsFlagged] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Form states for logging Collection Activity
  const [showLogActivityForm, setShowLogActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<'phone_call' | 'in_person_meeting' | 'formal_letter' | 'legal_escalation' | 'settlement_negotiation'>('phone_call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityOutcome, setActivityOutcome] = useState<'spoke_to_ap' | 'left_voicemail' | 'dispute_raised' | 'promise_secured' | 'escalated_to_legal' | 'agreed_payment_plan'>('spoke_to_ap');
  const [activityFollowUp, setActivityFollowUp] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // Form states for uploading Document
  const [showUploadDocForm, setShowUploadDocForm] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'contract' | 'vat_cert' | 'credit_agreement' | 'delivery_note' | 'correspondence'>('contract');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Behavior analysis override & annotation state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideRiskTier, setOverrideRiskTier] = useState<RiskTier>(debtor.riskTier);
  const [overrideAnnotationNote, setOverrideAnnotationNote] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState('');

  // Editable customer details
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(debtor.name);
  const [editStatus, setEditStatus] = useState<CustomerAccountStatus>(debtor.status || 'active');
  const [editCustomerType, setEditCustomerType] = useState<CustomerType>(debtor.customerType || 'business');
  const [editCompanyNumber, setEditCompanyNumber] = useState(debtor.companyNumber || '');
  const [editVatNumber, setEditVatNumber] = useState(debtor.vatNumber || '');
  const [editCustomerRef, setEditCustomerRef] = useState(debtor.customerReference || '');
  const [editContactName, setEditContactName] = useState(debtor.contactName || debtor.primaryContact?.name || '');
  const [editEmail, setEditEmail] = useState(debtor.email || '');
  const [editPhone, setEditPhone] = useState(debtor.phone || '');
  const [editTermsDays, setEditTermsDays] = useState(debtor.paymentTermsDays || 30);
  const [editCreditLimit, setEditCreditLimit] = useState(debtor.creditLimit || 50000);
  const [editController, setEditController] = useState(debtor.assignedCreditControllerName || 'Sarah Miller');
  const [savingDetails, setSavingDetails] = useState(false);

  // Fetch full profile data
  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/profile`);
      const data = await res.json();
      if (data.success) {
        setProfileData(data.data);
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [debtor.id]);

  // Handle Note Submission
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          category: noteCategory,
          isFlagged: noteIsFlagged,
          authorId: 'usr-3',
          authorName: 'Sarah Miller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNoteContent('');
        setShowAddNoteForm(false);
        loadProfile();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Collection Activity Submission
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;
    setSubmittingActivity(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/collection-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType,
          title: activityTitle,
          description: activityDescription,
          outcome: activityOutcome,
          followUpDate: activityFollowUp,
          performedBy: 'Sarah Miller (Credit Controller)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActivityTitle('');
        setActivityDescription('');
        setShowLogActivityForm(false);
        loadProfile();
      }
    } catch (err) {
      console.error('Failed to log activity:', err);
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Handle Document Upload Simulation
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setSubmittingDoc(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docName.endsWith('.pdf') ? docName : `${docName}.pdf`,
          type: docType,
          size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDocName('');
        setShowUploadDocForm(false);
        loadProfile();
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setSubmittingDoc(false);
    }
  };

  // Handle Behavior Analysis Review & Annotation Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideAnnotationNote.trim()) return;
    setSubmittingOverride(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/behavior-analysis/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedRiskTier: overrideRiskTier,
          annotationNote: overrideAnnotationNote,
          reviewerName: 'Sarah Miller',
          reviewerRole: 'Credit Controller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOverrideSuccessMsg('Classification successfully reviewed, annotated, and registered in audit log.');
        setTimeout(() => {
          setShowOverrideModal(false);
          setOverrideSuccessMsg('');
        }, 1200);
        onCustomerUpdated(data.data);
        loadProfile();
      }
    } catch (err) {
      console.error('Failed to save behavior override:', err);
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Handle Editing Customer Master Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          status: editStatus,
          customerType: editCustomerType,
          companyNumber: editCompanyNumber,
          vatNumber: editVatNumber,
          taxId: editVatNumber,
          customerReference: editCustomerRef,
          contactName: editContactName,
          email: editEmail,
          phone: editPhone,
          paymentTermsDays: Number(editTermsDays),
          creditLimit: Number(editCreditLimit),
          assignedCreditControllerName: editController,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingDetails(false);
        onCustomerUpdated(data.data);
        loadProfile();
      }
    } catch (err) {
      console.error('Failed to update debtor details:', err);
    } finally {
      setSavingDetails(false);
    }
  };

  const currentDebtor = profileData?.debtor || debtor;
  const balanceSummary = profileData?.accountBalanceSummary || {
    totalInvoiced: currentDebtor.totalInvoiced || 0,
    totalOutstanding: currentDebtor.totalOutstanding || 0,
    totalOverdue: currentDebtor.totalOverdue || 0,
    overdueInvoiceCount: currentDebtor.overdueInvoiceCount || 0,
    creditLimit: currentDebtor.creditLimit || 50000,
    availableCredit: Math.max(0, (currentDebtor.creditLimit || 50000) - (currentDebtor.totalOutstanding || 0)),
    lastPaymentDate: currentDebtor.lastPaymentDate || 'N/A',
  };

  const riskIndicators = profileData?.riskIndicators || {
    creditRating: currentDebtor.creditRating || 75,
    riskTier: currentDebtor.riskTier || 'moderate',
    dso: currentDebtor.dso || 30,
    averageDaysToPay: currentDebtor.averageDaysToPay || 30,
    utilizationPct: Math.min(100, Math.round(((currentDebtor.totalOutstanding || 0) / (currentDebtor.creditLimit || 1)) * 100)),
    behaviorAnalysis: currentDebtor.behaviorAnalysis,
  };

  const behaviorAnalysis = currentDebtor.behaviorAnalysis || {
    latePaymentFrequency: 'occasional',
    averageHistoricalDelayDays: currentDebtor.averageDaysToPay || 15,
    overdueInvoiceCount: currentDebtor.overdueInvoiceCount || 0,
    balanceTrend: 'stable',
    brokenPromisesCount: 0,
    disputeFrequencyRate: 0,
    daysSinceLastPayment: 30,
    partialPaymentTendency: 'none',
    transparentRuleExplanation: [
      'Factual observation: Standard trade debtor profile with routine billing history.'
    ],
    riskTier: currentDebtor.riskTier || 'moderate',
  };

  const outstandingInvoices: Invoice[] = profileData?.outstandingInvoices || [];
  const paidInvoices: Invoice[] = profileData?.paidInvoices || [];
  const paymentHistory: Payment[] = profileData?.paymentHistory || [];
  const creditNotes: CreditNote[] = profileData?.creditNotes || [];
  const reminderHistory: CommunicationLog[] = profileData?.reminderHistory || [];
  const paymentPromises: PromiseToPay[] = profileData?.paymentPromises || [];
  const disputes: Dispute[] = profileData?.disputes || [];
  const collectionActivities: CollectionActivity[] = profileData?.collectionActivities || [];
  const internalNotes: CustomerInternalNote[] = profileData?.internalNotes || currentDebtor.internalNotesList || [];
  const customerDocuments: CustomerDocument[] = profileData?.customerDocuments || currentDebtor.documents || [];
  const activityTimeline: any[] = profileData?.activityTimeline || [];

  const filteredTimeline = activityTimeline.filter((item) => {
    if (timelineFilter === 'all') return true;
    return item.category === timelineFilter;
  });

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              {currentDebtor.customerType === 'individual' ? (
                <User className="w-6 h-6" />
              ) : (
                <Building className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {currentDebtor.name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {currentDebtor.id}
                </span>

                {/* Customer Type Badge */}
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-indigo-500/20">
                  {currentDebtor.customerType ? currentDebtor.customerType.replace('_', ' ') : 'Business'}
                </span>

                {/* Account Status Badge */}
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                  currentDebtor.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : currentDebtor.status === 'suspended'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : currentDebtor.status === 'under_review'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {currentDebtor.status || 'Active'}
                </span>

                {/* Risk Tier Badge */}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  currentDebtor.riskTier === 'low'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : currentDebtor.riskTier === 'moderate'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : currentDebtor.riskTier === 'high'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {currentDebtor.riskTier} Risk
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3 flex-wrap">
                <span>Ref: <strong className="text-slate-300">{currentDebtor.customerReference || 'N/A'}</strong></span>
                <span>•</span>
                <span>Controller: <strong className="text-slate-300">{currentDebtor.assignedCreditControllerName || 'Sarah Miller'}</strong></span>
                <span>•</span>
                <span>Currency: <strong className="text-slate-300">{currency}</strong></span>
                <span>•</span>
                <span>Language: <strong className="text-slate-300 uppercase">{currentDebtor.preferredLanguage || 'en'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => onOpenDebtorPortal(currentDebtor)}
              title="Launch token-secured self-service debtor portal"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/25 transition flex items-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>

            <button
              onClick={() => onOpenPromiseModal(currentDebtor)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25 transition flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Record PTP</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Sections 7.2 Profile Elements) */}
        <div className="bg-slate-950 px-6 border-b border-slate-800 overflow-x-auto scrollbar-none flex space-x-1 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Balances
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'invoices'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Invoices & Adjustments</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {outstandingInvoices.length + paidInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'payments'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Payments & Remittance</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {paymentHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('communications')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'communications'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Reminders & Messaging</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {reminderHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('promises_disputes')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'promises_disputes'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Promises & Disputes</span>
            {(paymentPromises.length > 0 || disputes.length > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                {paymentPromises.length + disputes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('collections_notes')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'collections_notes'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Collection Logs & Notes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {collectionActivities.length + internalNotes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'documents'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Documents ({customerDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('behavior_analysis')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'behavior_analysis'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Debtor Behaviour Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'timeline'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity Timeline</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: OVERVIEW & BALANCES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Account Balance Summary (Section 7.2 #14) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Account Balance Summary & Exposure Ledger</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Last Settlement: <strong className="text-white">{balanceSummary.lastPaymentDate}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Total Invoiced (Cumulative)</span>
                    <span className="text-lg font-bold text-white mono-num">
                      {formatCurrency(balanceSummary.totalInvoiced, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Total Outstanding</span>
                    <span className="text-lg font-bold text-indigo-300 mono-num">
                      {formatCurrency(balanceSummary.totalOutstanding, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Total Overdue Balance</span>
                    <span className="text-lg font-bold text-rose-400 mono-num">
                      {formatCurrency(balanceSummary.totalOverdue, currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {balanceSummary.overdueInvoiceCount} invoices past due
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Available Credit Capacity</span>
                    <span className="text-lg font-bold text-emerald-400 mono-num">
                      {formatCurrency(balanceSummary.availableCredit, currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Limit: {formatCurrency(balanceSummary.creditLimit, currency)}
                    </span>
                  </div>
                </div>

                {/* Credit Utilization Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Credit Limit Utilization</span>
                    <span className="mono-num font-semibold text-slate-200">
                      {riskIndicators.utilizationPct}% ({formatCurrency(balanceSummary.totalOutstanding, currency)} / {formatCurrency(balanceSummary.creditLimit, currency)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      style={{ width: `${riskIndicators.utilizationPct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        riskIndicators.utilizationPct > 85 
                          ? 'bg-rose-500' 
                          : riskIndicators.utilizationPct > 65 
                          ? 'bg-amber-500' 
                          : 'bg-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Risk Indicators (Section 7.2 #12) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Risk Indicators & Metric Benchmarks</span>
                  </h3>
                  <button
                    onClick={() => {
                      setOverrideRiskTier(currentDebtor.riskTier);
                      setShowOverrideModal(true);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-purple-600/15 text-purple-300 border border-purple-500/30 hover:bg-purple-600/25 transition flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Review & Annotate Risk</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Credit Score</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-mono font-bold text-white">{riskIndicators.creditRating}</span>
                      <span className="text-slate-500 text-xs">/ 100</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">DSO (Days Sales Outstanding)</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-mono font-bold text-indigo-400">{riskIndicators.dso}</span>
                      <span className="text-slate-500 text-xs">days</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Average Delay to Pay</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-mono font-bold text-slate-200">{riskIndicators.averageDaysToPay}</span>
                      <span className="text-slate-500 text-xs">days past due</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Payment Terms</span>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-mono font-bold text-slate-200">{currentDebtor.paymentTermsDays || 30}</span>
                      <span className="text-slate-500 text-xs">days net</span>
                    </div>
                  </div>
                </div>

                {/* Behavioral Alert Banner */}
                {behaviorAnalysis.manualOverrideNote && (
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs space-y-1">
                    <div className="flex items-center space-x-2 text-purple-300 font-semibold">
                      <FileCheck className="w-4 h-4" />
                      <span>Authorised Human Review Annotation:</span>
                    </div>
                    <p className="text-slate-300 italic">"{behaviorAnalysis.manualOverrideNote}"</p>
                    <span className="text-[11px] text-slate-400 block">
                      Reviewed by {behaviorAnalysis.lastReviewedBy || 'Authorised Officer'} on {behaviorAnalysis.lastReviewedAt || 'Recently'}
                    </span>
                  </div>
                )}
              </div>

              {/* Customer Master Details (Section 7.1 & 7.2 #1) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <span>Customer Master Record Details (Section 7.1)</span>
                  </h3>
                  <button
                    onClick={() => setIsEditingDetails(!isEditingDetails)}
                    className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                  >
                    {isEditingDetails ? 'Cancel Edit' : 'Edit Customer Record'}
                  </button>
                </div>

                {!isEditingDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Column 1: Identity & Addresses */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-slate-500 block">Legal Entity / Company Name</span>
                        <span className="font-semibold text-white text-sm">{currentDebtor.name}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 block">Company Registration #</span>
                          <span className="text-slate-300 font-mono">{currentDebtor.companyNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Tax / VAT Identification</span>
                          <span className="text-slate-300 font-mono">{currentDebtor.vatNumber || currentDebtor.taxId || 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Billing Address</span>
                        <span className="text-slate-300">
                          {currentDebtor.billingAddress 
                            ? `${currentDebtor.billingAddress.street}, ${currentDebtor.billingAddress.city} ${currentDebtor.billingAddress.postalCode}, ${currentDebtor.billingAddress.country}`
                            : currentDebtor.address || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Delivery / Service Address</span>
                        <span className="text-slate-300">
                          {currentDebtor.deliveryAddress 
                            ? `${currentDebtor.deliveryAddress.street}, ${currentDebtor.deliveryAddress.city} ${currentDebtor.deliveryAddress.postalCode}, ${currentDebtor.deliveryAddress.country}`
                            : currentDebtor.address || 'Same as billing address'}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Contacts & Governance */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 block">Primary Contact</span>
                          <span className="text-slate-200 font-medium">{currentDebtor.contactName || currentDebtor.primaryContact?.name}</span>
                          <span className="text-[11px] text-slate-400 block">{currentDebtor.email}</span>
                          <span className="text-[11px] text-slate-400 block">{currentDebtor.phone}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Accounts Payable Contact</span>
                          <span className="text-slate-200 font-medium">{currentDebtor.accountsPayableContact?.name || 'Accounts Payable'}</span>
                          <span className="text-[11px] text-slate-400 block">{currentDebtor.accountsPayableContact?.email || currentDebtor.email}</span>
                          <span className="text-[11px] text-slate-400 block">{currentDebtor.accountsPayableContact?.phone || currentDebtor.phone}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 block">Communication Preferences</span>
                          <div className="flex gap-1.5 mt-1">
                            {(currentDebtor.communicationPreferences || ['email']).map((cp: string) => (
                              <span key={cp} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 uppercase">
                                {cp}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Reminder Consent (Section 7.1)</span>
                          <span className="inline-flex items-center space-x-1 text-emerald-400 mt-1 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Consent Verified ({currentDebtor.consent?.consentChannel || 'digital_portal'})</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Assigned Credit Controller</span>
                        <span className="text-slate-200 font-medium">{currentDebtor.assignedCreditControllerName || 'Sarah Miller'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveDetails} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Company / Individual Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Customer Category</label>
                        <select
                          value={editCustomerType}
                          onChange={(e) => setEditCustomerType(e.target.value as CustomerType)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="business">Commercial Business (B2B)</option>
                          <option value="individual">Individual Consumer (B2C)</option>
                          <option value="enterprise">Key Enterprise Account</option>
                          <option value="government_nonprofit">Government & Public Sector</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Account Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as CustomerAccountStatus)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="under_review">Under Review</option>
                          <option value="disputed">Disputed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Registration Number</label>
                        <input
                          type="text"
                          value={editCompanyNumber}
                          onChange={(e) => setEditCompanyNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Tax ID / VAT #</label>
                        <input
                          type="text"
                          value={editVatNumber}
                          onChange={(e) => setEditVatNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Customer Reference</label>
                        <input
                          type="text"
                          value={editCustomerRef}
                          onChange={(e) => setEditCustomerRef(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={editContactName}
                          onChange={(e) => setEditContactName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Payment Terms (Days Net)</label>
                        <input
                          type="number"
                          value={editTermsDays}
                          onChange={(e) => setEditTermsDays(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Credit Limit ({currency})</label>
                        <input
                          type="number"
                          value={editCreditLimit}
                          onChange={(e) => setEditCreditLimit(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Assigned Credit Controller</label>
                        <input
                          type="text"
                          value={editController}
                          onChange={(e) => setEditController(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsEditingDetails(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetails}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 flex items-center space-x-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingDetails ? 'Saving...' : 'Save Customer Changes'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: INVOICES & ADJUSTMENTS (Section 7.2 #2, #3, #5) */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
                <button
                  onClick={() => setInvoiceSubTab('outstanding')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    invoiceSubTab === 'outstanding'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Outstanding Invoices ({outstandingInvoices.length})
                </button>
                <button
                  onClick={() => setInvoiceSubTab('paid')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    invoiceSubTab === 'paid'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Paid Invoices ({paidInvoices.length})
                </button>
                <button
                  onClick={() => setInvoiceSubTab('credit_notes')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    invoiceSubTab === 'credit_notes'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Credit Notes & Adjustments ({creditNotes.length})
                </button>
              </div>

              {/* Outstanding Invoices List */}
              {invoiceSubTab === 'outstanding' && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Days Overdue</th>
                        <th className="px-4 py-3 text-right">Interest Accrued</th>
                        <th className="px-4 py-3 text-right">Amount Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {outstandingInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-bold text-white mono-num">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-300">{inv.issueDate}</td>
                          <td className="px-4 py-3 text-slate-300">{inv.dueDate}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              inv.status === 'overdue' 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                : inv.status === 'disputed'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {inv.daysOverdue > 0 ? (
                              <span className="text-rose-400 font-bold">{inv.daysOverdue} d</span>
                            ) : (
                              <span className="text-emerald-400">Current</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-amber-300">
                            {inv.accruedLateInterest > 0 ? formatCurrency(inv.accruedLateInterest, inv.currency) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white mono-num">
                            {formatCurrency(inv.amountDue, inv.currency)}
                          </td>
                        </tr>
                      ))}
                      {outstandingInvoices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">
                            Zero outstanding invoices on this account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paid Invoices List */}
              {invoiceSubTab === 'paid' && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3">Amount Paid</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {paidInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-bold text-white mono-num">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-300">{inv.issueDate}</td>
                          <td className="px-4 py-3 text-slate-300 mono-num">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400 mono-num">{formatCurrency(inv.amountPaid, inv.currency)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Fully Settled
                            </span>
                          </td>
                        </tr>
                      ))}
                      {paidInvoices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            No settled invoices recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Credit Notes & Adjustments */}
              {invoiceSubTab === 'credit_notes' && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Credit Note #</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {creditNotes.map((cn) => (
                        <tr key={cn.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-bold text-white mono-num">{cn.creditNoteNumber}</td>
                          <td className="px-4 py-3 text-slate-300">{cn.issueDate}</td>
                          <td className="px-4 py-3 text-slate-300 capitalize">{cn.reason.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-300 mono-num">
                            -{formatCurrency(cn.amount, cn.currency)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 capitalize">
                              {cn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {creditNotes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            Zero credit notes or ledger adjustments issued for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT HISTORY (Section 7.2 #4) */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Settlement & Remittance History</span>
                </h3>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Settlement Date</th>
                      <th className="px-4 py-3">Reference / Transaction ID</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Allocations</th>
                      <th className="px-4 py-3">Operator</th>
                      <th className="px-4 py-3 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3 text-white font-mono">{p.paymentDate}</td>
                        <td className="px-4 py-3 font-semibold text-slate-200">{p.referenceNumber}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 uppercase text-[10px]">
                            {p.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {p.allocations && p.allocations.length > 0 ? (
                            p.allocations.map(a => a.invoiceNumber).join(', ')
                          ) : 'Direct Account Remittance'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{p.recordedBy}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400 mono-num text-sm">
                          +{formatCurrency(p.amount, p.currency)}
                        </td>
                      </tr>
                    ))}
                    {paymentHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No historical payments recorded for this customer account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REMINDER & MESSAGING HISTORY (Section 7.2 #6, #7) */}
          {activeTab === 'communications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Dunning Reminders, SMS & Email History</span>
                </h3>
              </div>

              <div className="space-y-3">
                {reminderHistory.map((comm) => (
                  <div key={comm.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 border border-slate-800 text-cyan-300">
                          {comm.channel}
                        </span>
                        <span className="font-semibold text-white">{comm.subject}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">{comm.sentAt}</span>
                    </div>

                    <p className="text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-850 font-mono text-[11px]">
                      {comm.body}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Recipient: <strong className="text-slate-300">{comm.recipient}</strong></span>
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span className="capitalize">{comm.status}</span>
                      </span>
                    </div>
                  </div>
                ))}

                {reminderHistory.length === 0 && (
                  <div className="py-10 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    No automated dunning reminders or messages dispatched yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PROMISES & DISPUTES (Section 7.2 #8, #9) */}
          {activeTab === 'promises_disputes' && (
            <div className="space-y-6">
              
              {/* Payment Promises (PTP) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Payment Promises (PTP)</span>
                  </h3>
                  <button
                    onClick={() => onOpenPromiseModal(currentDebtor)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Record New Promise</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paymentPromises.map((pr) => (
                    <div key={pr.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white mono-num text-sm">
                          {formatCurrency(pr.promisedAmount, pr.currency)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          pr.status === 'fulfilled' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : pr.status === 'broken'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {pr.status}
                        </span>
                      </div>
                      <div className="text-slate-400 space-y-0.5">
                        <div>Committed Date: <strong className="text-white">{pr.promisedDate}</strong></div>
                        <div>Contact: <strong className="text-slate-300">{pr.contactPerson}</strong></div>
                        {pr.notes && <div className="italic text-slate-400">"{pr.notes}"</div>}
                      </div>
                    </div>
                  ))}

                  {paymentPromises.length === 0 && (
                    <div className="col-span-2 py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      No active or past payment promises recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Disputes & Queries */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Disputes & Queries</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {disputes.map((d) => (
                    <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{d.invoiceNumber}</span>
                          <span className="text-slate-400">• {d.reason.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                          {d.status}
                        </span>
                      </div>
                      <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                        "{d.debtorStatement}"
                      </p>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Disputed: <strong className="text-white">£{d.amountDisputed.toLocaleString()}</strong></span>
                        <span>Lodged: <strong className="text-slate-300">{d.lodgedDate}</strong></span>
                      </div>
                    </div>
                  ))}

                  {disputes.length === 0 && (
                    <div className="py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      No active invoice disputes on this customer account.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: COLLECTION ACTIVITIES & INTERNAL NOTES (Section 7.2 #10, #11) */}
          {activeTab === 'collections_notes' && (
            <div className="space-y-6">
              
              {/* Collection Activities (Section 7.2 #10) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <PhoneCall className="w-4 h-4 text-indigo-400" />
                    <span>Collection Activities (Calls, Meetings, Demands)</span>
                  </h3>
                  <button
                    onClick={() => setShowLogActivityForm(!showLogActivityForm)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Log Collection Activity</span>
                  </button>
                </div>

                {/* Form to log activity */}
                {showLogActivityForm && (
                  <form onSubmit={handleLogActivity} className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">Activity Type</label>
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="phone_call">Phone Call</option>
                          <option value="settlement_negotiation">Settlement Negotiation</option>
                          <option value="in_person_meeting">In-Person Meeting</option>
                          <option value="formal_letter">Formal Demand Letter</option>
                          <option value="legal_escalation">Legal Escalation</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-300 mb-1">Activity Title / Subject *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Credit Term Review Call with Marcus Vance"
                          value={activityTitle}
                          onChange={(e) => setActivityTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Details & Meeting Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Detail the discussion, promises made, or escalation steps..."
                        value={activityDescription}
                        onChange={(e) => setActivityDescription(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">Outcome</label>
                        <select
                          value={activityOutcome}
                          onChange={(e) => setActivityOutcome(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        >
                          <option value="spoke_to_ap">Spoke to Accounts Payable</option>
                          <option value="promise_secured">Payment Promise Secured</option>
                          <option value="agreed_payment_plan">Agreed Payment Plan</option>
                          <option value="dispute_raised">Dispute Raised by Debtor</option>
                          <option value="left_voicemail">Left Voicemail / Message</option>
                          <option value="escalated_to_legal">Escalated to Legal Counsel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1">Follow-Up Date</label>
                        <input
                          type="date"
                          value={activityFollowUp}
                          onChange={(e) => setActivityFollowUp(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowLogActivityForm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingActivity}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
                      >
                        {submittingActivity ? 'Saving...' : 'Record Collection Activity'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {collectionActivities.map((act) => (
                    <div key={act.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 border border-slate-850 text-indigo-300">
                            {act.activityType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-white">{act.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{act.performedAt}</span>
                      </div>
                      <p className="text-slate-300">{act.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Logged by: <strong className="text-slate-300">{act.performedBy}</strong></span>
                        {act.outcome && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 capitalize">
                            Outcome: {act.outcome.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {collectionActivities.length === 0 && (
                    <div className="py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      No collection activity logs recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Notes & Comments (Section 7.2 #11) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Internal Comments & Credit Controller Notes</span>
                  </h3>
                  <button
                    onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Internal Comment</span>
                  </button>
                </div>

                {/* Add Note Form */}
                {showAddNoteForm && (
                  <form onSubmit={handleAddNote} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1">Comment Content *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Add confidential internal observation, telematics note, or credit rating adjustment..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <select
                          value={noteCategory}
                          onChange={(e) => setNoteCategory(e.target.value as any)}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                        >
                          <option value="general">General Note</option>
                          <option value="credit_review">Credit Review</option>
                          <option value="collection_call">Collection Call</option>
                          <option value="settlement">Settlement & Plan</option>
                          <option value="dispute">Dispute Observation</option>
                        </select>

                        <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={noteIsFlagged}
                            onChange={(e) => setNoteIsFlagged(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                          />
                          <span>Flag as Priority / Attention</span>
                        </label>
                      </div>

                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowAddNoteForm(false)}
                          className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingNote}
                          className="px-4 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                        >
                          {submittingNote ? 'Saving...' : 'Post Note'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {internalNotes.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 capitalize">
                            {n.category.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-slate-200">{n.authorName}</span>
                          {n.isFlagged && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">
                              FLAGGED
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-[11px] font-mono">{n.createdAt}</span>
                      </div>
                      <p className="text-slate-300 pt-0.5">{n.content}</p>
                    </div>
                  ))}

                  {internalNotes.length === 0 && (
                    <div className="py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      No internal comments posted yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 7: DOCUMENTS (Section 7.2 #13) */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <span>Customer Contracts & Attached Documents</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contracts, VAT certificates, credit agreements, delivery notes, and correspondence.
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadDocForm(!showUploadDocForm)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>

              {/* Upload Document Form */}
              {showUploadDocForm && (
                <form onSubmit={handleUploadDocument} className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Document Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Master_Supply_Agreement_2026.pdf"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Document Category</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="contract">Commercial Contract</option>
                        <option value="vat_cert">VAT / Tax Certificate</option>
                        <option value="credit_agreement">Credit Facility Agreement</option>
                        <option value="delivery_note">Proof of Delivery / Consignment Note</option>
                        <option value="correspondence">Official Correspondence</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowUploadDocForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDoc}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
                    >
                      {submittingDoc ? 'Attaching...' : 'Upload & Register Document'}
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customerDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">{doc.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {doc.type.replace(/_/g, ' ')} • {doc.size} • {doc.uploadedAt}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono">
                      Verified
                    </span>
                  </div>
                ))}

                {customerDocuments.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    No documents uploaded for this customer yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: DEBTOR BEHAVIOUR ANALYSIS (Section 7.3) */}
          {activeTab === 'behavior_analysis' && (
            <div className="space-y-6">
              
              {/* Header with explainable rules banner */}
              <div className="bg-purple-950/20 border border-purple-800/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-purple-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Transparent & Explainable Behaviour Analysis (Section 7.3)</span>
                  </div>
                  <button
                    onClick={() => {
                      setOverrideRiskTier(currentDebtor.riskTier);
                      setShowOverrideModal(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition shadow-sm"
                  >
                    Annotate / Override Classification
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Behaviour patterns are identified using deterministic observable facts from ledger transactions. 
                  Unverified inferences are never treated as facts, and customers are never automatically labeled as fraudulent. 
                  Authorised credit controllers and finance managers retain full review and annotation authority.
                </p>
              </div>

              {/* 8 Observable Behavioral Patterns (Section 7.3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                
                {/* 1. Repeated late payments */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">1. Late Payment Frequency</span>
                  <span className="text-base font-bold text-white capitalize">
                    {behaviorAnalysis.latePaymentFrequency || 'Occasional'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">Based on past 12 settlements</span>
                </div>

                {/* 2. Average historical payment delay */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">2. Average Payment Delay</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-base font-bold text-indigo-400 font-mono">
                      {behaviorAnalysis.averageHistoricalDelayDays ?? currentDebtor.averageDaysToPay ?? 15}
                    </span>
                    <span className="text-slate-400 text-xs">days past due</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">Across all settled invoices</span>
                </div>

                {/* 3. Number of overdue invoices */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">3. Overdue Invoice Count</span>
                  <span className="text-base font-bold text-rose-400 font-mono">
                    {behaviorAnalysis.overdueInvoiceCount ?? balanceSummary.overdueInvoiceCount} invoices
                  </span>
                  <span className="text-[11px] text-slate-500 block">Currently delinquent</span>
                </div>

                {/* 4. Outstanding balance trend */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">4. Outstanding Balance Trend</span>
                  <div className="flex items-center space-x-1.5 font-bold text-sm">
                    {behaviorAnalysis.balanceTrend === 'improving' ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <TrendingDown className="w-4 h-4" />
                        <span>Improving (Decreasing)</span>
                      </span>
                    ) : behaviorAnalysis.balanceTrend === 'deteriorating' ? (
                      <span className="text-rose-400 flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Deteriorating (Rising)</span>
                      </span>
                    ) : (
                      <span className="text-blue-400 flex items-center space-x-1">
                        <Minus className="w-4 h-4" />
                        <span>Stable Exposure</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">90-day trajectory</span>
                </div>

                {/* 5. Broken payment promises */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">5. Broken PTP Promises</span>
                  <span className="text-base font-bold text-white font-mono">
                    {behaviorAnalysis.brokenPromisesCount ?? 0} commitments
                  </span>
                  <span className="text-[11px] text-slate-500 block">Historical missed PTPs</span>
                </div>

                {/* 6. Frequency of invoice disputes */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">6. Dispute Frequency Rate</span>
                  <span className="text-base font-bold text-amber-300 font-mono">
                    {behaviorAnalysis.disputeFrequencyRate ?? 0}%
                  </span>
                  <span className="text-[11px] text-slate-500 block">Of all issued billings</span>
                </div>

                {/* 7. Time since last payment */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">7. Days Since Last Payment</span>
                  <span className="text-base font-bold text-white font-mono">
                    {behaviorAnalysis.daysSinceLastPayment ?? 25} days
                  </span>
                  <span className="text-[11px] text-slate-500 block">Last: {balanceSummary.lastPaymentDate}</span>
                </div>

                {/* 8. Partial-payment patterns */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">8. Partial Payment Tendency</span>
                  <span className="text-base font-bold text-white capitalize">
                    {behaviorAnalysis.partialPaymentTendency || 'Moderate'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">Splits invoice balances</span>
                </div>

              </div>

              {/* Explainable Rules Factual Ledger Section */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Factual Rules & Audit-Verified Evidence Log</span>
                </h4>

                <div className="space-y-2">
                  {(behaviorAnalysis.transparentRuleExplanation || []).map((rule: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-850 text-slate-300 flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </div>
                  ))}

                  {(!behaviorAnalysis.transparentRuleExplanation || behaviorAnalysis.transparentRuleExplanation.length === 0) && (
                    <p className="text-slate-500 italic">Standard verifiable commercial indicators applied.</p>
                  )}
                </div>
              </div>

              {/* Review / Annotation History */}
              {behaviorAnalysis.lastReviewedBy && (
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-800/40 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-purple-300 font-semibold block">Supervisory Human Review Completed</span>
                    <span className="text-slate-400 text-[11px]">
                      Conducted by: <strong>{behaviorAnalysis.lastReviewedBy}</strong> • Timestamp: {behaviorAnalysis.lastReviewedAt}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold text-[11px]">
                    Classification Confirmed
                  </span>
                </div>
              )}

            </div>
          )}

          {/* TAB 9: CHRONOLOGICAL ACTIVITY TIMELINE (Section 7.2) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Chronological Customer Activity Timeline</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unified audit-defensible stream of invoices, remittances, dunning notices, promises, disputes, and notes.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex space-x-1.5 text-xs overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setTimelineFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timelineFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({activityTimeline.length})
                  </button>
                  <button
                    onClick={() => setTimelineFilter('financial')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timelineFilter === 'financial' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Financial
                  </button>
                  <button
                    onClick={() => setTimelineFilter('collections')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timelineFilter === 'collections' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Collections
                  </button>
                  <button
                    onClick={() => setTimelineFilter('communications')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timelineFilter === 'communications' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Dunning
                  </button>
                  <button
                    onClick={() => setTimelineFilter('notes_docs')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timelineFilter === 'notes_docs' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Notes & Docs
                  </button>
                </div>
              </div>

              {/* Timeline Stream */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {filteredTimeline.map((item) => {
                  let dotColor = 'bg-slate-400';
                  let icon = <FileText className="w-3.5 h-3.5 text-white" />;

                  if (item.type === 'invoice') {
                    dotColor = 'bg-blue-500';
                    icon = <FileText className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'payment') {
                    dotColor = 'bg-emerald-500';
                    icon = <CreditCard className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'credit_note') {
                    dotColor = 'bg-purple-500';
                    icon = <Minus className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'communication') {
                    dotColor = 'bg-cyan-500';
                    icon = <Mail className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'promise') {
                    dotColor = 'bg-indigo-500';
                    icon = <Calendar className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'dispute') {
                    dotColor = 'bg-amber-500';
                    icon = <ShieldAlert className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'collection_activity') {
                    dotColor = 'bg-rose-500';
                    icon = <PhoneCall className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'note') {
                    dotColor = 'bg-slate-500';
                    icon = <MessageSquare className="w-3.5 h-3.5 text-white" />;
                  } else if (item.type === 'document') {
                    dotColor = 'bg-teal-500';
                    icon = <Paperclip className="w-3.5 h-3.5 text-white" />;
                  }

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full ${dotColor} flex items-center justify-center ring-4 ring-slate-900`}>
                        {icon}
                      </div>

                      {/* Content Card */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 hover:border-slate-750 transition text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{item.title}</span>
                          <span className="text-[11px] font-mono text-slate-500">{item.timestamp}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{item.description}</p>
                        {item.status && (
                          <div className="pt-1 flex items-center space-x-2">
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              Status: {item.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTimeline.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No activity entries found for the selected filter.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-xs shrink-0">
          <div className="flex items-center space-x-2 text-slate-400">
            <span>Customer ID: <strong className="text-white font-mono">{currentDebtor.id}</strong></span>
            <span>•</span>
            <span>Registration: <strong className="text-slate-300 font-mono">{currentDebtor.companyNumber || 'N/A'}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            {t('actionClose')}
          </button>
        </div>

      </div>

      {/* Behavioral Analysis & Risk Tier Override Modal (Section 7.3) */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Supervisory Risk Review & Annotation</span>
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-3.5 text-xs">
              <p className="text-slate-300">
                Authorised review for customer <strong>{currentDebtor.name}</strong>. Provide an explainable, fact-based rationale.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Adjusted Risk Tier</label>
                <select
                  value={overrideRiskTier}
                  onChange={(e) => setOverrideRiskTier(e.target.value as RiskTier)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="low">Low Risk (Prompt Settler)</option>
                  <option value="moderate">Moderate Risk (Occasional Delays)</option>
                  <option value="high">High Risk (Repeated Arrears)</option>
                  <option value="critical">Critical Risk (Severe Delinquency / Pre-Action)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Justification / Supervisory Annotation (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Reviewed credit rating following goodwill concession on shipment #4412. Agreed structured settlement schedule."
                  value={overrideAnnotationNote}
                  onChange={(e) => setOverrideAnnotationNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Compliance Guarantee (Section 7.3):</span>
                <span>• Classification rules remain transparent and explainable.</span>
                <span>• Unverified inferences are not treated as facts.</span>
                <span>• Automatic fraudulent labeling is strictly prohibited.</span>
              </div>

              {overrideSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-center">
                  {overrideSuccessMsg}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 font-bold"
                >
                  {submittingOverride ? 'Saving...' : 'Save & Register Annotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
