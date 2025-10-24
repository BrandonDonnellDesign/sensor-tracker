import { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminGuard } from '@/components/admin/admin-guard';

export const metadata: Metadata = {
  title: 'Admin Panel | CGM Sensor Tracker',
  description: 'Administration panel for managing the CGM Sensor Tracker application',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AdminGuard>
        <div className="min-h-screen bg-[#0f172a] transition-colors duration-200">
          <Sidebar />
          <div className="lg:pl-72 relative">
            <main className="py-6">
              <div className="mx-auto max-w-7xl px-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </AdminGuard>
    </ProtectedRoute>
  );
}