'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect back to pricing to complete checkout if relevant, or default to dashboard
        const plan = searchParams.get('plan');
        const redirect = searchParams.get('redirect');
        if (plan && redirect) {
          router.push(`${redirect}?plan=${encodeURIComponent(plan)}`);
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', width: '100%' }}>
      <div className="glass-card" style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', textAlign: 'center' }}>Create Account</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>
          Create a portal account to download and buy software licenses.
        </p>

        {error && (
          <div 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444', 
              padding: '12px', 
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              marginBottom: '24px' 
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label className="input-label" htmlFor="name">Display Name</label>
            <input 
              className="input-field" 
              type="text" 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder="Alex Smith"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input 
              className="input-field" 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="name@company.com"
            />
          </div>

          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label" htmlFor="password">Password (6+ characters)</label>
            <input 
              className="input-field" 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', marginBottom: '24px' }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '24px' }}>
      <Suspense fallback={<div>Loading form...</div>}>
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
