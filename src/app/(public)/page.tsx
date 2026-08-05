import React from 'react';
import Link from 'next/link';
import styles from '@/styles/glass.module.css';

export default function HomePage() {
  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '100px',
            padding: '6px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#a78bfa',
            marginBottom: '24px'
          }}
        >
          <span>🚀</span> Phase 2 Portal & Licensing Active
        </div>

        <h1 className="gradient-text" style={{ fontSize: '4.5rem', lineHeight: 1.1, fontWeight: 900, maxWidth: '900px', marginBottom: '24px' }}>
          Professional Real-Time AI Camera Engine
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '650px', marginBottom: '40px', lineHeight: 1.6 }}>
          Power your streams, recordings, and virtual meetings with premium face-swaps and backgrounds. 
          <span style={{ color: '#ffffff', fontWeight: 600 }}> Processed 100% locally on your computer.</span>
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/pricing" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
            Get Your License Key
          </Link>
          <Link href="/download" className="btn btn-secondary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
            Download Installer
          </Link>
        </div>

        {/* Local AI Tech Callout */}
        <div 
          className="glass-card" 
          style={{ 
            marginTop: '60px', 
            maxWidth: '750px', 
            padding: '20px 30px', 
            background: 'rgba(25, 20, 35, 0.4)',
            borderColor: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'left'
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🔒</div>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px', color: '#ffffff' }}>Zero Cloud Processing. Complete Confidentiality.</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
              MagicCamAI desktop software loads open-source AI models directly onto your GPU or CPU. 
              No camera feeds, images, or project files are ever uploaded or sent to third-party APIs.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section style={{ marginBottom: '100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.25rem', marginBottom: '12px' }}>
          Professional Creative Tools
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '50px', fontSize: '1.05rem' }}>
          A local suite designed to exceed cloud solutions without the subscription cost.
        </p>

        <div className={styles.glassGrid}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '2.5rem' }}>🎭</div>
            <h3 style={{ fontSize: '1.35rem' }}>Face Swap Studio</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Swap faces in real-time camera previews or videos using high-performance local AI engines. Perfect for streaming, video content generation, and virtual avatars.
            </p>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '2.5rem' }}>🖼️</div>
            <h3 style={{ fontSize: '1.35rem' }}>AI Background Studio</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Blur, remove, or replace backgrounds in real time. Generates clean outlines and depth layers without requiring green screens.
            </p>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '2.5rem' }}>🎥</div>
            <h3 style={{ fontSize: '1.35rem' }}>Virtual Camera Output</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Output your modified stream directly into OBS, Zoom, Teams, Discord, or any other conferencing software as a standard system camera.
            </p>
          </div>
        </div>
      </section>

      {/* Easy Activation Process Callout */}
      <section className="glass-card" style={{ padding: '60px 40px', background: 'linear-gradient(135deg, rgba(20, 15, 30, 0.8) 0%, rgba(10, 10, 15, 0.8) 100%)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Simple Offline-Friendly Activation</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '40px', fontSize: '1rem', lineHeight: 1.6 }}>
          Activate once with your license key, and run indefinitely. We enforce local hardware binding to ensure your license remains yours, with an offline grace period when traveling.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
          <div style={{ flex: '1 1 200px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px' }}>1</div>
            <h4 style={{ marginBottom: '4px' }}>Download Installer</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get the latest app bundle for Windows or macOS.</p>
          </div>
          <div style={{ flex: '1 1 200px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px' }}>2</div>
            <h4 style={{ marginBottom: '4px' }}>Get License Key</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select 6-Month, Yearly, or Lifetime options.</p>
          </div>
          <div style={{ flex: '1 1 200px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px' }}>3</div>
            <h4 style={{ marginBottom: '4px' }}>Local Execution</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log in, activate, and start swapping faces locally!</p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
