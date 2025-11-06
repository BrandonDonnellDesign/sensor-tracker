-- Enhanced Notification System Migration
-- Adds support for predictive alerts, pattern recognition, and notification rules

-- Create notification_rules table for user-defined notification preferences
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('glucose_threshold', 'iob_limit', 'prediction_alert', 'pattern_detection')),
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create glucose_patterns table for pattern recognition
CREATE TABLE IF NOT EXISTS glucose_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('dawn_phenomenon', 'post_meal', 'exercise_drop', 'stress_spike', 'sleep_pattern')),
    typical_duration INTEGER, -- minutes
    glucose_change NUMERIC, -- mg/dL
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    last_occurrence TIMESTAMP WITH TIME ZONE,
    frequency INTEGER DEFAULT 0, -- occurrences per week
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create glucose_predictions table for storing prediction history
CREATE TABLE IF NOT EXISTS glucose_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    predicted_glucose NUMERIC NOT NULL,
    actual_glucose NUMERIC, -- filled in later for accuracy tracking
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    time_horizon INTEGER NOT NULL, -- minutes
    prediction_factors JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_reading_at TIMESTAMP WITH TIME ZONE -- when actual glucose was recorded
);

-- Enhance existing notifications table with new fields
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS subtype TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prediction_data JSONB,
ADD COLUMN IF NOT EXISTS pattern_data JSONB,
ADD COLUMN IF NOT EXISTS confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id ON notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_glucose_patterns_user_id ON glucose_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_glucose_patterns_type ON glucose_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_glucose_predictions_user_id ON glucose_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_glucose_predictions_created_at ON glucose_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_subtype ON notifications(subtype);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Create RLS policies for notification_rules
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification rules" ON notification_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification rules" ON notification_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification rules" ON notification_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification rules" ON notification_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for glucose_patterns
ALTER TABLE glucose_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own glucose patterns" ON glucose_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own glucose patterns" ON glucose_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own glucose patterns" ON glucose_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own glucose patterns" ON glucose_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for glucose_predictions
ALTER TABLE glucose_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own glucose predictions" ON glucose_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own glucose predictions" ON glucose_predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own glucose predictions" ON glucose_predictions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to update prediction accuracy
CREATE OR REPLACE FUNCTION update_prediction_accuracy()
RETURNS void AS $$
BEGIN
    -- Update predictions with actual glucose values
    UPDATE glucose_predictions gp
    SET 
        actual_glucose = gr.glucose_value,
        actual_reading_at = gr.timestamp
    FROM glucose_readings gr
    WHERE 
        gp.user_id = gr.user_id
        AND gp.actual_glucose IS NULL
        AND gr.timestamp >= gp.created_at + (gp.time_horizon || ' minutes')::interval
        AND gr.timestamp <= gp.created_at + (gp.time_horizon + 10 || ' minutes')::interval -- 10 minute window
    ORDER BY ABS(EXTRACT(EPOCH FROM (gr.timestamp - (gp.created_at + (gp.time_horizon || ' minutes')::interval))))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect glucose patterns
CREATE OR REPLACE FUNCTION detect_glucose_patterns(p_user_id UUID)
RETURNS void AS $$
DECLARE
    dawn_readings RECORD;
    pattern_exists BOOLEAN;
BEGIN
    -- Dawn phenomenon detection (4-8 AM readings)
    SELECT 
        COUNT(*) as reading_count,
        AVG(glucose_value) as avg_glucose,
        STDDEV(glucose_value) as glucose_stddev
    INTO dawn_readings
    FROM glucose_readings
    WHERE 
        user_id = p_user_id
        AND EXTRACT(HOUR FROM timestamp) BETWEEN 4 AND 8
        AND timestamp >= NOW() - INTERVAL '7 days';

    -- Check if dawn phenomenon pattern exists
    SELECT EXISTS(
        SELECT 1 FROM glucose_patterns 
        WHERE user_id = p_user_id AND pattern_type = 'dawn_phenomenon'
    ) INTO pattern_exists;

    -- Insert or update dawn phenomenon pattern
    IF dawn_readings.reading_count >= 5 AND dawn_readings.glucose_stddev > 20 THEN
        IF pattern_exists THEN
            UPDATE glucose_patterns 
            SET 
                glucose_change = dawn_readings.avg_glucose,
                confidence = LEAST(dawn_readings.reading_count / 20.0, 1.0),
                frequency = dawn_readings.reading_count,
                last_occurrence = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id AND pattern_type = 'dawn_phenomenon';
        ELSE
            INSERT INTO glucose_patterns (
                user_id, pattern_type, typical_duration, glucose_change, 
                confidence, last_occurrence, frequency
            ) VALUES (
                p_user_id, 'dawn_phenomenon', 240, -- 4 hours
                dawn_readings.avg_glucose,
                LEAST(dawn_readings.reading_count / 20.0, 1.0),
                NOW(),
                dawn_readings.reading_count
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_rules_updated_at 
    BEFORE UPDATE ON notification_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_patterns_updated_at 
    BEFORE UPDATE ON glucose_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification rules for existing users
INSERT INTO notification_rules (user_id, rule_type, conditions, actions, priority)
SELECT 
    id as user_id,
    'glucose_threshold' as rule_type,
    '{"low_threshold": 70, "high_threshold": 180}' as conditions,
    '{"send_notification": true, "severity": "high"}' as actions,
    1 as priority
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_rules WHERE rule_type = 'glucose_threshold')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE notification_rules IS 'User-defined rules for when and how to send notifications';
COMMENT ON TABLE glucose_patterns IS 'Detected glucose patterns for each user';
COMMENT ON TABLE glucose_predictions IS 'Historical glucose predictions for accuracy tracking';

-- Grant necessary permissions
GRANT ALL ON notification_rules TO authenticated;
GRANT ALL ON glucose_patterns TO authenticated;
GRANT ALL ON glucose_predictions TO authenticated;