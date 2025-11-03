-- Safe update for existing Web Vitals monitoring setup
-- This script updates the metric_name constraint to use INP instead of FID

-- Update the constraint to include INP instead of FID
ALTER TABLE web_vitals DROP CONSTRAINT IF EXISTS web_vitals_metric_name_check;
ALTER TABLE web_vitals ADD CONSTRAINT web_vitals_metric_name_check 
  CHECK (metric_name IN ('CLS', 'INP', 'FCP', 'LCP', 'TTFB'));

-- Update any existing FID records to INP (if any exist)
UPDATE web_vitals SET metric_name = 'INP' WHERE metric_name = 'FID';

-- Refresh the performance summary view
DROP VIEW IF EXISTS performance_summary;
CREATE VIEW performance_summary AS
SELECT 
  metric_name,
  COUNT(*) as total_measurements,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value,
  COUNT(CASE WHEN metric_rating = 'good' THEN 1 END) * 100.0 / COUNT(*) as good_percentage,
  COUNT(CASE WHEN metric_rating = 'needs-improvement' THEN 1 END) * 100.0 / COUNT(*) as needs_improvement_percentage,
  COUNT(CASE WHEN metric_rating = 'poor' THEN 1 END) * 100.0 / COUNT(*) as poor_percentage,
  DATE_TRUNC('day', timestamp) as date
FROM web_vitals 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY metric_name, DATE_TRUNC('day', timestamp)
ORDER BY date DESC, metric_name;