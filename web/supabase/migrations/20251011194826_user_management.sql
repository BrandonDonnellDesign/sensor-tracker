-- User Management Migration
-- Contains user profiles and user-related functions
-- Migration: 20251011194826_user_management.sql

-- User profiles table
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "timezone" "text",
    "avatar_url" "text",
    "notifications_enabled" boolean DEFAULT false,
    "dark_mode_enabled" boolean DEFAULT false,
    "glucose_unit" "text" DEFAULT 'mg/dL'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone,
    "role" "text" DEFAULT 'user'::"text",
    "push_notifications_enabled" boolean DEFAULT false,
    "in_app_notifications_enabled" boolean DEFAULT true,
    "warning_days_before" integer DEFAULT 3,
    "critical_days_before" integer DEFAULT 1,
    "date_format" "text" DEFAULT 'MM/DD/YYYY'::"text",
    "time_format" "text" DEFAULT '12'::"text",
    CONSTRAINT "profiles_glucose_unit_check" CHECK (("glucose_unit" = ANY (ARRAY['mg/dL'::"text", 'mmol/L'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";

-- Admin analytics view for active users
CREATE OR REPLACE VIEW "public"."admin_active_users_30d" WITH ("security_invoker"='true') AS
 SELECT ("date_trunc"('day'::"text", "updated_at"))::"date" AS "day",
    "count"(DISTINCT "id") AS "active_users"
   FROM "public"."profiles"
  WHERE ("updated_at" >= ("now"() - '30 days'::interval))
  GROUP BY (("date_trunc"('day'::"text", "updated_at"))::"date")
  ORDER BY (("date_trunc"('day'::"text", "updated_at"))::"date") DESC;
ALTER VIEW "public"."admin_active_users_30d" OWNER TO "postgres";
COMMENT ON VIEW "public"."admin_active_users_30d" IS 'Admin analytics view - access controlled by application-level role checks';

-- User management functions
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (new.id);
    RETURN new;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."handle_new_user"() IS 'New user creation function with fixed search_path for security';

CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."handle_updated_at"() IS 'Profile update timestamp function with fixed search_path for security';

CREATE OR REPLACE FUNCTION "public"."is_current_user_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$;
ALTER FUNCTION "public"."is_current_user_admin"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."is_current_user_admin"() IS 'Check if current user has admin role';

-- Row Level Security for profiles
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON "public"."profiles"
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON "public"."profiles"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON "public"."profiles"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS "profiles_id_idx" ON "public"."profiles" USING "btree" ("id");
CREATE INDEX IF NOT EXISTS "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");
CREATE INDEX IF NOT EXISTS "profiles_updated_at_idx" ON "public"."profiles" USING "btree" ("updated_at");

-- Triggers for profiles
CREATE TRIGGER "on_profile_updated" BEFORE UPDATE ON "public"."profiles"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();