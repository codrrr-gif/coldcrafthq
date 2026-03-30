// ============================================
// CSV Email Parser
// ============================================
// Parses CSV files to extract email addresses and lead metadata.
// Supports auto-detection of the email, name, company, and niche columns.

import Papa from 'papaparse';

export interface CsvLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  niche?: string;
}

const EMAIL_COLUMN_NAMES = [
  'email', 'e-mail', 'email_address', 'emailaddress',
  'email address', 'mail', 'contact_email', 'work_email',
  'primary_email', 'lead_email', 'prospect_email',
];

const FIRST_NAME_COLUMNS = ['first_name', 'firstname', 'first', 'fname', 'first name'];
const LAST_NAME_COLUMNS = ['last_name', 'lastname', 'last', 'lname', 'last name'];
const COMPANY_COLUMNS = ['company', 'company_name', 'companyname', 'organization', 'org', 'company name'];
const NICHE_COLUMNS = ['niche', 'industry', 'sector', 'vertical', 'category', 'business_category'];

function findColumn(headers: string[], candidates: string[]): string | null {
  // Exact match first
  const exact = headers.find((h) => candidates.includes(h));
  if (exact) return exact;
  // Fuzzy: header starts with a candidate (e.g. "company name for emails" → "company name")
  return headers.find((h) => candidates.some((c) => h.startsWith(c))) || null;
}

export function parseCsvLeads(csvText: string, emailColumn?: string): CsvLead[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (!result.data?.length) return [];

  const headers = Object.keys(result.data[0] as Record<string, unknown>);
  let column = emailColumn?.trim().toLowerCase() || '';

  if (!column || !headers.includes(column)) {
    column = headers.find((h) => EMAIL_COLUMN_NAMES.includes(h)) || '';
    if (!column) {
      column = headers.find((h) => {
        const val = (result.data[0] as Record<string, string>)[h] || '';
        return val.includes('@') && val.includes('.');
      }) || '';
    }
  }

  if (!column) return [];

  const firstNameCol = findColumn(headers, FIRST_NAME_COLUMNS);
  const lastNameCol = findColumn(headers, LAST_NAME_COLUMNS);
  const companyCol = findColumn(headers, COMPANY_COLUMNS);
  const nicheCol = findColumn(headers, NICHE_COLUMNS);

  return (result.data as Record<string, string>[])
    .map((row) => {
      const email = (row[column] || '').trim();
      if (!email || !email.includes('@')) return null;
      const lead: CsvLead = { email };
      if (firstNameCol && row[firstNameCol]?.trim()) lead.first_name = row[firstNameCol].trim();
      if (lastNameCol && row[lastNameCol]?.trim()) lead.last_name = row[lastNameCol].trim();
      if (companyCol && row[companyCol]?.trim()) lead.company_name = row[companyCol].trim();
      if (nicheCol && row[nicheCol]?.trim()) lead.niche = row[nicheCol].trim();
      return lead;
    })
    .filter((lead): lead is CsvLead => lead !== null);
}

/** Backward-compatible wrapper that returns just emails */
export function parseCsvEmails(csvText: string, emailColumn?: string): string[] {
  return parseCsvLeads(csvText, emailColumn).map((l) => l.email);
}
