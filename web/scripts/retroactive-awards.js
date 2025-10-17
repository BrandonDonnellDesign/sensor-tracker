#!/usr/bin/env node

/**
 * Retroactive Achievement Awards Script
 *
 * This script awards achievements to existing users based on their historical sensor data.
 *
 * Usage:
 *   node scripts/retroactive-awards.js [user-id]
 *
 * Examples:
 *   node scripts/retroactive-awards.js                    # Award all users
 *   node scripts/retroactive-awards.js <user-uuid>       # Award specific user
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function awardAllUsers() {
  console.log('🏆 Starting retroactive achievement awards for all users...\n');

  try {
    const { data, error } = await supabase.rpc(
      'retroactively_award_achievements'
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️  No users found or no achievements to award.');
      return;
    }

    console.log(`✅ Successfully processed ${data.length} users:\n`);

    let totalAchievements = 0;
    let totalPoints = 0;

    data.forEach((result, index) => {
      console.log(`${index + 1}. User: ${result.user_id.substring(0, 8)}...`);
      console.log(`   🏆 Achievements: ${result.achievements_awarded}`);
      console.log(`   ⭐ Points: ${result.points_awarded}\n`);

      totalAchievements += result.achievements_awarded;
      totalPoints += result.points_awarded;
    });

    console.log('📊 Summary:');
    console.log(`   👥 Users processed: ${data.length}`);
    console.log(`   🏆 Total achievements awarded: ${totalAchievements}`);
    console.log(`   ⭐ Total points awarded: ${totalPoints}`);
  } catch (error) {
    console.error('❌ Error awarding achievements:', error.message);
    process.exit(1);
  }
}

async function awardSpecificUser(userId) {
  console.log(
    `🏆 Starting retroactive achievement awards for user: ${userId}\n`
  );

  try {
    const { data, error } = await supabase.rpc('award_achievements_for_user', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️  No achievements to award for this user.');
      return;
    }

    const result = data[0];
    console.log('✅ Successfully processed user:\n');
    console.log(`   User ID: ${userId}`);
    console.log(`   🏆 Achievements awarded: ${result.achievements_awarded}`);
    console.log(`   ⭐ Points awarded: ${result.points_awarded}`);
  } catch (error) {
    console.error('❌ Error awarding achievements:', error.message);
    process.exit(1);
  }
}

async function checkGamificationStats() {
  console.log('📊 Current Gamification Statistics:\n');

  try {
    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_gamification_stats')
      .select('*');

    if (statsError) throw statsError;

    // Get achievement counts
    const { data: achievements, error: achievementError } = await supabase
      .from('user_achievements')
      .select('user_id');

    if (achievementError) throw achievementError;

    if (!stats || stats.length === 0) {
      console.log(
        'ℹ️  No gamification data found. Run retroactive awards first.'
      );
      return;
    }

    const totalUsers = stats.length;
    const totalPoints = stats.reduce((sum, s) => sum + s.total_points, 0);
    const totalAchievements = achievements?.length || 0;
    const averageLevel = (
      stats.reduce((sum, s) => sum + s.level, 0) / totalUsers
    ).toFixed(1);
    const highestStreak = Math.max(...stats.map((s) => s.longest_streak));

    console.log(`👥 Total users with gamification data: ${totalUsers}`);
    console.log(`⭐ Total points awarded: ${totalPoints.toLocaleString()}`);
    console.log(`🏆 Total achievements earned: ${totalAchievements}`);
    console.log(`📈 Average user level: ${averageLevel}`);
    console.log(`🔥 Highest streak: ${highestStreak} days`);

    console.log('\n🏅 Top 5 Users by Points:');
    const topUsers = stats
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 5);

    topUsers.forEach((user, index) => {
      console.log(
        `   ${index + 1}. ${user.user_id.substring(0, 8)}... - Level ${
          user.level
        } (${user.total_points} pts, ${user.achievements_earned} achievements)`
      );
    });
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎮 CGM Sensor Tracker - Retroactive Achievement Awards\n');

  if (command === 'stats' || command === '--stats') {
    await checkGamificationStats();
  } else if (command && command.length === 36) {
    // Looks like a UUID
    await awardSpecificUser(command);
  } else if (command === 'help' || command === '--help') {
    console.log('Usage:');
    console.log(
      '  node scripts/retroactive-awards.js              # Award all users'
    );
    console.log(
      '  node scripts/retroactive-awards.js <user-id>    # Award specific user'
    );
    console.log(
      '  node scripts/retroactive-awards.js stats        # Show current stats'
    );
    console.log(
      '  node scripts/retroactive-awards.js help         # Show this help'
    );
  } else {
    await awardAllUsers();
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
