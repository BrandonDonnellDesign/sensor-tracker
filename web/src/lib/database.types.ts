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
          push_notifications_enabled: boolean
          in_app_notifications_enabled: boolean
          warning_days_before: number
          critical_days_before: number
          date_format: string
          time_format: string
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
          push_notifications_enabled?: boolean
          in_app_notifications_enabled?: boolean
          warning_days_before?: number
          critical_days_before?: number
          date_format?: string
          time_format?: string
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
          push_notifications_enabled?: boolean
          in_app_notifications_enabled?: boolean
          warning_days_before?: number
          critical_days_before?: number
          date_format?: string
          time_format?: string
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
          archived_at: string | null
          created_at: string
          date_added: string
          dexcom_device_id: string | null
          dexcom_session_id: string | null
          dexcom_transmitter_id: string | null
          dexcom_last_sync: string | null
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
          archived_at?: string | null
          created_at?: string
          date_added: string
          dexcom_device_id?: string | null
          dexcom_session_id?: string | null
          dexcom_transmitter_id?: string | null
          dexcom_last_sync?: string | null
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
          archived_at?: string | null
          created_at?: string
          date_added?: string
          dexcom_device_id?: string | null
          dexcom_session_id?: string | null
          dexcom_transmitter_id?: string | null
          dexcom_last_sync?: string | null
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
      archived_sensors: {
        Row: {
          id: string
          user_id: string
          serial_number: string
          lot_number: string | null
          date_added: string
          is_problematic: boolean
          issue_notes: string | null
          sensor_type: string
          created_at: string
          updated_at: string
          synced_at: string | null
          is_deleted: boolean
          archived_at: string
          archived_reason: string
          original_expiry_date: string | null
          days_worn: number | null
          archived_by_user_id: string | null
          notes_at_archival: string | null
        }
        Insert: {
          id: string
          user_id: string
          serial_number: string
          lot_number?: string | null
          date_added: string
          is_problematic?: boolean
          issue_notes?: string | null
          sensor_type: string
          created_at: string
          updated_at: string
          synced_at?: string | null
          is_deleted?: boolean
          archived_at?: string
          archived_reason?: string
          original_expiry_date?: string | null
          days_worn?: number | null
          archived_by_user_id?: string | null
          notes_at_archival?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          serial_number?: string
          lot_number?: string | null
          date_added?: string
          is_problematic?: boolean
          issue_notes?: string | null
          sensor_type?: string
          created_at?: string
          updated_at?: string
          synced_at?: string | null
          is_deleted?: boolean
          archived_at?: string
          archived_reason?: string
          original_expiry_date?: string | null
          days_worn?: number | null
          archived_by_user_id?: string | null
          notes_at_archival?: string | null
        }
        Relationships: []
      }
      sensor_tags: {
        Row: {
          id: string
          sensor_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          sensor_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          sensor_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_tags_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          category: string
          description: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          description?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          description?: string | null
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      dexcom_tokens: {
        Row: {
          id: string
          user_id: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          expires_at: string
          refresh_expires_at: string
          scope: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          expires_at: string
          refresh_expires_at: string
          scope: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token_encrypted?: string
          refresh_token_encrypted?: string
          expires_at?: string
          refresh_expires_at?: string
          scope?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dexcom_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      dexcom_sync_settings: {
        Row: {
          id: string
          user_id: string
          auto_sync_enabled: boolean
          sync_frequency_minutes: number
          sync_sensor_data: boolean
          sync_glucose_data: boolean
          sync_device_status: boolean
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_sync_enabled?: boolean
          sync_frequency_minutes?: number
          sync_sensor_data?: boolean
          sync_glucose_data?: boolean
          sync_device_status?: boolean
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auto_sync_enabled?: boolean
          sync_frequency_minutes?: number
          sync_sensor_data?: boolean
          sync_glucose_data?: boolean
          sync_device_status?: boolean
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dexcom_sync_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      dexcom_sync_log: {
        Row: {
          id: string
          user_id: string
          operation: string
          status: string
          details: Json | null
          sensors_created: number | null
          sensors_updated: number | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          operation: string
          status: string
          details?: Json | null
          sensors_created?: number | null
          sensors_updated?: number | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          operation?: string
          status?: string
          details?: Json | null
          sensors_created?: number | null
          sensors_updated?: number | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dexcom_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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