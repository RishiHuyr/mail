import { Router, Request, Response } from 'express';
import { SettingsModel } from '../db/models.js';
import { getGmailStatus } from '../services/googleAuth.js';

export const settingsRouter = Router();

// Get settings
settingsRouter.get('/', (req: Request, res: Response) => {
  const all = SettingsModel.getAll();

  // Don't expose sensitive client secrets or tokens in full
  const safeSettings = {
    sender_name: all.sender_name || 'Personal Outreach',
    default_delay_seconds: parseInt(all.default_delay_seconds || '3', 10),
    email_signature: all.email_signature || '',
    append_signature: all.append_signature === 'true',
    append_unsubscribe: all.append_unsubscribe === 'true',
    daily_sending_limit: parseInt(all.daily_sending_limit || '500', 10),
    simulation_mode: all.simulation_mode === 'true',
    gmail_status: getGmailStatus(),
  };

  res.json(safeSettings);
});

// Update settings
settingsRouter.put('/', (req: Request, res: Response) => {
  const {
    sender_name,
    default_delay_seconds,
    email_signature,
    append_signature,
    append_unsubscribe,
    daily_sending_limit,
    simulation_mode,
  } = req.body;

  const updates: Record<string, string> = {};

  if (sender_name !== undefined) updates.sender_name = String(sender_name);
  if (default_delay_seconds !== undefined) updates.default_delay_seconds = String(default_delay_seconds);
  if (email_signature !== undefined) updates.email_signature = String(email_signature);
  if (append_signature !== undefined) updates.append_signature = append_signature ? 'true' : 'false';
  if (append_unsubscribe !== undefined) updates.append_unsubscribe = append_unsubscribe ? 'true' : 'false';
  if (daily_sending_limit !== undefined) updates.daily_sending_limit = String(daily_sending_limit);
  if (simulation_mode !== undefined) updates.simulation_mode = simulation_mode ? 'true' : 'false';

  SettingsModel.setMany(updates);

  res.json({
    success: true,
    message: 'Settings updated successfully',
  });
});

