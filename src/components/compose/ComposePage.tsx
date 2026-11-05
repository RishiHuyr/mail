import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Trash2, 
  Sparkles, 
  Eye, 
  HelpCircle, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet,
  X,
  Plus
} from 'lucide-react';
import { RichTextEditor, RichTextEditorRef } from './RichTextEditor';
import { CsvUploader } from './CsvUploader';
import { LivePreviewPanel } from './LivePreviewPanel';
import { SendConfirmModal } from './SendConfirmModal';
import { ParsedCsvRecipient, EmailAttachment, GmailStatus, SettingsData } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface ComposePageProps {
  onNavigate: (tab: string, params?: any) => void;
  gmailStatus?: GmailStatus | null;
  settings?: SettingsData | null;
}

export const ComposePage: React.FC<ComposePageProps> = ({
  onNavigate,
  gmailStatus,
  settings,
}) => {
  const [campaignName, setCampaignName] = useState('Personal Outreach #' + Math.floor(Math.random() * 1000));
  const [subject, setSubject] = useState('Invitation for {{Name}}');
  const [bodyHtml, setBodyHtml] = useState(
    '<p>Hi {{Name}},</p><p>I hope you are doing well. I wanted to personally reach out regarding our upcoming collaboration with {{Company}}.</p><p>Would you have 10 minutes next Tuesday for a brief intro?</p>'
  );
  const [recipients, setRecipients] = useState<ParsedCsvRecipient[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>(['Name', 'Email', 'Company', 'Role']);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(settings?.default_delay_seconds || 3);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const editorRef = useRef<RichTextEditorRef>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // If no recipients, populate initial sample recipient so live preview works immediately!
  useEffect(() => {
    if (recipients.length === 0) {
      setRecipients([
        {
          name: 'Sarah Connor',
          email: 'sarah@skynet-defense.com',
          company: 'Cyberdyne Systems',
          role: 'Chief Technology Officer',
          isValid: true,
          isDuplicate: false,
          selected: true,
        },
        {
          name: 'Arthur Dent',
          email: 'arthur.dent@galaxy-guide.org',
          company: 'Hitchhiker Foundation',
          role: 'Communications Lead',
          isValid: true,
          isDuplicate: false,
          selected: true,
        },
      ]);
    }
  }, []);

  const handleInsertVariableSubject = (varName: string) => {
    setSubject(prev => `${prev} {{${varName}}}`);
  };

  const handleInsertVariableBody = (varName: string) => {
    editorRef.current?.insertVariable(varName);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setIsUploadingAttachment(true);
      const att = await api.uploadAttachment(file);
      setAttachments(prev => [...prev, att]);
      showToast(`Attached ${file.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload attachment', 'error');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePreSend = () => {
    if (!campaignName.trim()) {
      showToast('Please enter a campaign name', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Please enter an email subject line', 'error');
      return;
    }
    if (!bodyHtml.trim() || bodyHtml === '<p></p>') {
      showToast('Please enter email body content', 'error');
      return;
    }

    const selectedRecipients = recipients.filter(r => r.selected && r.isValid);
    if (selectedRecipients.length === 0) {
      showToast('Please select at least one valid recipient in the CSV table', 'error');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmLaunch = async () => {
    const selectedRecipients = recipients.filter(r => r.selected && r.isValid);

    try {
      setIsLaunching(true);
      const campaign = await api.createCampaign({
        name: campaignName.trim(),
        subject: subject.trim(),
        body_html: bodyHtml,
        delay_seconds: delaySeconds,
        recipients: selectedRecipients.map(r => ({
          name: r.name,
          email: r.email,
          company: r.company,
          custom_data: r.custom_fields,
        })),
        attachments,
        autoStart: true,
      });

      showToast(`Campaign "${campaign.name}" queued and sending started!`, 'success');
      setIsConfirmModalOpen(false);
      onNavigate('history', { selectedCampaignId: campaign.id });
    } catch (err: any) {
      showToast(err.message || 'Failed to start campaign', 'error');
    } finally {
      setIsLaunching(false);
    }
  };

  const validSelectedCount = recipients.filter(r => r.selected && r.isValid).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compose Personalized Campaign</h2>
          <p className="text-xs text-slate-500 mt-1">
            Build your personalized email outreach with custom variables and live preview
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Preview Toggle */}
          <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Composer
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Live Preview
            </button>
          </div>

          <button
            type="button"
            onClick={handlePreSend}
            disabled={validSelectedCount === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>Review & Send ({validSelectedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Composer (2 cols), Right Live Preview (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & CSV Uploader & Editor */}
        <div className={`lg:col-span-7 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Section 1: Campaign Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">1</span>
              <span>Campaign Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Executive Outreach"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Delay (sec)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delaySeconds}
                  onChange={e => setDelaySeconds(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Recipient CSV Upload & Validation */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">2</span>
              <span>Upload CSV & Select Recipients</span>
            </h3>

            <CsvUploader
              recipients={recipients}
              onRecipientsChange={setRecipients}
              onHeadersDetected={headers => setDetectedHeaders(headers)}
            />
          </div>

          {/* Section 3: Subject & Dynamic Personalization */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">3</span>
                <span>Email Subject & Message</span>
              </h3>
            </div>

            {/* Subject Input with Variable Insertion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Subject Line</label>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Insert:</span>
                  {detectedHeaders.slice(0, 4).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariableSubject(v)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[11px] font-mono transition-colors"
                    >
                      +{`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Quick question for {{Name}}"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-semibold"
              />
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-700">Message Body</label>
              <RichTextEditor
                ref={editorRef}
                value={bodyHtml}
                onChange={setBodyHtml}
                availableVariables={detectedHeaders}
              />
            </div>

            {/* Attachments Dropzone / List */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <span>Attachments</span>
                </span>
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isUploadingAttachment ? 'Uploading...' : 'Add File'}</span>
                </button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center gap-2 group"
                    >
                      <Paperclip className="h-3 w-3 text-indigo-600" />
                      <span className="font-medium truncate max-w-[160px]">{att.originalName}</span>
                      <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-slate-400 hover:text-rose-600 ml-1 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview Sticky Panel (5 cols) */}
        <div className={`lg:col-span-5 sticky top-24 ${activeTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <LivePreviewPanel
            recipients={recipients.filter(r => r.selected && r.isValid)}
            subject={subject}
            bodyHtml={bodyHtml}
            senderName={settings?.sender_name || 'Outreach'}
            senderEmail={gmailStatus?.email || 'me@gmail.com'}
            attachments={attachments}
            settings={settings}
          />
        </div>
      </div>

      {/* Confirmation & Test Email Modal */}
      <SendConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirmSend={handleConfirmLaunch}
        campaignName={campaignName}
        subject={subject}
        bodyHtml={bodyHtml}
        totalRecipients={validSelectedCount}
        delaySeconds={delaySeconds}
        attachments={attachments}
        gmailStatus={gmailStatus}
        settings={settings}
        previewData={recipients[0] ? {
          Name: recipients[0].name,
          Email: recipients[0].email,
          Company: recipients[0].company,
        } : undefined}
        isLaunching={isLaunching}
      />
    </div>
  );
};

