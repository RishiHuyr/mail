import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Key, 
  ShieldCheck, 
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsSaved: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  onCredentialsSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const redirectUri = `${window.location.protocol}//${window.location.hostname}:5000/api/auth/google/callback`;

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    showToast('Redirect URI copied to clipboard', 'info');
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      showToast('Please enter both Client ID and Client Secret', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await api.saveGoogleCredentials(clientId.trim(), clientSecret.trim(), redirectUri);
      showToast('Credentials saved successfully! You can now connect your Gmail.', 'success');
      onCredentialsSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save credentials', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-premium border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google OAuth & Gmail API Setup</h3>
              <p className="text-xs text-slate-500">Step-by-step instructions to connect your official Gmail API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600">
          {/* Security Guarantee Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="font-semibold text-emerald-950 block mb-0.5">Private & Secure Authentication</strong>
              MailFlow never asks for or stores your Gmail password. It uses Google's standard OAuth 2.0 flow with tokens stored locally in your private database.
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Quick Setup Walkthrough</h4>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex gap-3">
                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">Create a Google Cloud Project</p>
                  <p className="text-xs text-slate-500">
                    Visit the Google Cloud Console and create or select a project.
                  </p>
                  <a
                    href="https://console.cloud.google.com/projectcreate"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline pt-1"
                  >
                    <span>Open Google Cloud Console</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex gap-3">
                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">Enable Gmail API</p>
                  <p className="text-xs text-slate-500">
                    Search for <strong>Gmail API</strong> in the API Library and click <strong>Enable</strong>.
                  </p>
                  <a
                    href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline pt-1"
                  >
                    <span>Enable Gmail API</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex gap-3">
                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                <div className="space-y-2 flex-1">
                  <p className="font-semibold text-slate-800">Configure OAuth Consent Screen & Create Credentials</p>
                  <p className="text-xs text-slate-500">
                    Set User Type to <strong>External</strong>, fill in your email, and add your test user email.
                    Then navigate to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>. Select <strong>Web Application</strong>.
                  </p>
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Authorized redirect URI (paste this exact URI):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={redirectUri}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono flex-1 select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyRedirect}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                      >
                        {copiedRedirect ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex gap-3">
                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">4</span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">Enter Credentials Below</p>
                  <p className="text-xs text-slate-500">
                    Copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong> from Google Cloud and save them here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form to enter Client ID and Client Secret */}
          <form onSubmit={handleSaveCredentials} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Client Secret
              </label>
              <input
                type="password"
                placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

