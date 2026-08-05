import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service_role key.
 * NEVER expose this client to the browser.
 * Use only in API routes and server-side operations.
 *
 * If the SUPABASE_SERVICE_ROLE_KEY is not set, this will throw.
 * For routes that need graceful degradation, use tryCreateAdminClient() instead.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
    throw new Error(
      'Missing or placeholder SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set this in .env.local to enable admin operations.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Tries to create an admin client. Returns null if the service role key
 * is missing or is a placeholder. Use this for optional admin operations
 * like audit logging that should not block the main flow.
 */
export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
