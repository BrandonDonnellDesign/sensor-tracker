/**
 * Pump Data Writer Service
 * Writes pump data directly to the appropriate pump tables
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface PumpDataInput {
  user_id: string;
  timestamp: string;
  units: number;
  insulin_type: string;
  insulin_name?: string;
  delivery_type: string;
  meal_relation?: string;
  injection_site?: string;
  blood_glucose_before?: number;
  blood_glucose_after?: number;
  notes?: string;
  mood?: string;
  activity_level?: string;
  logged_via: string;
  carbs?: number;
  carb_ratio?: string;
}

/**
 * Determine bolus type from delivery type and meal relation
 */
function determineBolusType(data: PumpDataInput): 'meal' | 'correction' | 'auto_correction' | 'extended' {
  if (data.delivery_type === 'correction') return 'correction';
  if (data.meal_relation && ['before_meal', 'with_meal', 'after_meal'].includes(data.meal_relation)) {
    return 'meal';
  }
  if (data.delivery_type === 'meal') return 'meal';
  return 'meal'; // Default
}

/**
 * Build metadata object from pump data
 */
function buildMetadata(data: PumpDataInput): Record<string, any> {
  return {
    insulin_type: data.insulin_type,
    insulin_name: data.insulin_name,
    meal_relation: data.meal_relation,
    injection_site: data.injection_site,
    blood_glucose_before: data.blood_glucose_before,
    blood_glucose_after: data.blood_glucose_after,
    notes: data.notes,
    mood: data.mood,
    activity_level: data.activity_level,
    logged_via: data.logged_via,
    carbs: data.carbs,
    carb_ratio: data.carb_ratio,
  };
}

/**
 * Write pump bolus data to pump_bolus_events and pump_delivery_logs
 */
export async function writePumpBolus(
  supabase: SupabaseClient,
  data: PumpDataInput
): Promise<{ success: boolean; error?: any }> {
  try {
    // Write to pump_bolus_events
    const { error: bolusError } = await supabase
      .from('pump_bolus_events')
      .insert({
        user_id: data.user_id,
        timestamp: data.timestamp,
        units: data.units,
        bolus_type: determineBolusType(data),
        metadata: buildMetadata(data),
      });

    if (bolusError) {
      console.error('Error writing to pump_bolus_events:', bolusError);
      return { success: false, error: bolusError };
    }

    // Write to pump_delivery_logs (unified log)
    const { error: deliveryError } = await supabase
      .from('pump_delivery_logs')
      .insert({
        user_id: data.user_id,
        timestamp: data.timestamp,
        amount: data.units,
        delivery_type: 'bolus',
        metadata: buildMetadata(data),
      });

    if (deliveryError) {
      console.error('Error writing to pump_delivery_logs:', deliveryError);
      return { success: false, error: deliveryError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in writePumpBolus:', error);
    return { success: false, error };
  }
}

/**
 * Write pump basal data to pump_basal_events and pump_delivery_logs
 */
export async function writePumpBasal(
  supabase: SupabaseClient,
  data: PumpDataInput,
  durationMinutes: number = 1440 // Default to 24 hours for daily totals
): Promise<{ success: boolean; error?: any }> {
  try {
    // Write to pump_basal_events
    const { error: basalError } = await supabase
      .from('pump_basal_events')
      .insert({
        user_id: data.user_id,
        timestamp: data.timestamp,
        basal_rate: data.units,
        duration_minutes: durationMinutes,
        basal_type: 'scheduled',
        metadata: {
          ...buildMetadata(data),
          is_daily_total: durationMinutes === 1440,
        },
      });

    if (basalError) {
      console.error('Error writing to pump_basal_events:', basalError);
      return { success: false, error: basalError };
    }

    // Write to pump_delivery_logs (unified log)
    const { error: deliveryError } = await supabase
      .from('pump_delivery_logs')
      .insert({
        user_id: data.user_id,
        timestamp: data.timestamp,
        amount: data.units,
        delivery_type: 'basal',
        metadata: {
          ...buildMetadata(data),
          duration_minutes: durationMinutes,
        },
      });

    if (deliveryError) {
      console.error('Error writing to pump_delivery_logs:', deliveryError);
      return { success: false, error: deliveryError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in writePumpBasal:', error);
    return { success: false, error };
  }
}

/**
 * Write pump data to appropriate tables based on delivery type
 */
export async function writePumpData(
  supabase: SupabaseClient,
  data: PumpDataInput
): Promise<{ success: boolean; error?: any }> {
  const isBolus = ['bolus', 'meal', 'correction'].includes(data.delivery_type);
  const isBasal = data.delivery_type === 'basal';

  if (isBolus) {
    return writePumpBolus(supabase, data);
  } else if (isBasal) {
    return writePumpBasal(supabase, data);
  } else {
    // Unknown delivery type, default to bolus
    console.warn(`Unknown delivery type: ${data.delivery_type}, defaulting to bolus`);
    return writePumpBolus(supabase, data);
  }
}

/**
 * Check for duplicate pump data before writing
 */
export async function checkPumpDuplicate(
  supabase: SupabaseClient,
  userId: string,
  timestamp: string,
  units: number,
  deliveryType: string
): Promise<boolean> {
  const timeWindow = 60000; // 1 minute window
  const timestampDate = new Date(timestamp);
  const startTime = new Date(timestampDate.getTime() - timeWindow);
  const endTime = new Date(timestampDate.getTime() + timeWindow);

  const { data, error } = await supabase
    .from('pump_delivery_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('delivery_type', deliveryType === 'basal' ? 'basal' : 'bolus')
    .gte('timestamp', startTime.toISOString())
    .lte('timestamp', endTime.toISOString())
    .eq('amount', units)
    .limit(1);

  if (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }

  return (data && data.length > 0) || false;
}
