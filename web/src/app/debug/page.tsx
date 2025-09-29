'use client';

import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';

export default function DebugPage() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Debug Information</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Authentication Status</h2>
              <div className="mt-2 p-4 bg-gray-50 rounded-md text-gray-700">
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>User:</strong> {user ? 'Authenticated' : 'Not authenticated'}</p>
                {user && (
                  <>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>User ID:</strong> {user.id}</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-700">Quick Actions</h2>
              
              {user ? (
                <div className="space-y-2">
                  <Link 
                    href="/dashboard" 
                    className="block w-full btn-primary text-center"
                  >
                    Go to Dashboard
                  </Link>
                  <Link 
                    href="/test-auth" 
                    className="block w-full btn-secondary text-center"
                  >
                    Test Auth Page
                  </Link>
                  <button 
                    onClick={signOut}
                    className="block w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link 
                    href="/auth/login" 
                    className="block w-full btn-primary text-center"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="block w-full btn-secondary text-center"
                  >
                    Register
                  </Link>
                  <Link 
                    href="/test-auth" 
                    className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    Test Auth Page
                  </Link>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700">Navigation Links</h2>
              <div className="mt-2 space-y-1">
                <Link href="/" className="block text-blue-600 hover:text-blue-500">Home</Link>
                <Link href="/test" className="block text-blue-600 hover:text-blue-500">Test Page (No Auth)</Link>
                <Link href="/test-db" className="block text-blue-600 hover:text-blue-500">Test Database</Link>
                <Link href="/dashboard" className="block text-blue-600 hover:text-blue-500">Dashboard</Link>
                <Link href="/dashboard/sensors" className="block text-blue-600 hover:text-blue-500">Sensors</Link>
                <Link href="/dashboard/sensors/new" className="block text-blue-600 hover:text-blue-500">Add Sensor</Link>
                <Link href="/auth/login" className="block text-blue-600 hover:text-blue-500">Login</Link>
                <Link href="/auth/register" className="block text-blue-600 hover:text-blue-500">Register</Link>
                <Link href="/auth/logout" className="block text-blue-600 hover:text-blue-500">Logout</Link>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700">Browser Info</h2>
              <div className="mt-2 p-4 bg-gray-50 rounded-md text-sm text-gray-700">
                <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}