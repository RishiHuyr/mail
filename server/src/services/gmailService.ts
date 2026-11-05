import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { getAuthenticatedClient, getGmailStatus } from './googleAuth.js';
import { SettingsModel } from '../db/models.js';

export interface EmailAttachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  senderEmail?: string;
  attachments?: EmailAttachment[];
  isTest?: boolean;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Replace placeholders like {{Name}}, {{Email}}, {{Company}} case-insensitively.
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_\s]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    // Try exact match first
    if (data[trimmedKey] !== undefined && data[trimmedKey] !== null) {
      return String(data[trimmedKey]);
    }
    // Case-insensitive match
    const lowerKey = trimmedKey.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== null) {
        return String(v);
      }
    }
    // Return empty string or fallback if not found
    return '';
  });
}

/**
 * Build RFC 2822 MIME message buffer using Nodemailer stream transporter
 */
async function buildMimeMessage(options: SendEmailOptions, fromEmail: string): Promise<string> {
  const senderDisplayName = options.senderName || SettingsModel.get('sender_name') || 'Outreach';
  const fromHeader = `"${senderDisplayName.replace(/"/g, '')}" <${fromEmail}>`;

  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
  });

  const mailAttachments = (options.attachments || []).map(att => ({
    filename: att.originalName || att.filename,
    path: att.path,
    contentType: att.mimeType,
  }));

  const mailOptions: nodemailer.SendMailOptions = {
    from: fromHeader,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    attachments: mailAttachments,
  };

  const info: any = await transporter.sendMail(mailOptions);
  const rawBuffer: Buffer = info.message;
  return rawBuffer.toString('base64url');
}

/**
 * Sends a single personalized email via Gmail API (or simulation if sandbox mode active)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const gmailStatus = getGmailStatus();

  // If simulation mode is explicitly enabled in settings for testing without real credentials
  const isSimulationMode = SettingsModel.get('simulation_mode') === 'true';

  if (isSimulationMode) {
    // Artificial 400ms delay to simulate real network request
    await new Promise(r => setTimeout(r, 400));
    console.log(`[SIMULATED EMAIL SENT] To: ${options.to} | Subject: "${options.subject}"`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isSimulated: true,
    };
  }

  // Real Gmail API sending
  const { client, error } = await getAuthenticatedClient();
  if (!client || error) {
    return {
      success: false,
      error: error || 'Gmail is not connected. Please connect your Gmail account in Settings.',
    };
  }

  try {
    const fromEmail = gmailStatus.email || 'me';
    const raw = await buildMimeMessage(options, fromEmail);

    const gmail = google.gmail({ version: 'v1', auth: client });
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      success: true,
      messageId: response.data.id || undefined,
    };
  } catch (err: any) {
    console.error(`Gmail API send failed for ${options.to}:`, err);
    let errorMessage = err.message || 'Unknown Gmail API error';
    if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sends a test email to the authenticated user's own email
 */
export async function sendTestEmail(params: {
  toEmail?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  previewData?: Record<string, any>;
}): Promise<SendResult> {
  const gmailStatus = getGmailStatus();
  const targetEmail = params.toEmail || gmailStatus.email;

  if (!targetEmail) {
    return {
      success: false,
      error: 'No target email specified and no Gmail account connected to send to.',
    };
  }

  const sampleData = {
    Name: 'Test Recipient',
    Email: targetEmail,
    Company: 'Acme Corp',
    Role: 'Marketing Director',
    ...(params.previewData || {}),
  };

  const renderedSubject = `[TEST] ${renderTemplate(params.subject, sampleData)}`;
  let renderedHtml = renderTemplate(params.html, sampleData);

  // Append signature if enabled
  const appendSig = SettingsModel.get('append_signature') === 'true';
  const signature = SettingsModel.get('email_signature');
  if (appendSig && signature) {
    renderedHtml += signature;
  }

  // Prepend a nice banner indicating this is a test email
  const testBanner = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; color: #166534;">
      <strong>MailFlow Test Preview:</strong> This is a test email generated for <em>${sampleData.Name}</em> (${targetEmail}).
    </div>
  `;

  return sendEmail({
    to: targetEmail,
    subject: renderedSubject,
    html: testBanner + renderedHtml,
    attachments: params.attachments,
    isTest: true,
  });
}

