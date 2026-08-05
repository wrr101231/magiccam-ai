'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '@/styles/glass.module.css';

interface Order {
  id: string;
  user_email: string;
  plan_name: string;
  amount_usd: number;
  tx_hash: string;
  status: string;
  created_at: string;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders.');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (orderId: string) => {
    if (!confirm('Approve this transaction and issue a license?')) return;
    
    setProcessing(orderId);
    try {
      const res = await fetch('/api/admin/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`Successfully approved! License Key generated: ${data.licenseKey}`);
        fetchOrders();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Network error approving order.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!confirm('Are you sure you want to REJECT this transaction?')) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'REJECTED' })
      .eq('id', orderId);
      
    if (!error) fetchOrders();
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '24px' }}>
        Crypto Orders
      </h1>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Pending Transactions</h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No orders found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>User Email</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Plan</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Tx Hash</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{o.user_email}</td>
                    <td style={{ padding: '16px' }}>
                      {o.plan_name} <br/>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${o.amount_usd}</span>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                      {o.tx_hash}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {o.status === 'PENDING' && <span style={{ color: '#f59e0b', fontSize: '0.875rem' }}>PENDING</span>}
                      {o.status === 'APPROVED' && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>APPROVED</span>}
                      {o.status === 'REJECTED' && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>REJECTED</span>}
                    </td>
                    <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                      {o.status === 'PENDING' && (
                        <>
                          <button 
                            disabled={processing === o.id}
                            onClick={() => handleApprove(o.id)} 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            {processing === o.id ? '...' : 'Approve'}
                          </button>
                          <button 
                            disabled={processing === o.id}
                            onClick={() => handleReject(o.id)} 
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
