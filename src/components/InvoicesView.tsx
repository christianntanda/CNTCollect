import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CreditCard, 
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  X,
  Check,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  UserCheck,
  Pause,
  Play,
  Mail,
  Bookmark,
  CheckSquare,
  Square
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Invoice, Debtor, Organization, InvoiceStatus, FinancialStatus, AgeingStatus } from '../types';
import { formatCurrency } from '../services/calculations';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { CsvSpreadsheetImportModal } from './CsvSpreadsheetImportModal';

interface InvoicesViewProps {
  organization: Organization;
  invoices: Invoice[];
  debtors: Debtor[];
  onOpenNewInvoiceModal: () => void;
  onOpenRecordPaymentForInvoice: (invoice: Invoice) => void;
  onOpenReminderModal: (invoice: Invoice) => void;
  onOpenDisputeModal: (invoice: Invoice) => void;
  onOpenDebtorPortal: (debtor: Debtor) => void;
  onImportInvoices: (importedInvoices: any[]) => void;
  onOpenWriteOffModal?: (invoice: Invoice) => void;
  onInvoiceUpdated?: (updatedInvoice: Invoice) => void;
}

type SortField = 'invoiceNumber' | 'debtorName' | 'issueDate' | 'dueDate' | 'originalAmount' | 'amountDue' | 'daysOverdue';
type SavedFilterPreset = 'all' | 'overdue' | 'disputed' | 'high_exposure' | 'on_hold' | 'paid' | 'current';

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  organization,
  invoices,
  debtors,
  onOpenNewInvoiceModal,
  onOpenRecordPaymentForInvoice,
  onOpenReminderModal,
  onOpenDisputeModal,
  onOpenDebtorPortal,
  onImportInvoices,
  onOpenWriteOffModal,
  onInvoiceUpdated,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [savedPreset, setSavedPreset] = useState<SavedFilterPreset>('all');
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>('all');
  const [ageingFilter, setAgeingFilter] = useState<string>('all');
  const [controllerFilter, setControllerFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('daysOverdue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Selection & Bulk Actions (Section 8.3)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<'reassign' | 'hold' | 'reminders' | null>(null);
  const [bulkControllerName, setBulkControllerName] = useState('Sarah Miller');
  const [bulkHoldReason, setBulkHoldReason] = useState('Supervisory review hold');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Modals
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Filter Logic with Saved Presets (Section 8.3)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Free text search
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.debtorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.purchaseOrderRef && inv.purchaseOrderRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.externalAccountingRef && inv.externalAccountingRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.assignedCreditControllerName && inv.assignedCreditControllerName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Saved presets
      let matchesPreset = true;
      if (savedPreset === 'overdue') {
        matchesPreset = inv.daysOverdue > 0 && inv.status !== 'paid' && inv.status !== 'written_off';
      } else if (savedPreset === 'disputed') {
        matchesPreset = inv.status === 'disputed' || inv.disputeStatus === 'open';
      } else if (savedPreset === 'high_exposure') {
        matchesPreset = (inv.amountDue || 0) >= 10000;
      } else if (savedPreset === 'on_hold') {
        matchesPreset = inv.status === 'on_hold' || inv.collectionStatus === 'on_hold';
      } else if (savedPreset === 'paid') {
        matchesPreset = inv.status === 'paid' || inv.amountDue === 0;
      } else if (savedPreset === 'current') {
        matchesPreset = inv.daysOverdue === 0 && inv.status !== 'paid' && inv.status !== 'written_off';
      }

      // Multi-dimensional filters
      const matchesFinancial = financialStatusFilter === 'all' || inv.financialStatus === financialStatusFilter || inv.status === financialStatusFilter;
      const matchesAgeing = ageingFilter === 'all' || (ageingFilter === 'overdue' ? inv.daysOverdue > 0 : inv.daysOverdue === 0);
      const matchesController = controllerFilter === 'all' || inv.assignedCreditControllerName === controllerFilter;

      return matchesSearch && matchesPreset && matchesFinancial && matchesAgeing && matchesController;
    });
  }, [invoices, searchTerm, savedPreset, financialStatusFilter, ageingFilter, controllerFilter]);

  // Sorting Logic (Section 8.3)
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'originalAmount') {
        valA = a.originalAmount || a.totalAmount;
        valB = b.originalAmount || b.totalAmount;
      } else if (sortField === 'amountDue') {
        valA = a.amountDue;
        valB = b.amountDue;
      } else if (sortField === 'daysOverdue') {
        valA = a.daysOverdue || 0;
        valB = b.daysOverdue || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortField, sortAsc]);

  // Pagination Logic (Section 8.3)
  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, currentPage, pageSize]);

  // Handle Header Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  // Selection handlers
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedInvoices.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedInvoiceIds.includes(id));
    if (allSelected) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter((id) => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedInvoiceIds, ...pageIds]));
      setSelectedInvoiceIds(merged);
    }
  };

  const handleToggleSelectInvoice = (id: string) => {
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter((item) => item !== id));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, id]);
    }
  };

  // Bulk Actions Executor (Section 8.3)
  const handleExecuteBulkAction = async (action: 'reassign_controller' | 'place_on_hold' | 'resume_cadence' | 'dispatch_reminders') => {
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/invoices/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedInvoiceIds,
          action,
          payload: {
            controllerName: bulkControllerName,
            reason: bulkHoldReason,
            channel: 'email',
          },
          performedBy: 'Credit Controller',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkSuccessMsg(data.message || 'Bulk action executed successfully.');
        setTimeout(() => {
          setShowBulkModal(null);
          setBulkSuccessMsg('');
          setSelectedInvoiceIds([]);
        }, 1200);
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((inv: Invoice) => {
            if (onInvoiceUpdated) onInvoiceUpdated(inv);
          });
        }
      }
    } catch (err) {
      console.error('Failed to execute bulk action:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export CSV (Section 8.3)
  const handleExportCSV = (exportAll = true) => {
    const dataset = exportAll ? filteredInvoices : invoices.filter(i => selectedInvoiceIds.includes(i.id));
    const headers = [
      'Internal Record ID',
      'Invoice Number',
      'Debtor Name',
      'Debtor Email',
      'Issue Date',
      'Due Date',
      'Currency',
      'Original Amount',
      'Tax Amount',
      'Paid Amount',
      'Outstanding Balance',
      'Days Overdue',
      'Financial Status',
      'Ageing Status',
      'Dispute Status',
      'Collection Status',
      'Next Scheduled Reminder',
      'Assigned Controller',
      'PO Reference',
      'External Accounting Ref'
    ];

    const rows = dataset.map((i) => [
      i.id,
      i.invoiceNumber,
      `"${i.debtorName}"`,
      i.debtorEmail,
      i.issueDate,
      i.dueDate,
      i.currency,
      i.originalAmount || i.totalAmount,
      i.taxAmount || 0,
      i.amountPaid || 0,
      i.amountDue,
      i.daysOverdue,
      i.financialStatus || i.status,
      i.ageingStatus || (i.daysOverdue > 0 ? 'overdue' : 'current'),
      i.disputeStatus || 'none',
      i.collectionStatus || 'active_cadence',
      i.nextReminderDate || 'N/A',
      `"${i.assignedCreditControllerName || 'Sarah Miller'}"`,
      `"${i.purchaseOrderRef || i.reference || ''}"`,
      `"${i.externalAccountingRef || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CNTCollect_Invoice_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process batch import
  const handleProcessImport = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Import data must be a JSON array of invoice objects.');
      }
      onImportInvoices(parsed);
      setShowImportModal(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON syntax');
    }
  };

  const isAllPageSelected = paginatedInvoices.length > 0 && paginatedInvoices.every((i) => selectedInvoiceIds.includes(i.id));

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{t('navInvoices')}</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-medium border border-slate-700">
              {invoices.length} invoices registered
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Section 8 robust invoice register, multi-dimensional status modeling, bulk safeguards, and complete detail views.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import / Sync</span>
          </button>

          <button
            onClick={() => handleExportCSV(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register</span>
          </button>

          <button
            onClick={onOpenNewInvoiceModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice (8.1)</span>
          </button>
        </div>
      </div>

      {/* Saved Filter Presets (Section 8.3) */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1 text-xs">
        <span className="text-slate-500 flex items-center space-x-1 shrink-0 font-medium text-[11px] uppercase tracking-wider">
          <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
          <span>Saved Filters:</span>
        </span>

        <button
          onClick={() => { setSavedPreset('all'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
            savedPreset === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Invoices ({invoices.length})
        </button>

        <button
          onClick={() => { setSavedPreset('overdue'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium flex items-center space-x-1 ${
            savedPreset === 'overdue' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-900 text-rose-300 hover:text-white border border-slate-800'
          }`}
        >
          <span>Overdue Delinquent</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-200">
            {invoices.filter(i => i.daysOverdue > 0 && i.status !== 'paid').length}
          </span>
        </button>

        <button
          onClick={() => { setSavedPreset('disputed'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium flex items-center space-x-1 ${
            savedPreset === 'disputed' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-900 text-amber-300 hover:text-white border border-slate-800'
          }`}
        >
          <span>Disputed (Dunning Paused)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-200">
            {invoices.filter(i => i.status === 'disputed' || i.disputeStatus === 'open').length}
          </span>
        </button>

        <button
          onClick={() => { setSavedPreset('high_exposure'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
            savedPreset === 'high_exposure' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          High Exposure (&gt; £10k)
        </button>

        <button
          onClick={() => { setSavedPreset('on_hold'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
            savedPreset === 'on_hold' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-900 text-purple-300 hover:text-white border border-slate-800'
          }`}
        >
          On Hold / Paused
        </button>

        <button
          onClick={() => { setSavedPreset('paid'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
            savedPreset === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900 text-emerald-300 hover:text-white border border-slate-800'
          }`}
        >
          Paid in Full
        </button>
      </div>

      {/* Search & Dynamic Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice #, customer, PO ref, or controller..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Financial status filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Financial:</span>
            <select
              value={financialStatusFilter}
              onChange={(e) => { setFinancialStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
            >
              <option value="all">All Financial</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="written_off">Written Off</option>
              <option value="cancelled">Cancelled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Ageing filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Ageing:</span>
            <select
              value={ageingFilter}
              onChange={(e) => { setAgeingFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
            >
              <option value="all">All Ageing</option>
              <option value="current">Current (&le; due date)</option>
              <option value="overdue">Overdue (&gt; 0 days)</option>
            </select>
          </div>

          {/* Controller filter */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Controller:</span>
            <select
              value={controllerFilter}
              onChange={(e) => { setControllerFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
            >
              <option value="all">All Controllers</option>
              <option value="Sarah Miller">Sarah Miller</option>
              <option value="James Wilson">James Wilson</option>
              <option value="David Chen">David Chen</option>
              <option value="Alice Morgan">Alice Morgan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Section 8.3) */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              {selectedInvoiceIds.length}
            </span>
            <span className="text-indigo-200 font-semibold">
              Invoices Selected for Bulk Execution
            </span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              onClick={() => setShowBulkModal('reminders')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 flex items-center space-x-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Bulk Reminders</span>
            </button>

            <button
              onClick={() => setShowBulkModal('reassign')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Reassign Controller</span>
            </button>

            <button
              onClick={() => setShowBulkModal('hold')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Place on Hold</span>
            </button>

            <button
              onClick={() => handleExecuteBulkAction('resume_cadence')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Cadence</span>
            </button>

            <button
              onClick={() => handleExportCSV(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </button>

            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="p-1 text-slate-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoice Register Table (Section 8.3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-3 py-3 w-8">
                  <button
                    onClick={handleSelectAllOnPage}
                    className="text-slate-400 hover:text-white"
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* 1. Invoice Number */}
                <th 
                  onClick={() => handleSort('invoiceNumber')} 
                  className="px-3 py-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice #</span>
                    {sortField === 'invoiceNumber' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 2. Customer */}
                <th 
                  onClick={() => handleSort('debtorName')} 
                  className="px-3 py-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Customer</span>
                    {sortField === 'debtorName' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 3. Invoice Date */}
                <th 
                  onClick={() => handleSort('issueDate')} 
                  className="px-3 py-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {sortField === 'issueDate' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 4. Due Date */}
                <th 
                  onClick={() => handleSort('dueDate')} 
                  className="px-3 py-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Due Date</span>
                    {sortField === 'dueDate' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 5. Original Amount */}
                <th 
                  onClick={() => handleSort('originalAmount')} 
                  className="px-3 py-3 cursor-pointer hover:text-white text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Original Amt</span>
                    {sortField === 'originalAmount' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 6. Paid Amount */}
                <th className="px-3 py-3 text-right whitespace-nowrap">Paid Amt</th>

                {/* 7. Outstanding Balance */}
                <th 
                  onClick={() => handleSort('amountDue')} 
                  className="px-3 py-3 cursor-pointer hover:text-white text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Balance Due</span>
                    {sortField === 'amountDue' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 8. Days Overdue */}
                <th 
                  onClick={() => handleSort('daysOverdue')} 
                  className="px-3 py-3 cursor-pointer hover:text-white text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Overdue</span>
                    {sortField === 'daysOverdue' && (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />)}
                  </div>
                </th>

                {/* 9. Financial Status */}
                <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>

                {/* 10. Dispute Indicator */}
                <th className="px-3 py-3 text-center whitespace-nowrap">Dispute</th>

                {/* 11. Next Scheduled Reminder */}
                <th className="px-3 py-3 whitespace-nowrap">Next Reminder</th>

                {/* 12. Assigned Credit Controller */}
                <th className="px-3 py-3 whitespace-nowrap">Controller</th>

                {/* 13. Last Collection Activity */}
                <th className="px-3 py-3 whitespace-nowrap">Last Activity</th>

                {/* 14. Actions */}
                <th className="px-3 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-850">
              {paginatedInvoices.map((inv) => {
                const isSelected = selectedInvoiceIds.includes(inv.id);
                const debtor = debtors.find((d) => d.id === inv.debtorId);

                return (
                  <tr key={inv.id} className={`hover:bg-slate-850/50 transition ${isSelected ? 'bg-indigo-950/20' : ''}`}>
                    
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleSelectInvoice(inv.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Invoice Number */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div
                        onClick={() => setSelectedInvoiceForDetail(inv)}
                        className="font-bold text-white hover:text-indigo-400 cursor-pointer flex items-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-mono">{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {inv.purchaseOrderRef ? `PO: ${inv.purchaseOrderRef}` : inv.id}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-200 truncate max-w-[150px]">{inv.debtorName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{inv.debtorEmail}</div>
                    </td>

                    {/* Invoice Date */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-300">
                      {inv.issueDate}
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-300">
                      {inv.dueDate}
                    </td>

                    {/* Original Amount */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-medium text-slate-300 mono-num">
                      {formatCurrency(inv.originalAmount || inv.totalAmount, inv.currency)}
                    </td>

                    {/* Paid Amount */}
                    <td className="px-3 py-3 text-right whitespace-nowrap mono-num">
                      {inv.amountPaid > 0 ? (
                        <span className="text-emerald-400 font-semibold">{formatCurrency(inv.amountPaid, inv.currency)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="px-3 py-3 text-right whitespace-nowrap font-bold text-white mono-num">
                      {formatCurrency(inv.amountDue, inv.currency)}
                    </td>

                    {/* Days Overdue */}
                    <td className="px-3 py-3 text-center whitespace-nowrap font-mono">
                      {inv.daysOverdue > 0 && inv.status !== 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                          {inv.daysOverdue} d
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium">Current</span>
                      )}
                    </td>

                    {/* Financial Status */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        inv.status === 'paid' || inv.financialStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : inv.status === 'partially_paid' || inv.financialStatus === 'partially_paid'
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : inv.status === 'written_off'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : inv.status === 'on_hold'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : inv.daysOverdue > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    {/* Dispute Indicator */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {inv.status === 'disputed' || inv.disputeStatus === 'open' ? (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          <span>Open</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Next Scheduled Reminder */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {inv.nextReminderDate && inv.amountDue > 0 && inv.status !== 'on_hold' ? (
                        <span className="text-indigo-300">{inv.nextReminderDate}</span>
                      ) : (
                        <span className="text-slate-600">Paused</span>
                      )}
                    </td>

                    {/* Assigned Credit Controller */}
                    <td className="px-3 py-3 whitespace-nowrap text-slate-300 text-[11px]">
                      {inv.assignedCreditControllerName || 'Sarah Miller'}
                    </td>

                    {/* Last Collection Activity */}
                    <td className="px-3 py-3 whitespace-nowrap text-[11px]">
                      {inv.lastCollectionActivity ? (
                        <span className="text-slate-400 truncate max-w-[140px] block" title={`${inv.lastCollectionActivity.type}: ${inv.lastCollectionActivity.summary}`}>
                          {inv.lastCollectionActivity.type}
                        </span>
                      ) : (
                        <span className="text-slate-600">Dispatched</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right whitespace-nowrap space-x-1">
                      {/* Open Full Detail (Section 8.4) */}
                      <button
                        onClick={() => setSelectedInvoiceForDetail(inv)}
                        title="View Full Invoice Detail Page (Section 8.4)"
                        className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition inline-flex items-center"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* AI Draft Reminder */}
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => onOpenReminderModal(inv)}
                          title="Generate AI-personalized collection reminder"
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition inline-flex items-center"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Record Payment */}
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => onOpenRecordPaymentForInvoice(inv)}
                          title="Record payment allocation"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition inline-flex items-center"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Lodge Dispute */}
                      {inv.status !== 'disputed' && inv.status !== 'paid' && inv.status !== 'written_off' && (
                        <button
                          onClick={() => onOpenDisputeModal(inv)}
                          title="Lodge customer dispute and freeze dunning"
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition inline-flex items-center"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Debtor Portal Link */}
                      {debtor && (
                        <button
                          onClick={() => onOpenDebtorPortal(debtor)}
                          title="Open Debtor Self-Service Portal"
                          className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition inline-flex items-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}

              {paginatedInvoices.length === 0 && (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-500">
                    No invoices matching the selected register filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Section 8.3) */}
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span>Showing</span>
            <strong className="text-white">
              {filteredInvoices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>
            <span>to</span>
            <strong className="text-white">
              {Math.min(currentPage * pageSize, filteredInvoices.length)}
            </strong>
            <span>of</span>
            <strong className="text-white">{filteredInvoices.length}</strong>
            <span>invoices</span>

            <span className="text-slate-600">|</span>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-slate-300 font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Full Invoice Detail Modal (Section 8.4) */}
      {selectedInvoiceForDetail && (
        <InvoiceDetailModal
          invoice={selectedInvoiceForDetail}
          organization={organization}
          onClose={() => setSelectedInvoiceForDetail(null)}
          onOpenRecordPayment={onOpenRecordPaymentForInvoice}
          onOpenCreditNote={() => {
            setSelectedInvoiceForDetail(null);
            // Can route to credit notes view or modal
          }}
          onOpenDispute={onOpenDisputeModal}
          onOpenDebtorPortal={onOpenDebtorPortal}
          onInvoiceUpdated={(updated) => {
            setSelectedInvoiceForDetail(updated);
            if (onInvoiceUpdated) onInvoiceUpdated(updated);
          }}
        />
      )}

      {/* Bulk Action Execution Modals (Section 8.3) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-bold text-white text-sm">
                Bulk Execution Safeguard ({selectedInvoiceIds.length} Invoices)
              </h4>
              <button onClick={() => setShowBulkModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {showBulkModal === 'reassign' && (
              <div className="space-y-3">
                <p className="text-slate-300">
                  Select new designated credit controller for {selectedInvoiceIds.length} accounts:
                </p>
                <select
                  value={bulkControllerName}
                  onChange={(e) => setBulkControllerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="Sarah Miller">Sarah Miller (Credit Controller)</option>
                  <option value="James Wilson">James Wilson (Collections Officer)</option>
                  <option value="David Chen">David Chen (Finance Manager)</option>
                  <option value="Alice Morgan">Alice Morgan (Organisation Administrator)</option>
                </select>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setShowBulkModal(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExecuteBulkAction('reassign_controller')}
                    disabled={bulkActionLoading}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                  >
                    {bulkActionLoading ? 'Reassigning...' : 'Confirm Reassignment'}
                  </button>
                </div>
              </div>
            )}

            {showBulkModal === 'hold' && (
              <div className="space-y-3">
                <p className="text-slate-300">
                  Place {selectedInvoiceIds.length} invoices on collection hold. Automated dunning cadences will be frozen:
                </p>
                <textarea
                  rows={2}
                  required
                  value={bulkHoldReason}
                  onChange={(e) => setBulkHoldReason(e.target.value)}
                  placeholder="Managerial justification for hold..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setShowBulkModal(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExecuteBulkAction('place_on_hold')}
                    disabled={bulkActionLoading}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                  >
                    {bulkActionLoading ? 'Applying Hold...' : 'Confirm Hold Status'}
                  </button>
                </div>
              </div>
            )}

            {showBulkModal === 'reminders' && (
              <div className="space-y-3">
                <p className="text-slate-300">
                  Queue scheduled dunning reminders for {selectedInvoiceIds.length} accounts.
                </p>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-[11px] space-y-1">
                  <span className="font-bold text-slate-300 block">Communication Safeguards Enforced:</span>
                  <span>• Invoices on hold or with active disputes are strictly excluded.</span>
                  <span>• Dispatches only to customers with verified reminder consent.</span>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setShowBulkModal(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExecuteBulkAction('dispatch_reminders')}
                    disabled={bulkActionLoading}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                  >
                    {bulkActionLoading ? 'Dispatching...' : 'Dispatch Safeguarded Reminders'}
                  </button>
                </div>
              </div>
            )}

            {bulkSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-center">
                {bulkSuccessMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 9 Guided Spreadsheet & CSV Import Modal */}
      {showImportModal && (
        <CsvSpreadsheetImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          organization={organization}
          initialEntityType="invoices"
          onImportComplete={() => {
            if (onInvoiceUpdated && invoices.length > 0) {
              onInvoiceUpdated(invoices[0]);
            }
          }}
        />
      )}

    </div>
  );
};
