import { Sidebar } from '@/components/dashboard/sidebar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AchievementNotificationContainer } from '@/components/gamification/achievement-notification-container';
import { ResponsiveHeader } from '@/components/navigation/responsive-header';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { ToastProvider } from '@/components/notifications/toast-provider';
import { SensorBotChat } from '@/components/ai/sensorbot-chat';
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider';

// Disable caching for dashboard pages (dynamic content)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <KeyboardShortcutsProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-200">
          {/* Responsive Header - Mobile Only */}
          <div className="lg:hidden">
            <ResponsiveHeader />
          </div>
          
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <div className="lg:pl-72 pb-20 lg:pb-0">
            <main className="py-4 lg:py-6">
              <div className="mx-auto max-w-7xl px-4 lg:px-6">
                {children}
              </div>
            </main>
          </div>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
          
          <AchievementNotificationContainer />
          <ToastProvider />
          <SensorBotChat />
        </div>
      </KeyboardShortcutsProvider>
    </ProtectedRoute>
  );
}