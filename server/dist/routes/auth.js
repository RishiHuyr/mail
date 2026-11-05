"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const googleAuth_js_1 = require("../services/googleAuth.js");
const models_js_1 = require("../db/models.js");
const config_js_1 = require("../config.js");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.get('/status', (req, res) => {
    const status = (0, googleAuth_js_1.getGmailStatus)();
    const isSimulationMode = models_js_1.SettingsModel.get('simulation_mode') === 'true';
    res.json({
        ...status,
        isSimulationMode,
    });
});
exports.authRouter.get('/google/url', (req, res) => {
    const result = (0, googleAuth_js_1.getAuthUrl)();
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    res.json({ url: result.url });
});
exports.authRouter.get('/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.redirect(`${config_js_1.config.clientUrl}/settings?auth_error=missing_code`);
    }
    const result = await (0, googleAuth_js_1.handleOAuthCallback)(code);
    if (result.success) {
        return res.redirect(`${config_js_1.config.clientUrl}/settings?auth=success&email=${encodeURIComponent(result.email || '')}`);
    }
    else {
        return res.redirect(`${config_js_1.config.clientUrl}/settings?auth_error=${encodeURIComponent(result.error || 'Failed to authenticate')}`);
    }
});
exports.authRouter.post('/google/disconnect', (req, res) => {
    (0, googleAuth_js_1.disconnectGmail)();
    res.json({ success: true, message: 'Gmail account disconnected successfully' });
});
exports.authRouter.post('/credentials', (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body;
    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Both Client ID and Client Secret are required.' });
    }
    models_js_1.SettingsModel.set('google_client_id', clientId.trim());
    models_js_1.SettingsModel.set('google_client_secret', clientSecret.trim());
    if (redirectUri) {
        models_js_1.SettingsModel.set('google_redirect_uri', redirectUri.trim());
    }
    res.json({
        success: true,
        message: 'Google OAuth credentials saved successfully.',
        status: (0, googleAuth_js_1.getGmailStatus)(),
    });
});
exports.authRouter.post('/toggle-simulation', (req, res) => {
    const current = models_js_1.SettingsModel.get('simulation_mode') === 'true';
    const next = !current;
    models_js_1.SettingsModel.set('simulation_mode', next ? 'true' : 'false');
    if (next && !models_js_1.SettingsModel.get('google_connected_email')) {
        // Set a friendly demo account indicator in simulation mode if not connected
        models_js_1.SettingsModel.set('google_connected', 'true');
        models_js_1.SettingsModel.set('google_connected_email', 'demo.user@mailflow.app');
        models_js_1.SettingsModel.set('google_user_name', 'Demo User');
        models_js_1.SettingsModel.set('google_connected_at', new Date().toISOString());
    }
    res.json({
        success: true,
        simulationMode: next,
        status: (0, googleAuth_js_1.getGmailStatus)(),
    });
});
