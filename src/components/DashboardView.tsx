import React, { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar, 
  Sparkles, 
  ArrowUpRight, 
  ArrowRight,
  Flame,
  FileText
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Organization, Debtor, Invoice, Dispute, PromiseToPay, FinancialMetrics } from '../types';
import { formatCurrency } from '../services/calculations';

interface DashboardViewProps {
  organization: Organization;
  metrics: FinancialMetrics;
  debtors: Debtor[];
  invoices: Invoice[];
  disputes: Dispute[];
  promises: PromiseToPay[];
  onNavigateTab: (tab: string) => void;
  onOpenReminderModal: (invoice: Invoice) => void;
  onOpenDebtorPortal: (debtor: Debtor) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  organization,
  metrics,
  debtors,
  invoices,
  disputes,
  promises,
  onNavigateTab,
  onOpenReminderModal,
  onOpenDebtorPortal,
}) => {
  const { t, language } = useTranslation();
  const currency = organization.defaultCurrency;

  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [aiPriorities, setAiPriorities] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Trigger Gemini AI Executive Briefing
  const fetchAiExecutiveBriefing = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/executive-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          orgName: organization.name,
          currency,
          language,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiBriefing(data.briefing);
        setAiPriorities(data.topPriorities || []);
      }
    } catch (err) {
      console.error('Failed to load AI briefing:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Urgent action items: Overdue > 30 days or broken promises
  const urgentInvoices = invoices.filter((i) => i.daysOverdue >= 30 && i.status !== 'paid');
  const brokenPromises = promises.filter((p) => p.status === 'broken');
  const openDisputesList = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');

  const totalAgingSum = metrics.aging.total || 1;
  const currentPct = Math.round((metrics.aging.current / totalAgingSum) * 100);
  const days130Pct = Math.round((metrics.aging.days1_30 / totalAgingSum) * 100);
  const days3160Pct = Math.round((metrics.aging.days31_60 / totalAgingSum) * 100);
  const days6190Pct = Math.round((metrics.aging.days61_90 / totalAgingSum) * 100);
  const days90PlusPct = Math.round((metrics.aging.days90Plus / totalAgingSum) * 100);

  return (
    <div className="space-y-6">
      
      {/* Welcome & Tenant Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {organization.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t('appName')} • Legal Entity: <span className="text-slate-300 font-medium">{organization.legalEntity}</span> • Base Late Interest Rate: <span className="text-amber-400 font-semibold">{organization.baseLateInterestRate}% p.a.</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('cashforecast')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1.5"
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>{t('navCashForecast')}</span>
          </button>
          <button
            onClick={() => onNavigateTab('invoices')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
          >
            <span>{t('actionNewInvoice')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8 Core Deterministic Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Receivables */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiTotalReceivables')}</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mono-num">
            {formatCurrency(metrics.totalReceivables, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {invoices.filter(i => i.amountDue > 0).length} open accounts
          </div>
        </div>

        {/* Total Overdue */}
        <div className="bg-slate-900/80 border border-rose-900/40 rounded-xl p-4 shadow-sm hover:border-rose-800/60 transition bg-gradient-to-b from-rose-950/20 to-transparent">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-rose-300">{t('kpiOverdueAmount')}</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mono-num">
            {formatCurrency(metrics.totalOverdue, currency)}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">
            {Math.round((metrics.totalOverdue / (metrics.totalReceivables || 1)) * 100)}% of total receivables
          </div>
        </div>

        {/* DSO (Days Sales Outstanding) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiDso')}</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mono-num">
            {metrics.dso} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            Target benchmark: &lt; 45 days
          </div>
        </div>

        {/* CEI (Collection Effectiveness Index) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiCei')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mono-num">
            {metrics.cei}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Optimal score (&gt; 80% is healthy)
          </div>
        </div>

        {/* Collected This Month */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiCollectedMonth')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mono-num">
            {formatCurrency(metrics.totalCollectedThisMonth, currency)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Bank transfers & card settlements
          </div>
        </div>

        {/* Disputed Amount */}
        <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-4 shadow-sm hover:border-amber-800/60 transition bg-gradient-to-b from-amber-950/20 to-transparent">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium text-amber-300">{t('kpiDisputedAmount')}</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 mono-num">
            {formatCurrency(metrics.disputedAmountTotal, currency)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1 flex items-center space-x-1">
            <span>Dunning paused on disputes</span>
          </div>
        </div>

        {/* Active Promises to Pay */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiActivePromises')}</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mono-num">
            {formatCurrency(metrics.openPromisesTotal, currency)}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">
            {promises.filter(p => p.status === 'pending').length} commitments pending
          </div>
        </div>

        {/* ADD (Average Days Delinquent) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">{t('kpiAdd')}</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mono-num">
            {metrics.averageDaysDelinquent} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Weighted overdue delay
          </div>
        </div>

      </div>

      {/* Aging Buckets Breakdown (Visual + Categorized) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Accounts Receivable Aging Analysis (Statutory Buckets)
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic categorization by maturity date with accrued commercial late interest.
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Total Open: <strong className="text-white mono-num">{formatCurrency(metrics.aging.total, currency)}</strong>
          </span>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div style={{ width: `${currentPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Current: ${currentPct}%`} />
          <div style={{ width: `${days130Pct}%` }} className="bg-sky-500 h-full transition-all" title={`1-30d: ${days130Pct}%`} />
          <div style={{ width: `${days3160Pct}%` }} className="bg-amber-500 h-full transition-all" title={`31-60d: ${days3160Pct}%`} />
          <div style={{ width: `${days6190Pct}%` }} className="bg-orange-500 h-full transition-all" title={`61-90d: ${days6190Pct}%`} />
          <div style={{ width: `${days90PlusPct}%` }} className="bg-rose-500 h-full transition-all" title={`90+d: ${days90PlusPct}%`} />
        </div>

        {/* Aging Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t('agingCurrent')}</span>
            </div>
            <div className="text-lg font-bold text-white mono-num mt-1">
              {formatCurrency(metrics.aging.current, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{currentPct}% of AR</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-xs text-sky-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span>{t('aging1_30')}</span>
            </div>
            <div className="text-lg font-bold text-white mono-num mt-1">
              {formatCurrency(metrics.aging.days1_30, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{days130Pct}% of AR</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{t('aging31_60')}</span>
            </div>
            <div className="text-lg font-bold text-white mono-num mt-1">
              {formatCurrency(metrics.aging.days31_60, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{days3160Pct}% of AR</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-xs text-orange-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>{t('aging61_90')}</span>
            </div>
            <div className="text-lg font-bold text-white mono-num mt-1">
              {formatCurrency(metrics.aging.days61_90, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{days6190Pct}% of AR</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{t('aging90Plus')}</span>
            </div>
            <div className="text-lg font-bold text-rose-300 mono-num mt-1">
              {formatCurrency(metrics.aging.days90Plus, currency)}
            </div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">{days90PlusPct}% of AR (Critical)</div>
          </div>
        </div>
      </div>

      {/* AI Executive Collections Briefing Panel */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>{t('aiExecutiveBriefing')}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ground-truth financial synthesis analyzing working capital, debtor risks, and strategic recovery priorities.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAiExecutiveBriefing}
            disabled={isAiLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition flex items-center justify-center space-x-2 shrink-0 shadow-md shadow-indigo-600/30"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? t('aiGenerating') : 'Generate C-Suite Briefing'}</span>
          </button>
        </div>

        {aiBriefing ? (
          <div className="mt-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 space-y-3">
            <p className="leading-relaxed whitespace-pre-line text-slate-300">
              {aiBriefing}
            </p>
            {aiPriorities.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block mb-1.5">
                  Strategic Priority Actions:
                </span>
                <ul className="space-y-1">
                  {aiPriorities.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-slate-300">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Click "Generate C-Suite Briefing" to run Gemini 3.8 Flash against your real ledger metrics.</span>
            <span className="text-indigo-400 text-[11px] font-medium hidden sm:inline">Deterministic calculations preserved</span>
          </div>
        )}
      </div>

      {/* Two-Column Layout: Urgent Exceptions & Overdue Invoices Requiring Escalation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Urgent Collections Attention List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Accounts Requiring Credit Control Action</span>
            </h3>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>View all ({invoices.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {urgentInvoices.slice(0, 4).map((inv) => (
              <div
                key={inv.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{inv.invoiceNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {inv.daysOverdue}d overdue
                    </span>
                    {inv.status === 'disputed' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300">
                        Disputed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {inv.debtorName} • Stage: <span className="text-slate-300">{inv.currentDunningStage || 'Dunning Pending'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-rose-400 mono-num">
                    {formatCurrency(inv.amountDue, inv.currency)}
                  </div>
                  <button
                    onClick={() => onOpenReminderModal(inv)}
                    className="mt-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 ml-auto"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Draft</span>
                  </button>
                </div>
              </div>
            ))}

            {urgentInvoices.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                No severely delinquent invoices detected.
              </div>
            )}
          </div>
        </div>

        {/* Broken Promises & Dispute Freeze Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Promises & Disputes Exceptions</span>
            </h3>
            <button
              onClick={() => onNavigateTab('disputes')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>Manage Disputes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Broken Promises */}
            {brokenPromises.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-rose-300">Broken Promise to Pay</span>
                    <span className="text-[10px] text-slate-400">Due {p.promisedDate}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {p.debtorName} ({p.contactPerson}) • {p.notes}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-rose-400 mono-num">
                    {formatCurrency(p.promisedAmount, p.currency)}
                  </div>
                  <button
                    onClick={() => onNavigateTab('promises')}
                    className="text-[10px] text-rose-300 hover:underline mt-0.5 block"
                  >
                    Follow up &gt;
                  </button>
                </div>
              </div>
            ))}

            {/* Active Disputes */}
            {openDisputesList.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-300">Active Dispute (#{d.invoiceNumber})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-semibold">
                      {d.reason.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                    {d.debtorName}: "{d.debtorStatement}"
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-amber-400 mono-num">
                    {formatCurrency(d.amountDisputed, currency)}
                  </div>
                  <span className="text-[10px] text-amber-300/80 block">Dunning Paused</span>
                </div>
              </div>
            ))}

            {brokenPromises.length === 0 && openDisputesList.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                All payment promises on track and no active disputes blocking recovery.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
