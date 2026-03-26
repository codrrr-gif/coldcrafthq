import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Admin dashboard — requires admin role
  if (pathname.startsWith('/dashboard')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Portal pages (except login) — requires portal role
  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login') && !pathname.startsWith('/portal/invite')) {
    if (!token || !token.clientId) {
      return NextResponse.redirect(new URL('/portal/login', req.url));
    }
    return NextResponse.next();
  }

  // Portal API — requires portal session
  if (pathname.startsWith('/api/portal')) {
    if (!token || !token.clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin API — requires admin role
  if (pathname.startsWith('/api/admin')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Existing protected routes — require any valid session
  if (
    pathname.startsWith('/api/replies') ||
    pathname.startsWith('/api/pipeline/leads') ||
    pathname.startsWith('/api/crm') ||
    pathname.startsWith('/api/instantly') ||
    pathname.startsWith('/api/heat') ||
    pathname.startsWith('/api/learning') ||
    pathname.startsWith('/api/verify/jobs') ||
    pathname.startsWith('/api/verify/results') ||
    pathname.startsWith('/api/verify/campaigns') ||
    pathname.startsWith('/api/verify/bulk') ||
    pathname.startsWith('/api/knowledge') ||
    pathname.startsWith('/api/dashboard')
  ) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portal/:path*',
    '/api/portal/:path*',
    '/api/admin/:path*',
    '/api/replies/:path*',
    '/api/pipeline/leads/:path*',
    '/api/crm/:path*',
    '/api/instantly/experiments/:path*',
    '/api/instantly/health/:path*',
    '/api/heat/:path*',
    '/api/learning/insights/:path*',
    '/api/verify/jobs/:path*',
    '/api/verify/results/:path*',
    '/api/verify/campaigns/:path*',
    '/api/verify/bulk',
    '/api/knowledge/:path*',
    '/api/dashboard/:path*',
  ],
};
