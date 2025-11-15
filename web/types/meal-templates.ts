export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other' | null;
  total_carbs: number;
  total_calories?: number | null;
  total_protein?: number | null;
  total_fat?: number | null;
  is_favorite: boolean;
  use_count: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: MealTemplateItem[];
}

export interface MealTemplateItem {
  id: string;
  meal_template_id: string;
  food_item_id?: string | null;
  product_name: string;
  serving_size?: number | null;
  serving_unit?: string | null;
  carbs_g: number;
  calories?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateMealTemplateRequest {
  name: string;
  description?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  items: Array<{
    food_item_id?: string;
    product_name: string;
    serving_size?: number;
    serving_unit?: string;
    carbs_g: number;
    calories?: number;
    protein_g?: number;
    fat_g?: number;
    notes?: string;
  }>;
}
