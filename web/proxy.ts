import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Admin routes are now protected by client-side authentication
  // This middleware is kept minimal for future server-side protection if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match admin routes for future server-side protection
     * Currently using client-side auth protection
     */
    '/admin/:path*',
  ],
};
