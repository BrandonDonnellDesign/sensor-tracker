import Link from 'next/link';
import { Database } from '@/lib/database.types';
import { getSensorExpirationInfo, formatDaysLeft } from '@dexcom-tracker/shared';
import { SensorType } from '@dexcom-tracker/shared';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

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
          {sensors.map((sensor) => {
            // Use sensorModel if available, otherwise fall back to sensor_type for backward compatibility
            const sensorModel: any = sensor.sensor_models ? {
              ...sensor.sensor_models,
              modelName: sensor.sensor_models.model_name,
              durationDays: sensor.sensor_models.duration_days,
            } : {
              id: 'fallback',
              manufacturer: (sensor as any).sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
              modelName: (sensor as any).sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
              durationDays: (sensor as any).sensor_type === 'dexcom' ? 10 : 14,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            const sensorExpInfo = getSensorExpirationInfo(
              new Date(sensor.date_added),
              sensorModel
            );
            
            const getStatusColor = () => {
              if (sensor.is_problematic) return 'bg-red-400';
              if (sensorExpInfo.isExpired) return 'bg-gray-400';
              if (sensorExpInfo.expirationStatus === 'critical') return 'bg-red-500';
              if (sensorExpInfo.expirationStatus === 'warning') return 'bg-yellow-400';
              return 'bg-green-400';
            };
            
            const getCardStyle = () => {
              if (sensorExpInfo.isExpired) return 'block p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors';
              if (sensorExpInfo.expirationStatus === 'critical') return 'block p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors';
              if (sensorExpInfo.expirationStatus === 'warning') return 'block p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors';
              return 'block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors';
            };

            return (
              <Link
                key={sensor.id}
                href={`/dashboard/sensors/${sensor.id}`}
                className={getCardStyle()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sensor.serial_number}</p>
                      <p className="text-xs text-gray-500">
                        {sensorModel.manufacturer} {sensorModel.modelName}
                        {sensor.lot_number && ` • Lot: ${sensor.lot_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDaysLeft(sensorExpInfo.daysLeft)}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      {sensor.is_problematic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Issue
                        </span>
                      )}
                      {sensorExpInfo.isExpired && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Expired
                        </span>
                      )}
                      {sensorExpInfo.expirationStatus === 'critical' && !sensorExpInfo.isExpired && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Critical
                        </span>
                      )}
                      {sensorExpInfo.expirationStatus === 'warning' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Expiring
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}