// ============================================
// CSV Email Parser
// ============================================
// Parses CSV files to extract email addresses.
// Supports auto-detection of the email column.

import Papa from 'papaparse';

const EMAIL_COLUMN_NAMES = [
  'email', 'e-mail', 'email_address', 'emailaddress',
  'email address', 'mail', 'contact_email', 'work_email',
  'primary_email', 'lead_email', 'prospect_email',
];

export function parseCsvEmails(csvText: string, emailColumn?: string): string[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (!result.data?.length) return [];

  // Find the email column
  const headers = Object.keys(result.data[0] as Record<string, unknown>);
  let column = emailColumn?.trim().toLowerCase() || '';

  if (!column || !headers.includes(column)) {
    // Auto-detect email column
    column = headers.find((h) => EMAIL_COLUMN_NAMES.includes(h)) || '';

    // Fallback: find any column where first value looks like an email
    if (!column) {
      column = headers.find((h) => {
        const val = (result.data[0] as Record<string, string>)[h] || '';
        return val.includes('@') && val.includes('.');
      }) || '';
    }
  }

  if (!column) return [];

  return (result.data as Record<string, string>[])
    .map((row) => (row[column] || '').trim())
    .filter((email) => email.length > 0 && email.includes('@'));
}
