"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRecipientsModel = exports.CampaignsModel = exports.ContactsModel = exports.SettingsModel = void 0;
const database_js_1 = require("./database.js");
const crypto_1 = __importDefault(require("crypto"));
exports.SettingsModel = {
    get(key) {
        const db = (0, database_js_1.getDb)();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    },
    getAll() {
        const db = (0, database_js_1.getDb)();
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const res = {};
        for (const r of rows) {
            res[r.key] = r.value;
        }
        return res;
    },
    set(key, value) {
        const db = (0, database_js_1.getDb)();
        db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, new Date().toISOString());
    },
    setMany(entries) {
        const db = (0, database_js_1.getDb)();
        const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
        const now = new Date().toISOString();
        const tx = db.transaction((items) => {
            for (const [k, v] of Object.entries(items)) {
                stmt.run(k, v, now);
            }
        });
        tx(entries);
    },
    delete(key) {
        const db = (0, database_js_1.getDb)();
        db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    }
};
exports.ContactsModel = {
    list(search, limit = 500, offset = 0) {
        const db = (0, database_js_1.getDb)();
        let query = 'SELECT * FROM contacts';
        let countQuery = 'SELECT COUNT(*) as count FROM contacts';
        const params = [];
        const countParams = [];
        if (search && search.trim()) {
            const term = `%${search.trim().toLowerCase()}%`;
            query += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?';
            countQuery += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?';
            params.push(term, term, term);
            countParams.push(term, term, term);
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const rows = db.prepare(query).all(...params);
        const totalRow = db.prepare(countQuery).get(...countParams);
        return {
            contacts: rows.map(r => ({
                ...r,
                custom_fields: r.custom_fields ? JSON.parse(r.custom_fields) : null
            })),
            total: totalRow.count
        };
    },
    getById(id) {
        const db = (0, database_js_1.getDb)();
        const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            ...row,
            custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : null
        };
    },
    getByEmail(email) {
        const db = (0, database_js_1.getDb)();
        const row = db.prepare('SELECT * FROM contacts WHERE LOWER(email) = LOWER(?)').get(email);
        if (!row)
            return null;
        return {
            ...row,
            custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : null
        };
    },
    create(contact) {
        const db = (0, database_js_1.getDb)();
        const id = crypto_1.default.randomUUID();
        const now = new Date().toISOString();
        const customFieldsStr = contact.custom_fields ? JSON.stringify(contact.custom_fields) : null;
        db.prepare(`
      INSERT INTO contacts (id, name, email, company, role, custom_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, contact.name.trim(), contact.email.trim().toLowerCase(), contact.company?.trim() || null, contact.role?.trim() || null, customFieldsStr, now, now);
        return {
            id,
            name: contact.name,
            email: contact.email.toLowerCase(),
            company: contact.company,
            role: contact.role,
            custom_fields: contact.custom_fields,
            created_at: now,
            updated_at: now
        };
    },
    upsertMany(contactsList) {
        const db = (0, database_js_1.getDb)();
        let inserted = 0;
        let updated = 0;
        const now = new Date().toISOString();
        const checkStmt = db.prepare('SELECT id FROM contacts WHERE LOWER(email) = LOWER(?)');
        const insertStmt = db.prepare(`
      INSERT INTO contacts (id, name, email, company, role, custom_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const updateStmt = db.prepare(`
      UPDATE contacts 
      SET name = ?, company = COALESCE(?, company), role = COALESCE(?, role), custom_fields = COALESCE(?, custom_fields), updated_at = ?
      WHERE id = ?
    `);
        const tx = db.transaction((list) => {
            for (const item of list) {
                if (!item.email || !item.email.includes('@'))
                    continue;
                const normalizedEmail = item.email.trim().toLowerCase();
                const existing = checkStmt.get(normalizedEmail);
                const customFieldsStr = item.custom_fields ? JSON.stringify(item.custom_fields) : null;
                if (existing) {
                    updateStmt.run(item.name.trim() || 'Unknown', item.company?.trim() || null, item.role?.trim() || null, customFieldsStr, now, existing.id);
                    updated++;
                }
                else {
                    insertStmt.run(crypto_1.default.randomUUID(), item.name.trim() || 'Unknown', normalizedEmail, item.company?.trim() || null, item.role?.trim() || null, customFieldsStr, now, now);
                    inserted++;
                }
            }
        });
        tx(contactsList);
        return { inserted, updated };
    },
    update(id, updates) {
        const db = (0, database_js_1.getDb)();
        const existing = exports.ContactsModel.getById(id);
        if (!existing)
            return null;
        const now = new Date().toISOString();
        const customFieldsStr = updates.custom_fields !== undefined ? (updates.custom_fields ? JSON.stringify(updates.custom_fields) : null) : (existing.custom_fields ? JSON.stringify(existing.custom_fields) : null);
        db.prepare(`
      UPDATE contacts 
      SET name = ?, email = ?, company = ?, role = ?, custom_fields = ?, updated_at = ?
      WHERE id = ?
    `).run(updates.name !== undefined ? updates.name.trim() : existing.name, updates.email !== undefined ? updates.email.trim().toLowerCase() : existing.email, updates.company !== undefined ? updates.company?.trim() || null : existing.company, updates.role !== undefined ? updates.role?.trim() || null : existing.role, customFieldsStr, now, id);
        return exports.ContactsModel.getById(id);
    },
    delete(id) {
        const db = (0, database_js_1.getDb)();
        const res = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
        return res.changes > 0;
    },
    deleteAll() {
        const db = (0, database_js_1.getDb)();
        db.prepare('DELETE FROM contacts').run();
    }
};
exports.CampaignsModel = {
    list(limit = 100, offset = 0) {
        const db = (0, database_js_1.getDb)();
        const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
        return { campaigns: rows, total };
    },
    getById(id) {
        const db = (0, database_js_1.getDb)();
        const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
        return row || null;
    },
    create(campaign) {
        const db = (0, database_js_1.getDb)();
        const id = crypto_1.default.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO campaigns (
        id, name, subject, body_html, body_text, sender_name, sender_email,
        status, delay_seconds, total_recipients, sent_count, failed_count, attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(id, campaign.name, campaign.subject, campaign.body_html, campaign.body_text || null, campaign.sender_name || null, campaign.sender_email || null, campaign.status || 'draft', campaign.delay_seconds || 3, campaign.total_recipients || 0, campaign.attachments || null, now);
        return exports.CampaignsModel.getById(id);
    },
    update(id, updates) {
        const db = (0, database_js_1.getDb)();
        const keys = Object.keys(updates);
        if (keys.length === 0)
            return exports.CampaignsModel.getById(id);
        const setClauses = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => updates[k]);
        values.push(id);
        db.prepare(`UPDATE campaigns SET ${setClauses} WHERE id = ?`).run(...values);
        return exports.CampaignsModel.getById(id);
    },
    incrementCounters(id, sentInc, failedInc) {
        const db = (0, database_js_1.getDb)();
        db.prepare(`
      UPDATE campaigns 
      SET sent_count = sent_count + ?, failed_count = failed_count + ? 
      WHERE id = ?
    `).run(sentInc, failedInc, id);
    },
    delete(id) {
        const db = (0, database_js_1.getDb)();
        const res = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
        return res.changes > 0;
    }
};
exports.CampaignRecipientsModel = {
    createBatch(campaignId, recipients) {
        const db = (0, database_js_1.getDb)();
        const insertStmt = db.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, email, name, company, custom_data, status, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)
    `);
        const tx = db.transaction((list) => {
            for (const r of list) {
                insertStmt.run(crypto_1.default.randomUUID(), campaignId, r.email.trim().toLowerCase(), r.name?.trim() || null, r.company?.trim() || null, r.custom_data ? JSON.stringify(r.custom_data) : null);
            }
        });
        tx(recipients);
        return recipients.length;
    },
    listByCampaign(campaignId, status) {
        const db = (0, database_js_1.getDb)();
        let query = 'SELECT * FROM campaign_recipients WHERE campaign_id = ?';
        const params = [campaignId];
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY rowid ASC';
        const rows = db.prepare(query).all(...params);
        return rows.map(r => ({
            ...r,
            custom_data: r.custom_data ? JSON.parse(r.custom_data) : null
        }));
    },
    getNextPending(campaignId) {
        const db = (0, database_js_1.getDb)();
        const row = db.prepare(`
      SELECT * FROM campaign_recipients 
      WHERE campaign_id = ? AND status = 'pending' 
      ORDER BY rowid ASC LIMIT 1
    `).get(campaignId);
        if (!row)
            return null;
        return {
            ...row,
            custom_data: row.custom_data ? JSON.parse(row.custom_data) : null
        };
    },
    markSent(id) {
        const db = (0, database_js_1.getDb)();
        db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'sent', sent_at = ?, error_message = NULL 
      WHERE id = ?
    `).run(new Date().toISOString(), id);
    },
    markFailed(id, errorMessage) {
        const db = (0, database_js_1.getDb)();
        db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1 
      WHERE id = ?
    `).run(errorMessage, id);
    },
    resetFailedToPending(campaignId) {
        const db = (0, database_js_1.getDb)();
        const res = db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'pending', error_message = NULL 
      WHERE campaign_id = ? AND status = 'failed'
    `).run(campaignId);
        return res.changes;
    }
};
