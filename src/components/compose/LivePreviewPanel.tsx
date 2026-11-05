import React, { useState } from 'react';
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  Paperclip, 
  User, 
  Building2, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ParsedCsvRecipient, EmailAttachment, SettingsData } from '../../types';

interface LivePreviewPanelProps {
  recipients: ParsedCsvRecipient[];
  subject: string;
  bodyHtml: string;
  senderName?: string;
  senderEmail?: string;
  attachments?: EmailAttachment[];
  settings?: SettingsData | null;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  recipients,
  subject,
  bodyHtml,
  senderName = 'Outreach',
  senderEmail = 'me@gmail.com',
  attachments = [],
  settings,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedRecipient: ParsedCsvRecipient | undefined = recipients[selectedIndex] || {
    name: 'Sample Contact',
    email: 'contact@example.com',
    company: 'Acme Corporation',
    role: 'Product Lead',
    isValid: true,
    isDuplicate: false,
  };

  // Dynamic Variable Replacer
  const renderTemplate = (text: string, recipient: ParsedCsvRecipient): string => {
    if (!text) return '';
    const data: Record<string, any> = {
      Name: recipient.name || '',
      Email: recipient.email || '',
      Company: recipient.company || '',
      Role: recipient.role || '',
      ...(recipient.custom_fields || {}),
    };

    return text.replace(/\{\{\s*([a-zA-Z0-9_\s]+)\s*\}\}/g, (match, key) => {
      const trimmed = key.trim();
      if (data[trimmed] !== undefined && data[trimmed] !== null) {
        return String(data[trimmed]);
      }
      const lower = trimmed.toLowerCase();
      for (const [k, v] of Object.entries(data)) {
        if (k.toLowerCase() === lower && v !== undefined && v !== null) {
          return String(v);
        }
      }
      return match;
    });
  };

  const renderedSubject = renderTemplate(subject || 'Your Subject Line', selectedRecipient);
  let renderedBody = renderTemplate(bodyHtml || '<p style="color:#94a3b8;">Write your email content in the editor to see preview...</p>', selectedRecipient);

  // Append signature preview if enabled
  if (settings?.append_signature && settings.email_signature) {
    renderedBody += settings.email_signature;
  }

  // Append unsubscribe preview if enabled
  if (settings?.append_unsubscribe) {
    renderedBody += `
      <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        If you prefer not to receive future emails from us, please reply with "Unsubscribe" and you will be removed immediately.
      </div>
    `;
  }

  const prevRecipient = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : recipients.length - 1));
  };

  const nextRecipient = () => {
    setSelectedIndex(prev => (prev < recipients.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col h-full overflow-hidden">
      {/* Header with Recipient Selector */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Personalization Preview</h3>
        </div>

        {recipients.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              {selectedIndex + 1} of {recipients.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevRecipient}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                title="Previous recipient"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextRecipient}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                title="Next recipient"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recipient Details Pill */}
      <div className="px-5 py-3 border-b border-slate-100 bg-indigo-50/40 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-600" />
            {selectedRecipient.name}
          </span>
          <span className="font-mono text-slate-500">
            {selectedRecipient.email}
          </span>
          {selectedRecipient.company && (
            <span className="text-slate-500 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {selectedRecipient.company}
            </span>
          )}
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Personalized
        </span>
      </div>

      {/* Email Client Simulated View */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-white">
        {/* Subject Header */}
        <div className="space-y-1 pb-3 border-b border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subject</span>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {renderedSubject}
          </h2>
        </div>

        {/* Sender & Recipient Bar */}
        <div className="flex items-center justify-between text-xs text-slate-600 pb-2">
          <div className="space-y-0.5">
            <div>
              <span className="text-slate-400 font-medium">From: </span>
              <span className="font-semibold text-slate-800">{senderName}</span>
              <span className="text-slate-400 ml-1 font-mono">&lt;{senderEmail}&gt;</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">To: </span>
              <span className="font-semibold text-slate-800">{selectedRecipient.name}</span>
              <span className="text-slate-400 ml-1 font-mono">&lt;{selectedRecipient.email}&gt;</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">Preview Mode</span>
        </div>

        {/* Rendered HTML Body */}
        <div
          className="text-sm text-slate-800 leading-relaxed pt-2 min-h-[160px]"
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />

        {/* Attachments Section if any */}
        {attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              Attachments ({attachments.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center gap-2"
                >
                  <Paperclip className="h-3 w-3 text-indigo-500" />
                  <span className="font-medium truncate max-w-[150px]">{att.originalName}</span>
                  <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

