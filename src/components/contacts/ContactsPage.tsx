import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Download, 
  Search, 
  Trash2, 
  Edit2, 
  Send, 
  Mail, 
  Building2, 
  CheckSquare, 
  Square, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Contact } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface ContactsPageProps {
  onNavigateToComposeWithContacts?: (contacts: Contact[]) => void;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({
  onNavigateToComposeWithContacts,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Import CSV state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const res = await api.getContacts(searchQuery);
      setContacts(res.contacts);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to load contacts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadContacts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const openAddModal = () => {
    setEditingContact(null);
    setFormName('');
    setFormEmail('');
    setFormCompany('');
    setFormRole('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setFormName(c.name);
    setFormEmail(c.email);
    setFormCompany(c.company || '');
    setFormRole(c.role || '');
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingContact) {
        await api.updateContact(editingContact.id, {
          name: formName.trim() || formEmail.split('@')[0],
          email: formEmail.trim().toLowerCase(),
          company: formCompany.trim() || undefined,
          role: formRole.trim() || undefined,
        });
        showToast('Contact updated', 'success');
      } else {
        await api.createContact({
          name: formName.trim() || formEmail.split('@')[0],
          email: formEmail.trim().toLowerCase(),
          company: formCompany.trim() || undefined,
          role: formRole.trim() || undefined,
        });
        showToast('Contact added', 'success');
      }
      setIsModalOpen(false);
      loadContacts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save contact', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.deleteContact(id);
      showToast('Contact removed', 'success');
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadContacts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete contact', 'error');
    }
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      const parsed = await api.parseCsvFile(file);
      const validOnes = parsed.recipients.filter(r => r.isValid && !r.isDuplicate);

      if (validOnes.length === 0) {
        showToast('No valid new contacts found in CSV', 'error');
        return;
      }

      const res = await api.importContacts(validOnes.map(r => ({
        name: r.name,
        email: r.email,
        company: r.company,
        role: r.role,
      })));

      showToast(res.message || `Imported ${res.inserted} contacts!`, 'success');
      setIsImportModalOpen(false);
      loadContacts();
    } catch (err: any) {
      showToast(err.message || 'Failed to import CSV', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleComposeWithSelected = () => {
    const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
    if (onNavigateToComposeWithContacts) {
      onNavigateToComposeWithContacts(selectedContacts);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Contacts Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal contact network, import prospect lists, and launch targeted outreach
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedIds.size > 0 && onNavigateToComposeWithContacts && (
            <button
              onClick={handleComposeWithSelected}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Compose with Selected ({selectedIds.size})</span>
            </button>
          )}

          <a
            href={api.getContactsExportUrl()}
            download
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition-all flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition-all flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-600" />
            <span>Import CSV</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsvFile}
          />

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Contacts: <span className="text-slate-900">{totalCount}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        {contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
                      {contacts.length > 0 && selectedIds.size === contacts.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Added</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <button onClick={() => toggleSelect(c.id)} className="text-slate-500 hover:text-indigo-600">
                        {selectedIds.has(c.id) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.email}</td>
                    <td className="py-3 px-4 text-slate-600">{c.company || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{c.role || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id, c.name)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No contacts found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? 'Try a different search term or clear the filter.' : 'Add your first contact or import a CSV file.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
              >
                Add Contact
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-premium border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Company</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Role / Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Head of Engineering"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

