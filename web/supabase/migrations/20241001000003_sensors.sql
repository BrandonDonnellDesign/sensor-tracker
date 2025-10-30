-- Sensors Migration
-- Contains sensor tables, models, photos, and tags
-- Migration: 20251011194827_sensors.sql

-- Sensor models table
CREATE TABLE IF NOT EXISTS "public"."sensor_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manufacturer" "text" NOT NULL,
    "model_name" "text" NOT NULL,
    "duration_days" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sensor_models_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."sensor_models" OWNER TO "postgres";

-- Sensors table
CREATE TABLE IF NOT EXISTS "public"."sensors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "serial_number" "text" NOT NULL,
    "lot_number" "text",
    "date_added" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_problematic" boolean DEFAULT false NOT NULL,
    "issue_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "synced_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "sensor_model_id" "uuid" NOT NULL,
    "sensor_type" "public"."sensor_type" DEFAULT 'dexcom'::"sensor_type",
    "archived_at" timestamp with time zone,
    "tags" "text"[],
    "notes" "text",
    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."sensors" OWNER TO "postgres";

-- Sensor photos table
CREATE TABLE IF NOT EXISTS "public"."sensor_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sensor_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "sensor_photos_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."sensor_photos" OWNER TO "postgres";

-- Tags table
CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#6b7280'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."tags" OWNER TO "postgres";

-- Sensor tags junction table
CREATE TABLE IF NOT EXISTS "public"."sensor_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sensor_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "sensor_tags_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "public"."sensor_tags" OWNER TO "postgres";

-- Foreign key constraints
ALTER TABLE ONLY "public"."sensors"
    ADD CONSTRAINT "sensors_sensor_model_id_fkey" FOREIGN KEY ("sensor_model_id") REFERENCES "public"."sensor_models"("id");

ALTER TABLE ONLY "public"."sensor_photos"
    ADD CONSTRAINT "sensor_photos_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sensor_photos"
    ADD CONSTRAINT "sensor_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sensor_tags"
    ADD CONSTRAINT "sensor_tags_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensors"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sensor_tags"
    ADD CONSTRAINT "sensor_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;

-- Row Level Security
ALTER TABLE "public"."sensor_models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sensors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sensor_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sensor_tags" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensor_models (publicly readable)
CREATE POLICY "Sensor models are publicly readable" ON "public"."sensor_models"
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify sensor models" ON "public"."sensor_models"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for sensors
CREATE POLICY "Users can view their own sensors" ON "public"."sensors"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensors" ON "public"."sensors"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sensors" ON "public"."sensors"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sensors" ON "public"."sensors"
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sensor_photos
CREATE POLICY "Users can view photos of their own sensors" ON "public"."sensor_photos"
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.sensors
            WHERE id = sensor_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload photos for their own sensors" ON "public"."sensor_photos"
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.sensors
            WHERE id = sensor_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos of their own sensors" ON "public"."sensor_photos"
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.sensors
            WHERE id = sensor_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for tags (publicly readable)
CREATE POLICY "Tags are publicly readable" ON "public"."tags"
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tags" ON "public"."tags"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for sensor_tags
CREATE POLICY "Users can view tags for their own sensors" ON "public"."sensor_tags"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sensors
            WHERE id = sensor_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tags for their own sensors" ON "public"."sensor_tags"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sensors
            WHERE id = sensor_id AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS "sensor_models_id_idx" ON "public"."sensor_models" USING "btree" ("id");
CREATE INDEX IF NOT EXISTS "sensor_models_is_active_idx" ON "public"."sensor_models" USING "btree" ("is_active");

CREATE INDEX IF NOT EXISTS "sensors_user_id_idx" ON "public"."sensors" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "sensors_sensor_model_id_idx" ON "public"."sensors" USING "btree" ("sensor_model_id");
CREATE INDEX IF NOT EXISTS "sensors_is_deleted_idx" ON "public"."sensors" USING "btree" ("is_deleted");
CREATE INDEX IF NOT EXISTS "sensors_date_added_idx" ON "public"."sensors" USING "btree" ("date_added");
CREATE INDEX IF NOT EXISTS "sensors_archived_at_idx" ON "public"."sensors" USING "btree" ("archived_at");

CREATE INDEX IF NOT EXISTS "sensor_photos_sensor_id_idx" ON "public"."sensor_photos" USING "btree" ("sensor_id");
CREATE INDEX IF NOT EXISTS "sensor_photos_user_id_idx" ON "public"."sensor_photos" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "tags_name_idx" ON "public"."tags" USING "btree" ("name");
CREATE INDEX IF NOT EXISTS "tags_category_idx" ON "public"."tags" USING "btree" ("category");

CREATE INDEX IF NOT EXISTS "sensor_tags_sensor_id_idx" ON "public"."sensor_tags" USING "btree" ("sensor_id");
CREATE INDEX IF NOT EXISTS "sensor_tags_tag_id_idx" ON "public"."sensor_tags" USING "btree" ("tag_id");

-- Triggers
CREATE TRIGGER "on_sensor_updated" BEFORE UPDATE ON "public"."sensors"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_sensor_model_updated" BEFORE UPDATE ON "public"."sensor_models"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_tag_updated" BEFORE UPDATE ON "public"."tags"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();