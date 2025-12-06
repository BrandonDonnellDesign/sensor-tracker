-- Fix the update_prediction_accuracy function
-- The original had a syntax error with ORDER BY in UPDATE statement

CREATE OR REPLACE FUNCTION update_prediction_accuracy()
RETURNS void AS $$
BEGIN
    -- Update predictions with actual glucose values
    -- Use a subquery to find the closest matching reading for each prediction
    UPDATE glucose_predictions gp
    SET 
        actual_glucose = closest.glucose_value,
        actual_reading_at = closest.timestamp
    FROM (
        SELECT DISTINCT ON (gp2.id)
            gp2.id as prediction_id,
            gr.glucose_value,
            gr.timestamp
        FROM glucose_predictions gp2
        JOIN glucose_readings gr ON gp2.user_id = gr.user_id
        WHERE 
            gp2.actual_glucose IS NULL
            AND gr.timestamp >= gp2.created_at + (gp2.time_horizon || ' minutes')::interval
            AND gr.timestamp <= gp2.created_at + (gp2.time_horizon + 10 || ' minutes')::interval
        ORDER BY 
            gp2.id,
            ABS(EXTRACT(EPOCH FROM (gr.timestamp - (gp2.created_at + (gp2.time_horizon || ' minutes')::interval))))
    ) closest
    WHERE gp.id = closest.prediction_id;
END;
$$ LANGUAGE plpgsql;
