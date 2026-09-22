import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kynetra — Open Digital IT World Platform',
  description:
    'A persistent virtual technology city where developers and AI agents collaborate, simulate software systems, operate cloud infrastructure, and build the future.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        style={{ margin: 0, padding: 0, overflow: 'hidden', width: '100vw', height: '100vh' }}
      >
        <main style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{children}</main>
      </body>
    </html>
  );
}
