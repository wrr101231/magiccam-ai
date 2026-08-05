'use client';

import React, { useEffect, useState } from 'react';

interface License {
  id: string;
  key: string;
  plan: string;
  status: string;
  purchaseDate: string;
  expirationDate: string | null;
  activatedDeviceFingerprint: string | null;
  activatedDeviceName: string | null;
  activationDate: string | null;
  lastValidationAt: string | null;
  user: {
    email: string;
  };
}

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Form State for custom generation
  const [targetEmail, setTargetEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('1 Year');
  const [submitting, setSubmitting] = useState(false);

  const fetchLicenses = async () => {
    try {
      const res = await fetch('/api/admin/licenses');
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', email: targetEmail, plan: selectedPlan }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Success! Generated key: ${data.license.key}`);
        setTargetEmail('');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to generate key.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error generating license.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (licenseId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Suspended' ? 'Unused' : 'Suspended';
    if (!confirm(`Are you sure you want to change status to: ${nextStatus}?`)) {
      return;
    }

    setUpdating(licenseId);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId, action: 'status', status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Status updated.');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to update status.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error modifying status.');
    } finally {
      setUpdating(null);
    }
  };

  const handleResetDevice = async (licenseId: string, key: string) => {
    if (!confirm(`Are you sure you want to force-release the active computer bound to license key: ${key}? This instantly frees the key so it can be re-bound.`)) {
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
        alert(data.message || 'Device unbound successfully.');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to reset binding.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error resetting device.');
    } finally {
      setUpdating(null);
    }
  };

  const handleRenewLicense = async (licenseId: string) => {
    const months = prompt('Enter number of months to extend the license (e.g. 6, 12, 24):', '12');
    if (months === null || isNaN(parseInt(months))) return;

    setUpdating(licenseId);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId, action: 'renew', months }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'License renewed.');
        fetchLicenses();
      } else {
        alert(data.error || 'Failed to renew license.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error renewing license.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading license inventory...</p>;
  }

  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>License Key Control</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generate custom licenses, modify statuses, reset bindings, and extend durations.</p>
      </header>

      {/* Direct Generator Card */}
      <section className="glass-card" style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Direct Key Generator</h3>
        <form onSubmit={handleGenerateLicense} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="input-group" style={{ flex: '2 1 300px', marginBottom: 0 }}>
            <label className="input-label" htmlFor="email">Customer Email</label>
            <input
              className="input-field"
              type="email"
              id="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              required
              placeholder="customer@email.com"
            />
          </div>

          <div className="input-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="input-label" htmlFor="plan">License Plan</label>
            <select
              className="input-field"
              id="plan"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              style={{ background: 'rgba(20, 20, 25, 0.9)' }}
            >
              <option value="6 Months">6 Months ($150)</option>
              <option value="1 Year">1 Year ($200)</option>
              <option value="Lifetime">Lifetime ($300)</option>
            </select>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '12px 24px' }}>
            {submitting ? 'Generating...' : 'Generate & Assign'}
          </button>
        </form>
      </section>

      {/* Inventory List */}
      <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px' }}>Key / Owner</th>
              <th style={{ padding: '16px 24px' }}>Plan Details</th>
              <th style={{ padding: '16px 24px' }}>Bound Device</th>
              <th style={{ padding: '16px 24px' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>Management Controls</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((lic) => (
              <tr key={lic.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#ffffff', letterSpacing: '0.02em' }}>
                    {lic.key}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner: {lic.user.email}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 600 }}>{lic.plan}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Expiry: {lic.expirationDate ? new Date(lic.expirationDate).toLocaleDateString() : 'Never (Lifetime)'}
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {lic.status === 'Activated' ? (
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 500 }}>🖥️ {lic.activatedDeviceName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        ID: {lic.activatedDeviceFingerprint?.substring(0, 16)}...
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No device linked</span>
                  )}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span 
                    style={{
                      background: lic.status === 'Activated' ? 'rgba(16, 185, 129, 0.1)' : lic.status === 'Unused' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: lic.status === 'Activated' ? '#10b981' : lic.status === 'Unused' ? '#f59e0b' : '#ef4444',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {lic.status}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {lic.status === 'Activated' && (
                      <button
                        disabled={updating !== null}
                        onClick={() => handleResetDevice(lic.id, lic.key)}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Release Device
                      </button>
                    )}
                    <button
                      disabled={updating !== null}
                      onClick={() => handleRenewLicense(lic.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Renew
                    </button>
                    <button
                      disabled={updating !== null}
                      onClick={() => handleStatusChange(lic.id, lic.status)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', color: lic.status === 'Suspended' ? '#10b981' : '#f59e0b' }}
                    >
                      {lic.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
