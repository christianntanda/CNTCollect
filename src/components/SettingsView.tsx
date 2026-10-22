import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  Users, 
  Check, 
  DollarSign, 
  Sparkles, 
  Layers,
  Palette,
  Globe,
  Clock,
  Bell,
  Mail,
  FileText,
  Archive,
  AlertTriangle,
  Calendar,
  Lock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Organization, Language, UserRole } from '../types';
import { formatCurrency } from '../services/calculations';
import { SubscriptionView } from './SubscriptionView';

export interface SettingsViewProps {
  organization: Organization;
  onUpdateOrg: (updatedOrg: Partial<Organization>) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organization,
  onUpdateOrg,
  onNavigateTab,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  const [activeSubTab, setActiveSubTab] = useState<
    'profile' | 'branding' | 'locales' | 'invoicing' | 'dunning' | 'templates' | 'retention' | 'subscription'
  >('profile');

  // Profile States
  const [name, setName] = useState(organization.name);
  const [legalEntity, setLegalEntity] = useState(organization.legalEntity);
  const [regNum, setRegNum] = useState(organization.registrationNumber);
  const [taxId, setTaxId] = useState(organization.taxId || '');
  const [country, setCountry] = useState(organization.country || 'United Kingdom');
  const [industry, setIndustry] = useState(organization.industry || 'Logistics & Supply Chain');
  const [businessEmail, setBusinessEmail] = useState(organization.businessEmail || 'finance@acmelogistics.co.uk');
  const [telephone, setTelephone] = useState(organization.telephone || '+44 20 7946 0192');
  const [street, setStreet] = useState(organization.address?.street || '14 St Katharine Docks');
  const [city, setCity] = useState(organization.address?.city || 'London');
  const [stateProvince, setStateProvince] = useState(organization.address?.stateProvince || 'Greater London');
  const [postalCode, setPostalCode] = useState(organization.address?.postalCode || 'E1W 1LA');

  // AR Contact
  const [arName, setArName] = useState(organization.arContact?.name || 'Eleanor Vance');
  const [arEmail, setArEmail] = useState(organization.arContact?.email || 'e.vance@acmelogistics.co.uk');
  const [arPhone, setArPhone] = useState(organization.arContact?.phone || '+44 20 7946 0195');

  // Branding States
  const [logoUrl, setLogoUrl] = useState(organization.branding?.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(organization.branding?.primaryColor || '#4f46e5');
  const [headerNote, setHeaderNote] = useState(organization.branding?.headerNote || `${organization.name} • Accounts Receivable Operations`);
  const [footerNote, setFooterNote] = useState(
    organization.branding?.footerNote || `Payment terms: 30 days net from invoice date. Registered in ${organization.country}.`
  );

  // Regional & Currency
  const [defaultCurrency, setDefaultCurrency] = useState(organization.defaultCurrency);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(organization.supportedCurrencies || ['GBP', 'EUR', 'USD']);
  const [dateFormat, setDateFormat] = useState(organization.dateFormat || 'DD/MM/YYYY');
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(organization.defaultLanguage || 'en');
  const [timeZone, setTimeZone] = useState(organization.timeZone || 'Europe/London');
  const [financialYearEnd, setFinancialYearEnd] = useState(organization.financialYearEnd || '31 December');

  // Credit & Invoicing Preferences
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState(organization.defaultPaymentTermsDays || 30);
  const [baseLateInterestRate, setBaseLateInterestRate] = useState(organization.baseLateInterestRate || 8.5);
  const [invPrefix, setInvPrefix] = useState(organization.invoiceNumbering?.prefix || 'INV-');
  const [invNextNumber, setInvNextNumber] = useState(organization.invoiceNumbering?.nextNumber || 1001);
  const [invPadding, setInvPadding] = useState(organization.invoiceNumbering?.padding || 5);
  const [bankName, setBankName] = useState(organization.bankDetails.bankName);
  const [accountName, setAccountName] = useState(organization.bankDetails.accountName);
  const [iban, setIban] = useState(organization.bankDetails.iban);
  const [swift, setSwift] = useState(organization.bankDetails.swiftBic);
  const [instructions, setInstructions] = useState(organization.bankDetails.paymentInstructions);

  // Dunning & Escalation Preferences
  const [gracePeriodDays, setGracePeriodDays] = useState(organization.reminderPreferences?.gracePeriodDays || 3);
  const [escalationDays, setEscalationDays] = useState(organization.reminderPreferences?.escalationOverdueDays || 30);
  const [escalateToRole, setEscalateToRole] = useState<UserRole>(organization.reminderPreferences?.escalateToRole || 'finance_manager');
  const [autoDunningEnabled, setAutoDunningEnabled] = useState(organization.reminderPreferences?.autoDunningEnabled ?? true);
  const [fromName, setFromName] = useState(organization.reminderPreferences?.senderIdentity?.fromName || `${organization.name} Collections`);
  const [fromEmail, setFromEmail] = useState(organization.reminderPreferences?.senderIdentity?.fromEmail || organization.businessEmail || 'collections@acmelogistics.co.uk');
  const [whatsappSender, setWhatsappSender] = useState(organization.reminderPreferences?.senderIdentity?.whatsappSenderNumber || '+44 7700 900123');

  // Data Retention
  const [auditYears, setAuditYears] = useState(organization.dataRetention?.financialAuditRetentionYears || 7);
  const [archiveDisputesDays, setArchiveDisputesDays] = useState(organization.dataRetention?.autoArchiveResolvedDisputesDays || 90);
  const [purgeMonths, setPurgeMonths] = useState(organization.dataRetention?.purgeCommunicationsAfterMonths || 24);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleCurrency = (curr: string) => {
    if (supportedCurrencies.includes(curr)) {
      if (supportedCurrencies.length > 1) {
        setSupportedCurrencies(supportedCurrencies.filter((c) => c !== curr));
      }
    } else {
      setSupportedCurrencies([...supportedCurrencies, curr]);
    }
  };

  const handleSaveAllSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updated: Partial<Organization> = {
      name,
      legalEntity,
      registrationNumber: regNum,
      taxId: taxId || undefined,
      country,
      industry,
      businessEmail,
      telephone,
      address: {
        street,
        city,
        stateProvince,
        postalCode,
        country,
      },
      arContact: {
        name: arName,
        email: arEmail,
        phone: arPhone,
      },
      branding: {
        logoUrl,
        primaryColor,
        headerNote,
        footerNote,
      },
      defaultCurrency,
      supportedCurrencies,
      dateFormat: dateFormat as any,
      defaultLanguage,
      timeZone,
      financialYearEnd,
      defaultPaymentTermsDays: Number(defaultPaymentTermsDays),
      baseLateInterestRate: Number(baseLateInterestRate),
      invoiceNumbering: {
        prefix: invPrefix,
        nextNumber: Number(invNextNumber),
        padding: Number(invPadding),
      },
      bankDetails: {
        bankName,
        accountName,
        iban,
        swiftBic: swift,
        paymentInstructions: instructions,
      },
      reminderPreferences: {
        gracePeriodDays: Number(gracePeriodDays),
        defaultChannels: organization.reminderPreferences?.defaultChannels || ['email', 'whatsapp'],
        autoDunningEnabled,
        escalationOverdueDays: Number(escalationDays),
        escalateToRole,
        senderIdentity: {
          fromName,
          fromEmail: fromEmail || 'collections@acmelogistics.co.uk',
          whatsappSenderNumber: whatsappSender,
        },
      },
      dataRetention: {
        financialAuditRetentionYears: Number(auditYears),
        autoArchiveResolvedDisputesDays: Number(archiveDisputesDays),
        purgeCommunicationsAfterMonths: Number(purgeMonths),
      },
    };

    onUpdateOrg(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleSelectPlan = (plan: 'starter' | 'growth' | 'enterprise') => {
    let limit = 100000;
    let seats = 3;
    if (plan === 'growth') {
      limit = 500000;
      seats = 10;
    } else if (plan === 'enterprise') {
      limit = 2000000;
      seats = 25;
    }

    onUpdateOrg({
      subscriptionPlan: plan,
      recoveryVolumeLimit: limit,
      seatsLimit: seats,
    });
    alert(`Upgraded organization to the ${plan.toUpperCase()} tier! Volume quota expanded to ${formatCurrency(limit, currency)}.`);
  };

  const volumePct = Math.min(100, Math.round((organization.currentRecoveryVolume / (organization.recoveryVolumeLimit || 1)) * 100));
  const seatsPct = Math.min(100, Math.round((organization.seatsUsed / (organization.seatsLimit || 1)) * 100));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{t('navSettings')}</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
              Tenant ID: {organization.id}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure enterprise profile, document branding, multi-currency accounting, automated dunning rules, and compliance retention.
          </p>
        </div>

        <button
          onClick={() => handleSaveAllSettings()}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Check className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Tenant organisation parameters and compliance preferences successfully synchronized.</span>
        </div>
      )}

      {/* Settings Navigation Tabs (Section 5.2 Categories) */}
      <div className="flex items-center space-x-1 border-b border-slate-800 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'profile', label: 'Organisation Profile', icon: Building2 },
          { key: 'branding', label: 'Branding & Invoices', icon: Palette },
          { key: 'locales', label: 'Currencies & Locales', icon: Globe },
          { key: 'invoicing', label: 'Credit Terms & Banking', icon: FileText },
          { key: 'dunning', label: 'Dunning & Escalation', icon: Bell },
          { key: 'templates', label: 'Communication Templates', icon: Mail },
          { key: 'retention', label: 'Data Retention & Audit', icon: Archive },
          { key: 'subscription', label: 'Subscription & Quotas', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ORGANISATION PROFILE TAB */}
      {activeSubTab === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Commercial & Legal Entity Profile</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage the statutory name, legal company identifier, headquarters address, and primary credit contact.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Commercial Brand Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Registered Legal Entity</label>
              <input
                type="text"
                value={legalEntity}
                onChange={(e) => setLegalEntity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Company Registration Number</label>
              <input
                type="text"
                value={regNum}
                onChange={(e) => setRegNum(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Tax Identification / VAT Number</label>
                <span className="text-[10px] text-slate-500 italic">Optional</span>
              </div>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Country of Jurisdiction</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Industry / Market Sector</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Business Inbound Email</label>
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Main Contact Telephone</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Registered Business Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-slate-400">Street Address</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Postal / ZIP Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Accounts Receivable Contact */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Accounts Receivable (AR) Primary Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Contact Officer Name</label>
                <input
                  type="text"
                  value={arName}
                  onChange={(e) => setArName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Contact Email</label>
                <input
                  type="email"
                  value={arEmail}
                  onChange={(e) => setArEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Direct Phone Line</label>
                <input
                  type="tel"
                  value={arPhone}
                  onChange={(e) => setArPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BRANDING & DOCUMENTS TAB */}
      {activeSubTab === 'branding' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Logo & Document Branding Configuration</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize company logo, document theme accent colors, and statutory notices for PDF invoice rendering.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Organisation Logo URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://assets.yourcompany.com/logo.svg"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Supports SVG, PNG, and WebP formats. Displayed on debtor payment portals and PDF invoices.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Brand Accent Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <div className="flex space-x-1.5">
                  {['#4f46e5', '#2563eb', '#0284c7', '#059669', '#d97706', '#7c3aed'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-300">Invoice Document Header Note</label>
              <input
                type="text"
                value={headerNote}
                onChange={(e) => setHeaderNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-300">Statutory Invoicing Footer & Terms</label>
              <textarea
                rows={3}
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Legal payment terms printed on all client invoice statements and debtor recovery notices.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. CURRENCIES & LOCALES TAB */}
      {activeSubTab === 'locales' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Currencies, Language & Date Locales</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage base accounting currency, multi-currency invoicing capabilities, regional date notation, and time zones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Supported Currencies in Debtor Portfolios</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['GBP', 'EUR', 'USD', 'ZAR', 'CAD', 'AUD', 'CHF'].map((c) => {
                  const sel = supportedCurrencies.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCurrency(c)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        sel ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Standard UK / European)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (North American)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Default Organisation Language</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value as Language)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English</option>
                <option value="fr">Français (French)</option>
                <option value="es">Español (Spanish)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Operational Time Zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
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
                <option value="31 December">31 December</option>
                <option value="31 March">31 March</option>
                <option value="30 June">30 June</option>
                <option value="30 September">30 September</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. CREDIT TERMS & BANKING TAB */}
      {activeSubTab === 'invoicing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Credit Terms, Statutory Interest & Banking Instructions</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure settlement terms, automatic statutory late payment interest calculation, and client depository accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Default Credit Terms (Days)</label>
              <input
                type="number"
                value={defaultPaymentTermsDays}
                onChange={(e) => setDefaultPaymentTermsDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Statutory Late Payment Interest (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                value={baseLateInterestRate}
                onChange={(e) => setBaseLateInterestRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Calculated automatically on overdue balances under UK/EU late payment directives.</p>
            </div>
          </div>

          {/* Invoice Numbering Sequence */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white">Invoice Sequence & Prefix Rules</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={invPrefix}
                  onChange={(e) => setInvPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Next Sequence Number</label>
                <input
                  type="number"
                  value={invNextNumber}
                  onChange={(e) => setInvNextNumber(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Zero Padding (Digits)</label>
                <input
                  type="number"
                  value={invPadding}
                  onChange={(e) => setInvPadding(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">Depository Bank Account Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Beneficiary Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">IBAN / Account Number</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">SWIFT / BIC Code</label>
                <input
                  type="text"
                  value={swift}
                  onChange={(e) => setSwift(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-slate-400">Remittance Payment Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DUNNING & ESCALATION RULES TAB */}
      {activeSubTab === 'dunning' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Dunning Cadence, Grace Periods & Escalation Rules</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure grace periods before collection kicks off, escalation triggers, and approved outbound sender profiles.
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
              <p className="text-[10px] text-slate-500">Days allowed past invoice maturity before automated reminder is triggered.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Escalation Trigger Threshold (Days Overdue)</label>
              <input
                type="number"
                value={escalationDays}
                onChange={(e) => setEscalationDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Auto-routes delinquent accounts to higher authority for legal proceedings review.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Escalate To Role</label>
              <select
                value={escalateToRole}
                onChange={(e) => setEscalateToRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="finance_manager">Finance Manager</option>
                <option value="admin">Platform / Tenant Administrator</option>
                <option value="credit_controller">Senior Credit Controller</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Outbound Email Sender Name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Outbound Email Sender Address</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Approved WhatsApp Sender Number</label>
              <input
                type="tel"
                value={whatsappSender}
                onChange={(e) => setWhatsappSender(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white">Enable Automated Background Dunning Execution</div>
              <div className="text-[11px] text-slate-400">Trigger scheduled evaluation of due & overdue balances via Cloud Scheduler</div>
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

      {/* 6. COMMUNICATION TEMPLATES TAB */}
      {activeSubTab === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Multilingual Communication Templates</span>
              </h2>
              <p className="text-xs text-slate-400">
                Pre-approved reminder templates for each dunning stage with dynamic invoice variables.
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('workflows')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
              >
                <span>Edit Workflow Cadence</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {[
              {
                stage: 'Stage 1: Pre-Due Courtesy Notice (-3 Days)',
                channel: 'Email',
                tone: 'Friendly Reminder',
                subject: 'Upcoming Invoice Maturity — {invoiceNumber}',
                body: 'Dear {debtorName}, this is a courtesy notice that invoice {invoiceNumber} for {amountDue} will mature on {dueDate}. Please review payment arrangements or remit securely at: {paymentLink}',
              },
              {
                stage: 'Stage 2: Invoice Due Today (Day 0)',
                channel: 'WhatsApp & Email',
                tone: 'Polite Due Date Notice',
                subject: 'Invoice Settlement Due Today — {invoiceNumber}',
                body: 'Hello {debtorName}, your account statement reflects invoice {invoiceNumber} ({amountDue}) maturing today. Access the instant payment portal here: {paymentLink}',
              },
              {
                stage: 'Stage 3: Overdue Account Escalation (+14 Days)',
                channel: 'Email & SMS',
                tone: 'Firm Overdue Notice',
                subject: 'URGENT: Overdue Balance Outstanding — {invoiceNumber}',
                body: 'Attention Accounts Payable ({debtorName}): Invoice {invoiceNumber} is now 14 days overdue. Outstanding balance is {amountDue}. Statutory late interest is accruing.',
              },
              {
                stage: 'Stage 4: Formal Legal Pre-Action Notice (+30 Days)',
                channel: 'Formal Letter / PDF',
                tone: 'Legal Pre-Action Demand',
                subject: 'FINAL STATUTORY DEMAND PRIOR TO LEGAL PROCEEDINGS: {invoiceNumber}',
                body: 'Formal demand for payment. Invoice {invoiceNumber} remains unpaid in the sum of {amountDue} plus statutory interest. Failure to settle within 7 days will result in referral to external legal counsel.',
              },
            ].map((tmpl, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white">{tmpl.stage}</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {tmpl.channel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      {tmpl.tone}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  <strong className="text-slate-300">Subject:</strong> {tmpl.subject}
                </div>
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                  {tmpl.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DATA RETENTION & COMPLIANCE TAB */}
      {activeSubTab === 'retention' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Archive className="w-4 h-4 text-indigo-400" />
              <span>Data Retention Preferences & Forensic Audit Compliance</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure statutory financial record storage durations, dispute auto-archival policies, and immutable audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Financial Audit Retention (Years)</label>
              <select
                value={auditYears}
                onChange={(e) => setAuditYears(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={7}>7 Years (Standard UK / US Statutory)</option>
                <option value={10}>10 Years (EU / French Commercial Code)</option>
                <option value={5}>5 Years</option>
                <option value={15}>15 Years (Extended Defense Archive)</option>
              </select>
              <p className="text-[10px] text-slate-500">Invoices, payments, credit notes, and ledger journals are preserved immutably.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Auto-Archive Resolved Disputes (Days)</label>
              <select
                value={archiveDisputesDays}
                onChange={(e) => setArchiveDisputesDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={30}>30 Days after Resolution</option>
                <option value={60}>60 Days after Resolution</option>
                <option value={90}>90 Days after Resolution</option>
                <option value={180}>180 Days after Resolution</option>
              </select>
              <p className="text-[10px] text-slate-500">Automatically transitions resolved debtor disputes into cold compliance archive.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Communication Logs Retention (Months)</label>
              <select
                value={purgeMonths}
                onChange={(e) => setPurgeMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
                <option value={36}>36 Months</option>
                <option value={60}>60 Months</option>
              </select>
              <p className="text-[10px] text-slate-500">Retention period for dispatch delivery tokens, SMS logs, and email tracking records.</p>
            </div>
          </div>

          <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Immutable Forensic Audit Ledger Enforcement</span>
            </div>
            <p className="text-xs text-slate-400">
              In accordance with Section 5.3 security invariants, all audit log entries (`auditLogs` collection) are strictly write-once and permanently immutable. Deletion or record manipulation attempts are permanently blocked at the Firestore security rule and SQL trigger level.
            </p>
          </div>
        </div>
      )}

      {/* 8. SUBSCRIPTION & BILLING TAB (PART 24) */}
      {activeSubTab === 'subscription' && (
        <SubscriptionView
          organization={organization}
          onRefreshData={() => onUpdateOrg({})}
          onNavigateTab={onNavigateTab}
        />
      )}

    </div>
  );
};
