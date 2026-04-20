import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/accounts', '/transactions', '/categories', '/income', '/reports', '/settings', '/subscriptions', '/budgets', '/profile', '/admin'];
const AUTH_ONLY  = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.has('cf_logged_in');

  if (PROTECTED.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  if (AUTH_ONLY.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    if (loggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
