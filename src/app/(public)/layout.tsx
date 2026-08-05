import React from 'react';
import Navbar from '@/components/Navbar';
import styles from '@/styles/glass.module.css';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className={styles.heroBackground} />
      
      <Navbar />

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <footer className={styles.glassFooter}>
        <div className={`${styles.container} ${styles.footerContent}`}>
          <div className={styles.footerCol} style={{ maxWidth: '300px' }}>
            <div className={styles.brand} style={{ marginBottom: '8px' }}>
              <span className={styles.brandIcon}></span>
              <span>MagicCamAI</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
              Professional desktop AI software enabling real-time face swapping and background adjustments. 100% private. 100% local.
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '16px', color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} MagicCamAI. All rights reserved.
            </p>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Product</span>
            <ul className={styles.footerLinks}>
              <li><a href="/features" className={styles.footerLink}>Features</a></li>
              <li><a href="/pricing" className={styles.footerLink}>Pricing</a></li>
              <li><a href="/download" className={styles.footerLink}>Download Center</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Resources</span>
            <ul className={styles.footerLinks}>
              <li><a href="/support" className={styles.footerLink}>Documentation</a></li>
              <li><a href="/support" className={styles.footerLink}>Customer Support</a></li>
              <li><a href="/support" className={styles.footerLink}>Release Notes</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>Security & Privacy</span>
            <p style={{ fontSize: '0.85rem', maxWidth: '240px', lineHeight: 1.5 }}>
              All AI model operations run locally on your hardware. We never process camera streams, video data, or pictures in the cloud.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
