'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { BarChart3, AlertCircle, CheckCircle, ArrowRight, Mail } from 'lucide-react';

export default function RegisterPage() {
  const { signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Navigation */}
        <nav className="absolute top-0 w-full z-10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">CGM Tracker</span>
            </Link>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 text-center">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-2xl shadow-green-500/25 mb-6">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 mb-4">
                Check Your Email
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-400 mb-2">
                We&apos;ve sent a confirmation link to
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {email}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Click the link in the email to activate your account, then sign in to start tracking your sensors.
                </p>
              </div>
              <Link 
                href="/auth/login" 
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                Continue to Sign In
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">CGM Tracker</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-2xl shadow-blue-500/25 mb-6">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-3">
                Join CGM Tracker
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-400 mb-6">
                Start your smart sensor management journey
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-slate-500">
                <span>Already have an account?</span>
                <Link
                  href="/auth/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                >
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
        
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Registration Error</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 hover:shadow-2xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                  )}
                </button>
              </div>

              <div className="text-center text-xs text-gray-500 dark:text-slate-400">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                  Privacy Policy
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}