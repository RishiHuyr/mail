import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Check, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Database, 
  UserCheck, 
  UserX, 
  CopyCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { ParsedCsvRecipient } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface CsvUploaderProps {
  recipients: ParsedCsvRecipient[];
  onRecipientsChange: (recipients: ParsedCsvRecipient[]) => void;
  onHeadersDetected: (headers: string[]) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  recipients,
  onRecipientsChange,
  onHeadersDetected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      showToast('Please upload a valid CSV file (.csv)', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.parseCsvFile(file);
      
      const mapped = result.recipients.map(r => ({
        ...r,
        selected: r.isValid && !r.isDuplicate, // default select valid non-duplicates
      }));

      onRecipientsChange(mapped);
      onHeadersDetected(result.headers);

      showToast(`Successfully imported ${result.total} recipients (${result.validCount} valid)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to parse CSV file', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromContacts = async () => {
    try {
      setIsLoading(true);
      const { contacts } = await api.getContacts(undefined, 500, 0);
      if (contacts.length === 0) {
        showToast('No saved contacts found in database. Upload a CSV or add contacts first.', 'info');
        return;
      }

      const mapped: ParsedCsvRecipient[] = contacts.map(c => ({
        name: c.name,
        email: c.email,
        company: c.company || undefined,
        role: c.role || undefined,
        custom_fields: c.custom_fields || undefined,
        isValid: true,
        isDuplicate: false,
        selected: true,
      }));

      onRecipientsChange(mapped);
      onHeadersDetected(['Name', 'Email', 'Company', 'Role']);
      showToast(`Loaded ${mapped.length} contacts from database`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to load contacts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = 'Name,Email,Company,Role\n' +
      'Alex Mercer,alex@techinnovators.io,Tech Innovators,VP of Engineering\n' +
      'Sarah Chen,sarah.chen@cloudscale.net,CloudScale,Head of Product\n' +
      'Marcus Brody,m.brody@globalmedia.com,Global Media,Operations Director\n' +
      'Elena Rostova,elena@quantumdesign.co,Quantum Design,Creative Director\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mailflow_sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample CSV downloaded', 'info');
  };

  const toggleSelectAll = () => {
    const allSelected = recipients.every(r => r.selected);
    const updated = recipients.map(r => ({
      ...r,
      selected: !allSelected ? r.isValid : false,
    }));
    onRecipientsChange(updated);
  };

  const toggleSelect = (index: number) => {
    const updated = [...recipients];
    updated[index].selected = !updated[index].selected;
    onRecipientsChange(updated);
  };

  const removeRecipient = (index: number) => {
    const updated = recipients.filter((_, idx) => idx !== index);
    onRecipientsChange(updated);
  };

  const removeDuplicates = () => {
    const seen = new Set<string>();
    const updated: ParsedCsvRecipient[] = [];

    for (const r of recipients) {
      const emailLower = r.email.toLowerCase();
      if (!seen.has(emailLower)) {
        seen.add(emailLower);
        updated.push({
          ...r,
          isDuplicate: false,
        });
      }
    }

    const removed = recipients.length - updated.length;
    onRecipientsChange(updated);
    showToast(`Removed ${removed} duplicate entries`, 'success');
  };

  const selectedCount = recipients.filter(r => r.selected).length;
  const duplicateCount = recipients.filter(r => r.isDuplicate).length;
  const invalidCount = recipients.filter(r => !r.isValid).length;

  const filteredRecipients = recipients.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.company?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {recipients.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
            <Upload className="h-6 w-6" />
          </div>

          <h3 className="text-base font-bold text-slate-800 mb-1">
            Drag & drop your CSV file here
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Upload a spreadsheet with recipient names and emails. Supports columns like <code className="font-mono text-indigo-600 font-semibold">Name</code>, <code className="font-mono text-indigo-600 font-semibold">Email</code>, <code className="font-mono text-indigo-600 font-semibold">Company</code>, and custom fields.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Browse CSV File
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                loadFromContacts();
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              <span>Load from Saved Contacts</span>
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                downloadSampleCsv();
              }}
              className="px-3.5 py-2 text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Sample Template</span>
            </button>
          </div>
        </div>
      ) : (
        /* Recipient Table & Management */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden space-y-3 p-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-900">
                {selectedCount} of {recipients.length} selected
              </span>

              {invalidCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium border border-rose-200 text-[11px] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} invalid emails
                </span>
              )}

              {duplicateCount > 0 && (
                <button
                  type="button"
                  onClick={removeDuplicates}
                  className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 text-[11px] flex items-center gap-1 transition-colors"
                >
                  <CopyCheck className="h-3 w-3 text-amber-600" />
                  <span>Remove {duplicateCount} duplicates</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter recipients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
                />
              </div>

              {/* Upload another file */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                Re-upload CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-60 border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 z-10 border-b border-slate-200/70">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {recipients.length > 0 && recipients.every(r => r.selected) ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecipients.map((r, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !r.isValid ? 'bg-rose-50/30' : r.isDuplicate ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        disabled={!r.isValid}
                        onClick={() => toggleSelect(idx)}
                        className="text-slate-500 hover:text-indigo-600 disabled:opacity-40"
                      >
                        {r.selected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{r.email}</td>
                    <td className="py-2 px-3 text-slate-500">{r.company || '—'}</td>
                    <td className="py-2 px-3">
                      {!r.isValid ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                          {r.error || 'Invalid'}
                        </span>
                      ) : r.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                          Duplicate
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRecipient(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Remove contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

