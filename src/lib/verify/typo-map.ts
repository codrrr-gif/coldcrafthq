// ============================================
// Common Domain Typo Corrections
// ============================================
// Catches obvious domain typos before they become bounces.
// Ordered by frequency in real cold email lists.

export const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.net': 'gmail.com',
  'gail.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'gimail.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'g mail.com': 'gmail.com',
  'gmail.org': 'gmail.com',
  'gmailcom': 'gmail.com',

  // Hotmail
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.comm': 'hotmail.com',
  'hotmails.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'htmail.com': 'hotmail.com',
  'htomail.com': 'hotmail.com',
  'hotmailcom': 'hotmail.com',

  // Outlook
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlool.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outook.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.comm': 'outlook.com',
  'outlokk.com': 'outlook.com',
  'outloock.com': 'outlook.com',
  'outlookcom': 'outlook.com',
  'ouutlook.com': 'outlook.com',
  'otlook.com': 'outlook.com',
  'oultook.com': 'outlook.com',

  // Yahoo
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.comm': 'yahoo.com',
  'yahooo.co': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yhaoo.co': 'yahoo.com',
  'yahoocom': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'yaahoo.com': 'yahoo.com',

  // AOL
  'aol.co': 'aol.com',
  'aol.cm': 'aol.com',
  'aol.con': 'aol.com',
  'aol.comm': 'aol.com',
  'aoll.com': 'aol.com',

  // iCloud
  'iclod.com': 'icloud.com',
  'icould.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icolud.com': 'icloud.com',
  'iclould.com': 'icloud.com',

  // Proton
  'protonmal.com': 'protonmail.com',
  'protnmail.com': 'protonmail.com',
  'protonmail.co': 'protonmail.com',
  'protonmai.com': 'protonmail.com',
  'protonmial.com': 'protonmail.com',
  'protonmailcom': 'protonmail.com',
  'proton.m': 'proton.me',

  // Zoho
  'zoho.co': 'zoho.com',
  'zoho.cm': 'zoho.com',

  // Yandex
  'yandex.co': 'yandex.com',
  'yandex.cm': 'yandex.com',
  'yndex.com': 'yandex.com',
  'yandx.com': 'yandex.com',

  // Live
  'live.co': 'live.com',
  'live.cm': 'live.com',
  'live.con': 'live.com',

  // MSN
  'msn.co': 'msn.com',
  'msn.cm': 'msn.com',

  // Mail
  'mail.co': 'mail.com',
  'mail.cm': 'mail.com',

  // Common TLD typos (generic)
  // These will be checked via a function, not as full domain entries
};

// Common TLD typos
export const TLD_TYPOS: Record<string, string> = {
  'co': 'com',
  'cm': 'com',
  'con': 'com',
  'comm': 'com',
  'cmo': 'com',
  'om': 'com',
  'coom': 'com',
  'coim': 'com',
  'ocm': 'com',
  'nte': 'net',
  'ent': 'net',
  'ne': 'net',
  'ogr': 'org',
  'og': 'org',
  'oro': 'org',
};

export function getSuggestedDomain(domain: string): string | null {
  const lower = domain.toLowerCase();

  // Direct domain match
  if (DOMAIN_TYPOS[lower]) {
    return DOMAIN_TYPOS[lower];
  }

  // TLD-only correction for unknown domains
  const lastDot = lower.lastIndexOf('.');
  if (lastDot > 0) {
    const tld = lower.slice(lastDot + 1);
    const base = lower.slice(0, lastDot);
    if (TLD_TYPOS[tld]) {
      return `${base}.${TLD_TYPOS[tld]}`;
    }
  }

  return null;
}
