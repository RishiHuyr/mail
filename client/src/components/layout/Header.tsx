import React from 'react';
import { GmailStatus } from '../../types';
import { ShieldCheck, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  gmailStatus?: GmailStatus | null;
  onOpenConnectModal: () => void;
  onNewCampaign: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  gmailStatus,
  onOpenConnectModal,
  onNewCampaign,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Gmail connection status pill */}
        {gmailStatus?.connected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-medium">Sending as:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[200px]">{gmailStatus.email}</span>
            {gmailStatus.isSimulationMode && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">
                DEMO MODE
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenConnectModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 text-xs font-medium transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Connect Gmail Account</span>
          </button>
        )}

        {/* Quick New Campaign CTA if not on compose */}
        {title !== 'Compose Campaign' && (
          <button
            onClick={onNewCampaign}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all shadow-indigo-600/20 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>New Campaign</span>
          </button>
        )}
      </div>
    </header>
  );
};

