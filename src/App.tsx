import React, { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { 
  Organization, 
  Debtor, 
  Invoice, 
  Payment, 
  Dispute, 
  PromiseToPay, 
  DunningWorkflow, 
  CommunicationLog, 
  AuditLogEntry, 
  IntegrationStatus,
  FinancialMetrics,
  DisputeReason,
  PromiseStatus,
  CreditNote,
  User,
  UserRole,
  BackgroundJob,
  HighImpactActionType,
  ImportEntityType
} from './types';
import { 
  calculateAgingBuckets, 
  calculateDSO, 
  calculateCEI, 
  calculateAverageDaysDelinquent, 
  calculateCashForecast 
} from './services/calculations';

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { DebtorsView } from './components/DebtorsView';
import { DunningView } from './components/DunningView';
import { DisputesView } from './components/DisputesView';
import { CollectorWorkspaceView } from './components/CollectorWorkspaceView';
import { PromisesView } from './components/PromisesView';
import { PaymentsView } from './components/PaymentsView';
import { CashForecastView } from './components/CashForecastView';
import { CreditNotesView } from './components/CreditNotesView';
import { TeamRbacView } from './components/TeamRbacView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { ReportsView } from './components/ReportsView';
import { CollectionPerformanceMetricsView } from './components/CollectionPerformanceMetricsView';
import { AutomationRuleBuilderView } from './components/AutomationRuleBuilderView';
import { IntegrationsView } from './components/IntegrationsView';
import { AuditTrailView } from './components/AuditTrailView';
import { SubscriptionView } from './components/SubscriptionView';
import { SecurityDataProtectionView } from './components/SecurityDataProtectionView';
import { DatabaseDesignView } from './components/DatabaseDesignView';
import { DocumentManagementView } from './components/DocumentManagementView';
import { SettingsView } from './components/SettingsView';
import { DebtorPortalModal } from './components/DebtorPortalModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { ReminderModal } from './components/ReminderModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { HighImpactActionModal } from './components/HighImpactActionModal';
import { ArEngineView } from './components/ArEngineView';
import { CsvSpreadsheetImportModal } from './components/CsvSpreadsheetImportModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { NotificationPreferencesModal } from './components/NotificationPreferencesModal';
import { CommandCentreModal } from './components/CommandCentreModal';
import { PerformanceScalabilityView } from './components/PerformanceScalabilityView';
import { TestingQualityAssuranceView } from './components/TestingQualityAssuranceView';
import { ErrorObservabilityView } from './components/ErrorObservabilityView';
import { ProductionReadinessView } from './components/ProductionReadinessView';
import { ImplementationRoadmapView } from './components/ImplementationRoadmapView';
import { DevelopmentExecutionRulesView } from './components/DevelopmentExecutionRulesView';
import { FinalAcceptanceCriteriaView } from './components/FinalAcceptanceCriteriaView';
import { auth, onAuthStateChanged, testFirestoreConnection, FirebaseUser } from './services/firebase';

function MainPlatform() {
  const { t } = useTranslation();

  // Primary data states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJob[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [promises, setPromises] = useState<PromiseToPay[]>([]);
  const [dunningWorkflows, setDunningWorkflows] = useState<DunningWorkflow[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  // Simulated active user for RBAC
  const [simulatedUser, setSimulatedUser] = useState<User>({
    id: 'usr-1',
    organizationId: 'org-acme-uk',
    name: 'Alice Morgan',
    email: 'alice.morgan@acmelogistics.co.uk',
    role: 'admin',
    isActive: true,
  });

  // Navigation and Modals
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDunningRunning, setIsDunningRunning] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);
  const [portalDebtor, setPortalDebtor] = useState<Debtor | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [highImpactModalData, setHighImpactModalData] = useState<{
    isOpen: boolean;
    actionType: HighImpactActionType;
    targetId: string;
    targetName: string;
    amount?: number;
    currency?: string;
  } | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInitialEntity, setImportInitialEntity] = useState<ImportEntityType>('invoices');

  // Part 22 In-App Notification Centre State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isNotificationPreferencesOpen, setIsNotificationPreferencesOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Part 29 Command Centre & Global Search State
  const [isCommandCentreOpen, setIsCommandCentreOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener for Command Centre
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandCentreOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Firebase Auth & Cloud Firestore State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  useEffect(() => {
    // Listen for Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        setSimulatedUser((prev) => ({
          ...prev,
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Authenticated User',
          email: user.email || prev.email,
        }));
      }
    });

    // Validate Cloud Firestore connection on boot
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [orgsRes, integRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/integrations'),
      ]);

      const orgsData = await orgsRes.json();
      const integData = await integRes.json();

      if (orgsData.success && orgsData.data.length > 0) {
        setOrganizations(orgsData.data);
        const defaultOrg = orgsData.data[0];
        setCurrentOrg(defaultOrg);
        loadOrgSpecificData(defaultOrg.id);
      }

      if (integData.success) {
        setIntegrations(integData.data);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadOrgSpecificData = async (orgId: string) => {
    try {
      const [debRes, invRes, payRes, dispRes, promRes, wfRes, commRes, audRes, cnRes, teamRes, jobsRes] = await Promise.all([
        fetch(`/api/debtors?orgId=${orgId}`),
        fetch(`/api/invoices?orgId=${orgId}`),
        fetch(`/api/payments?orgId=${orgId}`),
        fetch(`/api/disputes?orgId=${orgId}`),
        fetch(`/api/promises?orgId=${orgId}`),
        fetch(`/api/dunning-workflows?orgId=${orgId}`),
        fetch(`/api/communications?orgId=${orgId}`),
        fetch(`/api/audit-logs?orgId=${orgId}`),
        fetch(`/api/credit-notes?orgId=${orgId}`),
        fetch(`/api/team?orgId=${orgId}`),
        fetch(`/api/background-jobs`),
      ]);

      const [debData, invData, payData, dispData, promData, wfData, commData, audData, cnData, teamData, jobsData] = await Promise.all([
        debRes.json(),
        invRes.json(),
        payRes.json(),
        dispRes.json(),
        promRes.json(),
        wfRes.json(),
        commRes.json(),
        audRes.json(),
        cnRes.json(),
        teamRes.json(),
        jobsRes.json(),
      ]);

      if (debData.success) setDebtors(debData.data);
      if (invData.success) setInvoices(invData.data);
      if (payData.success) setPayments(payData.data);
      if (dispData.success) setDisputes(dispData.data);
      if (promData.success) setPromises(promData.data);
      if (wfData.success) setDunningWorkflows(wfData.data);
      if (commData.success) setCommunications(commData.data);
      if (audData.success) setAuditLogs(audData.data);
      if (cnData.success) setCreditNotes(cnData.data);
      if (teamData.success) {
        setTeamUsers(teamData.data);
        if (teamData.data.length > 0 && !simulatedUser) {
          setSimulatedUser(teamData.data[0]);
        }
      }
      if (jobsData.success) setBackgroundJobs(jobsData.data);
    } catch (err) {
      console.error('Failed to load org specific data:', err);
    }
  };

  const fetchUnreadNotifications = async (targetOrgId?: string) => {
    const oId = targetOrgId || currentOrg?.id;
    if (!oId) return;
    try {
      const res = await fetch(`/api/notifications?orgId=${oId}&userId=${simulatedUser.id}&userRole=${simulatedUser.role}`);
      const data = await res.json();
      if (data.success) {
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (currentOrg) {
      fetchUnreadNotifications(currentOrg.id);
      const interval = setInterval(() => fetchUnreadNotifications(currentOrg.id), 20000);
      return () => clearInterval(interval);
    }
  }, [currentOrg?.id, simulatedUser.id, simulatedUser.role]);

  const handleSelectOrg = (org: Organization) => {
    setCurrentOrg(org);
    loadOrgSpecificData(org.id);
  };

  const handleOrganizationCreated = (newOrg: Organization) => {
    setOrganizations((prev) => [...prev, newOrg]);
    setCurrentOrg(newOrg);
    loadOrgSpecificData(newOrg.id);
  };

  // -------------------------------------------------------------
  // REAL DETERMINISTIC FINANCIAL CALCULATIONS
  // -------------------------------------------------------------
  const metrics: FinancialMetrics = useMemo(() => {
    const orgInvoices = currentOrg ? invoices.filter((i) => i.organizationId === currentOrg.id) : [];
    const orgPromises = currentOrg ? promises.filter((p) => p.organizationId === currentOrg.id) : [];
    const orgDisputes = currentOrg ? disputes.filter((d) => d.organizationId === currentOrg.id) : [];
    const orgPayments = currentOrg ? payments.filter((p) => p.organizationId === currentOrg.id) : [];

    const totalReceivables = orgInvoices
      .filter((i) => i.status !== 'paid' && i.status !== 'written_off')
      .reduce((sum, i) => sum + i.amountDue, 0);

    const totalOverdue = orgInvoices
      .filter((i) => i.status === 'overdue' || (i.daysOverdue > 0 && i.status !== 'paid'))
      .reduce((sum, i) => sum + i.amountDue, 0);

    const aging = calculateAgingBuckets(orgInvoices);

    // Total credit sales over trailing 90 days
    const totalCreditSalesPeriod = orgInvoices.reduce((sum, i) => sum + i.totalAmount, 0) || 1;
    const dso = calculateDSO(totalReceivables, totalCreditSalesPeriod, 90);

    // CEI calculation
    const beginningReceivables = totalReceivables * 1.15; // Estimated start of cycle
    const cei = calculateCEI(beginningReceivables, totalCreditSalesPeriod, totalReceivables, aging.current);

    const averageDaysDelinquent = calculateAverageDaysDelinquent(orgInvoices);

    const totalCollectedThisMonth = orgPayments.reduce((sum, p) => sum + p.amount, 0);

    const disputedAmountTotal = orgDisputes
      .filter((d) => d.status === 'open' || d.status === 'under_review')
      .reduce((sum, d) => sum + d.amountDisputed, 0);

    const openPromisesTotal = orgPromises
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.promisedAmount, 0);

    const orgCreditNotes = currentOrg ? creditNotes.filter((c) => c.organizationId === currentOrg.id) : [];
    const totalCreditNotesAmount = orgCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);

    const cashForecast = calculateCashForecast(orgInvoices, orgPromises, orgDisputes);

    return {
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      dso,
      cei,
      averageDaysDelinquent,
      totalCollectedThisMonth: Math.round(totalCollectedThisMonth * 100) / 100,
      disputedAmountTotal: Math.round(disputedAmountTotal * 100) / 100,
      openPromisesTotal: Math.round(openPromisesTotal * 100) / 100,
      totalCreditNotesAmount: Math.round(totalCreditNotesAmount * 100) / 100,
      aging,
      cashForecast,
    };
  }, [invoices, promises, disputes, payments, creditNotes, currentOrg]);

  // -------------------------------------------------------------
  // WORKFLOW ACTION HANDLERS
  // -------------------------------------------------------------

  // Run automated dunning cycle
  const handleRunDunningCycle = async () => {
    if (!currentOrg) return;
    setIsDunningRunning(true);
    try {
      const res = await fetch('/api/dunning/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        // Reload invoices and audit logs
        loadOrgSpecificData(currentOrg.id);
        alert(`Dunning Cadence executed! Processed ${data.data.evaluatedCount} overdue accounts (${data.data.escalatedCount} escalated, ${data.data.pausedCount} paused on dispute).`);
      }
    } catch (err) {
      console.error('Error running dunning cycle:', err);
    } finally {
      setIsDunningRunning(false);
    }
  };

  // Create debtor
  const handleCreateDebtor = async (debtorData: Partial<Debtor>) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/debtors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...debtorData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDebtors((prev) => [data.data, ...prev]);
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error creating debtor:', err);
    }
  };

  // Create invoice
  const handleCreateInvoice = async (invoiceData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invoiceData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
    }
  };

  // Batch import invoices
  const handleImportInvoices = async (importedList: any[]) => {
    if (!currentOrg) return;
    for (const item of importedList) {
      await handleCreateInvoice(item);
    }
    alert(`Successfully imported ${importedList.length} invoices into ${currentOrg.name}.`);
  };

  // Record payment
  const handleRecordPayment = async (paymentData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
    }
  };

  // Lodge dispute
  const handleLodgeDispute = async (disputeData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...disputeData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error lodging dispute:', err);
    }
  };

  // Resolve dispute
  const handleResolveDispute = async (disputeId: string, resolutionData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolutionData),
      });
      const data = await res.json();
      if (data.success) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error resolving dispute:', err);
    }
  };

  // Create promise to pay
  const handleCreatePromise = async (promiseData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/promises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...promiseData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error creating promise:', err);
    }
  };

  // Update promise status
  const handleUpdatePromiseStatus = async (promiseId: string, status: PromiseStatus) => {
    try {
      const res = await fetch(`/api/promises/${promiseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && currentOrg) {
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error updating promise status:', err);
    }
  };

  // Send communication
  const handleSendCommunication = async (commData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCommunications((prev) => [data.data, ...prev]);
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error dispatching communication:', err);
    }
  };

  // Update integration
  const handleUpdateIntegration = async (service: string, updateData: any) => {
    try {
      const res = await fetch(`/api/integrations/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (data.success) {
        setIntegrations((prev) => prev.map((item) => (item.service === service ? data.data : item)));
      }
    } catch (err) {
      console.error('Error updating integration:', err);
    }
  };

  // Update organization
  const handleUpdateOrg = async (updatedOrg: Partial<Organization>) => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/organizations/${currentOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrg),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentOrg(data.data);
        setOrganizations((prev) => prev.map((o) => (o.id === data.data.id ? data.data : o)));
      }
    } catch (err) {
      console.error('Error updating organization:', err);
    }
  };

  // Issue Credit Note
  const handleIssueCreditNote = async (cnData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cnData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditNotes((prev) => [data.data, ...prev]);
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error issuing credit note:', err);
    }
  };

  // Invite Team Member
  const handleInviteUser = async (userData: any) => {
    if (!currentOrg) return;
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, organizationId: currentOrg.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamUsers((prev) => [...prev, data.data]);
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error inviting team member:', err);
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/team/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success && currentOrg) {
        setTeamUsers((prev) => prev.map((u) => (u.id === userId ? data.data : u)));
        if (simulatedUser.id === userId) {
          setSimulatedUser(data.data);
        }
        loadOrgSpecificData(currentOrg.id);
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  // Trigger Background Job
  const handleTriggerBackgroundJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/background-jobs/${jobId}/run`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && currentOrg) {
        setBackgroundJobs((prev) => prev.map((j) => (j.id === jobId ? data.data : j)));
        loadOrgSpecificData(currentOrg.id);
        alert(`Executed Cloud Scheduler job: ${data.data.name}! Evaluated ${data.data.itemsProcessed} records.`);
      }
    } catch (err) {
      console.error('Error triggering job:', err);
    }
  };

  const canIssueCreditNotes = simulatedUser.role === 'admin' || simulatedUser.role === 'finance_manager';

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Bootstrapping CNTCollect Accounts Receivable Operating Platform...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Platform Navigation */}
      <Navbar
        organizations={organizations}
        currentOrg={currentOrg}
        onSelectOrg={handleSelectOrg}
        debtors={debtors}
        onOpenDebtorPortal={(debtor) => setPortalDebtor(debtor)}
        onOpenNewInvoiceModal={() => setIsNewInvoiceOpen(true)}
        onOpenRecordPaymentModal={() => setActiveTab('payments')}
        onRunDunningCycle={handleRunDunningCycle}
        isDunningRunning={isDunningRunning}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        authUser={authUser}
        isFirestoreConnected={isFirestoreConnected}
        onOpenOnboardingModal={() => setIsOnboardingOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={simulatedUser}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        onOpenCommandCentre={() => setIsCommandCentreOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Section 6.2 Role-Specific Security Boundary Banner */}
        {simulatedUser.role === 'customer_portal' && (
          <div className="mb-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center">
                CP
              </div>
              <div>
                <span className="font-bold text-white">Section 6.2 (H) Customer Portal User Mode:</span> Authenticated as Marcus Vance (Apex Retail Group plc). Data access is strictly restricted to your debtor invoices, statement ledgers, and self-service settlement options.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('invoices')}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition shrink-0"
            >
              View Invoices
            </button>
          </div>
        )}

        {simulatedUser.role === 'auditor' && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center">
                AU
              </div>
              <div>
                <span className="font-bold text-white">Section 6.2 (G) Auditor Mode:</span> Authorised read-only forensic access to immutable audit trails, ledger adjustments, and statutory compliance logs. Write operations are blocked.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('auditlog')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition shrink-0"
            >
              Open Audit Trail
            </button>
          </div>
        )}

        {simulatedUser.role === 'platform_admin' && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center">
                SA
              </div>
              <div>
                <span className="font-bold text-white">Section 6.2 (A) Platform Super Administrator Mode:</span> Manages SaaS subscriptions, platform configurations, system monitoring, and cross-tenant access.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-500 transition shrink-0"
            >
              Platform Administration
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            organization={currentOrg}
            metrics={metrics}
            debtors={debtors}
            invoices={invoices}
            disputes={disputes}
            promises={promises}
            onNavigateTab={setActiveTab}
            onOpenReminderModal={(inv) => setReminderInvoice(inv)}
            onOpenDebtorPortal={(debtor) => setPortalDebtor(debtor)}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            organization={currentOrg}
            invoices={invoices}
            debtors={debtors}
            onOpenNewInvoiceModal={() => setIsNewInvoiceOpen(true)}
            onOpenRecordPaymentForInvoice={(inv) => setActiveTab('payments')}
            onOpenReminderModal={(inv) => setReminderInvoice(inv)}
            onOpenDisputeModal={(inv) => {
              setActiveTab('disputes');
            }}
            onOpenDebtorPortal={(debtor) => setPortalDebtor(debtor)}
            onImportInvoices={handleImportInvoices}
            onOpenWriteOffModal={(inv) => setHighImpactModalData({
              isOpen: true,
              actionType: 'write_off',
              targetId: inv.id,
              targetName: `Invoice ${inv.invoiceNumber}`,
              amount: inv.amountDue,
              currency: inv.currency,
            })}
            onInvoiceUpdated={(updated) => {
              setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'debtors' && (
          <DebtorsView
            organization={currentOrg}
            debtors={debtors}
            invoices={invoices}
            promises={promises}
            disputes={disputes}
            onOpenDebtorPortal={(debtor) => setPortalDebtor(debtor)}
            onCreateDebtor={handleCreateDebtor}
            onOpenPromiseModalForDebtor={(debtor) => {
              setActiveTab('promises');
            }}
            onCustomerUpdated={(updated) => {
              setDebtors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {/* Section 10 Accounts Receivable Deterministic Calculation Engine */}
        {activeTab === 'arengine' && (
          <ArEngineView
            organization={currentOrg}
            invoices={invoices}
            payments={payments}
            creditNotes={creditNotes}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onOpenInvoiceDetail={(inv) => {
              setActiveTab('invoices');
            }}
          />
        )}

        {/* Section 9 Guided Spreadsheet & CSV Ingestion Engine */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Section 9 Guided Spreadsheet & CSV Import Engine</h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Deterministic 12-stage guided import workflow for Invoices, Customers, and Historical Payments. Features format detection, intelligent column mapping, duplicate protection, and downloadable rejection error reports.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setImportInitialEntity('invoices');
                    setIsImportModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition"
                >
                  Import Invoices (CSV / XLSX)
                </button>
                <button
                  onClick={() => {
                    setImportInitialEntity('customers');
                    setIsImportModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                >
                  Import Customers (CSV / XLSX)
                </button>
                <button
                  onClick={() => {
                    setImportInitialEntity('payments');
                    setIsImportModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                >
                  Import Payments (CSV / XLSX)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'creditnotes' && (
          <CreditNotesView
            organization={currentOrg}
            creditNotes={creditNotes}
            debtors={debtors}
            invoices={invoices}
            onIssueCreditNote={handleIssueCreditNote}
            canIssueCreditNotes={canIssueCreditNotes}
          />
        )}

        {activeTab === 'reports' && currentOrg && (
          <ReportsView
            organization={currentOrg}
            debtors={debtors}
            invoices={invoices}
            payments={payments}
            creditNotes={creditNotes}
            disputes={disputes}
            promises={promises}
            communications={communications}
            teamUsers={teamUsers}
            metrics={metrics}
            currentUser={simulatedUser}
          />
        )}

        {activeTab === 'performance_metrics' && currentOrg && (
          <CollectionPerformanceMetricsView
            organization={currentOrg}
            invoices={invoices}
            payments={payments}
            creditNotes={creditNotes}
            disputes={disputes}
            promises={promises}
            communications={communications}
            metrics={metrics}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'rules' && currentOrg && (
          <AutomationRuleBuilderView
            organization={currentOrg}
            debtors={debtors}
            invoices={invoices}
            teamUsers={teamUsers}
            currentUser={simulatedUser}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'team' && (
          <TeamRbacView
            organization={currentOrg}
            users={teamUsers}
            currentSimulatedUser={simulatedUser}
            onSwitchSimulatedUser={(u) => setSimulatedUser(u)}
            onInviteUser={handleInviteUser}
            onUpdateRole={handleUpdateUserRole}
          />
        )}

        {activeTab === 'admin' && (
          <PlatformAdminView
            organization={currentOrg}
            organizations={organizations}
            backgroundJobs={backgroundJobs}
            onTriggerJob={handleTriggerBackgroundJob}
            onSelectOrg={handleSelectOrg}
          />
        )}

        {activeTab === 'dunning' && (
          <DunningView
            organization={currentOrg}
            debtors={debtors}
            invoices={invoices}
            dunningWorkflows={dunningWorkflows}
            communications={communications}
            onRunDunningCycle={handleRunDunningCycle}
            isDunningRunning={isDunningRunning}
            onSendCommunication={handleSendCommunication}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'disputes' && (
          <DisputesView
            organization={currentOrg}
            disputes={disputes}
            invoices={invoices}
            debtors={debtors}
            onLodgeDispute={handleLodgeDispute}
            onResolveDispute={handleResolveDispute}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'collector_workspace' && currentOrg && (
          <CollectorWorkspaceView
            organization={currentOrg}
            debtors={debtors}
            invoices={invoices}
            onSelectDebtor={() => {
              setActiveTab('debtors');
            }}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'promises' && (
          <PromisesView
            organization={currentOrg}
            promises={promises}
            debtors={debtors}
            invoices={invoices}
            onCreatePromise={handleCreatePromise}
            onUpdatePromiseStatus={handleUpdatePromiseStatus}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            organization={currentOrg}
            payments={payments}
            debtors={debtors}
            invoices={invoices}
            onRecordPayment={handleRecordPayment}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'cashforecast' && (
          <CashForecastView
            organization={currentOrg}
            metrics={metrics}
            invoices={invoices}
            promises={promises}
            disputes={disputes}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            organization={currentOrg}
            integrations={integrations}
            invoices={invoices}
            debtors={debtors}
            communications={communications}
            onUpdateIntegration={handleUpdateIntegration}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'subscription' && currentOrg && (
          <SubscriptionView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'security' && currentOrg && (
          <SecurityDataProtectionView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'auditlog' && currentOrg && (
          <AuditTrailView
            organization={currentOrg}
            auditLogs={auditLogs}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'database' && currentOrg && (
          <DatabaseDesignView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
          />
        )}

        {activeTab === 'documents' && currentOrg && (
          <DocumentManagementView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'scalability' && currentOrg && (
          <PerformanceScalabilityView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'testing' && currentOrg && (
          <TestingQualityAssuranceView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'observability' && currentOrg && (
          <ErrorObservabilityView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'readiness' && currentOrg && (
          <ProductionReadinessView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'roadmap' && currentOrg && (
          <ImplementationRoadmapView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'rules_compliance' && currentOrg && (
          <DevelopmentExecutionRulesView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'final_acceptance' && currentOrg && (
          <FinalAcceptanceCriteriaView
            organization={currentOrg}
            onRefreshData={() => {
              if (currentOrg) loadOrgSpecificData(currentOrg.id);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            organization={currentOrg}
            onUpdateOrg={handleUpdateOrg}
            onNavigateTab={setActiveTab}
          />
        )}

      </main>

      {/* Global Modals */}

      {/* 1. Create Invoice Modal */}
      {isNewInvoiceOpen && (
        <CreateInvoiceModal
          organization={currentOrg}
          debtors={debtors}
          onClose={() => setIsNewInvoiceOpen(false)}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {/* 2. AI Reminder Generator Modal */}
      {reminderInvoice && (
        <ReminderModal
          invoice={reminderInvoice}
          debtor={debtors.find((d) => d.id === reminderInvoice.debtorId)}
          organization={currentOrg}
          onClose={() => setReminderInvoice(null)}
          onSendCommunication={handleSendCommunication}
        />
      )}

      {/* 3. Debtor Self-Service Portal Preview Modal */}
      {portalDebtor && (
        <DebtorPortalModal
          debtor={portalDebtor}
          organization={currentOrg}
          invoices={invoices}
          onClose={() => setPortalDebtor(null)}
          onSimulatePortalPayment={(inv, method) => {
            handleRecordPayment({
              organizationId: currentOrg.id,
              debtorId: portalDebtor.id,
              amount: inv.amountDue,
              currency: inv.currency,
              paymentDate: new Date().toISOString().split('T')[0],
              paymentMethod: method,
              referenceNumber: `PORTAL-PAY-${Math.floor(100000 + Math.random() * 900000)}`,
              allocations: [
                { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, allocatedAmount: inv.amountDue }
              ],
              recordedBy: 'Debtor Portal (Self-Service)',
              notes: 'Settled directly via online card checkout on secure debtor portal.',
            });
          }}
          onProposePaymentPlan={(debtorId, invoiceId, amount, date, notes) => {
            handleCreatePromise({
              debtorId,
              invoiceId,
              promisedAmount: amount,
              promisedDate: date,
              contactPerson: portalDebtor.contactName,
              notes: `Portal proposal: ${notes}`,
            });
          }}
          onLodgePortalDispute={(invoiceId, reason, amount, statement) => {
            handleLodgeDispute({
              invoiceId,
              reason,
              amountDisputed: amount,
              debtorStatement: `Customer portal submission: ${statement}`,
            });
          }}
        />
      )}

      {/* 4. Organisation Onboarding & Registration Modal (Section 5.1) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOrganizationCreated={handleOrganizationCreated}
      />

      {/* 5. Enterprise Authentication & Identity Access Modal (Section 6.1) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={simulatedUser}
        onUserAuthenticated={(authenticatedUser) => {
          setSimulatedUser(authenticatedUser);
          if (authenticatedUser.organizationId && authenticatedUser.organizationId !== 'all') {
            const org = organizations.find((o) => o.id === authenticatedUser.organizationId);
            if (org) handleSelectOrg(org);
          }
        }}
      />

      {/* 6. High-Impact Action Authorisation Modal (Section 6.2 Dual Control) */}
      {highImpactModalData && (
        <HighImpactActionModal
          isOpen={highImpactModalData.isOpen}
          onClose={() => setHighImpactModalData(null)}
          actionType={highImpactModalData.actionType}
          targetId={highImpactModalData.targetId}
          targetName={highImpactModalData.targetName}
          amount={highImpactModalData.amount}
          currency={highImpactModalData.currency}
          currentUser={simulatedUser}
          onSuccess={() => {
            if (currentOrg) loadOrgSpecificData(currentOrg.id);
          }}
        />
      )}

      {/* 7. Section 9 Guided Spreadsheet & CSV Import Modal */}
      {currentOrg && (
        <CsvSpreadsheetImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          organization={currentOrg}
          initialEntityType={importInitialEntity}
          onImportComplete={() => {
            if (currentOrg) loadOrgSpecificData(currentOrg.id);
          }}
        />
      )}

      {/* 8. Part 22 In-App Notification Centre Modal */}
      {currentOrg && (
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => {
            setIsNotificationCenterOpen(false);
            fetchUnreadNotifications(currentOrg.id);
          }}
          organization={currentOrg}
          currentUser={simulatedUser}
          onNavigateToRecord={(tab) => {
            setActiveTab(tab);
          }}
          onOpenPreferences={() => setIsNotificationPreferencesOpen(true)}
        />
      )}

      {/* 9. Part 22 Notification Preferences Modal */}
      {currentOrg && (
        <NotificationPreferencesModal
          isOpen={isNotificationPreferencesOpen}
          onClose={() => setIsNotificationPreferencesOpen(false)}
          organization={currentOrg}
          currentUser={simulatedUser}
          onPreferencesUpdated={() => fetchUnreadNotifications(currentOrg.id)}
        />
      )}

      {/* 10. Part 29 CNTCollect Command Centre & Global Search Modal */}
      {currentOrg && (
        <CommandCentreModal
          isOpen={isCommandCentreOpen}
          onClose={() => setIsCommandCentreOpen(false)}
          organization={currentOrg}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
          }}
          onOpenNewInvoiceModal={() => setIsNewInvoiceOpen(true)}
          onOpenRecordPaymentModal={() => setActiveTab('payments')}
          onRunDunningCycle={handleRunDunningCycle}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CNTCollect • Accounts Receivable & Payment Recovery Operating Platform
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Deterministic Financial Engine</span>
            <span>•</span>
            <span>Gemini 3.8 Flash Assistant</span>
            <span>•</span>
            <span>Multilingual EN / FR / ES</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainPlatform />
    </LanguageProvider>
  );
}
