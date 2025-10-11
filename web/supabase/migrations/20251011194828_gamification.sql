-- Gamification Migration
-- Contains achievements, user achievements, and gamification statistics
-- Migration: 20251011194828_gamification.sql

-- Achievements table
CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text" NOT NULL,
    "icon" character varying(50) NOT NULL,
    "category" character varying(50) NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "badge_color" character varying(20) DEFAULT 'blue'::character varying,
    "requirement_type" character varying(50) NOT NULL,
    "requirement_value" integer,
    "requirement_data" "jsonb",
    "is_repeatable" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."achievements" OWNER TO "postgres";

-- User achievements table
CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"(),
    "progress_data" "jsonb"
);
ALTER TABLE "public"."user_achievements" OWNER TO "postgres";

-- User gamification stats table
CREATE TABLE IF NOT EXISTS "public"."user_gamification_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "sensors_tracked" integer DEFAULT 0,
    "successful_sensors" integer DEFAULT 0,
    "achievements_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "analytics_views" integer DEFAULT 0,
    "stable_sensors" integer DEFAULT 0,
    "archived_sensors" integer DEFAULT 0,
    "account_age_days" integer DEFAULT 0,
    "sensor_edits" integer DEFAULT 0,
    "tags_used" integer DEFAULT 0,
    "sensors_total" integer DEFAULT 0,
    "photos_added" integer DEFAULT 0,
    "page_visited" integer DEFAULT 0,
    "achievement_completion" integer DEFAULT 0
);
ALTER TABLE "public"."user_gamification_stats" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_gamification_stats"."analytics_views" IS 'Number of times user viewed analytics/charts';

-- Daily activities table
CREATE TABLE IF NOT EXISTS "public"."daily_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_date" "date" NOT NULL,
    "activity_type" "text" NOT NULL,
    "activity_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."daily_activities" OWNER TO "postgres";

-- Foreign key constraints
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id");

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_gamification_stats"
    ADD CONSTRAINT "user_gamification_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."daily_activities"
    ADD CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Row Level Security
ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_gamification_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_activities" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (publicly readable)
CREATE POLICY "Achievements are publicly readable" ON "public"."achievements"
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify achievements" ON "public"."achievements"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON "public"."user_achievements"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON "public"."user_achievements"
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_gamification_stats
CREATE POLICY "Users can view their own gamification stats" ON "public"."user_gamification_stats"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage gamification stats" ON "public"."user_gamification_stats"
    FOR ALL USING (true);

-- RLS Policies for daily_activities
CREATE POLICY "Users can view their own daily activities" ON "public"."daily_activities"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage daily activities" ON "public"."daily_activities"
    FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS "achievements_category_idx" ON "public"."achievements" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "achievements_is_active_idx" ON "public"."achievements" USING "btree" ("is_active");

CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "public"."user_achievements" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "user_achievements_achievement_id_idx" ON "public"."user_achievements" USING "btree" ("achievement_id");
CREATE INDEX IF NOT EXISTS "user_achievements_earned_at_idx" ON "public"."user_achievements" USING "btree" ("earned_at");

CREATE INDEX IF NOT EXISTS "user_gamification_stats_user_id_idx" ON "public"."user_gamification_stats" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "daily_activities_user_id_idx" ON "public"."daily_activities" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "daily_activities_activity_date_idx" ON "public"."daily_activities" USING "btree" ("activity_date");
CREATE INDEX IF NOT EXISTS "daily_activities_activity_type_idx" ON "public"."daily_activities" USING "btree" ("activity_type");

-- Triggers
CREATE TRIGGER "on_achievement_updated" BEFORE UPDATE ON "public"."achievements"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_user_gamification_stats_updated" BEFORE UPDATE ON "public"."user_gamification_stats"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "on_daily_activity_updated" BEFORE UPDATE ON "public"."daily_activities"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();