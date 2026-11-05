import { Router, Request, Response } from 'express';
import { CampaignsModel, CampaignRecipientsModel, SettingsModel } from '../db/models.js';
import { queueService } from '../services/queueService.js';
import { sendTestEmail } from '../services/gmailService.js';
import { generateCsv } from '../services/csvService.js';

export const campaignsRouter = Router();

// Server-Sent Events stream for real-time progress updates
campaignsRouter.get('/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const onProgress = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', data })}\n\n`);
  };

  queueService.on('progress', onProgress);

  const keepAliveInterval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    queueService.off('progress', onProgress);
  });
});

// List all campaigns
campaignsRouter.get('/', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const result = CampaignsModel.list(limit, offset);
  res.json(result);
});

// Get campaign by ID with recipient log
campaignsRouter.get('/:id', (req: Request, res: Response) => {
  const campaign = CampaignsModel.getById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const statusFilter = req.query.status as string;
  const recipients = CampaignRecipientsModel.listByCampaign(campaign.id, statusFilter);

  res.json({
    campaign,
    recipients,
  });
});

// Create and optionally start a new campaign
campaignsRouter.post('/', async (req: Request, res: Response) => {
  const {
    name,
    subject,
    body_html,
    body_text,
    delay_seconds,
    recipients,
    attachments,
    autoStart,
  } = req.body;

  if (!name || !subject || !body_html) {
    return res.status(400).json({ error: 'Campaign Name, Subject, and Body are required.' });
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required.' });
  }

  // Filter valid recipients and detect duplicates
  const validRecipients = recipients.filter((r: any) => r.email && r.email.includes('@'));
  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
  }

  const senderName = SettingsModel.get('sender_name') || 'Outreach';
  const senderEmail = SettingsModel.get('google_connected_email') || 'me';

  const campaign = CampaignsModel.create({
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

  CampaignRecipientsModel.createBatch(campaign.id, validRecipients);

  if (autoStart) {
    queueService.startCampaign(campaign.id);
  }

  const created = CampaignsModel.getById(campaign.id);
  res.status(201).json(created);
});

// Start campaign
campaignsRouter.post('/:id/start', async (req: Request, res: Response) => {
  const campaign = await queueService.startCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, campaign });
});

// Pause campaign
campaignsRouter.post('/:id/pause', async (req: Request, res: Response) => {
  const campaign = await queueService.pauseCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, campaign });
});

// Resume campaign
campaignsRouter.post('/:id/resume', async (req: Request, res: Response) => {
  const campaign = await queueService.resumeCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, campaign });
});

// Cancel campaign
campaignsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const campaign = await queueService.cancelCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, campaign });
});

// Retry failed recipients
campaignsRouter.post('/:id/retry-failed', async (req: Request, res: Response) => {
  const campaign = await queueService.retryFailed(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, campaign });
});

// Send test email to myself
campaignsRouter.post('/test-email', async (req: Request, res: Response) => {
  const { toEmail, subject, html, attachments, previewData } = req.body;

  if (!subject || !html) {
    return res.status(400).json({ error: 'Subject and HTML body are required for test email.' });
  }

  const result = await sendTestEmail({
    toEmail,
    subject,
    html,
    attachments,
    previewData,
  });

  if (result.success) {
    res.json({ success: true, message: 'Test email sent successfully!', messageId: result.messageId, isSimulated: result.isSimulated });
  } else {
    res.status(500).json({ success: false, error: result.error || 'Failed to send test email' });
  }
});

// Export campaign results as CSV
campaignsRouter.get('/:id/export', (req: Request, res: Response) => {
  const campaign = CampaignsModel.getById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const recipients = CampaignRecipientsModel.listByCampaign(campaign.id);
  const rows = recipients.map(r => ({
    Email: r.email,
    Name: r.name || '',
    Company: r.company || '',
    Status: r.status,
    SentAt: r.sent_at || '',
    Error: r.error_message || '',
    RetryCount: r.retry_count,
  }));

  const csv = generateCsv(rows, ['Email', 'Name', 'Company', 'Status', 'SentAt', 'Error', 'RetryCount']);
  const sanitizedName = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="campaign_${sanitizedName}_report.csv"`);
  res.send(csv);
});

// Delete campaign
campaignsRouter.delete('/:id', (req: Request, res: Response) => {
  const success = CampaignsModel.delete(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, message: 'Campaign deleted successfully' });
});

