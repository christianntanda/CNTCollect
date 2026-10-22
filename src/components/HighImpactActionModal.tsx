import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  X,
  Check,
  FileText,
  DollarSign,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { HighImpactActionType, UserRole } from '../types';
import { formatCurrency } from '../services/calculations';

interface HighImpactActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: HighImpactActionType;
  targetId: string;
  targetName: string;
  amount?: number;
  currency?: string;
  currentUser: any;
  onSuccess: () => void;
}

export const HighImpactActionModal: React.FC<HighImpactActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  targetId,
  targetName,
  amount,
  currency = 'GBP',
  currentUser,
  onSuccess,
}) => {
  const { t } = useTranslation();

  const [reason, setReason] = useState('');
  const [passcode, setPasscode] = useState('');
  const [approverRole, setApproverRole] = useState<UserRole>('finance_manager');
  const [submissionMode, setSubmissionMode] = useState<'execute' | 'queue'>('execute');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const actionMeta = {
    write_off: {
      title: t('highImpactWriteOff'),
      color: 'rose',
      severity: 'Critical Ledger Loss',
      impact: 'Reduces outstanding receivables to zero. Permanent loss recognition in financial reporting and accounting ledger.',
      defaultReason: 'Customer insolvent or collection costs exceed recoverable balance.',
    },
    material_adjustment: {
      title: t('highImpactAdjustment'),
      color: 'amber',
      severity: 'Material Financial Variance',
      impact: 'Issues credit note adjustment exceeding the material review threshold (£5,000 / €5,000).',
      defaultReason: 'Commercial dispute conciliation or contractual volume discount adjustment.',
    },
    refund: {
      title: t('highImpactRefund'),
      color: 'indigo',
      severity: 'Treasury Cash Outflow',
      impact: 'Disburses funds from corporate clearing account back to customer bank details.',
      defaultReason: 'Overpayment remittance or resolved service cancellation refund.',
    },
    account_closure: {
      title: t('highImpactClosure'),
      color: 'orange',
      severity: 'Customer Facility Termination',
      impact: 'Revokes credit facility, freezes active dunning cadences, and archives debtor account.',
      defaultReason: 'Account closure requested or chronic delinquency policy threshold reached.',
    },
    payment_details_change: {
      title: t('highImpactPaymentDetails'),
      color: 'rose',
      severity: 'Anti-Fraud Banking Safeguard',
      impact: 'Alters settlement IBAN/SWIFT across all outbound invoices, self-service portals, and reminder communications.',
      defaultReason: 'Corporate treasury account migration authorized by Chief Financial Officer.',
    },
  }[actionType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (submissionMode === 'execute') {
        if (!passcode) {
          setError('Managerial authorisation passcode is required for immediate execution.');
          setIsLoading(false);
          return;
        }

        // Test direct endpoint if applicable
        if (actionType === 'write_off') {
          const res = await fetch(`/api/invoices/${targetId}/write-off`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reason: reason || actionMeta.defaultReason,
              authorizedBy: `${currentUser?.name || 'Authorized Lead'} (${approverRole})`,
              passcode,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.error || 'Authorisation failed. Check passcode.');
            setIsLoading(false);
            return;
          }
        } else if (actionType === 'refund') {
          const res = await fetch(`/api/payments/${targetId}/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reason: reason || actionMeta.defaultReason,
              authorizedBy: `${currentUser?.name || 'Authorized Lead'} (${approverRole})`,
              passcode,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.error || 'Refund authorisation failed.');
            setIsLoading(false);
            return;
          }
        } else {
          // Standard high-impact approval route
          const res = await fetch('/api/security/high-impact-approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType,
              title: `${actionMeta.title}: ${targetName}`,
              description: actionMeta.impact,
              amount,
              currency,
              targetId,
              targetType: 'FinancialEntity',
              requestedBy: `${currentUser?.name || 'Operator'} (${approverRole})`,
              reason: reason || actionMeta.defaultReason,
              passcode,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setError(data.error || 'Failed to execute high-impact action.');
            setIsLoading(false);
            return;
          }
        }

        setSuccessMsg(t('highImpactSuccess'));
      } else {
        // Queue for dual-control approval
        const res = await fetch('/api/security/high-impact-approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType,
            title: `${actionMeta.title}: ${targetName}`,
            description: actionMeta.impact,
            amount,
            currency,
            targetId,
            targetType: 'FinancialEntity',
            requestedBy: currentUser?.name || 'Credit Controller',
            reason: reason || actionMeta.defaultReason,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to submit approval request.');
          setIsLoading(false);
          return;
        }

        setSuccessMsg('Submitted to the dual-control authorisation queue for Finance Manager sign-off.');
      }

      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-xs">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{t('highImpactTitle')}</span>
              </h2>
              <p className="text-xs text-rose-300 font-medium">
                {actionMeta.severity} • Dual Approval Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Overview Box */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Target Entity:</span>
              <span className="font-bold text-white">{targetName}</span>
            </div>
            {amount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Financial Magnitude:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              {actionMeta.impact}
            </div>
          </div>

          {/* Submission Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <button
              type="button"
              onClick={() => setSubmissionMode('execute')}
              className={`py-2 rounded-lg font-semibold transition ${
                submissionMode === 'execute'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Authorise (PIN)
            </button>
            <button
              type="button"
              onClick={() => setSubmissionMode('queue')}
              className={`py-2 rounded-lg font-semibold transition ${
                submissionMode === 'queue'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Submit for Manager Review
            </button>
          </div>

          {/* Business Justification */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {t('highImpactReason')} *
            </label>
            <textarea
              required
              rows={2}
              placeholder={actionMeta.defaultReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Authoriser Credentials when direct executing */}
          {submissionMode === 'execute' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('highImpactApproverRole')} *
                </label>
                <select
                  value={approverRole}
                  onChange={(e) => setApproverRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="owner">B. Organisation Owner</option>
                  <option value="admin">C. Organisation Administrator</option>
                  <option value="finance_manager">D. Finance Manager</option>
                  <option value="platform_admin">A. Platform Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                  <span>{t('highImpactPasscodePrompt')} *</span>
                  <span className="text-[10px] text-slate-500">Security PIN: 8842</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter 4-digit manager PIN (e.g. 8842)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono tracking-widest"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {t('actionCancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2 rounded-xl font-semibold text-white transition flex items-center space-x-2 shadow-sm ${
                submissionMode === 'execute'
                  ? 'bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-indigo-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Authorising...' : submissionMode === 'execute' ? t('highImpactApprove') : 'Submit Request'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
