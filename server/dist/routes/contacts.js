"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsRouter = void 0;
const express_1 = require("express");
const models_js_1 = require("../db/models.js");
const csvService_js_1 = require("../services/csvService.js");
exports.contactsRouter = (0, express_1.Router)();
// List contacts with search & pagination
exports.contactsRouter.get('/', (req, res) => {
    const search = req.query.search;
    const limit = parseInt(req.query.limit) || 500;
    const offset = parseInt(req.query.offset) || 0;
    const result = models_js_1.ContactsModel.list(search, limit, offset);
    res.json(result);
});
// Get single contact
exports.contactsRouter.get('/:id', (req, res) => {
    const contact = models_js_1.ContactsModel.getById(req.params.id);
    if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
});
// Create single contact
exports.contactsRouter.post('/', (req, res) => {
    const { name, email, company, role, custom_fields } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }
    const existing = models_js_1.ContactsModel.getByEmail(email);
    if (existing) {
        return res.status(409).json({ error: 'A contact with this email already exists' });
    }
    const created = models_js_1.ContactsModel.create({
        name: name || email.split('@')[0],
        email,
        company,
        role,
        custom_fields,
    });
    res.status(201).json(created);
});
// Bulk import contacts
exports.contactsRouter.post('/import', (req, res) => {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ error: 'Invalid contacts list provided' });
    }
    const result = models_js_1.ContactsModel.upsertMany(contacts);
    res.json({
        success: true,
        message: `Imported ${result.inserted} new contacts, updated ${result.updated} existing contacts.`,
        ...result,
    });
});
// Update contact
exports.contactsRouter.put('/:id', (req, res) => {
    const updated = models_js_1.ContactsModel.update(req.params.id, req.body);
    if (!updated) {
        return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(updated);
});
// Delete contact
exports.contactsRouter.delete('/:id', (req, res) => {
    const success = models_js_1.ContactsModel.delete(req.params.id);
    if (!success) {
        return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted successfully' });
});
// Export all contacts as CSV
exports.contactsRouter.get('/export/csv', (req, res) => {
    const { contacts } = models_js_1.ContactsModel.list(undefined, 10000, 0);
    const rows = contacts.map(c => ({
        Name: c.name,
        Email: c.email,
        Company: c.company || '',
        Role: c.role || '',
        CreatedAt: c.created_at,
    }));
    const csv = (0, csvService_js_1.generateCsv)(rows, ['Name', 'Email', 'Company', 'Role', 'CreatedAt']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mailflow_contacts_export.csv"');
    res.send(csv);
});
