import { getDb } from './database.js';
import crypto from 'crypto';

export interface SettingItem {
  key: string;
  value: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  role?: string | null;
  custom_fields?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  status: 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'cancelled' | 'failed';
  delay_seconds: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  attachments?: string | null; // JSON array of { filename, originalName, path, size, mimeType }
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  custom_data?: Record<string, any> | null;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string | null;
  error_message?: string | null;
  retry_count: number;
}

export const SettingsModel = {
  get(key: string): string | null {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  },

  getAll(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const res: Record<string, string> = {};
    for (const r of rows) {
      res[r.key] = r.value;
    }
    return res;
  },

  set(key: string, value: string): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, new Date().toISOString());
  },

  setMany(entries: Record<string, string>): void {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();
    const tx = db.transaction((items: Record<string, string>) => {
      for (const [k, v] of Object.entries(items)) {
        stmt.run(k, v, now);
      }
    });
    tx(entries);
  },

  delete(key: string): void {
    const db = getDb();
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
};

export const ContactsModel = {
  list(search?: string, limit = 500, offset = 0): { contacts: Contact[]; total: number } {
    const db = getDb();
    let query = 'SELECT * FROM contacts';
    let countQuery = 'SELECT COUNT(*) as count FROM contacts';
    const params: any[] = [];
    const countParams: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?';
      countQuery += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?';
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as any[];
    const totalRow = db.prepare(countQuery).get(...countParams) as { count: number };

    return {
      contacts: rows.map(r => ({
        ...r,
        custom_fields: r.custom_fields ? JSON.parse(r.custom_fields) : null
      })),
      total: totalRow.count
    };
  },

  getById(id: string): Contact | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      ...row,
      custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : null
    };
  },

  getByEmail(email: string): Contact | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM contacts WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (!row) return null;
    return {
      ...row,
      custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : null
    };
  },

  create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
    const db = getDb();
    const id = crypto.randomUUID();
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

  upsertMany(contactsList: Array<{ name: string; email: string; company?: string; role?: string; custom_fields?: Record<string, any> }>): { inserted: number; updated: number } {
    const db = getDb();
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

    const tx = db.transaction((list: typeof contactsList) => {
      for (const item of list) {
        if (!item.email || !item.email.includes('@')) continue;
        const normalizedEmail = item.email.trim().toLowerCase();
        const existing = checkStmt.get(normalizedEmail) as { id: string } | undefined;
        const customFieldsStr = item.custom_fields ? JSON.stringify(item.custom_fields) : null;

        if (existing) {
          updateStmt.run(
            item.name.trim() || 'Unknown',
            item.company?.trim() || null,
            item.role?.trim() || null,
            customFieldsStr,
            now,
            existing.id
          );
          updated++;
        } else {
          insertStmt.run(
            crypto.randomUUID(),
            item.name.trim() || 'Unknown',
            normalizedEmail,
            item.company?.trim() || null,
            item.role?.trim() || null,
            customFieldsStr,
            now,
            now
          );
          inserted++;
        }
      }
    });

    tx(contactsList);
    return { inserted, updated };
  },

  update(id: string, updates: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>): Contact | null {
    const db = getDb();
    const existing = ContactsModel.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const customFieldsStr = updates.custom_fields !== undefined ? (updates.custom_fields ? JSON.stringify(updates.custom_fields) : null) : (existing.custom_fields ? JSON.stringify(existing.custom_fields) : null);

    db.prepare(`
      UPDATE contacts 
      SET name = ?, email = ?, company = ?, role = ?, custom_fields = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updates.name !== undefined ? updates.name.trim() : existing.name,
      updates.email !== undefined ? updates.email.trim().toLowerCase() : existing.email,
      updates.company !== undefined ? updates.company?.trim() || null : existing.company,
      updates.role !== undefined ? updates.role?.trim() || null : existing.role,
      customFieldsStr,
      now,
      id
    );

    return ContactsModel.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    return res.changes > 0;
  },

  deleteAll(): void {
    const db = getDb();
    db.prepare('DELETE FROM contacts').run();
  }
};

export const CampaignsModel = {
  list(limit = 100, offset = 0): { campaigns: Campaign[]; total: number } {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Campaign[];
    const total = (db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }).count;
    return { campaigns: rows, total };
  },

  getById(id: string): Campaign | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign | undefined;
    return row || null;
  },

  create(campaign: Omit<Campaign, 'id' | 'created_at' | 'sent_count' | 'failed_count' | 'started_at' | 'completed_at'>): Campaign {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO campaigns (
        id, name, subject, body_html, body_text, sender_name, sender_email,
        status, delay_seconds, total_recipients, sent_count, failed_count, attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      campaign.name,
      campaign.subject,
      campaign.body_html,
      campaign.body_text || null,
      campaign.sender_name || null,
      campaign.sender_email || null,
      campaign.status || 'draft',
      campaign.delay_seconds || 3,
      campaign.total_recipients || 0,
      campaign.attachments || null,
      now
    );

    return CampaignsModel.getById(id)!;
  },

  update(id: string, updates: Partial<Campaign>): Campaign | null {
    const db = getDb();
    const keys = Object.keys(updates);
    if (keys.length === 0) return CampaignsModel.getById(id);

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    values.push(id);

    db.prepare(`UPDATE campaigns SET ${setClauses} WHERE id = ?`).run(...values);
    return CampaignsModel.getById(id);
  },

  incrementCounters(id: string, sentInc: number, failedInc: number): void {
    const db = getDb();
    db.prepare(`
      UPDATE campaigns 
      SET sent_count = sent_count + ?, failed_count = failed_count + ? 
      WHERE id = ?
    `).run(sentInc, failedInc, id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return res.changes > 0;
  }
};

export const CampaignRecipientsModel = {
  createBatch(campaignId: string, recipients: Array<{ email: string; name?: string; company?: string; custom_data?: Record<string, any> }>): number {
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, email, name, company, custom_data, status, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)
    `);

    const tx = db.transaction((list: typeof recipients) => {
      for (const r of list) {
        insertStmt.run(
          crypto.randomUUID(),
          campaignId,
          r.email.trim().toLowerCase(),
          r.name?.trim() || null,
          r.company?.trim() || null,
          r.custom_data ? JSON.stringify(r.custom_data) : null
        );
      }
    });

    tx(recipients);
    return recipients.length;
  },

  listByCampaign(campaignId: string, status?: string): CampaignRecipient[] {
    const db = getDb();
    let query = 'SELECT * FROM campaign_recipients WHERE campaign_id = ?';
    const params: any[] = [campaignId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY rowid ASC';
    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(r => ({
      ...r,
      custom_data: r.custom_data ? JSON.parse(r.custom_data) : null
    }));
  },

  getNextPending(campaignId: string): CampaignRecipient | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM campaign_recipients 
      WHERE campaign_id = ? AND status = 'pending' 
      ORDER BY rowid ASC LIMIT 1
    `).get(campaignId) as any;

    if (!row) return null;
    return {
      ...row,
      custom_data: row.custom_data ? JSON.parse(row.custom_data) : null
    };
  },

  markSent(id: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'sent', sent_at = ?, error_message = NULL 
      WHERE id = ?
    `).run(new Date().toISOString(), id);
  },

  markFailed(id: string, errorMessage: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1 
      WHERE id = ?
    `).run(errorMessage, id);
  },

  resetFailedToPending(campaignId: string): number {
    const db = getDb();
    const res = db.prepare(`
      UPDATE campaign_recipients 
      SET status = 'pending', error_message = NULL 
      WHERE campaign_id = ? AND status = 'failed'
    `).run(campaignId);
    return res.changes;
  }
};

