-- Archival Migration
-- Contains archived sensors and archival-related functions
-- Migration: 20251011194832_archival.sql

-- Archived sensors table
CREATE TABLE IF NOT EXISTS "public"."archived_sensors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "serial_number" "text" NOT NULL,
    "lot_number" "text",
    "date_added" timestamp with time zone NOT NULL,
    "is_problematic" boolean DEFAULT false NOT NULL,
    "issue_notes" "text",
    "sensor_type" "text" DEFAULT 'dexcom'::"text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "synced_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_reason" "text" DEFAULT 'expired_6_months'::"text" NOT NULL,
    "original_expiry_date" timestamp with time zone,
    "days_worn" integer,
    "archived_by_user_id" "uuid",
    "notes_at_archival" "text"
);
ALTER TABLE "public"."archived_sensors" OWNER TO "postgres";
COMMENT ON TABLE "public"."archived_sensors" IS 'Historical storage for sensors archived from main sensors table';
COMMENT ON COLUMN "public"."archived_sensors"."archived_reason" IS 'Reason for archival: expired_6_months, manual, etc.';
COMMENT ON COLUMN "public"."archived_sensors"."original_expiry_date" IS 'Calculated expiry date based on sensor model when archived';
COMMENT ON COLUMN "public"."archived_sensors"."days_worn" IS 'Number of days sensor was worn (date_added to archive date)';

-- Foreign key constraints
ALTER TABLE ONLY "public"."archived_sensors"
    ADD CONSTRAINT "archived_sensors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."archived_sensors"
    ADD CONSTRAINT "archived_sensors_archived_by_user_id_fkey" FOREIGN KEY ("archived_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

-- Row Level Security
ALTER TABLE "public"."archived_sensors" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for archived_sensors
CREATE POLICY "Users can view their own archived sensors" ON "public"."archived_sensors"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert archived sensors" ON "public"."archived_sensors"
    FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS "archived_sensors_user_id_idx" ON "public"."archived_sensors" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "archived_sensors_archived_at_idx" ON "public"."archived_sensors" USING "btree" ("archived_at");
CREATE INDEX IF NOT EXISTS "archived_sensors_sensor_type_idx" ON "public"."archived_sensors" USING "btree" ("sensor_type");
CREATE INDEX IF NOT EXISTS "archived_sensors_archived_reason_idx" ON "public"."archived_sensors" USING "btree" ("archived_reason");

-- Archive expired sensors function
CREATE OR REPLACE FUNCTION "public"."archive_expired_sensors"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  archived_count INTEGER := 0;
  has_sensor_model_id BOOLEAN;
BEGIN
  -- Check if sensor_model_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'sensors'
    AND column_name = 'sensor_model_id'
  ) INTO has_sensor_model_id;
  IF has_sensor_model_id THEN
    -- Use the new schema with sensor_model_id
    WITH sensors_to_archive AS (
      SELECT s.*, sm.duration_days
      FROM public.sensors s
      LEFT JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
      WHERE s.archived_at IS NULL
        AND s.is_deleted = FALSE
        AND s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months' < NOW()
    )
    INSERT INTO public.archived_sensors (
      id, user_id, serial_number, lot_number, date_added,
      is_problematic, issue_notes, sensor_type, sensor_model_id,
      archived_at, archived_reason, original_expiry_date,
      days_worn, created_at, updated_at
    )
    SELECT
      id, user_id, serial_number, lot_number, date_added,
      is_problematic, issue_notes, sensor_type, sensor_model_id,
      NOW(), 'auto_archived_after_6_months',
      date_added + INTERVAL '1 day' * COALESCE(duration_days, 14),
      COALESCE(duration_days, 14),
      created_at, updated_at
    FROM sensors_to_archive;
  ELSE
    -- Use fallback logic for older schema
    WITH sensors_to_archive AS (
      SELECT s.*
      FROM public.sensors s
      WHERE s.archived_at IS NULL
        AND s.is_deleted = FALSE
        AND s.date_added + INTERVAL '14 days' + INTERVAL '6 months' < NOW()
    )
    INSERT INTO public.archived_sensors (
      id, user_id, serial_number, lot_number, date_added,
      is_problematic, issue_notes, sensor_type,
      archived_at, archived_reason, original_expiry_date,
      days_worn, created_at, updated_at
    )
    SELECT
      id, user_id, serial_number, lot_number, date_added,
      is_problematic, issue_notes,
      COALESCE(sensor_type, 'dexcom'::sensor_type),
      NOW(), 'auto_archived_after_6_months',
      date_added + INTERVAL '14 days',
      14,
      created_at, updated_at
    FROM sensors_to_archive;
  END IF;
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  -- Mark sensors as archived
  UPDATE public.sensors
  SET archived_at = NOW()
  WHERE id IN (
    SELECT s.id
    FROM public.sensors s
    WHERE s.archived_at IS NULL
      AND s.is_deleted = FALSE
      AND s.date_added + INTERVAL '14 days' + INTERVAL '6 months' < NOW()
  );
  RAISE NOTICE 'Archived % expired sensors', archived_count;
  RETURN archived_count;
END
$$;
ALTER FUNCTION "public"."archive_expired_sensors"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."archive_expired_sensors"() IS 'Archive old sensors function with fixed search_path for security';

-- Auto tag expired sensors function
CREATE OR REPLACE FUNCTION "public"."auto_tag_expired_sensors"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  tagged_count INTEGER := 0;
BEGIN
  -- This function can be implemented to automatically tag expired sensors
  -- For now, return 0 to prevent cron job failures
  RAISE NOTICE 'auto_tag_expired_sensors function called - not implemented yet';
  RETURN 0;
END
$$;
ALTER FUNCTION "public"."auto_tag_expired_sensors"() OWNER TO "postgres";

-- Manual archival trigger function
CREATE OR REPLACE FUNCTION "public"."trigger_manual_archival"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  archived_count INTEGER;
  result JSON;
BEGIN
  -- Run the archival function
  SELECT archive_expired_sensors() INTO archived_count;
  -- Return result
  SELECT json_build_object(
    'archived_count', archived_count,
    'triggered_at', NOW(),
    'triggered_by', auth.uid()
  ) INTO result;
  RETURN result;
END;
$$;
ALTER FUNCTION "public"."trigger_manual_archival"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."trigger_manual_archival"() IS 'Manual archival trigger function with fixed search_path for security';

-- Get archival schedule function
CREATE OR REPLACE FUNCTION "public"."get_archival_schedule"() RETURNS TABLE("jobname" "text", "schedule" "text", "command" "text", "active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname,
    j.schedule,
    j.command,
    j.active
  FROM cron.job j
  WHERE j.jobname LIKE '%archival%'
  ORDER BY j.jobname;
END;
$$;
ALTER FUNCTION "public"."get_archival_schedule"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_archival_schedule"() IS 'Get archival schedule function with fixed_search_path for security';

-- Get archival stats function
CREATE OR REPLACE FUNCTION "public"."get_archival_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_sensors', (SELECT COUNT(*) FROM public.sensors WHERE archived_at IS NULL AND is_deleted = FALSE),
    'archived_sensors', (SELECT COUNT(*) FROM public.archived_sensors),
    'sensors_ready_for_archival', (
      SELECT COUNT(*)
      FROM public.sensors s
      LEFT JOIN public.sensor_models sm ON sm.manufacturer =
        CASE
          WHEN s.sensor_type = 'dexcom' THEN 'Dexcom'
          WHEN s.sensor_type = 'freestyle' THEN 'Abbott'
          ELSE 'Dexcom'
        END
      WHERE s.archived_at IS NULL
      AND s.is_deleted = FALSE
      AND (s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months') < NOW()
    ),
    'last_archival_run', (
      SELECT created_at
      FROM public.system_logs
      WHERE operation = 'sensor_archival'
      ORDER BY created_at DESC
      LIMIT 1
    )
  ) INTO result;
  RETURN result;
END;
$$;
ALTER FUNCTION "public"."get_archival_stats"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."get_archival_stats"() IS 'Get archival statistics function with fixed_search_path for security';