import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Copy, X, Check, CheckCircle2, Building, Mail, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Invoice, Debtor, Organization, DunningTone, Language } from '../types';
import { formatCurrency } from '../services/calculations';

interface ReminderModalProps {
  invoice: Invoice;
  debtor?: Debtor;
  organization: Organization;
  onClose: () => void;
  onSendCommunication: (commData: any) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  invoice,
  debtor,
  organization,
  onClose,
  onSendCommunication,
}) => {
  const { t, language: appLanguage } = useTranslation();
  const currency = organization.defaultCurrency;

  const [tone, setTone] = useState<DunningTone>(
    invoice.daysOverdue >= 30 ? 'formal_demand' : invoice.daysOverdue >= 14 ? 'urgent_escalation' : 'firm_overdue'
  );
  const [lang, setLang] = useState<Language>(debtor?.preferredLanguage || appLanguage);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Automatically trigger first generation on mount
  useEffect(() => {
    generateReminderDraft();
  }, [tone, lang]);

  const generateReminderDraft = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtorName: debtor?.name || invoice.debtorName,
          contactName: debtor?.contactName || 'Accounts Payable Team',
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          amountDue: invoice.amountDue,
          daysOverdue: invoice.daysOverdue,
          dueDate: invoice.dueDate,
          tone,
          language: lang,
          orgName: organization.name,
          bankDetails: organization.bankDetails,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubject(data.subject);
        setBody(data.body);
      }
    } catch (err) {
      console.error('Error in AI reminder draft:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    if (!body) return;

    onSendCommunication({
      organizationId: organization.id,
      debtorId: invoice.debtorId,
      debtorName: invoice.debtorName,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      channel: tone === 'urgent_escalation' ? 'sms' : 'email',
      tone,
      language: lang,
      recipient: invoice.debtorEmail || debtor?.email || 'accounts@client.com',
      subject: subject || `Overdue Payment Notice: ${invoice.invoiceNumber}`,
      body,
      isAIGenerated: true,
    });

    setSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                AI Payment Recovery Drafter
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Model: Gemini 3.8 Flash • Invoice: {invoice.invoiceNumber}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Communication dispatched and registered in audit log!</span>
          </div>
        )}

        {/* Invoice facts summary */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-slate-400 block">Debtor</span>
            <span className="font-bold text-white">{invoice.debtorName}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Amount Due</span>
            <span className="font-bold text-rose-400 mono-num">{formatCurrency(invoice.amountDue, invoice.currency)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Maturity Delay</span>
            <span className="font-semibold text-rose-400">{invoice.daysOverdue} days</span>
          </div>
          <div>
            <span className="text-slate-400 block">Accrued Interest</span>
            <span className="font-semibold text-amber-400 mono-num">+{formatCurrency(invoice.accruedLateInterest, invoice.currency)}</span>
          </div>
        </div>

        {/* Tone and Language selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t('aiToneSelect')}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as DunningTone)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="friendly_reminder">{t('toneFriendly')}</option>
              <option value="polite_due">{t('tonePoliteDue')}</option>
              <option value="firm_overdue">{t('toneFirm')}</option>
              <option value="urgent_escalation">{t('toneUrgent')}</option>
              <option value="formal_demand">{t('toneFormalDemand')}</option>
              <option value="legal_preaction">{t('toneLegalPreaction')}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">{t('aiLanguageSelect')}</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="en">English (UK / US)</option>
              <option value="fr">Français (France / UE)</option>
              <option value="es">Español (España / LatAm)</option>
            </select>
          </div>
        </div>

        {/* Subject & Body */}
        <div className="space-y-2">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-400 font-medium">Message Body</label>
              {isGenerating && (
                <span className="text-[11px] text-indigo-400 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>Drafting with Gemini...</span>
                </span>
              )}
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${subject}\n\n${body}`);
              alert('Copied to clipboard!');
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center space-x-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              {t('actionCancel')}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!body || isGenerating}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 flex items-center space-x-1.5 shadow-md shadow-emerald-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via {tone === 'urgent_escalation' ? 'SMS' : 'Email'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
