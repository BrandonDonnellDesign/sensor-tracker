import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AchievementNotificationContainer } from '@/components/gamification/achievement-notification-container';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
        <Sidebar />
        <div className="lg:pl-72 relative">
          <Header />
          <main className="py-6 lg:py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
        <AchievementNotificationContainer />
      </div>
    </ProtectedRoute>
  );
}