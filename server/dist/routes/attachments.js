"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentsRouter = void 0;
const express_1 = require("express");
const upload_js_1 = require("../middleware/upload.js");
exports.attachmentsRouter = (0, express_1.Router)();
// Upload attachment
exports.attachmentsRouter.post('/upload', upload_js_1.uploadAttachment.single('file'), (req, res) => {
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
