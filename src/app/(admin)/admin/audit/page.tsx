'use client';

import React, { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
  user: {
    email: string;
  } | null;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading audit trail...</p>;
  }

  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Security & Audit Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track all user registration, purchase transactions, licensing checks, and administrative activities.</p>
      </header>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px' }}>Timestamp</th>
              <th style={{ padding: '16px 24px' }}>Actor</th>
              <th style={{ padding: '16px 24px' }}>Action Event</th>
              <th style={{ padding: '16px 24px' }}>Description details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No security audit events recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', color: '#ffffff', fontWeight: 500 }}>
                    {log.user?.email || 'System'}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--accent)' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                    {log.details}
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
