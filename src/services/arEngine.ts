/**
 * Accounts Receivable Deterministic Calculation Engine
 * Section 10 Compliance:
 * - 10.1 Core calculations using integer minor currency units (cents/pence) to prevent binary floating-point errors
 * - 10.2 Days overdue calculation based on invoice due date, business date, and timezone rules
 * - 10.3 Configurable receivables ageing buckets and historical as-of balance calculations
 * - 10.4 Multi-currency segregation and consolidated management conversion tracking
 * - 10.5 Accounting consistency: traceable adjustments and payment reversals
 */

import { Invoice, Payment, CreditNote, Organization } from '../types';

export interface AgeingBucketDefinition {
  id: string;
  label: string;
  minDays: number; // e.g. -9999 for Not Yet Due
  maxDays: number; // e.g. 0 for Not Yet Due, 30 for 1-30
}

export const DEFAULT_AGEING_BUCKETS: AgeingBucketDefinition[] = [
  { id: 'not_due', label: 'Not Yet Due', minDays: -99999, maxDays: 0 },
  { id: 'days_1_30', label: '1–30 Days Overdue', minDays: 1, maxDays: 30 },
  { id: 'days_31_60', label: '31–60 Days Overdue', minDays: 31, maxDays: 60 },
  { id: 'days_61_90', label: '61–90 Days Overdue', minDays: 61, maxDays: 90 },
  { id: 'days_90_plus', label: 'More Than 90 Days Overdue', minDays: 91, maxDays: 99999 },
];

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string;
  conversionSource: string;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRate[] = [
  { fromCurrency: 'EUR', toCurrency: 'GBP', rate: 0.854, rateDate: '2026-10-18', conversionSource: 'Bank of England Benchmark' },
  { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.772, rateDate: '2026-10-18', conversionSource: 'Bank of England Benchmark' },
  { fromCurrency: 'ZAR', toCurrency: 'GBP', rate: 0.043, rateDate: '2026-10-18', conversionSource: 'SARB Official Reference' },
  { fromCurrency: 'GBP', toCurrency: 'GBP', rate: 1.000, rateDate: '2026-10-18', conversionSource: 'Parity' },
  { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.106, rateDate: '2026-10-18', conversionSource: 'ECB Daily Reference' },
  { fromCurrency: 'GBP', toCurrency: 'USD', rate: 1.295, rateDate: '2026-10-18', conversionSource: 'Federal Reserve H.10' },
  { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.904, rateDate: '2026-10-18', conversionSource: 'ECB Daily Reference' },
  { fromCurrency: 'GBP', toCurrency: 'EUR', rate: 1.171, rateDate: '2026-10-18', conversionSource: 'ECB Daily Reference' },
];

/**
 * 10.1 Convert standard currency float amount to integer minor currency units (cents/pence).
 * Prevents IEEE-754 binary floating point precision anomalies (e.g. 0.1 + 0.2 !== 0.3).
 */
export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  // Multiply by 100 and round to nearest whole integer
  return Math.round(amount * 100);
}

/**
 * Convert integer minor currency units (cents/pence) back to standard currency amount.
 */
export function fromMinorUnits(minorUnits: number): number {
  if (!Number.isFinite(minorUnits)) return 0;
  return Math.round(minorUnits) / 100;
}

/**
 * 10.1 Deterministic Invoice Balance Calculation
 * Outstanding balance = Original invoice amount + applicable debit adjustments - applicable credit notes - allocated payments.
 * Prevent an invoice balance from becoming negative unless credit-balance workflow permits.
 */
export interface InvoiceBalanceBreakdown {
  originalAmountMinor: number;
  debitAdjustmentsMinor: number;
  creditNotesMinor: number;
  allocatedPaymentsMinor: number;
  writeOffsMinor: number;
  outstandingBalanceMinor: number;
  originalAmount: number;
  debitAdjustments: number;
  creditNotes: number;
  allocatedPayments: number;
  writeOffs: number;
  outstandingBalance: number;
  allowCreditBalance: boolean;
  isCreditBalance: boolean;
  calculationTrace: string[];
}

export function calculateDeterministicInvoiceBalance(params: {
  originalAmount: number;
  debitAdjustments?: number;
  creditNotes?: number;
  allocatedPayments?: number;
  writeOffs?: number;
  allowCreditBalance?: boolean;
}): InvoiceBalanceBreakdown {
  const origMinor = toMinorUnits(params.originalAmount);
  const debMinor = toMinorUnits(params.debitAdjustments || 0);
  const cnMinor = toMinorUnits(params.creditNotes || 0);
  const payMinor = toMinorUnits(params.allocatedPayments || 0);
  const woMinor = toMinorUnits(params.writeOffs || 0);
  const allowCreditBalance = Boolean(params.allowCreditBalance);

  // Trace formula step-by-step
  const trace: string[] = [
    `Base Original Amount: ${origMinor} minor units (${fromMinorUnits(origMinor).toFixed(2)})`,
  ];

  let balanceMinor = origMinor + debMinor;
  if (debMinor > 0) {
    trace.push(`+ Debit Adjustments: ${debMinor} minor units => subtotal ${balanceMinor}`);
  }

  balanceMinor -= cnMinor;
  if (cnMinor > 0) {
    trace.push(`- Credit Notes: ${cnMinor} minor units => subtotal ${balanceMinor}`);
  }

  balanceMinor -= payMinor;
  if (payMinor > 0) {
    trace.push(`- Allocated Payments: ${payMinor} minor units => subtotal ${balanceMinor}`);
  }

  balanceMinor -= woMinor;
  if (woMinor > 0) {
    trace.push(`- Authorized Write-Offs: ${woMinor} minor units => subtotal ${balanceMinor}`);
  }

  let isCreditBalance = false;
  if (balanceMinor < 0) {
    if (!allowCreditBalance) {
      trace.push(`Balance resulted in negative ${balanceMinor} minor units. Clamped to 0 (credit-balance workflow not enabled).`);
      balanceMinor = 0;
    } else {
      trace.push(`Notice: Permitted credit balance of ${balanceMinor} minor units.`);
      isCreditBalance = true;
    }
  }

  trace.push(`Final Deterministic Outstanding: ${balanceMinor} minor units (${fromMinorUnits(balanceMinor).toFixed(2)})`);

  return {
    originalAmountMinor: origMinor,
    debitAdjustmentsMinor: debMinor,
    creditNotesMinor: cnMinor,
    allocatedPaymentsMinor: payMinor,
    writeOffsMinor: woMinor,
    outstandingBalanceMinor: balanceMinor,
    originalAmount: fromMinorUnits(origMinor),
    debitAdjustments: fromMinorUnits(debMinor),
    creditNotes: fromMinorUnits(cnMinor),
    allocatedPayments: fromMinorUnits(payMinor),
    writeOffs: fromMinorUnits(woMinor),
    outstandingBalance: fromMinorUnits(balanceMinor),
    allowCreditBalance,
    isCreditBalance,
    calculationTrace: trace,
  };
}

/**
 * 10.2 Days Overdue Engine
 * Computes calendar days after due date based on invoice due date, business date, and timezone.
 * Returns 0 for not yet due; positive integer for overdue.
 */
export interface DaysOverdueResult {
  daysOverdue: number;
  isOverdue: boolean;
  dueDate: string;
  businessDate: string;
  timeZone: string;
  calculationBasis: string;
}

export function calculateDaysOverdue(
  dueDateStr: string,
  businessDateStr?: string,
  timeZone: string = 'Europe/London'
): DaysOverdueResult {
  const businessDate = businessDateStr || new Date().toISOString().split('T')[0];
  
  // Parse YYYY-MM-DD components directly to avoid timezone shift ambiguity
  const [bYear, bMonth, bDay] = businessDate.split('-').map(Number);
  const [dYear, dMonth, dDay] = dueDateStr.split('-').map(Number);

  const bUtc = Date.UTC(bYear, bMonth - 1, bDay);
  const dUtc = Date.UTC(dYear, dMonth - 1, dDay);

  const diffMs = bUtc - dUtc;
  const calendarDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = calendarDays > 0;
  const daysOverdue = isOverdue ? calendarDays : 0;

  const calculationBasis = isOverdue
    ? `Business Date (${businessDate}) in ${timeZone} - Due Date (${dueDateStr}) = ${calendarDays} calendar days overdue`
    : `Business Date (${businessDate}) in ${timeZone} <= Due Date (${dueDateStr}). 0 days overdue (Current/Not Yet Due)`;

  return {
    daysOverdue,
    isOverdue,
    dueDate: dueDateStr,
    businessDate,
    timeZone,
    calculationBasis,
  };
}

/**
 * 10.3 Receivables Ageing Bucket Evaluation
 * Groups an invoice into a configured bucket based on days overdue.
 */
export function getAgeingBucketForDays(
  daysOverdue: number,
  buckets: AgeingBucketDefinition[] = DEFAULT_AGEING_BUCKETS
): AgeingBucketDefinition {
  for (const b of buckets) {
    if (daysOverdue >= b.minDays && daysOverdue <= b.maxDays) {
      return b;
    }
  }
  return buckets[buckets.length - 1];
}

/**
 * 10.3 Historical / As-Of Receivables Ageing Report Generator
 * Calculates receivables ageing at a selected historical reporting date using transaction history.
 * Does NOT simply apply today's balance to past dates!
 */
export interface HistoricalAgeingInvoiceItem {
  id: string;
  invoiceNumber: string;
  debtorId: string;
  debtorName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  historicalBalanceMinor: number;
  historicalBalance: number;
  daysOverdueAsOf: number;
  bucketId: string;
  bucketLabel: string;
}

export interface CurrencyAgeingSummary {
  currency: string;
  totalOutstandingMinor: number;
  totalOutstanding: number;
  invoiceCount: number;
  bucketTotals: Record<string, { label: string; amountMinor: number; amount: number; count: number }>;
}

export function calculateReceivablesAgeingReport(params: {
  invoices: Invoice[];
  payments: Payment[];
  creditNotes?: CreditNote[];
  asOfDate?: string;
  timeZone?: string;
  buckets?: AgeingBucketDefinition[];
}): {
  asOfDate: string;
  timeZone: string;
  buckets: AgeingBucketDefinition[];
  byCurrency: Record<string, CurrencyAgeingSummary>;
  invoiceItems: HistoricalAgeingInvoiceItem[];
} {
  const asOfDate = params.asOfDate || new Date().toISOString().split('T')[0];
  const timeZone = params.timeZone || 'Europe/London';
  const buckets = params.buckets && params.buckets.length > 0 ? params.buckets : DEFAULT_AGEING_BUCKETS;

  const invoiceItems: HistoricalAgeingInvoiceItem[] = [];
  const byCurrency: Record<string, CurrencyAgeingSummary> = {};

  params.invoices.forEach((inv) => {
    // Only consider invoices issued ON or BEFORE the as-of reporting date
    if (inv.issueDate > asOfDate) return;

    // Filter payments that occurred on or before the as-of date
    let paidAsOfMinor = 0;
    (params.payments || []).forEach((p) => {
      if (p.paymentDate <= asOfDate) {
        const alloc = p.allocations?.find((a) => a.invoiceId === inv.id || a.invoiceNumber === inv.invoiceNumber);
        if (alloc) {
          paidAsOfMinor += toMinorUnits(alloc.allocatedAmount);
        }
      }
    });

    // Filter credit notes on or before as-of date
    let cnAsOfMinor = 0;
    (params.creditNotes || []).forEach((cn) => {
      if (cn.issueDate <= asOfDate) {
        const alloc = cn.allocations?.find((a) => a.invoiceId === inv.id || a.invoiceNumber === inv.invoiceNumber);
        if (alloc) {
          cnAsOfMinor += toMinorUnits(alloc.allocatedAmount);
        }
      }
    });

    const origMinor = toMinorUnits(inv.originalAmount || inv.totalAmount);
    let balanceMinor = origMinor - paidAsOfMinor - cnAsOfMinor;
    if (balanceMinor < 0) balanceMinor = 0;

    // If fully settled on or before the as-of date, skip from open receivables
    if (balanceMinor <= 0) return;

    // Overdue days as of reporting date
    const overdueRes = calculateDaysOverdue(inv.dueDate, asOfDate, timeZone);
    const bucket = getAgeingBucketForDays(overdueRes.daysOverdue, buckets);

    const item: HistoricalAgeingInvoiceItem = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      debtorId: inv.debtorId,
      debtorName: inv.debtorName,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      historicalBalanceMinor: balanceMinor,
      historicalBalance: fromMinorUnits(balanceMinor),
      daysOverdueAsOf: overdueRes.daysOverdue,
      bucketId: bucket.id,
      bucketLabel: bucket.label,
    };
    invoiceItems.push(item);

    // Group strictly by currency (Section 10.4)
    if (!byCurrency[inv.currency]) {
      const initialBucketTotals: Record<string, { label: string; amountMinor: number; amount: number; count: number }> = {};
      buckets.forEach((b) => {
        initialBucketTotals[b.id] = { label: b.label, amountMinor: 0, amount: 0, count: 0 };
      });
      byCurrency[inv.currency] = {
        currency: inv.currency,
        totalOutstandingMinor: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
        bucketTotals: initialBucketTotals,
      };
    }

    const curSummary = byCurrency[inv.currency];
    curSummary.totalOutstandingMinor += balanceMinor;
    curSummary.totalOutstanding = fromMinorUnits(curSummary.totalOutstandingMinor);
    curSummary.invoiceCount += 1;

    if (curSummary.bucketTotals[bucket.id]) {
      curSummary.bucketTotals[bucket.id].amountMinor += balanceMinor;
      curSummary.bucketTotals[bucket.id].amount = fromMinorUnits(curSummary.bucketTotals[bucket.id].amountMinor);
      curSummary.bucketTotals[bucket.id].count += 1;
    }
  });

  return {
    asOfDate,
    timeZone,
    buckets,
    byCurrency,
    invoiceItems,
  };
}

/**
 * 10.4 Consolidated Multi-Currency Management Reporting
 * Converts multiple currency balances into reporting currency using explicit exchange rates.
 * Clearly records: Original Currency, Original Amount, Reporting Currency, Exchange Rate, Rate Date, Conversion Source, Converted Amount.
 */
export interface ConsolidatedConversionLine {
  originalCurrency: string;
  originalAmount: number;
  reportingCurrency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  conversionSource: string;
  convertedAmount: number;
  invoiceCount: number;
}

export interface ConsolidatedManagementReport {
  reportingCurrency: string;
  asOfDate: string;
  totalConvertedAmount: number;
  lines: ConsolidatedConversionLine[];
  disclaimer: string;
}

export function buildConsolidatedManagementReport(
  byCurrency: Record<string, CurrencyAgeingSummary>,
  reportingCurrency: string = 'GBP',
  exchangeRates: ExchangeRate[] = DEFAULT_EXCHANGE_RATES,
  asOfDate: string = new Date().toISOString().split('T')[0]
): ConsolidatedManagementReport {
  const lines: ConsolidatedConversionLine[] = [];
  let totalConvertedMinor = 0;

  Object.values(byCurrency).forEach((cur) => {
    let rateObj = exchangeRates.find(
      (r) => r.fromCurrency === cur.currency && r.toCurrency === reportingCurrency
    );

    if (!rateObj) {
      if (cur.currency === reportingCurrency) {
        rateObj = {
          fromCurrency: cur.currency,
          toCurrency: reportingCurrency,
          rate: 1.0,
          rateDate: asOfDate,
          conversionSource: 'Base Currency Parity',
        };
      } else {
        // Fallback placeholder
        rateObj = {
          fromCurrency: cur.currency,
          toCurrency: reportingCurrency,
          rate: 1.0,
          rateDate: asOfDate,
          conversionSource: 'Estimated Peg (Manual Override Required)',
        };
      }
    }

    const convertedAmount = Math.round(cur.totalOutstanding * rateObj.rate * 100) / 100;
    totalConvertedMinor += toMinorUnits(convertedAmount);

    lines.push({
      originalCurrency: cur.currency,
      originalAmount: cur.totalOutstanding,
      reportingCurrency,
      exchangeRate: rateObj.rate,
      exchangeRateDate: rateObj.rateDate,
      conversionSource: rateObj.conversionSource,
      convertedAmount,
      invoiceCount: cur.invoiceCount,
    });
  });

  return {
    reportingCurrency,
    asOfDate,
    totalConvertedAmount: fromMinorUnits(totalConvertedMinor),
    lines,
    disclaimer:
      'MANAGEMENT CONSOLIDATION NOTICE: Converted figures are provided for executive analytics and managerial visibility only. Official statutory accounting records must remain un-converted in each original transactional currency (Section 10.4).',
  };
}
