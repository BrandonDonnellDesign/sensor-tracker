-- Freestyle Libre Integration Migration
-- Contains Freestyle Libre API integration tables for sync settings, tokens, and logs
-- Migration: 20241016000003_freestyle_integration.sql

-- Freestyle sync log table
CREATE TABLE IF NOT EXISTS "public"."freestyle_sync_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sync_type" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer DEFAULT 0,
    "error_message" "text",
    "api_calls_made" integer DEFAULT 0,
    "sync_duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."freestyle_sync_log" OWNER TO "postgres";
COMMENT ON TABLE "public"."freestyle_sync_log" IS 'Audit log of Freestyle Libre API sync operations';

-- Freestyle sync settings table
CREATE TABLE IF NOT EXISTS "public"."freestyle_sync_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auto_sync_enabled" boolean DEFAULT true NOT NULL,
    "sync_frequency_minutes" integer DEFAULT 60 NOT NULL,
    "last_successful_sync" timestamp with time zone,
    "last_sync_error" "text",
    "sync_sensor_data" boolean DEFAULT true NOT NULL,
    "sync_glucose_data" boolean DEFAULT false NOT NULL,
    "sync_device_status" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."freestyle_sync_settings" OWNER TO "postgres";
COMMENT ON TABLE "public"."freestyle_sync_settings" IS 'User preferences for Freestyle Libre API synchronization';

-- Freestyle tokens table
CREATE TABLE IF NOT EXISTS "public"."freestyle_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "access_token_encrypted" "text" NOT NULL,
    "refresh_token_encrypted" "text" NOT NULL,
    "token_expires_at" timestamp with time zone NOT NULL,
    "scope" "text" DEFAULT 'offline_access'::"text" NOT NULL,
    "token_type" "text" DEFAULT 'Bearer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL
);
ALTER TABLE "public"."freestyle_tokens" OWNER TO "postgres";
COMMENT ON TABLE "public"."freestyle_tokens" IS 'Encrypted storage for Freestyle Libre API OAuth tokens';

-- Foreign key constraints
ALTER TABLE ONLY "public"."freestyle_sync_log"
    ADD CONSTRAINT "freestyle_sync_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."freestyle_sync_settings"
    ADD CONSTRAINT "freestyle_sync_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."freestyle_tokens"
    ADD CONSTRAINT "freestyle_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Row Level Security
ALTER TABLE "public"."freestyle_sync_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."freestyle_sync_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."freestyle_tokens" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freestyle_sync_log
CREATE POLICY "Users can view their own sync logs" ON "public"."freestyle_sync_log"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync logs" ON "public"."freestyle_sync_log"
    FOR INSERT WITH CHECK (true);

-- RLS Policies for freestyle_sync_settings
CREATE POLICY "Users can view their own sync settings" ON "public"."freestyle_sync_settings"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sync settings" ON "public"."freestyle_sync_settings"
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for freestyle_tokens
CREATE POLICY "Users can view their own tokens" ON "public"."freestyle_tokens"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tokens" ON "public"."freestyle_tokens"
    FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS "freestyle_sync_log_user_id_idx" ON "public"."freestyle_sync_log" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "freestyle_sync_log_created_at_idx" ON "public"."freestyle_sync_log" USING "btree" ("created_at");
CREATE INDEX IF NOT EXISTS "freestyle_sync_log_status_idx" ON "public"."freestyle_sync_log" USING "btree" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "freestyle_sync_settings_user_id_key" ON "public"."freestyle_sync_settings" USING "btree" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "freestyle_tokens_user_id_key" ON "public"."freestyle_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "freestyle_tokens_is_active_idx" ON "public"."freestyle_tokens" USING "btree" ("is_active");

-- Triggers
CREATE TRIGGER "on_freestyle_sync_settings_updated" BEFORE UPDATE ON "public"."freestyle_sync_settings"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_freestyle_tokens_updated" BEFORE UPDATE ON "public"."freestyle_tokens"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();