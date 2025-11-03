'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/auth-provider';

interface GlucoseReading {
  id: string;
  value: number;
  trend: string;
  system_time: string;
  display_time: string;
  transmitter_id: string;
  transmitter_generation: string;
  display_device: string;
  display_app: string;
  trend_rate: number;
  rate_unit: string;
  created_at: string;
}

export default function GlucoseTestClient() {
  const { user } = useAuth();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchReadings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchReadings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/glucose/readings?userId=${user.id}`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse.substring(0, 500));
        throw new Error(`API returned HTML instead of JSON. Status: ${response.status}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch readings');
      }
      
      const data = await response.json();
      console.log('Fetched readings:', data.length);
      setReadings(data);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!user?.id) {
      alert('Not authenticated');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dexcom-refresh-token`,
        {
          method: 'POST',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Token refresh error:', result);
        throw new Error(result.error + (result.details ? ': ' + result.details : ''));
      }

      alert('Token refreshed successfully! You can now sync.');
    } catch (err: any) {
      console.error('Token refresh failed:', err);
      alert('Token refresh failed: ' + err.message);
    }
  };

  const handleSync = async () => {
    if (!user?.id) {
      alert('Not authenticated');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      console.log('🔄 Starting Dexcom sync for user:', user.id);
      
      // Now sync
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
          
          // Handle empty error objects
          if (Object.keys(errorData).length === 0) {
            throw new Error(`Sync failed with status ${response.status}. Server returned empty response.`);
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
      message += ' Check console for details.';
      
      alert(message);
      fetchReadings();
    } catch (err: any) {
      setError(err.message);
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatToPST = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' PST';
  };

  const getTrendArrow = (trend: string) => {
    const arrows: Record<string, string> = {
      'doubleUp': '⇈',
      'singleUp': '↑',
      'fortyFiveUp': '↗',
      'flat': '→',
      'fortyFiveDown': '↘',
      'singleDown': '↓',
      'doubleDown': '⇊',
      'notComputable': '?',
      'rateOutOfRange': '⚠'
    };
    return arrows[trend] || trend;
  };

  const getTrendColor = (trend: string) => {
    const colors: Record<string, string> = {
      'doubleUp': 'text-red-600',
      'singleUp': 'text-orange-500',
      'fortyFiveUp': 'text-yellow-600',
      'flat': 'text-green-600',
      'fortyFiveDown': 'text-yellow-600',
      'singleDown': 'text-orange-500',
      'doubleDown': 'text-red-600',
      'notComputable': 'text-gray-400',
      'rateOutOfRange': 'text-purple-600'
    };
    return colors[trend] || 'text-gray-900';
  };

  const getGlucoseColor = (value: number) => {
    if (value < 70) return 'text-red-600 bg-red-50';
    if (value > 180) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-white">Glucose Data</h1>
        <p className="text-slate-400">All glucose readings synced from Dexcom (times in PST)</p>
      </div>

      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <button
          onClick={handleRefreshToken}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          🔑 Refresh Token
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing...' : '🔄 Sync Now'}
        </button>
        <button
          onClick={fetchReadings}
          disabled={loading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
        <div className="text-sm text-slate-400 ml-auto">
          Total readings: <span className="text-white font-semibold">{readings.length}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading glucose readings...</div>
      ) : readings.length === 0 ? (
        <div className="bg-[#1e293b] rounded-lg p-12 border border-slate-700/30 text-center">
          <p className="text-slate-400 mb-4">No glucose readings found</p>
          <button
            onClick={handleSync}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all"
          >
            Sync from Dexcom
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#1e293b] rounded-lg shadow-lg border border-slate-700/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Time (PST)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Glucose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Transmitter
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatToPST(reading.system_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getGlucoseColor(reading.value)}`}>
                          {reading.value} mg/dL
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-2xl font-bold ${getTrendColor(reading.trend)}`}>
                        {getTrendArrow(reading.trend)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {reading.trend_rate ? (
                          <>
                            {reading.trend_rate > 0 ? '+' : ''}{reading.trend_rate} {reading.rate_unit}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {reading.display_device || '-'}
                        {reading.display_app && (
                          <div className="text-xs text-slate-500">{reading.display_app}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                        {reading.transmitter_id?.substring(0, 8)}...
                        {reading.transmitter_generation && (
                          <div className="text-xs">{reading.transmitter_generation}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 p-6 bg-[#1e293b] border border-slate-700/30 rounded-lg">
            <h3 className="font-semibold mb-4 text-white">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Average</div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(readings.reduce((sum, r) => sum + r.value, 0) / readings.length)} <span className="text-sm text-slate-400">mg/dL</span>
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Highest</div>
                <div className="text-2xl font-bold text-orange-500">
                  {Math.max(...readings.map(r => r.value))} <span className="text-sm text-slate-400">mg/dL</span>
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Lowest</div>
                <div className="text-2xl font-bold text-red-500">
                  {Math.min(...readings.map(r => r.value))} <span className="text-sm text-slate-400">mg/dL</span>
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Time Range</div>
                <div className="text-sm text-white">
                  {readings.length > 0 && (
                    <>
                      {format(new Date(readings[readings.length - 1].system_time), 'MMM dd')} - {format(new Date(readings[0].system_time), 'MMM dd')}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
