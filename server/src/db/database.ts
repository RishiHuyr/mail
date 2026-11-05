import Database from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    -- Settings table for credentials, preferences, signature, etc.
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Contacts directory
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      company TEXT,
      role TEXT,
      custom_fields TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Campaigns
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      sender_name TEXT,
      sender_email TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      delay_seconds INTEGER NOT NULL DEFAULT 3,
      total_recipients INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      attachments TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      error_message TEXT
    );

    -- Individual recipients for each campaign
    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      company TEXT,
      custom_data TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TEXT,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);
  `);

  // Initialize default settings if not present
  const defaultSettings: Record<string, string> = {
    sender_name: 'Personal Outreach',
    default_delay_seconds: '3',
    email_signature: '<p style="margin-top: 16px; color: #475569; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 12px;">Best regards,<br><strong>MailFlow User</strong></p>',
    append_signature: 'true',
    append_unsubscribe: 'false',
    daily_sending_limit: '500',
    google_connected: 'false',
  };

  const getStmt = database.prepare('SELECT value FROM settings WHERE key = ?');
  const insertStmt = database.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = getStmt.get(key);
    if (!existing) {
      insertStmt.run(key, value, new Date().toISOString());
    }
  }
}

