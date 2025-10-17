'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

export default function LogoutPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut();
        router.push('/auth/login');
      } catch (error) {
        // Force redirect even if logout fails
        router.push('/auth/login');
      }
    };

    handleLogout();
  }, [signOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Signing you out...</p>
      </div>
    </div>
  );
}