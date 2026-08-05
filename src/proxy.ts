import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const opt = { ...options };
            if (process.env.NODE_ENV !== 'production') {
              opt.secure = false;
            }
            supabaseResponse.cookies.set(name, value, opt);
          });
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Protect /dashboard and /admin routes
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'ADMIN') {
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect authenticated users trying to access login/register back to dashboard
  if ((url.pathname === '/login' || url.pathname === '/register') && user) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|releases/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
export default proxy;
