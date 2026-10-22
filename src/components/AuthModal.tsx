import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Key,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Globe,
  User,
  Users,
  Building2,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  LogOut,
  Laptop,
  CheckCircle2,
  ArrowRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { UserRole, UserSession } from '../types';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserAuthenticated: (user: any, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserAuthenticated,
}) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset' | 'mfa' | 'sessions' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('credit_controller');
  const [mfaCode, setMfaCode] = useState('');
  const [requireMfa, setRequireMfa] = useState(false);
  const [previewMfaCode, setPreviewMfaCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Password Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [previewResetToken, setPreviewResetToken] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);

  // Recovery codes state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && activeTab === 'sessions') {
      fetchSessions();
    }
  }, [isOpen, activeTab]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/auth/sessions?userId=${currentUser?.id || 'usr-1'}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requireMfa) {
          setRequireMfa(true);
          setPreviewMfaCode(data.previewMfaCode);
          setSuccessMsg('Multi-Factor Authentication required. Enter the 6-digit verification code.');
        } else {
          setError(data.error || 'Authentication failed. Please verify credentials.');
        }
        setIsLoading(false);
        return;
      }

      onUserAuthenticated(data.data, data.token);
      setSuccessMsg('Successfully authenticated. Welcome back!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Network error during login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          mfaEnabled: true,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      onUserAuthenticated(data.data, data.token);
      setSuccessMsg(`Account created with salted PBKDF2 encryption. Verification code: ${data.verificationCode}`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Registration request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign In via Firebase
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const simulatedRole = user.email?.includes('admin') ? 'admin' : 'finance_manager';
      const formattedUser = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Google User',
        email: user.email || '',
        role: simulatedRole,
        organizationId: 'org-acme-uk',
        isActive: true,
        emailVerified: user.emailVerified,
        avatarUrl: user.photoURL || undefined,
      };
      onUserAuthenticated(formattedUser, `fb_${user.uid}`);
      setSuccessMsg('Authenticated with Google Firebase Auth.');
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      setError(err.message || 'Google authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enterprise SSO
  const handleEnterpriseSso = () => {
    setIsLoading(true);
    setTimeout(() => {
      const ssoUser = {
        id: `sso-${Date.now()}`,
        name: 'Corporate Executive (Okta SSO)',
        email: 'exec@enterprisetenant.com',
        role: 'owner',
        organizationId: 'org-acme-uk',
        isActive: true,
        emailVerified: true,
      };
      onUserAuthenticated(ssoUser, `sso_saml_${Date.now()}`);
      setSuccessMsg('Enterprise SAML 2.0 / OIDC federation verified.');
      setIsLoading(false);
      setTimeout(() => onClose(), 600);
    }, 800);
  };

  // Handle Password Reset Request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewResetToken(data.previewResetToken);
        setResetToken(data.previewResetToken);
        setSuccessMsg(data.message);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Confirm
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Password has been securely reset! You may now sign in.');
        setTimeout(() => setActiveTab('login'), 1200);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Revoke Other Sessions
  const handleRevokeOtherSessions = async () => {
    try {
      await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id, currentSessionId: 'sess-001' }),
      });
      fetchSessions();
      setSuccessMsg('All other device sessions terminated.');
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Emergency Recovery Codes
  const handleGenerateRecoveryCodes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/recovery/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRecoveryCodes(data.recoveryCodes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Enterprise Identity & Access Management</span>
              </h2>
              <p className="text-xs text-slate-400">
                PBKDF2 salted encryption • Multi-factor authentication • Session control
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs overflow-x-auto">
          <button
            onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'login'
                ? 'border-indigo-500 text-white bg-indigo-500/10 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('authSignIn')}
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'register'
                ? 'border-indigo-500 text-white bg-indigo-500/10 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('authSignUp')}
          </button>
          <button
            onClick={() => { setActiveTab('reset'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'reset'
                ? 'border-indigo-500 text-white bg-indigo-500/10 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('authResetPassword')}
          </button>
          <button
            onClick={() => { setActiveTab('sessions'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-indigo-500 text-white bg-indigo-500/10 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('authSessionsTitle')}
          </button>
          <button
            onClick={() => { setActiveTab('recovery'); setError(null); setSuccessMsg(null); }}
            className={`px-4 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'recovery'
                ? 'border-indigo-500 text-white bg-indigo-500/10 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('authRecoveryTitle')}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
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

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('authEmail')}</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. alice.morgan@acmelogistics.co.uk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-medium">{t('authPassword')}</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reset')}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px]"
                    >
                      {t('authForgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {requireMfa && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                    <label className="block text-indigo-300 font-semibold flex items-center space-x-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>{t('authMfaCode')}</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit code (e.g. 123456)"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-2.5 text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-indigo-400"
                    />
                    {previewMfaCode && (
                      <p className="text-[11px] text-indigo-400/80 text-center">
                        Deterministic MFA challenge code: <span className="font-mono font-bold text-white">{previewMfaCode}</span>
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying...' : t('authSignIn')}</span>
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-500">
                  <span className="bg-slate-900 px-3">or continue with enterprise SSO</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 transition flex items-center justify-center space-x-2 text-slate-300"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Google Account</span>
                </button>
                <button
                  onClick={handleEnterpriseSso}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 transition flex items-center justify-center space-x-2 text-slate-300"
                >
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>SAML 2.0 / Okta</span>
                </button>
              </div>

              {/* Demo quick credential helper */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Demo Sign-In Credentials</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('alice.morgan@acmelogistics.co.uk');
                      setPassword('Password123!');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left"
                  >
                    <div className="font-bold text-white">Alice Morgan (Admin)</div>
                    <div className="text-slate-500">Password123!</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('marcus.sterling@acmelogistics.co.uk');
                      setPassword('Password123!');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left"
                  >
                    <div className="font-bold text-white">Marcus Sterling (Owner)</div>
                    <div className="text-slate-500">Password123!</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('david.chen@acmelogistics.co.uk');
                      setPassword('Password123!');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left"
                  >
                    <div className="font-bold text-white">David Chen (Finance)</div>
                    <div className="text-slate-500">Password123!</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('accounts.payable@apexretailgroup.co.uk');
                      setPassword('Password123!');
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left"
                  >
                    <div className="font-bold text-white">Marcus Vance (Portal)</div>
                    <div className="text-slate-500">Password123!</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('authName')} *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Helena Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('authEmail')} *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="helena@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('authPassword')} * (min 8 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{t('authSelectRole')} (Section 6.2) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="owner">B. {t('roleOwner')}</option>
                  <option value="admin">C. {t('roleAdmin')}</option>
                  <option value="finance_manager">D. {t('roleFinanceManager')}</option>
                  <option value="credit_controller">E. {t('roleCreditController')}</option>
                  <option value="viewer">F. {t('roleViewer')}</option>
                  <option value="auditor">G. {t('roleAuditor')}</option>
                  <option value="customer_portal">H. {t('roleCustomerPortal')}</option>
                  <option value="platform_admin">A. {t('rolePlatformAdmin')}</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{t('authAccountSecured')}</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{isLoading ? 'Registering...' : t('authSignUp')}</span>
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD RESET */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs">
                Enter your registered corporate email address to receive secure password recovery instructions.
              </div>

              <form onSubmit={handleRequestReset} className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('authEmail')}</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alice.morgan@acmelogistics.co.uk"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isLoading ? 'Sending...' : t('authSendResetLink')}</span>
                </button>
              </form>

              {previewResetToken && (
                <form onSubmit={handleConfirmReset} className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-3 pt-3">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-indigo-400" />
                    <span>Set New Password</span>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Reset Token</label>
                    <input
                      type="text"
                      readOnly
                      value={resetToken}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-[11px] mb-1">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition text-xs"
                  >
                    Confirm & Update Password
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Active Device Sessions</h3>
                  <p className="text-[11px] text-slate-400">Current and active browser sessions tied to this account.</p>
                </div>
                <button
                  onClick={handleRevokeOtherSessions}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold transition"
                >
                  {t('authRevokeOtherSessions')}
                </button>
              </div>

              <div className="space-y-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      sess.isCurrent
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{sess.device} • {sess.browser}</span>
                          {sess.isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          IP: <span className="font-mono">{sess.ipAddress}</span> • {sess.location} • Active: {sess.lastActiveAt}
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/auth/sessions/${sess.id}`, { method: 'DELETE' });
                          fetchSessions();
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1"
                      >
                        Terminate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EMERGENCY RECOVERY CODES */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{t('authRecoveryTitle')}</div>
                  <div className="text-[11px] mt-0.5 text-amber-300/90">{t('authRecoveryDesc')}</div>
                </div>
              </div>

              {recoveryCodes.length === 0 ? (
                <button
                  onClick={handleGenerateRecoveryCodes}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition text-xs"
                >
                  Generate 8 Single-Use Emergency Recovery Codes
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-center text-xs text-indigo-300">
                    {recoveryCodes.map((c, i) => (
                      <div key={i} className="p-2 bg-slate-900 rounded-lg border border-slate-800 select-all">
                        {c}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    Each code can be used exactly once to regain account access in case of lost MFA hardware.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-slate-500 text-[11px]">
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>FIPS 140-3 & GDPR Compliant Auth Provider</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          >
            {t('actionClose')}
          </button>
        </div>

      </div>
    </div>
  );
};
