import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  Clock, 
  Users, 
  ShieldCheck, 
  Paperclip, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { EmailAttachment, GmailStatus, SettingsData } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface SendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: () => void;
  campaignName: string;
  subject: string;
  bodyHtml: string;
  totalRecipients: number;
  delaySeconds: number;
  attachments: EmailAttachment[];
  gmailStatus?: GmailStatus | null;
  settings?: SettingsData | null;
  previewData?: Record<string, any>;
  isLaunching: boolean;
}

export const SendConfirmModal: React.FC<SendConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmSend,
  campaignName,
  subject,
  bodyHtml,
  totalRecipients,
  delaySeconds,
  attachments,
  gmailStatus,
  settings,
  previewData,
  isLaunching,
}) => {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSendTestEmail = async () => {
    try {
      setIsSendingTest(true);
      setTestSentSuccess(false);

      const targetEmail = gmailStatus?.email || undefined;
      const res = await api.sendTestEmail({
        toEmail: targetEmail,
        subject,
        html: bodyHtml,
        attachments,
        previewData,
      });

      setTestSentSuccess(true);
      showToast(res.message || 'Test email sent to your inbox!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const estimatedMinutes = Math.ceil((totalRecipients * delaySeconds) / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm & Launch Campaign</h3>
              <p className="text-xs text-slate-500">Review outreach details before dispatching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-600">
          {/* Summary Box */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Campaign:</span>
              <span className="font-bold text-slate-900 truncate max-w-[260px]">{campaignName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Subject:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[260px]">{subject}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Total Recipients:</span>
              <span className="font-bold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">
                {totalRecipients} Contacts
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Sender:</span>
              <span className="font-mono text-slate-700">{gmailStatus?.email || 'Gmail Connected'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Delay Between Emails:</span>
              <span className="text-slate-700">{delaySeconds}s (est. {estimatedMinutes} min duration)</span>
            </div>
            {attachments.length > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Attachments:</span>
                <span className="text-slate-700">{attachments.length} file(s) attached</span>
              </div>
            )}
          </div>

          {/* Test Email Section */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Send Test Email to Myself</span>
              </div>
              {testSentSuccess && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Delivered
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify how your email formats in a real Gmail inbox before sending to all {totalRecipients} recipients.
            </p>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 text-xs font-semibold shadow-subtle transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSendingTest ? (
                <span>Sending test message...</span>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Send Test Email ({gmailStatus?.email || 'My Inbox'})</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Each recipient receives a completely separate individual email. No other recipient emails are ever exposed.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmSend}
            disabled={isLaunching}
            className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isLaunching ? 'Launching Campaign...' : 'Send Campaign Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

