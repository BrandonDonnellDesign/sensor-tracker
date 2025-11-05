export interface MedicationType {
  name: string;
  category: string;
  description?: string;
  default_unit?: string;
}

export interface Medication {
  id: string;
  custom_name?: string;
  brand_name?: string;
  strength?: string;
  dosage_form?: string;
  prescriber?: string;
  pharmacy?: string;
  refill_date?: string;
  expiry_date?: string;
  storage_instructions?: string;
  notes?: string;
  medication_type?: MedicationType;
  created_at: string;
}

export interface MedicationLog {
  id: string;
  dosage_amount: number;
  dosage_unit: string;
  taken_at: string;
  meal_relation?: string;
  injection_site?: string;
  blood_glucose_before?: number;
  blood_glucose_after?: number;
  notes?: string;
  user_medication: Medication;
}