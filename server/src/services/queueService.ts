import EventEmitter from 'events';
import { CampaignsModel, CampaignRecipientsModel, SettingsModel, Campaign, CampaignRecipient } from '../db/models.js';
import { sendEmail, renderTemplate, EmailAttachment } from './gmailService.js';

export interface CampaignProgressEvent {
  campaignId: string;
  status: string;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  currentRecipient?: {
    email: string;
    name?: string;
    status: 'sent' | 'failed';
    error?: string;
  };
  timestamp: string;
}

class CampaignQueueService extends EventEmitter {
  private isProcessing = false;
  private activeCampaignIds = new Set<string>();

  constructor() {
    super();
    // Increase max listeners for multiple frontend tabs
    this.setMaxListeners(50);
  }

  /**
   * Initializes queue on server boot, resuming any active or queued campaigns
   */
  public async init() {
    const { campaigns } = CampaignsModel.list(50, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'queued');

    for (const c of activeCampaigns) {
      this.activeCampaignIds.add(c.id);
    }

    if (this.activeCampaignIds.size > 0) {
      console.log(`[Queue] Resuming ${this.activeCampaignIds.size} campaigns from previous session...`);
      this.triggerProcessing();
    }
  }

  public async startCampaign(campaignId: string): Promise<Campaign | null> {
    const campaign = CampaignsModel.getById(campaignId);
    if (!campaign) return null;

    if (campaign.status === 'sending') {
      return campaign;
    }

    const now = new Date().toISOString();
    const updated = CampaignsModel.update(campaignId, {
      status: 'sending',
      started_at: campaign.started_at || now,
    });

    this.activeCampaignIds.add(campaignId);
    this.emitProgress(campaignId, 'sending');
    this.triggerProcessing();

    return updated;
  }

  public async pauseCampaign(campaignId: string): Promise<Campaign | null> {
    const campaign = CampaignsModel.getById(campaignId);
    if (!campaign) return null;

    this.activeCampaignIds.delete(campaignId);
    const updated = CampaignsModel.update(campaignId, { status: 'paused' });
    this.emitProgress(campaignId, 'paused');
    return updated;
  }

  public async resumeCampaign(campaignId: string): Promise<Campaign | null> {
    return this.startCampaign(campaignId);
  }

  public async cancelCampaign(campaignId: string): Promise<Campaign | null> {
    const campaign = CampaignsModel.getById(campaignId);
    if (!campaign) return null;

    this.activeCampaignIds.delete(campaignId);
    const updated = CampaignsModel.update(campaignId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });
    this.emitProgress(campaignId, 'cancelled');
    return updated;
  }

  public async retryFailed(campaignId: string): Promise<Campaign | null> {
    const campaign = CampaignsModel.getById(campaignId);
    if (!campaign) return null;

    const resetCount = CampaignRecipientsModel.resetFailedToPending(campaignId);
    if (resetCount > 0) {
      CampaignsModel.update(campaignId, {
        failed_count: Math.max(0, campaign.failed_count - resetCount),
        status: 'sending',
      });
    }

    return this.startCampaign(campaignId);
  }

  private triggerProcessing() {
    if (this.isProcessing) return;
    this.processQueue().catch(err => {
      console.error('[Queue] Error in processQueue loop:', err);
      this.isProcessing = false;
    });
  }

  private async processQueue() {
    this.isProcessing = true;

    try {
      while (this.activeCampaignIds.size > 0) {
        const campaignId = Array.from(this.activeCampaignIds)[0];
        const campaign = CampaignsModel.getById(campaignId);

        if (!campaign || campaign.status !== 'sending') {
          this.activeCampaignIds.delete(campaignId);
          continue;
        }

        // Fetch next pending recipient
        const recipient = CampaignRecipientsModel.getNextPending(campaignId);

        if (!recipient) {
          // All recipients processed!
          const finalCampaign = CampaignsModel.getById(campaignId);
          const finalStatus = (finalCampaign?.failed_count ?? 0) === (finalCampaign?.total_recipients ?? 0) && (finalCampaign?.total_recipients ?? 0) > 0 
            ? 'failed' 
            : 'completed';

          CampaignsModel.update(campaignId, {
            status: finalStatus,
            completed_at: new Date().toISOString(),
          });

          this.activeCampaignIds.delete(campaignId);
          this.emitProgress(campaignId, finalStatus);
          continue;
        }

        // Process this recipient
        await this.processSingleRecipient(campaign, recipient);

        // Check if campaign was paused or cancelled while sending
        const refreshed = CampaignsModel.getById(campaignId);
        if (!refreshed || refreshed.status !== 'sending') {
          this.activeCampaignIds.delete(campaignId);
          continue;
        }

        // Configurable delay between emails (default 3s, minimum 0.5s)
        const delaySeconds = Math.max(0.5, campaign.delay_seconds || 3);
        await this.sleepWithCancellationCheck(delaySeconds * 1000, campaignId);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSingleRecipient(campaign: Campaign, recipient: CampaignRecipient) {
    const recipientData: Record<string, any> = {
      Name: recipient.name || '',
      Email: recipient.email || '',
      Company: recipient.company || '',
      ...(recipient.custom_data || {}),
    };

    // Personalize Subject & HTML
    const renderedSubject = renderTemplate(campaign.subject, recipientData);
    let renderedHtml = renderTemplate(campaign.body_html, recipientData);

    // Append signature if enabled
    const appendSig = SettingsModel.get('append_signature') === 'true';
    const signature = SettingsModel.get('email_signature');
    if (appendSig && signature) {
      renderedHtml += signature;
    }

    // Append unsubscribe note if enabled
    const appendUnsub = SettingsModel.get('append_unsubscribe') === 'true';
    if (appendUnsub) {
      renderedHtml += `
        <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          If you prefer not to receive future emails from us, please reply with "Unsubscribe" and you will be removed immediately.
        </div>
      `;
    }

    // Parse attachments
    let attachments: EmailAttachment[] = [];
    if (campaign.attachments) {
      try {
        attachments = JSON.parse(campaign.attachments);
      } catch (e) {
        console.error('Failed to parse campaign attachments:', e);
      }
    }

    // Send email
    const sendResult = await sendEmail({
      to: recipient.email,
      subject: renderedSubject,
      html: renderedHtml,
      senderName: campaign.sender_name || undefined,
      senderEmail: campaign.sender_email || undefined,
      attachments,
    });

    if (sendResult.success) {
      CampaignRecipientsModel.markSent(recipient.id);
      CampaignsModel.incrementCounters(campaign.id, 1, 0);

      this.emitProgress(campaign.id, 'sending', {
        email: recipient.email,
        name: recipient.name || undefined,
        status: 'sent',
      });
    } else {
      const errorMsg = sendResult.error || 'Failed to send email';
      CampaignRecipientsModel.markFailed(recipient.id, errorMsg);
      CampaignsModel.incrementCounters(campaign.id, 0, 1);

      this.emitProgress(campaign.id, 'sending', {
        email: recipient.email,
        name: recipient.name || undefined,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  private async sleepWithCancellationCheck(ms: number, campaignId: string): Promise<void> {
    const step = 200;
    let elapsed = 0;
    while (elapsed < ms) {
      if (!this.activeCampaignIds.has(campaignId)) {
        break;
      }
      await new Promise(r => setTimeout(r, Math.min(step, ms - elapsed)));
      elapsed += step;
    }
  }

  private emitProgress(campaignId: string, status: string, currentRecipient?: CampaignProgressEvent['currentRecipient']) {
    const campaign = CampaignsModel.getById(campaignId);
    if (!campaign) return;

    const payload: CampaignProgressEvent = {
      campaignId,
      status: campaign.status,
      sentCount: campaign.sent_count,
      failedCount: campaign.failed_count,
      totalRecipients: campaign.total_recipients,
      currentRecipient,
      timestamp: new Date().toISOString(),
    };

    this.emit('progress', payload);
    this.emit(`progress:${campaignId}`, payload);
  }
}

export const queueService = new CampaignQueueService();

