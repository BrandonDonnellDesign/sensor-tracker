'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { IOBTracker } from '@/components/insulin/iob-tracker';
import { QuickDoseLogger } from '@/components/insulin/quick-dose-logger';
import { InsulinCalculatorWidget } from '@/components/food/insulin-calculator-widget';
import { TDIDashboard } from '@/components/insulin/tdi-dashboard';
import { BasalTrends } from '@/components/insulin/basal-trends';
import { ExportData } from '@/components/insulin/export-data';
import { IOBDecayChart } from '@/components/insulin/iob-decay-chart';
import { IOBAlerts } from '@/components/insulin/iob-alerts';
import { SmartDefaults } from '@/components/insulin/smart-defaults';
import { PWAInstallPrompt } from '@/components/insulin/pwa-install-prompt';

import { 
  Syringe, 
  TrendingUp, 
  Calendar, 
  Settings, 
  Plus,
  Trash2,
  Clock,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface InsulinLog {
  id: string;
  units: number;
  insulin_type: string;
  taken_at: string;
  notes?: string | null;
  insulin_name?: string | null;
  delivery_type?: string;
  logged_via?: string | null;
  blood_glucose_before?: number | null;
  injection_site?: string | null;
  meal_relation?: string | null;
  activity_level?: string | null;
  blood_glucose_after?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  mood?: string | null;
  user_id: string;
}

export default function InsulinPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<InsulinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, selectedPeriod]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + R for refresh
      if (event.altKey && event.key === 'r' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        fetchLogs();
        return;
      }
      
      // Alt + H for history
      if (event.altKey && event.key === 'h' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        window.location.href = '/dashboard/insulin/history';
        return;
      }
      
      // Alt + I for import
      if (event.altKey && event.key === 'i' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        window.location.href = '/dashboard/insulin/import';
        return;
      }
      
      // Alt + S for settings
      if (event.altKey && event.key === 's' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        window.location.href = '/dashboard/settings?tab=calculator';
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      let startDate = new Date();
      if (selectedPeriod === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      }

      const { data, error } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching insulin doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this insulin log?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('insulin_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      setLogs(logs.filter(l => l.id !== logId));
    } catch (error) {
      console.error('Error deleting dose:', error);
      alert('Failed to delete dose. Please try again.');
    }
  };

  const totalInsulin = logs.reduce((sum, log) => sum + log.units, 0);
  const averagePerDay = selectedPeriod === 'today' ? totalInsulin : 
    selectedPeriod === 'week' ? totalInsulin / 7 : totalInsulin / 30;

  // Calculate basal vs bolus breakdown
  const basalInsulin = logs
    .filter(log => log.delivery_type === 'basal')
    .reduce((sum, log) => sum + log.units, 0);
  const bolusInsulin = logs
    .filter(log => log.delivery_type === 'bolus' || log.delivery_type === 'correction' || !log.delivery_type)
    .reduce((sum, log) => sum + log.units, 0);
  const basalPercentage = totalInsulin > 0 ? (basalInsulin / totalInsulin) * 100 : 0;
  const bolusPercentage = totalInsulin > 0 ? (bolusInsulin / totalInsulin) * 100 : 0;

  const insulinTypeColors = {
    rapid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    short: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    long: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
  };

  // Helper function to format notes for better readability
  const formatNotes = (notes: string | null) => {
    if (!notes) return null;
    
    // Split notes by common separators
    const parts = notes.split(/\s*\|\s*/).filter(Boolean);
    
    return parts.map((part, index) => {
      const trimmedPart = part.trim();
      
      // Identify different types of notes and style them
      if (trimmedPart.startsWith('BG:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 mr-1 mb-1">
            🩸 {trimmedPart}
          </span>
        );
      } else if (trimmedPart.startsWith('Carbs:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 mr-1 mb-1">
            🍞 {trimmedPart}
          </span>
        );
      } else if (trimmedPart.startsWith('I:C Ratio:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 mr-1 mb-1">
            ⚖️ {trimmedPart}
          </span>
        );
      } else if (trimmedPart.startsWith('Meal bolus:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 mr-1 mb-1">
            🍽️ {trimmedPart}
          </span>
        );
      } else if (trimmedPart.startsWith('Glooko data:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 mr-1 mb-1">
            📊 {trimmedPart}
          </span>
        );
      } else if (trimmedPart.startsWith('Manual entry:')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300 mr-1 mb-1">
            ✋ {trimmedPart}
          </span>
        );
      } else {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400 mr-1 mb-1">
            📝 {trimmedPart}
          </span>
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* IOB Alerts */}
        <IOBAlerts />

        {/* Enhanced Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Syringe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Insulin Management
                </h1>
                <p className="text-gray-600 dark:text-slate-400 mt-1">
                  Track doses, monitor IOB, and manage your insulin therapy
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/insulin/history"
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium group"
                title="View History (Alt+H)"
              >
                <Clock className="w-5 h-5 mr-2" />
                History
                <span className="ml-2 text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                  Alt+H
                </span>
              </Link>
              <Link
                href="/dashboard/insulin/import"
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium group"
                title="Import Data (Alt+I)"
              >
                <Plus className="w-5 h-5 mr-2" />
                Import Data
                <span className="ml-2 text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                  Alt+I
                </span>
              </Link>
              <Link
                href="/dashboard/settings?tab=calculator"
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium group"
                title="Calculator Settings (Alt+S)"
              >
                <Settings className="w-5 h-5 mr-2" />
                Settings
                <span className="ml-2 text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                  Alt+S
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Top Row - IOB and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* IOB Tracker */}
          <IOBTracker showDetails className="lg:col-span-1" />
          
          {/* Quick Dose Logger */}
          <div className="lg:col-span-1 space-y-4">
            <QuickDoseLogger onDoseLogged={fetchLogs} />
            <SmartDefaults />
          </div>
          
          {/* Insulin Calculator */}
          <div className="lg:col-span-1">
            <InsulinCalculatorWidget />
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TDIDashboard />
          <BasalTrends />
        </div>

        {/* IOB Analysis */}
        <IOBDecayChart />

        {/* Enhanced Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Insulin</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalInsulin.toFixed(1)}u
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This week' : 'This month'}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                <Syringe className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Daily Average</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {averagePerDay.toFixed(1)}u
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Per day average
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl shadow-md">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Total Doses</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {logs.length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Recorded doses
                </p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl shadow-md">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Basal vs Bolus</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-700 dark:text-orange-300">Bolus</span>
                    <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                      {bolusInsulin.toFixed(1)}u ({bolusPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-700 dark:text-orange-300">Basal</span>
                    <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                      {basalInsulin.toFixed(1)}u ({basalPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  {/* Visual bar */}
                  <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${bolusPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl shadow-md ml-4">
                <div className="relative">
                  <Syringe className="h-6 w-6 text-white" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <ExportData />

        {/* Enhanced Dose History */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-slate-800 p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Syringe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  Dose History
                </h2>
                <button
                  onClick={() => fetchLogs()}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                  title="Refresh (Alt+R)"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex space-x-2">
                {(['today', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      selectedPeriod === period
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2 mb-2"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Syringe className="h-12 w-12 text-gray-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                  No insulin doses recorded
                </h3>
                <p className="text-gray-500 dark:text-slate-500 mb-4">
                  No doses found for the selected time period
                </p>
                <div className="flex justify-center space-x-3">
                  <Link
                    href="/dashboard/insulin/import"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Import Data
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="group bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200 dark:border-slate-600 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <Syringe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-slate-100">
                              {log.units}u
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${insulinTypeColors[log.insulin_type as keyof typeof insulinTypeColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}`}>
                              {log.insulin_type}
                            </span>
                            {log.delivery_type === 'basal' && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-full font-medium">
                                � Daily Basal
                              </span>
                            )}
                            {log.logged_via === 'csv_import' && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                                📊 Imported
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400 mb-3">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {new Date(log.taken_at).toLocaleString()}
                            </span>
                          </div>
                          {log.notes && (
                            <div className="flex flex-wrap items-start gap-1">
                              {formatNotes(log.notes)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="p-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 md:opacity-100 touch-manipulation"
                          title="Delete log"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}