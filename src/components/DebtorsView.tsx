import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ExternalLink, 
  ShieldAlert, 
  Building, 
  User,
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ChevronRight,
  TrendingDown,
  Calendar,
  X,
  Check,
  Filter,
  Sparkles,
  ArrowUpRight,
  FileText,
  Upload
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Debtor, Organization, Invoice, PromiseToPay, Dispute, CustomerType, CustomerAccountStatus, RiskTier } from '../types';
import { formatCurrency } from '../services/calculations';
import { CustomerProfileModal } from './CustomerProfileModal';
import { CsvSpreadsheetImportModal } from './CsvSpreadsheetImportModal';

interface DebtorsViewProps {
  organization: Organization;
  debtors: Debtor[];
  invoices: Invoice[];
  promises: PromiseToPay[];
  disputes: Dispute[];
  onOpenDebtorPortal: (debtor: Debtor) => void;
  onCreateDebtor: (debtorData: Partial<Debtor>) => void;
  onOpenPromiseModalForDebtor: (debtor: Debtor) => void;
  onCustomerUpdated?: (updatedDebtor: Debtor) => void;
}

export const DebtorsView: React.FC<DebtorsViewProps> = ({
  organization,
  debtors,
  invoices,
  promises,
  disputes,
  onOpenDebtorPortal,
  onCreateDebtor,
  onOpenPromiseModalForDebtor,
  onCustomerUpdated,
}) => {
  const { t } = useTranslation();
  const currency = organization.defaultCurrency;

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CustomerType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerAccountStatus>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskTier>('all');
  
  const [selectedDebtorForProfile, setSelectedDebtorForProfile] = useState<Debtor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form states for Section 7.1 Customer Records Creation
  const [newCustomerType, setNewCustomerType] = useState<CustomerType>('business');
  const [newName, setNewName] = useState('');
  const [newCompanyNumber, setNewCompanyNumber] = useState('');
  const [newVatNumber, setNewVatNumber] = useState('');
  const [newCustomerRef, setNewCustomerRef] = useState('');
  
  // Billing Address
  const [newBillingStreet, setNewBillingStreet] = useState('');
  const [newBillingCity, setNewBillingCity] = useState('');
  const [newBillingState, setNewBillingState] = useState('');
  const [newBillingPostal, setNewBillingPostal] = useState('');
  const [newCountry, setNewCountry] = useState(organization.country || 'United Kingdom');
  const [sameDeliveryAddress, setSameDeliveryAddress] = useState(true);
  const [newDeliveryStreet, setNewDeliveryStreet] = useState('');
  const [newDeliveryCity, setNewDeliveryCity] = useState('');
  const [newDeliveryPostal, setNewDeliveryPostal] = useState('');

  // Primary Contact
  const [newPrimaryName, setNewPrimaryName] = useState('');
  const [newPrimaryEmail, setNewPrimaryEmail] = useState('');
  const [newPrimaryPhone, setNewPrimaryPhone] = useState('');
  const [newPrimaryRole, setNewPrimaryRole] = useState('Purchasing Director');

  // Accounts Payable Contact
  const [newApName, setNewApName] = useState('');
  const [newApEmail, setNewApEmail] = useState('');
  const [newApPhone, setNewApPhone] = useState('');

  // Terms & Financials
  const [newPreferredLang, setNewPreferredLang] = useState<'en' | 'fr' | 'es'>(organization.defaultLanguage || 'en');
  const [newDefaultCurrency, setNewDefaultCurrency] = useState(organization.defaultCurrency || 'GBP');
  const [newPaymentTermsDays, setNewPaymentTermsDays] = useState(30);
  const [newCreditLimit, setNewCreditLimit] = useState(50000);
  const [newCreditRating, setNewCreditRating] = useState(75);
  const [newRiskTier, setNewRiskTier] = useState<RiskTier>('moderate');
  const [newStatus, setNewStatus] = useState<CustomerAccountStatus>('active');
  const [newAssignedController, setNewAssignedController] = useState('Sarah Miller');
  
  // Communication preferences & consent
  const [newCommEmail, setNewCommEmail] = useState(true);
  const [newCommSms, setNewCommSms] = useState(false);
  const [newCommWhatsapp, setNewCommWhatsapp] = useState(true);
  const [newCommPostal, setNewCommPostal] = useState(false);
  const [newConsentReminder, setNewConsentReminder] = useState(true);
  const [newConsentChannel, setNewConsentChannel] = useState<'digital_portal' | 'written_mandate' | 'contract_clause' | 'email_optin'>('contract_clause');
  const [newInternalNote, setNewInternalNote] = useState('');

  // Filtering
  const filteredDebtors = debtors.filter((deb) => {
    const matchesSearch = 
      deb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deb.contactName && deb.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deb.email && deb.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deb.customerReference && deb.customerReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deb.vatNumber && deb.vatNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || deb.customerType === categoryFilter;
    const matchesStatus = statusFilter === 'all' || deb.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || deb.riskTier === riskFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesRisk;
  });

  // Calculate summary metrics
  const totalReceivables = debtors.reduce((sum, d) => sum + (d.totalOutstanding || 0), 0);
  const totalOverdue = debtors.reduce((sum, d) => sum + (d.totalOverdue || 0), 0);
  const highRiskCount = debtors.filter(d => d.riskTier === 'high' || d.riskTier === 'critical').length;
  const avgDso = debtors.length > 0 ? Math.round(debtors.reduce((sum, d) => sum + (d.dso || 0), 0) / debtors.length) : 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const commPrefs: ('email' | 'sms' | 'whatsapp' | 'postal')[] = [];
    if (newCommEmail) commPrefs.push('email');
    if (newCommSms) commPrefs.push('sms');
    if (newCommWhatsapp) commPrefs.push('whatsapp');
    if (newCommPostal) commPrefs.push('postal');

    const billingAddress = {
      street: newBillingStreet || '100 Commercial Way',
      city: newBillingCity || 'London',
      stateProvince: newBillingState || '',
      postalCode: newBillingPostal || 'EC1A 1BB',
      country: newCountry,
    };

    const deliveryAddress = sameDeliveryAddress ? billingAddress : {
      street: newDeliveryStreet || newBillingStreet,
      city: newDeliveryCity || newBillingCity,
      stateProvince: newBillingState || '',
      postalCode: newDeliveryPostal || newBillingPostal,
      country: newCountry,
    };

    const primaryContact = {
      name: newPrimaryName,
      email: newPrimaryEmail,
      phone: newPrimaryPhone,
      roleTitle: newPrimaryRole,
    };

    const accountsPayableContact = {
      name: newApName || newPrimaryName,
      email: newApEmail || newPrimaryEmail,
      phone: newApPhone || newPrimaryPhone,
    };

    onCreateDebtor({
      name: newName,
      customerType: newCustomerType,
      companyNumber: newCompanyNumber,
      vatNumber: newVatNumber,
      taxId: newVatNumber,
      customerReference: newCustomerRef || `CUST-${Date.now().toString().slice(-5)}`,
      billingAddress,
      deliveryAddress,
      country: newCountry,
      primaryContact,
      accountsPayableContact,
      contactName: newPrimaryName,
      email: newPrimaryEmail,
      phone: newPrimaryPhone,
      address: `${billingAddress.street}, ${billingAddress.city} ${billingAddress.postalCode}, ${billingAddress.country}`,
      preferredLanguage: newPreferredLang,
      defaultCurrency: newDefaultCurrency,
      paymentTermsDays: Number(newPaymentTermsDays),
      creditLimit: Number(newCreditLimit),
      creditRating: Number(newCreditRating),
      riskTier: newRiskTier,
      status: newStatus,
      assignedCreditControllerName: newAssignedController,
      communicationPreferences: commPrefs,
      consent: {
        reminderConsent: newConsentReminder,
        consentTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        consentChannel: newConsentChannel,
      },
      internalNotes: newInternalNote,
    });

    setShowCreateModal(false);

    // Reset Form
    setNewName('');
    setNewCompanyNumber('');
    setNewVatNumber('');
    setNewCustomerRef('');
    setNewBillingStreet('');
    setNewBillingCity('');
    setNewBillingPostal('');
    setNewPrimaryName('');
    setNewPrimaryEmail('');
    setNewPrimaryPhone('');
    setNewApName('');
    setNewApEmail('');
    setNewApPhone('');
    setNewInternalNote('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{t('customerTitle') || 'Customer & Debtor Management'}</span>
            <span className="text-xs bg-slate-800 text-indigo-300 px-2.5 py-0.5 rounded-full font-medium border border-indigo-500/20">
              {debtors.length} corporate & individual accounts
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Part 7 comprehensive debtor directory, 14-point customer profile, explainable behaviour patterns, and consent audit.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition flex items-center space-x-1.5"
            title="Import Customers from CSV or Excel Spreadsheet (Section 9.1)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Customers (9.1)</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Customer Record (7.1)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 block">Total Active Customers</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">{debtors.length}</span>
            <span className="text-xs text-slate-500">accounts</span>
          </div>
          <span className="text-[11px] text-slate-500 block">B2B, B2C, Enterprise & Public</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 block">Gross Ledger Exposure</span>
          <span className="text-2xl font-bold text-indigo-300 mono-num block">
            {formatCurrency(totalReceivables, currency)}
          </span>
          <span className="text-[11px] text-slate-500 block">Total outstanding receivables</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 block">Delinquent Overdue</span>
          <span className="text-2xl font-bold text-rose-400 mono-num block">
            {formatCurrency(totalOverdue, currency)}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {((totalOverdue / (totalReceivables || 1)) * 100).toFixed(1)}% of total portfolio
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 block">Average DSO / High Risk</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{avgDso} <span className="text-xs text-slate-500">days</span></span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
              {highRiskCount} High Risk
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">Portfolio health indicators</span>
        </div>
      </div>

      {/* Advanced Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, contact, VAT, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2 text-xs">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="business">Business (B2B)</option>
              <option value="individual">Individual (B2C)</option>
              <option value="enterprise">Enterprise</option>
              <option value="government_nonprofit">Government & Public</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="under_review">Under Review</option>
              <option value="disputed">Disputed</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
            >
              <option value="all">All Risk Tiers</option>
              <option value="low">Low Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Debtors & Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer & Category</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Credit Rating</th>
                <th className="px-4 py-3">Risk Tier</th>
                <th className="px-4 py-3">Credit Limit & Exposure</th>
                <th className="px-4 py-3 text-center">DSO</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Overdue</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDebtors.map((deb) => {
                const utilizationPct = Math.min(100, Math.round(((deb.totalOutstanding || 0) / (deb.creditLimit || 1)) * 100));

                let ratingBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if ((deb.creditRating || 75) < 40) ratingBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if ((deb.creditRating || 75) < 60) ratingBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                else if ((deb.creditRating || 75) < 80) ratingBadgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                return (
                  <tr key={deb.id} className="hover:bg-slate-850/50 transition">
                    
                    {/* Customer Name, Type & Reference */}
                    <td className="px-4 py-3">
                      <div
                        onClick={() => setSelectedDebtorForProfile(deb)}
                        className="font-bold text-white hover:text-indigo-400 cursor-pointer flex items-center space-x-1.5"
                      >
                        {deb.customerType === 'individual' ? (
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <Building className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>{deb.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2 flex-wrap">
                        <span>{deb.customerReference || deb.id}</span>
                        <span>•</span>
                        <span>{deb.contactName || deb.primaryContact?.name}</span>
                        <span>•</span>
                        <span className="text-slate-500">{deb.email}</span>
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        deb.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : deb.status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : deb.status === 'under_review'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {deb.status || 'Active'}
                      </span>
                    </td>

                    {/* Credit Rating (0-100) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${ratingBadgeColor}`}>
                        {deb.creditRating || 75} / 100
                      </span>
                    </td>

                    {/* Risk Tier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {deb.riskTier === 'low' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {t('riskLow')}
                        </span>
                      )}
                      {deb.riskTier === 'moderate' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {t('riskModerate')}
                        </span>
                      )}
                      {deb.riskTier === 'high' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {t('riskHigh')}
                        </span>
                      )}
                      {deb.riskTier === 'critical' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          {t('riskCritical')}
                        </span>
                      )}
                    </td>

                    {/* Credit Limit Utilization */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span className="mono-num">{formatCurrency(deb.totalOutstanding, currency)}</span>
                        <span className="text-slate-500 mono-num">Limit: {formatCurrency(deb.creditLimit || 50000, currency)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${utilizationPct}%` }}
                          className={`h-full rounded-full transition-all ${
                            utilizationPct > 85 ? 'bg-rose-500' : utilizationPct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </td>

                    {/* DSO */}
                    <td className="px-4 py-3 text-center whitespace-nowrap font-mono">
                      <span className="font-semibold text-white">{deb.dso || 30}</span>
                      <span className="text-[10px] text-slate-500 ml-1">days</span>
                    </td>

                    {/* Total Outstanding */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-white mono-num">
                      {formatCurrency(deb.totalOutstanding || 0, currency)}
                    </td>

                    {/* Total Overdue */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-rose-400 mono-num">
                      {deb.totalOverdue > 0 ? formatCurrency(deb.totalOverdue, currency) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setSelectedDebtorForProfile(deb)}
                        title="View Complete 14-Point Customer Profile (Section 7.2)"
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-xs font-semibold inline-flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Profile (7.2)</span>
                      </button>

                      <button
                        onClick={() => onOpenDebtorPortal(deb)}
                        title="Open Self-Service Portal"
                        className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-medium inline-flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">Portal</span>
                      </button>

                      <button
                        onClick={() => onOpenPromiseModalForDebtor(deb)}
                        title="Record Promise to Pay"
                        className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-medium inline-flex items-center space-x-1"
                      >
                        <Calendar className="w-3 h-3" />
                        <span className="hidden sm:inline">PTP</span>
                      </button>
                    </td>

                  </tr>
                );
              })}

              {filteredDebtors.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No customer or debtor records found matching the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Customer Profile Modal (Section 7.2 & 7.3) */}
      {selectedDebtorForProfile && (
        <CustomerProfileModal
          debtor={selectedDebtorForProfile}
          organization={organization}
          onClose={() => setSelectedDebtorForProfile(null)}
          onOpenDebtorPortal={onOpenDebtorPortal}
          onOpenPromiseModal={onOpenPromiseModalForDebtor}
          onCustomerUpdated={(updated) => {
            setSelectedDebtorForProfile(updated);
            if (onCustomerUpdated) onCustomerUpdated(updated);
          }}
        />
      )}

      {/* Full Customer Record Creation Modal (Section 7.1) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Create Complete Customer Record (Section 7.1)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Commercial B2B, individual consumers, enterprises, and public entities.
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              
              {/* Category & Legal Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Category *</label>
                  <select
                    value={newCustomerType}
                    onChange={(e) => setNewCustomerType(e.target.value as CustomerType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="business">Commercial Business (B2B)</option>
                    <option value="individual">Individual Consumer (B2C)</option>
                    <option value="enterprise">Key Enterprise Account</option>
                    <option value="government_nonprofit">Government & Public Sector</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Customer / Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Logistics PLC"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Registration & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Registration # (Where applicable)</label>
                  <input
                    type="text"
                    placeholder="e.g. UK-08912345"
                    value={newCompanyNumber}
                    onChange={(e) => setNewCompanyNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tax ID / VAT Details</label>
                  <input
                    type="text"
                    placeholder="e.g. GB987654321"
                    value={newVatNumber}
                    onChange={(e) => setNewVatNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Reference / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CUST-APEX-001"
                    value={newCustomerRef}
                    onChange={(e) => setNewCustomerRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Billing Address (Section 7.1)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 100 Commercial Way"
                      value={newBillingStreet}
                      onChange={(e) => setNewBillingStreet(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="London"
                        value={newBillingCity}
                        onChange={(e) => setNewBillingCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Postal Code</label>
                      <input
                        type="text"
                        placeholder="EC1A 1BB"
                        value={newBillingPostal}
                        onChange={(e) => setNewBillingPostal(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Country</label>
                    <input
                      type="text"
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameDeliveryAddress}
                        onChange={(e) => setSameDeliveryAddress(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                      />
                      <span>Delivery / Service address matches billing</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Primary & Accounts Payable Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Primary Contact
                  </span>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Adams"
                      value={newPrimaryName}
                      onChange={(e) => setNewPrimaryName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="rachel.adams@company.com"
                      value={newPrimaryEmail}
                      onChange={(e) => setNewPrimaryEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Telephone Number</label>
                    <input
                      type="tel"
                      placeholder="+44 20 7946 0000"
                      value={newPrimaryPhone}
                      onChange={(e) => setNewPrimaryPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Accounts Payable (AP) Contact
                  </span>
                  <div>
                    <label className="block text-slate-400 mb-0.5">AP Contact Name</label>
                    <input
                      type="text"
                      placeholder="Accounts Payable Dept"
                      value={newApName}
                      onChange={(e) => setNewApName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">AP Email</label>
                    <input
                      type="email"
                      placeholder="ap@company.com"
                      value={newApEmail}
                      onChange={(e) => setNewApEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">AP Direct Phone</label>
                    <input
                      type="tel"
                      placeholder="+44 20 7946 0001"
                      value={newApPhone}
                      onChange={(e) => setNewApPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Governance & Terms */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Limit ({currency})</label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={newPaymentTermsDays}
                    onChange={(e) => setNewPaymentTermsDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Controller</label>
                  <input
                    type="text"
                    value={newAssignedController}
                    onChange={(e) => setNewAssignedController(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as CustomerAccountStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="active">Active</option>
                    <option value="under_review">Under Review</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Communication Preferences & Statutory Consent */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Communication Preferences & Statutory Reminder Consent (Section 7.1)
                </span>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCommEmail}
                      onChange={(e) => setNewCommEmail(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    <span>Email Notices</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCommWhatsapp}
                      onChange={(e) => setNewCommWhatsapp(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    <span>WhatsApp Updates</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCommSms}
                      onChange={(e) => setNewCommSms(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    <span>SMS Alerts</span>
                  </label>

                  <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCommPostal}
                      onChange={(e) => setNewCommPostal(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    <span>Postal Demand</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="flex items-center space-x-2 text-emerald-400 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={newConsentReminder}
                      onChange={(e) => setNewConsentReminder(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-600"
                    />
                    <span>Statutory Reminder Consent Verified</span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Consent Channel:</span>
                    <select
                      value={newConsentChannel}
                      onChange={(e) => setNewConsentChannel(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300"
                    >
                      <option value="contract_clause">Commercial Contract Clause</option>
                      <option value="digital_portal">Digital Portal Opt-In</option>
                      <option value="written_mandate">Written Mandate / Onboarding Form</option>
                      <option value="email_optin">Email Express Authorization</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Initial Internal Note */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved trade credit facility following Companies House and trade reference validation."
                  value={newInternalNote}
                  onChange={(e) => setNewInternalNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center space-x-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Complete Customer Record</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Section 9 Guided Customer Spreadsheet Import */}
      {showImportModal && (
        <CsvSpreadsheetImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          organization={organization}
          initialEntityType="customers"
          onImportComplete={() => {
            if (onCustomerUpdated && debtors.length > 0) {
              onCustomerUpdated(debtors[0]);
            }
          }}
        />
      )}

    </div>
  );
};
