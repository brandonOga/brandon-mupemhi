import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

// Refreshes the auth session cookie on every request and guards /admin.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without Supabase configured there's no auth to enforce; let everything
  // through except the admin area, which would be non-functional anyway.
  if (!isSupabaseConfigured) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      // allow the login page itself through so it can show a setup notice
      if (request.nextUrl.pathname !== '/admin/login') {
        return NextResponse.redirect(url);
      }
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';
  const isAdminArea = pathname.startsWith('/admin');

  // Not signed in and trying to reach a protected admin page → login.
  if (isAdminArea && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // Already signed in but on the login page → dashboard.
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}
