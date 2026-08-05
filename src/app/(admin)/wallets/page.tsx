'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '@/styles/glass.module.css';

interface Wallet {
  id: string;
  coin_name: string;
  network: string;
  wallet_address: string;
  is_active: boolean;
  created_at: string;
}

export default function WalletsManager() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [coinName, setCoinName] = useState('');
  const [network, setNetwork] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      alert('Failed to load wallets.');
    } else {
      setWallets(data || []);
    }
    setLoading(false);
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const { error } = await supabase
      .from('crypto_wallets')
      .insert([{
        coin_name: coinName,
        network: network,
        wallet_address: walletAddress,
        is_active: true
      }]);

    if (error) {
      alert(`Error adding wallet: ${error.message}`);
    } else {
      setCoinName('');
      setNetwork('');
      setWalletAddress('');
      fetchWallets();
    }
    setSubmitting(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('crypto_wallets')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) fetchWallets();
  };

  const deleteWallet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    const { error } = await supabase
      .from('crypto_wallets')
      .delete()
      .eq('id', id);
    if (!error) fetchWallets();
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '24px' }}>
        Crypto Wallets
      </h1>

      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Add New Wallet</h2>
        <form onSubmit={handleAddWallet} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Coin Name (e.g. Bitcoin, USDT)</label>
            <input 
              required
              type="text" 
              value={coinName} 
              onChange={e => setCoinName(e.target.value)} 
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff' }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Network (e.g. BTC, TRC20, ERC20)</label>
            <input 
              required
              type="text" 
              value={network} 
              onChange={e => setNetwork(e.target.value)} 
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff' }}
            />
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Wallet Address</label>
            <input 
              required
              type="text" 
              value={walletAddress} 
              onChange={e => setWalletAddress(e.target.value)} 
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff' }}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '10px 24px', height: '42px' }}>
            {submitting ? 'Adding...' : 'Add Wallet'}
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Active Wallets</h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading wallets...</p>
        ) : wallets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No wallets configured yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Coin</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Network</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Address</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{w.coin_name}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{w.network}</span>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--accent)' }}>{w.wallet_address}</td>
                    <td style={{ padding: '16px' }}>
                      {w.is_active 
                        ? <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Active</span>
                        : <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Inactive</span>
                      }
                    </td>
                    <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => toggleStatus(w.id, w.is_active)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Toggle
                      </button>
                      <button onClick={() => deleteWallet(w.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        Delete
                      </button>
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
