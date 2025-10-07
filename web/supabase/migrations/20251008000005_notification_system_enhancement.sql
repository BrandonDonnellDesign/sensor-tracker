-- Notification System Enhancement Migration
-- Adds comprehensive notification system with templates, retry mechanisms, and delivery tracking
-- Created: 2024-10-06

-- 1. First, let's check if the notifications table exists and update it
-- If the table doesn't exist, create it. If it exists, add the new columns.

-- Create notifications table with enhanced schema
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sensor_id UUID REFERENCES sensors(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dismissed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    delivery_status TEXT CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
    template_id UUID,
    template_variant TEXT
);

-- Add new columns to existing notifications table (if it already exists)
-- These will fail silently if columns already exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'));
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Add retry_count column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN retry_count INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Add last_retry_at column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Add delivery_status column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN delivery_status TEXT CHECK (delivery_status IN ('pending', 'delivered', 'failed'));
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Add template_id column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN template_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Add template_variant column if it doesn't exist
    BEGIN
        ALTER TABLE notifications ADD COLUMN template_variant TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    variables JSONB,
    ab_test_group TEXT,
    ab_test_weight INTEGER DEFAULT 1
);

-- 3. Create notification_delivery_log table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider TEXT NOT NULL,
    provider_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_template_id ON notifications(template_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_created_at ON notification_delivery_log(created_at);

-- 5. Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_delivery_log_updated_at ON notification_delivery_log;
CREATE TRIGGER update_notification_delivery_log_updated_at
    BEFORE UPDATE ON notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Set up Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;
CREATE POLICY "Admins can update all notifications" ON notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Notification templates policies (admin only)
DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;
CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Notification delivery log policies (admin only)
DROP POLICY IF EXISTS "Admins can manage delivery logs" ON notification_delivery_log;
CREATE POLICY "Admins can manage delivery logs" ON notification_delivery_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 9. Insert some sample notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, variables, ab_test_group, ab_test_weight)
VALUES 
    (
        'Sensor Expiry Warning - Friendly',
        'sensor_expiry_warning',
        'Time to replace your sensor!',
        'Hi {{userName}}, your sensor {{sensorSerial}} will expire in {{daysLeft}} days. Don''t forget to replace it to keep tracking your glucose levels.',
        '{"userName": "string", "sensorSerial": "string", "daysLeft": "number"}',
        'friendly',
        50
    ),
    (
        'Sensor Expiry Warning - Urgent',
        'sensor_expiry_warning',
        '⚠️ Sensor expiring soon!',
        'URGENT: Your sensor {{sensorSerial}} expires in {{daysLeft}} days. Replace it now to avoid gaps in your glucose monitoring.',
        '{"userName": "string", "sensorSerial": "string", "daysLeft": "number"}',
        'urgent',
        50
    ),
    (
        'Sensor Expired',
        'sensor_expired',
        'Sensor has expired',
        'Your sensor {{sensorSerial}} has expired. Please replace it immediately to continue monitoring your glucose levels.',
        '{"sensorSerial": "string"}',
        'default',
        100
    ),
    (
        'Welcome Message',
        'welcome',
        'Welcome to Sensor Tracker!',
        'Hi {{userName}}, welcome to Sensor Tracker! We''re here to help you manage your glucose sensors effectively.',
        '{"userName": "string"}',
        'default',
        100
    )
ON CONFLICT DO NOTHING;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON notification_delivery_log TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;