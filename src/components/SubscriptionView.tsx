import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Download,
  RefreshCw,
  Zap,
  Layers,
  TrendingUp,
  Users,
  FileText,
  Mail,
  MessageSquare,
  Bot,
  HardDrive,
  Code2,
  Calendar,
  Lock,
  ChevronRight,
  Sparkles,
  Info,
  DollarSign,
  HelpCircle,
  ArrowRight,
  Slash,
  Edit3,
  Sliders,
  History,
  Building2
} from 'lucide-react';
import {
  Organization,
  SubscriptionPlanDefinition,
  OrganizationSubscriptionState,
  SubscriberUsageMetrics,
  SubscriptionPlanId,
  SubscriptionBillingInterval,
  SubscriptionStatus,
  SubscriptionInvoice,
  PlanChangeHistoryRecord,
  CommercialPlanAdminAudit
} from '../types';
import { formatCurrency } from '../services/calculations';

export interface SubscriptionViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab
}) => {
  // Navigation tabs within Subscription module
  const [activeTab, setActiveTab] = useState<
    'overview' | 'plans' | 'usage' | 'invoices' | 'provider' | 'lifecycle' | 'admin'
  >('overview');

  // Server state
  const [plans, setPlans] = useState<SubscriptionPlanDefinition[]>([]);
  const [subState, setSubState] = useState<OrganizationSubscriptionState | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlanDefinition | null>(null);
  const [usage, setUsage] = useState<SubscriberUsageMetrics | null>(null);
  const [domainSeparationRule, setDomainSeparationRule] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Billing Interval toggle for pricing catalogue
  const [catalogueInterval, setCatalogueInterval] = useState<SubscriptionBillingInterval>('monthly');

  // Plan change confirmation modal
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<SubscriptionPlanDefinition | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);

  // Invoice viewer modal
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);

  // Cancel subscription modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Found an alternative solution');

  // Webhook simulator state
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<any | null>(null);

  // Hosted Checkout state
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutSessionData, setCheckoutSessionData] = useState<any | null>(null);

  // Platform Admin Plan Editor state
  const [adminSelectedPlanId, setAdminSelectedPlanId] = useState<SubscriptionPlanId>('professional');
  const [adminPlanForm, setAdminPlanForm] = useState<SubscriptionPlanDefinition | null>(null);
  const [isSavingPlanConfig, setIsSavingPlanConfig] = useState(false);

  // Fetch initial data
  const loadSubscriptionData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [plansRes, orgSubRes] = await Promise.all([
        fetch('/api/subscriptions/plans'),
        fetch(`/api/subscriptions/organization/${organization.id}`)
      ]);

      const plansData = await plansRes.json();
      const orgSubData = await orgSubRes.json();

      if (plansData.success) {
        setPlans(plansData.data);
      }
      if (orgSubData.success) {
        setSubState(orgSubData.data.subscription);
        setCurrentPlan(orgSubData.data.plan);
        setUsage(orgSubData.data.usage);
        setDomainSeparationRule(orgSubData.data.domainSeparationRule);
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setActionMessage({ type: 'error', text: 'Failed to communicate with subscription billing service.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [organization.id]);

  // Synchronize admin editor form when adminSelectedPlanId or plans change
  useEffect(() => {
    if (plans.length > 0) {
      const p = plans.find((x) => x.id === adminSelectedPlanId) || plans[0];
      setAdminPlanForm(JSON.parse(JSON.stringify(p)));
    }
  }, [adminSelectedPlanId, plans]);

  // Actions
  const handleSwitchInterval = async (targetInterval: SubscriptionBillingInterval) => {
    try {
      const res = await fetch('/api/subscriptions/change-interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, billingInterval: targetInterval })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: data.message });
        loadSubscriptionData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to switch billing interval.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Network error updating billing interval.' });
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlanForChange) return;
    setIsChangingPlan(true);
    setDowngradeError(null);

    try {
      const res = await fetch('/api/subscriptions/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          targetPlanId: selectedPlanForChange.id,
          billingInterval: catalogueInterval,
          requestedBy: 'Alice Morgan (Admin)'
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: data.message });
        setSelectedPlanForChange(null);
        loadSubscriptionData();
        if (onRefreshData) onRefreshData();
      } else {
        setDowngradeError(data.error || 'Unable to update subscription plan.');
      }
    } catch (err: any) {
      setDowngradeError(err.message || 'Error occurred while contacting billing server.');
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          cancellationReason,
          requestedBy: 'Alice Morgan (Admin)'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'info', text: data.message });
        setIsCancelModalOpen(false);
        loadSubscriptionData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cancel subscription.' });
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: data.message });
        loadSubscriptionData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to resume subscription.' });
    }
  };

  const handleCreateHostedCheckout = async (targetPlanId: SubscriptionPlanId) => {
    setIsCreatingCheckout(true);
    try {
      const res = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          planId: targetPlanId,
          billingInterval: subState?.billingInterval || 'monthly'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutSessionData(data);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Failed to initiate hosted checkout session.' });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleSimulateWebhook = async (
    eventType: 'invoice.payment_succeeded' | 'invoice.payment_failed' | 'customer.subscription.deleted',
    simulateValidSignature: boolean
  ) => {
    setIsSimulatingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/subscriptions/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(simulateValidSignature ? { 'stripe-signature': 't=1730000000,v1=valid_stripe_signature_hash' } : {})
        },
        body: JSON.stringify({
          eventType,
          organizationId: organization.id,
          planId: subState?.planId || 'professional',
          billingInterval: subState?.billingInterval || 'monthly',
          simulateValidSignature
        })
      });
      const data = await res.json();
      setWebhookResult({ status: res.status, data });
      if (res.ok) {
        loadSubscriptionData();
      }
    } catch (err: any) {
      setWebhookResult({ status: 500, data: { error: err.message } });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const handleSimulateLifecycleStatus = async (status: SubscriptionStatus) => {
    try {
      const res = await fetch('/api/subscriptions/simulate-lifecycle-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          targetStatus: status
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'info', text: data.message });
        loadSubscriptionData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to simulate status.' });
    }
  };

  const handleSaveAdminPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPlanForm) return;
    setIsSavingPlanConfig(true);
    try {
      const res = await fetch(`/api/subscriptions/admin/plans/${adminPlanForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adminPlanForm,
          adminUserId: 'usr-admin-helena',
          adminUserName: 'Helena Vance (Platform Administrator)',
          action: 'limit_updated'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Plan ${adminPlanForm.name} updated successfully.` });
        loadSubscriptionData();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update plan.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error updating plan configuration.' });
    } finally {
      setIsSavingPlanConfig(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Trial Evaluation
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Past Due (Retry Pending)
          </span>
        );
      case 'grace_period':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Grace Period (Expiring Soon)
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Suspended
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Slash className="w-3.5 h-3.5 mr-1" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3.5 h-3.5 mr-1" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  // Usage meter percentage calculations
  const calculateUsagePct = (used: number, limit: number) => {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Domain Separation Invariant Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                Part 24 — Subscription Billing & Monetisation
              </span>
              {subState && getStatusBadge(subState.status)}
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <span>CNTCollect SaaS Commercial Subscription</span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage CNTCollect SaaS platform licenses, recurring billing, tier entitlements, quota metering, and automated merchant billing webhooks.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadSubscriptionData}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Explore Plans</span>
            </button>
          </div>
        </div>

        {/* Strict Domain Separation Rule Warning (Section 24 Architecture Invariant) */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-amber-300">
              Architecture Invariant: Strict Domain Separation of Financial Ledgers
            </div>
            <p className="text-amber-200/90 leading-relaxed text-[11px]">
              <strong>CNTCollect subscription charges</strong> are amounts owed by your business (the SaaS subscriber) to CNTCollect for software platform usage.
              Conversely, <strong>Customer receivables</strong> are amounts owed by your commercial debtors to your business.
              In accordance with Section 24 governance, these two financial ledgers are decoupled and will never be mixed or netted.
            </p>
          </div>
        </div>

        {/* Global Feedback notification */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : actionMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white font-bold ml-3 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sub-navigation tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-800 pt-3 overflow-x-auto pb-1 text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview & Current Plan', icon: Layers },
            { id: 'plans', label: 'Commercial Plans (24.1)', icon: Zap },
            { id: 'usage', label: 'Usage Metering (24.5)', icon: TrendingUp },
            { id: 'invoices', label: 'Platform Invoices (24.3)', icon: FileText },
            { id: 'provider', label: 'Hosted Checkout & Webhooks (24.4)', icon: CreditCard },
            { id: 'lifecycle', label: 'Lifecycle Simulator (24.3)', icon: Clock },
            { id: 'admin', label: 'Platform Administration (24.6)', icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB CONTENT */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && subState && currentPlan && (
        <div className="space-y-6">
          {/* Active Plan Hero Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Current Entitlement Tier</span>
                  {getStatusBadge(subState.status)}
                  {subState.verifiedByPaymentGateway && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Gateway Verified
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <span>{currentPlan.name}</span>
                  {currentPlan.isPopular && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                      Most Popular
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">{currentPlan.targetAudience}</p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">
                  ${subState.billingInterval === 'annual' ? currentPlan.annualPriceUsdPerMonth : currentPlan.monthlyPriceUsd}
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Billed {subState.billingInterval === 'annual' ? `annually ($${currentPlan.annualBillingTotalUsd}/yr)` : 'monthly'}
                  {subState.billingInterval === 'annual' && (
                    <span className="text-emerald-400 font-semibold ml-1">(20% discount active)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Details & Lifecycle Status Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Current Period Window</span>
                </div>
                <div className="font-semibold text-white">
                  {subState.currentPeriodStart} to {subState.currentPeriodEnd}
                </div>
                <div className="text-[10px] text-slate-500">
                  {subState.cancelAtPeriodEnd ? (
                    <span className="text-amber-400 font-medium">Cancels at period end</span>
                  ) : (
                    'Auto-renews on scheduled date'
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Billing Interval & Terms</span>
                </div>
                <div className="font-semibold text-white capitalize flex items-center justify-between">
                  <span>{subState.billingInterval} Cadence</span>
                  <button
                    onClick={() => handleSwitchInterval(subState.billingInterval === 'monthly' ? 'annual' : 'monthly')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium underline"
                  >
                    Switch to {subState.billingInterval === 'monthly' ? 'Annual (-20%)' : 'Monthly'}
                  </button>
                </div>
                <div className="text-[10px] text-slate-500">All recurring charges billed in USD</div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Payment Method on File</span>
                </div>
                <div className="font-semibold text-white flex items-center space-x-1.5">
                  <span>{subState.paymentMethod?.brand || 'Visa'} •••• {subState.paymentMethod?.last4 || '4242'}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Exp: {subState.paymentMethod?.expMonth}/{subState.paymentMethod?.expYear} • Hosted via {subState.paymentMethod?.hostedProvider}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Support Tier Arrangement</span>
                </div>
                <div className="font-semibold text-white capitalize">
                  {currentPlan.limits.supportTier.replace('_', ' ')}
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentPlan.id === 'enterprise' ? '24/7 dedicated telephone & Slack channel' : 'Standard ticketing SLA'}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Change or Upgrade Plan</span>
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition border border-slate-700 flex items-center space-x-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Check Usage Quotas</span>
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition border border-slate-700 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Tax Invoices</span>
                </button>
              </div>

              <div>
                {subState.cancelAtPeriodEnd ? (
                  <button
                    onClick={handleResumeSubscription}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    Resume Active Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition flex items-center space-x-1"
                  >
                    <span>Cancel Subscription</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Core Entitlements & Included Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Included Plan Features ({currentPlan.name})</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {currentPlan.featureBullets.map((feat, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Slash className="w-4 h-4 text-amber-400" />
                <span>Plan Limitations & Upgrade Opportunities</span>
              </h3>
              {currentPlan.restrictions.length > 0 ? (
                <ul className="space-y-2.5 text-xs text-slate-400">
                  {currentPlan.restrictions.map((res, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{res}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  No operational restrictions on this plan. Custom limits configured under Enterprise Master Agreement.
                </div>
              )}

              <div className="pt-2">
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Commercial Pricing Note</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {currentPlan.commercialPricingDisclaimer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMERCIAL PLANS CATALOGUE (Section 24.1 & 24.2) */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Billing Interval Toggle & Subtitle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
            <h2 className="text-xl font-bold text-white">Configurable SaaS Subscription Plans</h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Choose the tier tailored to your operational receivables volume. All plans include enterprise data isolation, security audit logging, and automated compliance.
            </p>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <span className={`text-xs font-medium ${catalogueInterval === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setCatalogueInterval(catalogueInterval === 'monthly' ? 'annual' : 'monthly')}
                className="w-12 h-6 rounded-full bg-slate-800 border border-slate-700 p-0.5 relative transition-colors focus:outline-none"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-indigo-500 transition-transform ${
                    catalogueInterval === 'annual' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-medium ${catalogueInterval === 'annual' ? 'text-white' : 'text-slate-400'}`}>
                  Annual Billing
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Save 20%
                </span>
              </div>
            </div>
          </div>

          {/* 5 Plans Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {plans.map((p) => {
              const isCurrent = subState?.planId === p.id;
              const price = catalogueInterval === 'annual' ? p.annualPriceUsdPerMonth : p.monthlyPriceUsd;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition ${
                    isCurrent
                      ? 'bg-slate-900/90 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{p.id}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                          Current Plan
                        </span>
                      )}
                      {!isCurrent && p.isPopular && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Popular
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{p.name.split('—')[1]?.trim() || p.name}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 min-h-[32px]">{p.targetAudience}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      {p.isCustomQuote ? (
                        <div className="text-xl font-black text-white">Custom Quote</div>
                      ) : (
                        <div className="text-2xl font-black text-white">
                          ${price}
                          <span className="text-xs text-slate-400 font-normal"> / mo</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.isCustomQuote
                          ? 'Tailored enterprise SLA'
                          : catalogueInterval === 'annual'
                          ? `$${p.annualBillingTotalUsd} billed annually`
                          : 'Billed monthly'}
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-semibold text-slate-300">Capacity & Limits:</div>
                      <div className="text-[11px] space-y-1 text-slate-400">
                        <div className="flex justify-between">
                          <span>Active Invoices:</span>
                          <strong className="text-white">{p.limits.maxActiveInvoices.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Customers:</span>
                          <strong className="text-white">{p.limits.maxCustomers.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Team Users:</span>
                          <strong className="text-white">{p.limits.maxUsers}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly AI:</span>
                          <strong className="text-white">{p.limits.monthlyAiRequestsLimit} req</strong>
                        </div>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Features:</div>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {p.featureBullets.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start space-x-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="pt-3 border-t border-slate-800">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
                      >
                        Active Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDowngradeError(null);
                          setSelectedPlanForChange(p);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                          p.id === 'enterprise'
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {p.id === 'enterprise' ? 'Contact Sales' : `Switch to ${p.name.split('—')[1]?.trim() || p.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commercial Pricing Transparency Notice */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white">Commercial Pricing Disclosure (Section 24.1):</span>
              <p className="text-[11px] leading-relaxed">
                These prices are proposed product defaults and starting benchmarks, not verified market prices. All prices, quotas, intervals, currencies, and grace period limits are fully customizable via the Platform Administration console.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USAGE METERING & QUOTAS (Section 24.5) */}
      {activeTab === 'usage' && usage && currentPlan && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Usage Metering & Quotas</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Tracking active resource consumption against your subscribed {currentPlan.name} quota limits.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Billing Cycle: {subState?.currentPeriodStart} to {subState?.currentPeriodEnd}
              </span>
            </div>

            {/* Server-side Guard Banner (Section 24.5) */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[11px] text-slate-300">
                <div className="font-semibold text-white">Server-Side Limits Enforcement & Anti-Bypass Guard:</div>
                <p className="text-slate-400 leading-relaxed">
                  All usage thresholds are strictly evaluated server-side on creation requests (invoices, customers, users, reminders).
                  Direct API calls cannot bypass subscription boundaries.
                  <strong> CNTCollect does not silently charge overages</strong>; instead, clear alerts are issued at 80% and 95% threshold capacity.
                </p>
              </div>
            </div>

            {/* Metering Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                {
                  label: 'Active Invoices',
                  icon: FileText,
                  used: usage.activeInvoicesCount,
                  limit: currentPlan.limits.maxActiveInvoices,
                  unit: 'invoices',
                  desc: 'Unsettled trade receivables active in ledger'
                },
                {
                  label: 'Registered Customers / Debtors',
                  icon: Users,
                  used: usage.customersCount,
                  limit: currentPlan.limits.maxCustomers,
                  unit: 'debtors',
                  desc: 'Unique commercial counterparties registered'
                },
                {
                  label: 'Team User Seats',
                  icon: Building2,
                  used: usage.usersCount,
                  limit: currentPlan.limits.maxUsers,
                  unit: 'seats',
                  desc: 'Credit controllers, managers & collectors'
                },
                {
                  label: 'AI Draft Requests (Monthly)',
                  icon: Bot,
                  used: usage.aiRequestsThisMonth,
                  limit: currentPlan.limits.monthlyAiRequestsLimit,
                  unit: 'requests',
                  desc: 'Gemini reasoning & dunning drafts'
                },
                {
                  label: 'AI Tokens Processed',
                  icon: Sparkles,
                  used: usage.aiTokensThisMonth,
                  limit: currentPlan.limits.monthlyAiTokensLimit,
                  unit: 'tokens',
                  desc: 'LLM context window token throughput'
                },
                {
                  label: 'Automated Reminders Dispatched',
                  icon: Mail,
                  used: usage.remindersDispatchedThisMonth,
                  limit: currentPlan.limits.monthlyRemindersLimit,
                  unit: 'dispatches',
                  desc: 'Multi-channel dunning communications'
                },
                {
                  label: 'WhatsApp Business Messages',
                  icon: MessageSquare,
                  used: usage.whatsAppMessagesThisMonth,
                  limit: currentPlan.limits.monthlyWhatsAppLimit,
                  unit: 'messages',
                  desc: 'Meta Cloud API HSM template messages'
                },
                {
                  label: 'Outbound Email Volume',
                  icon: Mail,
                  used: usage.emailVolumeThisMonth,
                  limit: currentPlan.limits.monthlyEmailLimit,
                  unit: 'emails',
                  desc: 'SendGrid & authenticated SMTP deliveries'
                },
                {
                  label: 'Document Storage',
                  icon: HardDrive,
                  used: usage.storageMbUsed,
                  limit: currentPlan.limits.storageMbLimit,
                  unit: 'MB',
                  desc: 'Invoices, evidence proofs & PDFs'
                },
                {
                  label: 'API Requests This Month',
                  icon: Code2,
                  used: usage.apiRequestsThisMonth,
                  limit: currentPlan.limits.apiRequestsPerMinute * 60 * 24 * 30 || 50000,
                  unit: 'calls',
                  desc: `Rate limit: ${currentPlan.limits.apiRequestsPerMinute} req/min`
                }
              ].map((meter, idx) => {
                const Icon = meter.icon;
                const pct = calculateUsagePct(meter.used, meter.limit);
                const isNearLimit = pct >= 80 && pct < 95;
                const isExceeded = pct >= 95;

                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-white">{meter.label}</span>
                      </div>
                      {isExceeded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          At Capacity (95%+)
                        </span>
                      ) : isNearLimit ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Warning (80%+)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">{pct}%</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 mono-num">
                          {typeof meter.used === 'number' && meter.used % 1 !== 0 ? meter.used.toFixed(1) : meter.used.toLocaleString()} {meter.unit}
                        </span>
                        <span className="text-slate-500 mono-num">
                          Limit: {meter.limit.toLocaleString()} {meter.unit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight">{meter.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM INVOICES & BILLING HISTORY (Section 24.3) */}
      {activeTab === 'invoices' && subState && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>CNTCollect SaaS Platform Tax Invoices</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Statutory tax invoices and payment receipts issued by CNTCollect for software subscriptions.
                </p>
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Statutory 7-Year UK/EU Tax Compliance Archive</span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Invoice ID</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Period Window</th>
                    <th className="py-2.5 px-3">Description / Tier</th>
                    <th className="py-2.5 px-3 text-right">Tax (VAT 20%)</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {subState.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-mono font-medium text-white">{inv.id}</td>
                      <td className="py-3 px-3">{inv.issueDate}</td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {inv.periodStart} to {inv.periodEnd}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {inv.planName} ({inv.billingInterval})
                      </td>
                      <td className="py-3 px-3 text-right mono-num text-slate-400">
                        ${inv.taxAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white mono-num">
                        ${inv.amount.toFixed(2)} {inv.currency}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HOSTED CHECKOUT & AUTHENTICATED WEBHOOKS (Section 24.4) */}
      {activeTab === 'provider' && (
        <div className="space-y-6">
          {/* Section 24.4 Architecture Requirement Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Payment Provider Integration & Webhook Security Engine</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              In accordance with Section 24.4, subscription payments must be handled via a secure, international hosted provider (e.g. Stripe Billing).
              Crucially: <strong>Paid entitlements are never activated solely because the frontend displays a checkout success message.</strong> Entitlements are only unlocked following server-side cryptographic signature validation of authenticated billing webhooks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Hosted Checkout Simulation */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                    <span>Hosted Checkout Session Generator</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Generate an authentic hosted checkout session with automated international tax calculation (Stripe Tax reverse charge VAT).
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCreateHostedCheckout('professional')}
                    disabled={isCreatingCheckout}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Generate Hosted Checkout Session</span>
                  </button>
                </div>

                {checkoutSessionData && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Checkout Session Created:</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 break-all bg-slate-950 p-2 rounded border border-slate-800">
                      {checkoutSessionData.url}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {checkoutSessionData.taxHandling}
                    </div>
                  </div>
                )}
              </div>

              {/* Cryptographic Webhook Simulator */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Webhook Signature Validator</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Test genuine webhook event verification vs malicious/unauthenticated webhook injection attempts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSimulateWebhook('invoice.payment_succeeded', true)}
                    disabled={isSimulatingWebhook}
                    className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition text-left"
                  >
                    <div>✓ Valid Payment Webhook</div>
                    <div className="text-[10px] font-normal text-emerald-400/80">invoice.payment_succeeded</div>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook('invoice.payment_succeeded', false)}
                    disabled={isSimulatingWebhook}
                    className="p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition text-left"
                  >
                    <div>✗ Tampered Signature Test</div>
                    <div className="text-[10px] font-normal text-rose-400/80">Simulate attack / Rejection (401)</div>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook('invoice.payment_failed', true)}
                    disabled={isSimulatingWebhook}
                    className="p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition text-left"
                  >
                    <div>! Payment Failed Event</div>
                    <div className="text-[10px] font-normal text-amber-400/80">Triggers Grace Period</div>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook('customer.subscription.deleted', true)}
                    disabled={isSimulatingWebhook}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition text-left"
                  >
                    <div>Subscription Terminated</div>
                    <div className="text-[10px] font-normal text-slate-400">customer.subscription.deleted</div>
                  </button>
                </div>

                {webhookResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono text-[11px] space-y-1 ${
                      webhookResult.status === 200
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="font-bold">
                      HTTP Response Status: {webhookResult.status} {webhookResult.status === 200 ? 'OK' : 'UNAUTHORIZED'}
                    </div>
                    <div className="break-all">{JSON.stringify(webhookResult.data)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIFECYCLE STATE MACHINE SIMULATOR (Section 24.3) */}
      {activeTab === 'lifecycle' && subState && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Subscription Lifecycle State Machine (Section 24.3)</span>
            </h2>
            <p className="text-xs text-slate-400">
              CNTCollect implements all 7 canonical states of SaaS subscriber lifecycle. Transition between states below to inspect platform entitlement handling and UI behaviors.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                {
                  id: 'trial',
                  title: '1. Trial Evaluation',
                  desc: 'Free trial window with full or restricted feature access.',
                  color: 'cyan'
                },
                {
                  id: 'active',
                  title: '2. Active (In Good Standing)',
                  desc: 'Recurring payment successfully collected and verified.',
                  color: 'emerald'
                },
                {
                  id: 'past_due',
                  title: '3. Past Due',
                  desc: 'Payment attempt failed. Smart dunning retries active.',
                  color: 'amber'
                },
                {
                  id: 'grace_period',
                  title: '4. Grace Period',
                  desc: '14-day courtesy window before operational feature lock.',
                  color: 'orange'
                },
                {
                  id: 'suspended',
                  title: '5. Suspended',
                  desc: 'Account locked due to consecutive billing failures.',
                  color: 'red'
                },
                {
                  id: 'cancelled',
                  title: '6. Cancelled',
                  desc: 'User elected to discontinue; active until period end.',
                  color: 'slate'
                },
                {
                  id: 'expired',
                  title: '7. Expired',
                  desc: 'Term has lapsed without renewal or active payment method.',
                  color: 'rose'
                }
              ].map((st) => (
                <div
                  key={st.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    subState.status === st.id
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{st.title}</span>
                      {subState.status === st.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{st.desc}</p>
                  </div>

                  <button
                    onClick={() => handleSimulateLifecycleStatus(st.id as SubscriptionStatus)}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    Simulate State
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PLATFORM ADMINISTRATION (Section 24.6) */}
      {activeTab === 'admin' && adminPlanForm && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Platform Administration — Commercial Plan Configurator</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure plan pricing, billing intervals, quotas, and entitlements. All modifications are immutably audited.
                </p>
              </div>

              {/* Plan selector pills */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setAdminSelectedPlanId(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      adminSelectedPlanId === p.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Configuration Form */}
            <form onSubmit={handleSaveAdminPlan} className="space-y-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Plan Display Name</label>
                  <input
                    type="text"
                    value={adminPlanForm.name}
                    onChange={(e) => setAdminPlanForm({ ...adminPlanForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Monthly Price (USD)</label>
                  <input
                    type="number"
                    value={adminPlanForm.monthlyPriceUsd}
                    onChange={(e) => setAdminPlanForm({ ...adminPlanForm, monthlyPriceUsd: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Annual Price / Month (USD)</label>
                  <input
                    type="number"
                    value={adminPlanForm.annualPriceUsdPerMonth}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        annualPriceUsdPerMonth: Number(e.target.value),
                        annualBillingTotalUsd: Number(e.target.value) * 12
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Active Invoices Limit</label>
                  <input
                    type="number"
                    value={adminPlanForm.limits.maxActiveInvoices}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, maxActiveInvoices: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Debtor Customers Limit</label>
                  <input
                    type="number"
                    value={adminPlanForm.limits.maxCustomers}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, maxCustomers: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">User Seats Limit</label>
                  <input
                    type="number"
                    value={adminPlanForm.limits.maxUsers}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, maxUsers: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Monthly AI Requests Quota</label>
                  <input
                    type="number"
                    value={adminPlanForm.limits.monthlyAiRequestsLimit}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, monthlyAiRequestsLimit: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Trial Window Duration (Days)</label>
                  <input
                    type="number"
                    value={adminPlanForm.trialDurationDays}
                    onChange={(e) => setAdminPlanForm({ ...adminPlanForm, trialDurationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Grace Period (Days)</label>
                  <input
                    type="number"
                    value={adminPlanForm.gracePeriodDays}
                    onChange={(e) => setAdminPlanForm({ ...adminPlanForm, gracePeriodDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Automated Workflows Builder</div>
                    <div className="text-[10px] text-slate-500">Allow rule execution</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminPlanForm.limits.allowAutomatedWorkflows}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, allowAutomatedWorkflows: e.target.checked }
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Advanced Integrations</div>
                    <div className="text-[10px] text-slate-500">WhatsApp & Accounting</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminPlanForm.limits.allowAdvancedIntegrations}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        limits: { ...adminPlanForm.limits, allowAdvancedIntegrations: e.target.checked }
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Public Availability</div>
                    <div className="text-[10px] text-slate-500">Visible in catalogue</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminPlanForm.isPubliclyAvailable}
                    onChange={(e) =>
                      setAdminPlanForm({
                        ...adminPlanForm,
                        isPubliclyAvailable: e.target.checked
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => loadSubscriptionData()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Reset Changes
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlanConfig}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isSavingPlanConfig ? 'Saving...' : `Save ${adminPlanForm.name} Changes`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODALS */}

      {/* PLAN CHANGE CONFIRMATION MODAL (Includes Server-side Downgrade Safeguard) */}
      {selectedPlanForChange && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Confirm Subscription Tier Change</span>
              </h3>
              <button
                onClick={() => setSelectedPlanForChange(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                You are transitioning from <strong className="text-white">{currentPlan?.name}</strong> to{' '}
                <strong className="text-indigo-400">{selectedPlanForChange.name}</strong>.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Billing Cadence:</span>
                  <strong className="text-white capitalize">{catalogueInterval}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Applicable Charge:</span>
                  <strong className="text-white mono-num">
                    ${catalogueInterval === 'annual' ? selectedPlanForChange.annualBillingTotalUsd : selectedPlanForChange.monthlyPriceUsd} {selectedPlanForChange.currency}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">New Active Invoices Limit:</span>
                  <strong className="text-white mono-num">{selectedPlanForChange.limits.maxActiveInvoices.toLocaleString()} invoices</strong>
                </div>
              </div>

              {downgradeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold">Downgrade Blocked:</span>
                    <p className="text-[11px] leading-relaxed">{downgradeError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedPlanForChange(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlanChange}
                disabled={isChangingPlan}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                {isChangingPlan ? 'Updating Plan...' : 'Confirm & Apply Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAX INVOICE DETAIL & STATUTORY RECEIPT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Statutory Tax Receipt</span>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{selectedInvoice.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    PAID IN FULL
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Issuer / Vendor</span>
                <div className="font-bold text-white">CNTCollect Cloud Operations Ltd</div>
                <div className="text-slate-400 text-[11px]">{selectedInvoice.taxInvoiceDetails.cntCollectAddress}</div>
                <div className="text-indigo-400 text-[11px]">VAT Reg: {selectedInvoice.taxInvoiceDetails.cntCollectVatNumber}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Billed Customer (Subscriber)</span>
                <div className="font-bold text-white">{selectedInvoice.organizationName}</div>
                <div className="text-slate-400 text-[11px]">VAT / Tax ID: {selectedInvoice.taxInvoiceDetails.subscriberVatNumber}</div>
                <div className="text-slate-400 text-[11px]">Period: {selectedInvoice.periodStart} to {selectedInvoice.periodEnd}</div>
              </div>
            </div>

            {/* Line items */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400 font-medium">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-white font-medium">
                <div>
                  <div>{selectedInvoice.planName} SaaS Platform Subscription</div>
                  <div className="text-[10px] text-slate-500">Cadence: {selectedInvoice.billingInterval} • Ref: {selectedInvoice.paymentReference}</div>
                </div>
                <span className="mono-num">${(selectedInvoice.amount - selectedInvoice.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>Value Added Tax (VAT @ 20.0%):</span>
                <span className="mono-num">${selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm border-t border-slate-800 pt-2">
                <span>Total Paid:</span>
                <span className="mono-num text-emerald-400">${selectedInvoice.amount.toFixed(2)} {selectedInvoice.currency}</span>
              </div>
            </div>

            {/* Mandatory domain separation note on invoice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              {selectedInvoice.taxInvoiceDetails.domainSeparationNotice}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Save Tax PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Cancel Subscription</span>
              </h3>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Your subscription will remain operational until the end of your prepaid period ({subState?.currentPeriodEnd}). After this date, automated workflows, API access, and dunning cycles will be paused.
              </p>

              <div className="space-y-1">
                <label className="font-medium text-slate-400">Reason for cancellation (optional):</label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Temporary project complete">Temporary project complete</option>
                  <option value="Switching to another system">Switching to another system</option>
                  <option value="Cost consideration">Cost consideration</option>
                  <option value="Downsizing AR operations">Downsizing AR operations</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Keep Active
              </button>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
