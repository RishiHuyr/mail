import { Router, Request, Response } from 'express';
import { uploadCsv } from '../middleware/upload.js';
import { parseCsvContent } from '../services/csvService.js';

export const csvRouter = Router();

// Upload and parse CSV file
csvRouter.post('/parse', uploadCsv.single('file'), (req: Request, res: Response) => {
  try {
    let content = '';

    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body && typeof req.body.content === 'string') {
      content = req.body.content;
    } else {
      return res.status(400).json({ error: 'No CSV file or content provided' });
    }

    const result = parseCsvContent(content);
    res.json(result);
  } catch (err: any) {
    console.error('Error parsing CSV:', err);
    res.status(500).json({ error: err.message || 'Failed to parse CSV file' });
  }
});

