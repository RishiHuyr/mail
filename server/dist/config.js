"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load .env (no-op on Vercel since env vars are injected directly)
dotenv_1.default.config();
// On Vercel, serverless function environment is read-only except /tmp.
// Use /tmp for mutable data when running in Vercel.
const isVercel = !!process.env.VERCEL;
const ROOT_DIR = process.cwd();
const DATA_DIR = isVercel ? '/tmp/mailflow-data' : path_1.default.join(ROOT_DIR, 'data');
const UPLOADS_DIR = isVercel ? '/tmp/mailflow-uploads' : path_1.default.join(ROOT_DIR, 'uploads');
// Ensure directories exist at startup
try {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(UPLOADS_DIR)) {
        fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}
catch (e) {
    console.warn('[config] Could not create data/uploads dirs:', e);
}
// In Vercel Services, APP_URL is injected by Vercel when bound to the 'app' service.
// CLIENT_URL or VERCEL_URL can also be used as fallbacks.
const clientUrl = process.env.APP_URL ||
    process.env.CLIENT_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dataDir: DATA_DIR,
    uploadsDir: UPLOADS_DIR,
    dbPath: path_1.default.join(DATA_DIR, 'mailflow.db'),
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI ||
            `${clientUrl}/api/auth/google/callback`,
        scopes: [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
    },
    clientUrl,
};
