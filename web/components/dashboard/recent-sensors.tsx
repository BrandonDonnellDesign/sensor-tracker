import Link from 'next/link';
import { Database } from '@/lib/database.types';
import { getSensorExpirationInfo, formatDaysLeft } from '@/shared/src/utils/sensorExpiration';
import { SensorType } from '@/shared/src/models/Sensor';
import { useDateTimeFormatter } from '@/utils/date-formatter';

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
  isRefreshing?: boolean;
}

export function RecentSensors({ sensors, onRefresh, isRefreshing = false }: RecentSensorsProps) {
  const dateFormatter = useDateTimeFormatter();

  // Local formatDaysLeft function to bypass caching issues
  const formatDaysLeftLocal = (daysLeft: number, expirationInfo: any): string => {
    // If we have expiration info and the sensor is expired, show the actual expiration date
    if (expirationInfo && expirationInfo.isExpired) {
      const expiredDate = expirationInfo.expirationDate;
      const now = new Date();
      const daysSinceExpired = Math.floor((now.getTime() - expiredDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Format the expiration date
      const expiredDateFormatted = dateFormatter.formatDate(expiredDate);
      
      if (daysSinceExpired === 0) {
        return `Expired today (${expiredDateFormatted})`;
      } else if (daysSinceExpired === 1) {
        return `Expired yesterday (${expiredDateFormatted})`;
      } else {
        return `Expired ${expiredDateFormatted}`;
      }
    }
    
    // Always calculate precise time remaining when we have expiration info
    if (expirationInfo) {
      const now = new Date();
      const timeLeft = expirationInfo.expirationDate.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      // Handle expired sensors with grace period for Dexcom
      if (timeLeft < 0) {
        const timeExpired = Math.abs(timeLeft);
        const hoursExpired = Math.floor(timeExpired / (1000 * 60 * 60));
        const minutesExpired = Math.floor((timeExpired % (1000 * 60 * 60)) / (1000 * 60));
        
        // Check if this is a Dexcom sensor (has 12-hour grace period)
        const isDexcom = true; // Assume Dexcom for now, could be enhanced with sensor model info
        
        if (isDexcom && hoursExpired < 12) {
          // Still in grace period
          const graceHoursLeft = 11 - hoursExpired;
          const graceMinutesLeft = 60 - minutesExpired;
          
          if (graceHoursLeft === 0 && graceMinutesLeft <= 0) {
            return 'Grace Period ending';
          } else if (graceHoursLeft === 0) {
            return `${graceMinutesLeft} min Grace Period left`;
          } else if (graceMinutesLeft === 60) {
            return `${graceHoursLeft + 1}h Grace Period left`;
          } else {
            return `${graceHoursLeft}h ${graceMinutesLeft}m Grace Period left`;
          }
        }
      }
      
      // Show precise time when less than 24 hours remain (and not expired)
      if (hoursLeft < 24 && hoursLeft >= 0) {
        if (hoursLeft === 0) {
          if (minutesLeft <= 0) {
            return 'Expiring now';
          } else if (minutesLeft === 1) {
            return '1 minute left';
          } else {
            return `${minutesLeft} minutes left`;
          }
        } else if (hoursLeft === 1) {
          if (minutesLeft === 0) {
            return '1 hour left';
          } else if (minutesLeft === 1) {
            return '1 hour, 1 minute left';
          } else {
            return `1 hour, ${minutesLeft} minutes left`;
          }
        } else {
          if (minutesLeft === 0) {
            return `${hoursLeft} hours left`;
          } else if (minutesLeft === 1) {
            return `${hoursLeft} hours, 1 minute left`;
          } else {
            return `${hoursLeft} hours, ${minutesLeft} minutes left`;
          }
        }
      }
    }
    
    // Fall back to day-based display for longer periods only
    if (daysLeft === 1) {
      return '1 day left';
    } else if (daysLeft < 30) {
      return `${daysLeft} days left`;
    } else {
      return '30+ days left';
    }
  };

  // Process sensors and categorize them
  const processedSensors = sensors.map((sensor) => {
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

    return {
      ...sensor,
      sensorModel,
      sensorExpInfo,
      isActiveAndHealthy: !sensorExpInfo.isExpired && !sensor.is_problematic
    };
  });

  // Separate active sensors from expired/problematic ones
  const activeSensors = processedSensors
    .filter(sensor => sensor.isActiveAndHealthy)
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());

  const expiredOrProblematicSensors = processedSensors
    .filter(sensor => !sensor.isActiveAndHealthy)
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());

  // Get the most recent active sensor (current sensor)
  const currentSensor = activeSensors[0];

  const renderSensorCard = (sensor: typeof processedSensors[0]) => {
    const getStatusColor = () => {
      if (sensor.is_problematic) return 'bg-red-400';
      if (sensor.sensorExpInfo.isExpired) return 'bg-gray-400';
      if (sensor.sensorExpInfo.expirationStatus === 'critical') return 'bg-red-500';
      if (sensor.sensorExpInfo.expirationStatus === 'warning') return 'bg-yellow-400';
      return 'bg-green-400';
    };
    
    const getCardStyle = () => {
      if (sensor.sensorExpInfo.isExpired) return 'block p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors';
      if (sensor.sensorExpInfo.expirationStatus === 'critical') return 'block p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors';
      if (sensor.sensorExpInfo.expirationStatus === 'warning') return 'block p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors';
      return 'block p-4 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors';
    };

    return (
      <Link
        key={sensor.id}
        href={`/dashboard/sensors/${sensor.id}`}
        className={getCardStyle()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} />
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{sensor.serial_number}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {sensor.sensorModel.manufacturer} {sensor.sensorModel.modelName}
                {sensor.lot_number && ` • Lot: ${sensor.lot_number}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Added {dateFormatter.formatDate(sensor.date_added)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {formatDaysLeftLocal(sensor.sensorExpInfo.daysLeft, sensor.sensorExpInfo)}
            </p>
            <div className="flex items-center justify-end space-x-1">
              {sensor.is_problematic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  Issue
                </span>
              )}
              {sensor.sensorExpInfo.isExpired && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300">
                  Expired
                </span>
              )}
              {sensor.sensorExpInfo.expirationStatus === 'critical' && !sensor.sensorExpInfo.isExpired && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  Critical
                </span>
              )}
              {sensor.sensorExpInfo.expirationStatus === 'warning' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                  Expiring
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Active Sensor Section */}
      {currentSensor && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Current Sensor</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Your active CGM sensor</p>
              </div>
            </div>
            {onRefresh && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                className={`p-2 rounded-lg transition-colors ${
                  isRefreshing 
                    ? 'bg-gray-50 dark:bg-slate-800 cursor-not-allowed' 
                    : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                title={isRefreshing ? "Refreshing..." : "Refresh"}
              >
                <svg 
                  className={`w-4 h-4 text-gray-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <Link
              href={`/dashboard/sensors/${currentSensor.id}`}
              className="block hover:bg-green-100/50 dark:hover:bg-green-800/20 rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{currentSensor.serial_number}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {currentSensor.sensorModel.manufacturer} {currentSensor.sensorModel.modelName}
                      {currentSensor.lot_number && ` • Lot: ${currentSensor.lot_number}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Added {dateFormatter.formatDate(currentSensor.date_added)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {formatDaysLeftLocal(currentSensor.sensorExpInfo.daysLeft, currentSensor.sensorExpInfo)}
                  </p>
                  <div className="flex items-center justify-end space-x-1 mt-2">
                    {currentSensor.sensorExpInfo.expirationStatus === 'warning' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                        Expiring Soon
                      </span>
                    )}
                    {currentSensor.sensorExpInfo.expirationStatus === 'normal' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Sensors Section (Expired/Problematic) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Sensors</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Previous and problematic sensors</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!currentSensor && onRefresh && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                className={`p-2 rounded-lg transition-colors ${
                  isRefreshing 
                    ? 'bg-gray-50 dark:bg-slate-800 cursor-not-allowed' 
                    : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                title={isRefreshing ? "Refreshing..." : "Refresh"}
              >
                <svg 
                  className={`w-4 h-4 text-gray-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <Link href="/dashboard/sensors" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              View All
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
        ) : expiredOrProblematicSensors.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">All sensors are healthy!</p>
            <p className="text-xs text-gray-400 mt-1">No expired or problematic sensors</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expiredOrProblematicSensors.slice(0, 5).map(renderSensorCard)}
            {expiredOrProblematicSensors.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/sensors" className="text-sm text-blue-600 hover:text-blue-500">
                  View {expiredOrProblematicSensors.length - 5} more
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}