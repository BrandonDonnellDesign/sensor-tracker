-- Populate initial roadmap data

-- Insert initial roadmap items
INSERT INTO roadmap_items (item_id, title, description, status, category, priority, estimated_quarter, icon_name, progress, sort_order) VALUES
('basic-tracking', 'Core Sensor Tracking', 'Essential CGM sensor management and tracking functionality', 'completed', 'core', 'high', 'Q4 2024', 'Target', 100, 1),
('gamification', 'Achievement System', 'Gamification features to motivate consistent CGM usage', 'completed', 'core', 'high', 'Q4 2024', 'Sparkles', 100, 2),
('advanced-analytics', 'Advanced Analytics Dashboard', 'Comprehensive insights and analytics for sensor usage patterns', 'in-progress', 'analytics', 'high', 'Q1 2025', 'BarChart3', 65, 3),
('smart-notifications', 'Smart Notification System', 'AI-powered notifications that learn from your patterns', 'in-progress', 'ai', 'high', 'Q1 2025', 'Brain', 40, 4),
('mobile-app', 'Native Mobile Apps', 'iOS and Android apps with offline capabilities', 'planned', 'mobile', 'high', 'Q2 2025', 'Smartphone', 0, 5),
('cgm-integrations', 'Direct CGM Integrations', 'Connect directly with Dexcom, FreeStyle, and other CGM systems', 'planned', 'integrations', 'high', 'Q2 2025', 'Database', 0, 6),
('security-enhancements', 'Advanced Security & Privacy', 'Enhanced security features and privacy controls', 'planned', 'security', 'high', 'Q2 2025', 'Shield', 0, 7),
('social-features', 'Community & Sharing', 'Connect with other CGM users and share experiences', 'planned', 'social', 'medium', 'Q3 2025', 'Users', 0, 8),
('healthcare-integration', 'Healthcare Provider Portal', 'Tools for healthcare providers to monitor patient sensor usage', 'planned', 'integrations', 'medium', 'Q3 2025', 'Heart', 0, 9),
('ai-insights', 'AI-Powered Insights', 'Machine learning insights for optimal sensor management', 'future', 'ai', 'medium', 'Q4 2025', 'Brain', 0, 10),
('global-expansion', 'Global Expansion', 'Support for international CGM systems and regulations', 'future', 'core', 'low', 'Q1 2026', 'Globe', 0, 11)
ON CONFLICT (item_id) DO NOTHING;

-- Insert features for each roadmap item
INSERT INTO roadmap_features (roadmap_item_id, feature_text, is_completed, sort_order)
SELECT 
    ri.id,
    unnest(ARRAY[
        CASE ri.item_id 
            WHEN 'basic-tracking' THEN ARRAY['Add and manage CGM sensors', 'Track sensor expiration dates', 'Sensor history and timeline', 'Basic notifications', 'Multi-device support']
            WHEN 'gamification' THEN ARRAY['Achievement badges and points', 'Level progression system', 'Streak tracking', 'Customizable achievement widgets', 'Leaderboards']
            WHEN 'advanced-analytics' THEN ARRAY['Sensor performance analytics', 'Usage pattern insights', 'Cost tracking and optimization', 'Predictive sensor replacement alerts', 'Export detailed reports', 'Custom dashboard widgets']
            WHEN 'smart-notifications' THEN ARRAY['Personalized notification timing', 'Smart reminder scheduling', 'Context-aware alerts', 'Multi-channel notifications (email, SMS, push)', 'Machine learning optimization']
            WHEN 'mobile-app' THEN ARRAY['Native iOS and Android apps', 'Offline sensor tracking', 'Push notifications', 'Camera sensor scanning', 'Apple Health & Google Fit integration', 'Widget support']
            WHEN 'cgm-integrations' THEN ARRAY['Dexcom G7 API integration', 'FreeStyle Libre 3 connectivity', 'Medtronic Guardian integration', 'Automatic sensor detection', 'Real-time glucose data overlay', 'Sensor auto-replacement ordering']
            WHEN 'security-enhancements' THEN ARRAY['End-to-end encryption', 'Two-factor authentication', 'Advanced privacy controls', 'HIPAA compliance tools', 'Data export and deletion', 'Audit logs']
            WHEN 'social-features' THEN ARRAY['User community forums', 'Achievement sharing', 'Sensor reviews and ratings', 'Tips and tricks sharing', 'Support groups', 'Mentorship programs']
            WHEN 'healthcare-integration' THEN ARRAY['Provider dashboard', 'Patient sensor compliance reports', 'Automated provider notifications', 'HIPAA-compliant data sharing', 'Integration with EMR systems', 'Telehealth integration']
            WHEN 'ai-insights' THEN ARRAY['Predictive sensor failure detection', 'Optimal placement recommendations', 'Personalized sensor selection advice', 'Usage pattern optimization', 'Automated health insights', 'Predictive analytics dashboard']
            WHEN 'global-expansion' THEN ARRAY['Multi-language support', 'International CGM device support', 'Regional compliance (GDPR, etc.)', 'Local healthcare integrations', 'Currency and unit localization', 'Regional support teams']
        END
    ]) as feature_text,
    CASE WHEN ri.status = 'completed' THEN true ELSE false END as is_completed,
    generate_series(1, array_length(CASE ri.item_id 
        WHEN 'basic-tracking' THEN ARRAY['Add and manage CGM sensors', 'Track sensor expiration dates', 'Sensor history and timeline', 'Basic notifications', 'Multi-device support']
        WHEN 'gamification' THEN ARRAY['Achievement badges and points', 'Level progression system', 'Streak tracking', 'Customizable achievement widgets', 'Leaderboards']
        WHEN 'advanced-analytics' THEN ARRAY['Sensor performance analytics', 'Usage pattern insights', 'Cost tracking and optimization', 'Predictive sensor replacement alerts', 'Export detailed reports', 'Custom dashboard widgets']
        WHEN 'smart-notifications' THEN ARRAY['Personalized notification timing', 'Smart reminder scheduling', 'Context-aware alerts', 'Multi-channel notifications (email, SMS, push)', 'Machine learning optimization']
        WHEN 'mobile-app' THEN ARRAY['Native iOS and Android apps', 'Offline sensor tracking', 'Push notifications', 'Camera sensor scanning', 'Apple Health & Google Fit integration', 'Widget support']
        WHEN 'cgm-integrations' THEN ARRAY['Dexcom G7 API integration', 'FreeStyle Libre 3 connectivity', 'Medtronic Guardian integration', 'Automatic sensor detection', 'Real-time glucose data overlay', 'Sensor auto-replacement ordering']
        WHEN 'security-enhancements' THEN ARRAY['End-to-end encryption', 'Two-factor authentication', 'Advanced privacy controls', 'HIPAA compliance tools', 'Data export and deletion', 'Audit logs']
        WHEN 'social-features' THEN ARRAY['User community forums', 'Achievement sharing', 'Sensor reviews and ratings', 'Tips and tricks sharing', 'Support groups', 'Mentorship programs']
        WHEN 'healthcare-integration' THEN ARRAY['Provider dashboard', 'Patient sensor compliance reports', 'Automated provider notifications', 'HIPAA-compliant data sharing', 'Integration with EMR systems', 'Telehealth integration']
        WHEN 'ai-insights' THEN ARRAY['Predictive sensor failure detection', 'Optimal placement recommendations', 'Personalized sensor selection advice', 'Usage pattern optimization', 'Automated health insights', 'Predictive analytics dashboard']
        WHEN 'global-expansion' THEN ARRAY['Multi-language support', 'International CGM device support', 'Regional compliance (GDPR, etc.)', 'Local healthcare integrations', 'Currency and unit localization', 'Regional support teams']
    END, 1)) as sort_order
FROM roadmap_items ri
ON CONFLICT DO NOTHING;

-- Insert sample tags
INSERT INTO roadmap_tags (roadmap_item_id, tag_name)
SELECT ri.id, unnest(ARRAY[
    CASE ri.item_id 
        WHEN 'basic-tracking' THEN ARRAY['foundation', 'essential']
        WHEN 'gamification' THEN ARRAY['motivation', 'engagement']
        WHEN 'advanced-analytics' THEN ARRAY['insights', 'data', 'reporting']
        WHEN 'smart-notifications' THEN ARRAY['ai', 'personalization', 'alerts']
        WHEN 'mobile-app' THEN ARRAY['mobile', 'offline', 'native']
        WHEN 'cgm-integrations' THEN ARRAY['integration', 'api', 'automation']
        WHEN 'security-enhancements' THEN ARRAY['security', 'privacy', 'compliance']
        WHEN 'social-features' THEN ARRAY['community', 'sharing', 'social']
        WHEN 'healthcare-integration' THEN ARRAY['healthcare', 'providers', 'compliance']
        WHEN 'ai-insights' THEN ARRAY['ai', 'ml', 'predictions', 'optimization']
        WHEN 'global-expansion' THEN ARRAY['international', 'localization', 'compliance']
    END
]) as tag_name
FROM roadmap_items ri
ON CONFLICT (roadmap_item_id, tag_name) DO NOTHING;