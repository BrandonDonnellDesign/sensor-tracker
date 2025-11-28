'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { RefreshCw, Download, Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { GlucoseChart } from '@/components/glucose/glucose-chart';
import { GlucoseInsights } from '@/components/glucose/glucose-insights';
import { GlucoseStats } from '@/components/glucose/glucose-stats';
import { GlucoseReadingsList } from '@/components/glucose/glucose-readings-list';
import { ManualSyncDialog } from '@/components/glucose/manual-sync-dialog';
import { GlucoseExportDialog } from '@/components/glucose/glucose-export-dialog';
import { AdvancedAnalytics } from '@/components/glucose/advanced-analytics';
import { PredictiveAnalytics } from '@/components/glucose/predictive-analytics';
import { PatternInsights } from '@/components/glucose/pattern-insights';
import { IOBTracker } from '@/components/insulin/iob-tracker';
import { GlucosePredictor } from '@/components/glucose/glucose-predictor';
import { toast } from 'sonner';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
  record_id?: string | null;
  created_at?: string | null;
  display_app?: string | null;
  display_device?: string | null;
  display_time?: string | null;
  rate_unit?: string | null;
  status?: string | null;
  transmitter_generation?: string | null;
  transmitter_id?: string | null;
  unit?: string | null;
}

interface SyncStatus {
  isActive: boolean;
  lastSync?: string | null | undefined;
  tokenExpiry?: string | null | undefined;
  syncEnabled: boolean;
}

export default function GlucoseDataPage() {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [insulinLogs, setInsulinLogs] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    syncEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showManualSync, setShowManualSync] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const supabase = createClient();

  useEffect(() => {
    loadGlucoseData();
    loadFoodAndInsulinData();
    checkSyncStatus();
  }, [dateRange]);

  const loadGlucoseData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      console.log('Loading glucose data for date range:', dateRange);

      switch (dateRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      console.log('Querying glucose_readings from', startDate.toISOString(), 'to', endDate.toISOString());

      // Get the actual total count first
      const { count: totalCount, error: countError } = await supabase
        .from('glucose_readings')
        .select('*', { count: 'exact', head: true })
        .gte('system_time', startDate.toISOString())
        .lte('system_time', endDate.toISOString());

      console.log('📊 Total readings in date range:', totalCount);

      if (countError) {
        console.error('Error getting count:', countError);
      }

      // Fetch all data using pagination (Supabase has 1000 row limit per query)
      const pageSize = 1000;
      let allReadings: GlucoseReading[] = [];
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        const from = currentPage * pageSize;
        const to = from + pageSize - 1;

        console.log(`📄 Fetching page ${currentPage + 1} (rows ${from}-${to})...`);

        const { data, error } = await supabase
          .from('glucose_readings')
          .select('*')
          .gte('system_time', startDate.toISOString())
          .lte('system_time', endDate.toISOString())
          .order('system_time', { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allReadings = [...allReadings, ...data];
          console.log(`✅ Fetched ${data.length} readings (total so far: ${allReadings.length})`);

          // Check if we got less than pageSize, meaning we're done
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`🎉 Finished loading ${allReadings.length} total readings`);
      setReadings(allReadings);
    } catch (error) {
      console.error('Error loading glucose data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to load glucose data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFoodAndInsulinData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Load food logs with food names from the view
      const { data: foodData } = await supabase
        .from('food_logs_with_cgm')
        .select('id, user_id, product_name, total_carbs_g, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', endDate.toISOString())
        .order('logged_at', { ascending: false });

      // Load insulin logs
      const { data: insulinData } = await (supabase as any)
        .from('all_insulin_delivery')
        .select('id, user_id, units, insulin_type, taken_at')
        .eq('user_id', user.id)
        .gte('taken_at', startDate.toISOString())
        .lte('taken_at', endDate.toISOString())
        .order('taken_at', { ascending: false });

      setFoodLogs(foodData || []);
      setInsulinLogs(insulinData || []);
    } catch (error) {
      console.error('Error loading food/insulin data:', error);
      // Don't show error toast for this as it's supplementary data
    }
  };

  const checkSyncStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Checking sync status for user:', user.id);

      // Check Dexcom token status - don't require is_active=true in the query
      const { data: tokenData, error: tokenError } = await supabase
        .from('dexcom_tokens')
        .select('is_active, last_sync_at, token_expires_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('Token data:', { tokenData, tokenError });

      // Check sync settings
      const { data: syncSettings, error: syncError } = await supabase
        .from('dexcom_sync_settings')
        .select('sync_sensor_data, last_successful_sync')
        .eq('user_id', user.id)
        .single();

      console.log('Sync settings:', { syncSettings, syncError });

      // Check if token is expired
      const tokenExpiry = tokenData?.token_expires_at ? new Date(tokenData.token_expires_at) : null;
      const isTokenExpired = tokenExpiry && tokenExpiry <= new Date();
      const isActive = tokenData?.is_active && !isTokenExpired;

      console.log('Status calculation:', {
        hasToken: !!tokenData,
        tokenActive: tokenData?.is_active,
        tokenExpiry: tokenExpiry?.toISOString(),
        isTokenExpired,
        finalIsActive: isActive
      });

      // Be more lenient - if we have any token data, consider it potentially active
      const hasAnyToken = !!tokenData;

      setSyncStatus({
        isActive: hasAnyToken, // More lenient check
        lastSync: syncSettings?.last_successful_sync || tokenData?.last_sync_at || null,
        tokenExpiry: tokenData?.token_expires_at || null,
        syncEnabled: syncSettings?.sync_sensor_data !== false // Default to true if not set
      });
    } catch (error) {
      console.error('Error checking sync status:', error);
      // Set default status on error
      setSyncStatus({
        isActive: false,
        syncEnabled: false
      });
    }
  };


  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Starting manual sync for user:', user.id);

      // Use the same working method as glucose-test
      console.log('🔄 Starting Dexcom sync for user:', user.id);

      const response = await fetch('/api/dexcom/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include' // Ensure cookies are sent
      });

      console.log('🔄 Sync response status:', response.status);
      console.log('🔄 Sync response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('🔄 Sync error data:', errorData);
          console.error('🔄 Response status:', response.status);

          // Handle empty error objects
          if (Object.keys(errorData).length === 0) {
            throw new Error(`Sync failed with status ${response.status}. Server returned empty error object.`);
          }

          throw new Error(errorData.error || errorData.message || 'Sync failed');
        } else {
          const textResponse = await response.text();
          console.error('🔄 Non-JSON sync response:', textResponse.substring(0, 500));
          throw new Error(`Sync API returned HTML instead of JSON. Status: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('Sync result:', result);

      let message = `Synced ${result.glucose_readings || 0} glucose readings.`;
      if (result.token_auto_refreshed) {
        message += ' (Token was automatically refreshed)';
      }

      const newReadings = result.glucose_readings || 0;
      toast.success(`Sync completed! ${newReadings} new readings imported`);

      await loadGlucoseData();
      await loadFoodAndInsulinData();
      await checkSyncStatus();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const getTrendIcon = (trend?: string | null) => {
    switch (trend) {
      case 'rising':
      case 'rising_rapidly':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'falling':
      case 'falling_rapidly':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getSyncStatusBadge = () => {
    if (!syncStatus.isActive) {
      return <Badge variant="destructive">Not Connected</Badge>;
    }

    if (!syncStatus.syncEnabled) {
      return <Badge variant="secondary">Sync Disabled</Badge>;
    }

    const tokenExpiry = syncStatus.tokenExpiry ? new Date(syncStatus.tokenExpiry) : null;
    const isExpired = tokenExpiry && tokenExpiry <= new Date();

    if (isExpired) {
      return <Badge variant="destructive">Token Expired</Badge>;
    }

    return <Badge variant="default">Connected</Badge>;
  };

  const getLatestReading = () => {
    return readings.length > 0 ? readings[0] : null;
  };

  const latestReading = getLatestReading();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              Glucose Data
            </h1>
            <p className="text-slate-400">
              Monitor your continuous glucose readings and sync status
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExport(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualSync(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Manual Sync
            </Button>

            <Button
              onClick={handleManualSync}
              disabled={syncing}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : syncStatus.isActive ? 'Quick Sync' : 'Try Sync'}
            </Button>


          </div>
        </div>
      </div>

      {/* Sync Status Alert */}
      {!syncStatus.isActive && (
        <div className="mb-6 bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-200 text-sm">
                Dexcom connection issue detected. Please check your connection status or reconnect your account.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="link"
                  className="p-0 h-auto text-amber-300 hover:text-amber-200 text-sm"
                  onClick={checkSyncStatus}
                >
                  Refresh Status
                </Button>
                <span className="text-amber-400">•</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-amber-300 hover:text-amber-200 text-sm"
                  asChild
                >
                  <a href="/dashboard/settings/integrations">Check Settings →</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Latest Reading Card */}
      {latestReading && (
        <div className="mb-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/30 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Latest Reading
              {getTrendIcon(latestReading.trend)}
            </h2>
            <span className="text-xs text-slate-400">
              {new Date(latestReading.system_time).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-amber-300 mb-4 flex items-center gap-1">
            <span>⚠️</span>
            Readings are delayed by about an hour from Dexcom API
          </p>
          <div className="flex items-center gap-6">
            <div className="text-5xl font-bold text-white">
              {latestReading.value}
              <span className="text-xl text-slate-400 ml-2">mg/dL</span>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {latestReading.source || 'Unknown'}
              </Badge>
              {syncStatus.isActive && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-slate-400">Auto-sync enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Sync Status</h3>
          <div className="flex items-center justify-between">
            {getSyncStatusBadge()}
            {syncStatus.lastSync && (
              <span className="text-xs text-slate-400">
                Last: {new Date(syncStatus.lastSync).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Total Readings</h3>
          <div className="text-2xl font-bold text-white">{readings.length}</div>
          <p className="text-xs text-slate-400">
            Last {dateRange === '24h' ? '24 hours' : dateRange}
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Data Sources</h3>
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set(readings.map(r => r.source || 'Unknown'))).map(source => (
              <Badge key={source} variant="outline" className="text-xs border-slate-600 text-slate-300">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* IOB Tracker */}
      <div className="mb-6">
        <IOBTracker className="bg-slate-800/30 border-slate-700/30" />
      </div>

      {/* Main Content Tabs */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
        <Tabs defaultValue="chart" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/30">
            <TabsList className="bg-slate-700/50 border-slate-600">
              <TabsTrigger value="chart" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Chart
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Statistics
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="predictions" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Predictions & Safety
              </TabsTrigger>
              <TabsTrigger value="patterns" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                Patterns
              </TabsTrigger>
              <TabsTrigger value="iob" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                IOB Details
              </TabsTrigger>
              <TabsTrigger value="readings" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                All Readings
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-sm bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          <TabsContent value="chart" className="p-4 space-y-6">
            <GlucoseChart readings={readings} loading={loading} />
            {!loading && readings.length > 0 && (
              <GlucoseInsights readings={readings} />
            )}
          </TabsContent>

          <TabsContent value="stats" className="p-4">
            <GlucoseStats readings={readings} loading={loading} />
          </TabsContent>

          <TabsContent value="analytics" className="p-4">
            <AdvancedAnalytics readings={readings} loading={loading} />
          </TabsContent>

          <TabsContent value="predictions" className="p-4 space-y-6">
            {/* Real-time Safety Monitoring */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Real-time Safety Monitoring
              </h3>
              <GlucosePredictor
                autoRefresh={true}
                refreshInterval={300}
              />
            </div>

            {/* Advanced Predictive Analytics */}
            <PredictiveAnalytics readings={readings} loading={loading} />
          </TabsContent>

          <TabsContent value="patterns" className="p-4">
            <PatternInsights
              readings={readings}
              foodLogs={foodLogs}
              insulinLogs={insulinLogs}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="iob" className="p-4">
            <IOBTracker />
          </TabsContent>

          <TabsContent value="readings" className="p-4">
            <GlucoseReadingsList
              readings={readings}
              loading={loading}
              onRefresh={loadGlucoseData}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ManualSyncDialog
        open={showManualSync}
        onOpenChange={setShowManualSync}
        onSync={handleManualSync}
        syncStatus={syncStatus}
      />

      <GlucoseExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        dataType="glucose"
      />
    </div>
  );
}
