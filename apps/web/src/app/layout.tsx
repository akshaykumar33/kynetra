import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import { TopBar } from '@/features/world/components/TopBar';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kynetra — World Console',
  description:
    'A persistent virtual technology city where developers and AI agents collaborate, simulate software systems, operate cloud infrastructure, and build the future.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#12161f' },
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets data-theme before hydration, so the attribute differs by design.
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to the world view
        </a>
        <Providers>
          <TopBar />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
