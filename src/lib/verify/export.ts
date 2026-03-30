// ============================================
// CSV Export for Verification Results
// ============================================

interface ExportRow {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  niche: string | null;
  verdict: string;
  risk_level: string;
  score: number;
  reason: string | null;
  recommendation: string | null;
  suggested_correction: string | null;
}

export function exportResultsToCsv(results: ExportRow[]): string {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'company_name',
    'niche',
    'verdict',
    'risk_level',
    'score',
    'reason',
    'recommendation',
    'suggested_correction',
  ];

  const rows = results.map((r) =>
    headers.map((h) => {
      const value = r[h as keyof ExportRow];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape CSV values that contain commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
