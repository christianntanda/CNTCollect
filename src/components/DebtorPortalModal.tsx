import React, { useState } from 'react';
import { 
  Building, 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  X, 
  Check, 
  FileText 
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Debtor, Organization, Invoice, DisputeReason } from '../types';
import { formatCurrency } from '../services/calculations';

interface DebtorPortalModalProps {
  debtor: Debtor;
  organization: Organization;
  invoices: Invoice[];
  onClose: () => void;
  onSimulatePortalPayment: (invoice: Invoice, paymentMethod: string) => void;
  onProposePaymentPlan: (debtorId: string, invoiceId: string, amount: number, date: string, notes: string) => void;
  onLodgePortalDispute: (invoiceId: string, reason: DisputeReason, amount: number, statement: string) => void;
}

export const DebtorPortalModal: React.FC<DebtorPortalModalProps> = ({
  debtor,
  organization,
  invoices,
  onClose,
  onSimulatePortalPayment,
  onProposePaymentPlan,
  onLodgePortalDispute,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  const debtorInvoices = invoices.filter((i) => i.debtorId === debtor.id && i.status !== 'written_off');
  const openInvoices = debtorInvoices.filter((i) => i.amountDue > 0 && i.status !== 'paid');

  const [activeTab, setActiveTab] = useState<'invoices' | 'pay' | 'plan' | 'dispute' | 'proof_of_payment'>('invoices');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(openInvoices[0]?.id || '');
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Propose Plan form
  const [planAmount, setPlanAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [planDate, setPlanDate] = useState<string>(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [planNotes, setPlanNotes] = useState<string>('');

  // Lodge Dispute form
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('pricing_discrepancy');
  const [disputeAmount, setDisputeAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [disputeStatement, setDisputeStatement] = useState<string>('');

  // Section 11.4 Proof of Payment Form State
  const [popAmount, setPopAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [popDate, setPopDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [popMethod, setPopMethod] = useState<string>('bank_transfer');
  const [popRef, setPopRef] = useState<string>(`WIRE-REF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [popBankRef, setPopBankRef] = useState<string>('');
  const [popDocName, setPopDocName] = useState<string>('Bank_Remittance_Advice.pdf');
  const [popNotes, setPopNotes] = useState<string>('');
  const [isSubmittingPop, setIsSubmittingPop] = useState(false);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || openInvoices[0];

  const handleProofOfPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPop(true);
    try {
      const res = await fetch('/api/payments/verification-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          debtorId: debtor.id,
          invoiceId: selectedInvoice?.id,
          amount: Number(popAmount),
          currency: selectedInvoice?.currency || currency,
          paymentDate: popDate,
          paymentMethod: popMethod,
          transactionReference: popRef,
          bankReference: popBankRef,
          documentName: popDocName,
          documentSize: '450 KB',
          customerNotes: popNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(`Proof of payment queued! Verification task #${data.data.id} created for finance team review. Invoice remains active until bank verification completes.`);
        setActiveTab('invoices');
      } else {
        alert(data.error || 'Failed to submit proof of payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting proof of payment');
    } finally {
      setIsSubmittingPop(false);
      setTimeout(() => setPaymentSuccess(null), 8000);
    }
  };

  const handlePayNow = () => {
    if (!selectedInvoice) return;
    onSimulatePortalPayment(selectedInvoice, 'stripe');
    setPaymentSuccess(`Payment of ${formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)} confirmed for Invoice ${selectedInvoice.invoiceNumber}. Receipt generated.`);
    setTimeout(() => setPaymentSuccess(null), 6000);
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    onProposePaymentPlan(debtor.id, selectedInvoice.id, Number(planAmount), planDate, planNotes);
    setPaymentSuccess(`Payment plan proposal of ${formatCurrency(planAmount, currency)} on ${planDate} transmitted to credit team.`);
    setActiveTab('invoices');
    setTimeout(() => setPaymentSuccess(null), 6000);
  };

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    onLodgePortalDispute(selectedInvoice.id, disputeReason, Number(disputeAmount), disputeStatement);
    setPaymentSuccess(`Dispute successfully lodged for ${selectedInvoice.invoiceNumber}. Dunning paused pending credit review.`);
    setActiveTab('invoices');
    setTimeout(() => setPaymentSuccess(null), 6000);
  };

  const totalOutstanding = openInvoices.reduce((sum, i) => sum + i.amountDue, 0);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto text-slate-100">
        
        {/* Top Header: Portal Authentication Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Customer Self-Service Payment Portal
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Token: {debtor.paymentPortalToken}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Viewing as client account: <strong className="text-white">{debtor.name}</strong> • Creditor: <strong className="text-white">{organization.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{paymentSuccess}</span>
          </div>
        )}

        {/* Account Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Total Account Balance Due</span>
            <div className="text-2xl font-bold text-white mono-num">
              {formatCurrency(totalOutstanding, currency)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Across {openInvoices.length} open invoices
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Creditor Wire Instructions</span>
            <div className="text-xs text-slate-200 font-mono">
              IBAN: {organization.bankDetails.iban}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bank: {organization.bankDetails.bankName}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 block mb-1">Settlement Options</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('pay')}
                className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 flex items-center justify-center space-x-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Now</span>
              </button>
              <button
                onClick={() => setActiveTab('plan')}
                className="w-full py-1.5 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700 flex items-center justify-center space-x-1 border border-slate-700"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Propose Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'invoices' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Statement & Invoices ({openInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('pay')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pay' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Instant Online Payment
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'plan' ? 'bg-slate-800 text-indigo-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Propose Payment Plan (PTP)
          </button>
          <button
            onClick={() => setActiveTab('dispute')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'dispute' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Lodge Dispute / Query
          </button>
          <button
            onClick={() => setActiveTab('proof_of_payment')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'proof_of_payment' ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/50' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Proof of Payment (11.4)</span>
          </button>
        </div>

        {/* Tab 1: Invoices Statement */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Original</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {openInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-bold text-white font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3 text-slate-400">{inv.issueDate}</td>
                      <td className="p-3 text-slate-300 font-mono">{inv.dueDate}</td>
                      <td className="p-3">
                        {inv.daysOverdue > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {inv.daysOverdue}d overdue
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right mono-num text-slate-400">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                      <td className="p-3 text-right mono-num font-bold text-white">{formatCurrency(inv.amountDue, inv.currency)}</td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setActiveTab('pay');
                          }}
                          className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-500"
                        >
                          Pay
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setDisputeAmount(inv.amountDue);
                            setActiveTab('dispute');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 text-amber-300 font-semibold text-[11px] hover:bg-slate-700 border border-slate-700"
                        >
                          Dispute
                        </button>
                      </td>
                    </tr>
                  ))}

                  {openInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        No outstanding invoices on this debtor account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Instant Payment Simulation */}
        {activeTab === 'pay' && (
          <div className="space-y-4 max-w-xl mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Simulate Online Payment Settlement</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Select Invoice to Settle</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
              >
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — Due: {formatCurrency(i.amountDue, i.currency)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Invoice Amount:</span>
                  <span className="mono-num text-white font-semibold">{formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Processing Rails:</span>
                  <span className="text-emerald-400">Stripe / Faster Payments Rail</span>
                </div>
              </div>
            )}

            <button
              onClick={handlePayNow}
              disabled={!selectedInvoice}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30"
            >
              <CreditCard className="w-4 h-4" />
              <span>Authorize & Settle Payment ({selectedInvoice ? formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency) : ''})</span>
            </button>
          </div>
        )}

        {/* Tab 3: Propose Plan */}
        {activeTab === 'plan' && (
          <form onSubmit={handlePlanSubmit} className="space-y-3 max-w-xl mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Propose Payment Installment or Deferred Date</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = invoices.find(i => i.id === e.target.value);
                  if (inv) setPlanAmount(inv.amountDue);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              >
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — {formatCurrency(i.amountDue, i.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Promised Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={planAmount}
                  onChange={(e) => setPlanAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white mono-num"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Commitment Date</label>
                <input
                  type="date"
                  required
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Proposal Explanation / Reason</label>
              <textarea
                rows={3}
                placeholder="Detail reason for extension request..."
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500"
            >
              Submit Payment Proposal to Credit Manager
            </button>
          </form>
        )}

        {/* Tab 4: Lodge Dispute */}
        {activeTab === 'dispute' && (
          <form onSubmit={handleDisputeSubmit} className="space-y-3 max-w-xl mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Submit Billing Query or Dispute</span>
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = invoices.find(i => i.id === e.target.value);
                  if (inv) setDisputeAmount(inv.amountDue);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              >
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — {formatCurrency(i.amountDue, i.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Dispute Category (Section 15.1) *</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="incorrect_invoice_amount">Incorrect Invoice Amount</option>
                  <option value="duplicate_invoice">Duplicate Invoice</option>
                  <option value="goods_services_not_received">Goods or Services Not Received</option>
                  <option value="incorrect_customer">Incorrect Customer</option>
                  <option value="missing_purchase_order">Missing Purchase Order</option>
                  <option value="incorrect_tax_treatment">Incorrect Tax Treatment</option>
                  <option value="payment_already_made">Payment Already Made</option>
                  <option value="credit_note_requested">Credit Note Requested</option>
                  <option value="contractual_disagreement">Contractual Disagreement</option>
                  <option value="service_complaint">Service Complaint</option>
                  <option value="other">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Disputed Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Explanation of Discrepancy</label>
              <textarea
                rows={3}
                required
                placeholder="State clearly why this invoice cannot be approved for payment..."
                value={disputeStatement}
                onChange={(e) => setDisputeStatement(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-500"
            >
              Submit Query & Request Dunning Pause
            </button>
          </form>
        )}

        {/* Tab 5: Section 11.4 Proof of Payment Submission (Creates Verification Task, Does NOT Auto-Pay) */}
        {activeTab === 'proof_of_payment' && (
          <form onSubmit={handleProofOfPaymentSubmit} className="space-y-4 text-xs">
            {/* Section 11.4 Warning & Compliance Notice */}
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-xs flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  Section 11.4 Statutory Accounting Safeguard Enforced:
                </span>
                <p className="text-cyan-300/90 leading-relaxed text-[11px]">
                  Submitting proof of payment queues an authorized <strong>Payment Verification Task</strong> for finance controllers. In accordance with audit standards, the invoice <strong>will NOT automatically be marked as paid</strong> until your transfer is verified against verified bank clearing records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setPopAmount(inv.amountDue);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  {debtorInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.dueDate} ({formatCurrency(inv.amountDue, inv.currency)} due)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Settled Amount ({selectedInvoice?.currency || currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={popAmount || ''}
                  onChange={(e) => setPopAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold mono-num focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Transfer Date *</label>
                <input
                  type="date"
                  required
                  value={popDate}
                  onChange={(e) => setPopDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Method *</label>
                <select
                  value={popMethod}
                  onChange={(e) => setPopMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="bank_transfer">Direct Bank Wire / BACS / SEPA</option>
                  <option value="instant_payment">Faster Payments / Instant Electronic</option>
                  <option value="card_payment">Corporate Card Settlement</option>
                  <option value="direct_debit">Pre-Authorized Direct Debit</option>
                  <option value="custom">Other Settlement Instrument</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank / Transaction Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BARC-WIRE-992140"
                  value={popRef}
                  onChange={(e) => setPopRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Supporting Document / Transfer Advice</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={popDocName}
                    onChange={(e) => setPopDocName(e.target.value)}
                    placeholder="Remittance_Advice_Oct2026.pdf"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                  />
                  <label className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium text-xs whitespace-nowrap">
                    <span>Browse</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPopDocName(file.name);
                      }}
                    />
                  </label>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Accepted formats: PDF, PNG, JPG remittance advices, bank receipts, or SWIFT copies (max 15MB).
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank Clearing Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Barclays Sort: 20-00-00 Acc: 12345678"
                  value={popBankRef}
                  onChange={(e) => setPopBankRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Remittance Notes for Finance Team</label>
              <textarea
                rows={2}
                placeholder="Include any settlement breakdown or instruction for unallocated balance..."
                value={popNotes}
                onChange={(e) => setPopNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingPop || popAmount <= 0}
              className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500 disabled:opacity-50 transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmittingPop ? 'Transmitting Remittance Proof...' : 'Transmit Proof of Payment for Verification'}</span>
            </button>
          </form>
        )}

        <div className="flex justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {t('actionClose')}
          </button>
        </div>

      </div>
    </div>
  );
};
