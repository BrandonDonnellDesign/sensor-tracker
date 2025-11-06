// Insulin logging service
import { createClient } from '@/lib/supabase-client';

export interface InsulinType {
  id: string;
  user_id: string;
  name: string;
  type: 'rapid' | 'short' | 'intermediate' | 'long' | 'ultra_long' | 'premixed';
  brand?: string;
  onset_minutes?: number;
  peak_minutes?: number;
  duration_minutes?: number;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsulinDose {
  id: string;
  user_id: string;
  insulin_type_id: string;
  units: number;
  dose_type?: 'bolus' | 'basal' | 'correction' | 'mixed';
  injection_site?: 'abdomen' | 'arm' | 'thigh' | 'buttocks' | 'other';
  dosed_at: string;
  notes?: string;
  cgm_reading_at_dose?: number;
  cgm_trend_at_dose?: string;
  created_at: string;
  updated_at: string;
}

export interface InsulinDoseWithContext extends InsulinDose {
  insulin_name: string;
  insulin_type: string;
  insulin_brand?: string;
  onset_minutes?: number;
  peak_minutes?: number;
  duration_minutes?: number;
  cgm_at_peak?: number;
}

export interface FoodLogWithCGM {
  id: string;
  user_id: string;
  food_item_id?: string;
  custom_food_name?: string;
  serving_size: number;
  serving_unit: string;
  total_carbs_g?: number;
  total_calories?: number;
  meal_type?: string;
  logged_at: string;
  notes?: string;
  cgm_reading_at_meal?: number;
  cgm_trend_at_meal?: string;
  product_name?: string;
  brand?: string;
  cgm_1hr_post_meal?: number;
  cgm_2hr_post_meal?: number;
}

// ============================================================================
// INSULIN TYPES
// ============================================================================

export async function getInsulinTypes(userId: string): Promise<InsulinType[]> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('insulin_types')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createInsulinType(insulinType: Omit<InsulinType, 'id' | 'created_at' | 'updated_at'>): Promise<InsulinType> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('insulin_types')
    .insert(insulinType)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateInsulinType(id: string, updates: Partial<InsulinType>): Promise<InsulinType> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('insulin_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteInsulinType(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await (supabase as any)
    .from('insulin_types')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// INSULIN DOSES
// ============================================================================

export async function getInsulinDoses(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  const supabase = createClient();
  
  let query = (supabase as any)
    .from('insulin_logs')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });
  
  if (startDate) {
    query = query.gte('taken_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('taken_at', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function logInsulinDose(dose: Omit<InsulinDose, 'id' | 'created_at' | 'updated_at' | 'cgm_reading_at_dose' | 'cgm_trend_at_dose'>): Promise<InsulinDose> {
  const supabase = createClient();
  
  // CGM reading will be auto-populated by trigger
  const { data, error } = await (supabase as any)
    .from('insulin_doses')
    .insert(dose)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateInsulinDose(id: string, updates: Partial<InsulinDose>): Promise<InsulinDose> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('insulin_doses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteInsulinDose(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await (supabase as any)
    .from('insulin_doses')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// FOOD LOGS WITH CGM
// ============================================================================

export async function getFoodLogsWithCGM(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FoodLogWithCGM[]> {
  const supabase = createClient();
  
  let query = (supabase as any)
    .from('food_logs_with_cgm')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
  
  if (startDate) {
    query = query.gte('logged_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('logged_at', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

// ============================================================================
// COMBINED TIMELINE
// ============================================================================

export interface TimelineEvent {
  id: string;
  type: 'meal' | 'insulin' | 'glucose';
  timestamp: string;
  data: any;
}

export async function getTimelineEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimelineEvent[]> {
  const supabase = createClient();
  
  // Get all events in parallel
  const [foodLogs, insulinDoses, glucoseReadings] = await Promise.all([
    getFoodLogsWithCGM(userId, startDate, endDate),
    getInsulinDoses(userId, startDate, endDate),
    (supabase as any)
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('system_time', startDate.toISOString())
      .lte('system_time', endDate.toISOString())
      .order('system_time', { ascending: false })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) throw error;
        return data || [];
      })
  ]);
  
  // Combine into timeline
  const events: TimelineEvent[] = [
    ...foodLogs.map(log => ({
      id: log.id,
      type: 'meal' as const,
      timestamp: log.logged_at,
      data: log
    })),
    ...insulinDoses.map(dose => ({
      id: dose.id,
      type: 'insulin' as const,
      timestamp: dose.dosed_at,
      data: dose
    })),
    ...glucoseReadings.map((reading: any) => ({
      id: reading.id,
      type: 'glucose' as const,
      timestamp: reading.system_time,
      data: reading
    }))
  ];
  
  // Sort by timestamp
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return events;
}

// ============================================================================
// CGM BACKFILL
// ============================================================================

export async function backfillCGMReadings(
  userId: string,
  lookbackHours: number = 2
): Promise<{ meals_updated: number; insulin_updated: number }> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .rpc('backfill_cgm_readings', {
      p_user_id: userId,
      p_lookback_hours: lookbackHours
    });
  
  if (error) throw error;
  return data || { meals_updated: 0, insulin_updated: 0 };
}

// ============================================================================
// COMMON INSULIN TYPES (for seeding user data)
// ============================================================================

export const COMMON_INSULIN_TYPES = [
  {
    name: 'Humalog',
    type: 'rapid' as const,
    brand: 'Eli Lilly',
    onset_minutes: 15,
    peak_minutes: 60,
    duration_minutes: 240,
    color: '#FF6B6B'
  },
  {
    name: 'Novolog',
    type: 'rapid' as const,
    brand: 'Novo Nordisk',
    onset_minutes: 15,
    peak_minutes: 60,
    duration_minutes: 240,
    color: '#4ECDC4'
  },
  {
    name: 'Apidra',
    type: 'rapid' as const,
    brand: 'Sanofi',
    onset_minutes: 15,
    peak_minutes: 60,
    duration_minutes: 240,
    color: '#95E1D3'
  },
  {
    name: 'Lantus',
    type: 'long' as const,
    brand: 'Sanofi',
    onset_minutes: 90,
    peak_minutes: null,
    duration_minutes: 1440,
    color: '#A8E6CF'
  },
  {
    name: 'Levemir',
    type: 'long' as const,
    brand: 'Novo Nordisk',
    onset_minutes: 90,
    peak_minutes: null,
    duration_minutes: 1440,
    color: '#FFD3B6'
  },
  {
    name: 'Tresiba',
    type: 'ultra_long' as const,
    brand: 'Novo Nordisk',
    onset_minutes: 60,
    peak_minutes: null,
    duration_minutes: 2520,
    color: '#FFAAA5'
  }
];
