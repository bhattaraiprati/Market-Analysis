import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  const { pathname } = request.nextUrl;

  console.log('Middleware - Path:', pathname, 'Token exists:', !!token);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Auth routes that shouldn't be accessible when logged in
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Protected routes
  const protectedRoutes = ['/dashboard', '/register/organization'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // If user has no token and trying to access protected route
  if (!token && isProtectedRoute) {
    console.log('Middleware - Redirecting to login (no token)');
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If user has token and trying to access auth routes, redirect to dashboard
  if (token && isAuthRoute) {
    console.log('Middleware - Redirecting to dashboard (has token, on auth page)');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
