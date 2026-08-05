'use client';

import React, { useEffect, useState } from 'react';

interface Profile {
  name: string | null;
}

interface License {
  id: string;
  key: string;
  plan: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile: Profile | null;
  licenses: License[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Are you sure you want to change this user's role to ${nextRole}?`)) {
      return;
    }

    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'update_role', role: nextRole }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'User role updated.');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user role.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error updating user role.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently delete the user account: ${email}? This action is irreversible and deletes all linked licenses, purchases, and device bindings!`)) {
      return;
    }

    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'delete' }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'User account deleted.');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user account.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error deleting user account.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading user accounts...</p>;
  }

  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>User Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review registered customer accounts, manage roles, and delete profiles.</p>
      </header>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px' }}>Name / Email</th>
              <th style={{ padding: '16px 24px' }}>Register Date</th>
              <th style={{ padding: '16px 24px' }}>Role</th>
              <th style={{ padding: '16px 24px' }}>Issued Keys</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>{user.profile?.name || 'Customer'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span 
                    style={{
                      background: user.role === 'ADMIN' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: user.role === 'ADMIN' ? '#ec4899' : 'var(--text-secondary)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {user.licenses.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No keys issued</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user.licenses.map((lic) => (
                        <span 
                          key={lic.id} 
                          style={{
                            fontSize: '0.75rem',
                            background: lic.status === 'Activated' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                            color: lic.status === 'Activated' ? '#10b981' : 'var(--text-secondary)',
                            border: '1px solid var(--glass-border)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}
                          title={`${lic.plan} - ${lic.status}`}
                        >
                          {lic.key.substring(3)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      disabled={updating !== null}
                      onClick={() => handleUpdateRole(user.id, user.role)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {updating === user.id ? 'Updating...' : `Toggle Role`}
                    </button>
                    <button
                      disabled={updating !== null}
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
