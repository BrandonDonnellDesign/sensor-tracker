import Link from 'next/link';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

interface RecentSensorsProps {
  sensors: Sensor[];
  onRefresh?: () => void;
}

export function RecentSensors({ sensors, onRefresh }: RecentSensorsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Sensors</h3>
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-gray-500 hover:text-gray-700 p-1"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <Link href="/dashboard/sensors" className="text-sm text-blue-600 hover:text-blue-500">
            View all
          </Link>
        </div>
      </div>
      
      {sensors.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No sensors added yet</p>
          <Link href="/dashboard/sensors/new" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-500">
            Add your first sensor
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sensors.map((sensor) => (
            <Link
              key={sensor.id}
              href={`/dashboard/sensors/${sensor.id}`}
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${sensor.is_problematic ? 'bg-red-400' : 'bg-green-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sensor.serial_number}</p>
                    <p className="text-xs text-gray-500">Lot: {sensor.lot_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatDate(sensor.date_added)}
                  </p>
                  {sensor.is_problematic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                      Issue
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}