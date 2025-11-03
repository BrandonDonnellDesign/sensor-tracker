-- Manually activate the Dexcom token for testing
UPDATE dexcom_tokens 
SET is_active = true 
WHERE user_id = '501debf3-24e5-4232-821e-3195ba408692';