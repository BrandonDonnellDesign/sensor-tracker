-- Optimize database by dropping duplicate indexes and optimizing RLS policies
-- RLS optimization: Replace auth.uid() with (select auth.uid()) to prevent per-row evaluation

-- Drop duplicate indexes and constraints
ALTER TABLE daily_activities DROP CONSTRAINT IF EXISTS daily_activities_user_id_activity_date_activity_type_key;
DROP INDEX IF EXISTS idx_dexcom_sync_log_created_at;
DROP INDEX IF EXISTS idx_dexcom_sync_log_status;
DROP INDEX IF EXISTS idx_dexcom_sync_log_user_id;
ALTER TABLE dexcom_tokens DROP CONSTRAINT IF EXISTS dexcom_tokens_user_id_key;
DROP INDEX IF EXISTS idx_glucose_readings_user_time;
DROP INDEX IF EXISTS idx_insulin_logs_taken_at;

-- User achievements (uuid)
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (user_id = (select auth.uid()));

-- User gamification stats (uuid)
DROP POLICY IF EXISTS "Users can view own gamification stats" ON user_gamification_stats;
CREATE POLICY "Users can view own gamification stats" ON user_gamification_stats
  FOR SELECT USING (user_id = (select auth.uid()));

-- Daily activities (uuid) - consolidate into one policy
DROP POLICY IF EXISTS "Users can view own daily activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can view their own daily activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can insert their own daily activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can update their own daily activities" ON daily_activities;
DROP POLICY IF EXISTS "Users can delete their own daily activities" ON daily_activities;
CREATE POLICY "Users can manage own daily activities" ON daily_activities
  FOR ALL USING (user_id = (select auth.uid()));

-- Sensor replacements (uuid)
DROP POLICY IF EXISTS "Users can view their own replacements" ON sensor_replacements;
DROP POLICY IF EXISTS "Users can insert their own replacements" ON sensor_replacements;
DROP POLICY IF EXISTS "Users can update their own replacements" ON sensor_replacements;
DROP POLICY IF EXISTS "Users can delete their own replacements" ON sensor_replacements;
CREATE POLICY "Users can manage their own replacements" ON sensor_replacements
  FOR ALL USING (user_id = (select auth.uid()));

-- Feedback (uuid)
DROP POLICY IF EXISTS "Users can submit feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON feedback;
CREATE POLICY "Users can submit feedback" ON feedback
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Users can update own feedback" ON feedback
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Dexcom sync settings (uuid)
DROP POLICY IF EXISTS "Users can manage their own sync settings" ON dexcom_sync_settings;
DROP POLICY IF EXISTS "Users can view their own sync settings" ON dexcom_sync_settings;
CREATE POLICY "Users can manage their own sync settings" ON dexcom_sync_settings
  FOR ALL USING (user_id = (select auth.uid()));

-- API rate limits (uuid)
DROP POLICY IF EXISTS "Users can view their own rate limits" ON api_rate_limits;
CREATE POLICY "Users can view their own rate limits" ON api_rate_limits
  FOR SELECT USING (user_id = (select auth.uid()));

-- Insulin logs (uuid)
DROP POLICY IF EXISTS "insulin_logs_policy" ON insulin_logs;
CREATE POLICY "insulin_logs_policy" ON insulin_logs
  FOR ALL USING (user_id = (select auth.uid()));

-- User calculator settings (TEXT - special case!)
DROP POLICY IF EXISTS "Users can view own calculator settings" ON user_calculator_settings;
DROP POLICY IF EXISTS "Users can insert own calculator settings" ON user_calculator_settings;
DROP POLICY IF EXISTS "Users can update own calculator settings" ON user_calculator_settings;
DROP POLICY IF EXISTS "Users can delete own calculator settings" ON user_calculator_settings;
CREATE POLICY "Users can manage own calculator settings" ON user_calculator_settings
  FOR ALL USING (user_id = (select auth.uid())::text);

-- Diabetes supplies inventory (uuid)
DROP POLICY IF EXISTS "Users can view their own supplies" ON diabetes_supplies_inventory;
DROP POLICY IF EXISTS "Users can insert their own supplies" ON diabetes_supplies_inventory;
DROP POLICY IF EXISTS "Users can update their own supplies" ON diabetes_supplies_inventory;
DROP POLICY IF EXISTS "Users can delete their own supplies" ON diabetes_supplies_inventory;
CREATE POLICY "Users can manage their own supplies" ON diabetes_supplies_inventory
  FOR ALL USING (user_id = (select auth.uid()));

-- Notifications (uuid)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Glucose readings (uuid)
DROP POLICY IF EXISTS "Users can view their own glucose readings" ON glucose_readings;
DROP POLICY IF EXISTS "Users can insert their own glucose readings" ON glucose_readings;
DROP POLICY IF EXISTS "Users can update their own glucose readings" ON glucose_readings;
DROP POLICY IF EXISTS "Users can delete their own glucose readings" ON glucose_readings;
CREATE POLICY "Users can manage their own glucose readings" ON glucose_readings
  FOR ALL USING (user_id = (select auth.uid()));

-- Food logs (uuid)
DROP POLICY IF EXISTS "Users can view their own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can insert their own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can update their own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can delete their own food logs" ON food_logs;
CREATE POLICY "Users can manage their own food logs" ON food_logs
  FOR ALL USING (user_id = (select auth.uid()));

-- Favorite foods (uuid)
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorite_foods;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorite_foods;
CREATE POLICY "Users can manage their own favorites" ON favorite_foods
  FOR ALL USING (user_id = (select auth.uid()));

-- Supply usage log (uuid)
DROP POLICY IF EXISTS "Users can view their own usage log" ON supply_usage_log;
DROP POLICY IF EXISTS "Users can insert their own usage log" ON supply_usage_log;
DROP POLICY IF EXISTS "Users can delete their own usage log" ON supply_usage_log;
CREATE POLICY "Users can manage their own usage log" ON supply_usage_log
  FOR ALL USING (user_id = (select auth.uid()));

-- Sensor inventory (uuid)
DROP POLICY IF EXISTS "Users can view their own inventory" ON sensor_inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON sensor_inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON sensor_inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON sensor_inventory;
CREATE POLICY "Users can manage their own inventory" ON sensor_inventory
  FOR ALL USING (user_id = (select auth.uid()));

-- Sensor orders (uuid)
DROP POLICY IF EXISTS "Users can view their own orders" ON sensor_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON sensor_orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON sensor_orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON sensor_orders;
CREATE POLICY "Users can manage their own orders" ON sensor_orders
  FOR ALL USING (user_id = (select auth.uid()));

-- Dexcom tokens (uuid)
DROP POLICY IF EXISTS "Users can view their own tokens" ON dexcom_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON dexcom_tokens;
CREATE POLICY "Users can manage their own tokens" ON dexcom_tokens
  FOR ALL USING (user_id = (select auth.uid()));

-- Inventory alerts (uuid)
DROP POLICY IF EXISTS "Users can view their own alert settings" ON inventory_alerts;
DROP POLICY IF EXISTS "Users can insert their own alert settings" ON inventory_alerts;
DROP POLICY IF EXISTS "Users can update their own alert settings" ON inventory_alerts;
DROP POLICY IF EXISTS "Users can delete their own alert settings" ON inventory_alerts;
CREATE POLICY "Users can manage their own alert settings" ON inventory_alerts
  FOR ALL USING (user_id = (select auth.uid()));

-- Meal templates (uuid)
DROP POLICY IF EXISTS "Users can view their own meal templates" ON meal_templates;
DROP POLICY IF EXISTS "Users can insert their own meal templates" ON meal_templates;
DROP POLICY IF EXISTS "Users can update their own meal templates" ON meal_templates;
DROP POLICY IF EXISTS "Users can delete their own meal templates" ON meal_templates;
CREATE POLICY "Users can manage their own meal templates" ON meal_templates
  FOR ALL USING (user_id = (select auth.uid()));

-- Meal template items - Skip if table doesn't exist or has different schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_template_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view items in their meal templates" ON meal_template_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert items in their meal templates" ON meal_template_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update items in their meal templates" ON meal_template_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete items in their meal templates" ON meal_template_items';
  END IF;
END $$;

-- User medications (uuid)
DROP POLICY IF EXISTS "user_medications_policy" ON user_medications;
CREATE POLICY "user_medications_policy" ON user_medications
  FOR ALL USING (user_id = (select auth.uid()));

-- Web vitals (uuid)
DROP POLICY IF EXISTS "Users can insert their own web vitals" ON web_vitals;
CREATE POLICY "Users can insert their own web vitals" ON web_vitals
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- User events (uuid)
DROP POLICY IF EXISTS "Users can insert their own events" ON user_events;
CREATE POLICY "Users can insert their own events" ON user_events
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Community tips (uuid)
DROP POLICY IF EXISTS "Users can create tips" ON community_tips;
DROP POLICY IF EXISTS "Users can update their own tips" ON community_tips;
DROP POLICY IF EXISTS "Users can soft delete their own tips" ON community_tips;
CREATE POLICY "Users can create tips" ON community_tips
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own tips" ON community_tips
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Community tip votes (uuid)
DROP POLICY IF EXISTS "Users can manage their own votes" ON community_tip_votes;
CREATE POLICY "Users can manage their own votes" ON community_tip_votes
  FOR ALL USING (user_id = (select auth.uid()));

-- Community tip comments (uuid)
DROP POLICY IF EXISTS "Users can create comments" ON community_tip_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON community_tip_comments;
CREATE POLICY "Users can create comments" ON community_tip_comments
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update their own comments" ON community_tip_comments
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Community tip bookmarks (uuid)
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON community_tip_bookmarks;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON community_tip_bookmarks;
CREATE POLICY "Users can manage their own bookmarks" ON community_tip_bookmarks
  FOR ALL USING (user_id = (select auth.uid()));

-- Pump bolus events (uuid)
DROP POLICY IF EXISTS "Users can view their own pump bolus events" ON pump_bolus_events;
DROP POLICY IF EXISTS "Users can insert their own pump bolus events" ON pump_bolus_events;
DROP POLICY IF EXISTS "Users can update their own pump bolus events" ON pump_bolus_events;
DROP POLICY IF EXISTS "Users can delete their own pump bolus events" ON pump_bolus_events;
CREATE POLICY "Users can manage their own pump bolus events" ON pump_bolus_events
  FOR ALL USING (user_id = (select auth.uid()));

-- Pump basal events (uuid)
DROP POLICY IF EXISTS "Users can view their own pump basal events" ON pump_basal_events;
DROP POLICY IF EXISTS "Users can insert their own pump basal events" ON pump_basal_events;
DROP POLICY IF EXISTS "Users can update their own pump basal events" ON pump_basal_events;
DROP POLICY IF EXISTS "Users can delete their own pump basal events" ON pump_basal_events;
CREATE POLICY "Users can manage their own pump basal events" ON pump_basal_events
  FOR ALL USING (user_id = (select auth.uid()));

-- Pump status events (uuid)
DROP POLICY IF EXISTS "Users can view their own pump status events" ON pump_status_events;
DROP POLICY IF EXISTS "Users can insert their own pump status events" ON pump_status_events;
DROP POLICY IF EXISTS "Users can update their own pump status events" ON pump_status_events;
DROP POLICY IF EXISTS "Users can delete their own pump status events" ON pump_status_events;
CREATE POLICY "Users can manage their own pump status events" ON pump_status_events
  FOR ALL USING (user_id = (select auth.uid()));

-- Pump delivery logs (uuid)
DROP POLICY IF EXISTS "Users can view their own pump delivery logs" ON pump_delivery_logs;
DROP POLICY IF EXISTS "Users can insert their own pump delivery logs" ON pump_delivery_logs;
DROP POLICY IF EXISTS "Users can update their own pump delivery logs" ON pump_delivery_logs;
DROP POLICY IF EXISTS "Users can delete their own pump delivery logs" ON pump_delivery_logs;
CREATE POLICY "Users can manage their own pump delivery logs" ON pump_delivery_logs
  FOR ALL USING (user_id = (select auth.uid()));

-- API keys (uuid)
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (user_id = (select auth.uid()));

-- API usage logs (uuid)
DROP POLICY IF EXISTS "Users can view their own API usage logs" ON api_usage_logs;
CREATE POLICY "Users can view their own API usage logs" ON api_usage_logs
  FOR SELECT USING (user_id = (select auth.uid()));

-- Dexcom sync log (uuid)
DROP POLICY IF EXISTS "Users can view their own sync logs" ON dexcom_sync_log;
CREATE POLICY "Users can view their own sync logs" ON dexcom_sync_log
  FOR SELECT USING (user_id = (select auth.uid()));

-- Food items - Note: created_by is not in the list, so we'll check if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_items' AND column_name = 'created_by'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view food items" ON food_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create custom food items" ON food_items';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own custom food items" ON food_items';
    
    EXECUTE 'CREATE POLICY "Users can view food items" ON food_items FOR SELECT USING ((select auth.uid()) IS NOT NULL)';
    EXECUTE 'CREATE POLICY "Users can create custom food items" ON food_items FOR INSERT WITH CHECK (created_by = (select auth.uid()))';
    EXECUTE 'CREATE POLICY "Users can update their own custom food items" ON food_items FOR UPDATE USING (created_by = (select auth.uid()))';
  END IF;
END $$;
