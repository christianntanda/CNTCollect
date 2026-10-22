import React, { useState } from 'react';
import { 
  FileMinus, 
  Plus, 
  Building, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  X, 
  Check, 
  Tag 
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { CreditNote, Debtor, Invoice, Organization } from '../types';
import { formatCurrency } from '../services/calculations';

interface CreditNotesViewProps {
  organization: Organization;
  creditNotes: CreditNote[];
  debtors: Debtor[];
  invoices: Invoice[];
  onIssueCreditNote: (cnData: any) => void;
  canIssueCreditNotes: boolean;
}

export const CreditNotesView: React.FC<CreditNotesViewProps> = ({
  organization,
  creditNotes,
  debtors,
  invoices,
  onIssueCreditNote,
  canIssueCreditNotes,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState(debtors[0]?.id || '');
  const [cnAmount, setCnAmount] = useState<number>(0);
  const [reason, setReason] = useState<CreditNote['reason']>('goodwill_settlement');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const debtorInvoices = invoices.filter((i) => i.debtorId === selectedDebtorId && i.amountDue > 0);

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const debtor = debtors.find((d) => d.id === selectedDebtorId);
    const invoice = invoices.find((i) => i.id === selectedInvoiceId);

    const allocations = invoice && cnAmount > 0 ? [
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        allocatedAmount: Math.min(cnAmount, invoice.amountDue),
      }
    ] : [];

    onIssueCreditNote({
      organizationId: organization.id,
      debtorId: selectedDebtorId,
      debtorName: debtor?.name || '',
      amount: Number(cnAmount),
      currency,
      reason,
      allocations,
      issuedBy: 'Credit Operations Lead',
      notes,
    });

    setShowIssueModal(false);
    setCnAmount(0);
    setNotes('');
  };

  const totalCreditNotesIssued = creditNotes.reduce((sum, cn) => sum + cn.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Credit Notes & Adjustments</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-medium border border-slate-700">
              {formatCurrency(totalCreditNotesIssued, currency)} issued
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue authorized credit adjustments, dispute conciliations, and offset open invoice balances.
          </p>
        </div>

        <button
          onClick={() => {
            if (debtors[0]) setSelectedDebtorId(debtors[0].id);
            setShowIssueModal(true);
          }}
          disabled={!canIssueCreditNotes}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition shadow-sm flex items-center space-x-1.5 self-start sm:self-auto"
          title={!canIssueCreditNotes ? 'Requires Finance Manager or Admin role' : ''}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Issue Credit Note</span>
        </button>
      </div>

      {/* Credit Notes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Credit Note #</th>
                <th className="px-4 py-3">Debtor</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Credit Value</th>
                <th className="px-4 py-3">Allocated Invoice(s)</th>
                <th className="px-4 py-3">Issued By</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-850/50 transition">
                  <td className="px-4 py-3 font-bold text-white flex items-center space-x-1.5">
                    <FileMinus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{cn.creditNoteNumber}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{cn.debtorName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {cn.reason.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white mono-num">
                    {formatCurrency(cn.amount, cn.currency || currency)}
                  </td>
                  <td className="px-4 py-3">
                    {cn.allocations.length > 0 ? (
                      cn.allocations.map((a, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300">
                          {a.invoiceNumber} (-{formatCurrency(a.allocatedAmount, cn.currency || currency)})
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">Unallocated on account</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{cn.issuedBy}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{cn.issueDate}</td>
                </tr>
              ))}

              {creditNotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No credit notes recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Credit Note Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileMinus className="w-4 h-4 text-indigo-400" />
                <span>Issue & Allocate Commercial Credit Note</span>
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Debtor Company *</label>
                <select
                  value={selectedDebtorId}
                  onChange={(e) => setSelectedDebtorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {debtors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cnAmount || ''}
                    onChange={(e) => setCnAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mono-num focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Commercial Reason *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as CreditNote['reason'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="goodwill_settlement">Goodwill Settlement (Dispute)</option>
                    <option value="pricing_error">Pricing Error / Rate Adjustment</option>
                    <option value="damaged_goods">Damaged Goods / Short Delivery</option>
                    <option value="commercial_discount">Commercial Volume Rebate</option>
                    <option value="cancellation">Order Cancellation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Offset Against Open Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = invoices.find(i => i.id === e.target.value);
                    if (inv && !cnAmount) setCnAmount(inv.amountDue);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No immediate offset (Unallocated Account Credit)</option>
                  {debtorInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — Balance Due: {formatCurrency(inv.amountDue, inv.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Audit Memo & Explanation</label>
                <textarea
                  rows={3}
                  placeholder="Detail credit authorization, agreement terms, or dispute settlement ref..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  disabled={cnAmount <= 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Execute Credit Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
