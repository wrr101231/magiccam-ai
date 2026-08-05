import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import crypto from 'crypto';

function generateLicenseKey() {
  return 'MC-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    // Ensure caller is ADMIN
    await requireAdmin(req);
    
    const body = await req.json();
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Fetch the Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });
    }

    // 2. Generate a License Key
    const licenseKey = generateLicenseKey();
    
    // 3. Update the User's Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        active_plan: order.plan_name,
        license_key: licenseKey
      })
      .eq('id', order.user_id);
      
    if (profileError) {
      throw new Error(`Profile update failed: ${profileError.message}`);
    }
    
    // 4. Update the Order Status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'APPROVED' })
      .eq('id', orderId);
      
    if (updateError) {
      throw new Error(`Order status update failed: ${updateError.message}`);
    }
    
    return NextResponse.json({ success: true, licenseKey });
  } catch (error: any) {
    console.error('Approve Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
