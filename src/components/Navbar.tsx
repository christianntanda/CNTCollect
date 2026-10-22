import React, { useState } from 'react';
import { 
  Building2, 
  Globe, 
  ExternalLink, 
  ShieldCheck, 
  Play, 
  PlusCircle, 
  CreditCard,
  Layers,
  LogIn,
  LogOut,
  Database,
  Lock,
  Bell,
  Command
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Organization, Debtor, Language } from '../types';
import { auth, googleProvider, signInWithPopup, signOut, FirebaseUser } from '../services/firebase';

interface NavbarProps {
  organizations: Organization[];
  currentOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  debtors: Debtor[];
  onOpenDebtorPortal: (debtor: Debtor) => void;
  onOpenNewInvoiceModal: () => void;
  onOpenRecordPaymentModal: () => void;
  onRunDunningCycle: () => void;
  isDunningRunning: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  authUser: FirebaseUser | null;
  isFirestoreConnected: boolean;
  onOpenOnboardingModal?: () => void;
  onOpenAuthModal?: () => void;
  currentUser?: any;
  unreadNotificationsCount?: number;
  onOpenNotificationCenter?: () => void;
  onOpenCommandCentre?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  organizations,
  currentOrg,
  onSelectOrg,
  debtors,
  onOpenDebtorPortal,
  onOpenNewInvoiceModal,
  onOpenRecordPaymentModal,
  onRunDunningCycle,
  isDunningRunning,
  activeTab,
  setActiveTab,
  authUser,
  isFirestoreConnected,
  onOpenOnboardingModal,
  onOpenAuthModal,
  currentUser,
  unreadNotificationsCount = 0,
  onOpenNotificationCenter,
  onOpenCommandCentre,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Firebase Authentication error:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase SignOut error:', err);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner: Brand, Tenant Switcher, Language, Auth & Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  CNT<span className="text-indigo-400">Collect</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AR Operating Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xl:block">
                {t('subheading')}
              </p>
            </div>
          </div>

          {/* Center/Right Controls */}
          <div className="flex items-center space-x-2.5 overflow-x-auto py-1 scrollbar-none">
            
            {/* Multi-Tenant Organization Switcher */}
            <div className="flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800 shrink-0">
              <Building2 className="w-4 h-4 text-slate-400 ml-2 mr-1.5" />
              <select
                value={currentOrg?.id}
                onChange={(e) => {
                  const selected = organizations.find((o) => o.id === e.target.value);
                  if (selected) onSelectOrg(selected);
                }}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none pr-2 cursor-pointer py-1"
                title="Switch Organization Tenant"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200">
                    {org.name} ({org.defaultCurrency})
                  </option>
                ))}
              </select>

              {onOpenOnboardingModal && (
                <button
                  type="button"
                  onClick={onOpenOnboardingModal}
                  className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-semibold transition border border-indigo-500/40 shrink-0 ml-1"
                  title="Onboard & Register New Organization Tenant (Section 5.1)"
                >
                  + New Tenant
                </button>
              )}
            </div>

            {/* Debtor Self-Service Portal Quick Launcher */}
            <div className="hidden lg:flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800 shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1" />
              <span className="text-[11px] text-slate-400 mr-1.5">Portal:</span>
              <select
                onChange={(e) => {
                  const deb = debtors.find((d) => d.id === e.target.value);
                  if (deb) onOpenDebtorPortal(deb);
                }}
                defaultValue=""
                className="bg-transparent text-xs text-cyan-300 font-medium focus:outline-none pr-2 cursor-pointer py-1 max-w-[120px] truncate"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  View as Debtor...
                </option>
                {debtors.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Firestore Status Badge */}
            <div 
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border shrink-0 ${
                isFirestoreConnected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              }`}
              title="Cloud Firestore Multi-Tenant Database Status"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isFirestoreConnected ? 'Firestore Active' : 'Connecting Firestore...'}</span>
            </div>

            {/* Multilingual Selector (EN, FR, ES) */}
            <div className="flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800 shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {(['en', 'fr', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`text-xs px-2 py-0.5 rounded uppercase font-medium transition-colors ${
                    language === lang
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Part 22 In-App Notification Centre Bell */}
            {onOpenNotificationCenter && (
              <button
                type="button"
                onClick={onOpenNotificationCenter}
                className="relative p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition shrink-0"
                title="Open In-App Notification Centre (Section 22)"
              >
                <Bell className="w-4 h-4 text-indigo-400" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-1 shadow-md shadow-rose-500/50 animate-pulse">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Section 6 Identity & Access / Security Profile */}
            <div className="flex items-center bg-slate-950/80 rounded-lg p-1 border border-slate-800 shrink-0 space-x-1">
              {currentUser ? (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center space-x-2 px-2 py-0.5 rounded hover:bg-slate-800 transition text-left"
                  title="Open Account Security, Sessions, and MFA settings"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-white font-semibold leading-tight max-w-[100px] truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] uppercase font-mono text-indigo-400 font-bold leading-tight">
                      {currentUser.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('authSignIn')}</span>
                </button>
              )}

              {/* Firebase Google Auth quick indicator */}
              {authUser ? (
                <button
                  onClick={handleSignOut}
                  className="p-1 text-slate-400 hover:text-rose-400 transition"
                  title="Sign Out of Firebase Auth"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={isAuthLoading}
                  className="p-1 text-slate-400 hover:text-emerald-400 transition"
                  title="Sign In with Google (Firebase Auth)"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>

            {/* Quick Action: Run Dunning */}
            <button
              onClick={onRunDunningCycle}
              disabled={isDunningRunning}
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 active:scale-95 transition shrink-0"
              title="Trigger automated overdue evaluation & dunning escalation"
            >
              <Play className={`w-3.5 h-3.5 ${isDunningRunning ? 'animate-spin' : ''}`} />
              <span>{isDunningRunning ? 'Running...' : t('actionRunDunning')}</span>
            </button>

            {/* Part 29 Command Centre & Global Search Quick Trigger */}
            {onOpenCommandCentre && (
              <button
                type="button"
                onClick={onOpenCommandCentre}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 transition shadow-sm shrink-0 group active:scale-95"
                title="Open CNTCollect Command Centre (Cmd+K / Ctrl+K)"
              >
                <Command className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Command Centre</span>
                <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-slate-950 text-slate-400 rounded border border-slate-800">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Quick Action: New Invoice */}
            <button
              onClick={onOpenNewInvoiceModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow-sm shadow-indigo-600/40 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('actionNewInvoice')}</span>
            </button>

            {/* Quick Action: Record Payment */}
            <button
              onClick={onOpenRecordPaymentModal}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 active:scale-95 transition shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('actionRecordPayment')}</span>
            </button>

          </div>
        </div>

        {/* Primary Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60 text-xs font-medium">
          {[
            { id: 'dashboard', label: t('navDashboard') },
            { id: 'invoices', label: t('navInvoices') },
            { id: 'debtors', label: t('navDebtors') },
            { id: 'arengine', label: 'AR Calculation Engine (10)' },
            { id: 'import', label: 'Guided Import (9)' },
            { id: 'dunning', label: 'Payment Reminders (12)' },
            { id: 'disputes', label: 'Disputes & Queries (15)' },
            { id: 'collector_workspace', label: 'Collector Workspace (17)' },
            { id: 'promises', label: t('navPromises') },
            { id: 'payments', label: 'Payments & Recon (11)' },
            { id: 'cashforecast', label: 'Cash Forecast (18)' },
            { id: 'reports', label: 'Financial Reports (19)' },
            { id: 'performance_metrics', label: 'Performance Metrics (20)' },
            { id: 'rules', label: 'Automation Rules (21)' },
            { id: 'team', label: 'Team & RBAC' },
            { id: 'integrations', label: 'Integrations Framework (23)' },
            { id: 'subscription', label: 'Subscription & SaaS Billing (24)' },
            { id: 'security', label: 'Security & Data Protection (25)' },
            { id: 'auditlog', label: 'Audit Trail & Traceability (26)' },
            { id: 'database', label: 'Database Design & Relational (27)' },
            { id: 'documents', label: 'Document Vault & Storage (28)' },
            { id: 'scalability', label: 'Performance & Scalability (30)' },
            { id: 'testing', label: 'Testing & QA Suite (31)' },
            { id: 'observability', label: 'Observability & SRE (32)' },
            { id: 'readiness', label: 'Production Readiness (33)' },
            { id: 'roadmap', label: 'Implementation Roadmap (34)' },
            { id: 'rules_compliance', label: 'Execution Rules (35)' },
            { id: 'final_acceptance', label: 'Pilot Acceptance (36)' },
            { id: 'admin', label: 'Cloud Admin & DDL' },
            { id: 'settings', label: t('navSettings') },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
