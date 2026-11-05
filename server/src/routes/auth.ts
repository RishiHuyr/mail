import { Router, Request, Response } from 'express';
import { getAuthUrl, handleOAuthCallback, getGmailStatus, disconnectGmail, getClientCredentials } from '../services/googleAuth.js';
import { SettingsModel } from '../db/models.js';
import { config } from '../config.js';

export const authRouter = Router();

authRouter.get('/status', (req: Request, res: Response) => {
  const status = getGmailStatus();
  const isSimulationMode = SettingsModel.get('simulation_mode') === 'true';
  res.json({
    ...status,
    isSimulationMode,
  });
});

authRouter.get('/google/url', (req: Request, res: Response) => {
  const result = getAuthUrl();
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ url: result.url });
});

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(`${config.clientUrl}/settings?auth_error=missing_code`);
  }

  const result = await handleOAuthCallback(code);
  if (result.success) {
    return res.redirect(`${config.clientUrl}/settings?auth=success&email=${encodeURIComponent(result.email || '')}`);
  } else {
    return res.redirect(`${config.clientUrl}/settings?auth_error=${encodeURIComponent(result.error || 'Failed to authenticate')}`);
  }
});

authRouter.post('/google/disconnect', (req: Request, res: Response) => {
  disconnectGmail();
  res.json({ success: true, message: 'Gmail account disconnected successfully' });
});

authRouter.post('/credentials', (req: Request, res: Response) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Both Client ID and Client Secret are required.' });
  }

  SettingsModel.set('google_client_id', clientId.trim());
  SettingsModel.set('google_client_secret', clientSecret.trim());
  if (redirectUri) {
    SettingsModel.set('google_redirect_uri', redirectUri.trim());
  }

  res.json({
    success: true,
    message: 'Google OAuth credentials saved successfully.',
    status: getGmailStatus(),
  });
});

authRouter.post('/toggle-simulation', (req: Request, res: Response) => {
  const current = SettingsModel.get('simulation_mode') === 'true';
  const next = !current;
  SettingsModel.set('simulation_mode', next ? 'true' : 'false');

  if (next && !SettingsModel.get('google_connected_email')) {
    // Set a friendly demo account indicator in simulation mode if not connected
    SettingsModel.set('google_connected', 'true');
    SettingsModel.set('google_connected_email', 'demo.user@mailflow.app');
    SettingsModel.set('google_user_name', 'Demo User');
    SettingsModel.set('google_connected_at', new Date().toISOString());
  }

  res.json({
    success: true,
    simulationMode: next,
    status: getGmailStatus(),
  });
});

