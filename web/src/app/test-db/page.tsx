'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';

export default function TestDbPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setResults(null);

    try {
      console.log('Testing Supabase connection...');
      
      // Test 1: Basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('sensors')
        .select('count')
        .limit(1);

      console.log('Connection test:', { connectionTest, connectionError });

      // Test 2: Check table structure
      const { data: tableData, error: tableError } = await supabase
        .from('sensors')
        .select('*')
        .limit(1);

      console.log('Table structure test:', { tableData, tableError });

      // Test 3: Check user's sensors
      let userSensors = null;
      let userSensorsError = null;
      
      if (user) {
        const { data, error } = await supabase
          .from('sensors')
          .select('*')
          .eq('user_id', user.id);
        
        userSensors = data;
        userSensorsError = error;
        console.log('User sensors test:', { userSensors, userSensorsError });
      }

      setResults({
        connection: { data: connectionTest, error: connectionError },
        tableStructure: { data: tableData, error: tableError },
        userSensors: { data: userSensors, error: userSensorsError },
        user: user ? { id: user.id, email: user.email } : null
      });

    } catch (error) {
      console.error('Test error:', error);
      setResults({ error: error });
    } finally {
      setLoading(false);
    }
  };

  const createTestSensor = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }

    setLoading(true);
    try {
      const testData = {
        user_id: user.id,
        serial_number: `TEST-${Date.now()}`,
        lot_number: `LOT-${Date.now()}`,
        date_added: new Date().toISOString().split('T')[0],
        is_problematic: false,
      };

      console.log('Creating test sensor:', testData);

      const { data, error } = await supabase
        .from('sensors')
        .insert(testData)
        .select();

      console.log('Test sensor result:', { data, error });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Test sensor created successfully!');
        testConnection(); // Refresh results
      }
    } catch (error) {
      console.error('Create test sensor error:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSecurity = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing security - trying to access all sensors without user filter...');
      
      // This should fail due to RLS policies
      const { data: allSensors, error: allError } = await supabase
        .from('sensors')
        .select('*');

      console.log('All sensors query (should be filtered by RLS):', { allSensors, allError });

      // This should only return user's sensors
      const { data: userSensors, error: userError } = await supabase
        .from('sensors')
        .select('*')
        .eq('user_id', user.id);

      console.log('User sensors query:', { userSensors, userError });

      alert(`Security test complete. Check console for results.\nAll sensors: ${allSensors?.length || 0}\nUser sensors: ${userSensors?.length || 0}`);
    } catch (error) {
      console.error('Security test error:', error);
      alert(`Security test error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Test Page</h1>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={testConnection}
              disabled={loading}
              className="btn-primary mr-4"
            >
              {loading ? 'Testing...' : 'Test Database Connection'}
            </button>

            <button
              onClick={createTestSensor}
              disabled={loading || !user}
              className="btn-secondary"
            >
              Create Test Sensor
            </button>

            <button
              onClick={testSecurity}
              disabled={loading || !user}
              className="btn-secondary"
            >
              Test Security (RLS)
            </button>

            <Link href="/dashboard/sensors/new" className="btn-secondary ml-4">
              Go to Add Sensor Page
            </Link>
          </div>

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800">
                You need to <Link href="/auth/login" className="underline">log in</Link> to test sensor creation.
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Test Results</h2>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>

              {results.connection?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-red-800 font-medium">Connection Error</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {results.connection.error.message || 'Unknown connection error'}
                  </p>
                  {results.connection.error.message?.includes('Could not find the table') && (
                    <div className="mt-3">
                      <Link href="/setup-db" className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Set Up Database Tables
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {results.tableStructure?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-red-800 font-medium">Table Structure Error</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {results.tableStructure.error.message || 'Unknown table error'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Quick Links</h3>
            <div className="space-y-1">
              <Link href="/test" className="block text-blue-600 hover:text-blue-500">Test Page</Link>
              <Link href="/debug" className="block text-blue-600 hover:text-blue-500">Debug Page</Link>
              <Link href="/dashboard" className="block text-blue-600 hover:text-blue-500">Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}