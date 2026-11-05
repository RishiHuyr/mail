import React, { useState, useEffect } from 'react';
import { 
  History, 
  Send, 
  Play, 
  Pause, 
  XOctagon, 
  RotateCcw, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  RefreshCw, 
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Campaign, CampaignRecipient } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface CampaignHistoryPageProps {
  initialCampaignId?: string | null;
}

export const CampaignHistoryPage: React.FC<CampaignHistoryPageProps> = ({
  initialCampaignId,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns(100, 0);
      setCampaigns(data.campaigns);

      // If initialCampaignId is set, open it
      if (initialCampaignId && !selectedCampaign) {
        const target = data.campaigns.find(c => c.id === initialCampaignId);
        if (target) {
          openDetail(target);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load campaign history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();

    // Setup Server-Sent Events stream for live progress updates
    const eventSource = new EventSource('/api/campaigns/events/stream');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'progress' && payload.data) {
          const { campaignId, status, sentCount, failedCount, totalRecipients } = payload.data;
          
          setCampaigns(prev => prev.map(c => {
            if (c.id === campaignId) {
              return {
                ...c,
                status,
                sent_count: sentCount,
                failed_count: failedCount,
                total_recipients: totalRecipients,
              };
            }
            return c;
          }));

          // If currently viewing this campaign in modal, refresh its recipient logs too
          setSelectedCampaign(prev => {
            if (prev && prev.id === campaignId) {
              return {
                ...prev,
                status,
                sent_count: sentCount,
                failed_count: failedCount,
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // ignore parse error
      }
    };

    // Fallback periodic poll every 6s
    const pollInterval = setInterval(() => {
      api.getCampaigns(100, 0).then(data => setCampaigns(data.campaigns)).catch(() => {});
    }, 6000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [initialCampaignId]);

  const openDetail = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    try {
      setIsLoadingRecipients(true);
      const data = await api.getCampaign(campaign.id);
      setSelectedCampaign(data.campaign);
      setRecipients(data.recipients);
    } catch (err: any) {
      showToast(err.message || 'Failed to load recipient logs', 'error');
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handlePause = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.pauseCampaign(id);
      showToast('Campaign paused', 'info');
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message || 'Failed to pause campaign', 'error');
    }
  };

  const handleResume = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.resumeCampaign(id);
      showToast('Campaign resumed', 'success');
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message || 'Failed to resume campaign', 'error');
    }
  };

  const handleCancel = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to stop this campaign? Pending emails will not be sent.')) return;
    try {
      await api.cancelCampaign(id);
      showToast('Campaign cancelled', 'info');
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel campaign', 'error');
    }
  };

  const handleRetryFailed = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.retryFailedCampaign(id);
      showToast('Retrying failed emails', 'success');
      loadCampaigns();
      if (selectedCampaign?.id === id) {
        openDetail(selectedCampaign);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to retry campaign', 'error');
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Permanently delete this campaign and its recipient logs?')) return;
    try {
      await api.deleteCampaign(id);
      showToast('Campaign deleted', 'success');
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete campaign', 'error');
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Sending
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Pause className="h-3.5 w-3.5 text-amber-600" />
            Paused
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
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

  const filteredCampaigns = campaigns.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
  });

  const filteredRecipients = recipients.filter(r => {
    if (recipientFilter !== 'all' && r.status !== recipientFilter) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track past and running campaigns, inspect recipient delivery logs, and export performance reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
          </div>

          <button
            onClick={loadCampaigns}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-subtle transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        {filteredCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Campaign Name & Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Recipients</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map(camp => {
                  const percent = camp.total_recipients > 0 ? Math.round(((camp.sent_count + camp.failed_count) / camp.total_recipients) * 100) : 0;
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => openDetail(camp)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {camp.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {camp.subject}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(camp.status)}
                      </td>

                      <td className="py-3.5 px-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">{percent}%</span>
                            <span className="text-slate-400">
                              {camp.sent_count} sent{camp.failed_count > 0 ? `, ${camp.failed_count} failed` : ''}
                            </span>
                          </div>
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
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {camp.total_recipients}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(camp.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {camp.status === 'sending' && (
                            <button
                              type="button"
                              onClick={e => handlePause(camp.id, e)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-amber-600 transition-colors"
                              title="Pause"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {camp.status === 'paused' && (
                            <button
                              type="button"
                              onClick={e => handleResume(camp.id, e)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-600 transition-colors"
                              title="Resume"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {camp.failed_count > 0 && (
                            <button
                              type="button"
                              onClick={e => handleRetryFailed(camp.id, e)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-indigo-600 transition-colors"
                              title="Retry failed emails"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <a
                            href={api.getCampaignExportUrl(camp.id)}
                            download
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors inline-block"
                            title="Export CSV Report"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={e => handleDelete(camp.id, e)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <History className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No campaigns recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any outreach campaigns you create and send will appear here with live logs and delivery reports.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Details & Recipient Log Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-premium border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">{selectedCampaign.name}</h3>
                  {getStatusBadge(selectedCampaign.status)}
                </div>
                <p className="text-xs text-slate-500">
                  Subject: <span className="font-semibold text-slate-800">{selectedCampaign.subject}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={api.getCampaignExportUrl(selectedCampaign.id)}
                  download
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-subtle transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Export CSV Report</span>
                </a>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <XOctagon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Campaign Metrics Bar */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-white text-center py-3.5">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total</span>
                <span className="text-base font-bold text-slate-900">{selectedCampaign.total_recipients}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Sent</span>
                <span className="text-base font-bold text-emerald-600">{selectedCampaign.sent_count}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Failed</span>
                <span className="text-base font-bold text-rose-600">{selectedCampaign.failed_count}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pending</span>
                <span className="text-base font-bold text-blue-600">
                  {Math.max(0, selectedCampaign.total_recipients - selectedCampaign.sent_count - selectedCampaign.failed_count)}
                </span>
              </div>
            </div>

            {/* Recipient Logs Table */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(['all', 'sent', 'failed', 'pending'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRecipientFilter(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        recipientFilter === tab
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {selectedCampaign.failed_count > 0 && (
                  <button
                    onClick={() => handleRetryFailed(selectedCampaign.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry All {selectedCampaign.failed_count} Failed</span>
                  </button>
                )}
              </div>

              {isLoadingRecipients ? (
                <div className="text-center py-10 text-xs text-slate-400">Loading recipient logs...</div>
              ) : filteredRecipients.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Recipient</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">Delivery Status</th>
                        <th className="py-2.5 px-3">Sent At</th>
                        <th className="py-2.5 px-3">Error / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecipients.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">{r.name || '—'}</span>
                            <span className="font-mono text-slate-500 text-[11px]">{r.email}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{r.company || '—'}</td>
                          <td className="py-2.5 px-3">
                            {r.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Sent
                              </span>
                            )}
                            {r.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </span>
                            )}
                            {r.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                <Clock className="h-3 w-3" />
                                Queued
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {r.sent_at
                              ? new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 text-[11px] max-w-xs truncate">
                            {r.error_message || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No recipient logs matching "{recipientFilter}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

