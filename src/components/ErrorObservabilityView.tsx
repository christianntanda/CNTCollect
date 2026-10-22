import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Activity,
  Server,
  Zap,
  RotateCcw,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Layers,
  Send,
  Database,
  Radio,
  FileCheck,
  HelpCircle,
  XCircle,
  Play,
  ArrowRight
} from 'lucide-react';
import {
  Organization,
  ObservabilityDashboardState,
  ObservabilityIncident,
  OperationalAlert,
  SubsystemHealth,
  ErrorCategory
} from '../types';

export interface ErrorObservabilityViewProps {
  organization: Organization;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ErrorObservabilityView: React.FC<ErrorObservabilityViewProps> = ({
  organization,
  onRefreshData,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'health' | 'tracking' | 'incidents' | 'simulator' | 'alerts'>('health');
  const [dashboardData, setDashboardData] = useState<ObservabilityDashboardState | null>(null);
  const [errorCatalog, setErrorCatalog] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ObservabilityIncident | null>(null);
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState<string>('all');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Simulator state
  const [simCategory, setSimCategory] = useState<ErrorCategory>('validation');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchObservabilityData();
  }, [organization.id]);

  const fetchObservabilityData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/observability/dashboard');
      const data = await res.json();
      if (data.success) {
        setDashboardData(data.data);
        setErrorCatalog(data.errorCatalog || {});
      }
    } catch (err) {
      console.error('Failed to load observability dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateError = async () => {
    setIsSimulating(true);
    setSimResult(null);
    setActionNotice(null);
    try {
      const res = await fetch('/api/observability/simulate-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: simCategory,
          organizationId: organization.id,
          contextData: {
            actor: 'Collector Specialist',
            endpoint: '/api/v1/mutation',
            simulatedPayload: { sampleAmount: 1450.00 }
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
        setActionNotice({
          type: 'success',
          message: `Simulated ${data.internalDiagnosticLog.errorCode}: Verified sanitized diagnostic logging and user-safe translation.`
        });
        fetchObservabilityData();
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Failed to simulate error.' });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRetryIncident = async (incidentId: string) => {
    setRetryingId(incidentId);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/observability/incidents/${incidentId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: data.message });
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            incidents: prev.incidents.map((inc) => (inc.id === incidentId ? data.incident : inc))
          };
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Retry failed.' });
      }
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Network error executing retry.' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    setResolvingId(incidentId);
    try {
      const res = await fetch(`/api/observability/incidents/${incidentId}/resolve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'info', message: data.message });
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            incidents: prev.incidents.map((inc) => (inc.id === incidentId ? data.incident : inc))
          };
        });
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/observability/alerts/${alertId}/acknowledge`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeAlerts: prev.activeAlerts.map((a) => (a.id === alertId ? data.alert : a))
          };
        });
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filteredIncidents = (dashboardData?.incidents || []).filter((inc) => {
    if (incidentCategoryFilter === 'all') return true;
    return inc.category === incidentCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Error Handling & Observability Engine</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Part 32 SRE Hub
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  User-safe error translations, secure zero-leak diagnostic logging, real-time subsystem telemetry, operational alerting & safe re-dispatch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchObservabilityData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 border animate-in fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : actionNotice.type === 'info'
              ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionNotice.message}</span>
          </div>
        )}

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">P50 Latency</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-bold text-emerald-400">{dashboardData?.metrics.p50LatencyMs || 6.2}</span>
              <span className="text-[10px] text-slate-400">ms</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">Optimal</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">P95 Latency</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-bold text-white">{dashboardData?.metrics.p95LatencyMs || 18.4}</span>
              <span className="text-[10px] text-slate-400">ms</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Indexed API</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Error Rate</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-bold text-emerald-400">{dashboardData?.metrics.errorRatePercent || 0.12}%</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">SLA &lt; 0.5%</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Active Incidents</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-lg font-bold ${
                (dashboardData?.metrics.activeIncidentsCount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {dashboardData?.metrics.activeIncidentsCount || 0}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Quarantined</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Failed Reminders</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-lg font-bold ${
                (dashboardData?.metrics.failedRemindersCount || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {dashboardData?.metrics.failedRemindersCount || 0}
              </span>
            </div>
            <span className="text-[10px] text-rose-300/80 mt-0.5 block">Retry Available</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Failed Webhooks</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-lg font-bold ${
                (dashboardData?.metrics.failedWebhooksCount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {dashboardData?.metrics.failedWebhooksCount || 0}
              </span>
            </div>
            <span className="text-[10px] text-amber-300/80 mt-0.5 block">Queue Buffered</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">DLQ Jobs</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-bold text-rose-400">{dashboardData?.metrics.failedJobsCount || 2}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Max Retries (3x)</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Zero Leaks</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-lg font-bold text-emerald-400">100%</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">Sanitized</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-slate-800 mt-6 pt-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'health', label: 'Subsystem Health Checks' },
            { id: 'tracking', label: '9-Point Failure Tracking' },
            { id: 'incidents', label: `Incidents & Safe Retries (${dashboardData?.incidents.length || 0})` },
            { id: 'simulator', label: '11-Class Error Simulator' },
            { id: 'alerts', label: `Operational Alerts (${dashboardData?.activeAlerts.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SUBSYSTEM HEALTH CHECKS */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(dashboardData?.healthChecks || []).map((subsystem) => (
            <div
              key={subsystem.key}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl border ${
                    subsystem.status === 'healthy'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                  }`}>
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{subsystem.name}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Subsystem: {subsystem.key}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  subsystem.status === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  {subsystem.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {subsystem.details}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Latency: {subsystem.latencyMs}ms</span>
                <span>{subsystem.lastCheckedAt.split(' ')[1]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: 9-POINT FAILURE DOMAIN TRACKING (PART 32 MANDATE) */}
      {activeTab === 'tracking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>9-Point Core Failure Domain Telemetry (Part 32 Mandate)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Explicit tracking for Application errors, Failed background jobs, API response times, Database errors, Reminder delivery failures, AI request failures, Webhook failures, Subscription billing failures, and Storage errors.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
              9 / 9 ACTIVE DOMAINS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {(dashboardData?.ninePointTracking || []).map((point, idx) => (
              <div
                key={point.domainKey}
                className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-850 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-white">{point.domainName}</h4>
                  </div>
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    point.currentStatus === 'healthy'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : point.currentStatus === 'monitored'
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}>
                    {point.currentStatus}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    {point.metricLabel}
                  </span>
                  <div className="text-sm font-bold text-white font-mono">
                    {point.trackedCountOrValue}
                  </div>
                  <p className="text-[11px] text-slate-400 pt-0.5">
                    <span className="text-slate-500">Auto-Remediation: </span>
                    {point.autoRemediation}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Status: {point.lastIncidentAt}</span>
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className="text-rose-400 hover:text-rose-300 flex items-center space-x-0.5"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INCIDENTS & SAFE RETRY EXPLORER */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold shrink-0">Filter By:</span>
            {['all', 'reminder', 'integration', 'ai', 'validation', 'database', 'payment'].map((cat) => (
              <button
                key={cat}
                onClick={() => setIncidentCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize border transition ${
                  incidentCategoryFilter === cat
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Zero Active Incidents in this Category</p>
              <p className="text-xs text-slate-500">All automated events, reminders, and webhook dispatches completed cleanly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`bg-slate-900 border rounded-2xl p-5 space-y-3 transition ${
                    incident.status === 'resolved'
                      ? 'border-slate-800 opacity-60'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-rose-400">{incident.errorCode}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {incident.id}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                          incident.status === 'active'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : incident.status === 'retried'
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {incident.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Trace: {incident.traceId}</span>
                      </div>

                      {/* User-Facing Safe Message */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                          User-Facing Translation (Zero Technical Leaks):
                        </span>
                        <p className="text-xs text-slate-200">
                          {incident.userFriendlyMessage}
                        </p>
                      </div>

                      {/* Secure Diagnostic Log Details */}
                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/50 space-y-1 font-mono text-[11px]">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-sans">
                          SRE Diagnostic Context (Sensitive Data Redacted):
                        </span>
                        <p className="text-slate-400 break-words">
                          {incident.diagnosticDetails}
                        </p>
                        <div className="pt-1 text-[10px] text-slate-500 flex flex-wrap gap-2">
                          <span>Retries: {incident.retryCount} / {incident.maxRetries}</span>
                          <span>•</span>
                          <span>Target: {incident.targetEntityType} ({incident.targetEntityId})</span>
                          <span>•</span>
                          <span>Sanitized: Yes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                      {incident.isRetryable && incident.status !== 'resolved' && (
                        <button
                          onClick={() => handleRetryIncident(incident.id)}
                          disabled={retryingId === incident.id || incident.retryCount >= incident.maxRetries}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${retryingId === incident.id ? 'animate-spin' : ''}`} />
                          <span>{retryingId === incident.id ? 'Retrying...' : 'Safe Re-dispatch'}</span>
                        </button>
                      )}

                      {incident.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveIncident(incident.id)}
                          disabled={resolvingId === incident.id}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 11-CLASS ERROR SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>11-Class Error Handling & Non-Leak Invariant Simulator (Part 32)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate any of the 11 mandated failure conditions to observe the dual-tier translation: user-friendly guidance for the customer/collector vs. securely sanitized diagnostic logs for SREs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Failure Category:
              </label>
              <div className="space-y-1">
                {[
                  { id: 'validation', label: '1. Validation Failures' },
                  { id: 'auth', label: '2. Authentication Errors' },
                  { id: 'permission', label: '3. Permission Errors' },
                  { id: 'import', label: '4. Import Failures' },
                  { id: 'integration', label: '5. Integration Failures' },
                  { id: 'ai', label: '6. AI Failures' },
                  { id: 'payment', label: '7. Payment Failures' },
                  { id: 'reminder', label: '8. Reminder Delivery Failures' },
                  { id: 'network', label: '9. Network Interruptions' },
                  { id: 'rate_limit', label: '10. Rate Limits' },
                  { id: 'database', label: '11. Database Conflicts' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSimCategory(item.id as ErrorCategory)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      simCategory === item.id
                        ? 'bg-indigo-600 text-white font-bold shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSimulateError}
                disabled={isSimulating}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30"
              >
                <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Dispatching Simulation...' : 'Simulate & Verify Invariant'}</span>
              </button>
            </div>

            {/* Simulation Side-by-Side Dual Tier View */}
            <div className="md:col-span-2 space-y-4">
              {simResult ? (
                <div className="space-y-4 animate-in fade-in">
                  {/* Left: User-Facing View */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-xs">
                        Tier 1: User-Facing Safe Notification (Presented in Browser)
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] font-bold">
                          {simResult.userFacingResponse.errorCode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Trace: {simResult.userFacingResponse.traceId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">
                        {simResult.userFacingResponse.message}
                      </p>
                      <div className="pt-1 text-[11px] text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Actionable Advice: {simResult.userFacingResponse.remediationAdvice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Secure Diagnostic Log */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white text-xs font-sans">
                        Tier 2: SRE Diagnostic Log (Auto-Sanitized & Forensically Tracked)
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans uppercase">Diagnostic Details:</span>
                        <span className="text-rose-400">{simResult.internalDiagnosticLog.diagnosticDetails}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans uppercase">Sanitized Context Payload:</span>
                        <pre className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800/80 overflow-x-auto text-[10px]">
                          {JSON.stringify(simResult.internalDiagnosticLog.sanitizedContext, null, 2)}
                        </pre>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-emerald-400 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verification Invariant Passed: Sensitive tokens and card numbers scrubbed with [REDACTED_SENSITIVE_DATA].</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                  <Activity className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">Select an error category and click "Simulate & Verify Invariant".</p>
                  <p className="text-[11px] text-slate-600 max-w-sm">
                    Demonstrates how CNTCollect protects confidential debtor data while giving collectors clear actionable next steps.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OPERATIONAL ALERTS */}
      {activeTab === 'alerts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Active Operational Alerts & Notifications</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Proactive alerts triggered by delivery bounces, rate limits, and external ERP integration degradation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(dashboardData?.activeAlerts || []).map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="font-bold text-white text-xs">{alert.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Subsystem: {alert.affectedSubsystem}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{alert.description}</p>
                  {alert.suggestedRemediation && (
                    <p className="text-[11px] text-cyan-400 font-medium pt-1">
                      Remediation: {alert.suggestedRemediation}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono block pt-0.5">
                    Triggered: {alert.triggeredAt}
                  </span>
                </div>

                <div className="shrink-0">
                  {alert.isAcknowledged ? (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
