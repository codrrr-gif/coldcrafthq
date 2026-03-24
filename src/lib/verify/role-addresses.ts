// ============================================
// Role-Based Email Prefixes
// ============================================
// Role-based addresses (info@, admin@, sales@) are rarely tied to
// a real person. Sending cold email to them tanks reply rates and
// can trigger spam complaints. Flag them as risky.

export const ROLE_PREFIXES = new Set([
  // Administrative
  'admin', 'administrator', 'postmaster', 'hostmaster', 'webmaster',
  'sysadmin', 'root', 'abuse', 'noc', 'security',

  // Generic contact
  'info', 'information', 'contact', 'hello', 'hi', 'hey', 'welcome',
  'general', 'enquiries', 'enquiry', 'inquiry', 'inquiries',
  'office', 'reception', 'frontdesk', 'mail', 'email',

  // Support
  'support', 'help', 'helpdesk', 'service', 'services',
  'customerservice', 'customercare', 'cs', 'care', 'assistance',
  'feedback', 'complaints', 'ticket', 'tickets',

  // Sales & Marketing
  'sales', 'marketing', 'ads', 'advertising', 'partnerships',
  'affiliates', 'partner', 'partners', 'bizdev', 'biz',
  'deals', 'offers', 'promo', 'promotions',

  // Departments
  'hr', 'humanresources', 'careers', 'jobs', 'recruiting',
  'recruitment', 'talent', 'hiring', 'people', 'team',
  'legal', 'compliance', 'privacy', 'gdpr', 'dpo',
  'finance', 'accounting', 'accounts', 'billing', 'invoices',
  'invoicing', 'payments', 'payable', 'receivable', 'treasury',
  'procurement', 'purchasing', 'vendor', 'vendors', 'supply',
  'operations', 'ops', 'logistics',
  'it', 'tech', 'technical', 'engineering', 'dev', 'development',
  'devops', 'infrastructure', 'platform',
  'design', 'creative', 'brand', 'branding',
  'pr', 'press', 'media', 'communications', 'comms',
  'social', 'community', 'events', 'webinar', 'webinars',
  'research', 'analytics', 'data', 'insights',
  'training', 'learning', 'education',
  'quality', 'qa', 'testing',
  'risk', 'audit', 'internal',
  'facilities', 'maintenance',

  // Leadership titles as addresses
  'ceo', 'cfo', 'cto', 'coo', 'cio', 'cmo', 'cso', 'cpo', 'cro',
  'vp', 'president', 'director', 'directors', 'board',
  'founder', 'founders', 'owner', 'management', 'executive',
  'leadership', 'staff',

  // System / automated
  'noreply', 'no-reply', 'no_reply', 'donotreply', 'do-not-reply',
  'mailer-daemon', 'daemon', 'bounce', 'bounces', 'return',
  'notifications', 'notification', 'alerts', 'alert',
  'updates', 'update', 'news', 'newsletter', 'subscribe',
  'unsubscribe', 'list', 'listserv', 'majordomo',
  'autoresponder', 'auto', 'automated', 'system', 'robot',

  // E-commerce
  'orders', 'order', 'returns', 'refunds', 'shipping',
  'delivery', 'tracking', 'store', 'shop', 'ecommerce',
  'checkout', 'cart', 'fulfillment',

  // Membership / community
  'members', 'membership', 'subscriber', 'subscribers',
  'register', 'registration', 'signup', 'signin', 'login',
  'account', 'myaccount', 'user', 'users',
  'volunteer', 'donate', 'donations', 'giving',

  // Technical / infrastructure
  'www', 'ftp', 'smtp', 'pop', 'imap', 'dns', 'ssl', 'api',
  'test', 'testing', 'demo', 'staging', 'production', 'sandbox',
  'monitor', 'monitoring', 'status', 'health',
  'backup', 'backups', 'archive', 'archives',
  'logs', 'logging', 'debug', 'errors', 'error',
  'webhook', 'webhooks', 'integration', 'integrations',

  // Education
  'admissions', 'registrar', 'dean', 'faculty',
  'professor', 'instructor', 'teacher', 'tutor',
  'student', 'students', 'alumni', 'library',
]);

export function isRoleBased(localPart: string): boolean {
  return ROLE_PREFIXES.has(localPart.toLowerCase());
}
