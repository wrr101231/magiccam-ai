'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from '@/styles/glass.module.css';

interface User {
  id: string;
  email: string;
  role: string;
  profile?: {
    name?: string;
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login?redirect=' + encodeURIComponent(pathname));
        }
      })
      .catch((e) => {
        console.error(e);
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying dashboard credentials...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside 
        style={{ 
          width: '280px', 
          borderRight: '1px solid var(--glass-border)', 
          background: 'rgba(10, 10, 12, 0.9)', 
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Brand */}
          <Link href="/" className={styles.brand} style={{ marginBottom: '40px' }}>
            <span className={styles.brandIcon}></span>
            <span>MagicCamAI</span>
          </Link>

          {/* User badge */}
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '32px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.profile?.name || user.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
              {user.role} Account
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link 
              href="/dashboard" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start', 
                background: pathname === '/dashboard' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderColor: pathname === '/dashboard' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                color: pathname === '/dashboard' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              🔑 My Licenses
            </Link>
            
            <Link 
              href="/download" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/download' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderColor: pathname === '/download' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                color: pathname === '/download' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              📥 Download Center
            </Link>
            
            <Link 
              href="/pricing" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/pricing' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderColor: pathname === '/pricing' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                color: pathname === '/pricing' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              🛒 Buy Licenses
            </Link>

            {user.role === 'ADMIN' && (
              <Link 
                href="/admin" 
                className="btn btn-secondary" 
                style={{ 
                  justifyContent: 'flex-start',
                  borderColor: 'rgba(236, 72, 153, 0.2)',
                  color: '#ec4899',
                  marginTop: '16px'
                }}
              >
                🛡️ Admin Panel
              </Link>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            🏠 Return to Site
          </Link>
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', fontSize: '0.85rem' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
