import React, { useState } from 'react';
import { Plus, Trash2, X, Check, FileText, Upload, Paperclip, Building, Tag, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Debtor, Organization, InvoiceLineItem, InvoiceStatus, InvoiceSource } from '../types';
import { formatCurrency } from '../services/calculations';

interface CreateInvoiceModalProps {
  organization: Organization;
  debtors: Debtor[];
  onClose: () => void;
  onCreateInvoice: (invoiceData: any) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  organization,
  debtors,
  onClose,
  onCreateInvoice,
}) => {
  const { t } = useTranslation();
  const selectedOrgCurrency = organization.defaultCurrency || 'GBP';

  const [debtorId, setDebtorId] = useState(debtors[0]?.id || '');
  const selectedDebtor = debtors.find(d => d.id === debtorId);

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [purchaseOrderRef, setPurchaseOrderRef] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [externalAccountingRef, setExternalAccountingRef] = useState(`XERO-INV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [source, setSource] = useState<InvoiceSource>('manual');
  const [initialStatus, setInitialStatus] = useState<InvoiceStatus>('issued');
  
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTermsDays, setPaymentTermsDays] = useState(selectedDebtor?.paymentTermsDays || 30);
  
  // Calculate initial due date
  const computeInitialDueDate = (terms: number, issue: string) => {
    const d = new Date(issue);
    d.setDate(d.getDate() + terms);
    return d.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(computeInitialDueDate(selectedDebtor?.paymentTermsDays || 30, new Date().toISOString().split('T')[0]));
  const [currency, setCurrency] = useState(selectedDebtor?.defaultCurrency || selectedOrgCurrency);
  const [description, setDescription] = useState('Enterprise Logistics & Transport Services');
  const [internalNotes, setInternalNotes] = useState('');
  const [amountAlreadyPaid, setAmountAlreadyPaid] = useState<number>(0);
  
  // Document attachment
  const [docName, setDocName] = useState(`${invoiceNumber}.pdf`);
  const [docSize, setDocSize] = useState('1.4 MB');

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: `li-1`,
      description: 'Enterprise Transport & Fulfillment Services',
      quantity: 1,
      unitPrice: 5000,
      taxRate: 20,
      total: 6000,
    },
  ]);

  // Handle terms change
  const handleTermsChange = (newTerms: number) => {
    setPaymentTermsDays(newTerms);
    setDueDate(computeInitialDueDate(newTerms, issueDate));
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setDueDate(computeInitialDueDate(paymentTermsDays, newDate));
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `li-${Date.now()}`,
        description: 'Commercial Professional Services',
        quantity: 1,
        unitPrice: 1500,
        taxRate: 20,
        total: 1800,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    const subtotal = item.quantity * item.unitPrice;
    item.total = Math.round((subtotal + subtotal * (item.taxRate / 100)) * 100) / 100;
    updated[index] = item;
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
  const originalAmount = Math.round((subtotal + taxTotal) * 100) / 100;
  const outstandingBalance = Math.max(0, Math.round((originalAmount - amountAlreadyPaid) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const debtor = debtors.find((d) => d.id === debtorId);

    onCreateInvoice({
      organizationId: organization.id,
      debtorId,
      debtorName: debtor?.name || '',
      debtorEmail: debtor?.email || '',
      invoiceNumber,
      purchaseOrderRef,
      reference: purchaseOrderRef,
      externalAccountingRef,
      issueDate,
      dueDate,
      currency,
      subtotal,
      taxAmount: taxTotal,
      originalAmount,
      totalAmount: originalAmount,
      amountPaid: Number(amountAlreadyPaid),
      amountDue: outstandingBalance,
      paymentTermsDays: Number(paymentTermsDays),
      description,
      invoiceDocument: {
        id: `doc-inv-${Date.now()}`,
        name: docName || `${invoiceNumber}.pdf`,
        size: docSize || '1.4 MB',
        uploadedAt: issueDate,
      },
      internalNotes,
      status: initialStatus,
      source,
      createdBy: 'Billing Specialist',
      lineItems,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Create / Record Commercial Invoice (Section 8.1)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports external ERP references without requiring CNTCollect to replace existing invoicing systems.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Customer & Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Customer / Debtor *</label>
              <select
                value={debtorId}
                onChange={(e) => {
                  setDebtorId(e.target.value);
                  const deb = debtors.find(d => d.id === e.target.value);
                  if (deb) {
                    if (deb.defaultCurrency) setCurrency(deb.defaultCurrency);
                    if (deb.paymentTermsDays) handleTermsChange(deb.paymentTermsDays);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              >
                {debtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.customerReference || d.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  setDocName(`${e.target.value}.pdf`);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* References & Invoicing Origin (Section 8.1) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Purchase Order Reference (PO)</label>
              <input
                type="text"
                placeholder="e.g. PO-APX-9012"
                value={purchaseOrderRef}
                onChange={(e) => setPurchaseOrderRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">External Accounting Ref (Xero/SAP/QBO)</label>
              <input
                type="text"
                placeholder="e.g. XERO-INV-88912"
                value={externalAccountingRef}
                onChange={(e) => setExternalAccountingRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Invoice Ingestion Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as InvoiceSource)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
              >
                <option value="manual">Manual Register Entry</option>
                <option value="erp_sync">ERP Synchronisation (API)</option>
                <option value="xero">Xero Connected Feed</option>
                <option value="quickbooks">QuickBooks Online Sync</option>
                <option value="csv_import">CSV Batch Import</option>
              </select>
            </div>
          </div>

          {/* Dates, Currency & Payment Terms */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Payment Terms (Net Days)</label>
              <input
                type="number"
                min={0}
                max={365}
                value={paymentTermsDays}
                onChange={(e) => handleTermsChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Due Date (Auto-calculated)</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white uppercase"
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          {/* General Description */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Invoice Description / Narrative</label>
            <input
              type="text"
              placeholder="e.g. Dedicated cross-border European freight and temperature telematics"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Invoice Line Items & Commercial Breakdown
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 font-medium flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Tax %"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, 'taxRate', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                    />
                  </div>
                  <div className="col-span-1 text-right font-bold text-slate-200 mono-num">
                    {formatCurrency(item.total, currency)}
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Calculation Totals & Initial Paid Amount */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Settlement & Initial Status (Section 8.2)
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Amount Already Paid</label>
                  <input
                    type="number"
                    min={0}
                    max={originalAmount}
                    step={0.01}
                    value={amountAlreadyPaid}
                    onChange={(e) => setAmountAlreadyPaid(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white mono-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Initial Status</label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as InvoiceStatus)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="issued">Issued</option>
                    <option value="draft">Draft</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Document metadata attachment simulation */}
              <div className="pt-2">
                <label className="block text-slate-400 mb-1">Original Invoice Document (Section 8.1)</label>
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="bg-transparent border-none text-white text-xs w-full focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">{docSize}</span>
                </div>
              </div>
            </div>

            {/* Total Balance Breakdown */}
            <div className="space-y-1.5 self-center border-l border-slate-850 pl-4">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Net):</span>
                <span className="mono-num text-white">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax / VAT Amount:</span>
                <span className="mono-num text-white">{formatCurrency(taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-semibold pt-1 border-t border-slate-800">
                <span>Original Amount (Gross):</span>
                <span className="mono-num text-white text-sm">{formatCurrency(originalAmount, currency)}</span>
              </div>
              {amountAlreadyPaid > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Less Paid to Date:</span>
                  <span className="mono-num">-{formatCurrency(amountAlreadyPaid, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-indigo-300 font-bold text-sm pt-1 border-t border-slate-800">
                <span>Outstanding Balance Due:</span>
                <span className="mono-num">{formatCurrency(outstandingBalance, currency)}</span>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Internal Notes & Credit Controller Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Standard 30-day terms issued. Client PO verified with purchasing department."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              {t('actionCancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Issue & Register Invoice</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
