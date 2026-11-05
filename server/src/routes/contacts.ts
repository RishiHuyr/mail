import { Router, Request, Response } from 'express';
import { ContactsModel } from '../db/models.js';
import { generateCsv } from '../services/csvService.js';

export const contactsRouter = Router();

// List contacts with search & pagination
contactsRouter.get('/', (req: Request, res: Response) => {
  const search = req.query.search as string;
  const limit = parseInt(req.query.limit as string) || 500;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = ContactsModel.list(search, limit, offset);
  res.json(result);
});

// Get single contact
contactsRouter.get('/:id', (req: Request, res: Response) => {
  const contact = ContactsModel.getById(req.params.id);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json(contact);
});

// Create single contact
contactsRouter.post('/', (req: Request, res: Response) => {
  const { name, email, company, role, custom_fields } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const existing = ContactsModel.getByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'A contact with this email already exists' });
  }

  const created = ContactsModel.create({
    name: name || email.split('@')[0],
    email,
    company,
    role,
    custom_fields,
  });

  res.status(201).json(created);
});

// Bulk import contacts
contactsRouter.post('/import', (req: Request, res: Response) => {
  const { contacts } = req.body;
  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Invalid contacts list provided' });
  }

  const result = ContactsModel.upsertMany(contacts);
  res.json({
    success: true,
    message: `Imported ${result.inserted} new contacts, updated ${result.updated} existing contacts.`,
    ...result,
  });
});

// Update contact
contactsRouter.put('/:id', (req: Request, res: Response) => {
  const updated = ContactsModel.update(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json(updated);
});

// Delete contact
contactsRouter.delete('/:id', (req: Request, res: Response) => {
  const success = ContactsModel.delete(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ success: true, message: 'Contact deleted successfully' });
});

// Export all contacts as CSV
contactsRouter.get('/export/csv', (req: Request, res: Response) => {
  const { contacts } = ContactsModel.list(undefined, 10000, 0);

  const rows = contacts.map(c => ({
    Name: c.name,
    Email: c.email,
    Company: c.company || '',
    Role: c.role || '',
    CreatedAt: c.created_at,
  }));

  const csv = generateCsv(rows, ['Name', 'Email', 'Company', 'Role', 'CreatedAt']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="mailflow_contacts_export.csv"');
  res.send(csv);
});

