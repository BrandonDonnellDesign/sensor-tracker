import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    console.log('🔒 Admin route protection:', request.nextUrl.pathname);
    
    if (!user) {
      console.log('❌ No user for admin route, redirecting to login');
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Check admin role
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('👑 Admin check:', {
        hasProfile: !!profile,
        role: (profile as any)?.role || 'no_role_column',
        error: profileError?.message,
        userId: user.id.slice(0, 8) + '...'
      });

      // Check if this is a known admin user
      // First check if role column exists and user has admin role
      const hasAdminRole = (profile as any)?.role === 'admin';
      
      // Fallback: check if this is a known admin email (temporary solution)
      const isKnownAdminEmail = user.email && [
        'admin@example.com',
        // Add your actual admin email here
      ].includes(user.email);
      
      const isKnownAdmin = hasAdminRole || isKnownAdminEmail;

      if (profileError || !profile || !isKnownAdmin) {
        console.log('❌ Not admin, redirecting to dashboard');
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        
        if (profileError?.code === 'PGRST116') {
          url.searchParams.set('error', 'no_profile')
        } else {
          url.searchParams.set('error', 'admin_required')
        }
        
        return NextResponse.redirect(url)
      }

      console.log('✅ Admin access granted');
    } catch (error) {
      console.error('🚨 Admin check error:', error);
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'auth_error')
      return NextResponse.redirect(url)
    }
  }

  // For protected routes with no user, redirect to login
  // Only redirect for dashboard routes, not API routes or public routes
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/error') &&
    !request.nextUrl.pathname.startsWith('/promote-admin')
  ) {
    console.log('🔒 Protected route without user, redirecting to login:', request.nextUrl.pathname);
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}