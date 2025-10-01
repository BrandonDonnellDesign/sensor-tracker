export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sensor_photos: {
        Row: {
          id: string
          sensor_id: string
          file_path: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          sensor_id: string
          file_path: string
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          sensor_id?: string
          file_path?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_photos_sensor_id_fkey"
            columns: ["sensor_id"]
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_photos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      photos: {
        Row: {
          created_at: string
          date_added: string
          file_name: string
          file_size: number
          id: string
          is_deleted: boolean
          mime_type: string
          sensor_id: string
          storage_path: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_added: string
          file_name: string
          file_size: number
          id?: string
          is_deleted?: boolean
          mime_type: string
          sensor_id: string
          storage_path?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_added?: string
          file_name?: string
          file_size?: number
          id?: string
          is_deleted?: boolean
          mime_type?: string
          sensor_id?: string
          storage_path?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          timezone: string | null
          avatar_url: string | null
          notifications_enabled: boolean
          dark_mode_enabled: boolean
          glucose_unit: 'mg/dL' | 'mmol/L'
          created_at: string
          updated_at: string
          last_sync_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          timezone?: string | null
          avatar_url?: string | null
          notifications_enabled?: boolean
          dark_mode_enabled?: boolean
          glucose_unit?: 'mg/dL' | 'mmol/L'
          created_at?: string
          updated_at?: string
          last_sync_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          timezone?: string | null
          avatar_url?: string | null
          notifications_enabled?: boolean
          dark_mode_enabled?: boolean
          glucose_unit?: 'mg/dL' | 'mmol/L'
          created_at?: string
          updated_at?: string
          last_sync_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sensors: {
        Row: {
          created_at: string
          date_added: string
          id: string
          is_deleted: boolean
          is_problematic: boolean
          issue_notes: string | null
          lot_number: string | null
          sensor_type: "dexcom" | "freestyle"
          serial_number: string
          synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_added: string
          id?: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          sensor_type?: "dexcom" | "freestyle"
          serial_number: string
          synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_added?: string
          id?: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          sensor_type?: "dexcom" | "freestyle"
          serial_number?: string
          synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sensor_type: "dexcom" | "freestyle"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}