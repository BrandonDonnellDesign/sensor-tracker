-- Optimize insulin_logs table for analytics queries
-- These indexes will significantly improve performance for dashboard queries

-- Composite index for user-specific queries with date filtering
CREATE INDEX IF NOT EXISTS idx_insulin_logs_user_date 
ON insulin_logs (user_id, taken_at DESC);

-- Composite index for delivery type filtering (basal vs bolus)
CREATE INDEX IF NOT EXISTS idx_insulin_logs_user_delivery_date 
ON insulin_logs (user_id, delivery_type, taken_at DESC);

-- Index for IOB calculations (rapid and short-acting insulin only)
CREATE INDEX IF NOT EXISTS idx_insulin_logs_iob_calculation 
ON insulin_logs (user_id, insulin_type, taken_at DESC) 
WHERE insulin_type IN ('rapid', 'short');

-- Index for import tracking and duplicate detection
CREATE INDEX IF NOT EXISTS idx_insulin_logs_import_tracking 
ON insulin_logs (user_id, logged_via, created_at DESC);

-- Partial index for basal insulin analysis
CREATE INDEX IF NOT EXISTS idx_insulin_logs_basal_analysis 
ON insulin_logs (user_id, taken_at DESC, units) 
WHERE delivery_type = 'basal';

-- Partial index for bolus insulin analysis  
CREATE INDEX IF NOT EXISTS idx_insulin_logs_bolus_analysis 
ON insulin_logs (user_id, taken_at DESC, units) 
WHERE delivery_type IN ('bolus', 'correction');

-- Add statistics to help query planner
ANALYZE insulin_logs;

-- Create a view for daily insulin summaries to speed up analytics
CREATE OR REPLACE VIEW daily_insulin_summary AS
SELECT 
  user_id,
  DATE(taken_at) as date,
  SUM(CASE WHEN delivery_type = 'basal' THEN units ELSE 0 END) as daily_basal,
  SUM(CASE WHEN delivery_type IN ('bolus', 'correction') THEN units ELSE 0 END) as daily_bolus,
  SUM(units) as daily_total,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN delivery_type = 'basal' THEN 1 END) as basal_entries,
  COUNT(CASE WHEN delivery_type IN ('bolus', 'correction') THEN 1 END) as bolus_entries
FROM insulin_logs 
GROUP BY user_id, DATE(taken_at)
ORDER BY user_id, date DESC;

-- Grant access to the view
GRANT SELECT ON daily_insulin_summary TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view their own daily insulin summary" 
ON daily_insulin_summary FOR SELECT 
USING (auth.uid() = user_id);