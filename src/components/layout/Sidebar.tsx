import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  Users, 
  History, 
  Settings, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { GmailStatus } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  gmailStatus?: GmailStatus | null;
  onOpenConnectModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  gmailStatus,
  onOpenConnectModal,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'compose', label: 'Compose Campaign', icon: Send, highlight: true },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'history', label: 'Campaign History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand Logo Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-lg tracking-tight">MailFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">PRO</span>
            </div>
            <p className="text-xs text-slate-400">Personal Outreach</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.highlight && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
              )}
            </button>
          );
        })}

        {/* Quick action button */}
        <div className="pt-5 px-1">
          <button
            onClick={() => onSelectTab('compose')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium text-sm shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Gmail Account Footer Status Card */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gmail Account</span>
            {gmailStatus?.connected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Offline
              </span>
            )}
          </div>

          {gmailStatus?.connected ? (
            <div className="flex items-center gap-2.5">
              {gmailStatus.avatar ? (
                <img src={gmailStatus.avatar} alt="User" className="h-8 w-8 rounded-full border border-slate-200" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs">
                  {gmailStatus.name ? gmailStatus.name[0].toUpperCase() : 'G'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{gmailStatus.name || 'Gmail Connected'}</p>
                <p className="text-[11px] text-slate-500 truncate">{gmailStatus.email}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 mb-2">Connect your Gmail to send personalized outreach.</p>
              <button
                onClick={onOpenConnectModal}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium border border-indigo-200/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Connect Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

