import { Database } from '@/lib/database.types';

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

// Profile type with all fields from database
export type Profile = Database['public']['Tables']['profiles']['Row'];