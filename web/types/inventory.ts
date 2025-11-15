export interface SensorInventory {
  id: string;
  user_id: string;
  sensor_model_id: string | null;
  quantity: number;
  location?: string | null;
  notes?: string | null;
  last_updated: string;
  created_at: string;
  updated_at: string;
  sensorModel?: {
    id: string;
    model_name: string;
    manufacturer: string;
    duration_days: number;
  };
}

export interface SensorOrder {
  id: string;
  user_id: string;
  sensor_model_id: string | null;
  quantity: number;
  order_date: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status: 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  supplier?: string | null;
  order_number?: string | null;
  cost?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  sensorModel?: {
    id: string;
    model_name: string;
    manufacturer: string;
  };
}

export interface InventoryAlert {
  id: string;
  user_id: string;
  sensor_model_id: string;
  low_stock_threshold: number;
  reorder_threshold: number;
  alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStats {
  totalQuantity: number;
  usageRate: number; // sensors per month
  daysUntilEmpty: number;
  recommendedReorderDate: string;
  lowStock: boolean;
  byModel: Array<{
    modelId: string;
    modelName: string;
    quantity: number;
    usageRate: number;
  }>;
}
