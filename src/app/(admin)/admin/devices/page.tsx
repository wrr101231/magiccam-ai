'use client';

import React, { useEffect, useState } from 'react';

interface License {
  id: string;
  key: string;
  plan: string;
  status: string;
  activatedDeviceFingerprint: string | null;
  activatedDeviceName: string | null;
  activationDate: string | null;
  lastValidationAt: string | null;
  user: {
    email: string;
  };
}

export default function AdminDevicesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchActiveDevices = async () => {
    try {
      const res = await fetch('/api/admin/licenses');
      if (res.ok) {
        const data = await res.json();
        // Filter for only activated licenses holding device mappings
        const activeList = (data.licenses || []).filter(
          (lic: License) => lic.status === 'Activated' && lic.activatedDeviceFingerprint
        );
        setLicenses(activeList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveDevices();
  }, []);

  const handleResetDevice = async (licenseId: string, key: string) => {
    if (!confirm(`Are you sure you want to force-logout this computer? This will reset the license binding for ${key}.`)) {
      return;
    }

    setUpdating(licenseId);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId, action: 'reset_device' }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Device binding reset.');
        fetchActiveDevices();
      } else {
        alert(data.error || 'Failed to un-bind device.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error unbinding device.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading active devices...</p>;
  }

  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Active Hardware Registry</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor bound workstations, check online status, and disconnect computers.</p>
      </header>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px' }}>Workstation / User</th>
              <th style={{ padding: '16px 24px' }}>Bound License Key</th>
              <th style={{ padding: '16px 24px' }}>First Activated</th>
              <th style={{ padding: '16px 24px' }}>Last Validated</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No computers are currently active on this server.
                </td>
              </tr>
            ) : (
              licenses.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#ffffff', fontWeight: 600 }}>🖥️ {lic.activatedDeviceName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      FP: {lic.activatedDeviceFingerprint}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{lic.key}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner: {lic.user.email}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {lic.activationDate ? new Date(lic.activationDate).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {lic.lastValidationAt ? (
                      <span style={{ color: '#10b981', fontWeight: 500 }}>
                        🟢 {new Date(lic.lastValidationAt).toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      disabled={updating !== null}
                      onClick={() => handleResetDevice(lic.id, lic.key)}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {updating === lic.id ? 'Disconnecting...' : 'Force Logout'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
