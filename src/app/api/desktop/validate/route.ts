import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'magiccamai-default-local-super-secret-key-12345';

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { licenseKey, hardwareFingerprint, activationToken } = await req.json();

    if (!licenseKey || !hardwareFingerprint || !activationToken) {
      return NextResponse.json({ error: 'Missing validation details' }, { status: 400 });
    }

    // 1. Verify token signature
    let payload: any;
    try {
      payload = jwt.verify(activationToken, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid activation token signature' }, { status: 401 });
    }

    if (!payload) {
      return NextResponse.json({ error: 'Invalid activation token signature' }, { status: 401 });
    }

    // 2. Validate token subject roles match
    const expectedRoleProof = `activation:${licenseKey}:${hardwareFingerprint}`;
    if (payload.role !== expectedRoleProof) {
      return NextResponse.json({ error: 'Activation token details mismatch' }, { status: 401 });
    }

    // 3. Call SECURITY DEFINER RPC function — bypasses RLS
    const supabase = createAnonClient();

    const { data, error } = await supabase.rpc('desktop_validate', {
      p_license_key: licenseKey,
      p_hardware_fingerprint: hardwareFingerprint,
    });

    if (error) {
      console.error('Desktop validation RPC error:', error);
      return NextResponse.json({ error: 'Server error during validation' }, { status: 500 });
    }

    const result = data as any;

    if (!result.valid) {
      return NextResponse.json({ error: result.error || 'Validation failed' }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      message: result.message || 'License validation active',
      plan: result.plan,
      lastOnline: result.lastOnline || result.lastonline,
    });
  } catch (error: any) {
    console.error('Desktop validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during validation check' },
      { status: 500 }
    );
  }
}
