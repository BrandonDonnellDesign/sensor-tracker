'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import { getSensorExpirationInfo, formatDaysLeft } from '@/shared/src/utils/sensorExpiration';
import { useDateTimeFormatter } from '@/utils/date-formatter';
import { Plus, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

interface HeroSectionProps {
  currentSensor?: Sensor;
  totalSensors: number;
}

export function HeroSection({ currentSensor, totalSensors }: HeroSectionProps) {
  const { user } = useAuth();
  const dateFormatter = useDateTimeFormatter();
  const [isHovered, setIsHovered] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getCurrentSensorStatus = () => {
    if (!currentSensor) return null;

    const sensorModel = currentSensor.sensor_models ? {
      id: 'db-model',
      manufacturer: currentSensor.sensor_models.manufacturer,
      modelName: currentSensor.sensor_models.model_name,
      duration_days: currentSensor.sensor_models.duration_days,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } : {
      id: 'fallback',
      manufacturer: (currentSensor as any).sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
      modelName: (currentSensor as any).sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
      duration_days: (currentSensor as any).sensor_type === 'dexcom' ? 10 : 14,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const expInfo = getSensorExpirationInfo(
      new Date(currentSensor.date_added),
      sensorModel
    );

    const formatTimeLeft = () => {
      return formatDaysLeft(expInfo.daysLeft, expInfo);
    };

    const getStatusColor = () => {
      if (currentSensor.is_problematic) return 'red';
      if (expInfo.isExpired) return 'gray';
      if (expInfo.expirationStatus === 'critical') return 'red';
      if (expInfo.expirationStatus === 'warning') return 'yellow';
      return 'green';
    };

    const getStatusIcon = () => {
      if (currentSensor.is_problematic) return <AlertTriangle className="w-5 h-5" />;
      if (expInfo.isExpired) return <Clock className="w-5 h-5" />;
      if (expInfo.expirationStatus === 'critical') return <AlertTriangle className="w-5 h-5" />;
      if (expInfo.expirationStatus === 'warning') return <Clock className="w-5 h-5" />;
      return <CheckCircle className="w-5 h-5" />;
    };

    const colorClasses = {
      green: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
      yellow: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      red: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
      gray: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
    };

    return {
      sensor: currentSensor,
      model: sensorModel,
      timeLeft: formatTimeLeft(),
      status: getStatusColor(),
      icon: getStatusIcon(),
      colorClass: colorClasses[getStatusColor() as keyof typeof colorClasses]
    };
  };

  const sensorStatus = getCurrentSensorStatus();

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-4 lg:p-6 mb-6 border border-blue-100 dark:border-slate-700">
      <div className="space-y-4">
        {/* Greeting and Status */}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {getGreeting()}
          </h1>
          
          {sensorStatus ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your current sensor is {sensorStatus.status === 'green' ? 'working perfectly' : 
                sensorStatus.status === 'yellow' ? 'expiring soon' : 
                sensorStatus.status === 'red' ? 'needs attention' : 'expired'}
              </p>
              
              {/* Current Sensor Card - Compact */}
              <Link 
                href={`/dashboard/sensors/${sensorStatus.sensor.id}`}
                className="block"
              >
                <div className={`${sensorStatus.colorClass} rounded-xl p-4 transform hover:scale-[1.02] transition-all duration-200 shadow-md`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {sensorStatus.icon}
                      <div>
                        <h3 className="text-lg font-bold">
                          {sensorStatus.sensor.serial_number}
                        </h3>
                        <p className="text-sm opacity-90">
                          {sensorStatus.model.manufacturer} {sensorStatus.model.modelName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{sensorStatus.timeLeft}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {totalSensors === 0 
                  ? "Ready to start tracking your CGM sensors?" 
                  : "No active sensors found. Time to add a new one?"}
              </p>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {totalSensors === 0 ? "No sensors yet" : "No active sensors"}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Use Quick Actions to add your first sensor
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Bar - Compact */}
      {totalSensors > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-slate-600">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  {totalSensors} sensor{totalSensors !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  Updated now
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}