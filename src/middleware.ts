export { auth as middleware } from '@/lib/auth';

export const config = {
  // Protect admin routes
  matcher: ['/admin/:path*'],
};
