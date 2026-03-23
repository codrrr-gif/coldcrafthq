// src/lib/finder/permutations.ts
// ============================================
// Generates the 10 most common B2B email patterns
// for a given first name, last name, and domain.
// Order = probability-weighted (most common first).
// ============================================

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

export function generatePermutations(
  firstName: string,
  lastName: string,
  domain: string,
): string[] {
  const f = normalize(firstName);
  const l = normalize(lastName);
  if (!f || !l || !domain) return [];

  const fi = f[0]; // first initial

  // Ordered by prevalence in B2B
  return [
    `${f}.${l}@${domain}`,    // john.smith — most common (~40%)
    `${f}${l}@${domain}`,     // johnsmith (~15%)
    `${fi}${l}@${domain}`,    // jsmith (~13%)
    `${fi}.${l}@${domain}`,   // j.smith (~10%)
    `${f}@${domain}`,         // john (~7%)
    `${l}.${f}@${domain}`,    // smith.john (~5%)
    `${l}${f}@${domain}`,     // smithjohn (~3%)
    `${l}@${domain}`,         // smith (~3%)
    `${f}_${l}@${domain}`,    // john_smith (~2%)
    `${f}.${l[0]}@${domain}`, // john.s (~2%)
  ];
}

// Given a known email, extract which pattern it matches
export function detectPattern(email: string, firstName: string, lastName: string): string | null {
  const f = normalize(firstName);
  const l = normalize(lastName);
  const fi = f[0];
  const local = email.split('@')[0].toLowerCase();

  if (local === `${f}.${l}`) return 'first.last';
  if (local === `${f}${l}`) return 'firstlast';
  if (local === `${fi}${l}`) return 'flast';
  if (local === `${fi}.${l}`) return 'f.last';
  if (local === f) return 'first';
  if (local === `${l}.${f}`) return 'last.first';
  if (local === `${l}${f}`) return 'lastfirst';
  if (local === l) return 'last';
  if (local === `${f}_${l}`) return 'first_last';
  if (local === `${f}.${l[0]}`) return 'first.li';
  return null;
}

// Apply a named pattern to generate an email
export function applyPattern(
  pattern: string,
  firstName: string,
  lastName: string,
  domain: string,
): string | null {
  const f = normalize(firstName);
  const l = normalize(lastName);
  if (!f || !l) return null;
  const fi = f[0];

  const patternMap: Record<string, string> = {
    'first.last':  `${f}.${l}@${domain}`,
    'firstlast':   `${f}${l}@${domain}`,
    'flast':       `${fi}${l}@${domain}`,
    'f.last':      `${fi}.${l}@${domain}`,
    'first':       `${f}@${domain}`,
    'last.first':  `${l}.${f}@${domain}`,
    'lastfirst':   `${l}${f}@${domain}`,
    'last':        `${l}@${domain}`,
    'first_last':  `${f}_${l}@${domain}`,
    'first.li':    `${f}.${l[0]}@${domain}`,
  };

  return patternMap[pattern] ?? null;
}
