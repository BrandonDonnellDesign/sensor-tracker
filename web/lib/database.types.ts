export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      system_logs: {
        Row: {
          id: string;
          created_at: string;
          level: 'info' | 'warn' | 'error';
          category: string;
          message: string;
          user_hash: string | null;
          metadata: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          level: 'info' | 'warn' | 'error';
          category: string;
          message: string;
          user_hash?: string | null;
          metadata?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          level?: 'info' | 'warn' | 'error';
          category?: string;
          message?: string;
          user_hash?: string | null;
          metadata?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          sensor_id: string | null;
          title: string;
          message: string;
          type: string;
          status: 'pending' | 'sent' | 'failed';
          read: boolean;
          created_at: string;
          updated_at: string;
          dismissed_at: string | null;
          retry_count: number;
          last_retry_at: string | null;
          delivery_status: 'pending' | 'delivered' | 'failed' | null;
          template_id: string | null;
          template_variant: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          sensor_id?: string | null;
          title: string;
          message: string;
          type: string;
          status?: 'pending' | 'sent' | 'failed';
          read?: boolean;
          created_at?: string;
          updated_at?: string;
          dismissed_at?: string | null;
          retry_count?: number;
          last_retry_at?: string | null;
          delivery_status?: 'pending' | 'delivered' | 'failed' | null;
          template_id?: string | null;
          template_variant?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          sensor_id?: string | null;
          title?: string;
          message?: string;
          type?: string;
          status?: 'pending' | 'sent' | 'failed';
          read?: boolean;
          created_at?: string;
          updated_at?: string;
          dismissed_at?: string | null;
          retry_count?: number;
          last_retry_at?: string | null;
          delivery_status?: 'pending' | 'delivered' | 'failed' | null;
          template_id?: string | null;
          template_variant?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_sensor_id_fkey';
            columns: ['sensor_id'];
            isOneToOne: false;
            referencedRelation: 'sensors';
            referencedColumns: ['id'];
          }
        ];
      };
      notification_templates: {
        Row: {
          id: string;
          name: string;
          type: string;
          title_template: string;
          message_template: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          variables: Json | null;
          ab_test_group: string | null;
          ab_test_weight: number;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          title_template: string;
          message_template: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          variables?: Json | null;
          ab_test_group?: string | null;
          ab_test_weight?: number;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          title_template?: string;
          message_template?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          variables?: Json | null;
          ab_test_group?: string | null;
          ab_test_weight?: number;
        };
        Relationships: [];
      };
      notification_delivery_log: {
        Row: {
          id: string;
          notification_id: string;
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          provider: string;
          provider_response: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          provider: string;
          provider_response?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          notification_id?: string;
          status?: 'pending' | 'sent' | 'delivered' | 'failed';
          provider?: string;
          provider_response?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_delivery_log_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          }
        ];
      };
      sensor_photos: {
        Row: {
          id: string;
          sensor_id: string;
          file_path: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          sensor_id: string;
          file_path: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          sensor_id?: string;
          file_path?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sensor_photos_sensor_id_fkey';
            columns: ['sensor_id'];
            referencedRelation: 'sensors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sensor_photos_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      photos: {
        Row: {
          created_at: string;
          date_added: string;
          file_name: string;
          file_size: number;
          id: string;
          is_deleted: boolean;
          mime_type: string;
          sensor_id: string;
          storage_path: string | null;
          synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date_added: string;
          file_name: string;
          file_size: number;
          id?: string;
          is_deleted?: boolean;
          mime_type: string;
          sensor_id: string;
          storage_path?: string | null;
          synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date_added?: string;
          file_name?: string;
          file_size?: number;
          id?: string;
          is_deleted?: boolean;
          mime_type?: string;
          sensor_id?: string;
          storage_path?: string | null;
          synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_sensor_id_fkey';
            columns: ['sensor_id'];
            isOneToOne: false;
            referencedRelation: 'sensors';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          timezone: string | null;
          avatar_url: string | null;
          notifications_enabled: boolean;
          dark_mode_enabled: boolean;
          glucose_unit: 'mg/dL' | 'mmol/L';
          push_notifications_enabled: boolean;
          in_app_notifications_enabled: boolean;
          warning_days_before: number;
          critical_days_before: number;
          date_format: string;
          time_format: string;
          preferred_achievement_tracking: string;
          preferred_achievement_id: string | null;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
          last_sync_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          timezone?: string | null;
          avatar_url?: string | null;
          notifications_enabled?: boolean;
          dark_mode_enabled?: boolean;
          glucose_unit?: 'mg/dL' | 'mmol/L';
          push_notifications_enabled?: boolean;
          in_app_notifications_enabled?: boolean;
          warning_days_before?: number;
          critical_days_before?: number;
          date_format?: string;
          time_format?: string;
          preferred_achievement_tracking?: string;
          preferred_achievement_id?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
          last_sync_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          timezone?: string | null;
          avatar_url?: string | null;
          notifications_enabled?: boolean;
          dark_mode_enabled?: boolean;
          glucose_unit?: 'mg/dL' | 'mmol/L';
          push_notifications_enabled?: boolean;
          in_app_notifications_enabled?: boolean;
          warning_days_before?: number;
          critical_days_before?: number;
          date_format?: string;
          time_format?: string;
          preferred_achievement_tracking?: string;
          preferred_achievement_id?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
          last_sync_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      sensors: {
        Row: {
          archived_at: string | null;
          created_at: string;
          date_added: string;
          dexcom_device_id: string | null;
          dexcom_session_id: string | null;
          dexcom_transmitter_id: string | null;
          dexcom_last_sync: string | null;
          id: string;
          is_deleted: boolean;
          is_problematic: boolean;
          issue_notes: string | null;
          lot_number: string | null;
          sensor_type: 'dexcom' | 'freestyle';
          serial_number: string;
          synced_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          date_added: string;
          dexcom_device_id?: string | null;
          dexcom_session_id?: string | null;
          dexcom_transmitter_id?: string | null;
          dexcom_last_sync?: string | null;
          id?: string;
          is_deleted?: boolean;
          is_problematic?: boolean;
          issue_notes?: string | null;
          lot_number?: string | null;
          sensor_type?: 'dexcom' | 'freestyle';
          serial_number: string;
          synced_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          date_added?: string;
          dexcom_device_id?: string | null;
          dexcom_session_id?: string | null;
          dexcom_transmitter_id?: string | null;
          dexcom_last_sync?: string | null;
          id?: string;
          is_deleted?: boolean;
          is_problematic?: boolean;
          issue_notes?: string | null;
          lot_number?: string | null;
          sensor_type?: 'dexcom' | 'freestyle';
          serial_number?: string;
          synced_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sensors_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      archived_sensors: {
        Row: {
          id: string;
          user_id: string;
          serial_number: string;
          lot_number: string | null;
          date_added: string;
          is_problematic: boolean;
          issue_notes: string | null;
          sensor_type: string;
          created_at: string;
          updated_at: string;
          synced_at: string | null;
          is_deleted: boolean;
          archived_at: string;
          archived_reason: string;
          original_expiry_date: string | null;
          days_worn: number | null;
          archived_by_user_id: string | null;
          notes_at_archival: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          serial_number: string;
          lot_number?: string | null;
          date_added: string;
          is_problematic?: boolean;
          issue_notes?: string | null;
          sensor_type: string;
          created_at: string;
          updated_at: string;
          synced_at?: string | null;
          is_deleted?: boolean;
          archived_at?: string;
          archived_reason?: string;
          original_expiry_date?: string | null;
          days_worn?: number | null;
          archived_by_user_id?: string | null;
          notes_at_archival?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          serial_number?: string;
          lot_number?: string | null;
          date_added?: string;
          is_problematic?: boolean;
          issue_notes?: string | null;
          sensor_type?: string;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          is_deleted?: boolean;
          archived_at?: string;
          archived_reason?: string;
          original_expiry_date?: string | null;
          days_worn?: number | null;
          archived_by_user_id?: string | null;
          notes_at_archival?: string | null;
        };
        Relationships: [];
      };
      sensor_tags: {
        Row: {
          id: string;
          sensor_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sensor_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sensor_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sensor_tags_sensor_id_fkey';
            columns: ['sensor_id'];
            isOneToOne: false;
            referencedRelation: 'sensors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sensor_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          }
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dexcom_tokens: {
        Row: {
          id: string;
          user_id: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          expires_at: string;
          refresh_expires_at: string;
          scope: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          expires_at: string;
          refresh_expires_at: string;
          scope: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token_encrypted?: string;
          refresh_token_encrypted?: string;
          expires_at?: string;
          refresh_expires_at?: string;
          scope?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dexcom_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      dexcom_sync_settings: {
        Row: {
          id: string;
          user_id: string;
          auto_sync_enabled: boolean;
          sync_frequency_minutes: number;
          sync_sensor_data: boolean;
          sync_glucose_data: boolean;
          sync_device_status: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          auto_sync_enabled?: boolean;
          sync_frequency_minutes?: number;
          sync_sensor_data?: boolean;
          sync_glucose_data?: boolean;
          sync_device_status?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          auto_sync_enabled?: boolean;
          sync_frequency_minutes?: number;
          sync_sensor_data?: boolean;
          sync_glucose_data?: boolean;
          sync_device_status?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dexcom_sync_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      dexcom_sync_log: {
        Row: {
          id: string;
          user_id: string;
          operation: string;
          status: string;
          details: Json | null;
          sensors_created: number | null;
          sensors_updated: number | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          operation: string;
          status: string;
          details?: Json | null;
          sensors_created?: number | null;
          sensors_updated?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          operation?: string;
          status?: string;
          details?: Json | null;
          sensors_created?: number | null;
          sensors_updated?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dexcom_sync_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          points: number;
          badge_color: string;
          category: string;
          requirement_type: string;
          requirement_value: number;
          requirement_data: Json;
          is_repeatable: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          points?: number;
          badge_color?: string;
          category: string;
          requirement_type: string;
          requirement_value: number;
          requirement_data?: Json;
          is_repeatable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          points?: number;
          badge_color?: string;
          category?: string;
          requirement_type?: string;
          requirement_value?: number;
          requirement_data?: Json;
          is_repeatable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
          progress_data: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
          progress_data?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
          progress_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          }
        ];
      };
      user_gamification_stats: {
        Row: {
          id: string;
          user_id: string;
          total_points: number;
          level: number;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          sensors_tracked: number;
          successful_sensors: number;
          achievements_earned: number;
          analytics_views: number;
          stable_sensors: number;
          archived_sensors: number;
          account_age_days: number;
          sensor_edits: number;
          tags_used: number;
          sensors_total: number;
          photos_added: number;
          page_visited: number;
          achievement_completion: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_points?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          sensors_tracked?: number;
          successful_sensors?: number;
          achievements_earned?: number;
          analytics_views?: number;
          stable_sensors?: number;
          archived_sensors?: number;
          account_age_days?: number;
          sensor_edits?: number;
          tags_used?: number;
          sensors_total?: number;
          photos_added?: number;
          page_visited?: number;
          achievement_completion?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_points?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          sensors_tracked?: number;
          successful_sensors?: number;
          achievements_earned?: number;
          analytics_views?: number;
          stable_sensors?: number;
          archived_sensors?: number;
          account_age_days?: number;
          sensor_edits?: number;
          tags_used?: number;
          sensors_total?: number;
          photos_added?: number;
          page_visited?: number;
          achievement_completion?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_gamification_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      daily_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_date: string;
          activity_type: string;
          activity_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_date: string;
          activity_type: string;
          activity_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_date?: string;
          activity_type?: string;
          activity_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_activities_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      roadmap_items: {
        Row: {
          id: string;
          item_id: string;
          title: string;
          description: string;
          status: 'planned' | 'in-progress' | 'completed' | 'future';
          category: 'core' | 'analytics' | 'integrations' | 'mobile' | 'ai' | 'social' | 'security';
          priority: 'low' | 'medium' | 'high';
          target_date: string | null;
          icon_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          title: string;
          description: string;
          status?: 'planned' | 'in-progress' | 'completed' | 'future';
          category: 'core' | 'analytics' | 'integrations' | 'mobile' | 'ai' | 'social' | 'security';
          priority?: 'low' | 'medium' | 'high';
          target_date?: string | null;
          icon_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          title?: string;
          description?: string;
          status?: 'planned' | 'in-progress' | 'completed' | 'future';
          category?: 'core' | 'analytics' | 'integrations' | 'mobile' | 'ai' | 'social' | 'security';
          priority?: 'low' | 'medium' | 'high';
          target_date?: string | null;
          icon_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roadmap_features: {
        Row: {
          id: string;
          roadmap_item_id: string;
          feature_text: string;
          sort_order: number;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          roadmap_item_id: string;
          feature_text: string;
          sort_order?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          roadmap_item_id?: string;
          feature_text?: string;
          sort_order?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roadmap_features_roadmap_item_id_fkey';
            columns: ['roadmap_item_id'];
            isOneToOne: false;
            referencedRelation: 'roadmap_items';
            referencedColumns: ['id'];
          }
        ];
      };
      roadmap_tags: {
        Row: {
          id: string;
          roadmap_item_id: string;
          tag_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          roadmap_item_id: string;
          tag_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          roadmap_item_id?: string;
          tag_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roadmap_tags_roadmap_item_id_fkey';
            columns: ['roadmap_item_id'];
            isOneToOne: false;
            referencedRelation: 'roadmap_items';
            referencedColumns: ['id'];
          }
        ];
      };
      roadmap_dependencies: {
        Row: {
          id: string;
          roadmap_item_id: string;
          depends_on_item_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          roadmap_item_id: string;
          depends_on_item_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          roadmap_item_id?: string;
          depends_on_item_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roadmap_dependencies_roadmap_item_id_fkey';
            columns: ['roadmap_item_id'];
            isOneToOne: false;
            referencedRelation: 'roadmap_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'roadmap_dependencies_depends_on_item_id_fkey';
            columns: ['depends_on_item_id'];
            isOneToOne: false;
            referencedRelation: 'roadmap_items';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      sensor_type: 'dexcom' | 'freestyle';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
