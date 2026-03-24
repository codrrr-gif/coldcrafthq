// ============================================
// CSV Export for Verification Results
// ============================================

interface ExportRow {
  email: string;
  verdict: string;
  risk_level: string;
  score: number;
  reason: string | null;
  recommendation: string | null;
  suggested_correction: string | null;
}

export function exportResultsToCsv(results: ExportRow[]): string {
  const headers = [
    'email',
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
