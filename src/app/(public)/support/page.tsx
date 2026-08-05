import React from 'react';
import styles from '@/styles/glass.module.css';

export default function SupportPage() {
  return (
    <div className={styles.container} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '16px' }}>
          Documentation & Support
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Learn how to set up, configure, and optimize MagicCamAI for your workstation.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Getting Started</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><a href="#install" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1. Installation Guide</a></li>
              <li><a href="#activate">2. Key Activation</a></li>
              <li><a href="#requirements">3. System Requirements</a></li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Studio Features</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><a href="#faceswap">Face Swap Settings</a></li>
              <li><a href="#background">AI Background Options</a></li>
              <li><a href="#virtualcamera">Virtual Camera Guide</a></li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Troubleshooting</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><a href="#gpu">GPU Driver Errors</a></li>
              <li><a href="#hardware">Device ID Conflicts</a></li>
              <li><a href="#logs">Locating App Logs</a></li>
            </ul>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <section id="install">
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>1. Installation Guide</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '12px' }}>
              MagicCamAI is built to install with zero complex environment configurations. All AI frameworks, runtime dependencies, and neural models are managed automatically by the installer.
            </p>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Login to your customer account and navigate to the <strong>Download Center</strong>.</li>
              <li>Download the executable corresponding to your operating system.</li>
              <li>Run the installer. It will verify your disk space and extract the runtime engines.</li>
              <li>Launch MagicCamAI from your desktop shortcut and enter your license credentials to activate.</li>
            </ol>
          </section>

          <section id="requirements">
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>2. System Requirements</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Specification</th>
                  <th style={{ padding: '8px' }}>Minimum</th>
                  <th style={{ padding: '8px' }}>Recommended</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '8px', color: '#ffffff' }}>OS</td>
                  <td style={{ padding: '8px' }}>Windows 10 / macOS 12</td>
                  <td style={{ padding: '8px' }}>Windows 11 / macOS 14</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '8px', color: '#ffffff' }}>Processor</td>
                  <td style={{ padding: '8px' }}>Intel Core i5 (8th gen) / Apple M1</td>
                  <td style={{ padding: '8px' }}>Intel i7 (11th gen) / Apple M2 Pro</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '8px', color: '#ffffff' }}>GPU</td>
                  <td style={{ padding: '8px' }}>GTX 1060 (6GB VRAM) / Apple M1 GPU</td>
                  <td style={{ padding: '8px' }}>RTX 3070 (8GB VRAM) / Apple M2 Max</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', color: '#ffffff' }}>RAM</td>
                  <td style={{ padding: '8px' }}>8 GB</td>
                  <td style={{ padding: '8px' }}>16 GB</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="support-help">
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>Contact Support</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '16px' }}>
              If you run into issues with activation, device bindings, or hardware errors, please submit a ticket. Our support team is online 24/7.
            </p>
            <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                ✉️ Support email: <strong style={{ color: 'var(--accent)' }}>support@magiccamai.com</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Please provide your Username and License Key when submitting requests for fast device resets.
              </p>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
