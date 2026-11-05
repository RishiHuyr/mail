"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRouter = void 0;
const express_1 = require("express");
const models_js_1 = require("../db/models.js");
const queueService_js_1 = require("../services/queueService.js");
const gmailService_js_1 = require("../services/gmailService.js");
const csvService_js_1 = require("../services/csvService.js");
exports.campaignsRouter = (0, express_1.Router)();
// Server-Sent Events stream for real-time progress updates
exports.campaignsRouter.get('/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    const onProgress = (data) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', data })}\n\n`);
    };
    queueService_js_1.queueService.on('progress', onProgress);
    const keepAliveInterval = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 15000);
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        queueService_js_1.queueService.off('progress', onProgress);
    });
});
// List all campaigns
exports.campaignsRouter.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const result = models_js_1.CampaignsModel.list(limit, offset);
    res.json(result);
});
// Get campaign by ID with recipient log
exports.campaignsRouter.get('/:id', (req, res) => {
    const campaign = models_js_1.CampaignsModel.getById(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    const statusFilter = req.query.status;
    const recipients = models_js_1.CampaignRecipientsModel.listByCampaign(campaign.id, statusFilter);
    res.json({
        campaign,
        recipients,
    });
});
// Create and optionally start a new campaign
exports.campaignsRouter.post('/', async (req, res) => {
    const { name, subject, body_html, body_text, delay_seconds, recipients, attachments, autoStart, } = req.body;
    if (!name || !subject || !body_html) {
        return res.status(400).json({ error: 'Campaign Name, Subject, and Body are required.' });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'At least one recipient is required.' });
    }
    // Filter valid recipients and detect duplicates
    const validRecipients = recipients.filter((r) => r.email && r.email.includes('@'));
    if (validRecipients.length === 0) {
        return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
    }
    const senderName = models_js_1.SettingsModel.get('sender_name') || 'Outreach';
    const senderEmail = models_js_1.SettingsModel.get('google_connected_email') || 'me';
    const campaign = models_js_1.CampaignsModel.create({
        name: name.trim(),
        subject: subject.trim(),
        body_html,
        body_text: body_text || null,
        sender_name: senderName,
        sender_email: senderEmail,
        status: autoStart ? 'queued' : 'draft',
        delay_seconds: typeof delay_seconds === 'number' ? delay_seconds : 3,
        total_recipients: validRecipients.length,
        attachments: attachments ? JSON.stringify(attachments) : null,
    });
    models_js_1.CampaignRecipientsModel.createBatch(campaign.id, validRecipients);
    if (autoStart) {
        queueService_js_1.queueService.startCampaign(campaign.id);
    }
    const created = models_js_1.CampaignsModel.getById(campaign.id);
    res.status(201).json(created);
});
// Start campaign
exports.campaignsRouter.post('/:id/start', async (req, res) => {
    const campaign = await queueService_js_1.queueService.startCampaign(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
});
// Pause campaign
exports.campaignsRouter.post('/:id/pause', async (req, res) => {
    const campaign = await queueService_js_1.queueService.pauseCampaign(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
});
// Resume campaign
exports.campaignsRouter.post('/:id/resume', async (req, res) => {
    const campaign = await queueService_js_1.queueService.resumeCampaign(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
});
// Cancel campaign
exports.campaignsRouter.post('/:id/cancel', async (req, res) => {
    const campaign = await queueService_js_1.queueService.cancelCampaign(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
});
// Retry failed recipients
exports.campaignsRouter.post('/:id/retry-failed', async (req, res) => {
    const campaign = await queueService_js_1.queueService.retryFailed(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
});
// Send test email to myself
exports.campaignsRouter.post('/test-email', async (req, res) => {
    const { toEmail, subject, html, attachments, previewData } = req.body;
    if (!subject || !html) {
        return res.status(400).json({ error: 'Subject and HTML body are required for test email.' });
    }
    const result = await (0, gmailService_js_1.sendTestEmail)({
        toEmail,
        subject,
        html,
        attachments,
        previewData,
    });
    if (result.success) {
        res.json({ success: true, message: 'Test email sent successfully!', messageId: result.messageId, isSimulated: result.isSimulated });
    }
    else {
        res.status(500).json({ success: false, error: result.error || 'Failed to send test email' });
    }
});
// Export campaign results as CSV
exports.campaignsRouter.get('/:id/export', (req, res) => {
    const campaign = models_js_1.CampaignsModel.getById(req.params.id);
    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    const recipients = models_js_1.CampaignRecipientsModel.listByCampaign(campaign.id);
    const rows = recipients.map(r => ({
        Email: r.email,
        Name: r.name || '',
        Company: r.company || '',
        Status: r.status,
        SentAt: r.sent_at || '',
        Error: r.error_message || '',
        RetryCount: r.retry_count,
    }));
    const csv = (0, csvService_js_1.generateCsv)(rows, ['Email', 'Name', 'Company', 'Status', 'SentAt', 'Error', 'RetryCount']);
    const sanitizedName = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign_${sanitizedName}_report.csv"`);
    res.send(csv);
});
// Delete campaign
exports.campaignsRouter.delete('/:id', (req, res) => {
    const success = models_js_1.CampaignsModel.delete(req.params.id);
    if (!success) {
        return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ success: true, message: 'Campaign deleted successfully' });
});
