-- Update AI moderation stats function to distinguish between auto-rejected and admin-rejected

CREATE OR REPLACE FUNCTION get_ai_moderation_stats(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  since_date TIMESTAMP WITH TIME ZONE;
BEGIN
  since_date := NOW() - (days_back || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'total_moderated', COUNT(*),
    'approved', COUNT(*) FILTER (WHERE action IN ('approved', 'admin_approved')),
    'flagged', COUNT(*) FILTER (WHERE action = 'flagged'),
    'rejected', COUNT(*) FILTER (WHERE action = 'rejected'), -- Only auto-rejected by AI
    'admin_rejected', COUNT(*) FILTER (WHERE action = 'admin_rejected'), -- Manually rejected by admin
    'admin_approved', COUNT(*) FILTER (WHERE action = 'admin_approved'), -- Manually approved by admin
    'avg_confidence', ROUND(AVG(confidence_score)),
    'avg_quality', ROUND(AVG(quality_score)),
    'spam_detected', COUNT(*) FILTER (WHERE is_spam = true),
    'inappropriate_detected', COUNT(*) FILTER (WHERE is_inappropriate = true),
    'off_topic_detected', COUNT(*) FILTER (WHERE is_off_topic = true),
    'misinformation_detected', COUNT(*) FILTER (WHERE is_medical_misinformation = true),
    'by_content_type', json_build_object(
      'tips', COUNT(*) FILTER (WHERE content_type = 'tip'),
      'comments', COUNT(*) FILTER (WHERE content_type = 'comment')
    )
  ) INTO result
  FROM ai_moderation_log
  WHERE created_at >= since_date;
  
  RETURN result;
END;
$$;