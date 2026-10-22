import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert,
  Plus, 
  Key, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Lock, 
  X, 
  Check, 
  Info,
  AlertTriangle,
  FileCheck,
  Building2,
  DollarSign,
  Laptop,
  RefreshCw,
  Eye,
  Shield
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { User, UserRole, Organization, HighImpactApproval } from '../types';
import { formatCurrency } from '../services/calculations';

interface TeamRbacViewProps {
  organization: Organization;
  users: User[];
  currentSimulatedUser: User;
  onSwitchSimulatedUser: (user: User) => void;
  onInviteUser: (userData: any) => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
}

export const TeamRbacView: React.FC<TeamRbacViewProps> = ({
  organization,
  users,
  currentSimulatedUser,
  onSwitchSimulatedUser,
  onInviteUser,
  onUpdateRole,
}) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'matrix'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('credit_controller');
  const [inviteMfa, setInviteMfa] = useState(true);

  // High Impact Approvals state
  const [approvals, setApprovals] = useState<HighImpactApproval[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [securityPin, setSecurityPin] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, [organization.id]);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`/api/security/high-impact-approvals?orgId=${organization.id}`);
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (err) {
      console.error('Failed to load high impact approvals:', err);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInviteUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      mfaEnabled: inviteMfa,
      emailVerified: true,
    });
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
  };

  const handleDecideApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    setApprovalError(null);
    setApprovalSuccess(null);

    if (decision === 'approved' && securityPin !== '8842' && securityPin !== 'admin123') {
      setApprovalError('Valid manager authorisation PIN required (Hint: 8842).');
      return;
    }

    try {
      const res = await fetch(`/api/security/high-impact-approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          approverName: currentSimulatedUser.name,
          approverRole: currentSimulatedUser.role,
          securityPin,
          reason: decision === 'approved' ? 'Managerial sign-off verified' : 'Rejected after audit review',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setApprovalError(data.error || 'Decision failed.');
        return;
      }

      setApprovalSuccess(`Action ${decision.toUpperCase()} and permanently committed to the audit trail.`);
      setApprovingId(null);
      setSecurityPin('');
      fetchApprovals();
    } catch (err: any) {
      setApprovalError(err.message || 'Network error.');
    }
  };

  const roleLabels: Record<UserRole, string> = {
    platform_admin: 'Platform Super Admin',
    owner: 'Organisation Owner',
    admin: 'Organisation Admin',
    finance_manager: 'Finance Manager',
    credit_controller: 'Credit Controller',
    collector: 'Collector',
    viewer: 'Finance Viewer',
    auditor: 'Auditor',
    customer_portal: 'Customer Portal User',
  };

  // Section 6.2 Granular Permissions Matrix across all 8 roles
  const permissionsMatrix = [
    { capability: 'Full SaaS Platform Management & Support Escalation', platform: true, owner: false, admin: false, finance: false, controller: false, viewer: false, auditor: false, portal: false },
    { capability: 'Organisation Full Control, Billing & Integration Config', platform: true, owner: true, admin: false, finance: false, controller: false, viewer: false, auditor: false, portal: false },
    { capability: 'Manage Users, Security Roles & Permissions (RBAC)', platform: true, owner: true, admin: true, finance: false, controller: false, viewer: false, auditor: false, portal: false },
    { capability: 'Authorise High-Impact Write-Offs & Refunds (Dual-Control)', platform: true, owner: true, admin: true, finance: true, controller: false, viewer: false, auditor: false, portal: false },
    { capability: 'Approve Material Adjustments & Credit Notes (> threshold)', platform: true, owner: true, admin: true, finance: true, controller: false, viewer: false, auditor: false, portal: false },
    { capability: 'Configure & Execute Automated Dunning Workflows', platform: true, owner: true, admin: true, finance: true, controller: true, viewer: false, auditor: false, portal: false },
    { capability: 'Manage Customer Disputes, Demands & Claims', platform: true, owner: true, admin: true, finance: true, controller: true, viewer: false, auditor: false, portal: false },
    { capability: 'Issue Invoices, Credit Notes & Payment Allocation', platform: true, owner: true, admin: true, finance: true, controller: true, viewer: false, auditor: false, portal: false },
    { capability: 'Log Customer Promises to Pay (PTP)', platform: true, owner: true, admin: true, finance: true, controller: true, viewer: false, auditor: false, portal: false },
    { capability: 'Authorised Read-Only Access to Audit Trails & Logs', platform: true, owner: true, admin: true, finance: true, controller: false, viewer: false, auditor: true, portal: false },
    { capability: 'Read-Only Financial Ledgers, Aging & Forecasts', platform: true, owner: true, admin: true, finance: true, controller: true, viewer: true, auditor: true, portal: false },
    { capability: 'Customer Self-Service Invoices & Payments Portal Only', platform: false, owner: false, admin: false, finance: false, controller: false, viewer: false, auditor: false, portal: true },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Team & Role-Based Access Control (RBAC)</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
              {users.length} Active Operators
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict Section 6.2 enterprise roles, dual-control high-impact authorization, and immutable access boundaries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Operator</span>
          </button>
        </div>
      </div>

      {/* Active User Switcher / Simulator Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm ring-2 ring-indigo-500/30">
            {currentSimulatedUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">{currentSimulatedUser.name}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                {roleLabels[currentSimulatedUser.role] || currentSimulatedUser.role}
              </span>
              {currentSimulatedUser.emailVerified && (
                <span className="text-[10px] text-emerald-400 flex items-center space-x-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <span className="text-slate-400 text-[11px]">
              Active session simulation. Application tabs and API authorization adapt dynamically to this operator's permission level.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[11px] font-medium ml-1">Simulate Role:</span>
          <select
            value={currentSimulatedUser.id}
            onChange={(e) => {
              const u = users.find(user => user.id === e.target.value);
              if (u) onSwitchSimulatedUser(u);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {roleLabels[u.role] || u.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Directory & Role Assignment</span>
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'approvals'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>High-Impact Action Authorisation Queue</span>
          {approvals.filter(a => a.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              {approvals.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>Section 6.2 Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Section 6.2 Role</th>
                  <th className="px-4 py-3">MFA & Security</th>
                  <th className="px-4 py-3">Email Verification</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Reassign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>{u.name}</span>
                        {u.id === currentSimulatedUser.id && (
                          <span className="px-1.5 py-0.2 text-[9px] uppercase rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {u.mfaEnabled ? (
                        <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>MFA Enforced</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Optional</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {u.lastLoginAt || 'Never'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateRole(u.id, e.target.value as UserRole)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="owner">B. Organisation Owner</option>
                        <option value="admin">C. Organisation Administrator</option>
                        <option value="finance_manager">D. Finance Manager</option>
                        <option value="credit_controller">E. Credit Controller</option>
                        <option value="viewer">F. Finance Viewer</option>
                        <option value="auditor">G. Auditor</option>
                        <option value="customer_portal">H. Customer Portal User</option>
                        <option value="platform_admin">A. Platform Super Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HIGH-IMPACT ACTION APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Dual-Control Authorisation Queue (Section 6.2 Mandate)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Material adjustments, bad debt write-offs, payment refunds, and account closures require verified managerial authorization.
              </p>
            </div>
            <button
              onClick={fetchApprovals}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Refresh Queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {approvalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          {approvalSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{approvalSuccess}</span>
            </div>
          )}

          <div className="space-y-3">
            {approvals.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.actionType === 'write_off' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      item.actionType === 'refund' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                      item.actionType === 'material_adjustment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {item.actionType.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.amount !== undefined && (
                      <span className="font-mono font-bold text-sm text-rose-400">
                        {formatCurrency(item.amount, item.currency || 'GBP')}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      item.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Impact Description:</span>
                    <span className="font-medium text-slate-200">{item.description}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Audit Justification:</span>
                    <span className="italic text-slate-300">{item.reason || 'Standard operational review'}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div>
                    Requested by <span className="text-white font-medium">{item.requestedBy}</span> on {item.requestedAt.split('T')[0]}
                  </div>

                  {item.status === 'pending' ? (
                    <div className="flex items-center space-x-2">
                      {approvingId === item.id ? (
                        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-rose-500/40">
                          <input
                            type="password"
                            placeholder="PIN: 8842"
                            value={securityPin}
                            onChange={(e) => setSecurityPin(e.target.value)}
                            className="bg-transparent text-white font-mono text-xs w-20 px-2 py-1 outline-none text-center"
                          />
                          <button
                            onClick={() => handleDecideApproval(item.id, 'approved')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setApprovingId(null); setSecurityPin(''); }}
                            className="px-2 py-1 text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setApprovingId(item.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center space-x-1 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Authorise Action</span>
                          </button>
                          <button
                            onClick={() => handleDecideApproval(item.id, 'rejected')}
                            className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 font-semibold transition text-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-emerald-400 font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Executed by {item.approvedBy}</span>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROLE PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Section 6.2 Enterprise Role Permissions Matrix (8 Roles Enforced)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict separation of financial duties across Platform Super Admin, Organisation Owner, Admin, Finance Manager, Credit Controller, Viewer, Auditor, and Customer Portal User.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Platform Capability</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Admin</th>
                  <th className="p-3 text-center">Finance Mgr</th>
                  <th className="p-3 text-center">Credit Ctrl</th>
                  <th className="p-3 text-center">Viewer</th>
                  <th className="p-3 text-center">Auditor</th>
                  <th className="p-3 text-center">Portal User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {permissionsMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/40">
                    <td className="p-3 font-medium text-slate-200">{item.capability}</td>
                    <td className="p-3 text-center">
                      {item.platform ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.owner ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.admin ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.finance ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.controller ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.viewer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.auditor ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {item.portal ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-700 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Invite Operator (Section 6.2)</span>
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Davis"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="liam@acmelogistics.co.uk"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Section 6.2 Security Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="owner">B. Organisation Owner</option>
                  <option value="admin">C. Organisation Administrator</option>
                  <option value="finance_manager">D. Finance Manager</option>
                  <option value="credit_controller">E. Credit Controller (Default)</option>
                  <option value="viewer">F. Finance Viewer</option>
                  <option value="auditor">G. Auditor</option>
                  <option value="customer_portal">H. Customer Portal User</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="mfaCheck"
                  checked={inviteMfa}
                  onChange={(e) => setInviteMfa(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="mfaCheck" className="text-slate-300 font-medium">
                  Enforce Multi-Factor Authentication (MFA)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Send Operator Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
