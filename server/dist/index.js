"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const database_js_1 = require("./db/database.js");
const queueService_js_1 = require("./services/queueService.js");
const auth_js_1 = require("./routes/auth.js");
const campaigns_js_1 = require("./routes/campaigns.js");
const contacts_js_1 = require("./routes/contacts.js");
const csv_js_1 = require("./routes/csv.js");
const settings_js_1 = require("./routes/settings.js");
const stats_js_1 = require("./routes/stats.js");
const attachments_js_1 = require("./routes/attachments.js");
const app = (0, express_1.default)();
const clientOrigin = config_js_1.config.clientUrl || '*';
app.use((0, cors_1.default)({
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'MailFlow API', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_js_1.authRouter);
app.use('/api/campaigns', campaigns_js_1.campaignsRouter);
app.use('/api/contacts', contacts_js_1.contactsRouter);
app.use('/api/csv', csv_js_1.csvRouter);
app.use('/api/settings', settings_js_1.settingsRouter);
app.use('/api/stats', stats_js_1.statsRouter);
app.use('/api/attachments', attachments_js_1.attachmentsRouter);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[MailFlow Server Error]:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
// Initialize database and start queue
try {
    (0, database_js_1.getDb)();
    console.log('✅ SQLite Database initialized successfully');
    queueService_js_1.queueService.init();
}
catch (e) {
    console.error('❌ Failed to initialize database:', e);
}
// Start standalone server locally (disabled on Vercel Serverless)
if (!process.env.VERCEL) {
    app.listen(config_js_1.config.port, () => {
        console.log(`🚀 MailFlow Server running at http://localhost:${config_js_1.config.port}`);
    });
}
exports.default = app;
