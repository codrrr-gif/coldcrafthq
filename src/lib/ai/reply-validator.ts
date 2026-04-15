// Content validation for AI-drafted replies before auto-send.
// Catches placeholders, empty content, and suspicious patterns.

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const PLACEHOLDER_PATTERN = /\[(?:Name|Company|Link|URL|Phone|Email|Product|Title|First ?Name|Last ?Name|CTA|Placeholder).*?\]/i;
const FORBIDDEN_PATTERNS = [
  /\{\{.*?\}\}/,         // Template variables
  /\[TODO\]/i,           // Leftover TODOs
  /INSERT .* HERE/i,     // Instruction text
  /Dear Sir\/Madam/i,    // Generic salutation
];

export function validateReplyContent(reply: string): ValidationResult {
  if (!reply || reply.trim().length < 20) {
    return { valid: false, reason: 'too_short' };
  }

  if (reply.length > 3000) {
    return { valid: false, reason: 'too_long' };
  }

  if (PLACEHOLDER_PATTERN.test(reply)) {
    return { valid: false, reason: 'contains_placeholders' };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(reply)) {
      return { valid: false, reason: 'contains_forbidden_pattern' };
    }
  }

  // Check for suspiciously repetitive content
  const lines = reply.split('\n').filter(l => l.trim());
  if (lines.length > 20) {
    return { valid: false, reason: 'too_many_lines' };
  }

  // Anti-AI pattern checks
  const emDashCount = (reply.match(/—/g) || []).length;
  if (emDashCount > 1) {
    return { valid: false, reason: 'too_many_em_dashes' };
  }

  const exclamationCount = (reply.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    return { valid: false, reason: 'too_many_exclamations' };
  }

  return { valid: true };
}
