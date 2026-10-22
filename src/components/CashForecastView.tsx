import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Sliders, 
  Info, 
  ShieldCheck, 
  Building, 
  ArrowUpRight,
  ShieldAlert,
  Award,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  FileText,
  AlertTriangle,
  Globe,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  Organization, 
  Invoice, 
  PromiseToPay, 
  Dispute, 
  FinancialMetrics, 
  CashForecastResponse, 
  ForecastHorizon, 
  ForecastStreamType,
  ForecastAssumptions,
  ForecastLineItem
} from '../types';
import { formatCurrency } from '../services/calculations';

interface CashForecastViewProps {
  organization: Organization;
  metrics: FinancialMetrics;
  invoices: Invoice[];
  promises: PromiseToPay[];
  disputes: Dispute[];
}

export const CashForecastView: React.FC<CashForecastViewProps> = ({
  organization,
  metrics,
  invoices,
  promises,
  disputes,
}) => {
  const { t } = useTranslation();
  const defaultOrgCurrency = organization.defaultCurrency || 'GBP';

  // Active Horizon selection
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('30_days');
  const [customDays, setCustomDays] = useState<number>(45);

  // Currency Mode: Separated by currency (default) vs ECB reference rate consolidation (18.3)
  const [currencyMode, setCurrencyMode] = useState<'separated_by_currency' | 'ecb_reference_rates'>('separated_by_currency');
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<string>(defaultOrgCurrency);

  // Configurable Forecast Assumptions (18.1)
  const [ptpAdherenceRate, setPtpAdherenceRate] = useState<number>(88); // 50% to 100%
  const [disputeHoldDiscount, setDisputeHoldDiscount] = useState<number>(25); // 0% to 100%
  const [historicalPaymentDelayWeight, setHistoricalPaymentDelayWeight] = useState<number>(70); // 0% to 100%
  const [cadenceLiftBoost, setCadenceLiftBoost] = useState<number>(0); // 0% to 20%
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);

  // Line Items Filter
  const [streamFilter, setStreamFilter] = useState<'all' | ForecastStreamType>('all');
  const [lineItemSearch, setLineItemSearch] = useState<string>('');

  // API Forecast Data state
  const [forecastData, setForecastData] = useState<CashForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch forecast data from backend
  const fetchForecast = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        orgId: organization.id,
        ptpAdherenceRate: String(ptpAdherenceRate),
        disputeHoldDiscount: String(disputeHoldDiscount),
        historicalPaymentDelayWeight: String(historicalPaymentDelayWeight),
        cadenceLiftBoost: String(cadenceLiftBoost),
        currencyMode,
        customHorizonDays: String(customDays),
      });

      const res = await fetch(`/api/cash-forecast?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setForecastData(data);
        if (!data.currencies.includes(activeCurrencyTab)) {
          setActiveCurrencyTab(data.currencies[0] || defaultOrgCurrency);
        }
      }
    } catch (err) {
      console.error('Error fetching cash forecast:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [
    organization.id,
    ptpAdherenceRate,
    disputeHoldDiscount,
    historicalPaymentDelayWeight,
    cadenceLiftBoost,
    currencyMode,
    customDays,
  ]);

  // Active Forecast Summary based on Currency Mode & Tab
  const activeSummary = forecastData
    ? currencyMode === 'ecb_reference_rates'
      ? forecastData.consolidated
      : forecastData.byCurrency[activeCurrencyTab] || forecastData.byCurrency[defaultOrgCurrency]
    : null;

  const activeCurrencySymbol = currencyMode === 'ecb_reference_rates' ? defaultOrgCurrency : activeCurrencyTab;

  // Active Horizon Breakdown
  const activeHorizonBreakdown = activeSummary
    ? selectedHorizon === '7_days'
      ? activeSummary.period7Days
      : selectedHorizon === '14_days'
      ? activeSummary.period14Days
      : selectedHorizon === '30_days'
      ? activeSummary.period30Days
      : selectedHorizon === '60_days'
      ? activeSummary.period60Days
      : selectedHorizon === '90_days'
      ? activeSummary.period90Days
      : activeSummary.customPeriod?.breakdown || activeSummary.period30Days
    : null;

  // Filtered Line Items
  const filteredLineItems = (forecastData?.lineItems || []).filter((item) => {
    if (currencyMode === 'separated_by_currency' && item.currency !== activeCurrencyTab) {
      return false;
    }
    if (streamFilter !== 'all' && item.streamType !== streamFilter) {
      return false;
    }
    if (lineItemSearch) {
      const q = lineItemSearch.toLowerCase();
      const match =
        item.debtorName.toLowerCase().includes(q) ||
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.streamLabel.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER & BRANDING                                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Cash Flow Forecasting Module
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Part 18 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Receivables-based multi-horizon liquidity projections incorporating historical debtor payment timing, active promises, partial remittances, and dispute status.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAssumptionsModal(true)}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Forecast Assumptions (18.1)</span>
          </button>

          <button
            onClick={fetchForecast}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh forecast model"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MANDATORY SAFEGUARD DISCLAIMER (Section 18.3)                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Forecast Presentation Standard (Section 18.3):</strong> Forecast values are probabilistic financial projections based on authoritative receivables records, customer-specific historical payment timings, and documented commitments.{' '}
            <strong className="text-white">They are not guaranteed cash receipts.</strong>
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap ml-4">
          Non-guaranteed probabilistic model
        </span>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CURRENCY SEGREGATION CONTROLS (Section 18.3)                        */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {/* Currency Tabs */}
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold mr-1">Currency Mode:</span>

          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setCurrencyMode('separated_by_currency')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currencyMode === 'separated_by_currency'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Separated by Currency (Default)
            </button>
            <button
              onClick={() => setCurrencyMode('ecb_reference_rates')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currencyMode === 'ecb_reference_rates'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ECB Rate Consolidated ({defaultOrgCurrency})
            </button>
          </div>
        </div>

        {/* Currency Sub-Tabs if Separated */}
        {currencyMode === 'separated_by_currency' && forecastData?.currencies && (
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 mr-1">Active Ledger Currency:</span>
            {forecastData.currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => setActiveCurrencyTab(curr)}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                  activeCurrencyTab === curr
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 18.2 FORECAST HORIZON SELECTORS (7, 14, 30, 60, 90 & Alternative)   */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Expected Collections by Horizon (Section 18.2)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {currencyMode === 'ecb_reference_rates' ? `Consolidated in ${defaultOrgCurrency}` : `Reporting in ${activeCurrencyTab}`}
          </span>
        </div>

        {/* 5 Standard Horizons + Alternative Horizon Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: '7_days' as const, label: 'Next 7 Days', sub: 'Immediate Remittances', key: 'period7Days' },
            { id: '14_days' as const, label: 'Next 14 Days', sub: 'Fortnight Liquidity', key: 'period14Days' },
            { id: '30_days' as const, label: 'Next 30 Days', sub: 'Current Month Run-rate', key: 'period30Days' },
            { id: '60_days' as const, label: 'Next 60 Days', sub: 'Mid-term Recovery', key: 'period60Days' },
            { id: '90_days' as const, label: 'Next 90 Days', sub: 'Quarterly Cash Flow', key: 'period90Days' },
            { id: 'custom' as const, label: `Custom (${customDays}d)`, sub: 'User-Selected Period', key: 'customPeriod' },
          ].map((horizon) => {
            const isSelected = selectedHorizon === horizon.id;
            const dataObj = activeSummary
              ? horizon.id === 'custom'
                ? activeSummary.customPeriod?.breakdown
                : (activeSummary as any)[horizon.key]
              : null;

            const totalAmount = dataObj?.totalExpected || 0;
            const contractualAmount = dataObj?.contractuallyDue || 0;

            return (
              <button
                key={horizon.id}
                onClick={() => setSelectedHorizon(horizon.id)}
                className={`p-4 rounded-2xl text-left border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {horizon.label}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>

                <div className="text-lg font-extrabold text-white mono-num mt-1">
                  {formatCurrency(totalAmount, activeCurrencySymbol)}
                </div>

                <div className="text-[10px] text-slate-400 mt-1 flex justify-between items-center">
                  <span>Contractual:</span>
                  <span className="font-mono text-slate-300">{formatCurrency(contractualAmount, activeCurrencySymbol)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Alternative Period Custom Slider if Custom selected */}
        {selectedHorizon === 'custom' && (
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-200 font-semibold">Select Alternative Forecast Period Horizon:</span>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="7"
                max="180"
                step="7"
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className="w-48 accent-indigo-500"
              />
              <span className="font-mono font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {customDays} Days Horizon
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 18.3 FORECAST PRESENTATION: THE 5 SPECIFIED STREAMS                 */}
      {/* ------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">
              Deconstructed Collection Streams ({selectedHorizon.replace(/_/g, ' ')}) (Section 18.3)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Clear classification of contractually matured vs behavioral vs promised cash
          </span>
        </div>

        {/* 5 Distinct Presentation Stream Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Stream 1: Contractually Due Amounts */}
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 space-y-2 bg-gradient-to-br from-blue-950/20 to-transparent">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">1. Contractually Due</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-white mono-num">
              {formatCurrency(activeHorizonBreakdown?.contractuallyDue || 0, activeCurrencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Legal maturities strictly due within the horizon per agreed sales terms.
            </p>
            <div className="text-[10px] text-blue-300 font-mono pt-1 border-t border-slate-800/80">
              {activeHorizonBreakdown?.invoicesCount || 0} active invoice(s)
            </div>
          </div>

          {/* Stream 2: Customer-Promised Payments */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2 bg-gradient-to-br from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">2. Customer-Promised</span>
              <Award className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 mono-num">
              {formatCurrency(activeHorizonBreakdown?.customerPromised || 0, activeCurrencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Authoritative payment commitments submitted via portal or credit controller ({ptpAdherenceRate}% model adherence).
            </p>
            <div className="text-[10px] text-emerald-300 font-mono pt-1 border-t border-slate-800/80">
              {activeHorizonBreakdown?.promisesCount || 0} scheduled PTP commitment(s)
            </div>
          </div>

          {/* Stream 3: Historical-Pattern Estimates */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2 bg-gradient-to-br from-amber-950/20 to-transparent">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">3. Historical-Pattern</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-white mono-num">
              {formatCurrency(activeHorizonBreakdown?.historicalPatternEstimate || 0, activeCurrencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Expected recovery based on debtor's average payment delay and aging delinquency decay.
            </p>
            <div className="text-[10px] text-amber-300 font-mono pt-1 border-t border-slate-800/80">
              {historicalPaymentDelayWeight}% debtor timing weight
            </div>
          </div>

          {/* Stream 4: AI-Assisted Estimates */}
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-2 bg-gradient-to-br from-purple-950/20 to-transparent">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">4. AI-Assisted</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-white mono-num">
              {formatCurrency(activeHorizonBreakdown?.aiAssistedEstimate || 0, activeCurrencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Behavioral regression incorporating debtor credit rating, sentiment signals, and dispute status.
            </p>
            <div className="text-[10px] text-purple-300 font-mono pt-1 border-t border-slate-800/80">
              Gemini Behavioral Regressor
            </div>
          </div>

          {/* Stream 5: Confirmed Payments */}
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-2 bg-gradient-to-br from-cyan-950/20 to-transparent">
            <div className="flex items-center justify-between text-cyan-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">5. Confirmed Payments</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-extrabold text-cyan-400 mono-num">
              {formatCurrency(activeHorizonBreakdown?.confirmedPayments || 0, activeCurrencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Bank statement remittances already received or cleared awaiting final allocation.
            </p>
            <div className="text-[10px] text-cyan-300 font-mono pt-1 border-t border-slate-800/80">
              Immediate liquidity
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SCHEDULED RECEIVABLES MATURING SCHEDULE TABLE                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Scheduled Receivables & Maturity Schedule
            </h3>
            <p className="text-xs text-slate-400">
              Individual invoices and payment commitments projected across the forecast timeline.
            </p>
          </div>

          {/* Filters: Stream & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Stream Types</option>
              <option value="contractually_due">Contractually Due</option>
              <option value="customer_promised">Customer-Promised</option>
              <option value="historical_pattern">Historical-Pattern</option>
              <option value="ai_assisted">AI-Assisted</option>
              <option value="confirmed_payments">Confirmed Payments</option>
            </select>

            <input
              type="text"
              value={lineItemSearch}
              onChange={(e) => setLineItemSearch(e.target.value)}
              placeholder="Search customer, invoice..."
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3">Reference / Item</th>
                <th className="pb-3">Customer Account</th>
                <th className="pb-3">Outstanding Balance</th>
                <th className="pb-3">Contractual Due</th>
                <th className="pb-3">Expected Settlement</th>
                <th className="pb-3">Stream Classification</th>
                <th className="pb-3 text-right">Confidence Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No maturing receivables match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLineItems.slice(0, 25).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-mono font-semibold text-white">
                      {item.invoiceNumber}
                      {item.isDisputed && (
                        <span className="ml-2 text-[10px] font-sans px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          Disputed
                        </span>
                      )}
                      {item.hasActivePromise && (
                        <span className="ml-2 text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          PTP Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 font-semibold text-slate-200">{item.debtorName}</td>

                    <td className="py-3 font-mono font-bold text-white">
                      {formatCurrency(item.amountDue, item.currency)}
                    </td>

                    <td className="py-3 text-slate-400 font-mono">{item.dueDate}</td>

                    <td className="py-3">
                      <div className="font-mono font-bold text-indigo-300">
                        {item.expectedDate}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        In {item.daysUntilExpected} day(s)
                      </span>
                    </td>

                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                          item.streamType === 'confirmed_payments'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : item.streamType === 'customer_promised'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : item.streamType === 'historical_pattern'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : item.streamType === 'ai_assisted'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {item.streamLabel}
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <span className="font-mono font-bold text-slate-200">
                        {item.confidenceScore}%
                      </span>
                      <div className="w-16 bg-slate-950 rounded-full h-1 overflow-hidden ml-auto mt-1">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${item.confidenceScore}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: CONFIGURABLE FORECAST ASSUMPTIONS (Section 18.1)              */}
      {/* ------------------------------------------------------------------- */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configurable Forecast Assumptions (18.1)</h3>
                  <p className="text-xs text-slate-400">
                    Transparent rule parameters shaping payment promise adherence, dispute holds, and historical timing.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAssumptionsModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Assumption 1: Promise to Pay Adherence */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Customer Promise-to-Pay Adherence Factor</span>
                  <span className="font-mono text-emerald-400 font-bold">{ptpAdherenceRate}% realization</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={ptpAdherenceRate}
                  onChange={(e) => setPtpAdherenceRate(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  Conservative (50%) to Authoritative Baseline (88%) to Optimistic (100%). Discounts promised cash receipts based on customer track record.
                </p>
              </div>

              {/* Assumption 2: Dispute Hold Discount */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Active Dispute Recovery Liquidity Factor</span>
                  <span className="font-mono text-purple-400 font-bold">{disputeHoldDiscount}% recovered</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={disputeHoldDiscount}
                  onChange={(e) => setDisputeHoldDiscount(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <p className="text-[11px] text-slate-400">
                  Percentage of disputed invoice balances expected to be recovered during or following formal conciliation (Default: 25% recovery / 75% liquidity hold).
                </p>
              </div>

              {/* Assumption 3: Historical Payment Delay Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Debtor Historical Payment Timing Weight</span>
                  <span className="font-mono text-amber-400 font-bold">{historicalPaymentDelayWeight}% weight</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={historicalPaymentDelayWeight}
                  onChange={(e) => setHistoricalPaymentDelayWeight(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Weight applied to each customer's specific average payment delay (e.g. 15 days past term) versus the nominal contractual due date.
                </p>
              </div>

              {/* Assumption 4: Automated Cadence Lift Factor */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">Automated Cadence Collection Acceleration Boost</span>
                  <span className="font-mono text-indigo-400 font-bold">+{cadenceLiftBoost}% acceleration</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={cadenceLiftBoost}
                  onChange={(e) => setCadenceLiftBoost(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  Simulates improved debtor turnaround velocity achieved through multichannel automated payment reminders (Part 12 & 13).
                </p>
              </div>

              {/* ECB Reference Rates Table */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Reference FX Rates (Section 18.3 Multi-Currency Handling):
                </span>
                <div className="flex space-x-4 font-mono text-[11px] text-slate-400">
                  <span>1 GBP = 1.0000 GBP</span>
                  <span>1 EUR = 0.8500 GBP</span>
                  <span>1 USD = 0.7800 GBP</span>
                  <span>1 ZAR = 0.0440 GBP</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPtpAdherenceRate(88);
                  setDisputeHoldDiscount(25);
                  setHistoricalPaymentDelayWeight(70);
                  setCadenceLiftBoost(0);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Reset to Standard Assumptions
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAssumptionsModal(false);
                  fetchForecast();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20"
              >
                Apply & Recalculate Projections
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
