import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Retrieves the current session using Supabase Server Client
 */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      userId: user.id,
      email: user.email || '',
      role: profile?.role || 'USER'
    };
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}

/**
 * Throws or returns 401 response if user is not an admin
 */
export async function requireAdmin(req?: NextRequest): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin role required');
  }
  return session;
}
