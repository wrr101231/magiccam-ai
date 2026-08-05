'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/glass.module.css';

interface User {
  id: string;
  email: string;
}

interface Installer {
  id: string;
  os: string;
  fileUrl: string;
  fileSizeMB: number;
  checksum: string;
  downloadCount: number;
  enabled: boolean;
}

interface Release {
  id: string;
  version: string;
  buildNumber: string | null;
  status: string;
  releaseNotes: string;
  createdAt: string;
  installers: Installer[];
}

const OS_META: Record<string, { icon: string; label: string; ext: string }> = {
  Windows: { icon: '🪟', label: 'MagicCamAI Desktop for Windows', ext: '.exe' },
  macOS: { icon: '🍎', label: 'MagicCamAI Desktop for macOS (Apple Silicon & Intel)', ext: '.dmg / .zip' },
  Linux: { icon: '🐧', label: 'MagicCamAI Desktop for Linux', ext: '.AppImage' },
};

export default function DownloadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({})),
      fetch('/api/releases').then(r => r.json()).catch(() => ({ releases: [] })),
    ]).then(([authData, relData]) => {
      if (authData.user) setUser(authData.user);

      // Find latest stable release
      const releases: Release[] = relData.releases || [];
      const stable = releases.find((r: Release) => r.status === 'Stable') || releases[0] || null;
      setRelease(stable);
    }).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (installerId: string) => {
    setDownloading(installerId);
    try {
      const res = await fetch('/api/downloads/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Download authorization failed. Make sure you have an active license.');
        return;
      }
      // Trigger real file download
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>
          Download MagicCamAI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Get the desktop application for your platform. Requires a valid license key to run.
        </p>
      </section>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading download permissions...</p>
          </div>
        ) : user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Installers Card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Latest Production Release</h3>

              {release && release.installers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {release.installers
                    .filter((i: Installer) => i.enabled)
                    .map((installer: Installer, idx: number, arr: Installer[]) => {
                      const meta = OS_META[installer.os] || { icon: '💻', label: `MagicCamAI for ${installer.os}`, ext: '' };
                      const isLast = idx === arr.length - 1;
                      return (
                        <div
                          key={installer.id}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            paddingBottom: isLast ? 0 : '20px',
                            borderBottom: isLast ? 'none' : '1px solid var(--glass-border)',
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
                              {meta.icon} {meta.label}
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              v{release.version} • {meta.ext} • {installer.fileSizeMB} MB • SHA256: {installer.checksum.slice(0, 12)}...
                            </p>
                          </div>
                          <button
                            className="btn btn-primary"
                            disabled={downloading === installer.id}
                            onClick={() => handleDownload(installer.id)}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {downloading === installer.id ? 'Preparing...' : `📥 Download for ${installer.os}`}
                          </button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ background: 'rgba(245,158,11,0.08)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ color: '#f59e0b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    No installer packages are currently available. A new release will be published soon. Please check back later or contact support.
                  </p>
                </div>
              )}
            </div>

            {/* Release Notes */}
            {release && (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.35rem', marginBottom: '16px' }}>v{release.version} Release Notes</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {release.releaseNotes || 'No release notes published for this version.'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Downloads Restricted</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 32px auto', lineHeight: 1.6 }}>
              You must be logged in as an active customer to download the MagicCamAI desktop software binaries.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href="/login" className="btn btn-primary" style={{ padding: '12px 28px' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-secondary" style={{ padding: '12px 28px' }}>
                Register Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
