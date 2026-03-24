// ============================================
// Disposable Email Domain Detection
// ============================================
// Uses the mailchecker npm package (55K+ domains) as the primary
// source, supplemented by our own high-priority additions that
// we've seen in real cold email lists.

import isDisposable from 'mailchecker';

// Supplementary domains not always in mailchecker's list
const SUPPLEMENTARY_DISPOSABLE = new Set([
  // Commonly missed temp mail services
  'tempmail.com', 'temp-mail.org', 'tempail.com',
  'throwaway.email', 'throwaway.com',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.de', 'guerrillamail.biz',
  'guerrillamailblock.com', 'grr.la',
  'sharklasers.com', 'spam4.me', 'pokemail.net',
  'dispostable.com', 'yopmail.com', 'yopmail.fr',
  'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'maildrop.cc', 'mailnesia.com', 'mailcatch.com',
  'trashmail.com', 'trashmail.net', 'trashmail.me',
  'trashmail.org', 'trashinbox.com',
  'getnada.com', 'nada.email', 'nada.ltd',
  'tempinbox.com', 'tempinbox.xyz',
  'fakeinbox.com', 'fakeemail.com',
  'emailondeck.com', 'emailfake.com',
  'burnermail.io', 'burnmail.com',
  'mohmal.com', 'mohmal.im',
  'mailsac.com', 'inboxbear.com',
  'harakirimail.com', 'discard.email',
  'minutemail.com', 'tenminutemail.com',
  'tempmailaddress.com', 'mailtemp.info',
  'tempr.email', 'dropmail.me',
  'mytemp.email', 'crazymailing.com',
  'mailnull.com', 'spamgourmet.com',
  'spamfree24.org', 'antispam24.de',
  'incognitomail.org', 'incognitomail.com',
  'privymail.de', 'sneakemail.com',
  'jetable.org', 'getairmail.com',
  'filzmail.com', 'mailexpire.com',
  'mailmoat.com', 'mailscrap.com',
  'spambox.us', 'uggsrock.com',
  'mailzilla.com', 'thankyou2010.com',
  'brefmail.com', 'mail-temporaire.com',
  'emailigo.de', 'onewaymail.com',
  'mobi.web.id', 'sogetthis.com',
  'mailin8r.com', 'mailbidon.com',
  'nomail.xl.cx', 'mega.zik.dj',
  '10minutemail.com', '10minutemail.net',
  '20minutemail.com', 'anonymbox.com',
  'binkmail.com', 'bobmail.info',
  'chammy.info', 'devnullmail.com',
  'e4ward.com', 'emailias.com',
  'emailmiser.com', 'emailwarden.com',
  'enterto.com', 'ephemail.net',
  'etranquil.com', 'gishpuppy.com',
  'imstations.com', 'ipoo.org',
  'kasmail.com', 'lhsdv.com',
  'mailblocks.com', 'mailquack.com',
  'mintemail.com', 'mt2015.com',
  'mytrashmail.com', 'nobulk.com',
  'noclickemail.com', 'nogmailspam.info',
  'nomail.pw', 'nomail2me.com',
  'nospam.ze.tc', 'nothingtoseehere.ca',
  'nowmymail.com', 'obobbo.com',
  'odaymail.com', 'pjjkp.com',
  'proxymail.eu', 'punkass.com',
  'putthisinyouremail.com', 'reallymymail.com',
  'recode.me', 'safersignup.de',
  'safetymail.info', 'shieldedmail.com',
  'sofort-mail.de', 'sogetthis.com',
  'soodonims.com', 'spamfree.eu',
  'spamherelots.com', 'spaml.de',
  'spamspot.com', 'spamstack.net',
  'superrito.com', 'teleworm.us',
  'thankyou2010.com', 'thisisnotmyrealemail.com',
  'trash-mail.at', 'trashymail.com',
  'trashymail.net', 'turual.com',
  'twinmail.de', 'tyldd.com',
  'uggsrock.com', 'veryreallyfake.com',
  'wegwerfmail.de', 'wegwerfmail.net',
  'wh4f.org', 'whyspam.me',
  'wuzup.net', 'wuzupmail.net',
  'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com',
  'xoxy.net', 'yapped.net',
  'yep.it', 'yogamaven.com',
  'yuurok.com', 'zippymail.info',
]);

export function isDisposableDomain(domain: string): boolean {
  const lower = domain.toLowerCase();

  // Check our supplementary list first (fast Set lookup)
  if (SUPPLEMENTARY_DISPOSABLE.has(lower)) {
    return true;
  }

  // Check mailchecker's 55K+ domain database
  // mailchecker.isValid returns true if the email is NOT disposable
  // So we need to check with a fake local part
  return !isDisposable.isValid(`check@${lower}`);
}
