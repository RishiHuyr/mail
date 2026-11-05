"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = renderTemplate;
exports.sendEmail = sendEmail;
exports.sendTestEmail = sendTestEmail;
const googleapis_1 = require("googleapis");
const nodemailer_1 = __importDefault(require("nodemailer"));
const googleAuth_js_1 = require("./googleAuth.js");
const models_js_1 = require("../db/models.js");
/**
 * Replace placeholders like {{Name}}, {{Email}}, {{Company}} case-insensitively.
 */
function renderTemplate(template, data) {
    if (!template)
        return '';
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
async function buildMimeMessage(options, fromEmail) {
    const senderDisplayName = options.senderName || models_js_1.SettingsModel.get('sender_name') || 'Outreach';
    const fromHeader = `"${senderDisplayName.replace(/"/g, '')}" <${fromEmail}>`;
    const transporter = nodemailer_1.default.createTransport({
        streamTransport: true,
        buffer: true,
    });
    const mailAttachments = (options.attachments || []).map(att => ({
        filename: att.originalName || att.filename,
        path: att.path,
        contentType: att.mimeType,
    }));
    const mailOptions = {
        from: fromHeader,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        attachments: mailAttachments,
    };
    const info = await transporter.sendMail(mailOptions);
    const rawBuffer = info.message;
    return rawBuffer.toString('base64url');
}
/**
 * Sends a single personalized email via Gmail API (or simulation if sandbox mode active)
 */
async function sendEmail(options) {
    const gmailStatus = (0, googleAuth_js_1.getGmailStatus)();
    // If simulation mode is explicitly enabled in settings for testing without real credentials
    const isSimulationMode = models_js_1.SettingsModel.get('simulation_mode') === 'true';
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
    const { client, error } = await (0, googleAuth_js_1.getAuthenticatedClient)();
    if (!client || error) {
        return {
            success: false,
            error: error || 'Gmail is not connected. Please connect your Gmail account in Settings.',
        };
    }
    try {
        const fromEmail = gmailStatus.email || 'me';
        const raw = await buildMimeMessage(options, fromEmail);
        const gmail = googleapis_1.google.gmail({ version: 'v1', auth: client });
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw },
        });
        return {
            success: true,
            messageId: response.data.id || undefined,
        };
    }
    catch (err) {
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
async function sendTestEmail(params) {
    const gmailStatus = (0, googleAuth_js_1.getGmailStatus)();
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
    const appendSig = models_js_1.SettingsModel.get('append_signature') === 'true';
    const signature = models_js_1.SettingsModel.get('email_signature');
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
