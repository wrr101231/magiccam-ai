'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from '@/styles/glass.module.css';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.user.role === 'ADMIN') {
          setAdmin(data.user);
        } else if (data.user) {
          // Logged in but not admin - send to dashboard
          router.push('/dashboard');
        } else {
          // Not logged in - login
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
        <p style={{ color: 'var(--text-secondary)' }}>Verifying administrative access...</p>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside 
        style={{ 
          width: '280px', 
          borderRight: '1px solid var(--glass-border)', 
          background: 'rgba(10, 10, 12, 0.95)', 
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Brand */}
          <Link href="/" className={styles.brand} style={{ marginBottom: '40px' }}>
            <span className={styles.brandIcon} style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent) 100%)' }}></span>
            <span>MagicCam Admin</span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link 
              href="/admin" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start', 
                background: pathname === '/admin' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/admin' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/admin' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              📊 Overview & Stats
            </Link>
            
            <Link 
              href="/admin/users" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/admin/users' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/admin/users' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/admin/users' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              👥 User Management
            </Link>
            
            <Link 
              href="/admin/licenses" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/admin/licenses' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/admin/licenses' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/admin/licenses' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              🔑 License Control
            </Link>

            <Link 
              href="/admin/devices" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/admin/devices' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/admin/devices' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/admin/devices' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              🖥️ Active Devices
            </Link>

            <Link 
              href="/releases" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/releases' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/releases' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/releases' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              📦 Releases
            </Link>

            <Link 
              href="/admin/audit" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/admin/audit' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/admin/audit' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/admin/audit' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              📜 Audit Logs
            </Link>

            <Link 
              href="/wallets" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/wallets' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/wallets' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/wallets' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              👛 Crypto Wallets
            </Link>

            <Link 
              href="/orders" 
              className="btn btn-secondary" 
              style={{ 
                justifyContent: 'flex-start',
                background: pathname === '/orders' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                borderColor: pathname === '/orders' ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                color: pathname === '/orders' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              🛒 Crypto Orders
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.15)', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', color: '#ec4899', fontWeight: 600 }}>
            🛡️ Secure Admin Session
          </div>
          <Link href="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            🔑 User Dashboard
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
