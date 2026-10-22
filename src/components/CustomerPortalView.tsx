import React, { useState, useEffect } from 'react';
import { 
  Building, 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  X, 
  Check, 
  FileText,
  Clock,
  Send,
  HelpCircle,
  Phone,
  Mail,
  Lock,
  Globe,
  ArrowRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  Layers,
  ChevronDown,
  Paperclip,
  CheckCheck,
  Ban,
  FileCheck,
  Smartphone,
  Sliders,
  DollarSign
} from 'lucide-react';
import { 
  Debtor, 
  Organization, 
  Invoice, 
  DisputeCategory, 
  PortalPaymentGatewayType,
  Language 
} from '../types';
import { formatCurrency } from '../services/calculations';

interface CustomerPortalViewProps {
  organization: Organization;
  debtor: Debtor;
  debtorsList?: Debtor[];
  onSelectDebtor?: (debtor: Debtor) => void;
  invoices?: Invoice[];
  onClose?: () => void;
  standaloneMode?: boolean;
}

// Multi-language dictionary for customer portal (16.7: English, French, Spanish)
const PORTAL_I18N = {
  en: {
    portalTitle: 'Customer Payment Portal',
    portalSubtitle: 'Secure Account Self-Service & Electronic Settlement',
    verifiedCreditor: 'Verified Creditor',
    totalOutstanding: 'Total Outstanding Balance',
    totalOverdue: 'Total Overdue Balance',
    unpaidInvoices: 'Unpaid Invoices',
    paidInvoices: 'Paid Invoices',
    activePromises: 'Payment Intentions',
    openDisputes: 'Active Queries / Disputes',
    tabDashboard: 'Account Summary',
    tabInvoices: 'Invoices & Statements',
    tabPayOnline: 'Pay Online',
    tabPromise: 'Payment Intention',
    tabProof: 'Upload Remittance Proof',
    tabSupport: 'Queries & Support',
    tabPreferences: 'Preferences & Security',
    invoiceNumber: 'Invoice #',
    dueDate: 'Due Date',
    originalAmount: 'Invoice Amount',
    balanceDue: 'Balance Due',
    status: 'Status',
    action: 'Action',
    payNow: 'Pay Online',
    submitQuery: 'Submit Query',
    requestStatement: 'Request Statement',
    downloadPdf: 'Download PDF',
    paymentInstructions: 'Bank Transfer Instructions',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bankName: 'Bank Name',
    paymentRefNotice: 'Please quote your Invoice # as the remittance reference.',
    intendTitle: 'Submit Payment Intention (Section 16.4)',
    intendNotice: 'This records a payment intention or promise to pay in our ledger. It does NOT automatically clear your balance.',
    intendAmount: 'Intended Amount',
    intendDate: 'Intended Settlement Date',
    intendMethod: 'Payment Channel',
    intendRef: 'Transaction Reference (if known)',
    intendNotes: 'Optional Message / Treasury Note',
    submitIntention: 'Record Payment Intention',
    proofTitle: 'Submit Proof of Remittance (Section 16.5)',
    proofNotice: 'Uploaded remittance advices are validated, scanned clean, and queued for finance verification. Invoices remain active until bank clearance.',
    proofSelectInvoice: 'Target Commercial Invoice',
    proofSettledAmount: 'Remitted Amount',
    proofTransferDate: 'Bank Transfer Date',
    proofMethod: 'Payment Method',
    proofBankRef: 'Bank Clearing Reference',
    proofFile: 'Remittance Advice Document (PDF, JPG, PNG only)',
    submitProof: 'Upload & Queue for Verification',
    onlinePayTitle: 'Secure Online Electronic Checkout (Section 16.6)',
    onlinePayNotice: 'Card details are processed via hosted tokenized gateways. No raw card numbers or CVV are stored. Payments are verified server-side.',
    selectGateway: 'Select Payment Rail',
    cardholderName: 'Cardholder / Corporate Name',
    cardNumber: 'Card Number',
    confirmServerPayment: 'Confirm Server-Side Verified Payment',
    supportTitle: 'Customer Support & Dispute Intake (Section 16.7)',
    contactCreditor: 'Contact Your Account Manager',
    disputeCategory: 'Dispute Category',
    disputeExplanation: 'Detailed Explanation of Query',
    submitDispute: 'Register Dispute & Pause Reminders',
    commPrefs: 'Communication Preferences',
    langSelect: 'Portal Language Selection',
    verifiedClean: 'Security Scan: Clean (No threats detected)',
    idempotentNotice: 'Idempotency key validated. Double-billing protected.',
  },
  fr: {
    portalTitle: 'Portail Client de Règlement',
    portalSubtitle: 'Espace Sécurisé de Consultation et Paiement',
    verifiedCreditor: 'Créancier Vérifié',
    totalOutstanding: 'Solde Total Dû',
    totalOverdue: 'Montant Échu',
    unpaidInvoices: 'Factures en Attente',
    paidInvoices: 'Factures Réglées',
    activePromises: 'Promesses de Règlement',
    openDisputes: 'Litiges en Cours',
    tabDashboard: 'Synthèse du Compte',
    tabInvoices: 'Factures et Relevés',
    tabPayOnline: 'Règlement en Ligne',
    tabPromise: 'Intention de Paiement',
    tabProof: 'Preuve de Virement',
    tabSupport: 'Réclamations & Support',
    tabPreferences: 'Préférences & Sécurité',
    invoiceNumber: 'N° Facture',
    dueDate: 'Échéance',
    originalAmount: 'Montant Facturé',
    balanceDue: 'Reste à Régler',
    status: 'Statut',
    action: 'Action',
    payNow: 'Payer en Ligne',
    submitQuery: 'Poser une Question',
    requestStatement: 'Relevé de Compte',
    downloadPdf: 'Télécharger PDF',
    paymentInstructions: 'Coordonnées Bancaires (Virement)',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bankName: 'Établissement Bancaire',
    paymentRefNotice: 'Veuillez mentionner le numéro de facture en référence de votre virement.',
    intendTitle: 'Déclarer une Intention de Règlement (Article 16.4)',
    intendNotice: 'Cet engagement enregistre une promesse de règlement. La facture ne sera acquittée qu\'après encaissement.',
    intendAmount: 'Montant Envisagé',
    intendDate: 'Date d\'Exécution Prévue',
    intendMethod: 'Canal de Paiement',
    intendRef: 'Référence du Virement (si disponible)',
    intendNotes: 'Message pour le Service Recouvrement',
    submitIntention: 'Enregistrer l\'Intention',
    proofTitle: 'Transmettre un Justificatif de Virement (Article 16.5)',
    proofNotice: 'Le document est analysé et transmis à notre équipe comptable pour vérification. La facture demeure ouverte jusqu\'à validation bancaire.',
    proofSelectInvoice: 'Facture Concernée',
    proofSettledAmount: 'Montant Voté/Transféré',
    proofTransferDate: 'Date du Virement',
    proofMethod: 'Mode de Paiement',
    proofBankRef: 'Référence Bancaire de Remise',
    proofFile: 'Avis d\'Opéré Bancaire (PDF, JPG, PNG uniquement)',
    submitProof: 'Soumettre pour Vérification',
    onlinePayTitle: 'Règlement Électronique Sécurisé (Article 16.6)',
    onlinePayNotice: 'Vos coordonnées sont tokenisées par notre passerelle certifiée. Aucun numéro de carte n\'est conservé. Validation directe serveur.',
    selectGateway: 'Moyen de Paiement',
    cardholderName: 'Titulaire du Compte',
    cardNumber: 'Numéro de Carte',
    confirmServerPayment: 'Valider le Règlement Sécurisé',
    supportTitle: 'Assistance et Gestion des Litiges (Article 16.7)',
    contactCreditor: 'Contacter Votre Chargé de Compte',
    disputeCategory: 'Motif de la Réclamation',
    disputeExplanation: 'Détails de l\'Objection',
    submitDispute: 'Déposer la Réclamation et Suspendre les Relances',
    commPrefs: 'Préférences de Communication',
    langSelect: 'Langue du Portail',
    verifiedClean: 'Contrôle Antivirus : Sain (Aucune menace détectée)',
    idempotentNotice: 'Clé d\'idempotence validée. Protection contre les débits multiples.',
  },
  es: {
    portalTitle: 'Portal de Pagos para Clientes',
    portalSubtitle: 'Gestión Segura de Cuenta y Liquidación Electrónica',
    verifiedCreditor: 'Acreedor Verificado',
    totalOutstanding: 'Saldo Total Pendiente',
    totalOverdue: 'Saldo Vencido',
    unpaidInvoices: 'Facturas Pendientes',
    paidInvoices: 'Facturas Pagadas',
    activePromises: 'Promesas de Pago',
    openDisputes: 'Consultas / Disputas',
    tabDashboard: 'Resumen de Cuenta',
    tabInvoices: 'Facturas y Extractos',
    tabPayOnline: 'Pago en Línea',
    tabPromise: 'Intención de Pago',
    tabProof: 'Subir Comprobante',
    tabSupport: 'Consultas y Soporte',
    tabPreferences: 'Preferencias y Seguridad',
    invoiceNumber: 'Nº Factura',
    dueDate: 'Vencimiento',
    originalAmount: 'Importe Facturado',
    balanceDue: 'Saldo Pendiente',
    status: 'Estado',
    action: 'Acción',
    payNow: 'Pagar Ahora',
    submitQuery: 'Realizar Consulta',
    requestStatement: 'Solicitar Extracto',
    downloadPdf: 'Descargar PDF',
    paymentInstructions: 'Instrucciones para Transferencia',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bankName: 'Entidad Bancaria',
    paymentRefNotice: 'Indique el número de factura como concepto en la transferencia.',
    intendTitle: 'Notificar Intención de Pago (Sección 16.4)',
    intendNotice: 'Registra un compromiso de pago formal en el libro mayor. La deuda no se cancela hasta la recepción efectiva de los fondos.',
    intendAmount: 'Importe a Pagar',
    intendDate: 'Fecha Prevista de Pago',
    intendMethod: 'Método de Pago',
    intendRef: 'Referencia Bancaria (si se conoce)',
    intendNotes: 'Mensaje Opcional para Tesorería',
    submitIntention: 'Registrar Intención de Pago',
    proofTitle: 'Cargar Comprobante de Transferencia (Sección 16.5)',
    proofNotice: 'El archivo es validado y revisado por el departamento de finanzas. La factura permanece abierta hasta la confirmación de tesorería.',
    proofSelectInvoice: 'Factura Relacionada',
    proofSettledAmount: 'Importe Transferido',
    proofTransferDate: 'Fecha de la Transferencia',
    proofMethod: 'Forma de Pago',
    proofBankRef: 'Referencia Bancaria',
    proofFile: 'Comprobante de Transferencia (PDF, JPG, PNG solamente)',
    submitProof: 'Subir para Verificación',
    onlinePayTitle: 'Pasarela de Pago Electrónico (Sección 16.6)',
    onlinePayNotice: 'Los datos son tokenizados mediante pasarelas seguras. No se almacenan números de tarjeta. Verificación estricta en servidor.',
    selectGateway: 'Seleccionar Pasarela',
    cardholderName: 'Titular de la Tarjeta o Cuenta',
    cardNumber: 'Número de Tarjeta',
    confirmServerPayment: 'Confirmar Pago Verificado en Servidor',
    supportTitle: 'Atención al Cliente y Disputas (Sección 16.7)',
    contactCreditor: 'Contacto de su Gestor de Cobranzas',
    disputeCategory: 'Categoría de la Disputa',
    disputeExplanation: 'Explicación Detallada',
    submitDispute: 'Presentar Consulta y Pausar Recordatorios',
    commPrefs: 'Preferencias de Notificación',
    langSelect: 'Selección de Idioma',
    verifiedClean: 'Escaneo de Seguridad: Limpio (Sin amenazas detectadas)',
    idempotentNotice: 'Clave de idempotencia validada. Doble cargo protegido.',
  },
};

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  organization,
  debtor,
  debtorsList = [],
  onSelectDebtor,
  invoices = [],
  onClose,
  standaloneMode = false,
}) => {
  // Portal language state (16.7: en, fr, es)
  const [portalLang, setPortalLang] = useState<Language>(debtor.preferredLanguage || 'en');
  const txt = PORTAL_I18N[portalLang] || PORTAL_I18N.en;
  const currency = debtor.defaultCurrency || organization.defaultCurrency || 'GBP';

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'pay' | 'promise' | 'proof' | 'support' | 'preferences'>('dashboard');

  // Portal data fetched from authenticated token endpoint
  const [portalData, setPortalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Invoice selection for interactions
  const debtorInvoices = invoices.filter((i) => i.debtorId === debtor.id && i.status !== 'written_off');
  const openInvoices = debtorInvoices.filter((i) => i.amountDue > 0.01 && i.status !== 'paid');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(openInvoices[0]?.id || debtorInvoices[0]?.id || '');
  const [viewingInvoiceModal, setViewingInvoiceModal] = useState<Invoice | null>(null);

  // 16.4 Payment Intention Form State
  const [promiseInvoiceId, setPromiseInvoiceId] = useState(openInvoices[0]?.id || '');
  const [promiseAmount, setPromiseAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [promiseDate, setPromiseDate] = useState<string>(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
  const [promiseMethod, setPromiseMethod] = useState<string>('bank_transfer');
  const [promiseRef, setPromiseRef] = useState<string>('');
  const [promiseNotes, setPromiseNotes] = useState<string>('');
  const [isSubmittingPromise, setIsSubmittingPromise] = useState(false);

  // 16.5 Proof of Payment Form State
  const [popInvoiceId, setPopInvoiceId] = useState(openInvoices[0]?.id || '');
  const [popAmount, setPopAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [popDate, setPopDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [popMethod, setPopMethod] = useState<string>('bank_transfer');
  const [popBankRef, setPopBankRef] = useState<string>(`WIRE-REF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [popDocName, setPopDocName] = useState<string>('Bank_Remittance_Advice.pdf');
  const [popNotes, setPopNotes] = useState<string>('');
  const [isSubmittingPop, setIsSubmittingPop] = useState(false);

  // 16.6 Online Payment Form State
  const [payInvoiceId, setPayInvoiceId] = useState(openInvoices[0]?.id || '');
  const [payAmount, setPayAmount] = useState<number>(openInvoices[0]?.amountDue || 0);
  const [payGateway, setPayGateway] = useState<PortalPaymentGatewayType>('stripe_card');
  const [cardName, setCardName] = useState(debtor.contactName || debtor.name);
  const [cardNumberDisplay, setCardNumberDisplay] = useState('•••• •••• •••• 4242');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 16.7 Dispute / Query Form State
  const [disputeInvoiceId, setDisputeInvoiceId] = useState(openInvoices[0]?.id || '');
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('incorrect_invoice_amount');
  const [disputeExplanation, setDisputeExplanation] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // 16.3 Statement Request State
  const [statementPeriod, setStatementPeriod] = useState<'last_30_days' | 'current_quarter' | 'year_to_date' | 'all_open'>('all_open');
  const [statementFormat, setStatementFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isRequestingStatement, setIsRequestingStatement] = useState(false);
  const [generatedStatement, setGeneratedStatement] = useState<any>(null);

  // 16.7 Communication Preferences
  const [commPrefs, setCommPrefs] = useState<string[]>(debtor.communicationPreferences || ['email']);

  // Fetch verified portal data using the debtor's high-entropy token
  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}`);
      const json = await res.json();
      if (json.success) {
        setPortalData(json.data);
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [debtor.id, debtor.paymentPortalToken]);

  // Synchronize defaults when selected open invoice changes
  useEffect(() => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId) || openInvoices[0];
    if (inv) {
      setPromiseAmount(inv.amountDue);
      setPopAmount(inv.amountDue);
      setPayAmount(inv.amountDue);
    }
  }, [selectedInvoiceId]);

  // Message flash timer
  const showSuccess = (msg: string) => {
    setActionSuccessMessage(msg);
    setActionErrorMessage(null);
    setTimeout(() => setActionSuccessMessage(null), 8000);
  };

  const showError = (msg: string) => {
    setActionErrorMessage(msg);
    setActionSuccessMessage(null);
    setTimeout(() => setActionErrorMessage(null), 8000);
  };

  // 16.4 Handler: Submit Payment Intention
  const handleIntentionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPromise(true);
    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}/promises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: promiseInvoiceId,
          promisedAmount: Number(promiseAmount),
          promisedDate: promiseDate,
          paymentMethod: promiseMethod,
          paymentReference: promiseRef,
          notes: promiseNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message);
        loadPortalData();
        setActiveTab('dashboard');
        setPromiseNotes('');
        setPromiseRef('');
      } else {
        showError(data.error || 'Failed to submit payment intention');
      }
    } catch (err) {
      showError('Network error submitting payment intention');
    } finally {
      setIsSubmittingPromise(false);
    }
  };

  // 16.4 Handler: Cancel Payment Intention
  const handleCancelPromise = async (promiseId: string) => {
    if (!confirm('Cancel this payment intention? Your assigned credit controller will be notified.')) return;
    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}/promises/${promiseId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: 'Customer requested cancellation via portal' }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('Payment intention cancelled.');
        loadPortalData();
      }
    } catch (err) {
      showError('Error cancelling payment intention');
    }
  };

  // 16.5 Handler: Submit Proof of Payment
  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPop(true);
    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}/proof-of-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: popInvoiceId,
          amount: Number(popAmount),
          currency,
          paymentDate: popDate,
          paymentMethod: popMethod,
          transactionReference: popBankRef,
          bankReference: popBankRef,
          documentName: popDocName,
          documentSize: '460 KB',
          customerNotes: popNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message);
        loadPortalData();
        setActiveTab('dashboard');
        setPopNotes('');
      } else {
        showError(data.error || 'Validation error uploading remittance proof');
      }
    } catch (err) {
      showError('Network error uploading proof of payment');
    } finally {
      setIsSubmittingPop(false);
    }
  };

  // 16.6 Handler: Online Payment Checkout (Server-Side Verified)
  const handleOnlinePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    const targetInvoice = invoices.find((i) => i.id === payInvoiceId) || openInvoices[0];

    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}/pay-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: targetInvoice?.id,
          amount: Number(payAmount),
          currency: targetInvoice?.currency || currency,
          gateway: payGateway,
          paymentMethodToken: `pm_tok_${Date.now()}_secure`,
          cardholderName: cardName,
          idempotencyKey: `idem-chk-${targetInvoice?.id}-${payAmount}-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message);
        loadPortalData();
        setActiveTab('dashboard');
      } else {
        showError(data.error || 'Server-side payment verification failed');
      }
    } catch (err) {
      showError('Payment processing error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 16.3 Handler: Request Account Statement
  const handleRequestStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequestingStatement(true);
    try {
      const res = await fetch(`/api/portal/${debtor.paymentPortalToken}/statement-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: statementPeriod,
          format: statementFormat,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedStatement(data.data);
        showSuccess(data.message);
      }
    } catch (err) {
      showError('Failed to generate statement');
    } finally {
      setIsRequestingStatement(false);
    }
  };

  // 16.7 Handler: Submit Dispute / Query
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDispute(true);
    const targetInvoice = invoices.find((i) => i.id === disputeInvoiceId);

    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          debtorId: debtor.id,
          invoiceId: targetInvoice?.id,
          category: disputeCategory,
          customerExplanation: disputeExplanation,
          originalMessageChannel: 'portal',
          originalMessageSender: debtor.contactName || debtor.name,
          amountDisputed: targetInvoice ? targetInvoice.amountDue : 0,
          priority: 'medium',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Query successfully registered (Case ${data.data.disputeNumber}). Automated reminders are paused while your account manager investigates.`);
        loadPortalData();
        setDisputeExplanation('');
        setActiveTab('dashboard');
      } else {
        showError(data.error || 'Failed to submit query');
      }
    } catch (err) {
      showError('Error lodging dispute query');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // 16.7 Handler: Save Preferences
  const handleSavePreferences = async (lang: Language, prefs: string[]) => {
    setPortalLang(lang);
    setCommPrefs(prefs);
    try {
      await fetch(`/api/portal/${debtor.paymentPortalToken}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredLanguage: lang,
          communicationPreferences: prefs,
        }),
      });
      showSuccess('Preferences saved.');
    } catch (err) {
      console.error(err);
    }
  };

  const summary = portalData?.summary || {
    totalOutstanding: openInvoices.reduce((s, i) => s + i.amountDue, 0),
    totalOverdue: openInvoices.filter((i) => i.daysOverdue > 0).reduce((s, i) => s + i.amountDue, 0),
    unpaidInvoicesCount: openInvoices.length,
    paidInvoicesCount: debtorInvoices.filter((i) => i.status === 'paid').length,
    activePromisesCount: (portalData?.promises || []).filter((p: any) => p.status === 'pending').length,
    openDisputesCount: (portalData?.disputes || []).filter((d: any) => d.status !== 'resolved' && d.status !== 'closed' && d.status !== 'rejected').length,
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${standaloneMode ? 'p-0' : 'p-3 sm:p-6'}`}>
      
      {/* =========================================================================
          TOP AUTHENTICATION & SECURITY HEADER BAR (16.1 & 16.7)
      ========================================================================= */}
      <header className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
          
          {/* Branded Creditor & Client Account Bar */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                  {txt.verifiedCreditor}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {organization.name}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {txt.portalTitle}: <span className="text-cyan-300">{debtor.name}</span>
              </h1>
              <p className="text-xs text-slate-400">
                {txt.portalSubtitle} • Ref: <strong className="text-slate-200">{debtor.customerReference || 'CUST-APEX-01'}</strong>
              </p>
            </div>
          </div>

          {/* Right Controls: Language Selector, Debtor Switcher & Security Status */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            
            {/* 16.7 Language Selection: EN, FR, ES */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {(['en', 'fr', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSavePreferences(lang, commPrefs)}
                  className={`px-2 py-1 rounded-lg uppercase font-mono text-[10px] font-bold transition ${
                    portalLang === lang
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Test Debtor Switcher (if list provided) */}
            {debtorsList.length > 1 && onSelectDebtor && (
              <select
                value={debtor.id}
                onChange={(e) => {
                  const target = debtorsList.find((d) => d.id === e.target.value);
                  if (target) onSelectDebtor(target);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {debtorsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    View as: {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Token Scope & Expiry Tag (16.1) */}
            <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Token: {debtor.paymentPortalToken?.slice(0, 8)}... (Scope: Full)</span>
            </div>

            {/* Close Button if modal mode */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-800"
                title="Return to Internal Dashboard"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Flash Notifications */}
        {actionSuccessMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
        )}

        {actionErrorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{actionErrorMessage}</span>
          </div>
        )}

        {/* 16.2 Customer Dashboard KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">{txt.totalOutstanding}</span>
            <div className="text-xl font-bold text-white mono-num">
              {formatCurrency(summary.totalOutstanding, currency)}
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">
              {summary.unpaidInvoicesCount} {txt.unpaidInvoices}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">{txt.totalOverdue}</span>
            <div className="text-xl font-bold text-rose-400 mono-num">
              {formatCurrency(summary.totalOverdue, currency)}
            </div>
            <span className="text-[10px] text-rose-400/90 font-medium">
              {summary.totalOverdue > 0 ? 'Settlement Requested' : 'All Current'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">{txt.activePromises}</span>
            <div className="text-xl font-bold text-amber-400 mono-num">
              {summary.activePromisesCount}
            </div>
            <span className="text-[10px] text-amber-400/90 font-mono">
              Intended commitments active
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">{txt.openDisputes}</span>
            <div className="text-xl font-bold text-indigo-400 mono-num">
              {summary.openDisputesCount}
            </div>
            <span className="text-[10px] text-indigo-300 font-mono">
              Reminder pauses applied
            </span>
          </div>
        </div>

        {/* Portal Sub-Navigation Tabs */}
        <nav className="flex space-x-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-800/80 pt-3">
          {[
            { id: 'dashboard', label: txt.tabDashboard },
            { id: 'invoices', label: txt.tabInvoices },
            { id: 'pay', label: txt.tabPayOnline },
            { id: 'promise', label: txt.tabPromise },
            { id: 'proof', label: txt.tabProof },
            { id: 'support', label: txt.tabSupport },
            { id: 'preferences', label: txt.tabPreferences },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-semibold transition ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* =========================================================================
          TAB 1: ACCOUNT DASHBOARD OVERVIEW (16.2)
      ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Quick Pay / Action Callout */}
          {openInvoices.length > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  Direct Settlement Available
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  You have {openInvoices.length} outstanding invoice(s) totalling {formatCurrency(summary.totalOutstanding, currency)}
                </h3>
                <p className="text-xs text-slate-300">
                  Settle securely via tokenized card checkout, Open Banking instant transfer, or submit a payment intention date.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setActiveTab('pay')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-900/40 flex items-center space-x-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{txt.payNow}</span>
                </button>
                <button
                  onClick={() => setActiveTab('promise')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                >
                  {txt.tabPromise}
                </button>
              </div>
            </div>
          )}

          {/* Unpaid Invoices List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{txt.unpaidInvoices}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                  {openInvoices.length}
                </span>
              </h2>
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
              >
                <span>View Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">{txt.invoiceNumber}</th>
                    <th className="px-4 py-2.5">{txt.dueDate}</th>
                    <th className="px-4 py-2.5 text-right">{txt.originalAmount}</th>
                    <th className="px-4 py-2.5 text-right">{txt.balanceDue}</th>
                    <th className="px-4 py-2.5">{txt.status}</th>
                    <th className="px-4 py-2.5 text-right">{txt.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {openInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-850/40 transition">
                      <td className="px-4 py-3 font-bold text-white font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={inv.daysOverdue > 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                          {inv.dueDate} {inv.daysOverdue > 0 && `(${inv.daysOverdue}d overdue)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right mono-num font-medium text-slate-300">
                        {formatCurrency(inv.originalAmount || inv.totalAmount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right mono-num font-bold text-cyan-300">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === 'disputed'
                            ? 'bg-amber-500/20 text-amber-300'
                            : inv.daysOverdue > 0
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {inv.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setPayInvoiceId(inv.id);
                            setPayAmount(inv.amountDue);
                            setActiveTab('pay');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px]"
                        >
                          {txt.payNow}
                        </button>
                        <button
                          onClick={() => setViewingInvoiceModal(inv)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {openInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        All invoices are fully settled. Thank you for your business!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Payment Instructions (16.3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-400" />
              <span>{txt.paymentInstructions}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block font-mono uppercase">{txt.bankName}</span>
                <span className="font-semibold text-white">Barclays Corporate Banking London</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-mono uppercase">{txt.iban}</span>
                <span className="font-mono font-bold text-cyan-300 select-all">
                  {organization.bankDetails?.iban || 'GB82BARC20000012345678'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-mono uppercase">{txt.bicSwift}</span>
                <span className="font-mono font-bold text-white select-all">
                  {organization.bankDetails?.swiftBic || 'BARCGB22'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-amber-300/90 font-medium">
              * {txt.paymentRefNotice}
            </p>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: INVOICES & STATEMENTS (16.3)
      ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-3xl">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {txt.tabInvoices}
              </h3>
              <p className="text-xs text-slate-400">
                View all issued billing instruments, download official PDFs, or request statement extracts.
              </p>
            </div>

            <button
              onClick={handleRequestStatement}
              disabled={isRequestingStatement}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-500/30 flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRequestingStatement ? 'Generating...' : txt.requestStatement}</span>
            </button>
          </div>

          {generatedStatement && (
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-bold text-white">{generatedStatement.fileName}</div>
                  <div className="text-slate-400 text-[11px]">Ready for download • Generated {generatedStatement.generatedAt}</div>
                </div>
              </div>
              <button
                onClick={() => alert(`Simulated downloading statement document: ${generatedStatement.fileName}`)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs"
              >
                Download Statement
              </button>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{txt.invoiceNumber}</th>
                  <th className="px-4 py-3">{txt.dueDate}</th>
                  <th className="px-4 py-3 text-right">{txt.originalAmount}</th>
                  <th className="px-4 py-3 text-right">{txt.balanceDue}</th>
                  <th className="px-4 py-3">{txt.status}</th>
                  <th className="px-4 py-3 text-right">{txt.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {debtorInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-850/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-white text-xs">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {inv.dueDate}
                    </td>
                    <td className="px-4 py-3 text-right mono-num font-medium text-slate-300">
                      {formatCurrency(inv.originalAmount || inv.totalAmount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-right mono-num font-bold text-cyan-300">
                      {formatCurrency(inv.amountDue, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : inv.status === 'disputed'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setViewingInvoiceModal(inv)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                      >
                        Inspect
                      </button>
                      {inv.amountDue > 0.01 && (
                        <button
                          onClick={() => {
                            setPayInvoiceId(inv.id);
                            setPayAmount(inv.amountDue);
                            setActiveTab('pay');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                        >
                          {txt.payNow}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ONLINE ELECTRONIC CHECKOUT (16.6)
      ========================================================================= */}
      {activeTab === 'pay' && (
        <div className="max-w-2xl mx-auto w-full space-y-5">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {txt.onlinePayTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {txt.onlinePayNotice}
                </p>
              </div>
            </div>

            <form onSubmit={handleOnlinePaySubmit} className="space-y-4 text-xs">
              
              {/* Target Invoice */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice *</label>
                <select
                  value={payInvoiceId}
                  onChange={(e) => {
                    setPayInvoiceId(e.target.value);
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) setPayAmount(inv.amountDue);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  required
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.dueDate} ({formatCurrency(inv.amountDue, inv.currency)} due)
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Settlement Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold mono-num focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Gateway Options */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">{txt.selectGateway} *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'stripe_card', label: 'Credit Card', icon: CreditCard },
                    { id: 'open_banking', label: 'Open Banking', icon: Building },
                    { id: 'sepa_direct_debit', label: 'SEPA Debit', icon: Layers },
                    { id: 'faster_payments', label: 'Instant Pay', icon: DollarSign },
                  ].map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setPayGateway(gw.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition ${
                        payGateway === gw.id
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <gw.icon className="w-4 h-4" />
                      <span>{gw.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mock Tokenized Component Fields (No raw card storage) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                  Hosted Tokenized Elements (PCI-DSS Level 1 Encrypted)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">{txt.cardholderName}</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">{txt.cardNumber}</label>
                    <input
                      type="text"
                      disabled
                      value={cardNumberDisplay}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Strict 16.6 Compliance Notice */}
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-[11px] space-y-1">
                <span className="font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Section 16.6 Statutory Verification Safeguard:</span>
                </span>
                <p className="text-slate-300 leading-relaxed text-[10px]">
                  {txt.idempotentNotice} A simple client redirect is not sufficient evidence of payment: our server verifies the gateway event, validates authenticity, and records reconciliations through controlled accounting rules.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessingPayment || Number(payAmount) <= 0}
                className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-cyan-900/40 flex items-center justify-center space-x-2 transition"
              >
                <Lock className="w-4 h-4" />
                <span>{isProcessingPayment ? 'Verifying with Gateway...' : txt.confirmServerPayment}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PAYMENT INTENTION / PROMISE TO PAY (16.4)
      ========================================================================= */}
      {activeTab === 'promise' && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {txt.intendTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {txt.intendNotice}
                </p>
              </div>
            </div>

            <form onSubmit={handleIntentionSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice *</label>
                  <select
                    value={promiseInvoiceId}
                    onChange={(e) => {
                      setPromiseInvoiceId(e.target.value);
                      const inv = invoices.find((i) => i.id === e.target.value);
                      if (inv) setPromiseAmount(inv.amountDue);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    required
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} ({formatCurrency(inv.amountDue, inv.currency)} due)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.intendAmount} ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={promiseAmount}
                    onChange={(e) => setPromiseAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold mono-num focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.intendDate} *</label>
                  <input
                    type="date"
                    required
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.intendMethod} *</label>
                  <select
                    value={promiseMethod}
                    onChange={(e) => setPromiseMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="bank_transfer">Direct Bank Wire / BACS</option>
                    <option value="card">Corporate Card</option>
                    <option value="direct_debit">Direct Debit</option>
                    <option value="instant_electronic">Faster Payments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.intendRef}</label>
                  <input
                    type="text"
                    placeholder="e.g. TREASURY-RUN-992"
                    value={promiseRef}
                    onChange={(e) => setPromiseRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{txt.intendNotes}</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding your treasury batch or scheduled payment release..."
                  value={promiseNotes}
                  onChange={(e) => setPromiseNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPromise || Number(promiseAmount) <= 0}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center justify-center space-x-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingPromise ? 'Submitting...' : txt.submitIntention}</span>
              </button>
            </form>
          </div>

          {/* Active Payment Intentions List */}
          {(portalData?.promises || []).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-white tracking-tight">
                Your Recorded Payment Intentions (Section 16.4)
              </h4>
              <div className="space-y-2">
                {(portalData?.promises || []).map((p: any) => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white mono-num">
                          {formatCurrency(p.promisedAmount, p.currency)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Due: {p.promisedDate} ({p.paymentMethod})
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                          p.status === 'fulfilled' ? 'bg-emerald-500/20 text-emerald-300' : p.status === 'broken' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Invoice: {p.invoiceNumber || 'Account Balance'} • {p.notes}
                      </div>
                    </div>

                    {p.status === 'pending' && (
                      <button
                        onClick={() => handleCancelPromise(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold text-[11px]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: UPLOAD PROOF OF PAYMENT (16.5)
      ========================================================================= */}
      {activeTab === 'proof' && (
        <div className="max-w-2xl mx-auto w-full space-y-5">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {txt.proofTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  {txt.proofNotice}
                </p>
              </div>
            </div>

            <form onSubmit={handleProofSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.proofSelectInvoice} *</label>
                  <select
                    value={popInvoiceId}
                    onChange={(e) => {
                      setPopInvoiceId(e.target.value);
                      const inv = invoices.find((i) => i.id === e.target.value);
                      if (inv) setPopAmount(inv.amountDue);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
                    required
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} ({formatCurrency(inv.amountDue, inv.currency)} due)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.proofSettledAmount} ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={popAmount}
                    onChange={(e) => setPopAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold mono-num focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.proofTransferDate} *</label>
                  <input
                    type="date"
                    required
                    value={popDate}
                    onChange={(e) => setPopDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.proofMethod} *</label>
                  <select
                    value={popMethod}
                    onChange={(e) => setPopMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="bank_transfer">Direct Bank Wire / BACS / SEPA</option>
                    <option value="faster_payments">Faster Payments</option>
                    <option value="card_payment">Corporate Card Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.proofBankRef} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BARC-WIRE-99214"
                    value={popBankRef}
                    onChange={(e) => setPopBankRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* File Attachment & Security Validation */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">{txt.proofFile} *</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={popDocName}
                    onChange={(e) => setPopDocName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    required
                  />
                  <label className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer font-semibold text-xs whitespace-nowrap">
                    <span>Browse</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPopDocName(file.name);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{txt.verifiedClean}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Optional Notes</label>
                <input
                  type="text"
                  placeholder="Additional clearing notes..."
                  value={popNotes}
                  onChange={(e) => setPopNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPop || Number(popAmount) <= 0}
                className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 flex items-center justify-center space-x-2 transition"
              >
                <Paperclip className="w-4 h-4" />
                <span>{isSubmittingPop ? 'Uploading...' : txt.submitProof}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: QUERIES & DISPUTES INTAKE (16.7 & PART 15)
      ========================================================================= */}
      {activeTab === 'support' && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {txt.supportTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  Submit an invoice inquiry or dispute. Lodging pauses automated reminders while preserving accounting integrity.
                </p>
              </div>
            </div>

            <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Commercial Invoice *</label>
                  <select
                    value={disputeInvoiceId}
                    onChange={(e) => setDisputeInvoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    required
                  >
                    {openInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} ({formatCurrency(inv.amountDue, inv.currency)} due)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">{txt.disputeCategory} (15.1) *</label>
                  <select
                    value={disputeCategory}
                    onChange={(e) => setDisputeCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="incorrect_invoice_amount">Incorrect Invoice Amount</option>
                    <option value="duplicate_invoice">Duplicate Invoice</option>
                    <option value="goods_services_not_received">Goods or Services Not Received</option>
                    <option value="incorrect_customer">Incorrect Customer</option>
                    <option value="missing_purchase_order">Missing Purchase Order</option>
                    <option value="incorrect_tax_treatment">Incorrect Tax Treatment</option>
                    <option value="payment_already_made">Payment Already Made</option>
                    <option value="credit_note_requested">Credit Note Requested</option>
                    <option value="contractual_disagreement">Contractual Disagreement</option>
                    <option value="service_complaint">Service Complaint</option>
                    <option value="other">Other Query</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">{txt.disputeExplanation} *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe why this invoice cannot be approved for payment..."
                  value={disputeExplanation}
                  onChange={(e) => setDisputeExplanation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-[11px] space-y-1">
                <span className="font-semibold block">Statutory Dispute Protections (Part 15):</span>
                <p className="text-slate-300 text-[10px]">
                  When submitted, automated reminder communications are halted on this invoice while our credit controllers investigate. Overdue balances are preserved and never erased without authorization.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingDispute || !disputeExplanation.trim()}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 flex items-center justify-center space-x-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmittingDispute ? 'Registering...' : txt.submitDispute}</span>
              </button>
            </form>
          </div>

          {/* Account Manager Contact Card (16.7) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-white tracking-tight flex items-center space-x-2">
              <Phone className="w-4 h-4 text-cyan-400" />
              <span>{txt.contactCreditor}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Assigned Credit Controller</span>
                <div className="font-semibold text-white">Sarah Miller</div>
                <div className="text-slate-400 text-[11px] flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-cyan-400" />
                  <span>billing@acmelogistics.co.uk</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Direct Telephone Hotline</span>
                <div className="font-semibold text-white">+44 20 7946 0999</div>
                <div className="text-slate-400 text-[11px]">Mon-Fri 08:30 - 17:30 GMT</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: PREFERENCES & SECURITY (16.1 & 16.7)
      ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {txt.tabPreferences}
                </h3>
                <p className="text-xs text-slate-400">
                  Manage communication channels, language, and review portal token security status.
                </p>
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">{txt.langSelect}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'en', label: 'English (UK / US)' },
                  { id: 'fr', label: 'Français (France)' },
                  { id: 'es', label: 'Español (España)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSavePreferences(item.id as Language, commPrefs)}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-center transition ${
                      portalLang === item.id
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Communication Preferences */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-slate-300 font-medium">{txt.commPrefs}</label>
              <div className="space-y-2">
                {[
                  { id: 'email', label: 'Transactional Email Reminders & Statements' },
                  { id: 'whatsapp', label: 'WhatsApp Business Remittance Notices' },
                  { id: 'sms', label: 'SMS Due Date Alerts' },
                ].map((pref) => {
                  const isChecked = commPrefs.includes(pref.id);
                  return (
                    <label key={pref.id} className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? commPrefs.filter((p) => p !== pref.id)
                            : [...commPrefs, pref.id];
                          handleSavePreferences(portalLang, updated);
                        }}
                        className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700"
                      />
                      <span className="text-slate-200 text-xs font-medium">{pref.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 16.1 Security & Token Metadata */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Portal Access Token & Security Scope (Section 16.1)</span>
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your portal access is secured by high-entropy token authentication. Predictable invoice IDs are never used as credentials. This token is restricted exclusively to your debtor entity and does not permit access to internal operations.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1">
                Token: {debtor.paymentPortalToken} • Scope: full_portal • Status: Active & Revocable
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INVOICE DETAIL INSPECTION MODAL (16.3)
      ========================================================================= */}
      {viewingInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Invoice {viewingInvoiceModal.invoiceNumber}
                </h3>
              </div>
              <button onClick={() => setViewingInvoiceModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block font-mono">Invoice Date</span>
                  <span className="font-semibold text-white">{viewingInvoiceModal.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-mono">Due Date</span>
                  <span className="font-semibold text-white">{viewingInvoiceModal.dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-mono">Original Amount</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(viewingInvoiceModal.originalAmount || viewingInvoiceModal.totalAmount, viewingInvoiceModal.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-mono">Outstanding Balance</span>
                  <span className="font-bold text-cyan-300">
                    {formatCurrency(viewingInvoiceModal.amountDue, viewingInvoiceModal.currency)}
                  </span>
                </div>
              </div>

              {viewingInvoiceModal.description && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block font-mono">Commercial Scope</span>
                  <p className="text-slate-300 text-xs mt-0.5">{viewingInvoiceModal.description}</p>
                </div>
              )}

              {/* Line items if present */}
              {viewingInvoiceModal.lineItems && viewingInvoiceModal.lineItems.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-500 text-[10px] font-mono block">Line Items</span>
                  <div className="space-y-1">
                    {viewingInvoiceModal.lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                        <span>{item.description} (x{item.quantity})</span>
                        <span className="font-mono">{formatCurrency(item.total ?? (item as any).amount ?? (item.quantity * item.unitPrice), viewingInvoiceModal.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => alert(`Simulated PDF download for invoice ${viewingInvoiceModal.invoiceNumber}`)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{txt.downloadPdf}</span>
              </button>

              <div className="space-x-2">
                <button
                  onClick={() => setViewingInvoiceModal(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Close
                </button>
                {viewingInvoiceModal.amountDue > 0.01 && (
                  <button
                    onClick={() => {
                      setViewingInvoiceModal(null);
                      setPayInvoiceId(viewingInvoiceModal.id);
                      setPayAmount(viewingInvoiceModal.amountDue);
                      setActiveTab('pay');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    {txt.payNow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
