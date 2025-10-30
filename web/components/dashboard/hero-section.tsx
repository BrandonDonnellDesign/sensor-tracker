'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import {
  getSensorExpirationInfo,
  formatDaysLeft,
} from '@/utils/sensor-expiration';

import {
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

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

  const [_isHovered, _setIsHovered] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getCurrentSensorStatus = () => {
    if (!currentSensor) return null;

    const sensorModel = currentSensor.sensor_models
      ? {
          id: 'db-model',
          manufacturer: currentSensor.sensor_models.manufacturer,
          modelName: currentSensor.sensor_models.model_name,
          duration_days: currentSensor.sensor_models.duration_days,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : {
          id: 'fallback',
          manufacturer:
            (currentSensor as any).sensor_type === 'dexcom'
              ? 'Dexcom'
              : 'Abbott',
          modelName:
            (currentSensor as any).sensor_type === 'dexcom'
              ? 'G6'
              : 'FreeStyle Libre',
          duration_days:
            (currentSensor as any).sensor_type === 'dexcom' ? 10 : 14,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
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
      if (currentSensor.is_problematic)
        return <AlertTriangle className='w-5 h-5' />;
      if (expInfo.isExpired) return <Clock className='w-5 h-5' />;
      if (expInfo.expirationStatus === 'critical')
        return <AlertTriangle className='w-5 h-5' />;
      if (expInfo.expirationStatus === 'warning')
        return <Clock className='w-5 h-5' />;
      return <CheckCircle className='w-5 h-5' />;
    };

    const colorClasses = {
      green: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
      yellow: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      red: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
      gray: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
    };

    return {
      sensor: currentSensor,
      model: sensorModel,
      timeLeft: formatTimeLeft(),
      status: getStatusColor(),
      icon: getStatusIcon(),
      colorClass: colorClasses[getStatusColor() as keyof typeof colorClasses],
    };
  };

  const sensorStatus = getCurrentSensorStatus();

  return (
    <div className='mb-8'>
      {/* HEADER & SEARCH */}
      <header className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6'>
        <h1 className='text-3xl font-bold text-white mb-4 md:mb-0'>
          {getGreeting()}
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const query = formData.get('search') as string;
            if (query.trim()) {
              window.location.href = `/dashboard/search?q=${encodeURIComponent(query)}`;
            } else {
              window.location.href = '/dashboard/search';
            }
          }}
          className='w-full md:w-64'>
          <input
            type='search'
            name='search'
            placeholder='Search sensors (Alt+S)'
            className='w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          />
        </form>
      </header>

      {/* PRIMARY ACTIVE SENSOR CARD */}
      {sensorStatus ? (
        <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 md:p-8 mb-8 rounded-xl shadow-lg'>
          <div className='flex flex-col mb-4 lg:mb-0'>
            <span className='text-lg font-semibold'>
              {sensorStatus.model.manufacturer} {sensorStatus.model.modelName} -{' '}
              {sensorStatus.sensor.is_problematic
                ? 'Problematic'
                : sensorStatus.status === 'green'
                ? 'Active'
                : sensorStatus.status === 'yellow'
                ? 'Expiring Soon'
                : 'Expired'}
            </span>
            <span className='text-sm text-green-100 mb-3'>
              Started:{' '}
              {new Date(sensorStatus.sensor.date_added).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}
            </span>

            <div className='font-light text-sm opacity-90'>Time Remaining</div>
            <div className='flex items-baseline mt-1'>
              <span className='text-4xl md:text-5xl font-extrabold'>
                {Math.floor(
                  getSensorExpirationInfo(
                    new Date(sensorStatus.sensor.date_added),
                    sensorStatus.model
                  ).daysLeft
                )}
              </span>
              <span className='text-xl md:text-2xl font-bold ml-1 mr-4'>
                Days
              </span>
              <span className='text-2xl md:text-3xl font-extrabold'>
                {Math.floor(
                  (getSensorExpirationInfo(
                    new Date(sensorStatus.sensor.date_added),
                    sensorStatus.model
                  ).expirationDate.getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60)
                ) % 24}
              </span>
              <span className='text-lg md:text-xl font-bold ml-1'>Hrs</span>
            </div>

            {/* Visual Progress Bar */}
            <div className='w-full lg:w-96 bg-white/20 rounded-full h-2 mt-4'>
              <div
                className='bg-white h-full rounded-full transition-all duration-500'
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      (getSensorExpirationInfo(
                        new Date(sensorStatus.sensor.date_added),
                        sensorStatus.model
                      ).daysLeft /
                        sensorStatus.model.duration_days) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <Link
            href='/dashboard/sensors/new'
            className='bg-white text-green-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-full shadow-lg transition-colors'>
            Add New Sensor (Alt+N)
          </Link>
        </div>
      ) : (
        <div className='bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-slate-600'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
            </div>
            <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
              {totalSensors === 0 ? 'No sensors yet' : 'No active sensors'}
            </h3>
            <p className='text-gray-600 dark:text-gray-400 mb-4'>
              {totalSensors === 0
                ? 'Add your first sensor to start tracking'
                : 'Add a new sensor to continue tracking'}
            </p>
            <Link
              href='/dashboard/sensors/new'
              className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg'>
              <Plus className='w-5 h-5 mr-2' />
              Add Sensor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
