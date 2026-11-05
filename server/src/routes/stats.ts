import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { getGmailStatus } from '../services/googleAuth.js';
import { SettingsModel } from '../db/models.js';

export const statsRouter = Router();

statsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();

  // Contact count
  const contactsCount = (db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number }).count;

  // Aggregate campaign numbers
  const statsRow = db.prepare(`
    SELECT 
      COALESCE(SUM(sent_count), 0) as totalSent,
      COALESCE(SUM(failed_count), 0) as totalFailed,
      COALESCE(SUM(CASE WHEN status IN ('queued', 'sending') THEN (total_recipients - sent_count - failed_count) ELSE 0 END), 0) as totalPending,
      COUNT(*) as totalCampaigns
    FROM campaigns
  `).get() as { totalSent: number; totalFailed: number; totalPending: number; totalCampaigns: number };

  // Sent today count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const sentTodayRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM campaign_recipients 
    WHERE status = 'sent' AND sent_at >= ?
  `).get(todayStartIso) as { count: number };

  // Recent campaigns
  const recentCampaigns = db.prepare(`
    SELECT id, name, subject, status, total_recipients, sent_count, failed_count, created_at, completed_at 
    FROM campaigns 
    ORDER BY created_at DESC 
    LIMIT 6
  `).all();

  const gmailStatus = getGmailStatus();
  const dailyLimit = parseInt(SettingsModel.get('daily_sending_limit') || '500', 10);
  const isSimulationMode = SettingsModel.get('simulation_mode') === 'true';

  res.json({
    totalContacts: contactsCount,
    emailsSent: statsRow.totalSent,
    pendingEmails: Math.max(0, statsRow.totalPending),
    failedEmails: statsRow.totalFailed,
    totalCampaigns: statsRow.totalCampaigns,
    sentToday: sentTodayRow.count,
    dailyLimit,
    gmail: {
      ...gmailStatus,
      isSimulationMode,
    },
    recentCampaigns,
  });
});

