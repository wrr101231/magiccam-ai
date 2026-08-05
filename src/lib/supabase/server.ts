import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opt = { ...options };
              if (process.env.NODE_ENV !== 'production') {
                opt.secure = false;
              }
              cookieStore.set(name, value, opt);
            });
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored if middleware
            // refreshes the session.
          }
        },
      },
    }
  );
}
