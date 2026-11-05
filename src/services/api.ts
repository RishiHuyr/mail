import {
  DashboardStats,
  GmailStatus,
  SettingsData,
  Campaign,
  CampaignRecipient,
  Contact,
  CsvParseResult,
  EmailAttachment,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Auth & Gmail
  async getAuthStatus(): Promise<GmailStatus> {
    const res = await fetch(`${API_BASE}/auth/status`);
    if (!res.ok) throw new Error('Failed to fetch Gmail status');
    return res.json();
  },

  async getGoogleAuthUrl(): Promise<{ url: string; error?: string }> {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    return res.json();
  },

  async disconnectGmail(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/google/disconnect`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to disconnect Gmail');
    return res.json();
  },

  async saveGoogleCredentials(clientId: string, clientSecret: string, redirectUri?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, redirectUri }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save credentials');
    }
    return res.json();
  },

  async toggleSimulationMode(): Promise<{ success: boolean; simulationMode: boolean; status: GmailStatus }> {
    const res = await fetch(`${API_BASE}/auth/toggle-simulation`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle simulation mode');
    return res.json();
  },

  // Campaigns
  async getCampaigns(limit = 50, offset = 0): Promise<{ campaigns: Campaign[]; total: number }> {
    const res = await fetch(`${API_BASE}/campaigns?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },

  async getCampaign(id: string, status?: string): Promise<{ campaign: Campaign; recipients: CampaignRecipient[] }> {
    const url = status ? `${API_BASE}/campaigns/${id}?status=${status}` : `${API_BASE}/campaigns/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch campaign details');
    return res.json();
  },

  async createCampaign(data: {
    name: string;
    subject: string;
    body_html: string;
    body_text?: string;
    delay_seconds: number;
    recipients: Array<{ email: string; name?: string; company?: string; custom_data?: any }>;
    attachments?: EmailAttachment[];
    autoStart?: boolean;
  }): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create campaign');
    }
    return res.json();
  },

  async startCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start campaign');
    return res.json();
  },

  async pauseCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause campaign');
    return res.json();
  },

  async resumeCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume campaign');
    return res.json();
  },

  async cancelCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel campaign');
    return res.json();
  },

  async retryFailedCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}/retry-failed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry failed emails');
    return res.json();
  },

  async sendTestEmail(data: {
    toEmail?: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
    previewData?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; messageId?: string; isSimulated?: boolean }> {
    const res = await fetch(`${API_BASE}/campaigns/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to send test email');
    }
    return json;
  },

  async deleteCampaign(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete campaign');
    return res.json();
  },

  getCampaignExportUrl(id: string): string {
    return `${API_BASE}/campaigns/${id}/export`;
  },

  // Contacts
  async getContacts(search?: string, limit = 500, offset = 0): Promise<{ contacts: Contact[]; total: number }> {
    const url = search ? `${API_BASE}/contacts?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}` : `${API_BASE}/contacts?limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch contacts');
    return res.json();
  },

  async createContact(data: { name: string; email: string; company?: string; role?: string }): Promise<Contact> {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create contact');
    }
    return res.json();
  },

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update contact');
    return res.json();
  },

  async deleteContact(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete contact');
    return res.json();
  },

  async importContacts(contacts: Array<{ name: string; email: string; company?: string; role?: string }>): Promise<any> {
    const res = await fetch(`${API_BASE}/contacts/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });
    if (!res.ok) throw new Error('Failed to import contacts');
    return res.json();
  },

  getContactsExportUrl(): string {
    return `${API_BASE}/contacts/export/csv`;
  },

  // CSV
  async parseCsvFile(file: File): Promise<CsvParseResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/csv/parse`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse CSV file');
    }
    return res.json();
  },

  async parseCsvContent(content: string): Promise<CsvParseResult> {
    const res = await fetch(`${API_BASE}/csv/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse CSV content');
    }
    return res.json();
  },

  // Attachments
  async uploadAttachment(file: File): Promise<EmailAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/attachments/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload attachment');
    }
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SettingsData> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<SettingsData>): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};

