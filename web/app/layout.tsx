import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import '@/lib/logout-utils';

import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GamificationProvider } from '@/components/providers/gamification-provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CGM Sensor Tracker',
  description: 'Track your CGM sensors with photos and warranty information',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <GamificationProvider>
                <ServiceWorkerRegistration />
                {/* <WebVitalsTracker /> */}
                {children}
                <PWAInstallPrompt />
              </GamificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}