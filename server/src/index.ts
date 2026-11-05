import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getDb } from './db/database.js';
import { queueService } from './services/queueService.js';
import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { contactsRouter } from './routes/contacts.js';
import { csvRouter } from './routes/csv.js';
import { settingsRouter } from './routes/settings.js';
import { statsRouter } from './routes/stats.js';
import { attachmentsRouter } from './routes/attachments.js';

const app = express();

// Determine allowed CORS origin: on Vercel the client is served from the
// same domain via the top-level rewrite, so we can allow the CLIENT_URL.
const clientOrigin = config.clientUrl || '*';

app.use(cors({
  origin: clientOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'MailFlow API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/csv', csvRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/attachments', attachmentsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[MailFlow Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize database and start queue
try {
  getDb();
  console.log('✅ SQLite Database initialized successfully');
  queueService.init();
} catch (e) {
  console.error('❌ Failed to initialize database:', e);
}

// Start server (not used by Vercel, but needed for local development)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 MailFlow Server running at http://localhost:${config.port}`);
  });
}

export default app;
