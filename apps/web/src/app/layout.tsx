import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kynetra — Open Digital IT World Platform',
  description:
    'A persistent virtual technology city where developers and AI agents collaborate, simulate software systems, operate cloud infrastructure, and build the future.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="brand">
            <span className="brand-badge">KY</span>
            <span className="brand-title">KYNETRA</span>
            <span className="brand-tag">WORLD OS v0.1</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pulse-indicator" id="system-status-indicator" />
              <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                PLATFORM ONLINE
              </span>
            </div>
            <a
              href="#diagnostics"
              className="btn-secondary"
              id="diagnostics-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              System HUD
            </a>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
