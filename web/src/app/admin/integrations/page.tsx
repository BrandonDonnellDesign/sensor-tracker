'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

interface IntegrationStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime?: number;
}

export default function AdminIntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { name: 'Dexcom API', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 250 },
    { name: 'OCR Service', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 1200 },
    { name: 'Supabase', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 45 },
    { name: 'Email Service', status: 'degraded', lastCheck: new Date().toISOString(), responseTime: 3200 },
  ]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.id) {
        router.push('/auth/login');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !profile || (profile as any).role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin access check failed:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'down': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Integration Health</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
          Monitor external service status and performance
        </p>
      </div>

      {/* Integration Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {integration.name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(integration.status)}`}>
                {integration.status}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Last Check:</span>
                <span className="text-gray-900 dark:text-slate-100">
                  {new Date(integration.lastCheck).toLocaleTimeString()}
                </span>
              </div>
              
              {integration.responseTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Response Time:</span>
                  <span className="text-gray-900 dark:text-slate-100">
                    {integration.responseTime}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Usage Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">API Usage (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1,247</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Dexcom API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">89</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">OCR Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">3,456</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Database Queries</div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Next Steps</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-blue-200">
          <li>Set up actual health check endpoints for each service</li>
          <li>Add Supabase Edge Functions for periodic status monitoring</li>
          <li>Configure alerts when services go down or response times spike</li>
          <li>Track API rate limits and usage quotas</li>
        </ul>
      </div>
    </div>
  );
}