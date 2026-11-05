export interface ParsedCsvRecipient {
  name: string;
  email: string;
  company?: string;
  role?: string;
  custom_fields?: Record<string, string>;
  isValid: boolean;
  isDuplicate: boolean;
  error?: string;
}

export interface CsvParseResult {
  recipients: ParsedCsvRecipient[];
  headers: string[];
  total: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Standardize CSV header names
 */
function normalizeHeader(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'email' || clean === 'emailaddress' || clean === 'mail' || clean === 'recipient') return 'Email';
  if (clean === 'name' || clean === 'fullname' || clean === 'firstname' || clean === 'contactname') return 'Name';
  if (clean === 'company' || clean === 'companyname' || clean === 'organization' || clean === 'org') return 'Company';
  if (clean === 'role' || clean === 'title' || clean === 'jobtitle' || clean === 'position') return 'Role';
  return header.trim();
}

/**
 * Parse CSV content manually or with resilient delimiters (comma, semicolon, tab)
 */
export function parseCsvContent(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return {
      recipients: [],
      headers: [],
      total: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
    };
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  // Parse header line
  const rawHeaders = splitCsvRow(lines[0], delimiter);
  const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h));

  const emailIdx = normalizedHeaders.findIndex(h => h.toLowerCase() === 'email');
  const nameIdx = normalizedHeaders.findIndex(h => h.toLowerCase() === 'name');
  const companyIdx = normalizedHeaders.findIndex(h => h.toLowerCase() === 'company');
  const roleIdx = normalizedHeaders.findIndex(h => h.toLowerCase() === 'role');

  const seenEmails = new Set<string>();
  const recipients: ParsedCsvRecipient[] = [];

  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i], delimiter);
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const emailRaw = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '';
    const nameRaw = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : '';
    const companyRaw = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : '';
    const roleRaw = roleIdx !== -1 && row[roleIdx] ? row[roleIdx].trim() : '';

    // Extract any additional custom fields
    const custom_fields: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      if (c !== emailIdx && c !== nameIdx && c !== companyIdx && c !== roleIdx && row[c] !== undefined) {
        const key = rawHeaders[c].trim();
        if (key) {
          custom_fields[key] = row[c].trim();
        }
      }
    }

    const emailLower = emailRaw.toLowerCase();
    let isValid = true;
    let error: string | undefined;

    if (!emailRaw) {
      isValid = false;
      error = 'Missing email address';
      invalidCount++;
    } else if (!EMAIL_REGEX.test(emailRaw)) {
      isValid = false;
      error = 'Invalid email format';
      invalidCount++;
    }

    let isDuplicate = false;
    if (isValid) {
      if (seenEmails.has(emailLower)) {
        isDuplicate = true;
        duplicateCount++;
      } else {
        seenEmails.add(emailLower);
        validCount++;
      }
    }

    recipients.push({
      name: nameRaw || emailRaw.split('@')[0] || 'Valued Contact',
      email: emailRaw,
      company: companyRaw || undefined,
      role: roleRaw || undefined,
      custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
      isValid,
      isDuplicate,
      error,
    });
  }

  // Deduplicate and collect unique header variable names
  const dynamicHeaders = Array.from(new Set(['Name', 'Email', 'Company', ...rawHeaders.map(h => h.trim())]));

  return {
    recipients,
    headers: dynamicHeaders,
    total: recipients.length,
    validCount,
    duplicateCount,
    invalidCount,
  };
}

/**
 * Split a CSV line respecting quotes
 */
function splitCsvRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Convert an array of objects to CSV string
 */
export function generateCsv(data: Record<string, any>[], columns: string[]): string {
  if (data.length === 0) return '';
  const headerLine = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
  const rowLines = data.map(item => {
    return columns.map(col => {
      const val = item[col] !== undefined && item[col] !== null ? String(item[col]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

