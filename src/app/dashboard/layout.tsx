'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const icon = (d: string) => (
  <svg className="w-[15px] h-[15px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const navGroups: NavGroup[] = [
  {
    label: 'Pipeline',
    items: [
      { href: '/dashboard/pipeline', label: 'Leads', icon: icon('M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z') },
      { href: '/dashboard/tam', label: 'Companies', icon: icon('M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21') },
      { href: '/dashboard/heat', label: 'Signals', icon: icon('M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z') },
      { href: '/dashboard/verify', label: 'Verify', icon: icon('M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z') },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/dashboard/insights', label: 'Funnel', icon: icon('M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z') },
      { href: '/dashboard/analytics', label: 'Performance', icon: icon('M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M3 20.25h18M3.75 20.25V3.75') },
      { href: '/dashboard/crm', label: 'CRM', icon: icon('M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z') },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { href: '/dashboard/voice', label: 'Voice', icon: icon('M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z') },
      { href: '/dashboard/knowledge', label: 'Knowledge', icon: icon('M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25') },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/dashboard/clients', label: 'Clients', icon: icon('M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z') },
      { href: '/dashboard/requests', label: 'Requests', icon: icon('M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z') },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Replies',
  '/dashboard/pipeline': 'Leads',
  '/dashboard/tam': 'Companies',
  '/dashboard/heat': 'Signals',
  '/dashboard/verify': 'Verify',
  '/dashboard/insights': 'Funnel',
  '/dashboard/analytics': 'Performance',
  '/dashboard/crm': 'CRM',
  '/dashboard/voice': 'Voice',
  '/dashboard/knowledge': 'Knowledge',
  '/dashboard/clients': 'Clients',
  '/dashboard/requests': 'Requests',
  '/dashboard/settings': 'Settings',
};

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 px-3 py-[7px] rounded-md text-[13px] transition-all duration-150 ${
        isActive
          ? 'bg-bg-surface-hover text-text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover/40'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent-primary" />
      )}
      <span className={isActive ? 'text-accent-primary' : ''}>{item.icon}</span>
      <span className="font-medium">{item.label}</span>
      {item.badge && (
        <span className="ml-auto bg-accent-primary text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pageTitle = PAGE_TITLES[pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-[220px]' : 'w-0'
        } flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col transition-all duration-200 overflow-hidden`}
      >
        <div className="flex flex-col h-full min-w-[220px]">
          {/* Logo */}
          <div className="px-5 h-14 flex items-center gap-2.5 border-b border-border-subtle flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[15px] text-text-primary font-semibold tracking-[-0.01em]">ColdCraft</span>
                <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-accent-primary/80">GTM</span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
            {/* Replies — top-level, no group */}
            <NavLink
              item={{
                href: '/dashboard',
                label: 'Replies',
                icon: icon('M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z'),
              }}
              pathname={pathname}
            />

            {/* Grouped sections */}
            {navGroups.map((group) => (
              <div key={group.label} className="pt-5">
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-tertiary/70">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section — Settings only */}
          <div className="border-t border-border-subtle px-2.5 py-3 flex-shrink-0">
            <NavLink
              item={{
                href: '/dashboard/settings',
                label: 'Settings',
                icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z'),
              }}
              pathname={pathname}
            />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border-subtle bg-bg-surface/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-text-tertiary hover:text-text-primary transition-colors p-1 -ml-1 rounded-md hover:bg-bg-surface-hover/50"
              aria-label="Toggle sidebar"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" />
                )}
              </svg>
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <h1 className="text-sm font-medium text-text-primary">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
              <span className="text-[11px] text-text-tertiary font-mono">Active</span>
            </div>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-[11px] text-text-tertiary hover:text-text-primary font-mono transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-6 py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
