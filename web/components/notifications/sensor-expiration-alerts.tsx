'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Bell, Calendar } from 'lucide-react';
import { getSensorExpirationInfo } from '@/utils/sensor-expiration';

interface SensorExpirationAlertsProps {
  sensors?: any[];
  className?: string;
}

interface ExpirationAlert {
  id: string;
  sensorId: string;
  serialNumber?: string;
  sensorModel: string;
  daysLeft: number;
  expirationDate: Date;
  alertType: '3_day' | '1_day' | 'day_of' | 'expired' | 'grace_period';
  graceTimeLeft?: string;
}

export default function SensorExpirationAlerts({ sensors = [], className = '' }: SensorExpirationAlertsProps) {
  const [alerts, setAlerts] = useState<ExpirationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    generateAlerts();
  }, [sensors]);

  const generateAlerts = () => {
    setLoading(true);
    
    const generatedAlerts: ExpirationAlert[] = [];
    
    sensors.forEach(sensor => {
      if (sensor.is_deleted || sensor.archived_at) return;
      
      const sensorModel = sensor.sensor_models || {
        manufacturer: 'Unknown',
        model_name: 'Sensor',
        duration_days: 14
      };
      
      const expirationInfo = getSensorExpirationInfo(sensor.date_added, {
        id: sensorModel.id || 'unknown',
        manufacturer: sensorModel.manufacturer,
        modelName: sensorModel.model_name,
        duration_days: sensorModel.duration_days,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Skip expired sensors if user has newer sensors (likely replacements)
      if (expirationInfo.isExpired) {
        const hasNewerSensors = sensors.some(otherSensor => {
          if (otherSensor.id === sensor.id || otherSensor.is_deleted || otherSensor.archived_at) return false;
          const otherDate = new Date(otherSensor.date_added);
          const thisExpiryDate = expirationInfo.expirationDate;
          // Check if there's a sensor added within 3 days of this sensor's expiration
          const timeDiff = Math.abs(otherDate.getTime() - thisExpiryDate.getTime());
          return timeDiff <= 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
        });
        
        if (hasNewerSensors) {
          return; // Skip this expired sensor as it was likely replaced
        }
      }
      
      // Determine alert type and grace period
      let alertType: ExpirationAlert['alertType'] = '3_day';
      let graceTimeLeft: string | undefined;
      
      if (expirationInfo.isExpired) {
        // Check if this is a Dexcom sensor with grace period
        const isDexcom = sensorModel.manufacturer?.toLowerCase().includes('dexcom') || 
                         sensorModel.model_name?.toLowerCase().includes('g6') ||
                         sensorModel.model_name?.toLowerCase().includes('g7');
        
        if (isDexcom) {
          const now = new Date();
          const hoursExpired = (now.getTime() - expirationInfo.expirationDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursExpired < 12) {
            // Still in grace period
            alertType = 'grace_period';
            const graceHoursLeft = Math.max(0, 12 - hoursExpired);
            const graceMinutesLeft = Math.max(0, (graceHoursLeft % 1) * 60);
            
            if (graceHoursLeft >= 1) {
              const hours = Math.floor(graceHoursLeft);
              const minutes = Math.floor(graceMinutesLeft);
              graceTimeLeft = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
            } else {
              const minutes = Math.floor(graceMinutesLeft);
              graceTimeLeft = `${minutes}m`;
            }
          } else {
            alertType = 'expired';
          }
        } else {
          alertType = 'expired';
        }
      } else if (expirationInfo.daysLeft === 0) {
        alertType = 'day_of';
      } else if (expirationInfo.daysLeft === 1) {
        alertType = '1_day';
      } else if (expirationInfo.daysLeft <= 3) {
        alertType = '3_day';
      } else {
        // No alert needed for sensors with more than 3 days left
        return;
      }
      
      generatedAlerts.push({
        id: sensor.id,
        sensorId: sensor.id,
        serialNumber: sensor.serial_number,
        sensorModel: `${sensorModel.manufacturer} ${sensorModel.model_name}`,
        daysLeft: expirationInfo.daysLeft,
        expirationDate: expirationInfo.expirationDate,
        alertType,
        ...(graceTimeLeft && { graceTimeLeft })
      });
    });
    
    // Sort by alert type priority (critical first) then by days left
    generatedAlerts.sort((a, b) => {
      const priorityOrder = { 
        expired: 5, 
        grace_period: 4,
        day_of: 3, 
        '1_day': 2, 
        '3_day': 1
      };
      const priorityDiff = priorityOrder[b.alertType] - priorityOrder[a.alertType];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysLeft - b.daysLeft;
    });
    
    setAlerts(generatedAlerts);
    setLoading(false);
  };

  const getAlertIcon = (alertType: ExpirationAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'grace_period':
        return <Clock className="w-5 h-5 text-red-400" />;
      case 'day_of':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case '1_day':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case '3_day':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      default:
        return <Calendar className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertColor = (alertType: ExpirationAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
      case 'day_of':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'grace_period':
        return 'border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-800/30';
      case '1_day':
        return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
      case '3_day':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const getAlertTitle = (alert: ExpirationAlert) => {
    switch (alert.alertType) {
      case 'expired':
        const daysExpired = Math.abs(alert.daysLeft);
        return `Sensor expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago`;
      case 'grace_period':
        return `Sensor has expired - ${alert.graceTimeLeft || '0m'} grace period left`;
      case 'day_of':
        return 'Sensor expires today';
      case '1_day':
        return 'Sensor expires tomorrow';
      case '3_day':
        return `Sensor expires in ${alert.daysLeft} day${alert.daysLeft === 1 ? '' : 's'}`;
      default:
        return 'Sensor expiration alert';
    }
  };

  const getAlertMessage = (alert: ExpirationAlert) => {
    const sensorInfo = alert.serialNumber 
      ? `${alert.sensorModel} (${alert.serialNumber})`
      : alert.sensorModel;
    
    switch (alert.alertType) {
      case 'expired':
        return `Your ${sensorInfo} needs immediate replacement to resume glucose monitoring.`;
      case 'grace_period':
        return `Your ${sensorInfo} has expired. Change your sensor as soon as possible. You are now in the 12-hour grace period with ${alert.graceTimeLeft || '0 minutes'} remaining.`;
      case 'day_of':
        return `Your ${sensorInfo} expires today at ${alert.expirationDate.toLocaleTimeString()}. Replace it as soon as possible.`;
      case '1_day':
        return `Your ${sensorInfo} expires tomorrow. Make sure you have a replacement ready.`;
      case '3_day':
        return `Your ${sensorInfo} will expire on ${alert.expirationDate.toLocaleDateString()}. Make sure you have a replacement ready.`;
      default:
        return `Please check your ${sensorInfo} expiration status.`;
    }
  };

  const getActionButton = (_alert: ExpirationAlert) => {
    // No action buttons - alerts are informational only
    return null;
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-slate-400">
              All sensors are within normal expiration timeframes
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 3);
  const hasMoreAlerts = alerts.length > 3;

  return (
    <div className={`space-y-3 ${className}`}>
      {displayedAlerts.map(alert => (
        <div
          key={alert.id}
          className={`p-4 border rounded-lg ${getAlertColor(alert.alertType)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getAlertIcon(alert.alertType)}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {getAlertTitle(alert)}
                </h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                  {getAlertMessage(alert)}
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                  Expires: {alert.expirationDate.toLocaleDateString()} at {alert.expirationDate.toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              {getActionButton(alert)}
            </div>
          </div>
        </div>
      ))}
      
      {hasMoreAlerts && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full p-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          {showAll ? 'Show Less' : `Show ${alerts.length - 3} More Alert${alerts.length - 3 === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  );
}