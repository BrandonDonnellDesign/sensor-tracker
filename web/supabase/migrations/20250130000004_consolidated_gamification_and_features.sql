-- Consolidated Gamification and Feature Systems
-- Combines achievements, roadmap, notifications, and daily activities

-- Create achievements table
CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" DEFAULT '🏆' NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "category" "text" DEFAULT 'general' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "progress" integer DEFAULT 100 NOT NULL
);

-- Create daily activities table
CREATE TABLE IF NOT EXISTS "public"."daily_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_date" date DEFAULT CURRENT_DATE NOT NULL,
    "sensors_added" integer DEFAULT 0 NOT NULL,
    "glucose_readings" integer DEFAULT 0 NOT NULL,
    "food_logs" integer DEFAULT 0 NOT NULL,
    "total_points" integer DEFAULT 0 NOT NULL,
    "streak_days" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending' NOT NULL,
    "delivery_status" "text" DEFAULT 'pending' NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create roadmap tables
CREATE TABLE IF NOT EXISTS "public"."roadmap_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'planned' NOT NULL,
    "priority" "text" DEFAULT 'medium' NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "target_date" date,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."roadmap_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roadmap_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."roadmap_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roadmap_item_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "email" "text",
    "status" "text" DEFAULT 'open' NOT NULL,
    "priority" "text" DEFAULT 'medium' NOT NULL,
    "admin_response" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add primary keys
ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."daily_activities"
    ADD CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roadmap_items"
    ADD CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roadmap_features"
    ADD CONSTRAINT "roadmap_features_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roadmap_tags"
    ADD CONSTRAINT "roadmap_tags_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");

ALTER TABLE ONLY "public"."daily_activities"
    ADD CONSTRAINT "daily_activities_user_id_activity_date_key" UNIQUE ("user_id", "activity_date");

ALTER TABLE ONLY "public"."roadmap_items"
    ADD CONSTRAINT "roadmap_items_item_id_key" UNIQUE ("item_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."daily_activities"
    ADD CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."roadmap_features"
    ADD CONSTRAINT "roadmap_features_roadmap_item_id_fkey" FOREIGN KEY ("roadmap_item_id") REFERENCES "public"."roadmap_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."roadmap_tags"
    ADD CONSTRAINT "roadmap_tags_roadmap_item_id_fkey" FOREIGN KEY ("roadmap_item_id") REFERENCES "public"."roadmap_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "public"."user_achievements" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "daily_activities_user_id_idx" ON "public"."daily_activities" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "daily_activities_activity_date_idx" ON "public"."daily_activities" USING "btree" ("activity_date");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "public"."notifications" USING "btree" ("is_read");
CREATE INDEX IF NOT EXISTS "roadmap_items_status_idx" ON "public"."roadmap_items" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "public"."feedback" USING "btree" ("status");

-- Create recent daily activities view
CREATE OR REPLACE VIEW "public"."recent_daily_activities" AS
SELECT 
    da.*,
    p.full_name,
    p.email
FROM public.daily_activities da
JOIN public.profiles p ON da.user_id = p.id
WHERE da.activity_date >= CURRENT_DATE - interval '7 days'
ORDER BY da.activity_date DESC, da.total_points DESC;

-- Function to update daily activity
CREATE OR REPLACE FUNCTION public.update_daily_activity(
    p_user_id uuid,
    p_activity_type text,
    p_increment integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_points integer := 0;
BEGIN
    -- Calculate points based on activity type
    CASE p_activity_type
        WHEN 'sensor_added' THEN v_points := 10;
        WHEN 'glucose_reading' THEN v_points := 1;
        WHEN 'food_log' THEN v_points := 5;
        ELSE v_points := 1;
    END CASE;
    
    -- Insert or update daily activity
    INSERT INTO public.daily_activities (
        user_id,
        activity_date,
        sensors_added,
        glucose_readings,
        food_logs,
        total_points
    ) VALUES (
        p_user_id,
        v_today,
        CASE WHEN p_activity_type = 'sensor_added' THEN p_increment ELSE 0 END,
        CASE WHEN p_activity_type = 'glucose_reading' THEN p_increment ELSE 0 END,
        CASE WHEN p_activity_type = 'food_log' THEN p_increment ELSE 0 END,
        v_points * p_increment
    )
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET
        sensors_added = daily_activities.sensors_added + 
            CASE WHEN p_activity_type = 'sensor_added' THEN p_increment ELSE 0 END,
        glucose_readings = daily_activities.glucose_readings + 
            CASE WHEN p_activity_type = 'glucose_reading' THEN p_increment ELSE 0 END,
        food_logs = daily_activities.food_logs + 
            CASE WHEN p_activity_type = 'food_log' THEN p_increment ELSE 0 END,
        total_points = daily_activities.total_points + (v_points * p_increment),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate streak
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_streak integer := 0;
    v_current_date date := CURRENT_DATE;
    v_check_date date;
BEGIN
    -- Start from yesterday and count backwards
    v_check_date := v_current_date - 1;
    
    WHILE EXISTS (
        SELECT 1 FROM public.daily_activities 
        WHERE user_id = p_user_id 
        AND activity_date = v_check_date 
        AND total_points > 0
    ) LOOP
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own achievements" ON "public"."user_achievements"
    FOR SELECT USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can view their own daily activities" ON "public"."daily_activities"
    FOR SELECT USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can manage their own notifications" ON "public"."notifications"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can create feedback" ON "public"."feedback"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own feedback" ON "public"."feedback"
    FOR SELECT USING ("user_id" = "auth"."uid"() OR "user_id" IS NULL);

-- Achievements are publicly readable
CREATE POLICY "Achievements are publicly readable" ON "public"."achievements"
    FOR SELECT USING (true);

-- Roadmap is publicly readable
CREATE POLICY "Roadmap is publicly readable" ON "public"."roadmap_items"
    FOR SELECT USING (true);

CREATE POLICY "Roadmap features are publicly readable" ON "public"."roadmap_features"
    FOR SELECT USING (true);

CREATE POLICY "Roadmap tags are publicly readable" ON "public"."roadmap_tags"
    FOR SELECT USING (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_daily_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_streak TO authenticated;

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, points, category) VALUES
('First Sensor', 'Added your first sensor', '🎯', 10, 'sensors'),
('Sensor Veteran', 'Added 10 sensors', '🏆', 50, 'sensors'),
('Glucose Tracker', 'Logged 100 glucose readings', '📊', 30, 'glucose'),
('Food Logger', 'Logged 50 meals', '🍽️', 25, 'food'),
('Week Warrior', 'Maintained a 7-day streak', '🔥', 40, 'streaks'),
('Month Master', 'Maintained a 30-day streak', '👑', 100, 'streaks')
ON CONFLICT DO NOTHING;

COMMENT ON FUNCTION public.update_daily_activity IS 'Updates daily activity metrics and points for a user';
COMMENT ON FUNCTION public.calculate_user_streak IS 'Calculates the current streak for a user based on daily activities';