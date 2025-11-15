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
          created_by_user_id: string | null
          data_quality_score: number | null
          energy_kcal: number | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          is_custom: boolean | null
          is_public: boolean | null
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
          created_by_user_id?: string | null
          data_quality_score?: number | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          is_custom?: boolean | null
          is_public?: boolean | null
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
          created_by_user_id?: string | null
          data_quality_score?: number | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          is_custom?: boolean | null
          is_public?: boolean | null
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
        Relationships: [
          {
            foreignKeyName: "food_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      insulin_logs: {
        Row: {
          activity_level: string | null
          blood_glucose_after: number | null
          blood_glucose_before: number | null
          created_at: string | null
          delivery_type: string
          id: string
          injection_site: string | null
          insulin_name: string | null
          insulin_type: string
          logged_via: string | null
          meal_relation: string | null
          migrated_to_pump: boolean | null
          mood: string | null
          notes: string | null
          taken_at: string
          units: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          blood_glucose_after?: number | null
          blood_glucose_before?: number | null
          created_at?: string | null
          delivery_type?: string
          id?: string
          injection_site?: string | null
          insulin_name?: string | null
          insulin_type: string
          logged_via?: string | null
          meal_relation?: string | null
          migrated_to_pump?: boolean | null
          mood?: string | null
          notes?: string | null
          taken_at?: string
          units: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          blood_glucose_after?: number | null
          blood_glucose_before?: number | null
          created_at?: string | null
          delivery_type?: string
          id?: string
          injection_site?: string | null
          insulin_name?: string | null
          insulin_type?: string
          logged_via?: string | null
          meal_relation?: string | null
          migrated_to_pump?: boolean | null
          mood?: string | null
          notes?: string | null
          taken_at?: string
          units?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_alerts: {
        Row: {
          alerts_enabled: boolean
          created_at: string | null
          id: string
          low_stock_threshold: number
          reorder_threshold: number
          sensor_model_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          created_at?: string | null
          id?: string
          low_stock_threshold?: number
          reorder_threshold?: number
          sensor_model_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          created_at?: string | null
          id?: string
          low_stock_threshold?: number
          reorder_threshold?: number
          sensor_model_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_sensor_model_id_fkey"
            columns: ["sensor_model_id"]
            isOneToOne: false
            referencedRelation: "sensor_models"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_template_items: {
        Row: {
          calories: number | null
          carbs_g: number
          created_at: string | null
          fat_g: number | null
          food_item_id: string | null
          id: string
          meal_template_id: string
          notes: string | null
          product_name: string
          protein_g: number | null
          serving_size: number | null
          serving_unit: string | null
          sort_order: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g: number
          created_at?: string | null
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          meal_template_id: string
          notes?: string | null
          product_name: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sort_order?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number
          created_at?: string | null
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          meal_template_id?: string
          notes?: string | null
          product_name?: string
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_template_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_template_items_meal_template_id_fkey"
            columns: ["meal_template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          meal_type: string | null
          name: string
          total_calories: number | null
          total_carbs: number
          total_fat: number | null
          total_protein: number | null
          updated_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          meal_type?: string | null
          name: string
          total_calories?: number | null
          total_carbs?: number
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          meal_type?: string | null
          name?: string
          total_calories?: number | null
          total_carbs?: number
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
          password_hash: string | null
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
          password_hash?: string | null
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
          password_hash?: string | null
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
      pump_basal_events: {
        Row: {
          basal_rate: number
          basal_type: string
          created_at: string | null
          duration_minutes: number
          id: string
          insulin_type: string | null
          metadata: Json | null
          percent_of_basal: number | null
          source: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          basal_rate: number
          basal_type: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          insulin_type?: string | null
          metadata?: Json | null
          percent_of_basal?: number | null
          source?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          basal_rate?: number
          basal_type?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          insulin_type?: string | null
          metadata?: Json | null
          percent_of_basal?: number | null
          source?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      pump_bolus_events: {
        Row: {
          bg_input: number | null
          bolus_type: string
          carbs_g: number | null
          created_at: string | null
          extended_duration_minutes: number | null
          extended_units: number | null
          id: string
          immediate_units: number | null
          insulin_type: string | null
          metadata: Json | null
          source: string | null
          timestamp: string
          units: number
          user_id: string
        }
        Insert: {
          bg_input?: number | null
          bolus_type: string
          carbs_g?: number | null
          created_at?: string | null
          extended_duration_minutes?: number | null
          extended_units?: number | null
          id?: string
          immediate_units?: number | null
          insulin_type?: string | null
          metadata?: Json | null
          source?: string | null
          timestamp: string
          units: number
          user_id: string
        }
        Update: {
          bg_input?: number | null
          bolus_type?: string
          carbs_g?: number | null
          created_at?: string | null
          extended_duration_minutes?: number | null
          extended_units?: number | null
          id?: string
          immediate_units?: number | null
          insulin_type?: string | null
          metadata?: Json | null
          source?: string | null
          timestamp?: string
          units?: number
          user_id?: string
        }
        Relationships: []
      }
      pump_delivery_logs: {
        Row: {
          amount: number
          basal_event_id: string | null
          bolus_event_id: string | null
          created_at: string | null
          delivery_type: string
          id: string
          metadata: Json | null
          source: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          amount: number
          basal_event_id?: string | null
          bolus_event_id?: string | null
          created_at?: string | null
          delivery_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          amount?: number
          basal_event_id?: string | null
          bolus_event_id?: string | null
          created_at?: string | null
          delivery_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pump_delivery_logs_basal_event_id_fkey"
            columns: ["basal_event_id"]
            isOneToOne: false
            referencedRelation: "pump_basal_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pump_delivery_logs_bolus_event_id_fkey"
            columns: ["bolus_event_id"]
            isOneToOne: false
            referencedRelation: "pump_bolus_events"
            referencedColumns: ["id"]
          },
        ]
      }
      pump_status_events: {
        Row: {
          alarm_code: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reservoir_remaining: number | null
          severity: string | null
          source: string | null
          status: string
          timestamp: string
          user_id: string
        }
        Insert: {
          alarm_code?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reservoir_remaining?: number | null
          severity?: string | null
          source?: string | null
          status: string
          timestamp: string
          user_id: string
        }
        Update: {
          alarm_code?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reservoir_remaining?: number | null
          severity?: string | null
          source?: string | null
          status?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      replacement_tracking: {
        Row: {
          carrier: string
          created_at: string | null
          delivered_at: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          sensor_lot_number: string | null
          sensor_serial_number: string
          status: string
          tracking_number: string
          updated_at: string | null
          user_id: string
          warranty_claim_number: string | null
        }
        Insert: {
          carrier: string
          created_at?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          sensor_lot_number?: string | null
          sensor_serial_number: string
          status?: string
          tracking_number: string
          updated_at?: string | null
          user_id: string
          warranty_claim_number?: string | null
        }
        Update: {
          carrier?: string
          created_at?: string | null
          delivered_at?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          sensor_lot_number?: string | null
          sensor_serial_number?: string
          status?: string
          tracking_number?: string
          updated_at?: string | null
          user_id?: string
          warranty_claim_number?: string | null
        }
        Relationships: []
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
      sensor_inventory: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          location: string | null
          notes: string | null
          quantity: number
          sensor_model_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          quantity?: number
          sensor_model_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          notes?: string | null
          quantity?: number
          sensor_model_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_inventory_sensor_model_id_fkey"
            columns: ["sensor_model_id"]
            isOneToOne: false
            referencedRelation: "sensor_models"
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
      sensor_orders: {
        Row: {
          actual_delivery_date: string | null
          cost: number | null
          created_at: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string | null
          quantity: number
          sensor_model_id: string | null
          status: string
          supplier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          cost?: number | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          quantity: number
          sensor_model_id?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          cost?: number | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string | null
          quantity?: number
          sensor_model_id?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_orders_sensor_model_id_fkey"
            columns: ["sensor_model_id"]
            isOneToOne: false
            referencedRelation: "sensor_models"
            referencedColumns: ["id"]
          },
        ]
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
      user_calculator_settings: {
        Row: {
          correction_factor: number
          created_at: string | null
          id: string
          insulin_to_carb: number
          rapid_acting_duration: number
          short_acting_duration: number
          target_glucose: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correction_factor?: number
          created_at?: string | null
          id?: string
          insulin_to_carb?: number
          rapid_acting_duration?: number
          short_acting_duration?: number
          target_glucose?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correction_factor?: number
          created_at?: string | null
          id?: string
          insulin_to_carb?: number
          rapid_acting_duration?: number
          short_acting_duration?: number
          target_glucose?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_medications: {
        Row: {
          brand_name: string | null
          created_at: string | null
          custom_name: string | null
          dosage_form: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          medication_type_id: string | null
          notes: string | null
          pharmacy: string | null
          prescriber: string | null
          prescription_number: string | null
          refill_date: string | null
          storage_instructions: string | null
          strength: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          created_at?: string | null
          custom_name?: string | null
          dosage_form?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          medication_type_id?: string | null
          notes?: string | null
          pharmacy?: string | null
          prescriber?: string | null
          prescription_number?: string | null
          refill_date?: string | null
          storage_instructions?: string | null
          strength?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_name?: string | null
          created_at?: string | null
          custom_name?: string | null
          dosage_form?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          medication_type_id?: string | null
          notes?: string | null
          pharmacy?: string | null
          prescriber?: string | null
          prescription_number?: string | null
          refill_date?: string | null
          storage_instructions?: string | null
          strength?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
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
      all_insulin_delivery: {
        Row: {
          activity_level: string | null
          blood_glucose_after: number | null
          blood_glucose_before: number | null
          created_at: string | null
          delivery_type: string | null
          id: string | null
          injection_site: string | null
          insulin_name: string | null
          insulin_type: string | null
          logged_via: string | null
          meal_relation: string | null
          mood: string | null
          notes: string | null
          source: string | null
          taken_at: string | null
          units: number | null
          updated_at: string | null
          user_id: string | null
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
          barcode: string | null
          brand: string | null
          carbohydrates_g: number | null
          cgm_1hr_post_meal: number | null
          cgm_2hr_post_meal: number | null
          cgm_pre_meal: number | null
          created_at: string | null
          created_by_user_id: string | null
          custom_food_name: string | null
          energy_kcal: number | null
          fat_g: number | null
          food_item_id: string | null
          food_serving_size: string | null
          food_serving_unit: string | null
          id: string | null
          image_url: string | null
          insulin_dose: Json | null
          is_custom: boolean | null
          is_public: boolean | null
          logged_at: string | null
          meal_type: string | null
          notes: string | null
          product_name: string | null
          proteins_g: number | null
          serving_size: number | null
          serving_unit: string | null
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_insulin_units: number | null
          total_protein_g: number | null
          user_id: string | null
          user_serving_size: number | null
          user_serving_unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
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
      calculate_total_iob: {
        Args: { p_at_time?: string; p_user_id: string }
        Returns: number
      }
      calculate_user_streak: { Args: { p_user_id: string }; Returns: number }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_inventory_levels: { Args: never; Returns: undefined }
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
      increment_template_use_count: {
        Args: { template_id: string }
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
      retroactively_award_achievements: {
        Args: never
        Returns: {
          achievements_awarded: number
          points_awarded: number
          ret_user_id: string
        }[]
      }
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
