"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvRouter = void 0;
const express_1 = require("express");
const upload_js_1 = require("../middleware/upload.js");
const csvService_js_1 = require("../services/csvService.js");
exports.csvRouter = (0, express_1.Router)();
// Upload and parse CSV file
exports.csvRouter.post('/parse', upload_js_1.uploadCsv.single('file'), (req, res) => {
    try {
        let content = '';
        if (req.file) {
            content = req.file.buffer.toString('utf-8');
        }
        else if (req.body && typeof req.body.content === 'string') {
            content = req.body.content;
        }
        else {
            return res.status(400).json({ error: 'No CSV file or content provided' });
        }
        const result = (0, csvService_js_1.parseCsvContent)(content);
        res.json(result);
    }
    catch (err) {
        console.error('Error parsing CSV:', err);
        res.status(500).json({ error: err.message || 'Failed to parse CSV file' });
    }
});
