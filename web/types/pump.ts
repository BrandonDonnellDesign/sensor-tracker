export interface PumpBolusEvent {
  id: string;
  user_id: string;
  timestamp: string;
  units: number;
  bolus_type: 'meal' | 'correction' | 'auto_correction' | 'extended' | 'combo';
  insulin_type?: string | null;
  extended_duration_minutes?: number | null;
  immediate_units?: number | null;
  extended_units?: number | null;
  carbs_g?: number | null;
  bg_input?: number | null;
  metadata?: any;
  source: string;
  created_at: string;
}

export interface PumpBasalEvent {
  id: string;
  user_id: string;
  timestamp: string;
  basal_rate: number; // Units per hour
  duration_minutes: number;
  basal_type: 'scheduled' | 'temp' | 'suspend' | 'resume' | 'auto_basal';
  insulin_type?: string | null;
  percent_of_basal?: number | null;
  metadata?: any;
  source: string;
  created_at: string;
}

export interface PumpStatusEvent {
  id: string;
  user_id: string;
  timestamp: string;
  status: 'pod_change' | 'alarm' | 'occlusion' | 'low_reservoir' | 'expired' | 'suspend' | 'resume';
  severity?: 'info' | 'warning' | 'critical' | null;
  alarm_code?: string | null;
  reservoir_remaining?: number | null;
  metadata?: any;
  source: string;
  created_at: string;
}

export interface PumpDeliveryLog {
  id: string;
  user_id: string;
  timestamp: string;
  amount: number;
  delivery_type: 'basal' | 'temp_basal' | 'auto_basal' | 'micro_bolus' | 'bolus';
  bolus_event_id?: string | null;
  basal_event_id?: string | null;
  metadata?: any;
  source: string;
  created_at: string;
}

export interface AllInsulinDelivery {
  id: string;
  user_id: string;
  timestamp: string;
  amount: number;
  delivery_type: string;
  insulin_type?: string | null;
  source: 'manual' | 'glooko_import' | 'pump_sync';
  notes?: string | null;
  created_at: string;
}

export interface GlookoImportData {
  boluses: PumpBolusEvent[];
  basals: PumpBasalEvent[];
  status_events: PumpStatusEvent[];
}
