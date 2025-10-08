'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RetroactiveResult {
  ret_user_id: string;
  achievements_awarded: number;
  points_awarded: number;
}

export function RetroactiveAwards() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetroactiveResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initializeGamificationStats = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResults([]);

    try {
      // First, get all users who have sensors but no gamification stats
      const { data: usersWithSensors, error: usersError } = await supabase
        .from('sensors')
        .select('user_id')
        .eq('is_deleted', false);

      if (usersError) throw usersError;

      const uniqueUserIds = [...new Set(usersWithSensors?.map(s => s.user_id) || [])];
      
      // Initialize stats for each user
      const initResults: RetroactiveResult[] = [];
      
      for (const userId of uniqueUserIds) {
        // Count their sensors
        const { data: sensorCount, error: countError } = await supabase
          .from('sensors')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_deleted', false);

        if (countError) continue;

        const { data: successfulCount, error: successError } = await supabase
          .from('sensors')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .eq('is_problematic', false);

        if (successError) continue;

        // Create or update gamification stats
        const { error: upsertError } = await (supabase as any)
          .from('user_gamification_stats')
          .upsert({
            user_id: userId,
            sensors_tracked: sensorCount?.length || 0,
            successful_sensors: successfulCount?.length || 0,
            total_points: 0,
            level: 1,
            achievements_earned: 0
          }, {
            onConflict: 'user_id'
          });

        if (!upsertError) {
          initResults.push({
            ret_user_id: userId,
            achievements_awarded: 0,
            points_awarded: 0
          });
        }
      }

      setResults(initResults);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error initializing gamification stats:', err);
      setError(err.message || 'Failed to initialize gamification stats');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      // Test basic database connection
      const { data: testData, error: testError } = await (supabase as any)
        .from('achievements')
        .select('count', { count: 'exact', head: true });
      
      console.log('Database connection test:', { testData, testError });
      
      // Check if function exists by querying pg_proc
      const { data: functionExists, error: functionCheckError } = await (supabase as any)
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'retroactively_award_achievements')
        .limit(1);
      
      console.log('Function exists check:', { functionExists, functionCheckError });
      
      // Also check what functions are available
      const { data: allFunctions, error: allFunctionsError } = await (supabase as any)
        .from('pg_proc')
        .select('proname')
        .like('proname', '%award%')
        .limit(10);
      
      console.log('Available award functions:', { allFunctions, allFunctionsError });
      
    } catch (err) {
      console.error('Database test error:', err);
    }
  };

  const runRetroactiveAwards = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResults([]);

    try {
      console.log('Testing database connection first...');
      await testDatabaseConnection();
      
      console.log('Calling retroactively_award_achievements function...');
      const { data, error } = await (supabase as any).rpc('retroactively_award_achievements');

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Supabase RPC error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object keys:', Object.keys(error));
        
        // Try different ways to extract error info
        const errorMsg = error.message || error.details || error.hint || 'Unknown database error';
        throw new Error(`Database error: ${errorMsg}`);
      }

      setResults(data || []);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error running retroactive awards:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack
      });
      setError(err.message || `Failed to run retroactive awards: ${JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const awardForSpecificUser = async (userId: string) => {
    if (!userId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await (supabase as any).rpc('award_achievements_for_user', {
        p_user_id: userId
      });

      if (error) {
        throw error;
      }

      setResults([{
        ret_user_id: userId,
        achievements_awarded: data[0]?.achievements_awarded || 0,
        points_awarded: data[0]?.points_awarded || 0
      }]);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error awarding for user:', err);
      setError(err.message || 'Failed to award achievements for user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            🏆 Retroactive Achievement Awards
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Award achievements to existing users based on their historical sensor data
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Success!</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Retroactive awards completed successfully
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Initialize Stats */}
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Initialize Gamification Stats
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Create gamification stats for users who have sensors but no stats yet. 
            Run this first if you&apos;re seeing empty data in the dashboard.
          </p>
          <button
            onClick={initializeGamificationStats}
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              loading
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Initialize Stats
              </>
            )}
          </button>
        </div>

        {/* Run for all users */}
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Award All Users
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            This will scan all existing users and award achievements based on their sensor history.
            This is safe to run multiple times as it won&apos;t award duplicate achievements.
          </p>
          <button
            onClick={runRetroactiveAwards}
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              loading
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Retroactive Awards
              </>
            )}
          </button>
        </div>

        {/* Run for specific user */}
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Award Specific User
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Award achievements for a specific user by their UUID.
          </p>
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="User UUID"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  awardForSpecificUser((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                awardForSpecificUser(input.value);
              }}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                loading
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              Award User
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Results ({results.length} users processed)
          </h3>
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      User: {result.ret_user_id.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-blue-600 dark:text-blue-400">
                      🏆 {result.achievements_awarded} achievements
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      ⭐ {result.points_awarded} points
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Total Summary
              </span>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-700 dark:text-blue-300">
                  🏆 {results.reduce((sum, r) => sum + r.achievements_awarded, 0)} total achievements
                </span>
                <span className="text-blue-700 dark:text-blue-300">
                  ⭐ {results.reduce((sum, r) => sum + r.points_awarded, 0)} total points
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}