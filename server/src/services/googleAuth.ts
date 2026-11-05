import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { SettingsModel } from '../db/models.js';

export function getClientCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  const dbClientId = SettingsModel.get('google_client_id');
  const dbClientSecret = SettingsModel.get('google_client_secret');
  const dbRedirectUri = SettingsModel.get('google_redirect_uri');

  const clientId = dbClientId || config.google.clientId;
  const clientSecret = dbClientSecret || config.google.clientSecret;
  const redirectUri = dbRedirectUri || config.google.redirectUri;

  return { clientId, clientSecret, redirectUri };
}

export function createOAuth2Client(): OAuth2Client | null {
  const { clientId, clientSecret, redirectUri } = getClientCredentials();
  if (!clientId || !clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): { url: string; error?: string } {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return {
      url: '',
      error: 'Google Client ID and Client Secret are not configured yet. Please enter them in Settings or .env file.'
    };
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: config.google.scopes,
  });

  return { url };
}

export async function handleOAuthCallback(code: string): Promise<{ success: boolean; email?: string; error?: string }> {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return { success: false, error: 'OAuth2 client not initialized. Missing credentials.' };
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email || '';
    const name = userInfo.data.name || '';
    const picture = userInfo.data.picture || '';

    // Save tokens and user info in DB
    const updates: Record<string, string> = {
      google_connected: 'true',
      google_connected_email: email,
      google_user_name: name,
      google_user_avatar: picture,
      google_connected_at: new Date().toISOString(),
    };

    if (tokens.access_token) {
      updates.google_access_token = tokens.access_token;
    }
    if (tokens.refresh_token) {
      updates.google_refresh_token = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updates.google_token_expiry = tokens.expiry_date.toString();
    }

    SettingsModel.setMany(updates);

    return { success: true, email };
  } catch (err: any) {
    console.error('Error handling Google OAuth callback:', err);
    return { success: false, error: err.message || 'Failed to exchange authorization code' };
  }
}

export async function getAuthenticatedClient(): Promise<{ client: OAuth2Client | null; error?: string; isSimulated?: boolean }> {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    // Check if simulation mode is enabled or credentials missing
    return { client: null, error: 'Google OAuth credentials (Client ID / Client Secret) are not configured.' };
  }

  const accessToken = SettingsModel.get('google_access_token');
  const refreshToken = SettingsModel.get('google_refresh_token');
  const expiryDate = SettingsModel.get('google_token_expiry');

  if (!refreshToken && !accessToken) {
    return { client: null, error: 'No Gmail account is connected. Please connect your Gmail in Settings.' };
  }

  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: expiryDate ? parseInt(expiryDate, 10) : undefined,
  });

  // Check if token is expired and refresh if necessary
  if (expiryDate && Date.now() >= parseInt(expiryDate, 10) - 60000 && refreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newTokens = refreshed.credentials;
      if (newTokens.access_token) {
        SettingsModel.set('google_access_token', newTokens.access_token);
      }
      if (newTokens.expiry_date) {
        SettingsModel.set('google_token_expiry', newTokens.expiry_date.toString());
      }
    } catch (e: any) {
      console.error('Failed to refresh Gmail access token:', e);
      return { client: null, error: 'Failed to refresh Gmail access token. Please reconnect your account.' };
    }
  }

  return { client: oauth2Client };
}

export function getGmailStatus(): {
  connected: boolean;
  email: string | null;
  name: string | null;
  avatar: string | null;
  connectedAt: string | null;
  hasCredentials: boolean;
  clientIdPreview: string | null;
} {
  const { clientId, clientSecret } = getClientCredentials();
  const hasCredentials = Boolean(clientId && clientSecret);
  const connected = SettingsModel.get('google_connected') === 'true';
  const email = SettingsModel.get('google_connected_email');
  const name = SettingsModel.get('google_user_name');
  const avatar = SettingsModel.get('google_user_avatar');
  const connectedAt = SettingsModel.get('google_connected_at');

  return {
    connected: connected && Boolean(email),
    email,
    name,
    avatar,
    connectedAt,
    hasCredentials,
    clientIdPreview: clientId ? `${clientId.slice(0, 10)}...${clientId.slice(-8)}` : null,
  };
}

export function disconnectGmail(): void {
  SettingsModel.set('google_connected', 'false');
  SettingsModel.delete('google_access_token');
  SettingsModel.delete('google_refresh_token');
  SettingsModel.delete('google_token_expiry');
  SettingsModel.delete('google_connected_email');
  SettingsModel.delete('google_user_name');
  SettingsModel.delete('google_user_avatar');
  SettingsModel.delete('google_connected_at');
}

