-- Add target_date field to roadmap_items and update estimated_quarter automatically

-- Add target_date column
ALTER TABLE roadmap_items ADD COLUMN target_date DATE;

-- Create function to calculate quarter from date
CREATE OR REPLACE FUNCTION calculate_quarter_from_date(target_date DATE)
RETURNS VARCHAR(10) AS $$
BEGIN
    IF target_date IS NULL THEN
        RETURN 'TBD';
    END IF;
    
    RETURN 'Q' || EXTRACT(QUARTER FROM target_date) || ' ' || EXTRACT(YEAR FROM target_date);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update estimated_quarter when target_date changes
CREATE OR REPLACE FUNCTION update_estimated_quarter()
RETURNS TRIGGER AS $$
BEGIN
    NEW.estimated_quarter = calculate_quarter_from_date(NEW.target_date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roadmap_quarter_trigger
    BEFORE INSERT OR UPDATE OF target_date ON roadmap_items
    FOR EACH ROW
    EXECUTE FUNCTION update_estimated_quarter();

-- Update existing records with sample target dates based on their current quarters
UPDATE roadmap_items SET target_date = 
    CASE 
        WHEN estimated_quarter = 'Q4 2024' THEN '2024-12-31'::DATE
        WHEN estimated_quarter = 'Q1 2025' THEN '2025-03-31'::DATE
        WHEN estimated_quarter = 'Q2 2025' THEN '2025-06-30'::DATE
        WHEN estimated_quarter = 'Q3 2025' THEN '2025-09-30'::DATE
        WHEN estimated_quarter = 'Q4 2025' THEN '2025-12-31'::DATE
        WHEN estimated_quarter = 'Q1 2026' THEN '2026-03-31'::DATE
        ELSE '2025-06-30'::DATE
    END;