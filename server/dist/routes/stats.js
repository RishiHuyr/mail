"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const googleAuth_js_1 = require("../services/googleAuth.js");
const models_js_1 = require("../db/models.js");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get('/', (req, res) => {
    const db = (0, database_js_1.getDb)();
    // Contact count
    const contactsCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    // Aggregate campaign numbers
    const statsRow = db.prepare(`
    SELECT 
      COALESCE(SUM(sent_count), 0) as totalSent,
      COALESCE(SUM(failed_count), 0) as totalFailed,
      COALESCE(SUM(CASE WHEN status IN ('queued', 'sending') THEN (total_recipients - sent_count - failed_count) ELSE 0 END), 0) as totalPending,
      COUNT(*) as totalCampaigns
    FROM campaigns
  `).get();
    // Sent today count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();
    const sentTodayRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM campaign_recipients 
    WHERE status = 'sent' AND sent_at >= ?
  `).get(todayStartIso);
    // Recent campaigns
    const recentCampaigns = db.prepare(`
    SELECT id, name, subject, status, total_recipients, sent_count, failed_count, created_at, completed_at 
    FROM campaigns 
    ORDER BY created_at DESC 
    LIMIT 6
  `).all();
    const gmailStatus = (0, googleAuth_js_1.getGmailStatus)();
    const dailyLimit = parseInt(models_js_1.SettingsModel.get('daily_sending_limit') || '500', 10);
    const isSimulationMode = models_js_1.SettingsModel.get('simulation_mode') === 'true';
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
