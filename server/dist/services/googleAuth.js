"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientCredentials = getClientCredentials;
exports.createOAuth2Client = createOAuth2Client;
exports.getAuthUrl = getAuthUrl;
exports.handleOAuthCallback = handleOAuthCallback;
exports.getAuthenticatedClient = getAuthenticatedClient;
exports.getGmailStatus = getGmailStatus;
exports.disconnectGmail = disconnectGmail;
const googleapis_1 = require("googleapis");
const config_js_1 = require("../config.js");
const models_js_1 = require("../db/models.js");
function getClientCredentials() {
    const dbClientId = models_js_1.SettingsModel.get('google_client_id');
    const dbClientSecret = models_js_1.SettingsModel.get('google_client_secret');
    const dbRedirectUri = models_js_1.SettingsModel.get('google_redirect_uri');
    const clientId = dbClientId || config_js_1.config.google.clientId;
    const clientSecret = dbClientSecret || config_js_1.config.google.clientSecret;
    const redirectUri = dbRedirectUri || config_js_1.config.google.redirectUri;
    return { clientId, clientSecret, redirectUri };
}
function createOAuth2Client() {
    const { clientId, clientSecret, redirectUri } = getClientCredentials();
    if (!clientId || !clientSecret) {
        return null;
    }
    return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
function getAuthUrl() {
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
        scope: config_js_1.config.google.scopes,
    });
    return { url };
}
async function handleOAuthCallback(code) {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
        return { success: false, error: 'OAuth2 client not initialized. Missing credentials.' };
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Fetch user profile info
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email || '';
        const name = userInfo.data.name || '';
        const picture = userInfo.data.picture || '';
        // Save tokens and user info in DB
        const updates = {
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
        models_js_1.SettingsModel.setMany(updates);
        return { success: true, email };
    }
    catch (err) {
        console.error('Error handling Google OAuth callback:', err);
        return { success: false, error: err.message || 'Failed to exchange authorization code' };
    }
}
async function getAuthenticatedClient() {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
        // Check if simulation mode is enabled or credentials missing
        return { client: null, error: 'Google OAuth credentials (Client ID / Client Secret) are not configured.' };
    }
    const accessToken = models_js_1.SettingsModel.get('google_access_token');
    const refreshToken = models_js_1.SettingsModel.get('google_refresh_token');
    const expiryDate = models_js_1.SettingsModel.get('google_token_expiry');
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
                models_js_1.SettingsModel.set('google_access_token', newTokens.access_token);
            }
            if (newTokens.expiry_date) {
                models_js_1.SettingsModel.set('google_token_expiry', newTokens.expiry_date.toString());
            }
        }
        catch (e) {
            console.error('Failed to refresh Gmail access token:', e);
            return { client: null, error: 'Failed to refresh Gmail access token. Please reconnect your account.' };
        }
    }
    return { client: oauth2Client };
}
function getGmailStatus() {
    const { clientId, clientSecret } = getClientCredentials();
    const hasCredentials = Boolean(clientId && clientSecret);
    const connected = models_js_1.SettingsModel.get('google_connected') === 'true';
    const email = models_js_1.SettingsModel.get('google_connected_email');
    const name = models_js_1.SettingsModel.get('google_user_name');
    const avatar = models_js_1.SettingsModel.get('google_user_avatar');
    const connectedAt = models_js_1.SettingsModel.get('google_connected_at');
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
function disconnectGmail() {
    models_js_1.SettingsModel.set('google_connected', 'false');
    models_js_1.SettingsModel.delete('google_access_token');
    models_js_1.SettingsModel.delete('google_refresh_token');
    models_js_1.SettingsModel.delete('google_token_expiry');
    models_js_1.SettingsModel.delete('google_connected_email');
    models_js_1.SettingsModel.delete('google_user_name');
    models_js_1.SettingsModel.delete('google_user_avatar');
    models_js_1.SettingsModel.delete('google_connected_at');
}
