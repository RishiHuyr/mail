import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env (no-op on Vercel since env vars are injected directly)
dotenv.config();

// On Vercel, serverless function environment is read-only except /tmp.
// Use /tmp for mutable data when running in Vercel.
const isVercel = !!process.env.VERCEL;

const ROOT_DIR = process.cwd();
const DATA_DIR = isVercel ? '/tmp/mailflow-data' : path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = isVercel ? '/tmp/mailflow-uploads' : path.join(ROOT_DIR, 'uploads');

// Ensure directories exist at startup
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[config] Could not create data/uploads dirs:', e);
}

// On Vercel, VERCEL_URL is auto-set to the deployment's hostname (no protocol).
// CLIENT_URL should be explicitly set to the full public URL of the project
// (e.g. https://mail-rishi.vercel.app) so OAuth redirects work correctly.
const clientUrl =
  process.env.CLIENT_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR,
  dbPath: path.join(DATA_DIR, 'mailflow.db'),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
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
