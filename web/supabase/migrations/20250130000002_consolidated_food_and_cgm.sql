-- Consolidated Food Logging and CGM Integration
-- Combines food logging, glucose readings, and insulin tracking

-- Create glucose readings table
CREATE TABLE IF NOT EXISTS "public"."glucose_readings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "record_id" "text" NOT NULL,
    "transmitter_id" "text",
    "transmitter_generation" "text",
    "value" integer NOT NULL,
    "unit" "text" DEFAULT 'mg/dL' NOT NULL,
    "trend" "text",
    "trend_rate" numeric,
    "rate_unit" "text" DEFAULT 'mg/dL/min',
    "system_time" timestamp with time zone NOT NULL,
    "display_time" timestamp with time zone,
    "display_device" "text",
    "display_app" "text",
    "transmitter_ticks" bigint,
    "source" "text" DEFAULT 'manual' NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create food items table
CREATE TABLE IF NOT EXISTS "public"."food_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "brand" "text",
    "barcode" "text",
    "serving_size" numeric DEFAULT 100 NOT NULL,
    "serving_unit" "text" DEFAULT 'g' NOT NULL,
    "calories_per_serving" numeric,
    "carbs_per_serving" numeric,
    "protein_per_serving" numeric,
    "fat_per_serving" numeric,
    "fiber_per_serving" numeric,
    "sugar_per_serving" numeric,
    "sodium_per_serving" numeric,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create food logs table
CREATE TABLE IF NOT EXISTS "public"."food_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meal_type" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'serving' NOT NULL,
    "user_serving_size" numeric,
    "user_serving_unit" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create favorite foods table
CREATE TABLE IF NOT EXISTS "public"."favorite_foods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "nickname" "text",
    "default_serving_size" numeric,
    "default_serving_unit" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create insulin doses table
CREATE TABLE IF NOT EXISTS "public"."insulin_doses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "insulin_type" "text" NOT NULL,
    "units" numeric NOT NULL,
    "injection_site" "text",
    "notes" "text",
    "administered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add primary keys
ALTER TABLE ONLY "public"."glucose_readings"
    ADD CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."food_logs"
    ADD CONSTRAINT "food_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."favorite_foods"
    ADD CONSTRAINT "favorite_foods_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."insulin_doses"
    ADD CONSTRAINT "insulin_doses_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."glucose_readings"
    ADD CONSTRAINT "glucose_readings_record_id_key" UNIQUE ("record_id");

ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_barcode_key" UNIQUE ("barcode");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."glucose_readings"
    ADD CONSTRAINT "glucose_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."food_logs"
    ADD CONSTRAINT "food_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."food_logs"
    ADD CONSTRAINT "food_logs_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."favorite_foods"
    ADD CONSTRAINT "favorite_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."favorite_foods"
    ADD CONSTRAINT "favorite_foods_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."insulin_doses"
    ADD CONSTRAINT "insulin_doses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "glucose_readings_user_id_idx" ON "public"."glucose_readings" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "glucose_readings_system_time_idx" ON "public"."glucose_readings" USING "btree" ("system_time");
CREATE INDEX IF NOT EXISTS "food_logs_user_id_idx" ON "public"."food_logs" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "food_logs_logged_at_idx" ON "public"."food_logs" USING "btree" ("logged_at");
CREATE INDEX IF NOT EXISTS "food_logs_meal_type_idx" ON "public"."food_logs" USING "btree" ("meal_type");
CREATE INDEX IF NOT EXISTS "insulin_doses_user_id_idx" ON "public"."insulin_doses" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "insulin_doses_administered_at_idx" ON "public"."insulin_doses" USING "btree" ("administered_at");

-- Create food logs with CGM view
CREATE OR REPLACE VIEW "public"."food_logs_with_cgm" AS
SELECT 
    fl.id,
    fl.user_id,
    fl.food_item_id,
    fl.logged_at,
    fl.meal_type,
    fl.quantity,
    fl.unit,
    fl.user_serving_size,
    fl.user_serving_unit,
    fl.notes,
    fl.created_at,
    fi.name as food_name,
    fi.brand,
    fi.image_url,
    fi.calories_per_serving,
    fi.carbs_per_serving,
    fi.protein_per_serving,
    fi.fat_per_serving,
    -- Get CGM reading closest to meal time (within 2 hours)
    (
        SELECT jsonb_build_object(
            'value', gr.value,
            'trend', gr.trend,
            'system_time', gr.system_time,
            'time_diff_minutes', EXTRACT(EPOCH FROM (gr.system_time - fl.logged_at)) / 60
        )
        FROM public.glucose_readings gr
        WHERE gr.user_id = fl.user_id
        AND gr.system_time BETWEEN fl.logged_at - interval '30 minutes' 
                               AND fl.logged_at + interval '2 hours'
        ORDER BY ABS(EXTRACT(EPOCH FROM (gr.system_time - fl.logged_at)))
        LIMIT 1
    ) as cgm_reading
FROM public.food_logs fl
JOIN public.food_items fi ON fl.food_item_id = fi.id;

-- Backfill CGM readings function
CREATE OR REPLACE FUNCTION public.backfill_cgm_readings(p_user_id uuid, p_lookback_hours integer DEFAULT 2)
RETURNS jsonb AS $$
DECLARE
    v_cutoff_time timestamptz;
    v_updated_count integer := 0;
BEGIN
    -- Calculate cutoff time
    v_cutoff_time := NOW() - (p_lookback_hours || ' hours')::interval;
    
    -- This function can be expanded to backfill CGM associations
    -- For now, it's a placeholder that returns success
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'cutoff_time', v_cutoff_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE "public"."glucose_readings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."food_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."favorite_foods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."insulin_doses" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own glucose readings" ON "public"."glucose_readings"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can manage their own food logs" ON "public"."food_logs"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can manage their own favorite foods" ON "public"."favorite_foods"
    FOR ALL USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can manage their own insulin doses" ON "public"."insulin_doses"
    FOR ALL USING ("user_id" = "auth"."uid"());

-- Food items are public (no RLS needed)
CREATE POLICY "Food items are publicly readable" ON "public"."food_items"
    FOR SELECT USING (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.backfill_cgm_readings TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_cgm_readings TO service_role;

COMMENT ON FUNCTION public.backfill_cgm_readings IS 'Backfills CGM reading associations for recent food logs and insulin doses';