-- Notifications Migration
-- Contains notification system, templates, and delivery logs
-- Migration: 20251011194829_notifications.sql

-- Notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sensor_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "dismissed_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "retry_count" integer DEFAULT 0,
    "last_retry_at" timestamp with time zone,
    "delivery_status" "text",
    "template_id" "uuid",
    "template_variant" "text",
    CONSTRAINT "notifications_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'delivered'::"text", 'failed'::"text"]))),
    CONSTRAINT "notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['sensor_expiry_warning'::"text", 'sensor_expired'::"text", 'welcome'::"text", 'test'::"text", 'system'::"text", 'alert'::"text", 'reminder'::"text", 'info'::"text"])))
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";

-- Active notifications view
CREATE OR REPLACE VIEW "public"."active_notifications" WITH ("security_invoker"='true') AS
 SELECT "id",
    "user_id",
    "sensor_id",
    "title",
    "message",
    "type",
    "read",
    "dismissed_at",
    "created_at",
    "updated_at"
   FROM "public"."notifications"
  WHERE ("dismissed_at" IS NULL);
ALTER VIEW "public"."active_notifications" OWNER TO "postgres";

-- Notification templates table
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title_template" "text" NOT NULL,
    "message_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "variables" "jsonb",
    "ab_test_group" "text",
    "ab_test_weight" integer DEFAULT 1
);
ALTER TABLE "public"."notification_templates" OWNER TO "postgres";

-- Notification delivery log table
CREATE TABLE IF NOT EXISTS "public"."notification_delivery_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_response" "jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_delivery_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);
ALTER TABLE "public"."notification_delivery_log" OWNER TO "postgres";

-- Foreign key constraints
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notification_delivery_log"
    ADD CONSTRAINT "notification_delivery_log_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;

-- Row Level Security
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_delivery_log" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON "public"."notifications"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON "public"."notifications"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON "public"."notifications"
    FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_templates (admin only)
CREATE POLICY "Only admins can manage notification templates" ON "public"."notification_templates"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for notification_delivery_log (admin only)
CREATE POLICY "Only admins can view delivery logs" ON "public"."notification_delivery_log"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert delivery logs" ON "public"."notification_delivery_log"
    FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_sensor_id_idx" ON "public"."notifications" USING "btree" ("sensor_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "public"."notifications" USING "btree" ("type");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "public"."notifications" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "notifications_dismissed_at_idx" ON "public"."notifications" USING "btree" ("dismissed_at");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "notification_templates_type_idx" ON "public"."notification_templates" USING "btree" ("type");
CREATE INDEX IF NOT EXISTS "notification_templates_is_active_idx" ON "public"."notification_templates" USING "btree" ("is_active");

CREATE INDEX IF NOT EXISTS "notification_delivery_log_notification_id_idx" ON "public"."notification_delivery_log" USING "btree" ("notification_id");
CREATE INDEX IF NOT EXISTS "notification_delivery_log_status_idx" ON "public"."notification_delivery_log" USING "btree" ("status");

-- Triggers
CREATE TRIGGER "on_notification_updated" BEFORE UPDATE ON "public"."notifications"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_notification_template_updated" BEFORE UPDATE ON "public"."notification_templates"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_notification_delivery_log_updated" BEFORE UPDATE ON "public"."notification_delivery_log"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();