-- Admin Migration
-- Contains admin notes, system logs, and feature flags
-- Migration: 20251011194830_admin.sql

-- Admin notes table
CREATE TABLE IF NOT EXISTS "public"."admin_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "category" "text",
    "resolved" boolean DEFAULT false NOT NULL
);
ALTER TABLE "public"."admin_notes" OWNER TO "postgres";

-- System logs table
CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level" "text" NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "user_hash" "text",
    "metadata" "jsonb",
    CONSTRAINT "system_logs_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'warn'::"text", 'error'::"text"])))
);
ALTER TABLE "public"."system_logs" OWNER TO "postgres";

-- Feature flags table
CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "enabled" boolean DEFAULT false NOT NULL,
    "rollout_percentage" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_flags_rollout_percentage_check" CHECK ((("rollout_percentage" >= 0) AND ("rollout_percentage" <= 100)))
);
ALTER TABLE "public"."feature_flags" OWNER TO "postgres";

-- Admin analytics views
CREATE OR REPLACE VIEW "public"."admin_sensor_stats" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "total_sensors",
    "count"(DISTINCT "user_id") AS "distinct_users_with_sensors",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '24:00:00'::interval))) AS "sensors_last_24h",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '7 days'::interval))) AS "sensors_last_7d",
    "avg"(EXTRACT(day FROM ("now"() - "created_at"))) AS "avg_sensor_age_days"
   FROM "public"."sensors";
ALTER VIEW "public"."admin_sensor_stats" OWNER TO "postgres";
COMMENT ON VIEW "public"."admin_sensor_stats" IS 'Admin analytics view - access controlled by application-level role checks';

CREATE OR REPLACE VIEW "public"."admin_system_health" WITH ("security_invoker"='true') AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."profiles") AS "total_users",
    ( SELECT "count"(*) AS "count"
           FROM "public"."sensors") AS "total_sensors",
    ( SELECT "count"(*) AS "count"
           FROM "public"."sensor_photos") AS "total_photos",
    "pg_size_pretty"("pg_database_size"("current_database"())) AS "database_size",
    "now"() AS "last_updated";
ALTER VIEW "public"."admin_system_health" OWNER TO "postgres";
COMMENT ON VIEW "public"."admin_system_health" IS 'Admin analytics view - access controlled by application-level role checks';

CREATE OR REPLACE VIEW "public"."admin_user_engagement" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "total_users",
    "count"(*) FILTER (WHERE ("updated_at" >= ("now"() - '24:00:00'::interval))) AS "active_last_24h",
    "count"(*) FILTER (WHERE ("updated_at" >= ("now"() - '7 days'::interval))) AS "active_last_7d",
    "count"(*) FILTER (WHERE ("updated_at" >= ("now"() - '30 days'::interval))) AS "active_last_30d",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '30 days'::interval))) AS "new_last_30d"
   FROM "public"."profiles";
ALTER VIEW "public"."admin_user_engagement" OWNER TO "postgres";
COMMENT ON VIEW "public"."admin_user_engagement" IS 'Admin analytics view - access controlled by application-level role checks';

-- Foreign key constraints
ALTER TABLE ONLY "public"."admin_notes"
    ADD CONSTRAINT "admin_notes_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

-- Row Level Security
ALTER TABLE "public"."admin_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_notes
CREATE POLICY "Only admins can manage admin notes" ON "public"."admin_notes"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for system_logs (admin only)
CREATE POLICY "Only admins can view system logs" ON "public"."system_logs"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert logs" ON "public"."system_logs"
    FOR INSERT WITH CHECK (true);

-- RLS Policies for feature_flags (admin only)
CREATE POLICY "Only admins can manage feature flags" ON "public"."feature_flags"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS "admin_notes_admin_user_id_idx" ON "public"."admin_notes" USING "btree" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_notes_resolved_idx" ON "public"."admin_notes" USING "btree" ("resolved");
CREATE INDEX IF NOT EXISTS "admin_notes_created_at_idx" ON "public"."admin_notes" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "system_logs_level_idx" ON "public"."system_logs" USING "btree" ("level");
CREATE INDEX IF NOT EXISTS "system_logs_category_idx" ON "public"."system_logs" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "public"."system_logs" USING "btree" ("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "public"."feature_flags" USING "btree" ("key");

-- Triggers
CREATE TRIGGER "on_admin_note_updated" BEFORE UPDATE ON "public"."admin_notes"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_feature_flag_updated" BEFORE UPDATE ON "public"."feature_flags"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();