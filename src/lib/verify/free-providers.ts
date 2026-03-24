// ============================================
// Free Email Provider Domains
// ============================================
// Free provider emails (gmail, yahoo, etc.) are flagged as risky
// for B2B cold outreach — they usually indicate a personal address,
// not a business decision-maker.

export const FREE_PROVIDERS = new Set([
  // Major global
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.co.jp',
  'yahoo.com.br', 'yahoo.com.au', 'yahoo.ca', 'yahoo.fr',
  'yahoo.de', 'yahoo.it', 'yahoo.es', 'yahoo.co.id',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'hotmail.it', 'hotmail.es', 'hotmail.ca', 'hotmail.com.br',
  'outlook.com', 'outlook.co', 'outlook.es', 'outlook.fr',
  'outlook.de', 'outlook.it', 'outlook.com.br',
  'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.it',
  'msn.com',
  'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'zoho.com', 'zohomail.com',
  'mail.com', 'email.com',
  'yandex.com', 'yandex.ru', 'yandex.ua',

  // Regional
  'mail.ru', 'list.ru', 'bk.ru', 'inbox.ru',
  'rambler.ru', 'autorambler.ru',
  'gmx.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
  'web.de', 'freenet.de', 't-online.de', 'arcor.de',
  'libero.it', 'virgilio.it', 'tin.it', 'alice.it', 'tiscali.it',
  'wanadoo.fr', 'laposte.net', 'free.fr', 'orange.fr', 'sfr.fr',
  'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com',
  'naver.com', 'daum.net', 'hanmail.net',
  'rediffmail.com',

  // US ISP
  'att.net', 'comcast.net', 'verizon.net', 'cox.net',
  'sbcglobal.net', 'bellsouth.net', 'charter.net',
  'earthlink.net', 'windstream.net', 'centurylink.net',
  'frontier.com', 'optimum.net',

  // UK ISP
  'btinternet.com', 'sky.com', 'talktalk.net',
  'ntlworld.com', 'virgin.net', 'virginmedia.com',

  // Privacy-focused
  'tutanota.com', 'tuta.com', 'tuta.io', 'tutamail.com',
  'keemail.me', 'tutanota.de',
  'hey.com', 'duck.com',
  'hushmail.com', 'hush.com', 'hushmail.me',
  'fastmail.com', 'fastmail.fm',
  'runbox.com', 'mailfence.com',
  'startmail.com', 'posteo.de', 'posteo.net',
  'disroot.org', 'riseup.net',
  'ctemplar.com',

  // Legacy / misc
  'juno.com', 'netzero.com', 'lycos.com', 'excite.com',
  'rocketmail.com', 'inbox.com', 'lavabit.com',
  'ymail.com',
]);

export function isFreeProvider(domain: string): boolean {
  return FREE_PROVIDERS.has(domain.toLowerCase());
}
