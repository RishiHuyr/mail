export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  role?: string | null;
  custom_fields?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  status: 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'cancelled' | 'failed';
  delay_seconds: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  attachments?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  custom_data?: Record<string, any> | null;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string | null;
  error_message?: string | null;
  retry_count: number;
}

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  avatar: string | null;
  connectedAt: string | null;
  hasCredentials: boolean;
  clientIdPreview: string | null;
  isSimulationMode?: boolean;
}

export interface DashboardStats {
  totalContacts: number;
  emailsSent: number;
  pendingEmails: number;
  failedEmails: number;
  totalCampaigns: number;
  sentToday: number;
  dailyLimit: number;
  gmail: GmailStatus;
  recentCampaigns: Array<{
    id: string;
    name: string;
    subject: string;
    status: Campaign['status'];
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    created_at: string;
    completed_at?: string | null;
  }>;
}

export interface ParsedCsvRecipient {
  name: string;
  email: string;
  company?: string;
  role?: string;
  custom_fields?: Record<string, string>;
  isValid: boolean;
  isDuplicate: boolean;
  error?: string;
  selected?: boolean;
}

export interface CsvParseResult {
  recipients: ParsedCsvRecipient[];
  headers: string[];
  total: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface EmailAttachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface SettingsData {
  sender_name: string;
  default_delay_seconds: number;
  email_signature: string;
  append_signature: boolean;
  append_unsubscribe: boolean;
  daily_sending_limit: number;
  simulation_mode: boolean;
  gmail_status: GmailStatus;
}

