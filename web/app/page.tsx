'use client';

// Force rebuild


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Bell, BarChart3, Gamepad2, Utensils, Syringe, TrendingUp, Check } from 'lucide-react';
import { ComparisonTable } from '@/components/ui/comparison-table';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <nav className="absolute top-0 w-full z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">CGM Tracker</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">🎉 Now with Dexcom Auto-Sync</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white leading-tight">
                Take Control of Your
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                  Diabetes Management
                </span>
              </h1>

              <p className="text-xl text-gray-700 dark:text-slate-300 mb-8 leading-relaxed">
                Track glucose, log meals, manage insulin, and gain insights—all in one place.
                Auto-sync with Dexcom CGM, access 500K+ foods, and optimize your health with smart analytics.
              </p>

              {/* Value Props */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-slate-300">Dexcom CGM auto-sync (1-hour delay)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-slate-300">500,000+ food database with barcode scanner</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-slate-300">Advanced IOB calculator & insulin tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-slate-300">Predictive glucose analytics & pattern insights</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register" className="btn-primary text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-center">
                  Start Free Today
                  <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="#features" className="btn-secondary text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-center">
                  See Features
                </Link>
              </div>

              <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
                ✓ No credit card required  ✓ Free forever  ✓ Cancel anytime
              </p>
            </div>

            {/* Right: Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 bg-slate-800 group">
                <div className="aspect-video relative">
                  <img
                    src="/dashboard-preview.png?v=3"
                    alt="CGM Tracker Dashboard"
                    className="object-cover w-full h-full"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 animate-bounce-slow hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">Time in Range</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">94%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">500K+</div>
              <div className="text-gray-600 dark:text-gray-400">Food Database</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">1-Hour</div>
              <div className="text-gray-600 dark:text-gray-400">Dexcom Sync</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">Advanced</div>
              <div className="text-gray-600 dark:text-gray-400">IOB Calculator</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">15+</div>
              <div className="text-gray-600 dark:text-gray-400">Achievements</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"> Thrive</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive diabetes management with glucose tracking, food logging, insulin management, and intelligent insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Glucose Tracking */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Glucose Data & Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Auto-sync with Dexcom CGM (1-hour delay), view detailed charts, analyze patterns, and get predictive insights for better control.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">Dexcom Sync</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">Predictions</span>
              </div>
            </div>

            {/* Food Logging */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Utensils className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Food & Carb Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Access 500K+ foods, scan barcodes, create custom meals, and track carbs with precision. See how meals affect your glucose.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">500K+ Foods</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">Barcode</span>
              </div>
            </div>

            {/* Insulin Tracking */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Syringe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Insulin Management</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Track doses, calculate IOB (Insulin on Board), avoid stacking, and optimize your insulin-to-carb ratios with smart analytics.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">IOB Calc</span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">Dose History</span>
              </div>
            </div>

            {/* Predictive Analytics */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Predictive Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                AI-powered glucose predictions, pattern recognition, and personalized insights to stay ahead of highs and lows.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm">AI Insights</span>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm">Patterns</span>
              </div>
            </div>

            {/* Gamification */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Gamified Experience</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Earn points, unlock 15+ achievements, maintain streaks, and stay motivated with fun challenges and rewards.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">15+ Achievements</span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">Streaks</span>
              </div>
            </div>

            {/* Smart Notifications */}
            <div className="card group hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center">Smart Alerts</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                Customizable notifications for sensor expiry, glucose trends, meal reminders, and insulin timing.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">Push Alerts</span>
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">Custom</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-6 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose CGM Tracker?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See how we compare to manual tracking and other apps
            </p>
          </div>

          <ComparisonTable
            columns={[
              { title: 'Manual Tracking' },
              { title: 'Other Apps', subtitle: 'Basic features' },
              { title: 'CGM Tracker', subtitle: 'Complete solution', highlight: true },
            ]}
            rows={[
              { feature: 'Dexcom Auto-Sync', values: [false, '⚠️ Limited', '✓ 1-hour delay'] },
              { feature: 'Food Database', values: [false, '✓ Basic', '✓ 500K+ foods'] },
              { feature: 'Barcode Scanner', values: [false, '⚠️ Some', '✓ Full support'] },
              { feature: 'IOB Calculator', values: [false, false, true] },
              { feature: 'Glucose Predictions', values: [false, false, true] },
              { feature: 'Pattern Insights', values: [false, '⚠️ Basic', '✓ AI-powered'] },
              { feature: 'Meal Impact Analysis', values: [false, false, true] },
              { feature: 'Achievements & Gamification', values: [false, false, true] },
              { feature: 'Sensor Management', values: [false, false, true] },
              { feature: 'Data Export', values: [false, '⚠️ Limited', '✓ Full export'] },
            ]}
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <details className="card group">
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 dark:text-white flex justify-between items-center">
                Is my health data secure?
                <span className="text-2xl group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Yes! Your data is encrypted with bank-level security, stored securely on Supabase infrastructure, and never shared with third parties. We're committed to protecting your privacy.
              </p>
            </details>

            <details className="card group">
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 dark:text-white flex justify-between items-center">
                Which CGM systems do you support?
                <span className="text-2xl group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Currently, we support Dexcom CGM with automatic sync (1-hour delay via Dexcom API). You can also manually enter data from any CGM system.
              </p>
            </details>

            <details className="card group">
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 dark:text-white flex justify-between items-center">
                Is CGM Tracker free?
                <span className="text-2xl group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Yes! CGM Tracker is completely free to use with all features included. No credit card required, no hidden fees, no premium tiers.
              </p>
            </details>

            <details className="card group">
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 dark:text-white flex justify-between items-center">
                Can I export my data?
                <span className="text-2xl group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Absolutely! You can export all your glucose, food, and insulin data in CSV or JSON format at any time. Your data is yours.
              </p>
            </details>

            <details className="card group">
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 dark:text-white flex justify-between items-center">
                How accurate is the IOB calculator?
                <span className="text-2xl group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Our IOB calculator uses industry-standard formulas based on insulin action curves. However, always consult with your healthcare provider for medical decisions.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Take Control of Your Diabetes?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join people who are managing their diabetes smarter with comprehensive tracking and insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link href="/auth/register" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-xl transition-colors duration-200">
                Start Free Today
              </Link>
              <Link href="/auth/login" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4 rounded-xl transition-colors duration-200">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-blue-100">
              ✓ No credit card required  ✓ Free forever  ✓ All features included
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">CGM Tracker</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Comprehensive diabetes management for better health outcomes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="#features" className="hover:text-blue-600">Features</Link></li>
                <li><Link href="/auth/register" className="hover:text-blue-600">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#faq" className="hover:text-blue-600">FAQ</a></li>
                <li><a href="mailto:support@cgmtracker.com" className="hover:text-blue-600">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2024 CGM Tracker. All rights reserved.</p>
            <p className="mt-2">Made with ❤️ for the diabetes community</p>
          </div>
        </div>
      </footer>
    </main>
  );
}