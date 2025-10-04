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
    };
  }

  const expirationDate = new Date(startDate);
  expirationDate.setDate(expirationDate.getDate() + sensorModel.duration_days);

  const now = new Date();
  const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;

  let expirationStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (isExpired) {
    expirationStatus = 'critical';
  } else if (daysLeft <= 1) {
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
  
  if (daysLeft === 0) {
    return 'Expires today';
  } else if (daysLeft === 1) {
    return '1 day left';
  } else if (daysLeft < 7) {
    return `${daysLeft} days left`;
  } else if (daysLeft < 30) {
    const weeks = Math.floor(daysLeft / 7);
    const remainingDays = daysLeft % 7;
    if (weeks === 1 && remainingDays === 0) {
      return '1 week left';
    } else if (weeks === 1) {
      return `1 week, ${remainingDays} days left`;
    } else {
      return `${weeks} weeks left`;
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