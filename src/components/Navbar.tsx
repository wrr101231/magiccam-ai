'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/styles/glass.module.css';

interface User {
  email: string;
  role: string;
  profile?: {
    name?: string;
  };
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <nav className={styles.glassNav}>
      <div className={`${styles.container} ${styles.glassNavContainer}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}></span>
          <span>MagicCamAI</span>
        </Link>

        <ul className={styles.navLinks}>
          <li><Link href="/" className={styles.navLink}>Home</Link></li>
          <li><Link href="/features" className={styles.navLink}>Features</Link></li>
          <li><Link href="/pricing" className={styles.navLink}>Pricing</Link></li>
          <li><Link href="/download" className={styles.navLink}>Download</Link></li>
          <li><Link href="/support" className={styles.navLink}>Support</Link></li>
        </ul>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {loading ? (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Checking session...</span>
          ) : user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                  Admin Panel
                </Link>
              )}
              <Link href="/dashboard" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                Dashboard
              </Link>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
