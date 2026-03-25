export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
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
    '/api/knowledge/:path*',
    '/api/dashboard/:path*',
  ],
}
