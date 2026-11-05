import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  ShieldCheck, 
  Key, 
  Sliders, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Save, 
  Zap, 
  Power,
  RotateCcw
} from 'lucide-react';
import { SettingsData, GmailStatus } from '../../types';
import { api } from '../../services/api';
import { SetupGuideModal } from './SetupGuideModal';
import { useToast } from '../ui/Toast';

interface SettingsPageProps {
  onRefreshGlobalStatus?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onRefreshGlobalStatus,
}) => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [senderName, setSenderName] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [signature, setSignature] = useState('');
  const [appendSignature, setAppendSignature] = useState(true);
  const [appendUnsubscribe, setAppendUnsubscribe] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { showToast } = useToast();

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setSenderName(data.sender_name);
      setDelaySeconds(data.default_delay_seconds);
      setSignature(data.email_signature);
      setAppendSignature(data.append_signature);
      setAppendUnsubscribe(data.append_unsubscribe);
      setDailyLimit(data.daily_sending_limit);
    } catch (err: any) {
      showToast(err.message || 'Failed to load settings', 'error');
    }
  };

  useEffect(() => {
    loadSettings();

    // Check URL search params for OAuth callback return
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      showToast('Gmail account connected successfully!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      loadSettings();
      onRefreshGlobalStatus?.();
    } else if (params.get('auth_error')) {
      showToast(`Google OAuth error: ${params.get('auth_error')}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectGmail = async () => {
    try {
      const { url, error } = await api.getGoogleAuthUrl();
      if (error || !url) {
        showToast(error || 'Google credentials missing. Please view Setup Guide.', 'info');
        setIsGuideOpen(true);
        return;
      }
      // Redirect to Google OAuth consent screen
      window.location.href = url;
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate Google authentication', 'error');
      setIsGuideOpen(true);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account?')) return;
    try {
      await api.disconnectGmail();
      showToast('Gmail account disconnected', 'info');
      loadSettings();
      onRefreshGlobalStatus?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect Gmail', 'error');
    }
  };

  const handleToggleSimulation = async () => {
    try {
      const res = await api.toggleSimulationMode();
      showToast(
        res.simulationMode ? 'Sandbox Demo Mode enabled for testing' : 'Sandbox Demo Mode disabled',
        'info'
      );
      loadSettings();
      onRefreshGlobalStatus?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle simulation mode', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateSettings({
        sender_name: senderName.trim(),
        default_delay_seconds: delaySeconds,
        email_signature: signature,
        append_signature: appendSignature,
        append_unsubscribe: appendUnsubscribe,
        daily_sending_limit: dailyLimit,
      });
      showToast('Settings saved successfully', 'success');
      loadSettings();
      onRefreshGlobalStatus?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const gmail = settings?.gmail_status;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure Google OAuth, sender identity, delivery cadence, and email signatures
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Gmail OAuth Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>Google OAuth 2.0 & Gmail Integration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Gmail API sending with secure backend token storage
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Setup Guide & API Keys</span>
            </button>
          </div>

          {/* Account status card */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {gmail?.connected ? (
                gmail.avatar ? (
                  <img src={gmail.avatar} alt="User" className="h-12 w-12 rounded-full border border-slate-200" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {gmail.name ? gmail.name[0].toUpperCase() : 'G'}
                  </div>
                )
              ) : (
                <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm">
                  <Mail className="h-5 w-5" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {gmail?.connected ? (gmail.name || 'Connected Gmail Account') : 'No Gmail Connected'}
                  </span>
                  {gmail?.connected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      OAuth Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Disconnected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {gmail?.connected ? gmail.email : 'Click "Connect Gmail" to authorize via Google OAuth'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {gmail?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold shadow-subtle transition-colors"
                >
                  Disconnect Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Connect Gmail with Google
                </button>
              )}
            </div>
          </div>

          {/* Sandbox Simulation Mode Toggle for instant testing */}
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                <span>Instant Developer Sandbox Mode</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Simulate realistic individual email dispatches and live queue processing without needing Google Cloud credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleSimulation}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                settings?.simulation_mode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {settings?.simulation_mode ? 'Sandbox Enabled' : 'Enable Sandbox'}
            </button>
          </div>
        </div>

        {/* Sender Identity & Sending Delay */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <span>Sender Identity & Cadence</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Default Sender Display Name</label>
              <input
                type="text"
                placeholder="e.g. Rishi"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Shows in the recipient's inbox as the sender name (e.g. "Rishi &lt;user@gmail.com&gt;").
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-700">Delay Between Emails</label>
                <span className="font-mono font-bold text-indigo-600">{delaySeconds} seconds</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={delaySeconds}
                onChange={e => setDelaySeconds(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400">
                Paces delivery to avoid spam triggers and respect Gmail rate limits.
              </p>
            </div>
          </div>
        </div>

        {/* Email Signature Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Email Signature
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically appended to the bottom of all outreach messages
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={appendSignature}
                onChange={e => setAppendSignature(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Append Signature</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Signature HTML / Content</label>
              <textarea
                rows={5}
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="<p>Best regards,<br><strong>Your Name</strong></p>"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Signature Live Preview</label>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 min-h-[110px] overflow-y-auto">
                {appendSignature && signature ? (
                  <div dangerouslySetInnerHTML={{ __html: signature }} />
                ) : (
                  <span className="text-slate-400 italic">Signature disabled or empty</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compliance & Privacy */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Unsubscribe Opt-Out Footer
              </h4>
              <p className="text-xs text-slate-500">
                Appends a polite note giving recipients an effortless way to opt-out
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appendUnsubscribe}
                onChange={e => setAppendUnsubscribe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* Google Setup Guide Modal */}
      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onCredentialsSaved={() => {
          loadSettings();
          onRefreshGlobalStatus?.();
        }}
      />
    </div>
  );
};

