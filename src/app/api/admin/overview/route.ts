import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch metrics — RLS is_admin() grants full access
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: licenseCount } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Activated');

    const { count: purchaseCount } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PAID');

    // Aggregate revenue
    const { data: purchases } = await supabase
      .from('purchases')
      .select('amount')
      .eq('status', 'PAID');

    const totalRevenue = purchases ? purchases.reduce((sum, curr) => sum + Number(curr.amount || 0), 0) : 0;

    // Plan distributions
    const { data: licensePlans } = await supabase
      .from('licenses')
      .select('plan');

    const plansBreakdown = { '6 Months': 0, '1 Year': 0, 'Lifetime': 0 };
    if (licensePlans) {
      licensePlans.forEach(l => {
        const plan = l.plan as keyof typeof plansBreakdown;
        if (plansBreakdown[plan] !== undefined) {
          plansBreakdown[plan]++;
        }
      });
    }

    // Recent licenses
    const { data: recentLicensesData } = await supabase
      .from('licenses')
      .select('*, profiles(email)')
      .order('purchase_date', { ascending: false })
      .limit(5);

    const recentLicenses = recentLicensesData ? recentLicensesData.map(rl => ({
      ...rl,
      user: { email: (rl as any).profiles?.email }
    })) : [];

    // Recent logs
    const { data: recentLogsData } = await supabase
      .from('audit_logs')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(6);

    const recentLogs = recentLogsData ? recentLogsData.map(rl => ({
      ...rl,
      user: { email: (rl as any).profiles?.email }
    })) : [];

    return NextResponse.json({
      metrics: {
        userCount: userCount || 0,
        licenseCount: licenseCount || 0,
        activeCount: activeCount || 0,
        purchaseCount: purchaseCount || 0,
        totalRevenue,
        plansBreakdown,
      },
      recentLicenses,
      recentLogs,
    });
  } catch (error: any) {
    console.error('Admin metrics overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error loading admin statistics' },
      { status: 500 }
    );
  }
}
