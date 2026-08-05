'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginFormContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to wherever we came from or default to dashboard
        const redirect = searchParams.get('redirect') || '/dashboard';
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>
          Sign in to manage your licenses and download installer bundles.
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

        <form onSubmit={handleLogin}>
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

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" htmlFor="password">Password</label>
              <a href="#" style={{ fontSize: '0.8rem', color: 'var(--accent)' }} onClick={() => alert('Simulating password recovery: Please register a new account for testing.')}>Forgot?</a>
            </div>
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
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register now</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '24px' }}>
      <Suspense fallback={<div>Loading form...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
