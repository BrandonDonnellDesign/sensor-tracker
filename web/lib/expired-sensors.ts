import { supabase } from '@/lib/supabase';

/**
 * Manually tags expired sensors by checking their expiration dates
 * This is a client-side implementation since RPC might not be available
 */
export async function checkAndTagExpiredSensors(): Promise<{
  success: boolean;
  expiredCount: number;
  error?: string;
}> {
  try {
    // Get the "Expired" tag ID
    const expiredTagId = await getExpiredTagId();
    if (!expiredTagId) {
      return {
        success: false,
        expiredCount: 0,
        error: 'Expired tag not found'
      };
    }

    // Get untagged expired sensors
    const { sensors: expiredSensors } = await getUntaggedExpiredSensors();
    
    // Tag each expired sensor
    let taggedCount = 0;
    for (const sensor of expiredSensors) {
      const { error } = await supabase
        .from('sensor_tags')
        .insert({
          sensor_id: sensor.id,
          tag_id: expiredTagId
        });
        
      if (!error) {
        taggedCount++;
      }
    }

    return {
      success: true,
      expiredCount: taggedCount
    };
  } catch (error) {
    console.error('Unexpected error in checkAndTagExpiredSensors:', error);
    return {
      success: false,
      expiredCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to get the "Expired" tag ID
 */
async function getExpiredTagId(): Promise<string | null> {
  const { data: expiredTag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', 'Expired')
    .eq('category', 'lifecycle')
    .single();
    
  return expiredTag?.id || null;
}

/**
 * Gets all sensors that should be expired based on their model duration
 * but don't have the expired tag yet
 */
export async function getUntaggedExpiredSensors(): Promise<{
  success: boolean;
  sensors: Array<{
    id: string;
    date_added: string;
    duration_days: number;
  }>;
  error?: string;
}> {
  try {
    const expiredTagId = await getExpiredTagId();
    if (!expiredTagId) {
      throw new Error('Expired tag not found');
    }

    // Get sensors with their model information, excluding those already tagged as expired
    const { data: sensors, error } = await supabase
      .from('sensors')
      .select(`
        id,
        date_added,
        sensorModel:sensor_models (
          duration_days
        )
      `)
      .eq('is_deleted', false);

    if (error) {
      throw error;
    }

    // Get sensors that already have the expired tag
    const { data: taggedSensors } = await supabase
      .from('sensor_tags')
      .select('sensor_id')
      .eq('tag_id', expiredTagId);

    const taggedSensorIds = new Set(taggedSensors?.map(ts => ts.sensor_id) || []);

    // Filter sensors that are actually expired and not already tagged
    const now = new Date();
    const expiredSensors = sensors?.filter(sensor => {
      // Skip if already tagged as expired
      if (taggedSensorIds.has(sensor.id)) return false;
      
      const sensorModel = sensor.sensorModel as any;
      if (!sensorModel?.duration_days) return false;
      
      const addedDate = new Date(sensor.date_added);
      const expiryDate = new Date(addedDate.getTime() + (sensorModel.duration_days * 24 * 60 * 60 * 1000));
      
      return expiryDate < now;
    }).map(sensor => ({
      id: sensor.id,
      date_added: sensor.date_added,
      duration_days: (sensor.sensorModel as any).duration_days
    })) || [];

    return {
      success: true,
      sensors: expiredSensors
    };
  } catch (error) {
    console.error('Error getting untagged expired sensors:', error);
    return {
      success: false,
      sensors: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}