import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Clock, 
  Calendar, 
  DollarSign, 
  Layers, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  Settings, 
  ArrowRight, 
  FileText, 
  Check, 
  History, 
  Plus, 
  RotateCcw, 
  Info, 
  Sliders, 
  TrendingUp, 
  Download,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react';
import { 
  Organization, 
  Invoice, 
  Payment, 
  CreditNote, 
  FinancialAdjustment, 
  PaymentReversal,
  CustomAgeingConfig 
} from '../types';
import { 
  toMinorUnits, 
  fromMinorUnits, 
  calculateDeterministicInvoiceBalance, 
  calculateDaysOverdue,
  DEFAULT_AGEING_BUCKETS,
  DEFAULT_EXCHANGE_RATES,
  ExchangeRate,
  AgeingBucketDefinition,
  calculateReceivablesAgeingReport,
  buildConsolidatedManagementReport
} from '../services/arEngine';
import { formatCurrency } from '../services/calculations';

interface ArEngineViewProps {
  organization: Organization;
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  onRefreshData?: () => void;
  onOpenInvoiceDetail?: (invoice: Invoice) => void;
}

export const ArEngineView: React.FC<ArEngineViewProps> = ({
  organization,
  invoices,
  payments,
  creditNotes,
  onRefreshData,
  onOpenInvoiceDetail,
}) => {
  // Navigation tabs within AR Engine
  const [activeTab, setActiveTab] = useState<'ageing' | 'multi_currency' | 'calculator' | 'reversals_adjustments'>('ageing');

  // 10.2 & 10.3 Historical Reporting Date & Timezone
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeZone, setTimeZone] = useState<string>(organization.timeZone || 'Europe/London');
  const [reportingBasis, setReportingBasis] = useState<'due_date' | 'payment_date'>('due_date');

  // 10.3 Custom Ageing Buckets
  const [activeBuckets, setActiveBuckets] = useState<AgeingBucketDefinition[]>(DEFAULT_AGEING_BUCKETS);
  const [showBucketConfigModal, setShowBucketConfigModal] = useState<boolean>(false);
  const [savedAgeingConfigs, setSavedAgeingConfigs] = useState<CustomAgeingConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('default');

  // 10.4 Multi-Currency & Consolidation
  const [reportingCurrency, setReportingCurrency] = useState<string>(organization.defaultCurrency || 'GBP');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(DEFAULT_EXCHANGE_RATES);
  const [showEditRatesModal, setShowEditRatesModal] = useState<boolean>(false);
  const [selectedRateForEdit, setSelectedRateForEdit] = useState<ExchangeRate | null>(null);

  // 10.1 Calculator Inspector
  const [selectedInvoiceForCalc, setSelectedInvoiceForCalc] = useState<Invoice | null>(invoices[0] || null);
  const [allowCreditBalance, setAllowCreditBalance] = useState<boolean>(false);

  // 10.5 Traceable Adjustments & Payment Reversals
  const [adjustments, setAdjustments] = useState<FinancialAdjustment[]>([]);
  const [reversals, setReversals] = useState<PaymentReversal[]>([]);
  const [showNewAdjustmentModal, setShowNewAdjustmentModal] = useState<boolean>(false);
  const [showReversePaymentModal, setShowReversePaymentModal] = useState<Payment | null>(null);

  // Form states
  const [adjInvoiceId, setAdjInvoiceId] = useState<string>('');
  const [adjType, setAdjType] = useState<string>('commercial_discount');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [reversalReason, setReversalReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  useEffect(() => {
    loadLedgerExtras();
  }, [organization.id]);

  const loadLedgerExtras = async () => {
    try {
      const [rateRes, cfgRes, histRes] = await Promise.all([
        fetch('/api/ar/exchange-rates'),
        fetch(`/api/ar/ageing-configs?orgId=${organization.id}`),
        fetch(`/api/debtors/${invoices[0]?.debtorId || 'deb-1'}/profile`),
      ]);
      const rateData = await rateRes.json();
      const cfgData = await cfgRes.json();

      if (rateData.success && rateData.data) setExchangeRates(rateData.data);
      if (cfgData.success && cfgData.data) {
        setSavedAgeingConfigs(cfgData.data);
      }
    } catch (err) {
      console.error('Failed to load AR engine extras:', err);
    }
  };

  // 10.3 Run Historical Ageing Calculation Report
  const ageingReport = calculateReceivablesAgeingReport({
    invoices,
    payments,
    creditNotes,
    asOfDate,
    timeZone,
    buckets: activeBuckets,
  });

  // 10.4 Run Consolidated Multi-Currency Management Report
  const consolidatedReport = buildConsolidatedManagementReport(
    ageingReport.byCurrency,
    reportingCurrency,
    exchangeRates,
    asOfDate
  );

  // 10.1 Deterministic Calculator result for selected invoice
  const calcResult = selectedInvoiceForCalc
    ? calculateDeterministicInvoiceBalance({
        originalAmount: selectedInvoiceForCalc.originalAmount || selectedInvoiceForCalc.totalAmount,
        debitAdjustments: 0,
        creditNotes: 0,
        allocatedPayments: selectedInvoiceForCalc.amountPaid || 0,
        writeOffs: selectedInvoiceForCalc.status === 'written_off' ? selectedInvoiceForCalc.amountDue : 0,
        allowCreditBalance,
      })
    : null;

  // 10.2 Days overdue inspection for selected invoice
  const overdueResult = selectedInvoiceForCalc
    ? calculateDaysOverdue(selectedInvoiceForCalc.dueDate, asOfDate, timeZone)
    : null;

  // Handle Adjustment Submit
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjInvoiceId || !adjAmount || Number(adjAmount) <= 0 || !adjReason.trim()) {
      alert('Please fill out all required adjustment fields.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/ar/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: adjInvoiceId,
          type: adjType,
          amount: Number(adjAmount),
          reason: adjReason.trim(),
          authorizedBy: 'Sarah Miller (Authorised Credit Controller)',
          effectiveDate: asOfDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Successfully recorded ${adjType} of ${data.data.currency} ${data.data.amount} on invoice ${data.data.invoiceNumber}.`);
        setShowNewAdjustmentModal(false);
        setAdjAmount('');
        setAdjReason('');
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to record adjustment');
      }
    } catch (err) {
      console.error('Adjustment submission error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Payment Reversal Submit (Section 10.5)
  const handleExecuteReversal = async () => {
    if (!showReversePaymentModal || !reversalReason.trim()) {
      alert('A valid justification reason is required to execute a payment reversal.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/ar/payments/${showReversePaymentModal.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reversalReason.trim(),
          authorizedBy: 'David Chen (Finance Manager)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Payment ${showReversePaymentModal.referenceNumber} successfully reversed with full audit traceability.`);
        setShowReversePaymentModal(null);
        setReversalReason('');
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || 'Failed to reverse payment');
      }
    } catch (err) {
      console.error('Payment reversal error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Accounts Receivable Engine & Ageing Workbench
            </h1>
            <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Section 10 Protocol
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic integer minor-unit arithmetic, configurable ageing buckets, multi-currency segregation, and traceable financial reversals
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBucketConfigModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700/80 transition flex items-center space-x-1.5"
            title="Configure Ageing Buckets (Section 10.3)"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ageing Buckets Config</span>
          </button>

          <button
            onClick={() => setShowNewAdjustmentModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Financial Adjustment</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs font-medium">
        {[
          { id: 'ageing', label: 'Receivables Ageing (Section 10.3)', icon: Clock },
          { id: 'multi_currency', label: 'Multi-Currency & Consolidation (Section 10.4)', icon: DollarSign },
          { id: 'calculator', label: 'Deterministic Balance Inspector (Section 10.1 & 10.2)', icon: Calculator },
          { id: 'reversals_adjustments', label: 'Accounting Consistency & Reversals (Section 10.5)', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg transition flex items-center space-x-2 ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: RECEIVABLES AGEING (Section 10.3) */}
      {activeTab === 'ageing' && (
        <div className="space-y-6">
          {/* As-Of Date & Timezone Controller */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-300">As-Of Reporting Date:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-300">Timezone Rule:</span>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-300">Basis:</span>
                <div className="flex rounded-lg border border-slate-800 p-0.5 bg-slate-950">
                  <button
                    onClick={() => setReportingBasis('due_date')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      reportingBasis === 'due_date' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Due Date
                  </button>
                  <button
                    onClick={() => setReportingBasis('payment_date')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                      reportingBasis === 'payment_date' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Payment Date
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Calculation: Transactional Historical Ledger Snapshot
            </div>
          </div>

          {/* Currency Breakdowns (Strictly Separated by Currency - Section 10.4) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Receivables Ageing By Currency (Section 10.4 Mandate)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Currencies are strictly isolated into independent statutory totals
              </span>
            </div>

            {Object.keys(ageingReport.byCurrency).length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                No open receivables found as of {asOfDate}.
              </div>
            ) : (
              Object.values(ageingReport.byCurrency).map((curSummary) => {
                return (
                  <div key={curSummary.currency} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {/* Currency Header */}
                    <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                          {curSummary.currency}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-white">{curSummary.currency} Receivables Portfolio</span>
                          <span className="text-xs text-slate-400 ml-2">({curSummary.invoiceCount} open invoices as of {asOfDate})</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Total Open Receivables</div>
                        <div className="text-base font-bold text-white font-mono">
                          {formatCurrency(curSummary.totalOutstanding, curSummary.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Ageing Buckets Cards */}
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {activeBuckets.map((b) => {
                        const bucketData = curSummary.bucketTotals[b.id] || { amount: 0, count: 0 };
                        const isSevere = b.id === 'days_61_90' || b.id === 'days_90_plus' || b.minDays > 45;

                        return (
                          <div
                            key={b.id}
                            className={`p-3 rounded-xl border flex flex-col justify-between ${
                              isSevere && bucketData.amount > 0
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                                : bucketData.amount > 0
                                ? 'bg-slate-950 border-slate-800 text-slate-200'
                                : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                            }`}
                          >
                            <div>
                              <div className="text-[10px] font-semibold uppercase truncate" title={b.label}>
                                {b.label}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {bucketData.count} invoice(s)
                              </div>
                            </div>

                            <div className="text-sm font-bold font-mono mt-2 text-white">
                              {formatCurrency(bucketData.amount, curSummary.currency)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Invoice Ageing Ledger Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              As-Of Invoice Ledger Detail ({ageingReport.invoiceItems.length} records)
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Debtor</th>
                    <th className="py-2.5 px-4">Issue Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Days Overdue (As-Of)</th>
                    <th className="py-2.5 px-4">Ageing Bucket</th>
                    <th className="py-2.5 px-4 text-right">Balance As-Of {asOfDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {ageingReport.invoiceItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-4 font-mono font-semibold text-indigo-300">
                        {item.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-4 text-white font-medium">
                        {item.debtorName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">
                        {item.issueDate}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">
                        {item.dueDate}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {item.daysOverdueAsOf > 0 ? (
                          <span className="text-rose-400 font-bold">{item.daysOverdueAsOf} days</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">0 days (Current)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.bucketLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(item.historicalBalance, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-CURRENCY CONSOLIDATION (Section 10.4) */}
      {activeTab === 'multi_currency' && (
        <div className="space-y-6">
          {/* Statutory Separation vs Management Conversion Notice (Section 10.4) */}
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 flex items-start space-x-3.5 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-300">
                Official Accounting Records vs Management Consolidation (Section 10.4)
              </h4>
              <p className="text-slate-300">
                Official statutory accounting records must remain un-converted in each original currency (GBP, EUR, USD, ZAR).
                The consolidated summary below uses explicit exchange rates for executive managerial analysis only.
              </p>
            </div>
          </div>

          {/* Consolidation Configuration Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <label className="text-slate-400 font-medium">Reporting Currency:</label>
              <select
                value={reportingCurrency}
                onChange={(e) => setReportingCurrency(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="ZAR">ZAR (R) — South African Rand</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-slate-400">Total Converted Management Portfolio:</span>
              <span className="text-base font-bold text-indigo-300 font-mono">
                {formatCurrency(consolidatedReport.totalConvertedAmount, reportingCurrency)}
              </span>
            </div>
          </div>

          {/* Converted Management Lines Table (Section 10.4) */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Original Currency</th>
                  <th className="py-3 px-4 text-right">Original Ledger Amount</th>
                  <th className="py-3 px-4">Reporting Currency</th>
                  <th className="py-3 px-4 text-center">Exchange Rate</th>
                  <th className="py-3 px-4">Rate Date</th>
                  <th className="py-3 px-4">Conversion Source</th>
                  <th className="py-3 px-4 text-right">Converted Management Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {consolidatedReport.lines.map((line) => (
                  <tr key={line.originalCurrency} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      {line.originalCurrency}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
                      {formatCurrency(line.originalAmount, line.originalCurrency)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-300">
                      {line.reportingCurrency}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                      {line.exchangeRate.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {line.exchangeRateDate}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                        {line.conversionSource}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(line.convertedAmount, line.reportingCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Exchange Rates Directory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Configured Exchange Rates & Sources Directory
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {exchangeRates.map((rate, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{rate.fromCurrency} → {rate.toCurrency}</span>
                    <span className="font-mono text-indigo-400">{rate.rate.toFixed(4)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate" title={rate.conversionSource}>
                    Source: {rate.conversionSource}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    As-Of: {rate.rateDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETERMINISTIC AR CALCULATOR INSPECTOR (Section 10.1 & 10.2) */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span>Deterministic Minor-Unit Arithmetic Inspector (Section 10.1)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero binary floating-point error guarantee: all financial additions, subtractions, discounts, and payments are computed in integer minor currency units (cents/pence).
              </p>
            </div>

            {/* Select Invoice to Inspect */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select Invoice Record:
                </label>
                <select
                  value={selectedInvoiceForCalc?.id || ''}
                  onChange={(e) => {
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setSelectedInvoiceForCalc(inv);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.debtorName} ({inv.currency} {inv.totalAmount}) [Due: {inv.dueDate}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Credit-Balance Workflow Setting:
                </label>
                <label className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCreditBalance}
                    onChange={(e) => setAllowCreditBalance(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Permit negative balance (Explicit credit-balance workflow)</span>
                </label>
              </div>
            </div>

            {/* Calculation Breakdown Cards */}
            {calcResult && selectedInvoiceForCalc && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Original Invoice Amount:</span>
                    <div className="font-mono text-base font-bold text-white mt-1">
                      {formatCurrency(calcResult.originalAmount, selectedInvoiceForCalc.currency)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {calcResult.originalAmountMinor} minor units
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Allocated Payments:</span>
                    <div className="font-mono text-base font-bold text-emerald-400 mt-1">
                      - {formatCurrency(calcResult.allocatedPayments, selectedInvoiceForCalc.currency)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {calcResult.allocatedPaymentsMinor} minor units
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-medium">Adjustments & Credits:</span>
                    <div className="font-mono text-base font-bold text-amber-400 mt-1">
                      {formatCurrency(calcResult.debitAdjustments - calcResult.creditNotes, selectedInvoiceForCalc.currency)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {calcResult.debitAdjustmentsMinor - calcResult.creditNotesMinor} minor units
                    </span>
                  </div>

                  <div className="bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-500/30">
                    <span className="text-indigo-300 font-medium">Outstanding Balance:</span>
                    <div className="font-mono text-lg font-bold text-white mt-1">
                      {formatCurrency(calcResult.outstandingBalance, selectedInvoiceForCalc.currency)}
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {calcResult.outstandingBalanceMinor} minor units
                    </span>
                  </div>
                </div>

                {/* 10.2 Days Overdue & Timezone Box */}
                {overdueResult && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Days Overdue Deterministic Evaluation (Section 10.2):</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                        overdueResult.isOverdue
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {overdueResult.daysOverdue} Days Overdue
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      Basis: {overdueResult.calculationBasis}
                    </p>
                  </div>
                )}

                {/* Step-by-Step Integer Minor Unit Trace Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Deterministic Minor-Unit Execution Trace:
                  </h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                    {calcResult.calculationTrace.map((line, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-indigo-400 font-bold">[{idx + 1}]</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNTING CONSISTENCY, ADJUSTMENTS & REVERSALS (Section 10.5) */}
      {activeTab === 'reversals_adjustments' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Accounting Consistency & Traceable Payment Reversals (Section 10.5)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Never overwrite historical payment records to conceal a correction. When a payment is disputed, bounced, or dishonoured, execute an accounting reversal transaction that restores invoice balances while preserving full audit history.
            </p>
          </div>

          {/* Payments Table with Reversal Action */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Settlement Payment Records & Reversal Controls
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Payment Ref</th>
                    <th className="py-2.5 px-4">Debtor</th>
                    <th className="py-2.5 px-4">Payment Date</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Accounting Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {payments.map((p) => {
                    const isReversed = (p as any).reversalStatus === 'reversed';

                    return (
                      <tr key={p.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-300">
                          {p.referenceNumber}
                        </td>
                        <td className="py-2.5 px-4 text-white font-medium">
                          {p.debtorName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono">
                          {p.paymentDate}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 uppercase text-[11px]">
                          {p.paymentMethod.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          {isReversed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Reversed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Active Settlement
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {isReversed ? (
                            <span className="text-[11px] text-slate-500 italic">
                              Reversed on {(p as any).reversedAt?.split('T')[0] || 'Historical'}
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowReversePaymentModal(p)}
                              className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition text-[11px] font-semibold"
                            >
                              Execute Reversal
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Financial Adjustment Modal (Section 10.1 & 10.5) */}
      {showNewAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Record Financial Ledger Adjustment (Section 10.1)</span>
              </h3>
              <button
                onClick={() => setShowNewAdjustmentModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Invoice:</label>
                <select
                  value={adjInvoiceId}
                  onChange={(e) => setAdjInvoiceId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Select Invoice —</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.debtorName} (Outstanding: {inv.currency} {inv.amountDue})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Adjustment Type:</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="commercial_discount">Commercial Settlement Discount (-)</option>
                  <option value="debit_adjustment">Debit Adjustment / Surcharge (+)</option>
                  <option value="credit_adjustment">Credit Note Adjustment (-)</option>
                  <option value="tax_adjustment">Tax / VAT Recalibration Adjustment</option>
                  <option value="bad_debt_write_off">Authorized Bad Debt Write-Off (-)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Audit Justification & Reason:</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Document the formal justification for this financial ledger modification..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAdjustmentModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Payment Modal (Section 10.5) */}
      {showReversePaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Execute Payment Accounting Reversal</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are reversing payment <strong className="text-white">{showReversePaymentModal.referenceNumber}</strong> of{' '}
              <strong className="text-white">{showReversePaymentModal.currency} {showReversePaymentModal.amount}</strong> from{' '}
              <strong className="text-white">{showReversePaymentModal.debtorName}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div>• Target invoice balances will be restored to their previous outstanding amount.</div>
              <div>• Historical payment record is preserved and marked as reversed (never deleted).</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Reversal Justification Reason (Required):
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. BACS Direct Debit indemnity clawback, cheque dishonoured by payer bank..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowReversePaymentModal(null)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReversal}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition shadow-sm"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ageing Buckets Configuration Modal (Section 10.3) */}
      {showBucketConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Configure Receivables Ageing Buckets (Section 10.3)</span>
              </h3>
              <button
                onClick={() => setShowBucketConfigModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Authorised users can choose between standard statutory brackets or custom cadence intervals.
            </p>

            <div className="space-y-3">
              <div
                onClick={() => {
                  setActiveBuckets(DEFAULT_AGEING_BUCKETS);
                  setSelectedConfigId('default');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedConfigId === 'default'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Standard Statutory Ageing (Default)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Not Yet Due • 1–30 Days • 31–60 Days • 61–90 Days • More Than 90 Days Overdue
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveBuckets([
                    { id: 'not_due', label: 'Current / Not Due', minDays: -99999, maxDays: 0 },
                    { id: 'days_1_15', label: '1–15 Days Overdue', minDays: 1, maxDays: 15 },
                    { id: 'days_16_30', label: '16–30 Days Overdue', minDays: 16, maxDays: 30 },
                    { id: 'days_31_45', label: '31–45 Days Overdue', minDays: 31, maxDays: 45 },
                    { id: 'days_46_60', label: '46–60 Days Overdue', minDays: 46, maxDays: 60 },
                    { id: 'days_60_plus', label: 'More Than 60 Days Overdue', minDays: 61, maxDays: 99999 },
                  ]);
                  setSelectedConfigId('aggressive_15');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedConfigId === 'aggressive_15'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Aggressive 15-Day Cadence Ageing</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Current • 1–15 Days • 16–30 Days • 31–45 Days • 46–60 Days • More Than 60 Days Overdue
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowBucketConfigModal(false)}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Save & Apply Bucket Ranges
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
