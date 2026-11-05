"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = void 0;
const events_1 = __importDefault(require("events"));
const models_js_1 = require("../db/models.js");
const gmailService_js_1 = require("./gmailService.js");
class CampaignQueueService extends events_1.default {
    isProcessing = false;
    activeCampaignIds = new Set();
    constructor() {
        super();
        // Increase max listeners for multiple frontend tabs
        this.setMaxListeners(50);
    }
    /**
     * Initializes queue on server boot, resuming any active or queued campaigns
     */
    async init() {
        const { campaigns } = models_js_1.CampaignsModel.list(50, 0);
        const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'queued');
        for (const c of activeCampaigns) {
            this.activeCampaignIds.add(c.id);
        }
        if (this.activeCampaignIds.size > 0) {
            console.log(`[Queue] Resuming ${this.activeCampaignIds.size} campaigns from previous session...`);
            this.triggerProcessing();
        }
    }
    async startCampaign(campaignId) {
        const campaign = models_js_1.CampaignsModel.getById(campaignId);
        if (!campaign)
            return null;
        if (campaign.status === 'sending') {
            return campaign;
        }
        const now = new Date().toISOString();
        const updated = models_js_1.CampaignsModel.update(campaignId, {
            status: 'sending',
            started_at: campaign.started_at || now,
        });
        this.activeCampaignIds.add(campaignId);
        this.emitProgress(campaignId, 'sending');
        this.triggerProcessing();
        return updated;
    }
    async pauseCampaign(campaignId) {
        const campaign = models_js_1.CampaignsModel.getById(campaignId);
        if (!campaign)
            return null;
        this.activeCampaignIds.delete(campaignId);
        const updated = models_js_1.CampaignsModel.update(campaignId, { status: 'paused' });
        this.emitProgress(campaignId, 'paused');
        return updated;
    }
    async resumeCampaign(campaignId) {
        return this.startCampaign(campaignId);
    }
    async cancelCampaign(campaignId) {
        const campaign = models_js_1.CampaignsModel.getById(campaignId);
        if (!campaign)
            return null;
        this.activeCampaignIds.delete(campaignId);
        const updated = models_js_1.CampaignsModel.update(campaignId, {
            status: 'cancelled',
            completed_at: new Date().toISOString(),
        });
        this.emitProgress(campaignId, 'cancelled');
        return updated;
    }
    async retryFailed(campaignId) {
        const campaign = models_js_1.CampaignsModel.getById(campaignId);
        if (!campaign)
            return null;
        const resetCount = models_js_1.CampaignRecipientsModel.resetFailedToPending(campaignId);
        if (resetCount > 0) {
            models_js_1.CampaignsModel.update(campaignId, {
                failed_count: Math.max(0, campaign.failed_count - resetCount),
                status: 'sending',
            });
        }
        return this.startCampaign(campaignId);
    }
    triggerProcessing() {
        if (this.isProcessing)
            return;
        this.processQueue().catch(err => {
            console.error('[Queue] Error in processQueue loop:', err);
            this.isProcessing = false;
        });
    }
    async processQueue() {
        this.isProcessing = true;
        try {
            while (this.activeCampaignIds.size > 0) {
                const campaignId = Array.from(this.activeCampaignIds)[0];
                const campaign = models_js_1.CampaignsModel.getById(campaignId);
                if (!campaign || campaign.status !== 'sending') {
                    this.activeCampaignIds.delete(campaignId);
                    continue;
                }
                // Fetch next pending recipient
                const recipient = models_js_1.CampaignRecipientsModel.getNextPending(campaignId);
                if (!recipient) {
                    // All recipients processed!
                    const finalCampaign = models_js_1.CampaignsModel.getById(campaignId);
                    const finalStatus = (finalCampaign?.failed_count ?? 0) === (finalCampaign?.total_recipients ?? 0) && (finalCampaign?.total_recipients ?? 0) > 0
                        ? 'failed'
                        : 'completed';
                    models_js_1.CampaignsModel.update(campaignId, {
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
                const refreshed = models_js_1.CampaignsModel.getById(campaignId);
                if (!refreshed || refreshed.status !== 'sending') {
                    this.activeCampaignIds.delete(campaignId);
                    continue;
                }
                // Configurable delay between emails (default 3s, minimum 0.5s)
                const delaySeconds = Math.max(0.5, campaign.delay_seconds || 3);
                await this.sleepWithCancellationCheck(delaySeconds * 1000, campaignId);
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processSingleRecipient(campaign, recipient) {
        const recipientData = {
            Name: recipient.name || '',
            Email: recipient.email || '',
            Company: recipient.company || '',
            ...(recipient.custom_data || {}),
        };
        // Personalize Subject & HTML
        const renderedSubject = (0, gmailService_js_1.renderTemplate)(campaign.subject, recipientData);
        let renderedHtml = (0, gmailService_js_1.renderTemplate)(campaign.body_html, recipientData);
        // Append signature if enabled
        const appendSig = models_js_1.SettingsModel.get('append_signature') === 'true';
        const signature = models_js_1.SettingsModel.get('email_signature');
        if (appendSig && signature) {
            renderedHtml += signature;
        }
        // Append unsubscribe note if enabled
        const appendUnsub = models_js_1.SettingsModel.get('append_unsubscribe') === 'true';
        if (appendUnsub) {
            renderedHtml += `
        <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          If you prefer not to receive future emails from us, please reply with "Unsubscribe" and you will be removed immediately.
        </div>
      `;
        }
        // Parse attachments
        let attachments = [];
        if (campaign.attachments) {
            try {
                attachments = JSON.parse(campaign.attachments);
            }
            catch (e) {
                console.error('Failed to parse campaign attachments:', e);
            }
        }
        // Send email
        const sendResult = await (0, gmailService_js_1.sendEmail)({
            to: recipient.email,
            subject: renderedSubject,
            html: renderedHtml,
            senderName: campaign.sender_name || undefined,
            senderEmail: campaign.sender_email || undefined,
            attachments,
        });
        if (sendResult.success) {
            models_js_1.CampaignRecipientsModel.markSent(recipient.id);
            models_js_1.CampaignsModel.incrementCounters(campaign.id, 1, 0);
            this.emitProgress(campaign.id, 'sending', {
                email: recipient.email,
                name: recipient.name || undefined,
                status: 'sent',
            });
        }
        else {
            const errorMsg = sendResult.error || 'Failed to send email';
            models_js_1.CampaignRecipientsModel.markFailed(recipient.id, errorMsg);
            models_js_1.CampaignsModel.incrementCounters(campaign.id, 0, 1);
            this.emitProgress(campaign.id, 'sending', {
                email: recipient.email,
                name: recipient.name || undefined,
                status: 'failed',
                error: errorMsg,
            });
        }
    }
    async sleepWithCancellationCheck(ms, campaignId) {
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
    emitProgress(campaignId, status, currentRecipient) {
        const campaign = models_js_1.CampaignsModel.getById(campaignId);
        if (!campaign)
            return;
        const payload = {
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
exports.queueService = new CampaignQueueService();
