import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${unique}${ext}`);
  },
});

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit per attachment (well within Gmail 25MB total)
  },
});

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB CSV
  },
});

