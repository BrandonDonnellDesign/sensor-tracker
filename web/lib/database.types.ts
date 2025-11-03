export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string | null
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          is_active: boolean | null
          is_repeatable: boolean | null
          name: string
          points: number
          requirement_data: Json | null
          requirement_type: string
          requirement_value: number | null
          updated_at: string | null
        }
        Insert: {
          badge_color?: string | null
          category: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          is_repeatable?: boolean | null
          name: string
          points?: number
          requirement_data?: Json | null
          requirement_type: string
          requirement_value?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_color?: string | null
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          is_repeatable?: boolean | null
          name?: string
          points?: number
          requirement_data?: Json | null
          requirement_type?: string
          requirement_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          admin_user_id: string | null
          category: string | null
          content: string | null
          created_at: string
          id: string
          resolved: boolean
          title: string
        }
        Insert: {
          admin_user_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          resolved?: boolean
          title: string
        }
        Update: {
          admin_user_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          resolved?: boolean
          title?: string
        }
        Relationships: []
      }
      ai_moderation_log: {
        Row: {
          action: string
          author_id: string | null
          confidence_score: number | null
          content_id: string
          content_type: string
          created_at: string | null
          flags: string[] | null
          id: string
          is_inappropriate: boolean | null
          is_medical_misinformation: boolean | null
          is_off_topic: boolean | null
          is_spam: boolean | null
          quality_score: number | null
          reasoning: string | null
        }
        Insert: {
          action: string
          author_id?: string | null
          confidence_score?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          flags?: string[] | null
          id?: string
          is_inappropriate?: boolean | null
          is_medical_misinformation?: boolean | null
          is_off_topic?: boolean | null
          is_spam?: boolean | null
          quality_score?: number | null
          reasoning?: string | null
        }
        Update: {
          action?: string
          author_id?: string | null
          confidence_score?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          flags?: string[] | null
          id?: string
          is_inappropriate?: boolean | null
          is_medical_misinformation?: boolean | null
          is_off_topic?: boolean | null
          is_spam?: boolean | null
          quality_score?: number | null
          reasoning?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_hour: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_hour?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_hour?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_key_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          referer: string | null
          request_size: number | null
          response_size: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          referer?: string | null
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          referer?: string | null
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_key_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_sensors: {
        Row: {
          archived_at: string
          archived_by_user_id: string | null
          archived_reason: string
          created_at: string
          date_added: string
          days_worn: number | null
          id: string
          is_deleted: boolean
          is_problematic: boolean
          issue_notes: string | null
          lot_number: string | null
          notes_at_archival: string | null
          original_expiry_date: string | null
          sensor_type: string
          serial_number: string
          synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string
          archived_by_user_id?: string | null
          archived_reason?: string
          created_at: string
          date_added: string
          days_worn?: number | null
          id: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          notes_at_archival?: string | null
          original_expiry_date?: string | null
          sensor_type?: string
          serial_number: string
          synced_at?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          archived_at?: string
          archived_by_user_id?: string | null
          archived_reason?: string
          created_at?: string
          date_added?: string
          days_worn?: number | null
          id?: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          notes_at_archival?: string | null
          original_expiry_date?: string | null
          sensor_type?: string
          serial_number?: string
          synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_comment_votes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
          vote_type: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          vote_type: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_tip_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tip_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          tip_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tip_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          tip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tip_bookmarks_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_bookmarks_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tip_comments: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_deleted: boolean | null
          is_rejected: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          parent_comment_id: string | null
          tip_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          content: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          is_rejected?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          parent_comment_id?: string | null
          tip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          is_rejected?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          parent_comment_id?: string | null
          tip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tip_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_tip_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tip_reports: {
        Row: {
          comment_id: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string | null
          tip_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string | null
          tip_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string | null
          tip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tip_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_tip_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_reports_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_reports_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tip_votes: {
        Row: {
          created_at: string | null
          id: string
          tip_id: string | null
          updated_at: string | null
          user_id: string | null
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_tip_votes_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_votes_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tips: {
        Row: {
          author_id: string | null
          author_name: string
          category: string
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_flagged: boolean | null
          is_verified: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          is_verified?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          is_verified?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          activities: Json
          activity_count: number
          activity_date: string
          activity_type: string
          created_at: string | null
          id: string
          points_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activities?: Json
          activity_count?: number
          activity_date: string
          activity_type?: string
          created_at?: string | null
          id?: string
          points_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activities?: Json
          activity_count?: number
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          points_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dexcom_sync_log: {
        Row: {
          api_calls_made: number | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          id: string
          message: string | null
          operation: string | null
          records_processed: number | null
          status: string
          sync_duration_ms: number | null
          sync_type: string
          user_id: string | null
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          id?: string
          message?: string | null
          operation?: string | null
          records_processed?: number | null
          status: string
          sync_duration_ms?: number | null
          sync_type: string
          user_id?: string | null
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          id?: string
          message?: string | null
          operation?: string | null
          records_processed?: number | null
          status?: string
          sync_duration_ms?: number | null
          sync_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dexcom_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dexcom_sync_settings: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          id: string
          last_successful_sync: string | null
          last_sync_error: string | null
          sync_device_status: boolean
          sync_frequency_minutes: number
          sync_glucose_data: boolean
          sync_sensor_data: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_successful_sync?: string | null
          last_sync_error?: string | null
          sync_device_status?: boolean
          sync_frequency_minutes?: number
          sync_glucose_data?: boolean
          sync_sensor_data?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_successful_sync?: string | null
          last_sync_error?: string | null
          sync_device_status?: boolean
          sync_frequency_minutes?: number
          sync_glucose_data?: boolean
          sync_sensor_data?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dexcom_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          refresh_token_encrypted: string
          scope: string
          token_expires_at: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token_encrypted: string
          scope?: string
          token_expires_at: string
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token_encrypted?: string
          scope?: string
          token_expires_at?: string
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          html_content: string
          id: string
          max_attempts: number | null
          metadata: Json | null
          priority: string | null
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_type: string
          text_content: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: string | null
          recipient_email: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_type: string
          text_content: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: string | null
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_type?: string
          text_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      favorite_foods: {
        Row: {
          created_at: string
          default_serving_size: number | null
          default_serving_unit: string | null
          food_item_id: string
          id: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          default_serving_size?: number | null
          default_serving_unit?: string | null
          food_item_id: string
          id?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          default_serving_size?: number | null
          default_serving_unit?: string | null
          food_item_id?: string
          id?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_foods_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          name: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          name: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          name?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string
          status: string
          title: string
          type: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          votes: number | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          barcode: string | null
          brand: string | null
          carbohydrates_g: number | null
          categories: string | null
          created_at: string
          data_quality_score: number | null
          energy_kcal: number | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          off_id: string | null
          off_last_updated: string | null
          product_name: string
          proteins_g: number | null
          saturated_fat_g: number | null
          serving_size: string | null
          serving_unit: string | null
          sodium_mg: number | null
          sugars_g: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          carbohydrates_g?: number | null
          categories?: string | null
          created_at?: string
          data_quality_score?: number | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          off_id?: string | null
          off_last_updated?: string | null
          product_name: string
          proteins_g?: number | null
          saturated_fat_g?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium_mg?: number | null
          sugars_g?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          carbohydrates_g?: number | null
          categories?: string | null
          created_at?: string
          data_quality_score?: number | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          off_id?: string | null
          off_last_updated?: string | null
          product_name?: string
          proteins_g?: number | null
          saturated_fat_g?: number | null
          serving_size?: string | null
          serving_unit?: string | null
          sodium_mg?: number | null
          sugars_g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          cgm_reading_at_meal: number | null
          cgm_trend_at_meal: string | null
          created_at: string
          custom_calories: number | null
          custom_carbs_g: number | null
          custom_food_name: string | null
          food_item_id: string | null
          id: string
          logged_at: string
          meal_type: string | null
          notes: string | null
          photo_url: string | null
          serving_size: number
          serving_unit: string
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_protein_g: number | null
          updated_at: string
          user_id: string
          user_serving_size: number | null
          user_serving_unit: string | null
        }
        Insert: {
          cgm_reading_at_meal?: number | null
          cgm_trend_at_meal?: string | null
          created_at?: string
          custom_calories?: number | null
          custom_carbs_g?: number | null
          custom_food_name?: string | null
          food_item_id?: string | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          serving_size: number
          serving_unit: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id: string
          user_serving_size?: number | null
          user_serving_unit?: string | null
        }
        Update: {
          cgm_reading_at_meal?: number | null
          cgm_trend_at_meal?: string | null
          created_at?: string
          custom_calories?: number | null
          custom_carbs_g?: number | null
          custom_food_name?: string | null
          food_item_id?: string | null
          id?: string
          logged_at?: string
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          serving_size?: number
          serving_unit?: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          updated_at?: string
          user_id?: string
          user_serving_size?: number | null
          user_serving_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      freestyle_sync_log: {
        Row: {
          api_calls_made: number | null
          created_at: string
          error_message: string | null
          id: string
          operation: string
          records_processed: number | null
          status: string
          sync_duration_ms: number | null
          sync_type: string
          user_id: string
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          records_processed?: number | null
          status: string
          sync_duration_ms?: number | null
          sync_type: string
          user_id: string
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          records_processed?: number | null
          status?: string
          sync_duration_ms?: number | null
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      freestyle_sync_settings: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          id: string
          last_successful_sync: string | null
          last_sync_error: string | null
          sync_device_status: boolean
          sync_frequency_minutes: number
          sync_glucose_data: boolean
          sync_sensor_data: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_successful_sync?: string | null
          last_sync_error?: string | null
          sync_device_status?: boolean
          sync_frequency_minutes?: number
          sync_glucose_data?: boolean
          sync_sensor_data?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_successful_sync?: string | null
          last_sync_error?: string | null
          sync_device_status?: boolean
          sync_frequency_minutes?: number
          sync_glucose_data?: boolean
          sync_sensor_data?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      freestyle_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          refresh_token_encrypted: string
          scope: string
          token_expires_at: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token_encrypted: string
          scope?: string
          token_expires_at: string
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token_encrypted?: string
          scope?: string
          token_expires_at?: string
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      glucose_readings: {
        Row: {
          created_at: string | null
          display_app: string | null
          display_device: string | null
          display_time: string | null
          id: string
          rate_unit: string | null
          record_id: string | null
          source: string | null
          system_time: string
          transmitter_generation: string | null
          transmitter_id: string
          transmitter_ticks: number | null
          trend: string | null
          trend_rate: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          display_app?: string | null
          display_device?: string | null
          display_time?: string | null
          id?: string
          rate_unit?: string | null
          record_id?: string | null
          source?: string | null
          system_time: string
          transmitter_generation?: string | null
          transmitter_id: string
          transmitter_ticks?: number | null
          trend?: string | null
          trend_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          display_app?: string | null
          display_device?: string | null
          display_time?: string | null
          id?: string
          rate_unit?: string | null
          record_id?: string | null
          source?: string | null
          system_time?: string
          transmitter_generation?: string | null
          transmitter_id?: string
          transmitter_ticks?: number | null
          trend?: string | null
          trend_rate?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      insulin_doses: {
        Row: {
          cgm_reading_at_dose: number | null
          cgm_trend_at_dose: string | null
          created_at: string
          dose_type: string | null
          dosed_at: string
          id: string
          injection_site: string | null
          insulin_type_id: string
          notes: string | null
          units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cgm_reading_at_dose?: number | null
          cgm_trend_at_dose?: string | null
          created_at?: string
          dose_type?: string | null
          dosed_at?: string
          id?: string
          injection_site?: string | null
          insulin_type_id: string
          notes?: string | null
          units: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cgm_reading_at_dose?: number | null
          cgm_trend_at_dose?: string | null
          created_at?: string
          dose_type?: string | null
          dosed_at?: string
          id?: string
          injection_site?: string | null
          insulin_type_id?: string
          notes?: string | null
          units?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insulin_doses_insulin_type_id_fkey"
            columns: ["insulin_type_id"]
            isOneToOne: false
            referencedRelation: "insulin_types"
            referencedColumns: ["id"]
          },
        ]
      }
      insulin_types: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          onset_minutes: number | null
          peak_minutes: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          onset_minutes?: number | null
          peak_minutes?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          onset_minutes?: number | null
          peak_minutes?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          provider: string
          provider_response: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          provider: string
          provider_response?: Json | null
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          provider?: string
          provider_response?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "active_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          success: boolean
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          success?: boolean
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          success?: boolean
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          ab_test_group: string | null
          ab_test_weight: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          title_template: string
          type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          ab_test_group?: string | null
          ab_test_weight?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          title_template: string
          type: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          ab_test_group?: string | null
          ab_test_weight?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          title_template?: string
          type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          dismissed_at: string | null
          id: string
          last_retry_at: string | null
          message: string
          read: boolean
          retry_count: number | null
          sensor_id: string | null
          status: string | null
          template_id: string | null
          template_variant: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          dismissed_at?: string | null
          id?: string
          last_retry_at?: string | null
          message: string
          read?: boolean
          retry_count?: number | null
          sensor_id?: string | null
          status?: string | null
          template_id?: string | null
          template_variant?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          dismissed_at?: string | null
          id?: string
          last_retry_at?: string | null
          message?: string
          read?: boolean
          retry_count?: number | null
          sensor_id?: string | null
          status?: string | null
          template_id?: string | null
          template_variant?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_issues: {
        Row: {
          created_at: string | null
          id: string
          issue_details: Json | null
          issue_type: string
          page_url: string | null
          resolved: boolean | null
          severity: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue_details?: Json | null
          issue_type: string
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issue_details?: Json | null
          issue_type?: string
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_summary: {
        Row: {
          avg_value: number | null
          date: string
          good_percentage: number | null
          id: number
          median_value: number | null
          metric_name: string
          needs_improvement_percentage: number | null
          p75_value: number | null
          p95_value: number | null
          poor_percentage: number | null
          total_measurements: number
          updated_at: string | null
        }
        Insert: {
          avg_value?: number | null
          date: string
          good_percentage?: number | null
          id?: number
          median_value?: number | null
          metric_name: string
          needs_improvement_percentage?: number | null
          p75_value?: number | null
          p95_value?: number | null
          poor_percentage?: number | null
          total_measurements: number
          updated_at?: string | null
        }
        Update: {
          avg_value?: number | null
          date?: string
          good_percentage?: number | null
          id?: number
          median_value?: number | null
          metric_name?: string
          needs_improvement_percentage?: number | null
          p75_value?: number | null
          p95_value?: number | null
          poor_percentage?: number | null
          total_measurements?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          critical_days_before: number | null
          dark_mode_enabled: boolean | null
          date_format: string | null
          email: string | null
          full_name: string | null
          glucose_unit: string | null
          id: string
          in_app_notifications_enabled: boolean | null
          last_sync_at: string | null
          notification_preferences: Json | null
          notifications_enabled: boolean | null
          preferred_achievement_id: string | null
          preferred_achievement_tracking: string | null
          push_notifications_enabled: boolean | null
          role: string | null
          time_format: string | null
          timezone: string | null
          updated_at: string
          username: string | null
          warning_days_before: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          critical_days_before?: number | null
          dark_mode_enabled?: boolean | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          glucose_unit?: string | null
          id: string
          in_app_notifications_enabled?: boolean | null
          last_sync_at?: string | null
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          preferred_achievement_id?: string | null
          preferred_achievement_tracking?: string | null
          push_notifications_enabled?: boolean | null
          role?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
          warning_days_before?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          critical_days_before?: number | null
          dark_mode_enabled?: boolean | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          glucose_unit?: string | null
          id?: string
          in_app_notifications_enabled?: boolean | null
          last_sync_at?: string | null
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          preferred_achievement_id?: string | null
          preferred_achievement_tracking?: string | null
          push_notifications_enabled?: boolean | null
          role?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
          warning_days_before?: number | null
        }
        Relationships: []
      }
      roadmap_dependencies: {
        Row: {
          created_at: string | null
          depends_on_id: string | null
          id: string
          item_id: string | null
        }
        Insert: {
          created_at?: string | null
          depends_on_id?: string | null
          id?: string
          item_id?: string | null
        }
        Update: {
          created_at?: string | null
          depends_on_id?: string | null
          id?: string
          item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_dependencies_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_features: {
        Row: {
          created_at: string | null
          feature_text: string
          id: string
          is_completed: boolean | null
          roadmap_item_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          feature_text: string
          id?: string
          is_completed?: boolean | null
          roadmap_item_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          feature_text?: string
          id?: string
          is_completed?: boolean | null
          roadmap_item_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_features_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          estimated_quarter: string
          icon_name: string
          id: string
          item_id: string
          priority: string
          progress: number | null
          sort_order: number | null
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          estimated_quarter: string
          icon_name: string
          id?: string
          item_id: string
          priority: string
          progress?: number | null
          sort_order?: number | null
          status: string
          target_date?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          estimated_quarter?: string
          icon_name?: string
          id?: string
          item_id?: string
          priority?: string
          progress?: number | null
          sort_order?: number | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      roadmap_tags: {
        Row: {
          created_at: string | null
          id: string
          roadmap_item_id: string | null
          tag_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          roadmap_item_id?: string | null
          tag_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          roadmap_item_id?: string | null
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tags_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_models: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          manufacturer: string
          model_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days: number
          id?: string
          is_active?: boolean
          manufacturer: string
          model_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          manufacturer?: string
          model_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensor_photos: {
        Row: {
          created_at: string
          file_path: string
          id: string
          sensor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          sensor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          sensor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_photos_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_tags: {
        Row: {
          created_at: string
          id: string
          sensor_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sensor_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sensor_id?: string
          tag_id?: string
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
          },
        ]
      }
      sensors: {
        Row: {
          archived_at: string | null
          auto_detected: boolean | null
          created_at: string | null
          date_added: string
          dexcom_activation_time: string | null
          dexcom_battery_level: number | null
          dexcom_device_serial: string | null
          dexcom_expiry_time: string | null
          dexcom_last_reading_time: string | null
          dexcom_sensor_id: string | null
          id: string
          is_deleted: boolean
          is_problematic: boolean
          issue_notes: string | null
          lot_number: string | null
          sensor_model_id: string
          sensor_type: Database["public"]["Enums"]["sensor_type"]
          serial_number: string
          sync_enabled: boolean | null
          synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          auto_detected?: boolean | null
          created_at?: string | null
          date_added?: string
          dexcom_activation_time?: string | null
          dexcom_battery_level?: number | null
          dexcom_device_serial?: string | null
          dexcom_expiry_time?: string | null
          dexcom_last_reading_time?: string | null
          dexcom_sensor_id?: string | null
          id?: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          sensor_model_id: string
          sensor_type?: Database["public"]["Enums"]["sensor_type"]
          serial_number: string
          sync_enabled?: boolean | null
          synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          auto_detected?: boolean | null
          created_at?: string | null
          date_added?: string
          dexcom_activation_time?: string | null
          dexcom_battery_level?: number | null
          dexcom_device_serial?: string | null
          dexcom_expiry_time?: string | null
          dexcom_last_reading_time?: string | null
          dexcom_sensor_id?: string | null
          id?: string
          is_deleted?: boolean
          is_problematic?: boolean
          issue_notes?: string | null
          lot_number?: string | null
          sensor_model_id?: string
          sensor_type?: Database["public"]["Enums"]["sensor_type"]
          serial_number?: string
          sync_enabled?: boolean | null
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensors_sensor_model_id_fkey"
            columns: ["sensor_model_id"]
            isOneToOne: false
            referencedRelation: "sensor_models"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          category: string
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          user_hash: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          user_hash?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          user_hash?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string | null
          event_name: string
          event_properties: Json | null
          id: string
          page_url: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          event_properties?: Json | null
          id?: string
          page_url?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          event_properties?: Json | null
          id?: string
          page_url?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_gamification_stats: {
        Row: {
          account_age_days: number | null
          achievement_completion: number | null
          achievements_earned: number | null
          analytics_views: number | null
          archived_sensors: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          page_visited: number | null
          photos_added: number | null
          sensor_edits: number | null
          sensors_total: number | null
          sensors_tracked: number | null
          stable_sensors: number | null
          successful_sensors: number | null
          tags_used: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_age_days?: number | null
          achievement_completion?: number | null
          achievements_earned?: number | null
          analytics_views?: number | null
          archived_sensors?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          page_visited?: number | null
          photos_added?: number | null
          sensor_edits?: number | null
          sensors_total?: number | null
          sensors_tracked?: number | null
          stable_sensors?: number | null
          successful_sensors?: number | null
          tags_used?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_age_days?: number | null
          achievement_completion?: number | null
          achievements_earned?: number | null
          analytics_views?: number | null
          archived_sensors?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          page_visited?: number | null
          photos_added?: number | null
          sensor_edits?: number | null
          sensors_total?: number | null
          sensors_tracked?: number | null
          stable_sensors?: number | null
          successful_sensors?: number | null
          tags_used?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_comment_id: string | null
          related_tip_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_comment_id?: string | null
          related_tip_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_comment_id?: string | null
          related_tip_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "community_tip_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_related_tip_id_fkey"
            columns: ["related_tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_related_tip_id_fkey"
            columns: ["related_tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      web_vitals: {
        Row: {
          created_at: string | null
          id: string
          metric_delta: number | null
          metric_id: string
          metric_name: string
          metric_rating: string | null
          metric_value: number
          page_url: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_delta?: number | null
          metric_id: string
          metric_name: string
          metric_rating?: string | null
          metric_value: number
          page_url?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_delta?: number | null
          metric_id?: string
          metric_name?: string
          metric_rating?: string | null
          metric_value?: number
          page_url?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      weekly_digest_tracking: {
        Row: {
          created_at: string | null
          email_id: string | null
          id: string
          sent_at: string | null
          user_id: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          email_id?: string | null
          id?: string
          sent_at?: string | null
          user_id?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          email_id?: string | null
          id?: string
          sent_at?: string | null
          user_id?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_digest_tracking_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_digest_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_notifications: {
        Row: {
          created_at: string | null
          dismissed_at: string | null
          id: string | null
          message: string | null
          read: boolean | null
          sensor_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dismissed_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          sensor_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dismissed_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          sensor_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_active_users_30d: {
        Row: {
          active_users: number | null
          day: string | null
        }
        Relationships: []
      }
      admin_cleanup_stats: {
        Row: {
          expired_sensors: number | null
          inactive_users_90d: number | null
          orphaned_photos: number | null
        }
        Relationships: []
      }
      admin_sensor_stats: {
        Row: {
          avg_sensor_age_days: number | null
          distinct_users_with_sensors: number | null
          sensors_last_24h: number | null
          sensors_last_7d: number | null
          total_sensors: number | null
        }
        Relationships: []
      }
      admin_system_health: {
        Row: {
          database_size: string | null
          last_updated: string | null
          total_photos: number | null
          total_sensors: number | null
          total_users: number | null
        }
        Relationships: []
      }
      admin_user_engagement: {
        Row: {
          active_last_24h: number | null
          active_last_30d: number | null
          active_last_7d: number | null
          new_last_30d: number | null
          total_users: number | null
        }
        Relationships: []
      }
      api_key_stats: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          key_prefix: string | null
          last_used_at: string | null
          name: string | null
          rate_limit_per_hour: number | null
          requests_this_hour: number | null
          requests_today: number | null
          tier: string | null
          total_requests: number | null
          user_id: string | null
        }
        Relationships: []
      }
      community_comments_with_stats: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          downvotes: number | null
          id: string | null
          is_approved: boolean | null
          is_deleted: boolean | null
          is_rejected: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string | null
          net_votes: number | null
          parent_comment_id: string | null
          reply_count: number | null
          tip_id: string | null
          updated_at: string | null
          upvotes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tip_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_tip_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "community_tips_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tips_with_stats: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          downvotes: number | null
          id: string | null
          is_deleted: boolean | null
          is_flagged: boolean | null
          is_verified: boolean | null
          moderation_reason: string | null
          moderation_status: string | null
          net_votes: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          upvotes: number | null
        }
        Relationships: []
      }
      dexcom_token_status: {
        Row: {
          created_at: string | null
          hours_until_expiration: number | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          needs_attention: boolean | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hours_until_expiration?: never
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          needs_attention?: never
          status?: never
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hours_until_expiration?: never
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          needs_attention?: never
          status?: never
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      food_logs_with_cgm: {
        Row: {
          brand: string | null
          cgm_1hr_post_meal: number | null
          cgm_2hr_post_meal: number | null
          cgm_reading_at_meal: number | null
          cgm_trend_at_meal: string | null
          created_at: string | null
          custom_calories: number | null
          custom_carbs_g: number | null
          custom_food_name: string | null
          food_item_id: string | null
          id: string | null
          image_url: string | null
          logged_at: string | null
          meal_type: string | null
          notes: string | null
          photo_url: string | null
          product_name: string | null
          serving_size: number | null
          serving_unit: string | null
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_protein_g: number | null
          updated_at: string | null
          user_id: string | null
          user_serving_size: number | null
          user_serving_unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      insulin_doses_with_cgm: {
        Row: {
          cgm_at_peak: number | null
          cgm_reading_at_dose: number | null
          cgm_trend_at_dose: string | null
          created_at: string | null
          dose_type: string | null
          dosed_at: string | null
          duration_minutes: number | null
          id: string | null
          injection_site: string | null
          insulin_brand: string | null
          insulin_name: string | null
          insulin_type: string | null
          insulin_type_id: string | null
          notes: string | null
          onset_minutes: number | null
          peak_minutes: number | null
          units: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insulin_doses_insulin_type_id_fkey"
            columns: ["insulin_type_id"]
            isOneToOne: false
            referencedRelation: "insulin_types"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_summary_backup: {
        Row: {
          avg_value: number | null
          date: string | null
          good_percentage: number | null
          median_value: number | null
          metric_name: string | null
          needs_improvement_percentage: number | null
          p75_value: number | null
          p95_value: number | null
          poor_percentage: number | null
          total_measurements: number | null
        }
        Relationships: []
      }
      recent_daily_activities: {
        Row: {
          activity_count: number | null
          activity_date: string | null
          activity_type: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_failed_auth_attempts: {
        Args: { p_hours_back?: number }
        Returns: Json
      }
      analyze_user_security_patterns: {
        Args: { p_hours_back?: number; p_user_id: string }
        Returns: Json
      }
      archive_expired_sensors: { Args: never; Returns: number }
      auto_tag_expired_sensors: { Args: never; Returns: number }
      award_achievements_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      backfill_cgm_readings: {
        Args: { p_lookback_hours?: number; p_user_id: string }
        Returns: {
          insulin_updated: number
          meals_updated: number
        }[]
      }
      calculate_quarter_from_date: {
        Args: { input_date: string }
        Returns: string
      }
      calculate_user_streak: { Args: { p_user_id: string }; Returns: undefined }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_rate_limit:
        | {
            Args: {
              p_api_key_id?: string
              p_endpoint?: string
              p_ip_address?: unknown
              p_rate_limit?: number
              p_user_id?: string
            }
            Returns: {
              allowed: boolean
              current_count: number
              limit_value: number
              reset_time: string
            }[]
          }
        | {
            Args: {
              p_action: string
              p_limit: number
              p_user_id: string
              p_window_minutes?: number
            }
            Returns: boolean
          }
      cleanup_old_data: { Args: never; Returns: undefined }
      cleanup_old_dismissed_notifications: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          comment_id?: string
          notification_message: string
          notification_title: string
          notification_type: string
          target_user_id: string
          tip_id?: string
          url?: string
        }
        Returns: string
      }
      dismiss_all_notifications: {
        Args: { user_id_param: string }
        Returns: number
      }
      dismiss_notification: {
        Args: { notification_id: string; user_id_param: string }
        Returns: boolean
      }
      generate_security_report: {
        Args: { p_hours_back?: number }
        Returns: Json
      }
      get_active_users_leaderboard: {
        Args: { period_filter?: string; result_limit?: number }
        Returns: {
          comments_posted: number
          score: number
          tips_created: number
          total_interactions: number
          user_id: string
          username: string
        }[]
      }
      get_admin_audit_logs_with_user_info: {
        Args: { log_limit?: number }
        Returns: {
          action: string
          admin_email: string
          admin_id: string
          admin_username: string
          created_at: string
          details: Json
          id: string
          resource_id: string
          resource_type: string
        }[]
      }
      get_ai_moderation_stats: { Args: { days_back?: number }; Returns: Json }
      get_archival_schedule: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobname: string
          schedule: string
        }[]
      }
      get_archival_stats: { Args: never; Returns: Json }
      get_closest_cgm_reading: {
        Args: {
          p_time_window_minutes?: number
          p_timestamp: string
          p_user_id: string
        }
        Returns: {
          glucose_value: number
          reading_time: string
          time_diff_minutes: number
          trend: string
        }[]
      }
      get_community_leaderboard: {
        Args: { period_filter?: string; result_limit?: number }
        Returns: {
          comments_posted: number
          helpful_votes: number
          score: number
          tips_created: number
          total_likes: number
          user_id: string
          username: string
        }[]
      }
      get_cron_job_run_details: {
        Args: { limit_count?: number }
        Returns: {
          command: string
          database: string
          end_time: string
          job_pid: number
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
          username: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_expiring_dexcom_tokens: {
        Args: { minutes_ahead?: number }
        Returns: {
          expires_at: string
          hours_until_expiration: number
          token_id: string
          user_id: string
        }[]
      }
      get_helpful_users_leaderboard: {
        Args: { period_filter?: string; result_limit?: number }
        Returns: {
          helpful_votes: number
          score: number
          tips_created: number
          total_likes: number
          user_id: string
          username: string
        }[]
      }
      get_notification_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          by_type: Json
          daily_stats: Json
          success_rate: number
          total_sent: number
        }[]
      }
      get_pending_emails: {
        Args: { batch_size?: number }
        Returns: {
          attempts: number
          html_content: string
          id: string
          metadata: Json
          priority: string
          recipient_email: string
          recipient_name: string
          subject: string
          template_type: string
          text_content: string
        }[]
      }
      get_performance_insights: {
        Args: never
        Returns: {
          avg_response_time: number
          error_rate: number
          metric_name: string
          p95_response_time: number
          recommendation: string
        }[]
      }
      get_performance_summary: {
        Args: never
        Returns: {
          metric_name: string
          metric_value: number
          recorded_at: string
        }[]
      }
      get_security_metrics: { Args: { p_hours_back?: number }; Returns: Json }
      get_sensor_stats: {
        Args: { days_back?: number }
        Returns: {
          active_sensors: number
          avg_wear_duration: number
          problematic_sensors: number
          total_sensors: number
        }[]
      }
      get_user_community_stats: {
        Args: never
        Returns: {
          comments_posted: number
          helpful_votes: number
          tips_created: number
          total_likes: number
          total_score: number
          user_id: string
          username: string
        }[]
      }
      get_user_stats: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          new_users: number
          retention_rate: number
          total_users: number
        }[]
      }
      get_user_vote_for_tip: {
        Args: { tip_uuid: string; user_uuid: string }
        Returns: string
      }
      increment_rate_limit: {
        Args: {
          p_api_key_id?: string
          p_endpoint?: string
          p_ip_address?: unknown
          p_user_id?: string
        }
        Returns: undefined
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      log_dexcom_operation: {
        Args: {
          p_error_details?: Json
          p_message?: string
          p_operation?: string
          p_status?: string
          p_sync_type?: string
          p_user_id?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_category: string
          p_level: string
          p_message: string
          p_metadata?: Json
          p_user_hash?: string
        }
        Returns: string
      }
      log_system_event: {
        Args: {
          p_category: string
          p_level: string
          p_message: string
          p_metadata?: string
          p_user_hash?: string
        }
        Returns: undefined
      }
      mark_email_sent: {
        Args: { email_id: string; error_msg?: string; success: boolean }
        Returns: boolean
      }
      monitor_data_access_patterns: {
        Args: { p_hours_back?: number }
        Returns: Json
      }
      notify_expiring_tokens: { Args: never; Returns: undefined }
      queue_email: {
        Args: {
          p_html_content: string
          p_metadata?: Json
          p_priority?: string
          p_recipient_email: string
          p_recipient_name: string
          p_scheduled_for?: string
          p_subject: string
          p_template_type: string
          p_text_content: string
        }
        Returns: string
      }
      refresh_analytics_views: { Args: never; Returns: undefined }
      refresh_dexcom_token: { Args: { p_user_id: string }; Returns: Json }
      refresh_dexcom_token_via_edge_function: {
        Args: { p_user_id: string }
        Returns: Json
      }
      refresh_performance_summary_table: { Args: never; Returns: undefined }
      retroactively_award_achievements: { Args: never; Returns: undefined }
      sync_all_dexcom_users: { Args: never; Returns: undefined }
      sync_cron_logs_to_system_logs: { Args: never; Returns: number }
      sync_dexcom_user: { Args: { p_user_id: string }; Returns: Json }
      toggle_comment_vote: {
        Args: { comment_uuid: string; new_vote_type: string; user_uuid: string }
        Returns: Json
      }
      toggle_tip_bookmark: {
        Args: { tip_uuid: string; user_uuid: string }
        Returns: Json
      }
      toggle_tip_vote: {
        Args: { new_vote_type: string; tip_uuid: string; user_uuid: string }
        Returns: Json
      }
      trigger_dexcom_auto_refresh: { Args: never; Returns: undefined }
      trigger_manual_archival: { Args: never; Returns: Json }
      update_daily_activity: {
        Args: { p_activity: string; p_user_id: string }
        Returns: undefined
      }
      update_gamification_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_hidden_achievement_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_notification_preferences: {
        Args: { preferences: Json; user_id: string }
        Returns: boolean
      }
      user_token_needs_refresh: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_user_input: {
        Args: { p_field_name: string; p_input: string; p_max_length?: number }
        Returns: boolean
      }
    }
    Enums: {
      sensor_type: "dexcom" | "freestyle"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      sensor_type: ["dexcom", "freestyle"],
    },
  },
} as const
