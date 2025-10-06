'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/providers/admin-guard';

export default function AdminMainPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/overview');
  }, [router]);

  return (
    <AdminGuard>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </AdminGuard>
  );
}
