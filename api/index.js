// Vercel Serverless Function - Entry point for all /api/* routes
// This file wraps the compiled Express app from server/dist/index.js
'use strict';

const serverModule = require('../server/dist/index.js');
module.exports = serverModule.default || serverModule;
