import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env (no-op on Vercel since env vars are injected directly)
dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// On Vercel, the filesystem is ephemeral — data/uploads directories may not
// persist between function invocations. For production use, replace SQLite
// with a hosted database (e.g. Vercel Postgres) and uploads with object storage.
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
    // GOOGLE_REDIRECT_URI must point to the public /api/auth/google/callback URL.
    // On Vercel set this to: https://<your-project>.vercel.app/api/auth/google/callback
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

