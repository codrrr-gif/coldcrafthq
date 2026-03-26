'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const portalNav = [
  { href: '/portal/dashboard', label: 'Dashboard' },
  { href: '/portal/reports', label: 'Reports' },
  { href: '/portal/meetings', label: 'Meetings' },
  { href: '/portal/knowledge', label: 'Knowledge' },
  { href: '/portal/billing', label: 'Billing' },
  { href: '/portal/activity', label: 'Activity' },
  { href: '/portal/requests', label: 'Requests' },
  { href: '/portal/settings', label: 'Settings' },
];

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const clientName = (session as unknown as Record<string, unknown>)?.clientName as string || 'Portal';

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border-subtle bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-display text-lg text-text-primary">{clientName}</span>
            <div className="h-5 w-px bg-border-subtle" />
            <div className="flex items-center gap-1">
              {portalNav.map((item) => {
                const isActive =
                  item.href === '/portal/dashboard'
                    ? pathname === '/portal/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-bg-surface-hover text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary font-mono">{session?.user?.email}</span>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              onClick={() => signOut({ callbackUrl: '/portal/login' })}
              className="text-xs text-text-tertiary hover:text-text-primary font-mono transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
