'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page with profile tab active
    router.replace('/dashboard/settings');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-slate-400">Redirecting to Settings...</p>
      </div>
    </div>
  );
}