"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("../config.js");
let store = {
    settings: {},
    contacts: [],
    campaigns: [],
    campaign_recipients: [],
};
const jsonDbPath = path_1.default.join(config_js_1.config.dataDir, 'mailflow_db.json');
function saveStore() {
    try {
        fs_1.default.writeFileSync(jsonDbPath, JSON.stringify(store, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn('[db] Failed to save database to disk:', err);
    }
}
function loadStore() {
    try {
        if (fs_1.default.existsSync(jsonDbPath)) {
            const data = fs_1.default.readFileSync(jsonDbPath, 'utf-8');
            store = JSON.parse(data);
        }
    }
    catch (err) {
        console.warn('[db] Failed to load database from disk, using fresh store:', err);
    }
    // Ensure default settings
    const defaultSettings = {
        sender_name: 'Personal Outreach',
        default_delay_seconds: '3',
        email_signature: '<p style="margin-top: 16px; color: #475569; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Best regards,<br><strong>MailFlow User</strong></p>',
        append_signature: 'true',
        append_unsubscribe: 'false',
        daily_sending_limit: '500',
        google_connected: 'false',
    };
    for (const [k, v] of Object.entries(defaultSettings)) {
        if (store.settings[k] === undefined) {
            store.settings[k] = v;
        }
    }
}
class JsonDatabase {
    constructor() {
        loadStore();
    }
    exec(sql) {
        // schema initialization - no-op for JSON store
    }
    pragma(pragmaSql) {
        // pragma - no-op
    }
    transaction(fn) {
        return (...args) => fn(...args);
    }
    prepare(sql) {
        const s = sql.trim().replace(/\s+/g, ' ');
        return {
            get: (...params) => {
                // Settings get
                if (/SELECT value FROM settings WHERE key = \?/i.test(s)) {
                    const key = params[0];
                    const val = store.settings[key];
                    return val !== undefined ? { value: val } : undefined;
                }
                // Contact count
                if (/SELECT COUNT\(\*\) as count FROM contacts/i.test(s)) {
                    return { count: store.contacts.length };
                }
                // Contact by ID
                if (/SELECT \* FROM contacts WHERE id = \?/i.test(s)) {
                    const id = params[0];
                    return store.contacts.find((c) => c.id === id);
                }
                // Contact by Email
                if (/SELECT \* FROM contacts WHERE LOWER\(email\) = LOWER\(\?\)/i.test(s)) {
                    const email = (params[0] || '').toLowerCase();
                    return store.contacts.find((c) => (c.email || '').toLowerCase() === email);
                }
                // Campaign count
                if (/SELECT COUNT\(\*\) as count FROM campaigns/i.test(s)) {
                    return { count: store.campaigns.length };
                }
                // Campaign by ID
                if (/SELECT \* FROM campaigns WHERE id = \?/i.test(s)) {
                    const id = params[0];
                    return store.campaigns.find((c) => c.id === id);
                }
                // Stats aggregated query
                if (/FROM campaigns/i.test(s) && /COALESCE\(SUM\(sent_count\)/i.test(s)) {
                    let totalSent = 0;
                    let totalFailed = 0;
                    let totalPending = 0;
                    for (const c of store.campaigns) {
                        totalSent += c.sent_count || 0;
                        totalFailed += c.failed_count || 0;
                        if (['queued', 'sending'].includes(c.status)) {
                            totalPending += Math.max(0, (c.total_recipients || 0) - (c.sent_count || 0) - (c.failed_count || 0));
                        }
                    }
                    return {
                        totalSent,
                        totalFailed,
                        totalPending,
                        totalCampaigns: store.campaigns.length,
                    };
                }
                // Sent today count
                if (/FROM campaign_recipients WHERE status = 'sent' AND sent_at >= \?/i.test(s)) {
                    const threshold = params[0];
                    const count = store.campaign_recipients.filter((r) => r.status === 'sent' && r.sent_at && r.sent_at >= threshold).length;
                    return { count };
                }
                // Next pending recipient for campaign
                if (/FROM campaign_recipients.*WHERE campaign_id = \? AND status = 'pending'/i.test(s)) {
                    const campaignId = params[0];
                    const found = store.campaign_recipients.find((r) => r.campaign_id === campaignId && r.status === 'pending');
                    return found || undefined;
                }
                // Fallback generic find
                return undefined;
            },
            all: (...params) => {
                // Settings getAll
                if (/SELECT key, value FROM settings/i.test(s)) {
                    return Object.entries(store.settings).map(([key, value]) => ({ key, value }));
                }
                // Contacts list
                if (/SELECT \* FROM contacts/i.test(s)) {
                    let list = [...store.contacts];
                    if (/WHERE/i.test(s) && params.length >= 3) {
                        const term = (params[0] || '').replace(/%/g, '').toLowerCase();
                        list = list.filter((c) => (c.name || '').toLowerCase().includes(term) ||
                            (c.email || '').toLowerCase().includes(term) ||
                            (c.company || '').toLowerCase().includes(term));
                    }
                    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
                    const limit = params[params.length - 2] ?? 500;
                    const offset = params[params.length - 1] ?? 0;
                    return list.slice(offset, offset + limit);
                }
                // Campaigns list
                if (/SELECT \* FROM campaigns/i.test(s)) {
                    const list = [...store.campaigns];
                    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
                    const limit = params[0] ?? 100;
                    const offset = params[1] ?? 0;
                    return list.slice(offset, offset + limit);
                }
                // Recent campaigns in stats
                if (/SELECT id, name, subject, status, total_recipients.*FROM campaigns/i.test(s)) {
                    const list = [...store.campaigns];
                    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
                    return list.slice(0, 6);
                }
                // Recipients by campaign
                if (/SELECT \* FROM campaign_recipients WHERE campaign_id = \?/i.test(s)) {
                    const campaignId = params[0];
                    let list = store.campaign_recipients.filter((r) => r.campaign_id === campaignId);
                    if (params.length > 1 && params[1]) {
                        list = list.filter((r) => r.status === params[1]);
                    }
                    return list;
                }
                return [];
            },
            run: (...params) => {
                let changes = 0;
                // Settings insert / replace
                if (/INSERT (OR REPLACE )?INTO settings/i.test(s)) {
                    const [key, value] = params;
                    store.settings[key] = value;
                    changes = 1;
                    saveStore();
                    return { changes, lastInsertRowid: 1 };
                }
                // Settings delete
                if (/DELETE FROM settings WHERE key = \?/i.test(s)) {
                    const key = params[0];
                    if (store.settings[key] !== undefined) {
                        delete store.settings[key];
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Contact insert
                if (/INSERT INTO contacts/i.test(s)) {
                    const [id, name, email, company, role, custom_fields, created_at, updated_at] = params;
                    store.contacts.push({ id, name, email, company, role, custom_fields, created_at, updated_at });
                    changes = 1;
                    saveStore();
                    return { changes, lastInsertRowid: store.contacts.length };
                }
                // Contact update
                if (/UPDATE contacts SET/i.test(s)) {
                    const id = params[params.length - 1];
                    const contact = store.contacts.find((c) => c.id === id);
                    if (contact) {
                        if (/name = \?/i.test(s))
                            contact.name = params[0];
                        if (/company = \?/i.test(s))
                            contact.company = params[1];
                        if (/role = \?/i.test(s))
                            contact.role = params[2];
                        if (/custom_fields = \?/i.test(s))
                            contact.custom_fields = params[3];
                        contact.updated_at = new Date().toISOString();
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Contact delete
                if (/DELETE FROM contacts WHERE id = \?/i.test(s)) {
                    const id = params[0];
                    const initialLen = store.contacts.length;
                    store.contacts = store.contacts.filter((c) => c.id !== id);
                    changes = initialLen - store.contacts.length;
                    if (changes > 0)
                        saveStore();
                    return { changes, lastInsertRowid: 0 };
                }
                // Contact delete all
                if (/DELETE FROM contacts$/i.test(s)) {
                    changes = store.contacts.length;
                    store.contacts = [];
                    if (changes > 0)
                        saveStore();
                    return { changes, lastInsertRowid: 0 };
                }
                // Campaign insert
                if (/INSERT INTO campaigns/i.test(s)) {
                    const [id, name, subject, body_html, body_text, sender_name, sender_email, status, delay_seconds, total_recipients, sent_count, failed_count, attachments, created_at,] = params;
                    store.campaigns.push({
                        id,
                        name,
                        subject,
                        body_html,
                        body_text,
                        sender_name,
                        sender_email,
                        status: status || 'draft',
                        delay_seconds: delay_seconds || 3,
                        total_recipients: total_recipients || 0,
                        sent_count: sent_count || 0,
                        failed_count: failed_count || 0,
                        attachments: attachments || null,
                        created_at,
                    });
                    changes = 1;
                    saveStore();
                    return { changes, lastInsertRowid: store.campaigns.length };
                }
                // Campaign update counters
                if (/UPDATE campaigns SET sent_count = sent_count \+ \?, failed_count = failed_count \+ \? WHERE id = \?/i.test(s)) {
                    const [sentInc, failedInc, id] = params;
                    const camp = store.campaigns.find((c) => c.id === id);
                    if (camp) {
                        camp.sent_count = (camp.sent_count || 0) + sentInc;
                        camp.failed_count = (camp.failed_count || 0) + failedInc;
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Campaign generic update
                if (/UPDATE campaigns SET/i.test(s)) {
                    const id = params[params.length - 1];
                    const camp = store.campaigns.find((c) => c.id === id);
                    if (camp) {
                        // parse set assignments from SQL
                        const setPart = s.split(/WHERE/i)[0].replace(/UPDATE campaigns SET/i, '');
                        const fields = setPart.split(',').map((f) => f.trim().split('=')[0].trim());
                        fields.forEach((field, idx) => {
                            camp[field] = params[idx];
                        });
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Campaign delete
                if (/DELETE FROM campaigns WHERE id = \?/i.test(s)) {
                    const id = params[0];
                    const initialLen = store.campaigns.length;
                    store.campaigns = store.campaigns.filter((c) => c.id !== id);
                    store.campaign_recipients = store.campaign_recipients.filter((r) => r.campaign_id !== id);
                    changes = initialLen - store.campaigns.length;
                    if (changes > 0)
                        saveStore();
                    return { changes, lastInsertRowid: 0 };
                }
                // Recipient insert
                if (/INSERT INTO campaign_recipients/i.test(s)) {
                    const [id, campaign_id, email, name, company, custom_data, status, retry_count] = params;
                    store.campaign_recipients.push({
                        id,
                        campaign_id,
                        email,
                        name,
                        company,
                        custom_data,
                        status: status || 'pending',
                        retry_count: retry_count || 0,
                    });
                    changes = 1;
                    saveStore();
                    return { changes, lastInsertRowid: store.campaign_recipients.length };
                }
                // Recipient markSent
                if (/UPDATE campaign_recipients SET status = 'sent', sent_at = \? WHERE id = \?/i.test(s)) {
                    const [sent_at, id] = params;
                    const r = store.campaign_recipients.find((rec) => rec.id === id);
                    if (r) {
                        r.status = 'sent';
                        r.sent_at = sent_at;
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Recipient markFailed
                if (/UPDATE campaign_recipients SET status = 'failed', error_message = \?, retry_count = retry_count \+ 1 WHERE id = \?/i.test(s)) {
                    const [errMsg, id] = params;
                    const r = store.campaign_recipients.find((rec) => rec.id === id);
                    if (r) {
                        r.status = 'failed';
                        r.error_message = errMsg;
                        r.retry_count = (r.retry_count || 0) + 1;
                        changes = 1;
                        saveStore();
                    }
                    return { changes, lastInsertRowid: 0 };
                }
                // Recipient resetFailedToPending
                if (/UPDATE campaign_recipients SET status = 'pending', error_message = NULL WHERE campaign_id = \? AND status = 'failed'/i.test(s)) {
                    const campaignId = params[0];
                    for (const r of store.campaign_recipients) {
                        if (r.campaign_id === campaignId && r.status === 'failed') {
                            r.status = 'pending';
                            r.error_message = null;
                            changes++;
                        }
                    }
                    if (changes > 0)
                        saveStore();
                    return { changes, lastInsertRowid: 0 };
                }
                return { changes, lastInsertRowid: 0 };
            },
        };
    }
}
let dbInstance;
function getDb() {
    if (!dbInstance) {
        dbInstance = new JsonDatabase();
    }
    return dbInstance;
}
