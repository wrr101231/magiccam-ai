'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from '@/styles/glass.module.css';

interface Wallet {
  id: string;
  coin_name: string;
  network: string;
  wallet_address: string;
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const plan = searchParams.get('plan') || 'Unknown Plan';
  const amountStr = searchParams.get('amount') || '0';
  const amount = parseFloat(amountStr);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('is_active', true);
      
    if (!error && data) {
      setWallets(data);
      if (data.length > 0) setSelectedWalletId(data[0].id);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash) return alert('Please enter the Transaction Hash');
    if (!selectedWalletId) return alert('Please select a payment wallet');

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          amount,
          txHash,
          walletId: selectedWalletId
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Transaction submitted! An admin will review and approve your license shortly.');
        router.push('/dashboard');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Network error submitting transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading payment methods...</div>;
  }

  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '16px', textAlign: 'center' }}>
        Complete Your Payment
      </h1>
      
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{plan} License</h2>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>${amount.toFixed(2)}</div>
        </div>

        {wallets.length === 0 ? (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>
            No crypto wallets are currently available. Please contact support.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Cryptocurrency</label>
              <select 
                value={selectedWalletId} 
                onChange={(e) => setSelectedWalletId(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id} style={{ background: '#111' }}>
                    {w.coin_name} ({w.network})
                  </option>
                ))}
              </select>
            </div>

            {selectedWalletId && (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Send exactly <strong>${amount.toFixed(2)}</strong> worth of crypto to this address:</p>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', wordBreak: 'break-all', color: '#10b981', fontWeight: 600 }}>
                  {wallets.find(w => w.id === selectedWalletId)?.wallet_address}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Transaction Hash (TxID)</label>
              <input 
                type="text" 
                required
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Paste your transaction ID here..."
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                We need this to verify your payment. Your license will be issued once approved.
              </p>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}>
              {submitting ? 'Submitting...' : 'Submit Payment Proof'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
