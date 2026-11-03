import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Clerk runs ONLY on admin + sign-in routes, so public pages carry no auth JavaScript and no handshake redirects.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const admin = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (admin(req)) {
    const { userId } = await auth();
    if (!userId) {
      if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
      return NextResponse.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent(req.nextUrl.pathname)}`, SITE));
    }
    // The admin check itself (role or verified allow-listed email) runs on the server in every admin page and action.
  }
});

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*', '/sign-in/:path*'] };
