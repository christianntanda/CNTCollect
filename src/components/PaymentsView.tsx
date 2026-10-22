import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  ArrowRight, 
  Building, 
  Calendar, 
  Layers, 
  X, 
  Check, 
  Sparkles,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  FileText,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Sliders,
  Upload,
  Download,
  Eye,
  Clock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Tag,
  CheckSquare
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Payment, 
  Debtor, 
  Invoice, 
  Organization, 
  PaymentMethod, 
  PaymentAllocation, 
  PaymentVerificationTask, 
  BankStatementLine,
  ReconciliationRecord,
  SuggestedMatchOption
} from '../types';
import { formatCurrency } from '../services/calculations';

interface PaymentMethodConfig {
  id: string;
  name: string;
  code: string;
  isEnabled: boolean;
  clearingDays: number;
  requiresProofOfPayment: boolean;
  description: string;
}

interface PaymentsViewProps {
  organization: Organization;
  payments: Payment[];
  debtors: Debtor[];
  invoices: Invoice[];
  onRecordPayment: (paymentData: any) => void;
  onRefreshData?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  organization,
  payments,
  debtors,
  invoices,
  onRecordPayment,
  onRefreshData,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  // Active top-level subtab (11.1 Register, 11.4 Verification Tasks, 11.5 Bank Reconciliation, 11.2 Payment Methods)
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'verification' | 'reconciliation' | 'methods'>('register');

  // Search & Filter State for Payments Register
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterReconStatus, setFilterReconStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Section 11.3 Record Payment & Multi-Invoice Allocation Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState(debtors[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentCurrency, setPaymentCurrency] = useState<string>(currency);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [gatewayRef, setGatewayRef] = useState('');
  const [notes, setNotes] = useState('');
  const [allowCreditBalance, setAllowCreditBalance] = useState(true);
  const [allocationsMap, setAllocationsMap] = useState<Record<string, number>>({});

  // Payment Reversal State (Section 11.3 & 10.5)
  const [reversalPayment, setReversalPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalAuthorizedBy, setReversalAuthorizedBy] = useState('Senior Finance Officer');
  const [isReversing, setIsReversing] = useState(false);

  // Section 11.4 Proof of Payment Verifications State
  const [verificationTasks, setVerificationTasks] = useState<PaymentVerificationTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [activeVerifyTask, setActiveVerifyTask] = useState<PaymentVerificationTask | null>(null);
  const [verifyBankRef, setVerifyBankRef] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeRejectTask, setActiveRejectTask] = useState<PaymentVerificationTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Section 11.5 Bank Statement Feeds & Reconciliation State
  const [statementLines, setStatementLines] = useState<BankStatementLine[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [reconciliationHistory, setReconciliationHistory] = useState<ReconciliationRecord[]>([]);
  const [showImportStatementModal, setShowImportStatementModal] = useState(false);
  const [rawStatementCsv, setRawStatementCsv] = useState(
    `Date,Description,Reference,Amount,Currency\n2026-10-18,BACS DIRECT CREDIT BARCLAYS REF INV-2026-0901,BARC-WIRE-992140,14250.00,GBP\n2026-10-17,STRIPE PAYOUT BATCH 99182 VANGUARD,STRIPE-PO-99182,3200.00,GBP\n2026-10-16,DIRECT CREDIT UNALLOCATED CLIENT 102,WIRE-UNALLOC-102,1500.00,GBP`
  );
  const [activeReconLine, setActiveReconLine] = useState<BankStatementLine | null>(null);
  const [reconTargetType, setReconTargetType] = useState<'invoice' | 'payment'>('invoice');
  const [reconTargetId, setReconTargetId] = useState<string>('');
  const [reconNotes, setReconNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Section 11.2 Payment Methods Config State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);

  // Load verification tasks
  const loadVerificationTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`/api/payments/verification-tasks?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setVerificationTasks(data.data);
      }
    } catch (err) {
      console.error('Error loading verification tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Load statement lines
  const loadStatementLines = async () => {
    setIsLoadingStatement(true);
    try {
      const res = await fetch(`/api/payments/statement-lines?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setStatementLines(data.data);
      }
    } catch (err) {
      console.error('Error loading statement lines:', err);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  // Load reconciliation history
  const loadReconciliationHistory = async () => {
    try {
      const res = await fetch(`/api/payments/reconciliation-history?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setReconciliationHistory(data.data);
      }
    } catch (err) {
      console.error('Error loading reconciliation history:', err);
    }
  };

  // Load payment methods config
  const loadPaymentMethods = async () => {
    try {
      const res = await fetch('/api/payments/methods');
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(data.data);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  };

  useEffect(() => {
    loadVerificationTasks();
    loadStatementLines();
    loadReconciliationHistory();
    loadPaymentMethods();
  }, [organization.id]);

  // Debtor open invoices for allocation
  const debtorInvoices = invoices.filter((i) => i.debtorId === selectedDebtorId && i.amountDue > 0);

  // Auto-allocate oldest overdue first (FIFO)
  const handleAutoAllocate = () => {
    let remaining = paymentAmount;
    const newAllocMap: Record<string, number> = {};
    const sorted = [...debtorInvoices].sort((a, b) => b.daysOverdue - a.daysOverdue);

    for (const inv of sorted) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, inv.amountDue);
      newAllocMap[inv.id] = Math.round(alloc * 100) / 100;
      remaining -= alloc;
    }
    setAllocationsMap(newAllocMap);
  };

  const totalAllocated = Object.values(allocationsMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const unallocatedDifference = Math.round((paymentAmount - totalAllocated) * 100) / 100;

  // Execute Record Payment & Multi-Invoice Allocation (Section 11.3)
  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalAllocated > paymentAmount + 0.01) {
      alert(`The sum of valid allocations (${totalAllocated.toFixed(2)}) must not exceed the available payment amount (${paymentAmount.toFixed(2)}).`);
      return;
    }

    if (unallocatedDifference > 0 && !allowCreditBalance) {
      alert(`Unallocated residual balance of ${unallocatedDifference.toFixed(2)} must be allocated to an invoice unless customer credit balance is authorized.`);
      return;
    }

    const allocations: PaymentAllocation[] = Object.entries(allocationsMap)
      .filter(([_, amt]) => amt > 0)
      .map(([invId, amt]) => {
        const inv = invoices.find((i) => i.id === invId);
        return {
          invoiceId: invId,
          invoiceNumber: inv?.invoiceNumber || '',
          allocatedAmount: amt,
        };
      });

    onRecordPayment({
      organizationId: organization.id,
      debtorId: selectedDebtorId,
      amount: Number(paymentAmount),
      currency: paymentCurrency,
      paymentDate,
      paymentMethod,
      transactionReference: transactionRef || `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
      bankReference: bankRef || undefined,
      gatewayReference: gatewayRef || undefined,
      source: 'manual_entry',
      reconciliationStatus: bankRef ? 'reconciled' : 'unreconciled',
      verificationStatus: 'verified',
      allocations,
      unallocatedAmount: Math.max(0, unallocatedDifference),
      overpaymentAmount: Math.max(0, unallocatedDifference),
      creditBalanceAmount: unallocatedDifference > 0 ? unallocatedDifference : 0,
      recordedBy: 'Senior Credit Controller',
      notes: notes.trim() || undefined,
      referenceNumber: transactionRef || `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    setShowRecordModal(false);
    setPaymentAmount(0);
    setAllocationsMap({});
    setNotes('');
    setBankRef('');
    setGatewayRef('');
  };

  // Payment Reversal Execution (Section 11.3 & 10.5)
  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPayment) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      alert('A valid documented justification is required for payment reversal.');
      return;
    }

    setIsReversing(true);
    try {
      const res = await fetch(`/api/ar/payments/${reversalPayment.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reversalReason.trim(),
          authorizedBy: reversalAuthorizedBy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReversalPayment(null);
        setReversalReason('');
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to reverse payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error executing payment reversal');
    } finally {
      setIsReversing(false);
    }
  };

  // Verify Proof of Payment (Section 11.4)
  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVerifyTask) return;

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/payments/verification-tasks/${activeVerifyTask.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: 'David Chen (Finance Manager)',
          reviewNotes: verifyNotes || 'Confirmed against clearing bank feed.',
          bankClearingRef: verifyBankRef || activeVerifyTask.bankReference || 'BANK-CLEAR-VERIFIED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveVerifyTask(null);
        setVerifyBankRef('');
        setVerifyNotes('');
        loadVerificationTasks();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to verify payment task');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying payment');
    } finally {
      setIsVerifying(false);
    }
  };

  // Reject Proof of Payment (Section 11.4)
  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRejectTask) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      alert('Please state a valid reason for rejecting this proof of payment.');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/payments/verification-tasks/${activeRejectTask.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: 'Credit Operations Supervisor',
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveRejectTask(null);
        setRejectionReason('');
        loadVerificationTasks();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to reject payment task');
      }
    } catch (err) {
      console.error(err);
      alert('Error rejecting payment task');
    } finally {
      setIsRejecting(false);
    }
  };

  // Confirm Reconciliation Match (Section 11.5)
  const handleExecuteReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReconLine || !reconTargetId) return;

    setIsReconciling(true);
    try {
      const res = await fetch('/api/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementLineId: activeReconLine.id,
          targetType: reconTargetType,
          targetId: reconTargetId,
          matchedBy: 'Sarah Miller (Senior Controller)',
          notes: reconNotes || 'Reconciled and matched via intelligent engine.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveReconLine(null);
        setReconTargetId('');
        setReconNotes('');
        loadStatementLines();
        loadReconciliationHistory();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to reconcile statement line');
      }
    } catch (err) {
      console.error(err);
      alert('Error reconciling statement line');
    } finally {
      setIsReconciling(false);
    }
  };

  // Toggle Payment Method Status (Section 11.2)
  const handleToggleMethod = async (method: PaymentMethodConfig) => {
    setIsUpdatingMethod(true);
    try {
      const res = await fetch(`/api/payments/methods/${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: !method.isEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods((prev) =>
          prev.map((m) => (m.id === method.id ? { ...m, isEnabled: !method.isEnabled } : m))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingMethod(false);
    }
  };

  // Filtered Payments for Register
  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      p.referenceNumber?.toLowerCase().includes(term) ||
      p.transactionReference?.toLowerCase().includes(term) ||
      p.bankReference?.toLowerCase().includes(term) ||
      p.debtorName?.toLowerCase().includes(term) ||
      p.allocations?.some((a) => a.invoiceNumber?.toLowerCase().includes(term));

    const matchesMethod = filterMethod === 'all' || p.paymentMethod === filterMethod;
    const matchesRecon = filterReconStatus === 'all' || p.reconciliationStatus === filterReconStatus;
    const matchesSource = filterSource === 'all' || p.source === filterSource;

    return matchesSearch && matchesMethod && matchesRecon && matchesSource;
  });

  const totalCollectedAllTime = payments
    .filter((p) => p.reversalStatus !== 'reversed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingVerificationCount = verificationTasks.filter((t) => t.status === 'pending_review').length;
  const unmatchedStatementCount = statementLines.filter((l) => l.status === 'unmatched' || l.status === 'suggested').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Part 11 — Payment Management & Reconciliation</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
              {formatCurrency(totalCollectedAllTime, currency)} settled
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-traceable payment ledger, multi-invoice allocation engine, customer proof-of-payment verifications, and automated bank reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (debtors[0]) setSelectedDebtorId(debtors[0].id);
              setTransactionRef(`WIRE-${Math.floor(100000 + Math.random() * 900000)}`);
              setShowRecordModal(true);
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment & Allocate</span>
          </button>
        </div>
      </div>

      {/* Part 11 Sub-Module Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 text-xs font-semibold overflow-x-auto scrollbar-none pb-2">
        <button
          onClick={() => setActiveSubTab('register')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeSubTab === 'register'
              ? 'bg-slate-800 text-emerald-300 font-bold border border-emerald-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Payment Register (11.1 & 11.3)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-300 border border-slate-700">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('verification')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap relative ${
            activeSubTab === 'verification'
              ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Proof of Payment Tasks (11.4)</span>
          {pendingVerificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
              {pendingVerificationCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeSubTab === 'reconciliation'
              ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          <span>Bank Statement Reconciliation (11.5)</span>
          {unmatchedStatementCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
              {unmatchedStatementCount} open
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('methods')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeSubTab === 'methods'
              ? 'bg-slate-800 text-amber-300 font-bold border border-amber-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Supported Methods Config (11.2)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUBTAB 1: SECTION 11.1 & 11.3 PAYMENTS REGISTER                */}
      {/* ============================================================== */}
      {activeSubTab === 'register' && (
        <div className="space-y-4">
          
          {/* Filters & Search Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search reference, customer, or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Payment Methods</option>
                <option value="bank_transfer">Bank Transfer / Wire</option>
                <option value="card_payment">Card / Online Gateway</option>
                <option value="instant_payment">Instant Electronic (Faster)</option>
                <option value="direct_debit">Direct Debit (SEPA / BACS)</option>
                <option value="cash">Cash Settlement</option>
              </select>

              <select
                value={filterReconStatus}
                onChange={(e) => setFilterReconStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Reconciliation Statuses</option>
                <option value="reconciled">Reconciled</option>
                <option value="matched">Matched</option>
                <option value="unreconciled">Unreconciled</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 text-slate-400">
              <span>Showing {filteredPayments.length} of {payments.length} records</span>
              <button
                onClick={() => {
                  const headers = 'ID,Date,Debtor,Amount,Currency,Method,Reference,Status,Allocations\n';
                  const rows = filteredPayments
                    .map((p) => `"${p.id}","${p.paymentDate}","${p.debtorName}","${p.amount}","${p.currency}","${p.paymentMethod}","${p.referenceNumber}","${p.reconciliationStatus}","${p.allocations?.map((a) => `${a.invoiceNumber}:${a.allocatedAmount}`).join(';') || ''}"`)
                    .join('\n');
                  const blob = new Blob([headers + rows], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `CNTCollect_Payments_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Complete Payment Table (Section 11.1 Fields) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Payment ID & Ref</th>
                    <th className="px-4 py-3">Customer / Debtor</th>
                    <th className="px-4 py-3">Date & Channel</th>
                    <th className="px-4 py-3 text-right">Settled Amount</th>
                    <th className="px-4 py-3">Invoice Allocations (11.3)</th>
                    <th className="px-4 py-3">Status & Audit</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPayments.map((pay) => {
                    const isReversed = pay.reversalStatus === 'reversed';
                    return (
                      <tr key={pay.id} className={`hover:bg-slate-850/50 transition ${isReversed ? 'opacity-60 bg-rose-950/10' : ''}`}>
                        
                        {/* 11.1 Unique ID, References */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isReversed ? 'text-rose-400' : 'text-emerald-400'}`} />
                            <span className="font-mono">{pay.referenceNumber || pay.transactionReference}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                            <span>ID: {pay.id}</span>
                            {pay.bankReference && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400">Bank: {pay.bankReference}</span>
                              </>
                            )}
                          </div>
                          {isReversed && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              REVERSED: {pay.reversalReason || 'Accounting adjustment'}
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{pay.debtorName}</div>
                          <span className="text-[10px] text-slate-500">
                            Source: {pay.source?.replace(/_/g, ' ') || 'Manual Entry'}
                          </span>
                        </td>

                        {/* Date & Method */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-slate-300 font-medium">{pay.paymentDate}</div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize mt-0.5 inline-block">
                            {pay.paymentMethod?.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Settled Amount */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className={`font-bold mono-num text-sm ${isReversed ? 'line-through text-slate-400' : 'text-emerald-400'}`}>
                            {formatCurrency(pay.amount, pay.currency || currency)}
                          </div>
                          {pay.unallocatedAmount && pay.unallocatedAmount > 0 ? (
                            <div className="text-[10px] text-amber-400 font-mono">
                              Credit: {formatCurrency(pay.unallocatedAmount, pay.currency || currency)}
                            </div>
                          ) : null}
                        </td>

                        {/* Allocations breakdown (Section 11.3) */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {pay.allocations && pay.allocations.length > 0 ? (
                              pay.allocations.map((alloc, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                                >
                                  {alloc.invoiceNumber}: <strong className="text-white">{formatCurrency(alloc.allocatedAmount, pay.currency || currency)}</strong>
                                </span>
                              ))
                            ) : (
                              <span className="text-amber-400 font-mono text-[11px]">
                                Unallocated Payment (Credit Balance)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status & Recorded By */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              pay.reconciliationStatus === 'reconciled'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : pay.reconciliationStatus === 'matched'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {pay.reconciliationStatus || 'unreconciled'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              pay.verificationStatus === 'verified'
                                ? 'text-slate-300 bg-slate-800/80'
                                : 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                            }`}>
                              {pay.verificationStatus || 'verified'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            By: {pay.recordedBy || 'Credit Controller'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {!isReversed ? (
                            <button
                              onClick={() => {
                                setReversalPayment(pay);
                                setReversalReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold transition"
                            >
                              Reverse (11.3)
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Reversed</span>
                          )}
                        </td>

                      </tr>
                    );
                  })}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No payments match the current filter selection.
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
      {/* SUBTAB 2: SECTION 11.4 PROOF OF PAYMENT VERIFICATION TASKS      */}
      {/* ============================================================== */}
      {activeSubTab === 'verification' && (
        <div className="space-y-4">
          
          {/* Statutory Rule Banner */}
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 flex items-start space-x-3 text-cyan-200 text-xs">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block">
                Section 11.4 Accounting Control Architecture: Proof of Payment Processing
              </span>
              <p className="text-cyan-300/90 leading-relaxed text-[11px]">
                Customers can submit payment advice receipts and remittance documents via their secure portal. In accordance with Section 11.4, <strong>a submitted proof of payment creates a verification task and NEVER automatically marks an invoice as paid</strong>. Authorised finance users must review the document and verify against trusted bank clearing records before settlement is allocated.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Pending Verification Queue</span>
              <div className="text-2xl font-bold text-amber-400 mono-num">
                {verificationTasks.filter((t) => t.status === 'pending_review').length}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Requires authorized finance sign-off</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Cleared & Verified</span>
              <div className="text-2xl font-bold text-emerald-400 mono-num">
                {verificationTasks.filter((t) => t.status === 'verified').length}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Allocated to official ledger</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Rejected Remittance Advices</span>
              <div className="text-2xl font-bold text-rose-400 mono-num">
                {verificationTasks.filter((t) => t.status === 'rejected').length}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Documented audit reason</span>
            </div>
          </div>

          {/* Verification Tasks Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Submitted Proof of Payment Task Queue
              </h3>
              <button
                onClick={loadVerificationTasks}
                disabled={isLoadingTasks}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Task ID & Submission</th>
                    <th className="px-4 py-3">Customer / Debtor</th>
                    <th className="px-4 py-3">Target Invoice</th>
                    <th className="px-4 py-3 text-right">Claimed Settlement</th>
                    <th className="px-4 py-3">Supporting Evidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {verificationTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-850/50 transition">
                      
                      {/* ID & Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-white font-mono">{task.id}</div>
                        <span className="text-[10px] text-slate-500 block">
                          Submitted: {task.submittedAt}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{task.debtorName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ref: {task.transactionReference}
                        </span>
                      </td>

                      {/* Target Invoice */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {task.invoiceNumber ? (
                          <span className="font-bold text-cyan-300 font-mono">{task.invoiceNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">Account Balance</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-emerald-400 mono-num">
                        {formatCurrency(task.amount, task.currency)}
                      </td>

                      {/* Document Details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-mono text-[11px] truncate max-w-[140px]">{task.documentName}</span>
                          <span className="text-[10px] text-slate-500">({task.documentSize || '350 KB'})</span>
                        </div>
                        {task.customerNotes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                            "{task.customerNotes}"
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          task.status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : task.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        {task.reviewedBy && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            By {task.reviewedBy}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {task.status === 'pending_review' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setActiveVerifyTask(task);
                                setVerifyBankRef(task.bankReference || 'BARCLAYS-WIRE-VERIFIED');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition shadow-sm flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Verify & Allocate</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveRejectTask(task);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-[11px] transition border border-rose-500/30"
                            >
                              Reject
                            </button>
                          </div>
                        ) : task.status === 'verified' ? (
                          <span className="text-emerald-400 font-medium text-[11px]">
                            Cleared (Ref #{task.matchedPaymentId?.slice(-6)})
                          </span>
                        ) : (
                          <span className="text-rose-400 font-medium text-[11px]">
                            Declined: {task.reviewNotes}
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}

                  {verificationTasks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No customer proof-of-payment tasks in queue.
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
      {/* SUBTAB 3: SECTION 11.5 BANK STATEMENT RECONCILIATION           */}
      {/* ============================================================== */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-4">
          
          {/* Header Action Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">
                Section 11.5 Intelligent Bank Reconciliation Engine
              </h3>
              <p className="text-slate-400 mt-0.5">
                Multi-factor deterministic matching engine using Amount, Currency, Transaction Reference, Date, Customer, and Invoice Identifiers.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowImportStatementModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV Bank Statement (11.5)</span>
              </button>
              <button
                onClick={loadStatementLines}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bank Statement Lines Workbench */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Bank Feed Statement Lines & Automated Suggested Matches
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date & Feed Ref</th>
                    <th className="px-4 py-3">Bank Narrative / Description</th>
                    <th className="px-4 py-3 text-right">Statement Amount</th>
                    <th className="px-4 py-3">Suggested Match & Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Human Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {statementLines.map((line) => {
                    const topMatch = line.suggestedMatches?.[0];
                    return (
                      <tr key={line.id} className="hover:bg-slate-850/50 transition">
                        
                        {/* Date & Ref */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-white">{line.date}</div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {line.reference}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3">
                          <div className="font-mono text-slate-200 text-[11px]">{line.description}</div>
                          <span className="text-[10px] text-slate-500">Stmt: {line.statementId}</span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-white mono-num">
                          {formatCurrency(line.amount, line.currency)}
                        </td>

                        {/* Suggested Matches with Confidence Scores & Reasons (11.5) */}
                        <td className="px-4 py-3">
                          {line.status === 'matched' ? (
                            <div className="text-emerald-400 font-medium flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Reconciled by {line.matchedBy}</span>
                            </div>
                          ) : topMatch ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  topMatch.confidenceScore >= 90
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : topMatch.confidenceScore >= 70
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {topMatch.confidenceScore}% Confidence
                                </span>
                                <span className="font-bold text-white font-mono">{topMatch.reference}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {topMatch.debtorName} • {formatCurrency(topMatch.amount, topMatch.currency)}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {topMatch.matchReasons.map((r, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                    • {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">
                              No confident match found. Requires manual allocation.
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            line.status === 'matched'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : line.status === 'suggested'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {line.status}
                          </span>
                        </td>

                        {/* Human Confirmation Safeguard (Rule 11.5) */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {line.status !== 'matched' ? (
                            <button
                              onClick={() => {
                                setActiveReconLine(line);
                                if (topMatch) {
                                  setReconTargetType(topMatch.targetType);
                                  setReconTargetId(topMatch.targetId);
                                } else {
                                  setReconTargetType('invoice');
                                  setReconTargetId(invoices[0]?.id || '');
                                }
                                setReconNotes('');
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition shadow-sm"
                            >
                              Review & Confirm Match (11.5)
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {line.matchedAt?.split(' ')[0]}
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}

                  {statementLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No bank statement lines uploaded. Import a statement CSV to begin reconciliation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 11.5 Reconciliation Audit History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Reconciliation Decision Audit History (Section 11.5)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Decision ID & Date</th>
                    <th className="px-4 py-2.5">Statement Reference</th>
                    <th className="px-4 py-2.5">Reconciled Target</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5">Matched By</th>
                    <th className="px-4 py-2.5">Decision Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reconciliationHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-slate-300">
                        <div>{rec.id}</div>
                        <span className="text-[10px] text-slate-500">{rec.matchedAt}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-cyan-300">
                        {rec.statementLineRef}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">
                        {rec.invoiceId || rec.paymentId || 'Ledger Allocation'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-400 mono-num">
                        {formatCurrency(rec.amount, rec.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {rec.matchedBy}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 italic">
                        {rec.decisionNotes || 'Human confirmed reconciliation match'}
                      </td>
                    </tr>
                  ))}

                  {reconciliationHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No reconciliation decisions recorded yet.
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
      {/* SUBTAB 4: SECTION 11.2 SUPPORTED PAYMENT METHODS CONFIG        */}
      {/* ============================================================== */}
      {activeSubTab === 'methods' && (
        <div className="space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">
                Section 11.2 Organisation Supported Payment Methods
              </h3>
              <p className="text-slate-400 mt-0.5">
                Configure settlement channels, clearing window latency, and proof-of-payment requirements.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Organisation ID: {organization.id}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-5 rounded-2xl border transition space-y-3 ${
                  method.isEnabled
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-950/60 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm flex items-center space-x-1.5">
                      <span>{method.name}</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {method.code}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleMethod(method)}
                    disabled={isUpdatingMethod}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      method.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {method.isEnabled ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {method.description}
                </p>

                <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Clearing Window</span>
                    <strong className="text-slate-200">{method.clearingDays} business day(s)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Proof of Payment</span>
                    <strong className={method.requiresProofOfPayment ? 'text-cyan-400' : 'text-slate-400'}>
                      {method.requiresProofOfPayment ? 'Required (11.4)' : 'Instant Clearing'}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: RECORD PAYMENT & MULTI-INVOICE ALLOCATION (11.1/11.3) */}
      {/* ============================================================== */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Record Payment & Multi-Invoice Allocation (11.1 & 11.3)</span>
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer / Debtor *</label>
                  <select
                    value={selectedDebtorId}
                    onChange={(e) => {
                      setSelectedDebtorId(e.target.value);
                      setAllocationsMap({});
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {debtors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({formatCurrency(d.totalOutstanding, currency)} open)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Settlement Amount *</label>
                  <div className="flex space-x-2">
                    <select
                      value={paymentCurrency}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-white font-mono"
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="ZAR">ZAR (R)</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold mono-num focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Settlement Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Method (11.2)</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bank_transfer">Bank Wire / Faster Payments</option>
                    <option value="card_payment">Online Card Gateway</option>
                    <option value="instant_payment">Instant Electronic Transfer</option>
                    <option value="direct_debit">SEPA / ACH Direct Debit</option>
                    <option value="cash">Cash Settlement</option>
                    <option value="custom">Organisation Custom Clearing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transaction Ref # *</label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Clearing Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BARCLAYS-CHAPS-00129"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Gateway Ref (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ch_3N928810298"
                    value={gatewayRef}
                    onChange={(e) => setGatewayRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-Invoice Allocation Table (Section 11.3) */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    Allocate Across Open Invoices ({debtorInvoices.length} available)
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleAutoAllocate}
                    disabled={paymentAmount <= 0 || debtorInvoices.length === 0}
                    className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold hover:bg-indigo-600/30 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Allocate (Oldest First FIFO)</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Balance Due</th>
                        <th className="p-2.5 text-right w-36">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {debtorInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="p-2.5 font-bold text-white font-mono">{inv.invoiceNumber}</td>
                          <td className="p-2.5 text-slate-400 font-mono">{inv.dueDate} ({inv.daysOverdue}d)</td>
                          <td className="p-2.5 text-right font-semibold text-white mono-num">
                            {formatCurrency(inv.amountDue, inv.currency)}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              max={inv.amountDue}
                              placeholder="0.00"
                              value={allocationsMap[inv.id] || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAllocationsMap((prev) => ({
                                  ...prev,
                                  [inv.id]: val,
                                }));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-right font-mono text-white focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                        </tr>
                      ))}

                      {debtorInvoices.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            This debtor currently has no open invoices. Payment will be held as unallocated credit balance.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section 11.3 Deterministic Balance & Unallocated Credit Safeguard */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Total Allocated: </span>
                    <strong className="text-white mono-num">{formatCurrency(totalAllocated, paymentCurrency)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Residual Unallocated: </span>
                    <strong className={unallocatedDifference > 0 ? 'text-amber-400 mono-num' : 'text-emerald-400 mono-num'}>
                      {formatCurrency(unallocatedDifference, paymentCurrency)}
                    </strong>
                    {unallocatedDifference > 0 && (
                      <span className="text-[10px] text-amber-300 ml-1.5 font-mono">
                        (Customer Credit Balance)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Remittance Audit Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via client remittance advice ref #99812"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Execute Payment Allocation (11.3)</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VERIFY PROOF OF PAYMENT (SECTION 11.4)                */}
      {/* ============================================================== */}
      {activeVerifyTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Verify Proof of Payment & Clear Ledger</span>
              </h3>
              <button onClick={() => setActiveVerifyTask(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmVerification} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <strong className="text-white">{activeVerifyTask.debtorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Claimed Amount:</span>
                  <strong className="text-emerald-400 font-mono">
                    {formatCurrency(activeVerifyTask.amount, activeVerifyTask.currency)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Invoice:</span>
                  <span className="text-cyan-300 font-mono">{activeVerifyTask.invoiceNumber || 'Account Balance'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted Proof File:</span>
                  <span className="text-slate-200 font-mono">{activeVerifyTask.documentName}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Bank Clearing Reference * (Matched from Bank Statement Feed)
                </label>
                <input
                  type="text"
                  required
                  value={verifyBankRef}
                  onChange={(e) => setVerifyBankRef(e.target.value)}
                  placeholder="e.g. BARCLAYS-TX-992140"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Authorised Sign-off Memo</label>
                <input
                  type="text"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Confirmed receipt on clearing statement."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveVerifyTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isVerifying ? 'Recording...' : 'Authorize & Clear Invoice'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REJECT PROOF OF PAYMENT (SECTION 11.4)                */}
      {/* ============================================================== */}
      {activeRejectTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Reject Proof of Payment</span>
              </h3>
              <button onClick={() => setActiveRejectTask(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-3 text-xs">
              <p className="text-slate-300">
                Rejecting this proof of payment keeps the target invoice active in dunning and records an audit log.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Documented Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Funds not cleared into Barclays clearing account after 72hr clearing window..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveRejectTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CONFIRM RECONCILIATION MATCH (SECTION 11.5)           */}
      {/* ============================================================== */}
      {activeReconLine && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-indigo-400" />
                <span>Confirm Bank Reconciliation Match (11.5)</span>
              </h3>
              <button onClick={() => setActiveReconLine(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReconciliation} className="space-y-3 text-xs">
              
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Statement Line:</span>
                  <strong className="text-white font-mono">{activeReconLine.reference}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount & Currency:</span>
                  <strong className="text-emerald-400 mono-num">
                    {formatCurrency(activeReconLine.amount, activeReconLine.currency)}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-300 font-mono truncate">
                  {activeReconLine.description}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-medium">Reconcile Target Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReconTargetType('invoice')}
                    className={`p-2 rounded-lg text-center font-semibold border ${
                      reconTargetType === 'invoice'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Match Open Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconTargetType('payment')}
                    className={`p-2 rounded-lg text-center font-semibold border ${
                      reconTargetType === 'payment'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Match Recorded Payment
                  </button>
                </div>
              </div>

              {reconTargetType === 'invoice' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice</label>
                  <select
                    value={reconTargetId}
                    onChange={(e) => setReconTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {invoices
                      .filter((i) => i.amountDue > 0)
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.debtorName} ({formatCurrency(inv.amountDue, inv.currency)} due)
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Payment Record</label>
                  <select
                    value={reconTargetId}
                    onChange={(e) => setReconTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {payments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.referenceNumber} — {p.debtorName} ({formatCurrency(p.amount, p.currency)}) [{p.paymentDate}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reconciliation Sign-off Memo</label>
                <input
                  type="text"
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                  placeholder="Verified against Barclays electronic statement line."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveReconLine(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReconciling || !reconTargetId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isReconciling ? 'Confirming...' : 'Confirm Reconciliation Decision'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: PAYMENT REVERSAL (SECTION 11.3 & 10.5)                */}
      {/* ============================================================== */}
      {reversalPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span>Execute Traceable Payment Reversal (11.3 & 10.5)</span>
              </h3>
              <button onClick={() => setReversalPayment(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Reference:</span>
                  <strong className="text-white font-mono">{reversalPayment.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Debtor:</span>
                  <strong className="text-slate-200">{reversalPayment.debtorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount to Restore:</span>
                  <strong className="text-rose-400 font-mono">
                    {formatCurrency(reversalPayment.amount, reversalPayment.currency)}
                  </strong>
                </div>
                <div className="text-[10px] text-amber-300 pt-1">
                  • Restoration rule: Invoices will have their open balances restored deterministically.
                  • Historical records will not be deleted or overwritten (Rule 10.5 & 11.3).
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Justification Reason * (Dishonoured Cheque, Chargeback, Banking Correction)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the exact banking reason for reversal..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Authorised Officer</label>
                <input
                  type="text"
                  value={reversalAuthorizedBy}
                  onChange={(e) => setReversalAuthorizedBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversalPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing || !reversalReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
                >
                  {isReversing ? 'Reversing...' : 'Execute Reversal Transaction'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: IMPORT CSV BANK STATEMENT LINES (SECTION 11.5)        */}
      {/* ============================================================== */}
      {showImportStatementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span>Import CSV Bank Statement (Section 11.5)</span>
              </h3>
              <button onClick={() => setShowImportStatementModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Paste CSV statement lines or upload an electronic export from Barclays, HSBC, Stripe, or corporate banking feeds.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">CSV Data Input</label>
                <textarea
                  rows={6}
                  value={rawStatementCsv}
                  onChange={(e) => setRawStatementCsv(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportStatementModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const lines = rawStatementCsv
                      .trim()
                      .split('\n')
                      .slice(1)
                      .map((l) => {
                        const parts = l.split(',');
                        return {
                          date: parts[0]?.trim(),
                          description: parts[1]?.trim(),
                          reference: parts[2]?.trim(),
                          amount: Number(parts[3]?.trim()) || 0,
                          currency: parts[4]?.trim() || 'GBP',
                        };
                      })
                      .filter((l) => l.amount > 0);

                    try {
                      const res = await fetch('/api/payments/statement-lines/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          organizationId: organization.id,
                          lines,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setShowImportStatementModal(false);
                        loadStatementLines();
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Parse & Ingest Statement
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
