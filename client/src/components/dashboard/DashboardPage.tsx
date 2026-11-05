import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Clock, 
  AlertOctagon, 
  Sparkles, 
  ExternalLink, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Pause, 
  RefreshCw,
  MailCheck,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { DashboardStats, Campaign } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface DashboardPageProps {
  onNavigate: (tab: string, params?: any) => void;
  onOpenConnectModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenConnectModal }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto refresh every 10s for live campaign updates
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Sending
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            <Pause className="h-3.5 w-3.5 text-amber-600" />
            Paused
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  const statCards = [
    {
      title: 'Total Contacts',
      value: stats?.totalContacts ?? 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      onClick: () => onNavigate('contacts'),
      actionLabel: 'View contacts',
    },
    {
      title: 'Emails Sent',
      value: stats?.emailsSent ?? 0,
      icon: Send,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      onClick: () => onNavigate('history'),
      actionLabel: 'View history',
    },
    {
      title: 'Pending Emails',
      value: stats?.pendingEmails ?? 0,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      onClick: () => onNavigate('history'),
      actionLabel: 'Active queues',
    },
    {
      title: 'Failed Emails',
      value: stats?.failedEmails ?? 0,
      icon: AlertOctagon,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      onClick: () => onNavigate('history'),
      actionLabel: 'Review failures',
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>Smart Gmail Outreach Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Automated, High-Deliverability Outreach
            </h2>
            <p className="text-sm text-indigo-200/90 leading-relaxed">
              Upload your CSV contacts, personalize variables with dynamic syntax like <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs text-white">{'{{Name}}'}</code>, and dispatch personalized emails straight from your official Gmail account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('compose')}
              className="px-6 py-3 rounded-xl bg-white text-indigo-950 font-bold text-sm shadow-md hover:bg-indigo-50 transition-all flex items-center gap-2 transform active:scale-95"
            >
              <Send className="h-4 w-4 text-indigo-600" />
              <span>Compose Campaign</span>
            </button>
            <button
              onClick={() => onNavigate('contacts')}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/10 backdrop-blur-sm transition-all"
            >
              Import Contacts
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color} border ${card.borderColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {isLoading ? '...' : card.value.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  {card.actionLabel}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Connected Account & Sending Health + Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account & Daily Limit (1 col) */}
        <div className="space-y-6">
          {/* Gmail Account Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Connected Gmail</h3>
              <button
                onClick={() => onNavigate('settings')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                Settings
              </button>
            </div>

            {stats?.gmail.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  {stats.gmail.avatar ? (
                    <img src={stats.gmail.avatar} alt="User" className="h-11 w-11 rounded-full border border-slate-200" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {stats.gmail.name ? stats.gmail.name[0].toUpperCase() : 'G'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{stats.gmail.name || 'Personal Account'}</p>
                    <p className="text-xs text-slate-500 truncate font-mono">{stats.gmail.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    OAuth 2.0 Active
                  </span>
                  <span>Direct Gmail API</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <MailCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">No Gmail Connected</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Connect your Gmail account using Google OAuth to begin sending campaigns.
                  </p>
                </div>
                <button
                  onClick={onOpenConnectModal}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Connect Gmail Now
                </button>
              </div>
            )}
          </div>

          {/* Daily Quota / Sending Velocity Meter */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                Daily Gmail Quota
              </span>
              <span className="text-xs text-slate-500">
                {stats?.sentToday ?? 0} / {stats?.dailyLimit ?? 500} sent
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((stats?.sentToday ?? 0) / (stats?.dailyLimit ?? 500)) * 100))}%`,
                }}
              ></div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard Gmail accounts allow sending up to 500 emails/day; Google Workspace allows up to 2,000/day. MailFlow paces delivery to maintain high sender reputation.
            </p>
          </div>
        </div>

        {/* Right Column: Recent Campaigns (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Campaigns</h3>
              <p className="text-xs text-slate-500">Review status and progress of recent outreach batches</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCampaigns.map(camp => {
                const percent = camp.total_recipients > 0 ? Math.round(((camp.sent_count + camp.failed_count) / camp.total_recipients) * 100) : 0;
                return (
                  <div
                    key={camp.id}
                    onClick={() => onNavigate('history', { selectedCampaignId: camp.id })}
                    className="p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {camp.name}
                          </h4>
                          {getStatusBadge(camp.status)}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          Subject: <span className="font-medium text-slate-700">{camp.subject}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-800">
                          {camp.sent_count} / {camp.total_recipients} sent
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(camp.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          camp.status === 'completed'
                            ? 'bg-emerald-500'
                            : camp.status === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Send className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">No campaigns yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Launch your very first personalized outreach campaign with dynamic variable tags.
                </p>
              </div>
              <button
                onClick={() => onNavigate('compose')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create Campaign</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

