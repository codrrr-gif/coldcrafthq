'use client';

import { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = session?.user?.name || session?.user?.email || '';

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border-subtle bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6 min-w-0">
            <span className="font-display text-lg text-text-primary shrink-0">{clientName}</span>

            {/* Hamburger button -- visible below md */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 shrink-0"
              aria-label="Toggle navigation menu"
            >
              <span className={`block w-5 h-0.5 bg-text-secondary transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-[4px]' : ''}`} />
              <span className={`block w-5 h-0.5 bg-text-secondary transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-text-secondary transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-[4px]' : ''}`} />
            </button>

            {/* Desktop nav links -- hidden below md */}
            <div className="hidden md:flex items-center gap-1">
              <div className="h-5 w-px bg-border-subtle mr-2" />
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

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-text-tertiary font-mono hidden sm:inline truncate max-w-[160px]">
              {userName}
            </span>
            <div className="h-4 w-px bg-border-subtle hidden sm:block" />
            <button
              onClick={() => signOut({ callbackUrl: '/portal/login' })}
              className="text-xs text-text-tertiary hover:text-text-primary font-mono transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown -- visible below md when open */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-bg-surface/95 backdrop-blur-sm">
            <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col gap-1">
              {portalNav.map((item) => {
                const isActive =
                  item.href === '/portal/dashboard'
                    ? pathname === '/portal/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-bg-surface-hover text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-2 pt-2 border-t border-border-subtle px-3">
                <span className="text-xs text-text-tertiary font-mono">{userName}</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
