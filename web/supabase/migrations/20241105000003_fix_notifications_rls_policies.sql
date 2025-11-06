-- Fix Notifications RLS Policies Migration
-- Adds proper RLS policies for notifications table to allow inserts and selects

-- Enable RLS on notifications table (if not already enabled)
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can insert their own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can update their own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "System can insert notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Triggers can insert notifications" ON "public"."notifications";

-- Policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications" ON "public"."notifications"
    FOR SELECT USING (
        auth.uid() = user_id::uuid
    );

-- Policy for users to update their own notifications (mark as read, dismiss)
CREATE POLICY "Users can update their own notifications" ON "public"."notifications"
    FOR UPDATE USING (
        auth.uid() = user_id::uuid
    );

-- Policy for users to insert their own notifications (for testing)
CREATE POLICY "Users can insert their own notifications" ON "public"."notifications"
    FOR INSERT WITH CHECK (
        auth.uid() = user_id::uuid
    );

-- Policy for system/triggers to insert notifications (using service role)
CREATE POLICY "System can insert notifications" ON "public"."notifications"
    FOR INSERT WITH CHECK (
        -- Allow service role to insert notifications for any user
        auth.jwt() ->> 'role' = 'service_role'
        OR
        -- Allow authenticated users to insert for themselves
        auth.uid() = user_id::uuid
    );

-- Add default values for required fields
ALTER TABLE "public"."notifications" 
    ALTER COLUMN "read" SET DEFAULT false;

ALTER TABLE "public"."notifications" 
    ALTER COLUMN "retry_count" SET DEFAULT 0;

ALTER TABLE "public"."notifications" 
    ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."notifications" 
    ALTER COLUMN "updated_at" SET DEFAULT now();

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON "public"."notifications";
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON "public"."notifications"
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
    ON "public"."notifications" (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read 
    ON "public"."notifications" (user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_dismissed 
    ON "public"."notifications" (user_id, dismissed_at) 
    WHERE dismissed_at IS NULL;

-- Log the policy creation
INSERT INTO "public"."system_logs" (
    "level",
    "category", 
    "message",
    "metadata"
) VALUES (
    'info',
    'database_security',
    'Notifications RLS policies created and updated',
    '{"policies_created": ["view_own", "update_own", "insert_own", "system_insert"], "defaults_added": ["read", "retry_count", "timestamps"]}'::jsonb
) ON CONFLICT DO NOTHING;