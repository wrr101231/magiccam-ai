'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/glass.module.css';

interface User {
  id: string;
  email: string;
}

export default function PricingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (planName: string, price: number) => {
    if (!user) {
      // Redirect to register/login if not authenticated
      router.push(`/register?redirect=/pricing&plan=${encodeURIComponent(planName)}`);
      return;
    }

    setPurchasing(planName);
      // Redirect directly to our new manual crypto checkout flow
      router.push(`/checkout?plan=${encodeURIComponent(planName)}&amount=${price}`);
      setPurchasing(null);
  };

  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>
          Select Your License Plan
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Buy once, run forever. No monthly recurring fees. Every license maps to a single hardware binding and can be freed/re-assigned instantly.
        </p>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center', alignItems: 'stretch' }}>
        
        {/* Plan 1 */}
        <div className="glass-card" style={{ flex: '1 1 300px', maxWidth: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 30px' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>6 Months Access</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Perfect for temporary projects and short-term trials.</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff' }}>$150</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>USD</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '40px' }}>
              <li>✅ 1 Local Device Activation</li>
              <li>✅ 6 Months AI Model Updates</li>
              <li>✅ GPU & CPU Accelerated inference</li>
              <li>✅ Email customer support</li>
            </ul>
          </div>
          <button 
            disabled={purchasing !== null}
            onClick={() => handlePurchase('6 Months', 150)} 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '14px' }}
          >
            {purchasing === '6 Months' ? 'Processing...' : user ? 'Purchase Now' : 'Sign Up to Buy'}
          </button>
        </div>

        {/* Plan 2 - Featured */}
        <div 
          className="glass-card" 
          style={{ 
            flex: '1 1 300px', 
            maxWidth: '360px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            padding: '40px 30px',
            borderColor: 'var(--accent)',
            boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.1)',
            position: 'relative'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: '-16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)',
              color: '#ffffff',
              padding: '4px 16px',
              borderRadius: '100px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Most Popular
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>1 Year Access</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Ideal for content creators, streamers, and developers.</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff' }}>$200</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>USD</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '40px' }}>
              <li>✅ 1 Local Device Activation</li>
              <li>✅ 12 Months AI Model Updates</li>
              <li>✅ GPU & CPU Accelerated inference</li>
              <li>✅ Priority Email support</li>
            </ul>
          </div>
          <button 
            disabled={purchasing !== null}
            onClick={() => handlePurchase('1 Year', 200)} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
          >
            {purchasing === '1 Year' ? 'Processing...' : user ? 'Purchase Now' : 'Sign Up to Buy'}
          </button>
        </div>

        {/* Plan 3 */}
        <div className="glass-card" style={{ flex: '1 1 300px', maxWidth: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 30px' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Lifetime Access</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Complete ownership with permanent access to updates.</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff' }}>$300</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>USD</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '40px' }}>
              <li>✅ 1 Local Device Activation</li>
              <li>✅ Permanent AI Model Updates</li>
              <li>✅ GPU & CPU Accelerated inference</li>
              <li>✅ 24/7 Priority support channel</li>
            </ul>
          </div>
          <button 
            disabled={purchasing !== null}
            onClick={() => handlePurchase('Lifetime', 300)} 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '14px' }}
          >
            {purchasing === 'Lifetime' ? 'Processing...' : user ? 'Purchase Now' : 'Sign Up to Buy'}
          </button>
        </div>

      </div>
    </div>
  );
}
