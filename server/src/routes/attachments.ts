import { Router, Request, Response } from 'express';
import { uploadAttachment } from '../middleware/upload.js';

export const attachmentsRouter = Router();

// Upload attachment
attachmentsRouter.post('/upload', uploadAttachment.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

