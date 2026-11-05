import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ComposePage } from './components/compose/ComposePage';
import { CampaignHistoryPage } from './components/campaigns/CampaignHistoryPage';
import { ContactsPage } from './components/contacts/ContactsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { SetupGuideModal } from './components/settings/SetupGuideModal';
import { ToastProvider } from './components/ui/Toast';
import { GmailStatus, SettingsData, Contact } from './types';
import { api } from './services/api';

export const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'compose' | 'contacts' | 'history' | 'settings'>('dashboard');
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [historySelectedCampaignId, setHistorySelectedCampaignId] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const auth = await api.getAuthStatus();
      setGmailStatus(auth);
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleNavigate = (tab: string, params?: any) => {
    if (tab === 'history' && params?.selectedCampaignId) {
      setHistorySelectedCampaignId(params.selectedCampaignId);
    } else {
      setHistorySelectedCampaignId(null);
    }
    setCurrentTab(tab as any);
  };

  const getPageInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Real-time overview of your Gmail outreach operations' };
      case 'compose':
        return { title: 'Compose Campaign', subtitle: 'Upload CSV, draft personalized messages, and launch delivery' };
      case 'contacts':
        return { title: 'Contacts', subtitle: 'Manage your personal outreach recipient network' };
      case 'history':
        return { title: 'Campaign History', subtitle: 'Track deliveries, pause/resume queues, and view recipient logs' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Manage Google OAuth, sender profile, and sending cadence' };
      default:
        return { title: 'Dashboard' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex h-screen bg-slate-50/60 overflow-hidden text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => handleNavigate(tab)}
        gmailStatus={gmailStatus}
        onOpenConnectModal={() => setIsSetupGuideOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          gmailStatus={gmailStatus}
          onOpenConnectModal={() => setIsSetupGuideOpen(true)}
          onNewCampaign={() => handleNavigate('compose')}
        />

        {/* Page View Viewport */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onOpenConnectModal={() => setIsSetupGuideOpen(true)}
            />
          )}

          {currentTab === 'compose' && (
            <ComposePage
              onNavigate={handleNavigate}
              gmailStatus={gmailStatus}
              settings={settings}
            />
          )}

          {currentTab === 'contacts' && (
            <ContactsPage
              onNavigateToComposeWithContacts={(selectedContacts) => {
                handleNavigate('compose');
              }}
            />
          )}

          {currentTab === 'history' && (
            <CampaignHistoryPage
              initialCampaignId={historySelectedCampaignId}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              onRefreshGlobalStatus={refreshStatus}
            />
          )}
        </main>
      </div>

      {/* Google Setup Guide & API credentials Modal */}
      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
        onCredentialsSaved={refreshStatus}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

