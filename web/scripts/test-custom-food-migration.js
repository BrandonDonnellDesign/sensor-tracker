#!/usr/bin/env node

/**
 * Test script to verify custom food migration works correctly
 * This script tests the API endpoints and database schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCustomFoodMigration() {
  console.log('🧪 Testing Custom Food Migration...\n');

  try {
    // Test 1: Check if custom food columns exist
    console.log('1. Checking if custom food columns exist...');
    const { data: columns, error: columnError } = await supabase
      .from('food_items')
      .select('created_by_user_id, is_custom, is_public')
      .limit(1);

    if (columnError) {
      console.error('❌ Custom food columns not found:', columnError.message);
      return false;
    }
    console.log('✅ Custom food columns exist');

    // Test 2: Check if view includes custom columns
    console.log('\n2. Checking if food_logs_with_cgm view includes custom columns...');
    const { data: viewData, error: viewError } = await supabase
      .from('food_logs_with_cgm')
      .select('created_by_user_id, is_custom, is_public, custom_food_name')
      .limit(1);

    if (viewError) {
      console.error('❌ View does not include custom columns:', viewError.message);
      return false;
    }
    console.log('✅ View includes custom food columns');

    // Test 3: Check RLS policies
    console.log('\n3. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('pg_policies')
      .select('*')
      .eq('tablename', 'food_items');

    if (policyError) {
      console.warn('⚠️  Could not check RLS policies:', policyError.message);
    } else {
      console.log('✅ RLS policies accessible');
    }

    // Test 4: Test creating a custom food item (requires a user)
    console.log('\n4. Testing custom food creation...');
    
    // Create a test user first (this is just for testing)
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-123',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Could not create test user:', authError.message);
      return false;
    }

    const testUserId = authData.user.id;
    console.log('✅ Created test user:', testUserId);

    // Try to create a custom food item
    const { data: customFood, error: foodError } = await supabase
      .from('food_items')
      .insert({
        product_name: 'Test Custom Food',
        brand: 'Test Brand',
        serving_size: 100,
        serving_unit: 'g',
        energy_kcal: 200,
        carbohydrates_g: 30,
        proteins_g: 10,
        fat_g: 5,
        created_by_user_id: testUserId,
        is_custom: true,
        is_public: false
      })
      .select()
      .single();

    if (foodError) {
      console.error('❌ Could not create custom food:', foodError.message);
      // Clean up test user
      await supabase.auth.admin.deleteUser(testUserId);
      return false;
    }

    console.log('✅ Created custom food:', customFood.product_name);

    // Test 5: Test querying custom foods
    console.log('\n5. Testing custom food queries...');
    const { data: customFoods, error: queryError } = await supabase
      .from('food_items')
      .select('*')
      .eq('is_custom', true)
      .eq('created_by_user_id', testUserId);

    if (queryError) {
      console.error('❌ Could not query custom foods:', queryError.message);
      // Clean up
      await supabase.from('food_items').delete().eq('id', customFood.id);
      await supabase.auth.admin.deleteUser(testUserId);
      return false;
    }

    console.log('✅ Successfully queried custom foods:', customFoods.length);

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    await supabase.from('food_items').delete().eq('id', customFood.id);
    await supabase.auth.admin.deleteUser(testUserId);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Custom food migration is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the test
testCustomFoodMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });