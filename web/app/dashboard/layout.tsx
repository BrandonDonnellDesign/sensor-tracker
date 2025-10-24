import { Sidebar } from '@/components/dashboard/sidebar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AchievementNotificationContainer } from '@/components/gamification/achievement-notification-container';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a] transition-colors duration-200">
        <Sidebar />
        <div className="lg:pl-72 relative">
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-6">
              {children}
            </div>
          </main>
        </div>
        <AchievementNotificationContainer />
      </div>
    </ProtectedRoute>
  );
}