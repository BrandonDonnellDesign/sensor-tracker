-- Consolidated Dexcom Integration
-- Combines all Dexcom-related functionality into a single migration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Ensure extensions are in correct schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Create Dexcom tokens table
CREATE TABLE IF NOT EXISTS "public"."dexcom_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "access_token_encrypted" "text" NOT NULL,
    "refresh_token_encrypted" "text" NOT NULL,
    "token_expires_at" timestamp with time zone NOT NULL,
    "scope" "text" DEFAULT 'offline_access' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone
);

ALTER TABLE "public"."dexcom_tokens" OWNER TO "postgres";

-- Create Dexcom sync settings table
CREATE TABLE IF NOT EXISTS "public"."dexcom_sync_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auto_sync_enabled" boolean DEFAULT false NOT NULL,
    "sync_frequency_minutes" integer DEFAULT 60 NOT NULL,
    "sync_sensor_data" boolean DEFAULT true NOT NULL,
    "sync_device_status" boolean DEFAULT true NOT NULL,
    "last_successful_sync" timestamp with time zone,
    "last_sync_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."dexcom_sync_settings" OWNER TO "postgres";

-- Create Dexcom sync log table
CREATE TABLE IF NOT EXISTS "public"."dexcom_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sync_type" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."dexcom_sync_log" OWNER TO "postgres";

-- Add primary keys and constraints
ALTER TABLE ONLY "public"."dexcom_tokens"
    ADD CONSTRAINT "dexcom_tokens_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."dexcom_sync_settings"
    ADD CONSTRAINT "dexcom_sync_settings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."dexcom_sync_log"
    ADD CONSTRAINT "dexcom_sync_log_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."dexcom_tokens"
    ADD CONSTRAINT "dexcom_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dexcom_sync_settings"
    ADD CONSTRAINT "dexcom_sync_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."dexcom_sync_log"
    ADD CONSTRAINT "dexcom_sync_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Add unique constraints
ALTER TABLE ONLY "public"."dexcom_sync_settings"
    ADD CONSTRAINT "dexcom_sync_settings_user_id_key" UNIQUE ("user_id");

-- Create indexes
CREATE INDEX IF NOT EXISTS "dexcom_tokens_user_id_idx" ON "public"."dexcom_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "dexcom_tokens_is_active_idx" ON "public"."dexcom_tokens" USING "btree" ("is_active");
CREATE INDEX IF NOT EXISTS "dexcom_tokens_expires_at_idx" ON "public"."dexcom_tokens" USING "btree" ("token_expires_at");
CREATE INDEX IF NOT EXISTS "dexcom_sync_log_user_id_idx" ON "public"."dexcom_sync_log" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "dexcom_sync_log_created_at_idx" ON "public"."dexcom_sync_log" USING "btree" ("created_at");

-- Enhanced Dexcom sync function with automatic token refresh detection
CREATE OR REPLACE FUNCTION public.sync_dexcom_user(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_token_record RECORD;
    v_sync_settings RECORD;
    v_http_response extensions.http_response;
    v_glucose_synced integer := 0;
    v_devices_synced integer := 0;
    v_sensors_new integer := 0;
    v_sensors_updated integer := 0;
    v_start_time timestamptz;
    v_end_time timestamptz;
    v_response_body jsonb;
    v_glucose_response jsonb;
    v_reading jsonb;
    v_device jsonb;
    v_session jsonb;
    v_sensor_model_id uuid;
    v_existing_sensor RECORD;
    v_errors text[] := ARRAY[]::text[];
    v_access_token text;
BEGIN
    -- Get the user's Dexcom token
    SELECT * INTO v_token_record
    FROM public.dexcom_tokens
    WHERE user_id = p_user_id
        AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No Dexcom token found',
            'error_code', 'NO_TOKEN'
        );
    END IF;
    
    -- Check if token is expired or expiring soon (within 5 minutes)
    IF v_token_record.token_expires_at <= NOW() + interval '5 minutes' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Dexcom token expired or expiring soon',
            'error_code', 'TOKEN_EXPIRED',
            'expires_at', v_token_record.token_expires_at,
            'needs_refresh', true
        );
    END IF;
    
    -- Decrypt access token (base64 decoding)
    BEGIN
        v_access_token := convert_from(decode(v_token_record.access_token_encrypted, 'base64'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
        -- If decoding fails, try using it as-is (might not be encoded)
        v_access_token := v_token_record.access_token_encrypted;
    END;
    
    -- Get sync settings
    SELECT * INTO v_sync_settings
    FROM public.dexcom_sync_settings
    WHERE user_id = p_user_id;
    
    -- Get the last sync time (default to 24 hours ago)
    SELECT COALESCE(MAX(system_time), NOW() - interval '24 hours')
    INTO v_start_time
    FROM public.glucose_readings
    WHERE user_id = p_user_id;
    
    v_end_time := NOW();
    
    -- Sync glucose readings
    BEGIN
        SELECT * INTO v_http_response FROM extensions.http((
            'GET',
            'https://api.dexcom.com/v3/users/self/egvs?startDate=' || 
                to_char(v_start_time, 'YYYY-MM-DD"T"HH24:MI:SS') ||
                '&endDate=' || to_char(v_end_time, 'YYYY-MM-DD"T"HH24:MI:SS'),
            ARRAY[
                extensions.http_header('Authorization', 'Bearer ' || v_access_token),
                extensions.http_header('Content-Type', 'application/json')
            ],
            NULL,
            NULL
        )::extensions.http_request);
        
        -- Check for 401 (token expired during API call)
        IF v_http_response.status = 401 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Dexcom API returned 401 - token expired',
                'error_code', 'TOKEN_EXPIRED_API',
                'needs_refresh', true
            );
        END IF;
        
        -- Process successful response
        IF v_http_response.status = 200 THEN
            v_glucose_response := v_http_response.content::jsonb;
            
            -- Insert glucose readings
            FOR v_reading IN SELECT * FROM jsonb_array_elements(v_glucose_response->'records')
            LOOP
                BEGIN
                    INSERT INTO public.glucose_readings (
                        user_id,
                        record_id,
                        transmitter_id,
                        transmitter_generation,
                        value,
                        unit,
                        trend,
                        trend_rate,
                        rate_unit,
                        system_time,
                        display_time,
                        display_device,
                        display_app,
                        transmitter_ticks,
                        source
                    ) VALUES (
                        p_user_id,
                        (v_reading->>'recordId')::text,
                        COALESCE((v_reading->>'transmitterId')::text, 'unknown'),
                        v_reading->>'transmitterGeneration',
                        COALESCE((v_reading->'value'->>'mg/dL')::integer, (v_reading->>'value')::integer),
                        'mg/dL',
                        v_reading->>'trend',
                        (v_reading->>'trendRate')::numeric,
                        COALESCE(v_reading->>'rateUnit', 'mg/dL/min'),
                        (v_reading->>'systemTime')::timestamptz,
                        (v_reading->>'displayTime')::timestamptz,
                        v_reading->>'displayDevice',
                        v_reading->>'displayApp',
                        (v_reading->>'transmitterTicks')::bigint,
                        'dexcom_api'
                    )
                    ON CONFLICT (record_id) DO NOTHING;
                    
                    v_glucose_synced := v_glucose_synced + 1;
                EXCEPTION WHEN OTHERS THEN
                    v_errors := array_append(v_errors, 'Glucose reading error: ' || SQLERRM);
                END;
            END LOOP;
        ELSE
            v_errors := array_append(v_errors, 'Failed to fetch glucose readings: HTTP ' || v_http_response.status);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_errors := array_append(v_errors, 'Glucose sync error: ' || SQLERRM);
    END;
    
    -- Sync devices and sensors if enabled
    IF v_sync_settings.sync_device_status THEN
        BEGIN
            -- Get default Dexcom sensor model
            SELECT id INTO v_sensor_model_id
            FROM public.sensor_models
            WHERE manufacturer = 'Dexcom'
            LIMIT 1;
            
            -- Fetch devices
            SELECT * INTO v_http_response FROM extensions.http((
                'GET',
                'https://api.dexcom.com/v3/users/self/devices',
                ARRAY[
                    extensions.http_header('Authorization', 'Bearer ' || v_access_token),
                    extensions.http_header('Content-Type', 'application/json')
                ],
                NULL,
                NULL
            )::extensions.http_request);
            
            -- Check for 401 on devices endpoint
            IF v_http_response.status = 401 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Dexcom devices API returned 401 - token expired',
                    'error_code', 'TOKEN_EXPIRED_API',
                    'needs_refresh', true
                );
            END IF;
            
            IF v_http_response.status = 200 THEN
                v_response_body := v_http_response.content::jsonb;
                
                -- Process devices
                FOR v_device IN SELECT * FROM jsonb_array_elements(v_response_body)
                LOOP
                    v_devices_synced := v_devices_synced + 1;
                END LOOP;
                
                -- Fetch sensor sessions
                SELECT * INTO v_http_response FROM extensions.http((
                    'GET',
                    'https://api.dexcom.com/v3/users/self/dataRange?startDate=' || 
                        to_char(NOW() - interval '30 days', 'YYYY-MM-DD') ||
                        '&endDate=' || to_char(NOW(), 'YYYY-MM-DD'),
                    ARRAY[
                        extensions.http_header('Authorization', 'Bearer ' || v_access_token),
                        extensions.http_header('Content-Type', 'application/json')
                    ],
                    NULL,
                    NULL
                )::extensions.http_request);
                
                IF v_http_response.status = 401 THEN
                    RETURN jsonb_build_object(
                        'success', false,
                        'error', 'Dexcom sessions API returned 401 - token expired',
                        'error_code', 'TOKEN_EXPIRED_API',
                        'needs_refresh', true
                    );
                END IF;
                
                IF v_http_response.status = 200 THEN
                    v_response_body := v_http_response.content::jsonb;
                    
                    -- Process sensor sessions
                    IF v_response_body ? 'sessions' THEN
                        FOR v_session IN SELECT * FROM jsonb_array_elements(v_response_body->'sessions')
                        LOOP
                            BEGIN
                                -- Check if sensor already exists
                                SELECT id, serial_number, notes INTO v_existing_sensor
                                FROM public.sensors
                                WHERE user_id = p_user_id
                                    AND serial_number = (v_session->>'transmitterId')::text
                                    AND is_deleted = false
                                LIMIT 1;
                                
                                IF FOUND THEN
                                    -- Update existing sensor
                                    UPDATE public.sensors
                                    SET updated_at = NOW(),
                                        notes = COALESCE(v_existing_sensor.notes, '') || 
                                                E'\n\nLast synced with Dexcom API: ' || NOW()::text
                                    WHERE id = v_existing_sensor.id;
                                    
                                    v_sensors_updated := v_sensors_updated + 1;
                                ELSE
                                    -- Create new sensor
                                    INSERT INTO public.sensors (
                                        user_id,
                                        serial_number,
                                        date_added,
                                        sensor_model_id,
                                        location,
                                        is_problematic,
                                        dexcom_sensor_id,
                                        dexcom_device_serial,
                                        auto_detected,
                                        notes
                                    ) VALUES (
                                        p_user_id,
                                        (v_session->>'transmitterId')::text,
                                        (v_session->>'sessionStartTime')::timestamptz,
                                        v_sensor_model_id,
                                        'Auto-detected',
                                        false,
                                        v_session->>'sessionId',
                                        (v_session->>'transmitterId')::text,
                                        true,
                                        'Auto-synced from Dexcom API. Session ID: ' || 
                                        (v_session->>'sessionId')::text || 
                                        '. Detected on: ' || NOW()::text
                                    );
                                    
                                    v_sensors_new := v_sensors_new + 1;
                                END IF;
                            EXCEPTION WHEN OTHERS THEN
                                v_errors := array_append(v_errors, 'Sensor processing error: ' || SQLERRM);
                            END;
                        END LOOP;
                    END IF;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Device/session sync error: ' || SQLERRM);
        END;
    END IF;
    
    -- Backfill CGM readings for recent meals/insulin
    BEGIN
        PERFORM public.backfill_cgm_readings(p_user_id, 2);
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist yet, skip backfill
        NULL;
    WHEN OTHERS THEN
        v_errors := array_append(v_errors, 'Backfill error: ' || SQLERRM);
    END;
    
    -- Update sync timestamps
    UPDATE public.dexcom_tokens
    SET last_sync_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    IF v_sync_settings.user_id IS NOT NULL THEN
        UPDATE public.dexcom_sync_settings
        SET last_successful_sync = NOW(),
            last_sync_error = CASE 
                WHEN array_length(v_errors, 1) > 0 
                THEN array_to_string(v_errors, '; ') 
                ELSE NULL 
            END
        WHERE user_id = p_user_id;
    END IF;
    
    -- Return results
    RETURN jsonb_build_object(
        'success', true,
        'glucose_readings', v_glucose_synced,
        'devices_processed', v_devices_synced,
        'sensors_new', v_sensors_new,
        'sensors_updated', v_sensors_updated,
        'start_time', v_start_time,
        'end_time', v_end_time,
        'errors', v_errors,
        'glucose_response', v_glucose_response,
        'devices_response', v_response_body
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Scheduled sync function with token refresh detection
CREATE OR REPLACE FUNCTION public.sync_all_dexcom_users()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    sync_result jsonb;
BEGIN
    -- Loop through all users with active tokens and auto-sync enabled
    FOR user_record IN 
        SELECT DISTINCT dt.user_id
        FROM public.dexcom_tokens dt
        INNER JOIN public.dexcom_sync_settings dss ON dt.user_id = dss.user_id
        WHERE dt.is_active = true
        AND dss.auto_sync_enabled = true
        AND dss.sync_sensor_data = true
    LOOP
        BEGIN
            -- Sync this user's data
            sync_result := public.sync_dexcom_user(user_record.user_id);
            
            -- Check if token needs refresh
            IF NOT (sync_result->>'success')::boolean AND 
               (sync_result->>'error_code' = 'TOKEN_EXPIRED' OR 
                sync_result->>'error_code' = 'TOKEN_EXPIRED_API') THEN
                
                -- Log that token refresh is needed
                INSERT INTO public.dexcom_sync_log (
                    user_id,
                    sync_type,
                    operation,
                    status,
                    records_processed,
                    error_message
                ) VALUES (
                    user_record.user_id,
                    'automatic',
                    'scheduled_sync_token_refresh_needed',
                    'warning',
                    0,
                    'Token expired during scheduled sync - will be auto-refreshed on next manual sync'
                );
                
                CONTINUE; -- Skip to next user
            END IF;
            
            -- Log the sync result
            INSERT INTO public.dexcom_sync_log (
                user_id,
                sync_type,
                operation,
                status,
                records_processed,
                error_message
            ) VALUES (
                user_record.user_id,
                'automatic',
                'scheduled_sync',
                CASE WHEN sync_result->>'success' = 'true' THEN 'success' ELSE 'error' END,
                COALESCE((sync_result->>'glucose_readings')::integer, 0),
                CASE WHEN sync_result->>'success' = 'true' THEN NULL ELSE sync_result->>'error' END
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Log any errors
            INSERT INTO public.dexcom_sync_log (
                user_id,
                sync_type,
                operation,
                status,
                records_processed,
                error_message
            ) VALUES (
                user_record.user_id,
                'automatic',
                'scheduled_sync',
                'error',
                0,
                SQLERRM
            );
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule the sync to run every hour
SELECT cron.schedule(
    'dexcom-hourly-sync',
    '0 * * * *', -- Every hour at minute 0
    $$SELECT public.sync_all_dexcom_users()$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_dexcom_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_dexcom_user TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_dexcom_users TO service_role;

-- Enable RLS
ALTER TABLE "public"."dexcom_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dexcom_sync_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dexcom_sync_log" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own Dexcom tokens" ON "public"."dexcom_tokens"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can manage their own sync settings" ON "public"."dexcom_sync_settings"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can view their own sync logs" ON "public"."dexcom_sync_log"
    FOR SELECT USING ("user_id" = "auth"."uid"());

COMMENT ON FUNCTION public.sync_dexcom_user IS 'Enhanced Dexcom sync with automatic token refresh detection';
COMMENT ON FUNCTION public.sync_all_dexcom_users IS 'Scheduled sync for all users with auto-sync enabled';