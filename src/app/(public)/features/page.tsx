import React from 'react';
import Link from 'next/link';
import styles from '@/styles/glass.module.css';

export default function FeaturesPage() {
  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section style={{ textAlign: 'center', marginBottom: '80px' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>
          Engineered for Local Performance
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          MagicCamAI is built on top of high-performance libraries that execute AI inferencing directly on your graphics hardware.
        </p>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
        
        {/* Feature 1 */}
        <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center', padding: '40px' }}>
          <div style={{ flex: '1 1 350px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎭</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Face Swap Studio</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Our face swapping implementation utilizes advanced local models optimized for real-time video frames. It maps facial geometry landmarks instantly, providing a seamless blend with realistic lighting and expression tracking.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
              <li>✅ Hinge & rotation alignment</li>
              <li>✅ Dynamic resolution upscaling</li>
              <li>✅ Multi-face recognition</li>
            </ul>
          </div>
          <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', height: '240px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [ Local AI inference: GPU Accelerated ]
          </div>
        </div>

        {/* Feature 2 */}
        <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center', padding: '40px', flexDirection: 'row-reverse' }}>
          <div style={{ flex: '1 1 350px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🖼️</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>AI Background Studio</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Cut your background out cleanly without expensive hardware green screens. Our semantic segmentation engine classifies subject boundaries down to individual hair strands, giving a perfect layout for slides, streams, or virtual meetings.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
              <li>✅ Portrait & full-body cropping</li>
              <li>✅ Depth-based portrait blur</li>
              <li>✅ Custom static & dynamic backdrops</li>
            </ul>
          </div>
          <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', height: '240px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [ Local Segmentation: CPU/GPU Hybrid ]
          </div>
        </div>

        {/* Feature 3 */}
        <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center', padding: '40px' }}>
          <div style={{ flex: '1 1 350px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Modular Updates</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              No need to redownload multi-gigabyte installer files when we release new AI model updates. The application architecture treats models as pluggable files that can be updated independently via the Admin Panel and downloaded directly in the client.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
              <li>✅ Hash-verified integrity checks</li>
              <li>✅ Automatic missing model restoration</li>
              <li>✅ Hardware compatibility verification</li>
            </ul>
          </div>
          <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', height: '240px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [ Encrypted Local Storage & Verification ]
          </div>
        </div>

      </div>

      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <Link href="/pricing" className="btn btn-primary" style={{ padding: '12px 32px' }}>
          Unlock Full Performance Now
        </Link>
      </div>
    </div>
  );
}
