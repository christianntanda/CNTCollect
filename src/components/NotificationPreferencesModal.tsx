import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Send,
  X,
  AlertCircle,
  Moon,
  Sliders,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import {
  Organization,
  User as TeamUser,
  UserNotificationPreferences,
  NotificationType
} from '../types';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  currentUser?: TeamUser;
  onPreferencesUpdated?: () => void;
}

export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, {
  label: string;
  category: string;
  description: string;
}> = {
  newly_overdue_invoice: {
    label: 'Newly Overdue Invoices',
    category: 'Receivables & Delinquency',
    description: 'Invoices that crossed contractual maturity (1–7 days past due).',
  },
  high_value_overdue: {
    label: 'High-Value Overdue Accounts',
    category: 'Receivables & Delinquency',
    description: 'Accounts exceeding high-exposure balance threshold that are delinquent.',
  },
  new_customer_dispute: {
    label: 'New Customer Disputes',
    category: 'Disputes & Governance',
    description: 'Commercial disputes, billing objections, or quality claims lodged by debtors.',
  },
  failed_payment_reminder: {
    label: 'Failed Payment Reminders',
    category: 'Receivables & Delinquency',
    description: 'Email hard bounces, dropped SMS, or suppressed automated dunning steps.',
  },
  incoming_customer_reply: {
    label: 'Incoming Customer Replies',
    category: 'Receivables & Delinquency',
    description: 'Inbound emails, portal messages, or WhatsApp communications from debtors.',
  },
  upcoming_payment_promise: {
    label: 'Upcoming Payment Promises',
    category: 'Commitment Tracking',
    description: 'Committed settlement dates arriving within configured advance notice window.',
  },
  missed_payment_promise: {
    label: 'Missed Payment Promises',
    category: 'Commitment Tracking',
    description: 'Promised settlement dates that passed without ledger receipt confirmation.',
  },
  uploaded_payment_evidence: {
    label: 'Uploaded Payment Evidence',
    category: 'Cash Operations',
    description: 'Bank transfer receipts and remittance advices uploaded for review.',
  },
  unreconciled_payment: {
    label: 'Unreconciled Payments',
    category: 'Cash Operations',
    description: 'Unallocated bank wire credits or unmatched bank statement lines.',
  },
  integration_failure: {
    label: 'Integration & Sync Failures',
    category: 'Platform & Technical',
    description: 'ERP connection drops, gateway webhook errors, or SPF/DKIM verification issues.',
  },
  subscription_status_change: {
    label: 'Subscription & Volume Limits',
    category: 'Platform & Technical',
    description: 'Recovery volume allocation reaching 80%+ capacity or seat limit changes.',
  },
  important_security_event: {
    label: 'Important Security Events',
    category: 'Security & Access',
    description: 'High-impact authorization requests, bank detail changes, or suspicious logins.',
  },
};

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  organization,
  currentUser,
  onPreferencesUpdated,
}) => {
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userId = currentUser?.id || 'usr-1';

  // Load preferences from API
  const loadPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notification-preferences?orgId=${organization.id}&userId=${userId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPrefs(json.data);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, organization.id, userId]);

  if (!isOpen) return null;

  const handleToggleType = (typeKey: NotificationType, channel: 'inApp' | 'email') => {
    if (!prefs) return;
    const currentConfig = prefs.typesConfig[typeKey] || { inApp: true, email: true };
    setPrefs({
      ...prefs,
      typesConfig: {
        ...prefs.typesConfig,
        [typeKey]: {
          ...currentConfig,
          [channel]: !currentConfig[channel],
        },
      },
    });
  };

  const handleSavePreferences = async () => {
    if (!prefs) return;
    try {
      setSaving(true);
      setFeedbackMsg(null);
      const res = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: 'success', text: 'Notification preferences saved successfully.' });
        if (onPreferencesUpdated) onPreferencesUpdated();
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to update preferences.' });
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setFeedbackMsg({ type: 'error', text: 'Network error saving preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchTestEmail = async () => {
    if (!prefs?.emailAddress) {
      alert('Please configure a valid email address first.');
      return;
    }
    try {
      setTestSending(true);
      const res = await fetch('/api/notifications/dispatch-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId: organization.id,
          userName: currentUser?.name || 'Authorized Officer',
          email: prefs.emailAddress,
          notificationTitle: 'CNTCollect Test Security & Receivables Alert',
          notificationMessage: 'This is a verified test notification sent pursuant to Part 22. Your notification preferences are correctly routing to this mailbox.',
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Test email notification successfully dispatched to ${prefs.emailAddress} and logged in forensic audit trail.`);
      }
    } catch (err) {
      console.error('Failed to dispatch test email:', err);
      alert('Failed to send test email.');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Notification Preferences & Delivery Rules</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Part 22
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure authorized in-app and email notification thresholds, quiet hours, and confidentiality controls.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`p-3 text-xs flex items-center justify-between border-b ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {loading || !prefs ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-slate-400">Loading your notification delivery settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Delivery Channels & Global Settings */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Email Channel & Dispatch Configuration</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Toggle & Address */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Notification Mailbox
                    </label>
                    <input
                      type="email"
                      value={prefs.emailAddress}
                      onChange={(e) => setPrefs({ ...prefs, emailAddress: e.target.value })}
                      placeholder="e.g. credit.controller@company.co.uk"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Digest Frequency */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Email Dispatch Cadence
                    </label>
                    <select
                      value={prefs.digestFrequency}
                      onChange={(e) => setPrefs({ ...prefs, digestFrequency: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="immediate">Immediate Dispatch (Real-Time)</option>
                      <option value="hourly">Hourly Rollup Digest</option>
                      <option value="daily_morning">Daily Morning Briefing (08:00 Local)</option>
                    </select>
                  </div>

                  {/* High Value Threshold */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      High-Value Overdue Alert Threshold ({organization.defaultCurrency || 'GBP'})
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={prefs.highValueOverdueThreshold}
                        onChange={(e) => setPrefs({ ...prefs, highValueOverdueThreshold: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Promise Advance Warning */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Payment Promise Advance Warning
                    </label>
                    <select
                      value={prefs.promiseAdvanceHours}
                      onChange={(e) => setPrefs({ ...prefs, promiseAdvanceHours: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value={24}>24 Hours in Advance</option>
                      <option value={48}>48 Hours in Advance</option>
                      <option value={72}>72 Hours in Advance</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="emailGlobal"
                      checked={prefs.emailEnabled}
                      onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <label htmlFor="emailGlobal" className="text-xs text-slate-300 font-medium">
                      Enable outbound email notifications to configured address
                    </label>
                  </div>

                  <button
                    onClick={handleDispatchTestEmail}
                    disabled={testSending}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1.5"
                  >
                    <Send className={`w-3 h-3 ${testSending ? 'animate-spin' : ''}`} />
                    <span>Send Test Email Alert</span>
                  </button>
                </div>
              </div>

              {/* Quiet Hours & Compliance */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Quiet Hours Policy (No Email Disturbance)</span>
                  </h4>
                  <input
                    type="checkbox"
                    checked={prefs.quietHoursEnabled}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                </div>

                {prefs.quietHoursEnabled && (
                  <div className="flex items-center space-x-4 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">From:</span>
                      <input
                        type="time"
                        value={prefs.quietHoursStart}
                        onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Until:</span>
                      <input
                        type="time"
                        value={prefs.quietHoursEnd}
                        onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Notifications occurring during quiet hours will queue until quiet hours expire.
                    </span>
                  </div>
                )}
              </div>

              {/* Matrix of all 12 Notification Types (Part 22) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Notification Types & Delivery Routing (Section 22)</span>
                  </h4>
                  <div className="flex items-center space-x-6 text-[11px] font-semibold text-slate-400 pr-2">
                    <span className="w-16 text-center">In-App</span>
                    <span className="w-16 text-center">Email</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  {Object.entries(NOTIFICATION_TYPE_DESCRIPTIONS).map(([key, meta]) => {
                    const typeKey = key as NotificationType;
                    const cfg = prefs.typesConfig[typeKey] || { inApp: true, email: true };

                    return (
                      <div
                        key={key}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition gap-4"
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200 text-xs">{meta.label}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {meta.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{meta.description}</p>
                        </div>

                        <div className="flex items-center space-x-6 shrink-0 pr-2">
                          {/* In-App Checkbox */}
                          <div className="w-16 flex justify-center">
                            <input
                              type="checkbox"
                              checked={cfg.inApp}
                              onChange={() => handleToggleType(typeKey, 'inApp')}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                            />
                          </div>

                          {/* Email Checkbox */}
                          <div className="w-16 flex justify-center">
                            <input
                              type="checkbox"
                              checked={cfg.email && prefs.emailEnabled}
                              disabled={!prefs.emailEnabled}
                              onChange={() => handleToggleType(typeKey, 'email')}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer disabled:opacity-30"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confidentiality & Role Protection Callout */}
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Confidentiality & Role-Based Safeguard (Section 22)</span>
                </div>
                <p className="text-slate-300">
                  Customer financial records and debtor identities are partitioned strictly according to the recipient's assigned role. Viewers and auditors receive sanitized summaries without confidential commercial details.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
          >
            <CheckCircle2 className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
