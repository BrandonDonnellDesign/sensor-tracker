'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';

export default function TestPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Page (No Auth Required)</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h2 className="text-lg font-semibold text-blue-800">✅ Page Loaded Successfully</h2>
              <p className="text-blue-700 mt-1">This page loaded without middleware interference.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Authentication Status</h3>
              <div className="p-4 bg-gray-50 rounded-md">
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>User:</strong> {user ? `Authenticated (${user.email})` : 'Not authenticated'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Navigation Test</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/" className="btn-primary text-center">Home</Link>
                <Link href="/auth/login" className="btn-secondary text-center">Login</Link>
                <Link href="/dashboard" className="btn-primary text-center">Dashboard</Link>
                <Link href="/test-auth" className="btn-secondary text-center">Test Auth</Link>
                <Link href="/debug" className="btn-secondary text-center">Debug</Link>
                <Link href="/dashboard/sensors" className="btn-secondary text-center">Sensors</Link>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800">Note</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Middleware has been temporarily disabled to test authentication flow. 
                The ProtectedRoute component will handle dashboard authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}