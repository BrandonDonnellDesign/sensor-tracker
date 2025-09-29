'use client';

import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';

export default function TestAuthPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test</h1>
          
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h2 className="text-lg font-semibold text-green-800">✅ Authenticated</h2>
                <p className="text-green-700 mt-1">You are successfully logged in!</p>
              </div>
              
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <Link 
                  href="/dashboard" 
                  className="block w-full btn-primary text-center"
                >
                  Go to Dashboard
                </Link>
                <button 
                  onClick={signOut}
                  className="block w-full btn-secondary text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <h2 className="text-lg font-semibold text-red-800">❌ Not Authenticated</h2>
                <p className="text-red-700 mt-1">You need to sign in first.</p>
              </div>
              
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
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Quick Links</h3>
            <div className="space-y-1">
              <Link href="/" className="block text-blue-600 hover:text-blue-500">Home</Link>
              <Link href="/debug" className="block text-blue-600 hover:text-blue-500">Debug Page</Link>
              <Link href="/dashboard" className="block text-blue-600 hover:text-blue-500">Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}