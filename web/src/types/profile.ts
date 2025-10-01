import { Database } from '@/lib/database.types';

export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type Profile = Database['public']['Tables']['profiles']['Row'];