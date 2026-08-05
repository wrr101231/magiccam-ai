import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'magiccamai-default-local-super-secret-key-12345';

/**
 * Creates an anonymous Supabase client for desktop API calls.
 * Desktop calls are unauthenticated (no user session), so we use the anon key
 * and call SECURITY DEFINER functions that bypass RLS.
 */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, licenseKey, hardwareFingerprint, deviceName, osName, osVersion } = await req.json();

    // 1. Basic input validation
    if (!email || !licenseKey || !hardwareFingerprint || !deviceName || !osName) {
      return NextResponse.json(
        { error: 'Missing activation credentials (email, licenseKey, hardwareFingerprint, deviceName, osName are required)' },
        { status: 400 }
      );
    }

    const supabase = createAnonClient();

    // 2. Call the SECURITY DEFINER RPC function — bypasses RLS
    const { data, error } = await supabase.rpc('desktop_activate', {
      p_email: email,
      p_license_key: licenseKey,
      p_hardware_fingerprint: hardwareFingerprint,
      p_device_name: deviceName,
      p_os_name: osName,
      p_os_version: osVersion || '',
    });

    if (error) {
      console.error('Desktop activation RPC error:', error);
      return NextResponse.json({ error: 'Server error during activation' }, { status: 500 });
    }

    // The function returns a JSONB object
    const result = data as any;

    if (!result.success) {
      // Map error types to HTTP status codes
      const msg = result.error || 'Activation failed';
      const status = msg.includes('not found') ? 404
        : msg.includes('does not belong') ? 403
        : msg.includes('suspended') || msg.includes('revoked') || msg.includes('expired') ? 403
        : msg.includes('already bound') ? 409
        : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    // 3. Generate a signed activation token for the desktop app
    const signedToken = jwt.sign(
      {
        userId: result.user_id,
        email: result.email,
        role: `activation:${licenseKey}:${hardwareFingerprint}`,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      message: result.message || 'Activation successful',
      activationToken: signedToken,
      deviceName,
      plan: result.plan,
      expirationDate: result.expiration_date,
    });
  } catch (error: any) {
    console.error('Desktop activation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during desktop activation' },
      { status: 500 }
    );
  }
}
