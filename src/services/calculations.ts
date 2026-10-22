import { Invoice, AgingBuckets, RiskTier, PromiseToPay, Dispute } from '../types';

/**
 * Calculates days between two date strings (YYYY-MM-DD).
 */
export function calculateDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Deterministically compute the overdue days for an invoice relative to reference date.
 */
export function getInvoiceDaysOverdue(dueDate: string, referenceDateStr?: string): number {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const due = new Date(dueDate);
  const diffTime = refDate.getTime() - due.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

/**
 * Deterministically compute statutory late payment interest based on commercial regulations
 * (e.g., Late Payment of Commercial Debts: Base rate + statutory rate per annum, prorated by days overdue).
 */
export function calculateStatutoryInterest(
  amountDue: number,
  daysOverdue: number,
  annualInterestRatePercent: number = 8.5
): number {
  if (amountDue <= 0 || daysOverdue <= 0) return 0;
  // Interest = (Principal * Rate * Days) / 365
  const interest = (amountDue * (annualInterestRatePercent / 100) * daysOverdue) / 365;
  return Math.round(interest * 100) / 100;
}

/**
 * Calculate standard aging buckets for open receivables.
 */
export function calculateAgingBuckets(invoices: Invoice[]): AgingBuckets {
  const buckets: AgingBuckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
    total: 0,
  };

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'written_off' || inv.amountDue <= 0) {
      continue;
    }

    const amount = inv.amountDue;
    buckets.total += amount;

    const days = inv.daysOverdue;
    if (days <= 0) {
      buckets.current += amount;
    } else if (days <= 30) {
      buckets.days1_30 += amount;
    } else if (days <= 60) {
      buckets.days31_60 += amount;
    } else if (days <= 90) {
      buckets.days61_90 += amount;
    } else {
      buckets.days90Plus += amount;
    }
  }

  // Round all values to 2 decimals
  buckets.current = Math.round(buckets.current * 100) / 100;
  buckets.days1_30 = Math.round(buckets.days1_30 * 100) / 100;
  buckets.days31_60 = Math.round(buckets.days31_60 * 100) / 100;
  buckets.days61_90 = Math.round(buckets.days61_90 * 100) / 100;
  buckets.days90Plus = Math.round(buckets.days90Plus * 100) / 100;
  buckets.total = Math.round(buckets.total * 100) / 100;

  return buckets;
}

/**
 * Days Sales Outstanding (DSO) calculation.
 * Standard Formula: (Total Open Receivables / Total Sales in 90-day period) * 90 days.
 */
export function calculateDSO(totalReceivables: number, periodSales: number, periodDays: number = 90): number {
  if (periodSales <= 0) return 0;
  const dso = (totalReceivables / periodSales) * periodDays;
  return Math.round(dso * 10) / 10;
}

/**
 * Collection Effectiveness Index (CEI).
 * Formula: ((Beginning Receivables + Credit Sales - Ending Total Receivables) / (Beginning Receivables + Credit Sales - Ending Current Receivables)) * 100
 */
export function calculateCEI(
  beginningReceivables: number,
  creditSales: number,
  endingTotalReceivables: number,
  endingCurrentReceivables: number
): number {
  const numerator = beginningReceivables + creditSales - endingTotalReceivables;
  const denominator = beginningReceivables + creditSales - endingCurrentReceivables;

  if (denominator <= 0) return 100;
  const cei = (numerator / denominator) * 100;
  return Math.min(100, Math.max(0, Math.round(cei * 10) / 10));
}

/**
 * Average Days Delinquent (ADD) calculation.
 * Weighted average of overdue days across all delinquent invoices.
 */
export function calculateAverageDaysDelinquent(invoices: Invoice[]): number {
  const overdueInvoices = invoices.filter(inv => inv.amountDue > 0 && inv.daysOverdue > 0);
  if (overdueInvoices.length === 0) return 0;

  let totalWeightedDays = 0;
  let totalOverdueAmount = 0;

  for (const inv of overdueInvoices) {
    totalWeightedDays += inv.daysOverdue * inv.amountDue;
    totalOverdueAmount += inv.amountDue;
  }

  if (totalOverdueAmount <= 0) return 0;
  return Math.round((totalWeightedDays / totalOverdueAmount) * 10) / 10;
}

/**
 * Deterministic Cash Collection Forecast for 30, 60, and 90 day horizons.
 * Blends active Promises to Pay (PTPs) and risk-weighted aging probabilities.
 */
export function calculateCashForecast(
  invoices: Invoice[],
  promises: PromiseToPay[],
  disputes: Dispute[]
): { period30Days: number; period60Days: number; period90Days: number } {
  const disputedInvoiceIds = new Set(
    disputes.filter(d => d.status === 'open' || d.status === 'under_review').map(d => d.invoiceId)
  );

  const pendingPromises = promises.filter(p => p.status === 'pending');

  let p30 = 0;
  let p60 = 0;
  let p90 = 0;

  // 1. Process active Promises to Pay
  const today = new Date();
  for (const promise of pendingPromises) {
    const diffDays = calculateDaysDifference(promise.promisedDate, today.toISOString().split('T')[0]);
    const amount = promise.promisedAmount * 0.88; // 88% historical adherence factor
    if (diffDays <= 30) {
      p30 += amount;
      p60 += amount;
      p90 += amount;
    } else if (diffDays <= 60) {
      p60 += amount;
      p90 += amount;
    } else if (diffDays <= 90) {
      p90 += amount;
    }
  }

  // 2. Process non-promised invoices with deterministic recovery coefficients
  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'written_off' || inv.amountDue <= 0) continue;
    
    // Check if covered by promise
    const hasPromise = pendingPromises.some(p => p.invoiceId === inv.id);
    if (hasPromise) continue;

    const isDisputed = disputedInvoiceIds.has(inv.id);
    const disputeDiscount = isDisputed ? 0.25 : 1.0;
    const due = inv.amountDue * disputeDiscount;

    if (inv.daysOverdue <= 0) {
      // Current invoice due soon
      p30 += due * 0.92;
      p60 += due * 0.98;
      p90 += due * 0.99;
    } else if (inv.daysOverdue <= 30) {
      p30 += due * 0.65;
      p60 += due * 0.85;
      p90 += due * 0.92;
    } else if (inv.daysOverdue <= 60) {
      p30 += due * 0.35;
      p60 += due * 0.60;
      p90 += due * 0.75;
    } else if (inv.daysOverdue <= 90) {
      p30 += due * 0.15;
      p60 += due * 0.35;
      p90 += due * 0.50;
    } else {
      // 90+ days overdue
      p30 += due * 0.05;
      p60 += due * 0.15;
      p90 += due * 0.25;
    }
  }

  return {
    period30Days: Math.round(p30),
    period60Days: Math.round(p60),
    period90Days: Math.round(p90),
  };
}

/**
 * Determine debtor risk tier deterministically based on credit rating & aging delinquency.
 */
export function determineRiskTier(
  creditRating: number,
  overduePercentage: number,
  brokenPromisesCount: number
): RiskTier {
  if (creditRating < 40 || overduePercentage > 60 || brokenPromisesCount >= 2) {
    return 'critical';
  }
  if (creditRating < 60 || overduePercentage > 35 || brokenPromisesCount >= 1) {
    return 'high';
  }
  if (creditRating < 80 || overduePercentage > 15) {
    return 'moderate';
  }
  return 'low';
}

/**
 * Format currency deterministically.
 */
export function formatCurrency(amount: number, currency: string = 'EUR', locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
