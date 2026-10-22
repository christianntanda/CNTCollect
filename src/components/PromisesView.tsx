import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Building, 
  User, 
  X, 
  Check 
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { PromiseToPay, Debtor, Invoice, Organization, PromiseStatus } from '../types';
import { formatCurrency, calculateDaysDifference } from '../services/calculations';

interface PromisesViewProps {
  organization: Organization;
  promises: PromiseToPay[];
  debtors: Debtor[];
  invoices: Invoice[];
  onCreatePromise: (promiseData: any) => void;
  onUpdatePromiseStatus: (promiseId: string, status: PromiseStatus) => void;
}

export const PromisesView: React.FC<PromisesViewProps> = ({
  organization,
  promises,
  debtors,
  invoices,
  onCreatePromise,
  onUpdatePromiseStatus,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState(debtors[0]?.id || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [promisedDate, setPromisedDate] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');

  const debtorInvoices = invoices.filter((i) => i.debtorId === selectedDebtorId && i.amountDue > 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const debtor = debtors.find((d) => d.id === selectedDebtorId);
    const invoice = invoices.find((i) => i.id === selectedInvoiceId);

    onCreatePromise({
      debtorId: selectedDebtorId,
      debtorName: debtor?.name || '',
      invoiceId: selectedInvoiceId || undefined,
      invoiceNumber: invoice?.invoiceNumber || undefined,
      promisedAmount: Number(promisedAmount),
      promisedDate,
      contactPerson: contactPerson || debtor?.contactName || 'Accounts Contact',
      notes,
    });

    setShowCreateModal(false);
    setPromisedAmount(0);
    setNotes('');
  };

  const totalPendingPromises = promises
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.promisedAmount, 0);

  const totalFulfilledPromises = promises
    .filter((p) => p.status === 'fulfilled')
    .reduce((sum, p) => sum + p.promisedAmount, 0);

  const brokenCount = promises.filter((p) => p.status === 'broken').length;
  const fulfilledCount = promises.filter((p) => p.status === 'fulfilled').length;
  const closedCount = brokenCount + fulfilledCount;
  const fulfillmentRate = closedCount > 0 ? Math.round((fulfilledCount / closedCount) * 100) : 100;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{t('navPromises')}</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
              {formatCurrency(totalPendingPromises, currency)} scheduled
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track debtor payment commitments, detect broken commitments, and forecast incoming cash receipts.
          </p>
        </div>

        <button
          onClick={() => {
            if (debtors[0]) setSelectedDebtorId(debtors[0].id);
            setPromisedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
            setShowCreateModal(true);
          }}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('actionAddPromise')}</span>
        </button>
      </div>

      {/* 3 Metric Cards for PTP Adherence */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Pending PTP Commitments</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white mono-num">
            {formatCurrency(totalPendingPromises, currency)}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">
            {promises.filter(p => p.status === 'pending').length} active agreements
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Commitment Fulfillment Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mono-num">
            {fulfillmentRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {fulfilledCount} fulfilled vs {brokenCount} broken
          </div>
        </div>

        <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 shadow-sm bg-gradient-to-b from-rose-950/20 to-transparent">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-rose-300">Broken Commitments</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 mono-num">
            {brokenCount}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">
            Triggers high-risk credit rating downgrade
          </div>
        </div>

      </div>

      {/* Promises Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Debtor & Contact</th>
                <th className="px-4 py-3">Linked Invoice</th>
                <th className="px-4 py-3 text-right">Promised Amount</th>
                <th className="px-4 py-3">Promised Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {promises.map((p) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const daysDiff = calculateDaysDifference(p.promisedDate, todayStr);
                const isOverdue = daysDiff < 0 && p.status === 'pending';

                return (
                  <tr key={p.id} className="hover:bg-slate-850/50 transition">
                    
                    {/* Debtor */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{p.debtorName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{p.contactPerson}</span>
                      </div>
                    </td>

                    {/* Linked Invoice */}
                    <td className="px-4 py-3 font-mono">
                      {p.invoiceNumber ? (
                        <span className="text-indigo-400 font-medium">{p.invoiceNumber}</span>
                      ) : (
                        <span className="text-slate-500">Account-level balance</span>
                      )}
                    </td>

                    {/* Promised Amount */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-white mono-num">
                      {formatCurrency(p.promisedAmount, p.currency || currency)}
                    </td>

                    {/* Promised Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-slate-200">{p.promisedDate}</span>
                      {isOverdue && (
                        <span className="block text-[10px] text-rose-400 font-semibold">
                          Maturity passed
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          Pending
                        </span>
                      )}
                      {p.status === 'fulfilled' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Fulfilled
                        </span>
                      )}
                      {p.status === 'broken' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Broken
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                      {p.notes || '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => onUpdatePromiseStatus(p.id, 'fulfilled')}
                            title="Mark as Fulfilled (Payment Received)"
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Fulfilled</span>
                          </button>

                          <button
                            onClick={() => onUpdatePromiseStatus(p.id, 'broken')}
                            title="Mark as Broken"
                            className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Broken</span>
                          </button>
                        </>
                      )}

                      {p.status !== 'pending' && (
                        <button
                          onClick={() => onUpdatePromiseStatus(p.id, 'pending')}
                          className="text-[11px] text-slate-500 hover:text-slate-300"
                        >
                          Reset
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}

              {promises.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No promises to pay currently registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Promise to Pay Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Record Promise to Pay</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
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

              <div>
                <label className="block text-slate-300 font-medium mb-1">Linked Invoice (Optional)</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = invoices.find(i => i.id === e.target.value);
                    if (inv) setPromisedAmount(inv.amountDue);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Account-level Commitment (No specific invoice)</option>
                  {debtorInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} ({formatCurrency(inv.amountDue, inv.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Promised Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={promisedAmount}
                    onChange={(e) => setPromisedAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Settlement Date *</label>
                  <input
                    type="date"
                    required
                    value={promisedDate}
                    onChange={(e) => setPromisedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Debtor Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Finance Director or AP Lead"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Commitment Notes & Channel</label>
                <textarea
                  rows={3}
                  placeholder="Agreed via phone conference, batch payment scheduled, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Log Commitment</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
