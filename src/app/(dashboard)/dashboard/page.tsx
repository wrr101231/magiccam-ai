'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface License {
  id: string;
  key: string;
  plan: string;
  status: string;
  purchaseDate: string;
  expirationDate: string | null;
  activatedDeviceName: string | null;
  activatedDeviceFingerprint: string | null;
  activationDate: string | null;
}

interface Purchase {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  gatewayRef: string;
  createdAt: string;
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

interface DownloadLog {
  id: string;
  filename: string;
  version: string;
  os: string;
  status: string;
  downloadedAt: string;
}

export default function DashboardPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  
  // OS Detection
  const [detectedOS, setDetectedOS] = useState<'Windows' | 'macOS' | 'Linux'>('Windows');
  const [selectedOS, setSelectedOS] = useState<'Windows' | 'macOS' | 'Linux'>('Windows');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/licenses');
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
        setPurchases(data.purchases || []);
      }

      // Fetch Releases
      const relRes = await fetch('/api/releases');
      if (relRes.ok) {
        const relData = await relRes.json();
        setReleases(relData.releases || []);
      }

      // Fetch Download History
      const histRes = await fetch('/api/downloads/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setDownloadHistory(histData.history || []);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Detect user OS
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent;
      if (userAgent.indexOf('Mac') !== -1) {
        setDetectedOS('macOS');
        setSelectedOS('macOS');
      } else if (userAgent.indexOf('Linux') !== -1) {
        setDetectedOS('Linux');
        setSelectedOS('Linux');
      } else {
        setDetectedOS('Windows');
        setSelectedOS('Windows');
      }
    }
  }, []);

  const handleRevokeDevice = async (licenseId: string, deviceName: string) => {
    if (!confirm(`Are you sure you want to remove the computer "${deviceName}" from this license? This will instantly free the license for use on another machine.`)) {
      return;
    }

    setActioning(licenseId);
    try {
      const res = await fetch('/api/licenses/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Device unbound successfully.');
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to remove device.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error unbinding device.');
    } finally {
      setActioning(null);
    }
  };

  const handleDownload = async (installerId: string) => {
    try {
      // 1. Request secure time-limited token
      const reqRes = await fetch('/api/downloads/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId }),
      });

      const reqData = await reqRes.json();
      if (!reqRes.ok) {
        alert(reqData.message || 'Download authorization failed. Make sure you have an active license key.');
        return;
      }

      // 2. Trigger download via hidden anchor (keeps user on dashboard)
      const a = document.createElement('a');
      a.href = reqData.downloadUrl;
      a.download = '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Refresh download history after latency
      setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    } catch (e) {
      console.error('Download error:', e);
      alert('Network error initiating download.');
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>;
  }

  // Find latest installer matching selected OS
  const activeRelease = releases.find(r => r.status === 'Stable');
  const recommendedInstaller = activeRelease?.installers.find(i => i.os === selectedOS && i.enabled);

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Customer Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your licenses, activations, downloads, and billing history.</p>
        </div>
        <Link href="/pricing" className="btn btn-primary">
          🛒 Buy License
        </Link>
      </header>

      {/* 1. Licenses Section */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
          My Licenses ({licenses.length})
        </h2>

        {licenses.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔑</div>
            <h4 style={{ marginBottom: '8px' }}>No Licenses Found</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
              You don't have any MagicCamAI licenses yet. Purchase one to begin using the desktop app.
            </p>
            <Link href="/pricing" className="btn btn-primary">
              View Pricing Options
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {licenses.map((license) => (
              <div key={license.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span 
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        letterSpacing: '0.05em',
                        color: '#ffffff',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      {license.key}
                    </span>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        color: '#a78bfa', 
                        padding: '3px 8px', 
                        borderRadius: '100px',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}
                    >
                      {license.plan}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Purchased: {new Date(license.purchaseDate).toLocaleDateString()} 
                    {license.expirationDate && ` • Expires: ${new Date(license.expirationDate).toLocaleDateString()}`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status & Binding</div>
                  {license.status === 'Activated' ? (
                    <div>
                      <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        ● Active Computer
                      </span>
                      <div style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 500, marginTop: '2px' }}>
                        🖥️ {license.activatedDeviceName || 'Local Workstation'}
                      </div>
                    </div>
                  ) : license.status === 'Unused' ? (
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                        ○ Ready to Activate
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        No device linked
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        ⚠️ {license.status}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ justifySelf: 'end' }}>
                  {license.status === 'Activated' ? (
                    <button
                      disabled={actioning === license.id}
                      onClick={() => handleRevokeDevice(license.id, license.activatedDeviceName || 'Unspecified Device')}
                      className="btn btn-danger"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {actioning === license.id ? 'Revoking...' : 'Reset Activation'}
                    </button>
                  ) : license.status === 'Unused' ? (
                    <button
                      onClick={() => alert(`To activate this license, copy your license key (${license.key}) and enter it when launching the MagicCamAI desktop app.`)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Activation Instructions
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Download Center Section */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
          Download Center
        </h2>

        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.8rem' }}>🖥️</span>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Recommended for you</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  System detected operating system: <strong style={{ color: 'var(--accent-hover)' }}>{detectedOS}</strong>
                </p>
              </div>
            </div>

            {recommendedInstaller ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span><strong>Version:</strong> {activeRelease?.version}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Build Date: {activeRelease ? new Date(activeRelease.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  <span>File Size: {recommendedInstaller.fileSizeMB} MB</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>SHA256: {recommendedInstaller.checksum.slice(0, 16)}...</span>
                </div>
                
                <button 
                  onClick={() => handleDownload(recommendedInstaller.id)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                >
                  📥 Download Installer for {selectedOS}
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ color: '#ef4444', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  This version is not currently available for {selectedOS}. Please download the latest available release or contact support.
                </p>
              </div>
            )}

            {/* Manual Selector */}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Choose another OS:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['Windows', 'macOS', 'Linux'] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setSelectedOS(os)}
                    className={`btn ${selectedOS === os ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {os}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Release Notes */}
          <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '40px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '12px' }}>Release Notes (v{activeRelease?.version || '1.0.0'})</h3>
            <div 
              style={{ 
                maxHeight: '220px', 
                overflowY: 'auto', 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.5',
                paddingRight: '12px' 
              }}
            >
              {activeRelease?.releaseNotes || 'No release notes published for this version.'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Download History Section */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
          My Download History
        </h2>

        {downloadHistory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No downloads logged yet.</p>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>Date</th>
                  <th style={{ padding: '16px' }}>Filename</th>
                  <th style={{ padding: '16px' }}>Version</th>
                  <th style={{ padding: '16px' }}>Platform</th>
                  <th style={{ padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {downloadHistory.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px' }}>{new Date(log.downloadedAt).toLocaleString()}</td>
                    <td style={{ padding: '16px', color: '#ffffff' }}>{log.filename}</td>
                    <td style={{ padding: '16px' }}>{log.version}</td>
                    <td style={{ padding: '16px' }}>{log.os}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Billing History Section */}
      <section>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
          Purchase & Billing History
        </h2>

        {purchases.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No purchase records found.</p>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                  <th style={{ padding: '16px' }}>Date</th>
                  <th style={{ padding: '16px' }}>Transaction ID</th>
                  <th style={{ padding: '16px' }}>Amount Paid</th>
                  <th style={{ padding: '16px' }}>Method</th>
                  <th style={{ padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px' }}>{new Date(purchase.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', fontFamily: 'monospace' }}>{purchase.gatewayRef}</td>
                    <td style={{ padding: '16px', color: '#ffffff', fontWeight: 600 }}>${purchase.amount.toFixed(2)} {purchase.currency}</td>
                    <td style={{ padding: '16px' }}>{purchase.paymentMethod}</td>
                    <td style={{ padding: '16px' }}>
                      <span 
                        style={{
                          background: purchase.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: purchase.status === 'PAID' ? '#10b981' : '#ef4444',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
