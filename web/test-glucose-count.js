// Quick test script to check actual glucose reading count in database
// Run with: node test-glucose-count.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGlucoseCount() {
    console.log('Testing glucose readings count...\n');

    // Test 1: Get total count
    const { count: totalCount, error: countError } = await supabase
        .from('glucose_readings')
        .select('*', { count: 'exact', head: true });

    console.log('Total count in database:', totalCount);
    if (countError) console.error('Count error:', countError);

    // Test 2: Try to fetch with limit 100000
    const { data, error } = await supabase
        .from('glucose_readings')
        .select('id')
        .limit(100000);

    console.log('Rows returned with limit(100000):', data?.length || 0);
    if (error) console.error('Query error:', error);

    // Test 3: Try without limit (should default to 1000)
    const { data: data2, error: error2 } = await supabase
        .from('glucose_readings')
        .select('id');

    console.log('Rows returned without limit:', data2?.length || 0);
    if (error2) console.error('Query error:', error2);
}

testGlucoseCount();
