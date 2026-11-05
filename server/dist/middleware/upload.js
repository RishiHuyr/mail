"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCsv = exports.uploadAttachment = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const config_js_1 = require("../config.js");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config_js_1.config.uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const unique = `${Date.now()}-${crypto_1.default.randomBytes(6).toString('hex')}`;
        cb(null, `${unique}${ext}`);
    },
});
exports.uploadAttachment = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit per attachment (well within Gmail 25MB total)
    },
});
exports.uploadCsv = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB CSV
    },
});
