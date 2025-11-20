/**
 * Sensor expiration calculation utilities
 */

// Predefined sensor models
export const SENSOR_MODELS: SensorModel[] = [
  {
    id: 'dexcom-g6',
    manufacturer: 'Dexcom',
    modelName: 'G6',
    duration_days: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dexcom-g7',
    manufacturer: 'Dexcom',
    modelName: 'G7',
    duration_days: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'freestyle-libre',
    manufacturer: 'Abbott',
    modelName: 'FreeStyle Libre',
    duration_days: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export interface SensorModel {
  id: string;
  manufacturer: string;
  modelName: string;
  duration_days: number; // Match database column name
  grace_period_hours?: number; // Optional grace period in hours
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorExpirationInfo {
  daysLeft: number;
  expirationDate: Date;
  expirationStatus: 'normal' | 'warning' | 'critical';
  isExpired: boolean;
  isExpiringSoon: boolean;
  gracePeriodHours: number;
  inGracePeriod: boolean;
}

/**
 * Calculate sensor expiration information
 */
export const getSensorExpirationInfo = (
  dateAdded: Date | string,
  sensorModel: SensorModel
): SensorExpirationInfo => {
  // Handle both Date objects and date strings
  const startDate = typeof dateAdded === 'string' ? new Date(dateAdded) : new Date(dateAdded);
  
  // Check if the date is valid
  if (isNaN(startDate.getTime())) {
    console.error('Invalid date provided to getSensorExpirationInfo:', dateAdded);
    // Return a fallback that indicates the sensor is expired
    return {
      daysLeft: 0,
      expirationDate: new Date(),
      expirationStatus: 'critical',
      isExpired: true,
      isExpiringSoon: false,
      gracePeriodHours: 0,
      inGracePeriod: false,
    };
  }

  // Expiration date is exactly duration_days after startDate (not including start day)
  const expirationDate = new Date(startDate);
  expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);

  const now = new Date();
  // Calculate days left as whole days remaining (floor, not ceil)
  const timeLeft = expirationDate.getTime() - now.getTime();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  // Get grace period from sensor model (default to 12 hours for Dexcom, 0 for others)
  const gracePeriodHours = sensorModel.grace_period_hours ?? (
    sensorModel.duration_days === 10 || 
    sensorModel.manufacturer?.toLowerCase().includes('dexcom') ||
    sensorModel.modelName?.toLowerCase().includes('g6') ||
    sensorModel.modelName?.toLowerCase().includes('g7')
      ? 12
      : 0
  );

  // Calculate expiration with grace period
  const expirationWithGrace = new Date(expirationDate);
  expirationWithGrace.setHours(expirationWithGrace.getHours() + gracePeriodHours);
  const timeLeftWithGrace = expirationWithGrace.getTime() - now.getTime();
  
  // Sensor is only truly expired after grace period ends
  let isExpired = timeLeftWithGrace < 0;

  const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
  const inGracePeriod = timeLeft < 0 && !isExpired && gracePeriodHours > 0;

  let expirationStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (isExpired) {
    expirationStatus = 'critical';
  } else if (inGracePeriod) {
    // In grace period - show as critical but not expired
    expirationStatus = 'critical';
  } else if (hoursLeft <= 24) {
    expirationStatus = 'critical';
  } else if (daysLeft <= 3) {
    expirationStatus = 'warning';
  }

  return {
    daysLeft,
    expirationDate,
    expirationStatus,
    isExpired,
    isExpiringSoon,
    gracePeriodHours,
    inGracePeriod,
  };
};

/**
 * Format days left into a human-readable string
 */
export const formatDaysLeft = (daysLeft: number, expirationInfo?: SensorExpirationInfo): string => {
  // If we have expiration info and the sensor is expired, show the actual expiration date
  if (expirationInfo && expirationInfo.isExpired) {
    const expiredDate = expirationInfo.expirationDate;
    const now = new Date();
    const daysSinceExpired = Math.floor((now.getTime() - expiredDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format the expiration date
    const expiredDateFormatted = expiredDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: expiredDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    
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
    
    // Handle sensors in grace period
    if (expirationInfo.inGracePeriod && expirationInfo.gracePeriodHours > 0) {
      // Calculate time elapsed since expiration
      const timeExpired = Math.abs(timeLeft);
      const hoursExpired = Math.floor(timeExpired / (1000 * 60 * 60));
      const minutesExpired = Math.floor((timeExpired % (1000 * 60 * 60)) / (1000 * 60));
      
      // Calculate grace period time remaining
      const graceHoursLeft = expirationInfo.gracePeriodHours - hoursExpired - 1;
      const graceMinutesLeft = 60 - minutesExpired;
      
      // Adjust if minutes roll over to next hour
      const finalHoursLeft = graceMinutesLeft === 60 ? graceHoursLeft + 1 : graceHoursLeft;
      const finalMinutesLeft = graceMinutesLeft === 60 ? 0 : graceMinutesLeft;
      
      if (finalHoursLeft <= 0 && finalMinutesLeft <= 0) {
        return 'Grace period ending';
      } else if (finalHoursLeft === 0) {
        return finalMinutesLeft === 1 
          ? '1 min grace period' 
          : `${finalMinutesLeft} min grace period`;
      } else if (finalHoursLeft === 1) {
        return finalMinutesLeft === 0
          ? '1h grace period'
          : `1h ${finalMinutesLeft}m grace period`;
      } else {
        return finalMinutesLeft === 0
          ? `${finalHoursLeft}h grace period`
          : `${finalHoursLeft}h ${finalMinutesLeft}m grace period`;
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
  
  // Always show days for durations under 14 days
  if (daysLeft === 1) {
    return '1 day left';
  } else if (daysLeft < 14) {
    return `${daysLeft} days left`;
  } else if (daysLeft < 30) {
    const weeks = Math.floor(daysLeft / 7);
    const remainingDays = daysLeft % 7;
    if (weeks === 1 && remainingDays === 0) {
      return '1 week left';
    } else if (weeks === 1) {
      return `1 week, ${remainingDays} days left`;
    } else if (remainingDays === 0) {
      return `${weeks} weeks left`;
    } else {
      return `${weeks} weeks, ${remainingDays} days left`;
    }
  } else {
    const months = Math.floor(daysLeft / 30);
    if (months === 1) {
      return '1 month left';
    } else {
      return `${months} months left`;
    }
  }
};

/**
 * Get sensor model based on serial number
 */
export const getSensorModelFromSerial = (serialNumber: string): SensorModel | null => {
  // Dexcom serial numbers typically start with 4, 5, 6, 7, 8, or 9 and are 10-11 digits
  if (/^[456789]\d{9,10}$/.test(serialNumber)) {
    // Assume G6 for now, but could be enhanced to detect G7
    return SENSOR_MODELS.find(model => model.id === 'dexcom-g6') || null;
  }
  
  // FreeStyle Libre serial numbers are typically 8-10 characters with letters and numbers
  if (/^[A-Za-z0-9]{8,10}$/.test(serialNumber)) {
    return SENSOR_MODELS.find(model => model.id === 'freestyle-libre') || null;
  }
  
  return null;
};