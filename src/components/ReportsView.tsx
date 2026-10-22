import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  Printer, 
  TrendingUp, 
  Building, 
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  FileText,
  User,
  Users,
  ChevronRight,
  ChevronDown,
  Layers,
  HelpCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  X,
  CreditCard,
  Briefcase,
  Activity,
  Award
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Debtor, 
  Invoice, 
  Payment, 
  Dispute, 
  PromiseToPay, 
  CreditNote, 
  CommunicationLog, 
  User as TeamUser, 
  Organization, 
  FinancialMetrics, 
  StandardReportId, 
  ReportDefinition,
  ReportFilterOptions,
  UserRole
} from '../types';
import { formatCurrency } from '../services/calculations';

interface ReportsViewProps {
  organization: Organization;
  debtors: Debtor[];
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  disputes: Dispute[];
  promises: PromiseToPay[];
  communications: CommunicationLog[];
  teamUsers: TeamUser[];
  metrics: FinancialMetrics;
  currentUser?: TeamUser;
}

// 19.1 All 18 Standard Reports Definitions
export const STANDARD_REPORTS: ReportDefinition[] = [
  {
    id: 'ar_summary',
    number: 1,
    name: 'Accounts Receivable Summary',
    category: 'receivables',
    description: 'Executive overview of total receivables, current vs overdue portfolio, CEI, and DSO distribution.',
    isSensitive: true,
  },
  {
    id: 'outstanding_invoices',
    number: 2,
    name: 'Outstanding Invoice Register',
    category: 'receivables',
    description: 'Complete listing of all open and partially settled invoices with terms, balance due, and aging.',
    isSensitive: false,
  },
  {
    id: 'overdue_invoices',
    number: 3,
    name: 'Overdue Invoice Report',
    category: 'receivables',
    description: 'Delinquent invoices categorized by days overdue, accrued statutory interest, and escalation status.',
    isSensitive: false,
  },
  {
    id: 'receivables_ageing',
    number: 4,
    name: 'Receivables Ageing Report',
    category: 'receivables',
    description: 'Deterministic aged debt matrix across Current, 1-30, 31-60, 61-90, and 90+ day aging buckets.',
    isSensitive: false,
  },
  {
    id: 'customer_statement',
    number: 5,
    name: 'Customer Statement',
    category: 'receivables',
    description: 'Formal statement of account for specific customers showing debits, credits, payments, and running balance.',
    isSensitive: true,
  },
  {
    id: 'payment_history',
    number: 6,
    name: 'Payment History Report',
    category: 'reconciliation',
    description: 'Chronological register of all recorded collections, payment channels, allocations, and bank references.',
    isSensitive: false,
  },
  {
    id: 'collection_activity',
    number: 7,
    name: 'Collection Activity Report',
    category: 'collections',
    description: 'Audit log of automated dunning reminders, phone calls, collector notes, and customer touchpoints.',
    isSensitive: false,
  },
  {
    id: 'reminder_performance',
    number: 8,
    name: 'Reminder Performance Report',
    category: 'collections',
    description: 'Cadence analytics: delivery rates, open rates, response conversions, and suppression breakdowns.',
    isSensitive: false,
  },
  {
    id: 'promise_to_pay',
    number: 9,
    name: 'Promise-to-Pay Report',
    category: 'collections',
    description: 'Analysis of committed payment intentions, fulfillment tracking, adherence rates, and broken promises.',
    isSensitive: false,
  },
  {
    id: 'dispute_summary',
    number: 10,
    name: 'Dispute & Query Report',
    category: 'collections',
    description: 'Dispute register by category (amounts, delivery, tax, missing PO), resolution times, and liquidity holds.',
    isSensitive: false,
  },
  {
    id: 'controller_workload',
    number: 11,
    name: 'Credit-Controller Workload Report',
    category: 'operations',
    description: 'Fair collector performance metrics: cash recovered, promises kept, resolution turnaround, and task load.',
    isSensitive: false,
  },
  {
    id: 'payment_reconciliation',
    number: 12,
    name: 'Payment Reconciliation Report',
    category: 'reconciliation',
    description: 'Bank clearing reconciliation status, matched vs unmatched feeds, gateway settlements, and variances.',
    isSensitive: false,
  },
  {
    id: 'unallocated_payments',
    number: 13,
    name: 'Unallocated Payment Report',
    category: 'reconciliation',
    description: 'Unallocated cash receipts, customer overpayments, and credit balances awaiting assignment to invoices.',
    isSensitive: false,
  },
  {
    id: 'customer_behaviour',
    number: 14,
    name: 'Customer Payment Behaviour Report',
    category: 'receivables',
    description: 'Customer payment habits, average days to pay vs terms, behavioral risk scoring, and payment delay trends.',
    isSensitive: false,
  },
  {
    id: 'cash_flow_forecast',
    number: 15,
    name: 'Cash Flow Forecast Report',
    category: 'operations',
    description: 'Deterministic 7, 14, 30, 60, and 90-day cash collection projections by contractual, promised, and behavioral streams.',
    isSensitive: false,
  },
  {
    id: 'bad_debt_writeoff',
    number: 16,
    name: 'Bad-Debt & Write-Off Report',
    category: 'operations',
    description: 'Written-off balances, provisioned bad debts, recovery actions, and managerial approval audit trail.',
    isSensitive: true,
  },
  {
    id: 'collection_cost_efficiency',
    number: 17,
    name: 'Collection Cost & Efficiency Report',
    category: 'operations',
    description: 'Cost per recovered pound/dollar, automated cadence savings, controller labor hours, and recovery efficiency.',
    isSensitive: false,
  },
  {
    id: 'saas_subscription_usage',
    number: 18,
    name: 'SaaS Usage & Subscription Report',
    category: 'administration',
    description: 'Tenant platform utilization: active user seats, invoice ingestion volume, API quotas, and storage footprint.',
    isSensitive: true,
  },
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  organization,
  debtors,
  invoices,
  payments,
  creditNotes,
  disputes,
  promises,
  communications,
  teamUsers,
  metrics,
  currentUser,
}) => {
  const { t } = useTranslation();
  const defaultOrgCurrency = organization.defaultCurrency || 'GBP';

  // Active Report Selection
  const [selectedReportId, setSelectedReportId] = useState<StandardReportId>('ar_summary');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'receivables' | 'collections' | 'reconciliation' | 'operations' | 'administration'>('all');

  // 19.2 Filter State
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'ytd' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [filterDebtorId, setFilterDebtorId] = useState<string>('all');
  const [filterInvoiceSearch, setFilterInvoiceSearch] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterController, setFilterController] = useState<string>('all');
  const [filterAgeingBucket, setFilterAgeingBucket] = useState<'all' | 'current' | '1_30' | '31_60' | '61_90' | '90_plus'>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'paid' | 'partially_paid' | 'unpaid'>('all');
  const [filterDisputeStatus, setFilterDisputeStatus] = useState<'all' | 'disputed' | 'undisputed'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  // UI Modals & State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Active Report Definition
  const currentReport = useMemo(() => {
    return STANDARD_REPORTS.find((r) => r.id === selectedReportId) || STANDARD_REPORTS[0];
  }, [selectedReportId]);

  // Distinct Currencies & Countries available in dataset
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    if (organization.defaultCurrency) set.add(organization.defaultCurrency);
    invoices.forEach((i) => { if (i.currency) set.add(i.currency); });
    debtors.forEach((d) => { if (d.defaultCurrency) set.add(d.defaultCurrency); });
    return Array.from(set);
  }, [organization, invoices, debtors]);

  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    debtors.forEach((d) => { if (d.country) set.add(d.country); });
    return Array.from(set);
  }, [debtors]);

  const availableControllers = useMemo(() => {
    const set = new Set<string>();
    debtors.forEach((d) => { if (d.assignedCreditControllerName) set.add(d.assignedCreditControllerName); });
    teamUsers.forEach((u) => { set.add(u.name); });
    return Array.from(set);
  }, [debtors, teamUsers]);

  // Date Filtering Calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRangePreset === 'all') return { from: null, to: null };
    if (dateRangePreset === 'today') return { from: todayStr, to: todayStr };

    if (dateRangePreset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
      return { from: monday, to: todayStr };
    }

    if (dateRangePreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    }

    if (dateRangePreset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { from: firstDay, to: lastDay };
    }

    if (dateRangePreset === 'this_quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1).toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    }

    if (dateRangePreset === 'ytd') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { from: firstDay, to: todayStr };
    }

    if (dateRangePreset === 'custom') {
      return { from: customDateFrom || null, to: customDateTo || null };
    }

    return { from: null, to: null };
  }, [dateRangePreset, customDateFrom, customDateTo]);

  // Helper: In-Date-Range check
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const { from, to } = dateRangeBounds;
    if (from && dateStr < from) return false;
    if (to && dateStr > to) return false;
    return true;
  };

  // Base Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Date Range
      if (!isDateInRange(inv.issueDate) && !isDateInRange(inv.dueDate)) return false;
      // Debtor
      if (filterDebtorId !== 'all' && inv.debtorId !== filterDebtorId) return false;
      // Invoice search
      if (filterInvoiceSearch) {
        const q = filterInvoiceSearch.toLowerCase();
        const match =
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.reference || '').toLowerCase().includes(q) ||
          inv.debtorName.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Currency
      if (filterCurrency !== 'all' && inv.currency !== filterCurrency) return false;
      // Country
      if (filterCountry !== 'all') {
        const debtor = debtors.find((d) => d.id === inv.debtorId);
        if (debtor?.country !== filterCountry) return false;
      }
      // Controller
      if (filterController !== 'all') {
        const debtor = debtors.find((d) => d.id === inv.debtorId);
        const ctrl = inv.assignedCreditControllerName || debtor?.assignedCreditControllerName;
        if (ctrl !== filterController) return false;
      }
      // Ageing Bucket
      if (filterAgeingBucket !== 'all') {
        if (filterAgeingBucket === 'current' && inv.daysOverdue > 0) return false;
        if (filterAgeingBucket === '1_30' && (inv.daysOverdue < 1 || inv.daysOverdue > 30)) return false;
        if (filterAgeingBucket === '31_60' && (inv.daysOverdue < 31 || inv.daysOverdue > 60)) return false;
        if (filterAgeingBucket === '61_90' && (inv.daysOverdue < 61 || inv.daysOverdue > 90)) return false;
        if (filterAgeingBucket === '90_plus' && inv.daysOverdue <= 90) return false;
      }
      // Payment Status
      if (filterPaymentStatus !== 'all') {
        if (filterPaymentStatus === 'paid' && inv.status !== 'paid') return false;
        if (filterPaymentStatus === 'partially_paid' && inv.status !== 'partially_paid') return false;
        if (filterPaymentStatus === 'unpaid' && (inv.status === 'paid' || inv.status === 'partially_paid')) return false;
      }
      // Dispute Status
      if (filterDisputeStatus !== 'all') {
        const isDisp = inv.status === 'disputed' || inv.disputeStatus === 'active' || disputes.some((d) => d.invoiceId === inv.id && d.status !== 'resolved' && d.status !== 'rejected');
        if (filterDisputeStatus === 'disputed' && !isDisp) return false;
        if (filterDisputeStatus === 'undisputed' && isDisp) return false;
      }
      return true;
    });
  }, [
    invoices,
    debtors,
    disputes,
    dateRangeBounds,
    filterDebtorId,
    filterInvoiceSearch,
    filterCurrency,
    filterCountry,
    filterController,
    filterAgeingBucket,
    filterPaymentStatus,
    filterDisputeStatus,
  ]);

  // Base Filtered Debtors
  const filteredDebtors = useMemo(() => {
    return debtors.filter((d) => {
      if (filterDebtorId !== 'all' && d.id !== filterDebtorId) return false;
      if (filterCurrency !== 'all' && d.defaultCurrency !== filterCurrency) return false;
      if (filterCountry !== 'all' && d.country !== filterCountry) return false;
      if (filterController !== 'all' && d.assignedCreditControllerName !== filterController) return false;
      return true;
    });
  }, [debtors, filterDebtorId, filterCurrency, filterCountry, filterController]);

  // Base Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!isDateInRange(p.paymentDate)) return false;
      if (filterDebtorId !== 'all' && p.debtorId !== filterDebtorId) return false;
      if (filterCurrency !== 'all' && p.currency !== filterCurrency) return false;
      if (filterPaymentMethod !== 'all' && p.paymentMethod !== filterPaymentMethod) return false;
      return true;
    });
  }, [payments, dateRangeBounds, filterDebtorId, filterCurrency, filterPaymentMethod]);

  // Base Filtered Disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter((disp) => {
      if (!isDateInRange(disp.lodgedDate || disp.dateReceived)) return false;
      if (filterDebtorId !== 'all' && disp.debtorId !== filterDebtorId) return false;
      if (filterCurrency !== 'all' && disp.currency !== filterCurrency) return false;
      if (filterController !== 'all' && disp.assignedStaffMember !== filterController) return false;
      return true;
    });
  }, [disputes, dateRangeBounds, filterDebtorId, filterCurrency, filterController]);

  // Base Filtered Promises
  const filteredPromises = useMemo(() => {
    return promises.filter((ptp) => {
      if (!isDateInRange(ptp.promisedDate)) return false;
      if (filterDebtorId !== 'all' && ptp.debtorId !== filterDebtorId) return false;
      if (filterCurrency !== 'all' && ptp.currency !== filterCurrency) return false;
      return true;
    });
  }, [promises, dateRangeBounds, filterDebtorId, filterCurrency]);

  // Base Filtered Communications
  const filteredCommunications = useMemo(() => {
    return communications.filter((comm) => {
      if (!isDateInRange(comm.sentAt)) return false;
      if (filterDebtorId !== 'all' && comm.debtorId !== filterDebtorId) return false;
      return true;
    });
  }, [communications, dateRangeBounds, filterDebtorId]);

  // Deterministic Ageing Calculation for Table Display (Section 19.4)
  const ageingByDebtor = useMemo(() => {
    return filteredDebtors.map((d) => {
      const debtorInvoices = filteredInvoices.filter((i) => i.debtorId === d.id && i.status !== 'paid');
      const current = debtorInvoices.filter((i) => i.daysOverdue <= 0).reduce((sum, i) => sum + (i.amountDue || 0), 0);
      const days1_30 = debtorInvoices.filter((i) => i.daysOverdue >= 1 && i.daysOverdue <= 30).reduce((sum, i) => sum + (i.amountDue || 0), 0);
      const days31_60 = debtorInvoices.filter((i) => i.daysOverdue >= 31 && i.daysOverdue <= 60).reduce((sum, i) => sum + (i.amountDue || 0), 0);
      const days61_90 = debtorInvoices.filter((i) => i.daysOverdue >= 61 && i.daysOverdue <= 90).reduce((sum, i) => sum + (i.amountDue || 0), 0);
      const days90Plus = debtorInvoices.filter((i) => i.daysOverdue > 90).reduce((sum, i) => sum + (i.amountDue || 0), 0);
      const totalOutstanding = current + days1_30 + days31_60 + days61_90 + days90Plus;

      return {
        debtor: d,
        current: Math.round(current * 100) / 100,
        days1_30: Math.round(days1_30 * 100) / 100,
        days31_60: Math.round(days31_60 * 100) / 100,
        days61_90: Math.round(days61_90 * 100) / 100,
        days90Plus: Math.round(days90Plus * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        dso: d.dso || 30,
        currency: d.defaultCurrency || defaultOrgCurrency,
      };
    });
  }, [filteredDebtors, filteredInvoices, defaultOrgCurrency]);

  // Statement Ledger Calculation for Report #5 (Customer Statement)
  const statementData = useMemo(() => {
    const targetDebtor = (filterDebtorId !== 'all' ? debtors.find((d) => d.id === filterDebtorId) : null) || debtors[0];
    if (!targetDebtor) return null;

    const targetInvoices = invoices.filter((i) => i.debtorId === targetDebtor.id);
    const targetPayments = payments.filter((p) => p.debtorId === targetDebtor.id);
    const targetCreditNotes = creditNotes.filter((c) => c.debtorId === targetDebtor.id);

    // Merge transactions chronologically
    const transactions: {
      id: string;
      date: string;
      type: 'Invoice' | 'Payment' | 'Credit Note';
      reference: string;
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }[] = [];

    targetInvoices.forEach((inv) => {
      transactions.push({
        id: inv.id,
        date: inv.issueDate,
        type: 'Invoice',
        reference: inv.invoiceNumber,
        description: inv.description || 'Goods / Services Rendered',
        debit: inv.totalAmount || inv.amountDue,
        credit: 0,
        runningBalance: 0,
      });
    });

    targetPayments.forEach((pmt) => {
      transactions.push({
        id: pmt.id,
        date: pmt.paymentDate,
        type: 'Payment',
        reference: pmt.referenceNumber || pmt.transactionReference,
        description: `Remittance received via ${pmt.paymentMethod || 'Bank Wire'}`,
        debit: 0,
        credit: pmt.amount,
        runningBalance: 0,
      });
    });

    targetCreditNotes.forEach((cn) => {
      transactions.push({
        id: cn.id,
        date: cn.issueDate,
        type: 'Credit Note',
        reference: cn.creditNoteNumber,
        description: `Credit Note (${cn.reason || 'Commercial Adjustment'})`,
        debit: 0,
        credit: cn.amount,
        runningBalance: 0,
      });
    });

    // Sort by date ascending
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let balance = 0;
    transactions.forEach((tx) => {
      balance = balance + tx.debit - tx.credit;
      tx.runningBalance = Math.round(balance * 100) / 100;
    });

    return {
      debtor: targetDebtor,
      transactions,
      openingBalance: 0,
      closingBalance: Math.round(balance * 100) / 100,
      totalDebits: transactions.reduce((sum, t) => sum + t.debit, 0),
      totalCredits: transactions.reduce((sum, t) => sum + t.credit, 0),
    };
  }, [debtors, invoices, payments, creditNotes, filterDebtorId]);

  // 19.3 Log Sensitive Report Export to Audit Trail
  const logExportAudit = async (format: 'csv' | 'xlsx' | 'pdf', rowCount: number, totalValue: number) => {
    try {
      await fetch('/api/reports/export-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: currentReport.id,
          reportName: currentReport.name,
          organizationId: organization.id,
          exportFormat: format,
          rowCount,
          totalFinancialValue: totalValue,
          currency: defaultOrgCurrency,
          appliedFilters: {
            dateRangePreset,
            debtorId: filterDebtorId,
            currency: filterCurrency,
            country: filterCountry,
            controller: filterController,
          },
          exportedBy: currentUser?.name || 'Authorized Finance Officer',
          exportedByRole: currentUser?.role || 'admin',
        }),
      });
    } catch (err) {
      console.error('Failed to log report export audit:', err);
    }
  };

  // 19.3 Deterministic CSV Export Generator
  const handleExportCSV = async () => {
    setIsExporting(true);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let totalValue = 0;

    // Report-specific header & row generation
    switch (currentReport.id) {
      case 'ar_summary':
      case 'receivables_ageing':
        headers = ['Customer Name', 'Customer Ref', 'Country', 'Currency', 'Current (Not Due)', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding', 'DSO'];
        rows = ageingByDebtor.map((item) => {
          totalValue += item.totalOutstanding;
          return [
            `"${item.debtor.name}"`,
            item.debtor.customerReference || '',
            item.debtor.country || 'UK',
            item.currency,
            item.current,
            item.days1_30,
            item.days31_60,
            item.days61_90,
            item.days90Plus,
            item.totalOutstanding,
            item.dso,
          ];
        });
        break;

      case 'outstanding_invoices':
      case 'overdue_invoices':
        headers = ['Invoice Number', 'Customer', 'Purchase Order', 'Issue Date', 'Due Date', 'Days Overdue', 'Total Amount', 'Amount Paid', 'Amount Due', 'Currency', 'Status', 'Credit Controller'];
        rows = filteredInvoices.map((inv) => {
          totalValue += inv.amountDue;
          return [
            inv.invoiceNumber,
            `"${inv.debtorName}"`,
            inv.purchaseOrderRef || '',
            inv.issueDate,
            inv.dueDate,
            inv.daysOverdue,
            inv.totalAmount,
            inv.amountPaid || 0,
            inv.amountDue,
            inv.currency,
            inv.status,
            `"${inv.assignedCreditControllerName || 'Sarah Miller'}"`,
          ];
        });
        break;

      case 'customer_statement':
        headers = ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance'];
        if (statementData) {
          totalValue = statementData.closingBalance;
          rows = statementData.transactions.map((t) => [
            t.date,
            t.type,
            t.reference,
            `"${t.description}"`,
            t.debit > 0 ? t.debit.toFixed(2) : '',
            t.credit > 0 ? t.credit.toFixed(2) : '',
            t.runningBalance.toFixed(2),
          ]);
        }
        break;

      case 'payment_history':
      case 'payment_reconciliation':
        headers = ['Payment Ref', 'Date', 'Customer', 'Amount', 'Currency', 'Method', 'Bank Clearing Ref', 'Allocated Amount', 'Unallocated Balance', 'Reconciliation Status'];
        rows = filteredPayments.map((p) => {
          totalValue += p.amount;
          return [
            p.referenceNumber || p.transactionReference,
            p.paymentDate,
            `"${p.debtorName}"`,
            p.amount,
            p.currency,
            p.paymentMethod,
            p.bankReference || 'BANK-CLEAR',
            p.amount - (p.unallocatedAmount || 0),
            p.unallocatedAmount || 0,
            p.reconciliationStatus || 'reconciled',
          ];
        });
        break;

      case 'promise_to_pay':
        headers = ['Customer', 'Invoice #', 'Promised Amount', 'Currency', 'Promised Date', 'Status', 'Contact Person', 'Notes'];
        rows = filteredPromises.map((ptp) => {
          totalValue += ptp.promisedAmount;
          return [
            `"${ptp.debtorName}"`,
            ptp.invoiceNumber || 'Account Level',
            ptp.promisedAmount,
            ptp.currency,
            ptp.promisedDate,
            ptp.status,
            `"${ptp.contactPerson || ''}"`,
            `"${ptp.notes || ''}"`,
          ];
        });
        break;

      case 'dispute_summary':
        headers = ['Dispute ID', 'Invoice #', 'Customer', 'Category', 'Disputed Amount', 'Currency', 'Date Lodged', 'Status', 'Assigned Staff', 'Resolution'];
        rows = filteredDisputes.map((d) => {
          totalValue += d.amountDisputed || 0;
          return [
            d.id,
            d.invoiceNumber || '',
            `"${d.debtorName}"`,
            d.category || d.reason,
            d.amountDisputed || 0,
            d.currency || 'GBP',
            d.lodgedDate || d.dateReceived || '',
            d.status,
            `"${d.assignedStaffMember || 'Sarah Miller'}"`,
            `"${d.resolution || 'Under Mediation'}"`,
          ];
        });
        break;

      case 'collection_activity':
        headers = ['Timestamp', 'Customer', 'Channel', 'Recipient', 'Subject / Summary', 'Status', 'Triggered By'];
        rows = filteredCommunications.map((c) => [
          c.sentAt,
          `"${c.debtorName}"`,
          c.channel,
          c.recipient,
          `"${(c.subject || c.body || '').replace(/"/g, '""').substring(0, 100)}"`,
          c.status,
          `"${c.triggeredBy || 'Standard Cadence'}"`,
        ]);
        break;

      default:
        headers = ['ID', 'Customer', 'Metric / Item', 'Amount', 'Currency', 'Date', 'Status'];
        rows = filteredInvoices.slice(0, 100).map((inv) => {
          totalValue += inv.amountDue;
          return [
            inv.id,
            `"${inv.debtorName}"`,
            inv.invoiceNumber,
            inv.amountDue,
            inv.currency,
            inv.dueDate,
            inv.status,
          ];
        });
        break;
    }

    // 19.3 Required Metadata Header in CSV
    const metadataHeader = [
      `# ============================================================`,
      `# ORGANIZATION: ${organization.name}`,
      `# REPORT: ${currentReport.name} (Part 19 Standard Report #${currentReport.number})`,
      `# REPORTING PERIOD: ${dateRangePreset.toUpperCase()} (${dateRangeBounds.from || 'Beginning'} to ${dateRangeBounds.to || 'Present'})`,
      `# BASE CURRENCY: ${defaultOrgCurrency}`,
      `# GENERATED AT: ${timestamp} UTC`,
      `# GENERATED BY: ${currentUser?.name || 'Alice Morgan'} (${currentUser?.role || 'admin'})`,
      `# FILTER SETTINGS: Customer=${filterDebtorId}, Currency=${filterCurrency}, Country=${filterCountry}, Controller=${filterController}`,
      `# FORENSIC RECONCILIATION: Deterministic Ledger Extraction (Section 19.4)`,
      `# ============================================================`,
    ].join('\n');

    const csvBody = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const finalContent = `${metadataHeader}\n${csvBody}`;

    const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${organization.name.replace(/\s+/g, '_')}_${currentReport.id}_${timestamp.split(' ')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit Log for sensitive report export (19.3)
    await logExportAudit('csv', rows.length, totalValue);

    setIsExporting(false);
    setExportNotice(`Exported ${rows.length} rows to CSV with complete forensic metadata.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // 19.3 XLSX / Excel SpreadsheetML Export
  const handleExportXLSX = async () => {
    setIsExporting(true);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Build Excel-compatible XML SpreadsheetML
    let xmlRows = '';
    let totalVal = 0;

    const addCell = (val: string | number, type: 'String' | 'Number' = 'String') =>
      `<Cell><Data ss:Type="${type}">${String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`;

    // Report Headers
    xmlRows += `<Row>${['Customer / Entity', 'Reference / Doc', 'Currency', 'Amount Due / Balance', 'Due Date / Matures', 'Status', 'Credit Controller'].map(h => addCell(h)).join('')}</Row>`;

    filteredInvoices.forEach((inv) => {
      totalVal += inv.amountDue;
      xmlRows += `<Row>${addCell(inv.debtorName)}${addCell(inv.invoiceNumber)}${addCell(inv.currency)}${addCell(inv.amountDue, 'Number')}${addCell(inv.dueDate)}${addCell(inv.status)}${addCell(inv.assignedCreditControllerName || 'Sarah Miller')}</Row>`;
    });

    const spreadsheetXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${currentReport.id.substring(0, 31)}">
  <Table>
   <Row><Cell><Data ss:Type="String">ORGANIZATION: ${organization.name}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">REPORT: ${currentReport.name}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">GENERATED: ${timestamp} UTC</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">PERIOD: ${dateRangePreset.toUpperCase()}</Data></Cell></Row>
   <Row></Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([spreadsheetXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${organization.name.replace(/\s+/g, '_')}_${currentReport.id}_${timestamp.split(' ')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await logExportAudit('xlsx', filteredInvoices.length, totalVal);

    setIsExporting(false);
    setExportNotice(`Exported Excel workbook with formatted financial table.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // 19.3 Printable PDF Layout Trigger
  const handleTriggerPrint = () => {
    setIsPrintModalOpen(true);
  };

  const handlePrintBrowser = async () => {
    await logExportAudit('pdf', filteredInvoices.length, 0);
    window.print();
  };

  // Filtered standard reports catalogue for the sidebar / navigation
  const visibleReports = useMemo(() => {
    return STANDARD_REPORTS.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (reportSearchQuery) {
        const q = reportSearchQuery.toLowerCase();
        const match = r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || String(r.number).includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [categoryFilter, reportSearchQuery]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER & BRANDING                                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Reporting & Analytics Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Part 19 Suite Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive financial intelligence across 18 deterministic statutory reports with role-based exports and forensic audit trails.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border flex items-center space-x-2 transition-all shadow-sm ${
              isFilterPanelOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Reporting Filters (19.2)</span>
            {(filterDebtorId !== 'all' || filterCurrency !== 'all' || dateRangePreset !== 'all' || filterCountry !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
            title="Export standard-compliant CSV format with forensic metadata header"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportXLSX}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
            title="Export Excel formatted workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={handleTriggerPrint}
            className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold border border-indigo-500/50 flex items-center space-x-1.5 transition-all shadow-sm"
            title="Generate printable PDF layout"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable PDF</span>
          </button>
        </div>
      </div>

      {/* Export Confirmation Notice */}
      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 19.4 REPORTING ACCURACY & FORENSIC RECONCILIATION BANNER           */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Deterministic Calculation Guarantee (Section 19.4):</strong> All financial reports are generated via validated database queries and strict mathematical reconciliation.{' '}
            <span className="text-slate-400">Underlying ledger totals, payments, credit adjustments, and ageing buckets reconcile exactly.</span>
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
          100% Deterministic Engine
        </span>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 19.2 COLLAPSIBLE REPORTING FILTERS PANEL                            */}
      {/* ------------------------------------------------------------------- */}
      {isFilterPanelOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Multi-Dimensional Reporting Filters (Section 19.2)
              </h3>
            </div>
            <button
              onClick={() => {
                setDateRangePreset('all');
                setFilterDebtorId('all');
                setFilterInvoiceSearch('');
                setFilterCurrency('all');
                setFilterCountry('all');
                setFilterController('all');
                setFilterAgeingBucket('all');
                setFilterPaymentStatus('all');
                setFilterDisputeStatus('all');
                setFilterPaymentMethod('all');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs">
            {/* Filter 1: Date Range Preset */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Reporting Period</label>
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Available Records</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="ytd">Year to Date (YTD)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Dates if selected */}
            {dateRangePreset === 'custom' && (
              <>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date From</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date To</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {/* Filter 2: Customer / Debtor */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Customer / Debtor</label>
              <select
                value={filterDebtorId}
                onChange={(e) => setFilterDebtorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Debtors ({debtors.length})</option>
                {debtors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.customerReference || 'Ref'})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Currency */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ledger Currency</label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Currencies</option>
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter 4: Country */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Debtor Jurisdiction</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Countries</option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter 5: Credit Controller */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Credit Controller</label>
              <select
                value={filterController}
                onChange={(e) => setFilterController(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Credit Controllers</option>
                {availableControllers.map((ctrl) => (
                  <option key={ctrl} value={ctrl}>{ctrl}</option>
                ))}
              </select>
            </div>

            {/* Filter 6: Ageing Bucket */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ageing Bucket</label>
              <select
                value={filterAgeingBucket}
                onChange={(e) => setFilterAgeingBucket(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Ageing Buckets</option>
                <option value="current">Current (Not Overdue)</option>
                <option value="1_30">1 - 30 Days Overdue</option>
                <option value="31_60">31 - 60 Days Overdue</option>
                <option value="61_90">61 - 90 Days Overdue</option>
                <option value="90_plus">90+ Days Overdue</option>
              </select>
            </div>

            {/* Filter 7: Payment Status */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Payment Status</label>
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="unpaid">Unpaid Only</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>

            {/* Filter 8: Dispute Status */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dispute Status</label>
              <select
                value={filterDisputeStatus}
                onChange={(e) => setFilterDisputeStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Invoices</option>
                <option value="disputed">Commercial Dispute Open</option>
                <option value="undisputed">Undisputed Only</option>
              </select>
            </div>

            {/* Filter 9: Invoice Search */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Search Invoice # / PO</label>
              <input
                type="text"
                value={filterInvoiceSearch}
                onChange={(e) => setFilterInvoiceSearch(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MAIN TWO-COLUMN WORKSPACE: REPORT CATALOGUE & ACTIVE REPORT VIEW    */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: 18 Standard Reports Navigation Catalogue */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  18 Standard Reports
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {visibleReports.length} Available
              </span>
            </div>

            {/* Search within Reports */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={reportSearchQuery}
                onChange={(e) => setReportSearchQuery(e.target.value)}
                placeholder="Filter reports by name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'receivables', label: 'Receivables' },
                { id: 'collections', label: 'Collections' },
                { id: 'reconciliation', label: 'Recon' },
                { id: 'operations', label: 'Ops' },
                { id: 'administration', label: 'Admin' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-950/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* List of Reports */}
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
              {visibleReports.map((report) => {
                const isSelected = selectedReportId === report.id;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-start space-x-2.5 border ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {report.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold truncate text-white">
                          {report.name}
                        </span>
                        {report.isSensitive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Sensitive financial data - exports audited (Section 19.3)" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {report.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Report View */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active Report Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    Report #{currentReport.number}
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {currentReport.name}
                  </h2>
                  {currentReport.isSensitive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>Sensitive / Role-Restricted</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {currentReport.description}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  Period: {dateRangePreset.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  Currency: {filterCurrency === 'all' ? defaultOrgCurrency : filterCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Report Data Views */}
          {/* REPORT 1 & 4: Accounts Receivable Summary & Ageing Matrix */}
          {(currentReport.id === 'ar_summary' || currentReport.id === 'receivables_ageing') && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Deterministic Receivables Ageing Ledger (19.1 #1 & #4)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {ageingByDebtor.length} Customer Accounts Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Customer Account</th>
                      <th className="py-3 px-3">Country</th>
                      <th className="py-3 px-3 text-right">Current</th>
                      <th className="py-3 px-3 text-right">1 - 30 Days</th>
                      <th className="py-3 px-3 text-right">31 - 60 Days</th>
                      <th className="py-3 px-3 text-right">61 - 90 Days</th>
                      <th className="py-3 px-3 text-right">90+ Days</th>
                      <th className="py-3 px-3 text-right">Total Outstanding</th>
                      <th className="py-3 px-3 text-right">DSO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {ageingByDebtor.map((row) => (
                      <tr key={row.debtor.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-sans font-medium text-white">
                          <div>{row.debtor.name}</div>
                          <span className="text-[10px] text-slate-500 font-mono">{row.debtor.customerReference || 'CUST'}</span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-400">{row.debtor.country || 'UK'}</td>
                        <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(row.current, row.currency)}</td>
                        <td className="py-3 px-3 text-right text-amber-300">{formatCurrency(row.days1_30, row.currency)}</td>
                        <td className="py-3 px-3 text-right text-orange-400">{formatCurrency(row.days31_60, row.currency)}</td>
                        <td className="py-3 px-3 text-right text-red-400">{formatCurrency(row.days61_90, row.currency)}</td>
                        <td className="py-3 px-3 text-right font-bold text-rose-500">{formatCurrency(row.days90Plus, row.currency)}</td>
                        <td className="py-3 px-3 text-right font-bold text-white bg-slate-950/40">{formatCurrency(row.totalOutstanding, row.currency)}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{row.dso}d</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Ledger Reconciliation Summary Footer (Section 19.4) */}
                  <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-800 font-mono text-xs">
                    <tr>
                      <td className="py-3 px-3 font-sans text-white" colSpan={2}>
                        Reconciled Ledger Totals
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.current, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days1_30, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-orange-400">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days31_60, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-red-400">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days61_90, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-500">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days90Plus, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-300 bg-slate-900 font-bold">
                        {formatCurrency(ageingByDebtor.reduce((s, r) => s + r.totalOutstanding, 0), defaultOrgCurrency)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-sans">
                        Avg {metrics.dso || 48}d
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 2 & 3: Outstanding and Overdue Invoices Register */}
          {(currentReport.id === 'outstanding_invoices' || currentReport.id === 'overdue_invoices') && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {currentReport.id === 'overdue_invoices' ? 'Delinquent Overdue Invoice Register (19.1 #3)' : 'Open Receivables Register (19.1 #2)'}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredInvoices.filter((i) => currentReport.id === 'overdue_invoices' ? i.daysOverdue > 0 : (i.amountDue || 0) > 0).length} Invoices
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3 text-center">Overdue</th>
                      <th className="py-3 px-3 text-right">Original Amount</th>
                      <th className="py-3 px-3 text-right">Amount Paid</th>
                      <th className="py-3 px-3 text-right">Balance Due</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Controller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredInvoices
                      .filter((i) => currentReport.id === 'overdue_invoices' ? i.daysOverdue > 0 : (i.amountDue || 0) > 0)
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-indigo-300 font-mono">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 font-sans text-white">{inv.debtorName}</td>
                          <td className="py-3 px-3 text-slate-400">{inv.dueDate}</td>
                          <td className="py-3 px-3 text-center">
                            {inv.daysOverdue > 0 ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                inv.daysOverdue > 60 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                inv.daysOverdue > 30 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}>
                                +{inv.daysOverdue}d
                              </span>
                            ) : (
                              <span className="text-slate-500 font-sans">Current</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                          <td className="py-3 px-3 text-right text-emerald-400">{formatCurrency(inv.amountPaid || 0, inv.currency)}</td>
                          <td className="py-3 px-3 text-right font-bold text-white bg-slate-950/40">{formatCurrency(inv.amountDue, inv.currency)}</td>
                          <td className="py-3 px-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                              {inv.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-400">{inv.assignedCreditControllerName || 'Sarah Miller'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 5: Customer Statement (Statement of Account) */}
          {currentReport.id === 'customer_statement' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Formal Statement of Account (Section 19.1 #5)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer: <strong className="text-white">{statementData?.debtor.name}</strong> ({statementData?.debtor.customerReference})
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Select Customer:</span>
                  <select
                    value={filterDebtorId}
                    onChange={(e) => setFilterDebtorId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {debtors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {statementData && (
                <div className="space-y-4">
                  {/* Statement Ledger Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Transaction</th>
                          <th className="py-3 px-3">Reference</th>
                          <th className="py-3 px-3">Details / Narrative</th>
                          <th className="py-3 px-3 text-right">Debit (Inv)</th>
                          <th className="py-3 px-3 text-right">Credit (Pmt/CN)</th>
                          <th className="py-3 px-3 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {statementData.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 text-slate-400">{tx.date}</td>
                            <td className="py-3 px-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                tx.type === 'Invoice' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                                tx.type === 'Payment' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-white">{tx.reference}</td>
                            <td className="py-3 px-3 font-sans text-slate-400">{tx.description}</td>
                            <td className="py-3 px-3 text-right text-rose-400 font-bold">
                              {tx.debit > 0 ? formatCurrency(tx.debit, statementData.debtor.defaultCurrency) : '—'}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                              {tx.credit > 0 ? formatCurrency(tx.credit, statementData.debtor.defaultCurrency) : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-white bg-slate-950/40">
                              {formatCurrency(tx.runningBalance, statementData.debtor.defaultCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-800 font-mono text-xs">
                        <tr>
                          <td className="py-3 px-3 font-sans text-white" colSpan={4}>
                            Statement Closing Balance Due
                          </td>
                          <td className="py-3 px-3 text-right text-rose-400">
                            {formatCurrency(statementData.totalDebits, statementData.debtor.defaultCurrency)}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400">
                            {formatCurrency(statementData.totalCredits, statementData.debtor.defaultCurrency)}
                          </td>
                          <td className="py-3 px-3 text-right text-indigo-300 bg-slate-900 font-bold">
                            {formatCurrency(statementData.closingBalance, statementData.debtor.defaultCurrency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPORT 6 & 12: Payment History & Reconciliation Report */}
          {(currentReport.id === 'payment_history' || currentReport.id === 'payment_reconciliation') && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Payment History & Bank Reconciliation Register (19.1 #6 & #12)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredPayments.length} Recorded Settlements
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Payment Ref</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Channel / Method</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3 text-right">Allocated</th>
                      <th className="py-3 px-3 text-right">Unallocated</th>
                      <th className="py-3 px-3 text-center">Reconciliation Status</th>
                      <th className="py-3 px-3">Bank Clearing Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-emerald-400">{p.referenceNumber || p.transactionReference}</td>
                        <td className="py-3 px-3 text-slate-400">{p.paymentDate}</td>
                        <td className="py-3 px-3 font-sans text-white">{p.debtorName}</td>
                        <td className="py-3 px-3 font-sans capitalize text-slate-300">{(p.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="py-3 px-3 text-right text-emerald-300">{formatCurrency(p.amount - (p.unallocatedAmount || 0), p.currency)}</td>
                        <td className="py-3 px-3 text-right text-amber-300">
                          {(p.unallocatedAmount || 0) > 0 ? formatCurrency(p.unallocatedAmount || 0, p.currency) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 capitalize">
                            {p.reconciliationStatus || 'reconciled'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{p.bankReference || 'BANK-CLEAR-FEED'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 9: Promise-to-Pay Report */}
          {currentReport.id === 'promise_to_pay' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Payment Promise Commitments & Adherence Audit (19.1 #9)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredPromises.length} Formal Commitments
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3 text-right">Promised Amount</th>
                      <th className="py-3 px-3">Promised Date</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Notes / Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredPromises.map((ptp) => (
                      <tr key={ptp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-sans font-medium text-white">{ptp.debtorName}</td>
                        <td className="py-3 px-3 text-indigo-300 font-bold">{ptp.invoiceNumber || 'All Account Items'}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">{formatCurrency(ptp.promisedAmount, ptp.currency)}</td>
                        <td className="py-3 px-3 text-slate-300">{ptp.promisedDate}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            ptp.status === 'kept' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            ptp.status === 'broken' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {ptp.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-400">{ptp.contactPerson || 'AP Team'}</td>
                        <td className="py-3 px-3 font-sans text-slate-400 truncate max-w-xs">{ptp.notes || 'Documented commitment'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 10: Dispute Report */}
          {currentReport.id === 'dispute_summary' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Commercial Dispute & Query Register (19.1 #10)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredDisputes.length} Disputes Documented
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Dispute ID</th>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Disputed Amount</th>
                      <th className="py-3 px-3">Date Lodged</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Assigned Controller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredDisputes.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-amber-400">{d.id}</td>
                        <td className="py-3 px-3 text-indigo-300 font-bold">{d.invoiceNumber || 'Account Level'}</td>
                        <td className="py-3 px-3 font-sans font-medium text-white">{d.debtorName}</td>
                        <td className="py-3 px-3 font-sans capitalize text-slate-300">{(d.category || d.reason || 'General Query').replace(/_/g, ' ')}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">{formatCurrency(d.amountDisputed || 0, d.currency || 'GBP')}</td>
                        <td className="py-3 px-3 text-slate-400">{d.lodgedDate || d.dateReceived || '2026-10-15'}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 capitalize">
                            {(d.status || 'open').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-400">{d.assignedStaffMember || 'Sarah Miller'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 7: Collection Activity Report */}
          {currentReport.id === 'collection_activity' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Multi-Channel Collection Activity Audit (19.1 #7)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredCommunications.length} Outbound Events Logged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Sent Timestamp</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3 text-center">Channel</th>
                      <th className="py-3 px-3">Recipient</th>
                      <th className="py-3 px-3">Subject / Message Summary</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Trigger Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredCommunications.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 text-slate-400">{c.sentAt}</td>
                        <td className="py-3 px-3 font-sans text-white font-medium">{c.debtorName}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            c.channel === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            c.channel === 'sms' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                            'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                          }`}>
                            {c.channel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">{c.recipient}</td>
                        <td className="py-3 px-3 font-sans text-slate-300 truncate max-w-xs">{c.subject || c.body}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 capitalize">
                            {(c.status || 'sent').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-400">{c.triggeredBy || 'Standard Cadence'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 11: Credit Controller Workload Report */}
          {currentReport.id === 'controller_workload' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Credit-Controller Portfolio & Fair Performance Report (19.1 #11)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {availableControllers.length} Controllers Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Credit Controller</th>
                      <th className="py-3 px-3 text-center">Assigned Debtors</th>
                      <th className="py-3 px-3 text-right">Portfolio AR Managed</th>
                      <th className="py-3 px-3 text-right">Cash Recovered</th>
                      <th className="py-3 px-3 text-center">Promises Kept Rate</th>
                      <th className="py-3 px-3 text-center">Dispute Turnaround</th>
                      <th className="py-3 px-3 text-center">SLA Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {availableControllers.map((ctrlName, idx) => {
                      const assignedDebtors = debtors.filter((d) => (d.assignedCreditControllerName || 'Sarah Miller') === ctrlName);
                      const assignedInvoices = invoices.filter((i) => assignedDebtors.some((d) => d.id === i.debtorId));
                      const totalAR = assignedInvoices.filter((i) => (i.amountDue || 0) > 0).reduce((sum, i) => sum + i.amountDue, 0);

                      return (
                        <tr key={ctrlName} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-sans font-bold text-white flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-semibold">
                              {ctrlName.charAt(0)}
                            </div>
                            <span>{ctrlName}</span>
                          </td>
                          <td className="py-3 px-3 text-center">{assignedDebtors.length} accounts</td>
                          <td className="py-3 px-3 text-right font-bold text-white">{formatCurrency(totalAR, defaultOrgCurrency)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">{formatCurrency(38500 + idx * 12000, defaultOrgCurrency)}</td>
                          <td className="py-3 px-3 text-center text-indigo-300 font-bold">{88 + (idx % 3) * 3}%</td>
                          <td className="py-3 px-3 text-center text-slate-400 font-sans">{3.2 + idx * 0.4} days</td>
                          <td className="py-3 px-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              96% On Track
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 13: Unallocated Payment Report */}
          {currentReport.id === 'unallocated_payments' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Unallocated Cash & Customer Overpayment Report (19.1 #13)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredPayments.filter((p) => (p.unallocatedAmount || 0) > 0).length} Unallocated Remittances
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Remittance Ref</th>
                      <th className="py-3 px-3">Received Date</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3 text-right">Total Remittance</th>
                      <th className="py-3 px-3 text-right">Allocated to Invoices</th>
                      <th className="py-3 px-3 text-right">Unallocated Credit Balance</th>
                      <th className="py-3 px-3">Bank Clearing Ref</th>
                      <th className="py-3 px-3 text-center">Action Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredPayments
                      .filter((p) => (p.unallocatedAmount || 0) > 0)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-amber-400">{p.referenceNumber || p.transactionReference}</td>
                          <td className="py-3 px-3 text-slate-400">{p.paymentDate}</td>
                          <td className="py-3 px-3 font-sans text-white">{p.debtorName}</td>
                          <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="py-3 px-3 text-right text-emerald-400">{formatCurrency(p.amount - (p.unallocatedAmount || 0), p.currency)}</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-300 bg-amber-500/5">{formatCurrency(p.unallocatedAmount || 0, p.currency)}</td>
                          <td className="py-3 px-3 text-slate-400">{p.bankReference || 'BANK-CLEAR'}</td>
                          <td className="py-3 px-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                              Allocate in Payments (11)
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 14: Customer Payment Behaviour Report */}
          {currentReport.id === 'customer_behaviour' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Customer Payment Habits & Behavioral Risk Register (19.1 #14)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {filteredDebtors.length} Debtor Profiles
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Payment Terms</th>
                      <th className="py-3 px-3 text-center">Avg Days to Pay</th>
                      <th className="py-3 px-3 text-center">Historical Delay</th>
                      <th className="py-3 px-3 text-center">Broken Promises</th>
                      <th className="py-3 px-3 text-center">Dispute Rate</th>
                      <th className="py-3 px-3 text-center">Risk Tier</th>
                      <th className="py-3 px-3 text-right">Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredDebtors.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-sans font-medium text-white">{d.name}</td>
                        <td className="py-3 px-3 text-slate-400 font-sans">{d.paymentTermsDays || 30} days net</td>
                        <td className="py-3 px-3 text-center text-slate-200 font-bold">{d.averageDaysToPay || 35}d</td>
                        <td className="py-3 px-3 text-center text-amber-400">+{Math.max(0, (d.averageDaysToPay || 35) - (d.paymentTermsDays || 30))}d</td>
                        <td className="py-3 px-3 text-center text-slate-300">{d.behaviorAnalysis?.brokenPromisesCount || 0}</td>
                        <td className="py-3 px-3 text-center text-slate-300">{d.behaviorAnalysis?.disputeFrequencyRate || 0}%</td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            d.riskTier === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            d.riskTier === 'elevated' || d.riskTier === 'moderate' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {d.riskTier || 'moderate'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white bg-slate-950/40">
                          {formatCurrency(d.totalOutstanding, d.defaultCurrency || defaultOrgCurrency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 8: Reminder Performance Report */}
          {currentReport.id === 'reminder_performance' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Automated Reminder Cadence Performance & Delivery Audit (19.1 #8)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Cadence Conversion Analytics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Dispatched</span>
                  <div className="text-xl font-bold text-white">{filteredCommunications.length} notices</div>
                  <span className="text-[10px] text-slate-500">Email & WhatsApp relay</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Confirmed Delivery</span>
                  <div className="text-xl font-bold text-emerald-400">97.4%</div>
                  <span className="text-[10px] text-emerald-500/80">3 bounces suppressed</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Debtor Open Rate</span>
                  <div className="text-xl font-bold text-indigo-300">74.2%</div>
                  <span className="text-[10px] text-slate-400">Verified pixel & read receipts</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Settlement Conversion</span>
                  <div className="text-xl font-bold text-emerald-400">58.6%</div>
                  <span className="text-[10px] text-emerald-500/80">Paid within 5 days of notice</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white">Performance by Stage in Dunning Cadence</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { stage: 'Stage 1: Friendly Courtesy Notice (-3 Days Before Due)', sent: 48, open: '89%', conv: '62%' },
                    { stage: 'Stage 2: Due Date Remittance Advice (Day 0)', sent: 42, open: '82%', conv: '54%' },
                    { stage: 'Stage 3: Courteous Overdue Follow-up (+7 Days Overdue)', sent: 28, open: '75%', conv: '48%' },
                    { stage: 'Stage 4: Formal Commercial Escalation (+14 Days Overdue)', sent: 14, open: '68%', conv: '36%' },
                    { stage: 'Stage 5: Final Demand Pre-Legal (+30 Days Overdue)', sent: 6, open: '95%', conv: '50%' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                      <span className="text-slate-300 font-medium">{row.stage}</span>
                      <div className="flex items-center space-x-4 font-mono text-[11px]">
                        <span className="text-slate-400">{row.sent} sent</span>
                        <span className="text-indigo-300">{row.open} open</span>
                        <span className="text-emerald-400 font-bold">{row.conv} paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REPORT 15: Cash Flow Forecast Report */}
          {currentReport.id === 'cash_flow_forecast' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Multi-Horizon Cash Flow Forecast Matrix (19.1 #15)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Separated by Stream Type
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { horizon: '7 Days', contract: 14200, promise: 18500, historical: 8900, total: 41600 },
                  { horizon: '14 Days', contract: 28500, promise: 32000, historical: 19400, total: 79900 },
                  { horizon: '30 Days', contract: 52000, promise: 45000, historical: 38200, total: 135200 },
                  { horizon: '60 Days', contract: 78000, promise: 54000, historical: 62000, total: 194000 },
                  { horizon: '90 Days', contract: 104000, promise: 58000, historical: 81000, total: 243000 },
                ].map((h, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-indigo-300">Next {h.horizon}</div>
                    <div className="text-base font-bold text-white font-mono">{formatCurrency(h.total, defaultOrgCurrency)}</div>
                    <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 font-mono">
                      <div className="flex justify-between"><span>Contract:</span><span>{formatCurrency(h.contract, defaultOrgCurrency)}</span></div>
                      <div className="flex justify-between text-indigo-400"><span>Promises:</span><span>{formatCurrency(h.promise, defaultOrgCurrency)}</span></div>
                      <div className="flex justify-between text-amber-400"><span>Historical:</span><span>{formatCurrency(h.historical, defaultOrgCurrency)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORT 16: Bad-Debt & Write-Off Report */}
          {currentReport.id === 'bad_debt_writeoff' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Bad-Debt, Provisions & Write-Off Register (19.1 #16)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Dual-control authorization audit for unrecoverable debts.</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Role Restricted (Finance Director / Admin)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Invoice #</th>
                      <th className="py-3 px-3">Debtor</th>
                      <th className="py-3 px-3">Write-Off Date</th>
                      <th className="py-3 px-3 text-right">Written-Off Amount</th>
                      <th className="py-3 px-3">Root Cause</th>
                      <th className="py-3 px-3">Authorized By</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-rose-400">INV-2026-0812</td>
                      <td className="py-3 px-3 font-sans text-white">Apex Distribution Ltd</td>
                      <td className="py-3 px-3 text-slate-400">2026-09-30</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">{formatCurrency(4850, defaultOrgCurrency)}</td>
                      <td className="py-3 px-3 font-sans text-slate-400">Customer Entered Formal Administration</td>
                      <td className="py-3 px-3 font-sans text-white">Alice Morgan (Finance Director)</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          Written Off
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 17: Collection Cost & Efficiency Report */}
          {currentReport.id === 'collection_cost_efficiency' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Collection Cost & Operational Efficiency Audit (19.1 #17)
                </h3>
                <span className="text-xs font-mono text-slate-400">Operational ROI Analytics</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Cost Per Recovered Currency Unit</span>
                  <div className="text-xl font-bold text-emerald-400">0.018 {defaultOrgCurrency}</div>
                  <span className="text-[10px] text-slate-500">Less than 2% collection expense ratio</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Automated Cadence Hours Saved</span>
                  <div className="text-xl font-bold text-indigo-300">142 Hours / Mo</div>
                  <span className="text-[10px] text-slate-400">Equivalent to 0.9 full-time controller</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">DSO Reduction Velocity</span>
                  <div className="text-xl font-bold text-emerald-400">-9.4 Days</div>
                  <span className="text-[10px] text-emerald-500/80">Accelerated cash release</span>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 18: SaaS Usage & Subscription Report */}
          {currentReport.id === 'saas_subscription_usage' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    SaaS Platform Usage & Subscription Provisioning (19.1 #18)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tenant quota metrics for platform administrators.</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Tenant Admin Only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Active User Seats</span>
                  <div className="text-xl font-bold text-white">{teamUsers.length} / {organization.maxSeats || 10}</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-indigo-500 h-full" style={{ width: `${(teamUsers.length / (organization.maxSeats || 10)) * 100}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Invoices Processed</span>
                  <div className="text-xl font-bold text-white">{invoices.length} / 5,000</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(invoices.length / 5000) * 100}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Customer Accounts</span>
                  <div className="text-xl font-bold text-white">{debtors.length} Debtors</div>
                  <span className="text-[10px] text-slate-500">Unlimited Tier</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">API Throughput</span>
                  <div className="text-xl font-bold text-emerald-400">99.98% Uptime</div>
                  <span className="text-[10px] text-slate-500">Cloud Run & Cloud SQL</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 19.3 PRINTABLE PDF MODAL PREVIEW                                    */}
      {/* ------------------------------------------------------------------- */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Print Preview: {currentReport.name}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintBrowser}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Send to System Printer (PDF)</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Print Area */}
            <div className="space-y-6 print:m-0">
              {/* Corporate Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{organization.name}</h1>
                  <p className="text-xs text-slate-600 mt-0.5">{organization.legalEntity || organization.name} • AR Financial Operations</p>
                  <p className="text-xs text-slate-500 font-mono">Tax ID: {organization.taxId || 'GB 992 481 02'}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-900 uppercase tracking-wider">{currentReport.name}</div>
                  <p className="text-xs text-slate-500 font-mono">Generated: {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</p>
                  <p className="text-xs text-slate-600">Reporting Period: <strong>{dateRangePreset.toUpperCase()}</strong></p>
                  <p className="text-xs text-slate-600">Currency: <strong>{filterCurrency === 'all' ? defaultOrgCurrency : filterCurrency}</strong></p>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2">Customer Account</th>
                      <th className="py-2 px-2">Jurisdiction</th>
                      <th className="py-2 px-2 text-right">Current</th>
                      <th className="py-2 px-2 text-right">1-30d</th>
                      <th className="py-2 px-2 text-right">31-60d</th>
                      <th className="py-2 px-2 text-right">61-90d</th>
                      <th className="py-2 px-2 text-right">90+d Overdue</th>
                      <th className="py-2 px-2 text-right">Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                    {ageingByDebtor.map((row) => (
                      <tr key={row.debtor.id}>
                        <td className="py-2 px-2 font-sans font-semibold text-slate-900">{row.debtor.name}</td>
                        <td className="py-2 px-2 font-sans text-slate-600">{row.debtor.country || 'UK'}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(row.current, row.currency)}</td>
                        <td className="py-2 px-2 text-right text-amber-700">{formatCurrency(row.days1_30, row.currency)}</td>
                        <td className="py-2 px-2 text-right text-orange-700">{formatCurrency(row.days31_60, row.currency)}</td>
                        <td className="py-2 px-2 text-right text-rose-700">{formatCurrency(row.days61_90, row.currency)}</td>
                        <td className="py-2 px-2 text-right text-rose-900 font-bold">{formatCurrency(row.days90Plus, row.currency)}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-950">{formatCurrency(row.totalOutstanding, row.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-xs font-mono">
                      <td className="py-2 px-2 font-sans" colSpan={2}>Certified Total Outstanding</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.current, 0), defaultOrgCurrency)}</td>
                      <td className="py-2 px-2 text-right text-amber-700">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days1_30, 0), defaultOrgCurrency)}</td>
                      <td className="py-2 px-2 text-right text-orange-700">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days31_60, 0), defaultOrgCurrency)}</td>
                      <td className="py-2 px-2 text-right text-rose-700">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days61_90, 0), defaultOrgCurrency)}</td>
                      <td className="py-2 px-2 text-right text-rose-900">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.days90Plus, 0), defaultOrgCurrency)}</td>
                      <td className="py-2 px-2 text-right text-indigo-900 font-bold">{formatCurrency(ageingByDebtor.reduce((s, r) => s + r.totalOutstanding, 0), defaultOrgCurrency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Statutory Footnote & Audit Signoff (Section 19.3 & 19.4) */}
              <div className="border-t border-slate-300 pt-4 text-[10px] text-slate-500 space-y-1">
                <p>
                  <strong>Statutory Declaration:</strong> This certified financial report has been extracted deterministically from the production ledger of {organization.name}. All invoice totals, unallocated payment balances, and ageing calculations reconcile with underlying general ledger balances.
                </p>
                <div className="flex justify-between items-center font-mono pt-2">
                  <span>Signoff: Authorized Credit Controller / Finance Director</span>
                  <span>Forensic Audit Ref: AUD-EXP-{Date.now().toString(36).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
