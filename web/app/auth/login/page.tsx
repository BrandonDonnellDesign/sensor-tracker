'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { GoogleLoginButton } from '@/components/auth/google-login-button';
import { BarChart3, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Redirect if already authenticated or after successful login
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = '/dashboard';
    }
  }, [user, authLoading]);

  // Handle redirect after login success
  useEffect(() => {
    if (loginSuccess && user) {
      window.location.href = '/dashboard';
    }
  }, [loginSuccess, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      setLoginSuccess(true);

      // Fallback redirect in case useEffect doesn't trigger
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
            <Link href="/auth/register" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-2xl shadow-blue-500/25 mb-6">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 mb-3">
                Welcome Back
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-400 mb-6">
                Sign in to continue your sensor tracking journey
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-slate-500">
                <span>New to CGM Tracker?</span>
                <Link
                  href="/auth/register"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors inline-flex items-center"
                >
                  Create account
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
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                      Login Error
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error}
                    </p>
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
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 hover:shadow-2xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {loginSuccess ? 'Redirecting...' : 'Signing in...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </div>
                )}
              </button>
            </div>

            {loginSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      Login Successful!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Redirecting to dashboard...
                    </p>
                    <Link
                      href="/dashboard"
                      className="text-sm text-green-800 dark:text-green-200 underline mt-2 hover:text-green-900 dark:hover:text-green-100 inline-flex items-center"
                    >
                      Click here if not redirected automatically
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleLoginButton />
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}