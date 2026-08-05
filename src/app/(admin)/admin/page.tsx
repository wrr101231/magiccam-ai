'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Metrics {
  userCount: number;
  licenseCount: number;
  activeCount: number;
  purchaseCount: number;
  totalRevenue: number;
  plansBreakdown: {
    '6 Months': number;
    '1 Year': number;
    'Lifetime': number;
  };
}

interface License {
  id: string;
  key: string;
  plan: string;
  status: string;
  purchaseDate: string;
  user: {
    email: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    email: string;
  } | null;
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

interface DownloadRecord {
  id: string;
  filename: string;
  version: string;
  os: string;
  status: string;
  ipAddress: string;
  downloadedAt: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'releases' | 'storage' | 'downloads'>('overview');
  
  // Data States
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Storage Settings Form State
  const [storageBackend, setStorageBackend] = useState('local');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [nasPath, setNasPath] = useState('');

  // Release Creation Form State
  const [newVersion, setNewVersion] = useState('');
  const [newBuild, setNewBuild] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState('Stable');
  
  // Windows Installer inputs
  const [winUrl, setWinUrl] = useState('');
  const [winSize, setWinSize] = useState('150');
  const [winChecksum, setWinChecksum] = useState('');
  
  // macOS Installer inputs
  const [macUrl, setMacUrl] = useState('');
  const [macSize, setMacSize] = useState('145');
  const [macChecksum, setMacChecksum] = useState('');

  const fetchAdminData = async () => {
    try {
      // 1. Overview
      const overviewRes = await fetch('/api/admin/overview');
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics || null);
        setRecentLicenses(data.recentLicenses || []);
        setRecentLogs(data.recentLogs || []);
      }

      // 2. Releases
      const releasesRes = await fetch('/api/releases');
      if (releasesRes.ok) {
        const data = await releasesRes.json();
        setReleases(data.releases || []);
      }

      // 3. Storage Settings
      const storageRes = await fetch('/api/admin/storage');
      if (storageRes.ok) {
        const data = await storageRes.json();
        if (data.config) {
          setStorageBackend(data.config.backend || 'local');
          setS3Endpoint(data.config.s3Endpoint || '');
          setS3AccessKey(data.config.s3AccessKey || '');
          setS3SecretKey(data.config.s3SecretKey || '');
          setS3Bucket(data.config.s3Bucket || '');
          setNasPath(data.config.nasPath || '');
        }
      }

      // 4. Download Logs
      const downloadsRes = await fetch('/api/downloads/history');
      if (downloadsRes.ok) {
        const data = await downloadsRes.json();
        setDownloads(data.history || []);
      }
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: storageBackend,
          s3Endpoint,
          s3AccessKey,
          s3SecretKey,
          s3Bucket,
          nasPath,
        }),
      });

      if (res.ok) {
        alert('Storage configuration saved successfully.');
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to save config.');
      }
    } catch (e) {
      alert('Network error saving storage config.');
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || !newNotes) {
      alert('Please fill out version and release notes.');
      return;
    }

    const installers = [];
    if (winUrl) {
      installers.push({
        os: 'Windows',
        fileUrl: winUrl,
        fileSizeMB: parseFloat(winSize) || 0,
        checksum: winChecksum || 'sha256-win-mock',
      });
    }
    if (macUrl) {
      installers.push({
        os: 'macOS',
        fileUrl: macUrl,
        fileSizeMB: parseFloat(macSize) || 0,
        checksum: macChecksum || 'sha256-mac-mock',
      });
    }

    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion,
          buildNumber: newBuild || null,
          status: newStatus,
          releaseNotes: newNotes,
          installers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Software Release published successfully!');
        // Clear forms
        setNewVersion('');
        setNewBuild('');
        setNewNotes('');
        setWinUrl('');
        setMacUrl('');
        fetchAdminData();
      } else {
        alert(data.message || 'Failed to publish release.');
      }
    } catch (e) {
      alert('Network error publishing release.');
    }
  };

  const handleDeleteRelease = async (id: string, version: string) => {
    if (!confirm(`Delete software release version ${version}? This action is irreversible.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/releases/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Release deleted.');
        fetchAdminData();
      } else {
        alert('Failed to delete release.');
      }
    } catch (e) {
      alert('Network error deleting release.');
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading overview metrics...</p>;
  }

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Admin Portal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage software releases, licensing, storage options, and system health.</p>
      </header>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '32px' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
        <button className={`btn ${activeTab === 'releases' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('releases')}>🚀 Releases Manager</button>
        <button className={`btn ${activeTab === 'storage' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('storage')}>⚙️ Storage Backend</button>
        <button className={`btn ${activeTab === 'downloads' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('downloads')}>📥 Downloads History</button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div>
          {metrics && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              <div className="glass-card">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Registered Users</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>{metrics.userCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Accounts registered</div>
              </div>

              <div className="glass-card" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Net Revenue</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ec4899' }}>${metrics.totalRevenue.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>From {metrics.purchaseCount} purchases</div>
              </div>

              <div className="glass-card">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Licenses Issued</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>{metrics.licenseCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Unused & Active keys</div>
              </div>

              <div className="glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Active Hardware Bound</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{metrics.activeCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Running local desktop apps</div>
              </div>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', marginBottom: '48px' }}>
            {metrics && (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '24px' }}>License Plan Mix</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span>Lifetime ($300)</span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{metrics.plansBreakdown['Lifetime']} keys</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(metrics.plansBreakdown['Lifetime'] / (metrics.licenseCount || 1)) * 100}%`, height: '100%', background: 'var(--accent)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span>1 Year ($200)</span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{metrics.plansBreakdown['1 Year']} keys</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(metrics.plansBreakdown['1 Year'] / (metrics.licenseCount || 1)) * 100}%`, height: '100%', background: 'var(--accent-secondary)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span>6 Months ($150)</span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{metrics.plansBreakdown['6 Months']} keys</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(metrics.plansBreakdown['6 Months'] / (metrics.licenseCount || 1)) * 100}%`, height: '100%', background: '#f59e0b' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Recent Licenses Generated</h3>
                <Link href="/admin/licenses" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>View all</Link>
              </div>
              {recentLicenses.length === 0 ? (
                <p style={{ padding: '24px', color: 'var(--text-muted)' }}>No licenses generated yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '12px 24px' }}>License Key</th>
                      <th style={{ padding: '12px 24px' }}>Plan</th>
                      <th style={{ padding: '12px 24px' }}>Owner</th>
                      <th style={{ padding: '12px 24px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLicenses.map((lic) => (
                      <tr key={lic.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '12px 24px', fontFamily: 'monospace', fontWeight: 600, color: '#ffffff' }}>{lic.key}</td>
                        <td style={{ padding: '12px 24px' }}>{lic.plan}</td>
                        <td style={{ padding: '12px 24px' }}>{lic.user.email}</td>
                        <td style={{ padding: '12px 24px' }}>
                          <span style={{ background: lic.status === 'Activated' ? 'rgba(16, 185, 129, 0.1)' : lic.status === 'Unused' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: lic.status === 'Activated' ? '#10b981' : lic.status === 'Unused' ? '#f59e0b' : '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {lic.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Live System Audit Logs</h3>
              <Link href="/admin/audit" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>View full audit history</Link>
            </div>
            
            {recentLogs.length === 0 ? (
              <p style={{ padding: '24px', color: 'var(--text-muted)' }}>No system audit logs found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                    <th style={{ padding: '12px 24px' }}>Timestamp</th>
                    <th style={{ padding: '12px 24px' }}>User</th>
                    <th style={{ padding: '12px 24px' }}>Action</th>
                    <th style={{ padding: '12px 24px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>{log.user?.email || 'System'}</td>
                      <td style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--accent)' }}>{log.action}</td>
                      <td style={{ padding: '12px 24px' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* Tab 2: Releases Manager */}
      {activeTab === 'releases' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Create Form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Publish New Release</h3>
            
            <form onSubmit={handleCreateRelease}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Version Number</label>
                  <input type="text" className="form-input" required placeholder="1.0.0" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Build Number</label>
                  <input type="text" className="form-input" placeholder="b120" value={newBuild} onChange={(e) => setNewBuild(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Release Status</label>
                <select className="form-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="Stable">Stable Release</option>
                  <option value="Beta">Beta Preview</option>
                  <option value="Alpha">Alpha Testing</option>
                  <option value="Deprecated">Deprecated</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Release Notes</label>
                <textarea className="form-input" style={{ height: '80px' }} required placeholder="Added full-body joint mappings..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>

              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-hover)', marginBottom: '12px', marginTop: '20px' }}>Windows Package Options</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label>Installer Local / Cloud Link</label>
                  <input type="text" className="form-input" placeholder="/storage/win/MagicCamAI-1.0.0.exe" value={winUrl} onChange={(e) => setWinUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Size (MB)</label>
                  <input type="number" className="form-input" value={winSize} onChange={(e) => setWinSize(e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-hover)', marginBottom: '12px', marginTop: '20px' }}>macOS Package Options</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Installer Link</label>
                  <input type="text" className="form-input" placeholder="/storage/mac/MagicCamAI-1.0.0.dmg" value={macUrl} onChange={(e) => setMacUrl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Size (MB)</label>
                  <input type="number" className="form-input" value={macSize} onChange={(e) => setMacSize(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>🚀 Publish Software Release</button>
            </form>
          </div>

          {/* List Releases */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Published Releases ({releases.length})</h3>
            
            {releases.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No releases created yet.</p>
            ) : (
              releases.map((rel) => (
                <div key={rel.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>v{rel.version}</span>
                      <span style={{ marginLeft: '10px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '100px' }}>{rel.status}</span>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteRelease(rel.id, rel.version)}>Delete</button>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Notes: {rel.releaseNotes.substring(0, 80)}...
                  </div>

                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>Installers:</strong>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                      {rel.installers.map((ins) => (
                        <span key={ins.id} style={{ color: 'var(--text-secondary)' }}>
                          ● {ins.os} ({ins.fileSizeMB}MB) - {ins.downloadCount} dls
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Storage Backend Settings */}
      {activeTab === 'storage' && (
        <div className="glass-card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Configurable Release Storage Backend</h3>
          
          <form onSubmit={handleSaveStorage}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Select Storage Provider</label>
              <select className="form-input" value={storageBackend} onChange={(e) => setStorageBackend(e.target.value)}>
                <option value="local">Local Node Server Drive Storage</option>
                <option value="S3">Self-Hosted Object Storage (S3-Compatible)</option>
                <option value="NAS">Network Attached Storage (NAS)</option>
              </select>
            </div>

            {storageBackend === 'S3' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>S3 Endpoint</label>
                  <input type="text" className="form-input" placeholder="http://minio-local:9000" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>S3 Access Key</label>
                  <input type="text" className="form-input" value={s3AccessKey} onChange={(e) => setS3AccessKey(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>S3 Secret Key</label>
                  <input type="password" className="form-input" value={s3SecretKey} onChange={(e) => setS3SecretKey(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Bucket Name</label>
                  <input type="text" className="form-input" placeholder="magiccamai-installers" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} />
                </div>
              </div>
            )}

            {storageBackend === 'NAS' && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>NAS Absolute Mount Path</label>
                <input type="text" className="form-input" placeholder="/mnt/nas/magiccamai" value={nasPath} onChange={(e) => setNasPath(e.target.value)} />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>💾 Save Storage Configuration</button>
          </form>
        </div>
      )}

      {/* Tab 4: Downloads History */}
      {activeTab === 'downloads' && (
        <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Global Downloads History Log</h3>
          </div>
          
          {downloads.length === 0 ? (
            <p style={{ padding: '24px', color: 'var(--text-muted)' }}>No downloads registered yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px' }}>Date</th>
                  <th style={{ padding: '16px' }}>Filename</th>
                  <th style={{ padding: '16px' }}>Version</th>
                  <th style={{ padding: '16px' }}>Platform</th>
                  <th style={{ padding: '16px' }}>IP Address</th>
                  <th style={{ padding: '16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '16px' }}>{new Date(log.downloadedAt).toLocaleString()}</td>
                    <td style={{ padding: '16px', color: '#ffffff' }}>{log.filename}</td>
                    <td style={{ padding: '16px' }}>{log.version}</td>
                    <td style={{ padding: '16px' }}>{log.os}</td>
                    <td style={{ padding: '16px', fontFamily: 'monospace' }}>{log.ipAddress}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
