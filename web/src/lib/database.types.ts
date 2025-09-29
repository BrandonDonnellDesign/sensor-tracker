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
          created_at: string
          email: string
          id: string
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_sync_at?: string | null
          updated_at?: string
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