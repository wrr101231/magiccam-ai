'use client';

import React, { useEffect, useState } from 'react';

interface Installer {
  id: string;
  os: string;
  fileUrl: string;
  fileSizeMB: number;
  checksum: string;
  downloadCount: number;
  enabled: boolean;
}

interface AIModel {
  id: string;
  modelId: string;
  name: string;
  version: string;
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
  minSupportedVersion: string | null;
  aiModelCompatibility: string | null;
  createdAt: string;
  installers: Installer[];
  models: AIModel[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Stable: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  Beta: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  Alpha: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  Deprecated: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newVersion, setNewVersion] = useState('');
  const [newBuild, setNewBuild] = useState('');
  const [newStatus, setNewStatus] = useState('Stable');
  const [newNotes, setNewNotes] = useState('');
  const [newMinVersion, setNewMinVersion] = useState('');
  const [newModelCompat, setNewModelCompat] = useState('');

  // Upload form state
  const [uploadOS, setUploadOS] = useState('Windows');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchReleases = async () => {
    try {
      const res = await fetch('/api/releases');
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases || []);
      }
    } catch (e) {
      console.error('Failed to load releases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReleases(); }, []);

  const totalDownloads = releases.reduce((sum, r) => sum + r.installers.reduce((s, i) => s + i.downloadCount, 0), 0);
  const latestStable = releases.find(r => r.status === 'Stable');

  const handleCreate = async () => {
    if (!newVersion.trim()) { alert('Version is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion.trim(),
          buildNumber: newBuild.trim() || null,
          status: newStatus,
          releaseNotes: newNotes.trim(),
          minSupportedVersion: newMinVersion.trim() || null,
          aiModelCompatibility: newModelCompat.trim() || null,
        }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewVersion(''); setNewBuild(''); setNewStatus('Stable'); setNewNotes(''); setNewMinVersion(''); setNewModelCompat('');
        fetchReleases();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create release.');
      }
    } catch (e) { alert('Network error creating release.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, version: string) => {
    if (!confirm(`Are you sure you want to permanently delete release v${version}? This will remove all associated installers and model packages.`)) return;
    try {
      const res = await fetch(`/api/releases/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchReleases(); }
      else { const err = await res.json(); alert(err.error || 'Delete failed.'); }
    } catch (e) { alert('Network error deleting release.'); }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await fetch(`/api/releases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseNotes: notes }),
      });
    } catch (e) { console.error('Failed to save notes:', e); }
  };

  const handleUploadInstaller = async (releaseId: string) => {
    if (!uploadFile) { alert('Please select a file to upload.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('releaseId', releaseId);
      formData.append('os', uploadOS);
      const res = await fetch('/api/releases/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setUploadFile(null);
        fetchReleases();
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed.');
      }
    } catch (e) { alert('Network error uploading installer.'); }
    finally { setUploading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#ffffff',
    fontSize: '0.9rem', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading release data...</p>;

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Release Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage software releases, installers, and AI model packages.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '＋ Create New Release'}
        </button>
      </header>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Releases', value: releases.length, icon: '📦', color: '#a78bfa' },
          { label: 'Total Downloads', value: totalDownloads.toLocaleString(), icon: '📥', color: '#10b981' },
          { label: 'Latest Stable', value: latestStable?.version || 'None', icon: '🚀', color: '#3b82f6' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '2rem' }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Release Form */}
      {showCreateForm && (
        <div className="glass-card" style={{ marginBottom: '32px', border: '1px solid rgba(139,92,246,0.3)' }}>
          <h3 style={{ marginBottom: '20px', color: '#a78bfa' }}>Create New Release</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Version *</label>
              <input style={inputStyle} placeholder="e.g. 1.2.0" value={newVersion} onChange={e => setNewVersion(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Build Number</label>
              <input style={inputStyle} placeholder="e.g. 2025.07.05" value={newBuild} onChange={e => setNewBuild(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="Stable">Stable</option>
                <option value="Beta">Beta</option>
                <option value="Alpha">Alpha</option>
                <option value="Deprecated">Deprecated</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Release Notes</label>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="Describe what is new in this release..." value={newNotes} onChange={e => setNewNotes(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Minimum Supported Version</label>
              <input style={inputStyle} placeholder="e.g. 1.0.0" value={newMinVersion} onChange={e => setNewMinVersion(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>AI Model Compatibility</label>
              <input style={inputStyle} placeholder="e.g. v2-compatible" value={newModelCompat} onChange={e => setNewModelCompat(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving} style={{ padding: '10px 32px' }}>
            {saving ? 'Creating...' : 'Publish Release'}
          </button>
        </div>
      )}

      {/* Releases Table */}
      {releases.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
          <h3 style={{ marginBottom: '8px' }}>No Releases Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Create your first release to start distributing MagicCamAI.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {releases.map((release) => {
            const sc = STATUS_COLORS[release.status] || STATUS_COLORS.Stable;
            const dlCount = release.installers.reduce((s, i) => s + i.downloadCount, 0);
            const isExpanded = expandedId === release.id;

            return (
              <div key={release.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Release Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : release.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr auto',
                    gap: '16px', alignItems: 'center', padding: '20px 24px', cursor: 'pointer',
                    transition: 'background 0.15s', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <div><span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>v{release.version}</span></div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{release.buildNumber || '—'}</div>
                  <div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px',
                      background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                    }}>
                      {release.status}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(release.createdAt).toLocaleDateString()}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{release.installers.length} installer{release.installers.length !== 1 ? 's' : ''}</div>
                  <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>{dlCount.toLocaleString()} DLs</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleDelete(release.id, release.version); }}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--glass-border)', padding: '24px', background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                      {/* Left: Release Notes */}
                      <div>
                        <label style={labelStyle}>Release Notes</label>
                        <textarea
                          style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
                          defaultValue={release.releaseNotes}
                          onBlur={(e) => handleUpdateNotes(release.id, e.target.value)}
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Min Version: {release.minSupportedVersion || 'N/A'}</span>
                          <span>AI Compat: {release.aiModelCompatibility || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Right: Upload Installer */}
                      <div>
                        <label style={labelStyle}>Upload Installer</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <select style={{ ...inputStyle, flex: '0 0 120px' }} value={uploadOS} onChange={e => setUploadOS(e.target.value)}>
                            <option value="Windows">Windows</option>
                            <option value="macOS">macOS</option>
                            <option value="Linux">Linux</option>
                          </select>
                          <input
                            type="file"
                            accept=".exe,.msi,.dmg,.pkg,.AppImage,.zip"
                            style={{ ...inputStyle, flex: 1, padding: '8px' }}
                            onChange={e => setUploadFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                          disabled={uploading || !uploadFile}
                          onClick={() => handleUploadInstaller(release.id)}
                        >
                          {uploading ? 'Uploading...' : 'Upload Installer'}
                        </button>
                      </div>
                    </div>

                    {/* Installers List */}
                    {release.installers.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <label style={{ ...labelStyle, marginBottom: '12px' }}>Installers</label>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                              <th style={{ padding: '10px 12px' }}>OS</th>
                              <th style={{ padding: '10px 12px' }}>File</th>
                              <th style={{ padding: '10px 12px' }}>Size</th>
                              <th style={{ padding: '10px 12px' }}>Checksum</th>
                              <th style={{ padding: '10px 12px' }}>Downloads</th>
                              <th style={{ padding: '10px 12px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {release.installers.map((inst) => (
                              <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#ffffff' }}>
                                  {inst.os === 'Windows' ? '🪟' : inst.os === 'macOS' ? '🍎' : '🐧'} {inst.os}
                                </td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inst.fileUrl.split('/').pop()}</td>
                                <td style={{ padding: '10px 12px' }}>{inst.fileSizeMB} MB</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{inst.checksum.slice(0, 16)}...</td>
                                <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 600 }}>{inst.downloadCount}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{
                                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
                                    background: inst.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: inst.enabled ? '#10b981' : '#ef4444',
                                    border: `1px solid ${inst.enabled ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                  }}>
                                    {inst.enabled ? 'Active' : 'Disabled'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* AI Models List */}
                    {release.models.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <label style={{ ...labelStyle, marginBottom: '12px' }}>AI Model Packages</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                          {release.models.map((model) => (
                            <div key={model.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '16px' }}>
                              <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>{model.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {model.modelId} v{model.version} {model.fileSizeMB} MB
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
