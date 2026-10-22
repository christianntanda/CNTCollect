import React, { useState } from 'react';
import { 
  Building2, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Mail, 
  Phone, 
  Globe, 
  DollarSign, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Bell, 
  Clock, 
  Lock, 
  Sparkles,
  AlertCircle,
  MapPin,
  Layers
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Organization, Language, UserRole } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganizationCreated: (newOrg: Organization) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOrganizationCreated,
}) => {
  const { t } = useTranslation();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  // Step 1: Organisation Identity
  const [name, setName] = useState('');
  const [legalEntity, setLegalEntity] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [industry, setIndustry] = useState('Logistics & Supply Chain');
  const [businessEmail, setBusinessEmail] = useState('');
  const [telephone, setTelephone] = useState('');

  // Step 2: Regional, Currency & Time
  const [defaultLanguage, setDefaultLanguage] = useState<Language>('en');
  const [defaultCurrency, setDefaultCurrency] = useState('GBP');
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['GBP', 'EUR', 'USD']);
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [timeZone, setTimeZone] = useState('Europe/London');
  const [financialYearEnd, setFinancialYearEnd] = useState('31 December');
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState(30);

  // Step 3: Address & Optional Tax Details
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');

  // Step 4: AR Contact & Invoicing Rules
  const [arName, setArName] = useState('');
  const [arEmail, setArEmail] = useState('');
  const [arPhone, setArPhone] = useState('');
  const [invPrefix, setInvPrefix] = useState('INV-');
  const [invNextNumber, setInvNextNumber] = useState(1001);
  const [invPadding, setInvPadding] = useState(5);
  const [baseLateInterestRate, setBaseLateInterestRate] = useState(8.5);
  const [bankName, setBankName] = useState('Barclays Corporate Banking');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('Please quote invoice number as payment reference.');

  // Step 5: Reminder & Escalation Preferences
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [channels, setChannels] = useState<('email' | 'sms' | 'whatsapp')[]>(['email', 'whatsapp']);
  const [autoDunningEnabled, setAutoDunningEnabled] = useState(true);
  const [escalationDays, setEscalationDays] = useState(30);
  const [escalateToRole, setEscalateToRole] = useState<UserRole>('finance_manager');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [whatsappSender, setWhatsappSender] = useState('');

  // Step 6: Email Verification & Review
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const toggleCurrency = (curr: string) => {
    if (supportedCurrencies.includes(curr)) {
      if (supportedCurrencies.length > 1) {
        setSupportedCurrencies(supportedCurrencies.filter((c) => c !== curr));
      }
    } else {
      setSupportedCurrencies([...supportedCurrencies, curr]);
    }
  };

  const toggleChannel = (ch: 'email' | 'sms' | 'whatsapp') => {
    if (channels.includes(ch)) {
      if (channels.length > 1) {
        setChannels(channels.filter((c) => c !== ch));
      }
    } else {
      setChannels([...channels, ch]);
    }
  };

  const validateCurrentStep = (): boolean => {
    setSubmitError('');
    if (step === 1) {
      if (!name.trim()) {
        setSubmitError('Organisation commercial name is required.');
        return false;
      }
      if (!legalEntity.trim()) {
        setSubmitError('Registered / legal entity trading name is required.');
        return false;
      }
      if (!businessEmail.trim() || !businessEmail.includes('@')) {
        setSubmitError('Valid business email address is required.');
        return false;
      }
      if (!telephone.trim()) {
        setSubmitError('Contact telephone number is required.');
        return false;
      }
    }
    if (step === 3) {
      if (!street.trim() || !city.trim() || !postalCode.trim()) {
        setSubmitError('Complete street address, city, and postal code are required.');
        return false;
      }
    }
    if (step === 4) {
      if (!arName.trim() || !arEmail.trim()) {
        setSubmitError('Accounts receivable primary contact name and email are required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(totalSteps, prev + 1));
      if (step === 1) {
        if (!accountName) setAccountName(legalEntity || name);
        if (!fromName) setFromName(`${name} Credit Control`);
        if (!fromEmail) setFromEmail(businessEmail);
        if (!arEmail) setArEmail(businessEmail);
        if (!whatsappSender) setWhatsappSender(telephone);
        if (!invPrefix && name.length >= 3) {
          setInvPrefix(`${name.slice(0, 3).toUpperCase()}-INV-`);
        }
      }
    }
  };

  const handlePrev = () => {
    setSubmitError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSendVerificationCode = async () => {
    setIsVerifying(true);
    setVerificationError('');
    try {
      const res = await fetch('/api/organizations/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: businessEmail, action: 'send' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCodeSent(true);
        setPreviewCode(data.previewCode);
      } else {
        setVerificationError(data.error || 'Failed to dispatch verification code');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Network error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    setVerificationError('');
    try {
      const res = await fetch('/api/organizations/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: businessEmail, code: verificationCode, action: 'verify' }),
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setEmailVerified(true);
      } else {
        setVerificationError(data.error || 'Invalid code');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitRegistration = async () => {
    if (!emailVerified) {
      setSubmitError('Email verification is required prior to tenant provisioning.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      name,
      legalEntity,
      registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
      taxId: taxId || undefined,
      country,
      industry,
      businessEmail,
      telephone,
      defaultLanguage,
      defaultCurrency,
      supportedCurrencies,
      dateFormat,
      timeZone,
      financialYearEnd,
      defaultPaymentTermsDays,
      address: {
        street,
        city,
        stateProvince,
        postalCode,
        country,
      },
      arContact: {
        name: arName || name,
        email: arEmail || businessEmail,
        phone: arPhone || telephone,
      },
      invoiceNumbering: {
        prefix: invPrefix || 'INV-',
        nextNumber: invNextNumber || 1001,
        padding: invPadding || 5,
      },
      reminderPreferences: {
        gracePeriodDays,
        defaultChannels: channels,
        autoDunningEnabled,
        escalationOverdueDays: escalationDays,
        escalateToRole,
        senderIdentity: {
          fromName: fromName || `${name} Credit Control`,
          fromEmail: fromEmail || businessEmail,
          whatsappSenderNumber: whatsappSender || telephone,
        },
      },
      branding: {
        primaryColor: '#4f46e5',
        headerNote: `${name} • Accounts Receivable & Recovery Operations`,
        footerNote: `Payment terms: ${defaultPaymentTermsDays} days net. Thank you for your business.`,
      },
      dataRetention: {
        financialAuditRetentionYears: 7,
        autoArchiveResolvedDisputesDays: 90,
        purgeCommunicationsAfterMonths: 24,
      },
      baseLateInterestRate,
      bankDetails: {
        bankName,
        accountName: accountName || legalEntity || name,
        iban,
        swiftBic,
        paymentInstructions,
      },
      subscriptionPlan: 'starter',
      emailVerified: true,
    };

    try {
      const res = await fetch('/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        onOrganizationCreated(data.data);
        onClose();
      } else {
        setSubmitError(data.error || 'Failed to register organisation');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error submitting onboarding request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Organisation Onboarding & Tenant Registration
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Step {step} of {totalSteps}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure a separate tenant partition with dedicated data isolation, workflows, and legal settings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Indicator */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 overflow-x-auto gap-2">
          {[
            { num: 1, title: 'Identity' },
            { num: 2, title: 'Locales & Currency' },
            { num: 3, title: 'Address & Tax' },
            { num: 4, title: 'AR & Invoicing' },
            { num: 5, title: 'Reminders' },
            { num: 6, title: 'Verification' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center space-x-2 shrink-0 ${
                step === s.num
                  ? 'text-indigo-400 font-semibold'
                  : step > s.num
                  ? 'text-emerald-400'
                  : 'text-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-indigo-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s.num ? <Check className="w-3 h-3" /> : s.num}
              </div>
              <span className="text-xs hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Modal Body / Steps Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
          
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: ORGANISATION IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 — Commercial & Legal Identity</h3>
                <p className="text-xs text-slate-400">Establish the legal name, jurisdiction, and primary communication contacts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Organisation Commercial Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Global Logistics"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Registered Legal Entity Name *
                  </label>
                  <input
                    type="text"
                    value={legalEntity}
                    onChange={(e) => setLegalEntity(e.target.value)}
                    placeholder="e.g. Apex Logistics Global Holdings Ltd"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Country of Incorporation *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="United Kingdom">United Kingdom (UK)</option>
                    <option value="France">France (FR)</option>
                    <option value="Spain">Spain (ES)</option>
                    <option value="United States">United States (US)</option>
                    <option value="Germany">Germany (DE)</option>
                    <option value="South Africa">South Africa (ZA)</option>
                    <option value="Canada">Canada (CA)</option>
                    <option value="Australia">Australia (AU)</option>
                    <option value="Ireland">Ireland (IE)</option>
                    <option value="Netherlands">Netherlands (NL)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Industry / Sector *</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="SaaS & Enterprise Cloud">SaaS & Enterprise Software</option>
                    <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                    <option value="Healthcare & Medical Tech">Healthcare & Medical Tech</option>
                    <option value="Professional Services & Legal">Professional Services & Legal</option>
                    <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                    <option value="Construction & Engineering">Construction & Engineering</option>
                    <option value="Financial Services & Fintech">Financial Services & Fintech</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Business Email (Verification Required) *</span>
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="finance@apexlogistics.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Telephone *</span>
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+44 20 7946 0880"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCALES, CURRENCY & TIME */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 & 5.2 — Regional, Currency & Time Configuration</h3>
                <p className="text-xs text-slate-400">Configure default accounting currency, internationalisation, and calendar cycle.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Default Platform Language</label>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value as Language)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="en">English (Default)</option>
                    <option value="fr">Français (French)</option>
                    <option value="es">Español (Spanish)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Default Reporting Currency *</label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => {
                      const newCurr = e.target.value;
                      setDefaultCurrency(newCurr);
                      if (!supportedCurrencies.includes(newCurr)) {
                        setSupportedCurrencies([...supportedCurrencies, newCurr]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="ZAR">ZAR (R) — South African Rand</option>
                    <option value="CAD">CAD ($) — Canadian Dollar</option>
                    <option value="AUD">AUD ($) — Australian Dollar</option>
                    <option value="CHF">CHF (CHF) — Swiss Franc</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Supported Currencies in Invoicing</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['GBP', 'EUR', 'USD', 'ZAR', 'CAD', 'AUD', 'CHF'].map((curr) => {
                      const selected = supportedCurrencies.includes(curr);
                      return (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => toggleCurrency(curr)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            selected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {curr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Date Formatting Preference</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK / EU standard)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US standard)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Organisation Time Zone</label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Europe/Madrid">Europe/Madrid (CET/CEST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Financial Year-End</label>
                  <select
                    value={financialYearEnd}
                    onChange={(e) => setFinancialYearEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="31 December">31 December (Calendar year)</option>
                    <option value="31 March">31 March (UK standard)</option>
                    <option value="30 June">30 June</option>
                    <option value="30 September">30 September</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Standard Credit Terms</label>
                  <select
                    value={defaultPaymentTermsDays}
                    onChange={(e) => setDefaultPaymentTermsDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={14}>14 Days (Net 14)</option>
                    <option value={30}>30 Days (Net 30)</option>
                    <option value={45}>45 Days (Net 45)</option>
                    <option value={60}>60 Days (Net 60)</option>
                    <option value={0}>Immediate / Due on Receipt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS & TAX DETAILS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 — Physical Address & Tax Registration</h3>
                <p className="text-xs text-slate-400">
                  Business headquarters address and optional tax identification details.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Street Address *</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 100 Bishopsgate, Level 18"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">State / Province</label>
                    <input
                      type="text"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="e.g. Greater London"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Postal / ZIP Code *</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. EC2N 4AG"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Company Registration Number</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="e.g. GB-12938475"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">Tax Identification / VAT Number</label>
                      <span className="text-[10px] text-slate-400 italic">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="e.g. GB982341567 (optional)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Do not require tax identification unless it is needed for statutory VAT invoices or cross-border EU OSS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: AR CONTACT & INVOICING PREFERENCES */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 — Accounts Receivable & Invoicing Rules</h3>
                <p className="text-xs text-slate-400">
                  Credit management personnel, invoice numbering sequence, and statutory late interest rate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">AR Contact Name *</label>
                  <input
                    type="text"
                    value={arName}
                    onChange={(e) => setArName(e.target.value)}
                    placeholder="e.g. Jessica Cooper"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">AR Contact Email *</label>
                  <input
                    type="email"
                    value={arEmail}
                    onChange={(e) => setArEmail(e.target.value)}
                    placeholder="collections@apexlogistics.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">AR Contact Phone</label>
                  <input
                    type="tel"
                    value={arPhone}
                    onChange={(e) => setArPhone(e.target.value)}
                    placeholder="+44 20 7946 0885"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Invoice Numbering Sequence Preferences</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Prefix</label>
                    <input
                      type="text"
                      value={invPrefix}
                      onChange={(e) => setInvPrefix(e.target.value)}
                      placeholder="INV-"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Next Number Sequence</label>
                    <input
                      type="number"
                      value={invNextNumber}
                      onChange={(e) => setInvNextNumber(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Number Padding (Digits)</label>
                    <input
                      type="number"
                      value={invPadding}
                      onChange={(e) => setInvPadding(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  Example Next Invoice Number: <strong className="text-indigo-400 mono-num">{invPrefix}{String(invNextNumber).padStart(invPadding, '0')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Base Statutory Late Payment Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baseLateInterestRate}
                    onChange={(e) => setBaseLateInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Statutory rate applied to overdue commercial invoices after grace period.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Client Depository Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Barclays Corporate Banking"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REMINDERS & DUNNING CADENCE */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 & 5.2 — Reminder Preferences & Escalation Rules</h3>
                <p className="text-xs text-slate-400">
                  Automated dunning cadence, grace periods, escalation thresholds, and sender identities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Grace Period (Days After Due Date)</label>
                  <input
                    type="number"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Number of days before first formal overdue reminder triggers.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Escalation Threshold (Days Overdue)</label>
                  <input
                    type="number"
                    value={escalationDays}
                    onChange={(e) => setEscalationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Auto-escalates uncollected invoices to manager for legal pre-action review.</p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Default Recovery Dispatch Channels</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { key: 'email', label: 'Transactional Email (HTML & PDF)' },
                      { key: 'whatsapp', label: 'WhatsApp Business Messaging' },
                      { key: 'sms', label: 'SMS Instant Notification' },
                    ].map((ch) => {
                      const selected = channels.includes(ch.key as any);
                      return (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() => toggleChannel(ch.key as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Sender Display Name</label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Apex Credit Control Office"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Sender Outbound Email</label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="collections@apexlogistics.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Enable Automated Background Dunning Engine</div>
                  <div className="text-[11px] text-slate-400">Execute Cloud Scheduler automated cadence based on debtor risk tier</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDunningEnabled}
                  onChange={(e) => setAutoDunningEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 6: BUSINESS EMAIL VERIFICATION */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white">Section 5.1 — Identity Verification & Tenant Creation</h3>
                <p className="text-xs text-slate-400">
                  Verify the registrant business email before provisioning the multi-tenant partition.
                </p>
              </div>

              {/* Review Summary Card */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-indigo-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tenant Configuration Summary</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Organisation:</span>
                    <strong className="text-white">{name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Legal Entity:</span>
                    <strong className="text-white">{legalEntity}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jurisdiction:</span>
                    <strong className="text-white">{country}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reporting Currency:</span>
                    <strong className="text-white">{defaultCurrency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Time Zone:</span>
                    <strong className="text-white">{timeZone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Credit Terms:</span>
                    <strong className="text-white">{defaultPaymentTermsDays} Days Net</strong>
                  </div>
                </div>
              </div>

              {/* Email Verification Box */}
              <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-indigo-400" />
                      <span>Verify Business Email: <span className="text-indigo-300">{businessEmail}</span></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter the 6-digit verification code to validate authorization.
                    </p>
                  </div>
                  {emailVerified && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {!emailVerified ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={isVerifying}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                      >
                        {isCodeSent ? 'Resend 6-Digit Code' : 'Send Verification Code'}
                      </button>

                      {isCodeSent && previewCode && (
                        <div className="text-[11px] text-indigo-300 bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-700/40">
                          Verification code: <strong className="font-mono text-white tracking-widest">{previewCode}</strong>
                        </div>
                      )}
                    </div>

                    {isCodeSent && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono tracking-widest focus:outline-none focus:border-indigo-500 w-44"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={isVerifying || verificationCode.length < 6}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </button>
                      </div>
                    )}

                    {verificationError && (
                      <div className="text-xs text-rose-400 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{verificationError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Email verification confirmed. Tenant partition is ready to be provisioned.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitRegistration}
                disabled={!emailVerified || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Provisioning Tenant...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Onboarding & Launch Tenant</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
