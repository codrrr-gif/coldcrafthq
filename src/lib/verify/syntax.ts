// ============================================
// Layer 1: Syntax Validation
// ============================================
// RFC 5322 compliance + typo detection + role-based flagging.
// Runs entirely on Vercel — no external calls.

import type { SyntaxResult } from './types';
import { getSuggestedDomain } from './typo-map';
import { isRoleBased } from './role-addresses';
import { isFreeProvider } from './free-providers';

// RFC 5322 local part: allows alphanumeric, dots, hyphens, underscores, plus signs
// We're intentionally stricter than full RFC 5322 — quoted strings and
// special chars are technically valid but never seen in real B2B emails.
const LOCAL_PART_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;

export function validateSyntax(email: string): SyntaxResult {
  const errors: string[] = [];
  const trimmed = email.trim().toLowerCase();

  // Basic structure check
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) {
    return {
      valid: false,
      local_part: '',
      domain: '',
      has_typo: false,
      suggested_domain: null,
      is_role_based: false,
      is_free_provider: false,
      errors: ['Missing @ symbol'],
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  // Length checks
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email exceeds ${MAX_EMAIL_LENGTH} characters`);
  }
  if (localPart.length === 0) {
    errors.push('Empty local part');
  }
  if (localPart.length > MAX_LOCAL_LENGTH) {
    errors.push(`Local part exceeds ${MAX_LOCAL_LENGTH} characters`);
  }
  if (domain.length === 0) {
    errors.push('Empty domain');
  }
  if (domain.length > MAX_DOMAIN_LENGTH) {
    errors.push(`Domain exceeds ${MAX_DOMAIN_LENGTH} characters`);
  }

  // Local part validation
  if (localPart.length > 0 && !LOCAL_PART_REGEX.test(localPart)) {
    errors.push('Local part contains invalid characters');
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    errors.push('Local part cannot start or end with a dot');
  }
  if (localPart.includes('..')) {
    errors.push('Local part cannot contain consecutive dots');
  }

  // Domain validation
  if (domain.length > 0 && !DOMAIN_REGEX.test(domain)) {
    errors.push('Invalid domain format');
  }

  // Typo detection
  const suggestedDomain = getSuggestedDomain(domain);
  const hasTypo = suggestedDomain !== null;

  return {
    valid: errors.length === 0,
    local_part: localPart,
    domain,
    has_typo: hasTypo,
    suggested_domain: suggestedDomain,
    is_role_based: localPart.length > 0 ? isRoleBased(localPart) : false,
    is_free_provider: domain.length > 0 ? isFreeProvider(domain) : false,
    errors,
  };
}
