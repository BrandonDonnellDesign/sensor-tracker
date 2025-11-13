import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user data for context
    const [glucoseData, foodData, insulinData, sensorData] = await Promise.all([
      supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('system_time', { ascending: false })
        .limit(100),
      
      supabase
        .from('food_logs')
        .select(`
          *,
          food_items (
            product_name,
            brand
          )
        `)
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('sensors')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Generate AI response based on user data and question
    const response = await generateAIResponse(
      message,
      conversationHistory,
      {
        glucose: glucoseData.data || [],
        food: foodData.data || [],
        insulin: insulinData.data || [],
        sensors: sensorData.data || []
      }
    );

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Error in SensorBot API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

async function generateAIResponse(
  message: string,
  _conversationHistory: any[],
  userData: {
    glucose: any[];
    food: any[];
    insulin: any[];
    sensors: any[];
  }
): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Food-glucose correlation (specific foods causing spikes)
  if ((lowerMessage.includes('food') || lowerMessage.includes('meal') || lowerMessage.includes('eat')) && 
      (lowerMessage.includes('spike') || lowerMessage.includes('high') || lowerMessage.includes('raise') || 
       lowerMessage.includes('cause') || lowerMessage.includes('affect') || lowerMessage.includes('impact'))) {
    return analyzeFoodGlucoseCorrelation(userData.food, userData.glucose);
  }

  // General food analysis
  if (lowerMessage.includes('food') || lowerMessage.includes('meal') || lowerMessage.includes('eat')) {
    return analyzeFoodImpact(userData.food, userData.glucose);
  }

  // Glucose patterns (only if not asking about food)
  if (lowerMessage.includes('glucose') || lowerMessage.includes('blood sugar') || lowerMessage.includes('pattern') ||
      lowerMessage.includes('trending') || lowerMessage.includes('time in range') || lowerMessage.includes('control')) {
    return analyzeGlucosePatterns(userData.glucose);
  }

  // Insulin analysis
  if (lowerMessage.includes('insulin') || lowerMessage.includes('dose') || lowerMessage.includes('bolus') ||
      lowerMessage.includes('iob') || lowerMessage.includes('stacking')) {
    return analyzeInsulin(userData.insulin, userData.glucose);
  }

  // Sensor insights
  if (lowerMessage.includes('sensor') || lowerMessage.includes('cgm') || lowerMessage.includes('dexcom')) {
    return analyzeSensors(userData.sensors);
  }

  // General insights
  if (lowerMessage.includes('insight') || lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
    return generateGeneralInsights(userData);
  }

  // Default helpful response
  return `I can help you with:

• **Glucose Analysis**: Ask about your glucose patterns, trends, or time in range
• **Meal Impact**: Learn how different foods affect your glucose levels
• **Insulin Insights**: Get recommendations on insulin timing and dosing
• **Sensor Performance**: Review your CGM sensor accuracy and longevity
• **Personalized Tips**: Receive custom recommendations based on your data

Try asking something like:
- "How are my glucose levels trending?"
- "What foods cause the biggest spikes?"
- "How effective is my insulin timing?"
- "How long do my sensors typically last?"`;
}

function analyzeGlucosePatterns(glucose: any[]): string {
  if (glucose.length === 0) {
    return "I don't see any glucose data yet. Once you connect your CGM or start logging readings, I'll be able to analyze your patterns and give you personalized insights about your glucose control!";
  }

  const values = glucose.map(g => g.value);
  const timestamps = glucose.map(g => new Date(g.system_time));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const timeInRange = (inRange / values.length) * 100;
  const high = values.filter(v => v > 180).length;
  const low = values.filter(v => v < 70).length;
  const veryHigh = values.filter(v => v > 250).length;
  const veryLow = values.filter(v => v < 54).length;

  // Analyze by time of day
  const morningReadings = glucose.filter(g => {
    const hour = new Date(g.system_time).getHours();
    return hour >= 6 && hour < 12;
  }).map(g => g.value);
  
  const afternoonReadings = glucose.filter(g => {
    const hour = new Date(g.system_time).getHours();
    return hour >= 12 && hour < 18;
  }).map(g => g.value);
  
  const eveningReadings = glucose.filter(g => {
    const hour = new Date(g.system_time).getHours();
    return hour >= 18 && hour < 24;
  }).map(g => g.value);
  
  const nightReadings = glucose.filter(g => {
    const hour = new Date(g.system_time).getHours();
    return hour >= 0 && hour < 6;
  }).map(g => g.value);

  const morningAvg = morningReadings.length > 0 ? morningReadings.reduce((a, b) => a + b, 0) / morningReadings.length : null;
  const afternoonAvg = afternoonReadings.length > 0 ? afternoonReadings.reduce((a, b) => a + b, 0) / afternoonReadings.length : null;
  const eveningAvg = eveningReadings.length > 0 ? eveningReadings.reduce((a, b) => a + b, 0) / eveningReadings.length : null;
  const nightAvg = nightReadings.length > 0 ? nightReadings.reduce((a, b) => a + b, 0) / nightReadings.length : null;

  // Find highest and lowest readings with times
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const maxIndex = values.indexOf(maxValue);
  const minIndex = values.indexOf(minValue);
  const maxTime = timestamps[maxIndex].toLocaleString();
  const minTime = timestamps[minIndex].toLocaleString();

  // Calculate variability (standard deviation)
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100; // Coefficient of variation

  let analysis = `Looking at your last ${glucose.length} readings:\n\n`;
  
  analysis += `**Overall Stats:**\n`;
  analysis += `• Average: ${avg.toFixed(0)} mg/dL\n`;
  analysis += `• Range: ${minValue} - ${maxValue} mg/dL\n`;
  analysis += `• Time in Range (70-180): ${timeInRange.toFixed(1)}%\n`;
  analysis += `• Variability (CV): ${cv.toFixed(1)}% ${cv < 36 ? '✅ Good' : '⚠️ High'}\n`;
  
  if (high > 0) analysis += `• High (>180): ${high} readings (${((high/values.length)*100).toFixed(0)}%)\n`;
  if (veryHigh > 0) analysis += `• Very High (>250): ${veryHigh} readings ⚠️\n`;
  if (low > 0) analysis += `• Low (<70): ${low} readings (${((low/values.length)*100).toFixed(0)}%)\n`;
  if (veryLow > 0) analysis += `• Very Low (<54): ${veryLow} readings 🚨\n`;

  analysis += `\n**Time of Day Patterns:**\n`;
  if (morningAvg) analysis += `• Morning (6am-12pm): ${morningAvg.toFixed(0)} mg/dL avg\n`;
  if (afternoonAvg) analysis += `• Afternoon (12pm-6pm): ${afternoonAvg.toFixed(0)} mg/dL avg\n`;
  if (eveningAvg) analysis += `• Evening (6pm-12am): ${eveningAvg.toFixed(0)} mg/dL avg\n`;
  if (nightAvg) analysis += `• Night (12am-6am): ${nightAvg.toFixed(0)} mg/dL avg\n`;

  // Identify problem times
  const timeProblems = [];
  if (morningAvg && morningAvg > 180) timeProblems.push('mornings are running high');
  if (afternoonAvg && afternoonAvg > 180) timeProblems.push('afternoons are elevated');
  if (eveningAvg && eveningAvg > 180) timeProblems.push('evenings are high');
  if (nightAvg && nightAvg < 70) timeProblems.push('nights are too low');
  if (nightAvg && nightAvg > 180) timeProblems.push('nights are running high');

  analysis += `\n**Specific Insights:**\n`;
  analysis += `• Your highest reading was ${maxValue} mg/dL at ${maxTime}\n`;
  analysis += `• Your lowest reading was ${minValue} mg/dL at ${minTime}\n`;
  
  if (timeProblems.length > 0) {
    analysis += `\n⚠️ **Pattern Alert:** Your ${timeProblems.join(', ')}.\n`;
    
    if (morningAvg && morningAvg > 180) {
      analysis += `\n**Morning Highs:** Consider:\n`;
      analysis += `• Increasing your basal insulin or adjusting timing\n`;
      analysis += `• Eating a lower-carb dinner\n`;
      analysis += `• Checking for dawn phenomenon (3am-8am rise)\n`;
    }
    
    if (nightAvg && nightAvg < 70) {
      analysis += `\n**Night Lows:** This is serious! Consider:\n`;
      analysis += `• Reducing your evening basal insulin\n`;
      analysis += `• Having a small bedtime snack\n`;
      analysis += `• Talking to your doctor ASAP about adjustments\n`;
    }
  }

  if (cv > 36) {
    analysis += `\n**Variability Concern:** Your glucose is swinging quite a bit (CV ${cv.toFixed(0)}%). This suggests:\n`;
    analysis += `• Inconsistent carb counting or meal timing\n`;
    analysis += `• Insulin doses may need fine-tuning\n`;
    analysis += `• Consider eating similar meals at similar times for a few days to establish patterns\n`;
  }

  return analysis;
}

function analyzeFoodGlucoseCorrelation(food: any[], glucose: any[]): string {
  if (food.length === 0) {
    return "I don't see any meal logs yet. Start tracking your meals and I can tell you exactly which foods cause your biggest glucose spikes!";
  }

  if (glucose.length === 0) {
    return "I see your meal logs, but I need glucose data to analyze which foods cause spikes. Connect your CGM or log some readings!";
  }

  // Correlate meals with glucose changes
  const mealImpacts: Array<{
    meal: any;
    preMealGlucose: number | null;
    postMealPeak: number | null;
    glucoseRise: number | null;
    foodName: string;
  }> = [];

  food.forEach(meal => {
    const mealTime = new Date(meal.logged_at);
    // Try multiple fields to get the food name, prioritizing the joined food_items table
    let foodName = 'Unknown food';
    
    if (meal.food_items?.product_name) {
      // Use the product name from the food_items table
      foodName = meal.food_items.product_name;
      // Add brand if available and not already in the name
      if (meal.food_items.brand && !foodName.toLowerCase().includes(meal.food_items.brand.toLowerCase())) {
        foodName = `${meal.food_items.brand} ${foodName}`;
      }
    } else if (meal.product_name) {
      foodName = meal.product_name;
    } else if (meal.custom_food_name) {
      foodName = meal.custom_food_name;
    } else if (meal.meal_type) {
      foodName = `${meal.meal_type} meal`;
    }
    
    // Find glucose readings 30 min before meal
    const preMealReadings = glucose.filter(g => {
      const readingTime = new Date(g.system_time);
      const timeDiff = mealTime.getTime() - readingTime.getTime();
      return timeDiff > 0 && timeDiff <= 30 * 60 * 1000; // 30 min before
    });

    // Find glucose readings 1-3 hours after meal (peak time)
    const postMealReadings = glucose.filter(g => {
      const readingTime = new Date(g.system_time);
      const timeDiff = readingTime.getTime() - mealTime.getTime();
      return timeDiff > 60 * 60 * 1000 && timeDiff <= 3 * 60 * 60 * 1000; // 1-3 hours after
    });

    if (preMealReadings.length > 0 && postMealReadings.length > 0) {
      const preMealAvg = preMealReadings.reduce((sum, r) => sum + r.value, 0) / preMealReadings.length;
      const postMealPeak = Math.max(...postMealReadings.map(r => r.value));
      const glucoseRise = postMealPeak - preMealAvg;

      mealImpacts.push({
        meal,
        preMealGlucose: preMealAvg,
        postMealPeak,
        glucoseRise,
        foodName
      });
    }
  });

  if (mealImpacts.length === 0) {
    return "I can see your meals and glucose data, but they don't overlap enough to analyze the impact. Make sure you're logging meals and have CGM data for the same time periods!";
  }

  // Group by food name and calculate averages
  const foodGroups: {[key: string]: typeof mealImpacts} = {};
  mealImpacts.forEach(impact => {
    if (!foodGroups[impact.foodName]) {
      foodGroups[impact.foodName] = [];
    }
    foodGroups[impact.foodName].push(impact);
  });

  // Calculate average impact for each food
  const foodAverages = Object.entries(foodGroups).map(([foodName, impacts]) => {
    const avgRise = impacts.reduce((sum, i) => sum + (i.glucoseRise || 0), 0) / impacts.length;
    const avgCarbs = impacts.reduce((sum, i) => sum + (i.meal.total_carbs_g || 0), 0) / impacts.length;
    const maxRise = Math.max(...impacts.map(i => i.glucoseRise || 0));
    return {
      foodName,
      avgRise,
      maxRise,
      avgCarbs,
      count: impacts.length,
      examples: impacts
    };
  });

  // Sort by average glucose rise (highest first)
  foodAverages.sort((a, b) => b.avgRise - a.avgRise);

  const topSpikers = foodAverages.slice(0, 5);
  const lowSpikers = foodAverages.filter(f => f.avgRise < 30).slice(0, 3);

  let analysis = `I analyzed ${mealImpacts.length} meals with glucose data. Here's what causes YOUR biggest spikes:\n\n`;
  
  analysis += `**🔥 Top Spike-Causing Foods:**\n`;
  topSpikers.forEach((food, index) => {
    const latestExample = food.examples[0];
    const mealTime = new Date(latestExample.meal.logged_at).toLocaleString();
    analysis += `${index + 1}. **${food.foodName}** (avg ${food.avgCarbs.toFixed(0)}g carbs)\n`;
    if (food.count > 1) {
      analysis += `   • Eaten ${food.count} times - avg rise: +${food.avgRise.toFixed(0)} mg/dL\n`;
      analysis += `   • Worst spike: +${food.maxRise.toFixed(0)} mg/dL 📈\n`;
    } else {
      analysis += `   • Pre-meal: ${latestExample.preMealGlucose?.toFixed(0)} mg/dL\n`;
      analysis += `   • Peak: ${latestExample.postMealPeak?.toFixed(0)} mg/dL\n`;
      analysis += `   • Rise: +${latestExample.glucoseRise?.toFixed(0)} mg/dL 📈\n`;
    }
    analysis += `   • Last eaten: ${mealTime}\n\n`;
  });

  if (lowSpikers.length > 0) {
    analysis += `**✅ Foods That Work Well For You:**\n`;
    lowSpikers.forEach((food) => {
      analysis += `• ${food.foodName} (${food.avgCarbs.toFixed(0)}g carbs) - only +${food.avgRise.toFixed(0)} mg/dL avg rise`;
      if (food.count > 1) analysis += ` (${food.count}x)`;
      analysis += `\n`;
    });
  }

  // Provide specific recommendations
  analysis += `\n**Specific Recommendations:**\n`;
  
  const worstSpiker = topSpikers[0];
  if (worstSpiker) {
    if (worstSpiker.avgRise > 60) {
      analysis += `\n🚨 **${worstSpiker.foodName}** is your biggest problem:\n`;
      if (worstSpiker.count > 1) {
        analysis += `• You've eaten this ${worstSpiker.count} times - avg spike: +${worstSpiker.avgRise.toFixed(0)} mg/dL\n`;
        analysis += `• Worst spike: +${worstSpiker.maxRise.toFixed(0)} mg/dL!\n`;
      } else {
        analysis += `• It caused a +${worstSpiker.avgRise.toFixed(0)} mg/dL spike!\n`;
      }
      if (worstSpiker.avgCarbs > 60) {
        analysis += `• It has ${worstSpiker.avgCarbs.toFixed(0)}g carbs - that's a lot\n`;
        analysis += `• Try: Reduce portion size by half\n`;
        analysis += `• Or: Split into two smaller meals\n`;
        analysis += `• Or: Add protein/fat to slow absorption\n`;
      }
      analysis += `• Pre-bolus 20-30 minutes before eating this\n`;
      if (worstSpiker.avgRise > 80) {
        analysis += `• Consider avoiding this food or saving it for when you're low\n`;
      }
    } else if (worstSpiker.avgRise > 40) {
      analysis += `\n⚠️ **${worstSpiker.foodName}** causes moderate spikes (+${worstSpiker.avgRise.toFixed(0)} mg/dL avg):\n`;
      analysis += `• Pre-bolus 15-20 minutes before eating\n`;
      if (worstSpiker.avgCarbs > 50) {
        analysis += `• Consider reducing portion size slightly\n`;
      }
      analysis += `• Pair with protein and healthy fats to slow absorption\n`;
    } else {
      analysis += `\n✅ Good news! Your highest-spiking food (${worstSpiker.foodName}) only causes a +${worstSpiker.avgRise.toFixed(0)} mg/dL rise.\n`;
      analysis += `• This is well-controlled - keep doing what you're doing!\n`;
      analysis += `• Continue pre-bolusing and monitoring portion sizes\n`;
    }
  }

  // Find patterns in high-spike foods
  const highCarbSpikers = topSpikers.filter(f => f.avgCarbs > 50);
  if (highCarbSpikers.length >= 3) {
    analysis += `\n💡 **Pattern Alert:** ${highCarbSpikers.length} of your top spike-causing foods are high in carbs (>50g):\n`;
    highCarbSpikers.slice(0, 3).forEach(f => {
      analysis += `• ${f.foodName} (${f.avgCarbs.toFixed(0)}g carbs, +${f.avgRise.toFixed(0)} mg/dL)\n`;
    });
    analysis += `\n**Strategy:**\n`;
    analysis += `• Reduce carb portions by 25-30%\n`;
    analysis += `• Always pair carbs with protein and healthy fats\n`;
    analysis += `• Consider extended/dual-wave bolus for high-carb meals\n`;
    analysis += `• Pre-bolus 20-30 minutes before eating\n`;
  }

  // Check if user has good control overall
  const avgSpike = topSpikers.reduce((sum, f) => sum + f.avgRise, 0) / topSpikers.length;
  if (avgSpike < 40) {
    analysis += `\n🎉 **Overall:** Your average spike is only +${avgSpike.toFixed(0)} mg/dL - that's excellent control! Keep it up!\n`;
  }

  return analysis;
}

function analyzeFoodImpact(food: any[], _glucose: any[]): string {
  if (food.length === 0) {
    return "I don't see any meal logs yet. Start tracking what you eat and I can help you understand which foods work best for your glucose control. The meal impact analyzer on the Food page is great for this!";
  }

  const recentMeals = food.slice(0, 20);
  
  // Detailed carb analysis
  const carbValues = recentMeals.map(m => m.total_carbs_g || 0);
  const avgCarbs = carbValues.reduce((a, b) => a + b, 0) / carbValues.length;
  const maxCarbs = Math.max(...carbValues);
  const minCarbs = Math.min(...carbValues.filter(c => c > 0));
  
  // Meal timing analysis
  const breakfastMeals = recentMeals.filter(m => {
    const hour = new Date(m.logged_at).getHours();
    return hour >= 6 && hour < 11;
  });
  const lunchMeals = recentMeals.filter(m => {
    const hour = new Date(m.logged_at).getHours();
    return hour >= 11 && hour < 15;
  });
  const dinnerMeals = recentMeals.filter(m => {
    const hour = new Date(m.logged_at).getHours();
    return hour >= 17 && hour < 22;
  });
  const snacks = recentMeals.filter(m => {
    const hour = new Date(m.logged_at).getHours();
    return (hour >= 15 && hour < 17) || (hour >= 22 || hour < 6);
  });

  // Calculate averages by meal type
  const breakfastAvg = breakfastMeals.length > 0 ? 
    breakfastMeals.reduce((sum, m) => sum + (m.total_carbs_g || 0), 0) / breakfastMeals.length : null;
  const lunchAvg = lunchMeals.length > 0 ? 
    lunchMeals.reduce((sum, m) => sum + (m.total_carbs_g || 0), 0) / lunchMeals.length : null;
  const dinnerAvg = dinnerMeals.length > 0 ? 
    dinnerMeals.reduce((sum, m) => sum + (m.total_carbs_g || 0), 0) / dinnerMeals.length : null;

  // Find most common foods
  const foodNames = recentMeals
    .map(m => m.product_name || m.custom_food_name)
    .filter(name => name);
  const foodCounts: {[key: string]: number} = {};
  foodNames.forEach(name => {
    foodCounts[name] = (foodCounts[name] || 0) + 1;
  });
  const topFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  let analysis = `Analyzing your last ${recentMeals.length} meals:\n\n`;
  
  analysis += `**Meal Breakdown:**\n`;
  if (breakfastMeals.length > 0) analysis += `• Breakfast: ${breakfastMeals.length} meals (avg ${breakfastAvg?.toFixed(0)}g carbs)\n`;
  if (lunchMeals.length > 0) analysis += `• Lunch: ${lunchMeals.length} meals (avg ${lunchAvg?.toFixed(0)}g carbs)\n`;
  if (dinnerMeals.length > 0) analysis += `• Dinner: ${dinnerMeals.length} meals (avg ${dinnerAvg?.toFixed(0)}g carbs)\n`;
  if (snacks.length > 0) analysis += `• Snacks: ${snacks.length} times\n`;

  analysis += `\n**Carb Patterns:**\n`;
  analysis += `• Average per meal: ${avgCarbs.toFixed(0)}g\n`;
  analysis += `• Range: ${minCarbs.toFixed(0)}g - ${maxCarbs.toFixed(0)}g\n`;
  analysis += `• Total carbs logged: ${carbValues.reduce((a, b) => a + b, 0).toFixed(0)}g\n`;

  if (topFoods.length > 0) {
    analysis += `\n**Your Go-To Foods:**\n`;
    topFoods.forEach(([food, count]) => {
      analysis += `• ${food} (${count}x)\n`;
    });
  }

  // Specific recommendations based on patterns
  analysis += `\n**Specific Recommendations:**\n`;
  
  if (breakfastAvg && dinnerAvg && breakfastAvg > dinnerAvg * 1.5) {
    analysis += `\n🌅 **Breakfast Pattern:** Your breakfasts are significantly higher in carbs (${breakfastAvg.toFixed(0)}g) than dinners (${dinnerAvg.toFixed(0)}g).\n`;
    analysis += `• Consider reducing breakfast carbs - morning insulin resistance is common\n`;
    analysis += `• Try protein-focused breakfasts (eggs, Greek yogurt)\n`;
    analysis += `• Pre-bolus 20-30 minutes before breakfast for better control\n`;
  }
  
  if (dinnerAvg && dinnerAvg > 70) {
    analysis += `\n🌙 **Dinner Pattern:** Your dinners average ${dinnerAvg.toFixed(0)}g carbs - that's quite high.\n`;
    analysis += `• Large evening meals can cause overnight highs\n`;
    analysis += `• Try eating dinner earlier (before 7pm)\n`;
    analysis += `• Consider splitting into dinner + small evening snack\n`;
  }

  if (snacks.length > recentMeals.length * 0.4) {
    analysis += `\n🍿 **Snacking Pattern:** You're snacking frequently (${snacks.length} times).\n`;
    analysis += `• Frequent snacking can make glucose control harder\n`;
    analysis += `• Try larger, more satisfying meals to reduce snack needs\n`;
    analysis += `• If snacking for lows, review your insulin doses\n`;
  }

  // Find the highest carb meal
  const highestCarbMeal = recentMeals.reduce((max, meal) => 
    (meal.total_carbs_g || 0) > (max.total_carbs_g || 0) ? meal : max
  );
  
  if (highestCarbMeal.total_carbs_g && highestCarbMeal.total_carbs_g > 80) {
    const mealName = highestCarbMeal.product_name || highestCarbMeal.custom_food_name || 'a meal';
    const mealTime = new Date(highestCarbMeal.logged_at).toLocaleString();
    analysis += `\n⚠️ **High Carb Alert:** ${mealName} on ${mealTime} had ${highestCarbMeal.total_carbs_g}g carbs!\n`;
    analysis += `• Meals over 80g carbs are very challenging to dose for\n`;
    analysis += `• Consider splitting this into two smaller meals\n`;
    analysis += `• Or reduce the portion size and add more protein/vegetables\n`;
  }

  return analysis;
}

function analyzeInsulin(insulin: any[], _glucose: any[]): string {
  if (insulin.length === 0) {
    return "I don't see any insulin logs yet. Once you start tracking your doses, I can help you optimize your timing and identify patterns. The IOB calculator on the dashboard is really helpful for this!";
  }

  const recentDoses = insulin.slice(0, 30);
  
  // Separate by insulin type
  const rapidDoses = recentDoses.filter(d => d.insulin_type?.toLowerCase().includes('rapid') || d.insulin_type?.toLowerCase().includes('bolus'));
  const longDoses = recentDoses.filter(d => d.insulin_type?.toLowerCase().includes('long') || d.insulin_type?.toLowerCase().includes('basal'));
  
  // Calculate stats
  const avgDose = recentDoses.reduce((sum, dose) => sum + dose.units, 0) / recentDoses.length;
  const maxDose = Math.max(...recentDoses.map(d => d.units));
  const minDose = Math.min(...recentDoses.map(d => d.units));
  
  // Today's doses
  const today = new Date();
  const todayDoses = recentDoses.filter(dose => {
    const doseDate = new Date(dose.taken_at);
    return doseDate.toDateString() === today.toDateString();
  });
  const totalDaily = todayDoses.reduce((sum, dose) => sum + dose.units, 0);

  // Analyze timing patterns
  const morningDoses = recentDoses.filter(d => {
    const hour = new Date(d.taken_at).getHours();
    return hour >= 6 && hour < 12;
  });
  const afternoonDoses = recentDoses.filter(d => {
    const hour = new Date(d.taken_at).getHours();
    return hour >= 12 && hour < 18;
  });
  const eveningDoses = recentDoses.filter(d => {
    const hour = new Date(d.taken_at).getHours();
    return hour >= 18 && hour < 24;
  });

  const morningAvg = morningDoses.length > 0 ? morningDoses.reduce((s, d) => s + d.units, 0) / morningDoses.length : null;
  const afternoonAvg = afternoonDoses.length > 0 ? afternoonDoses.reduce((s, d) => s + d.units, 0) / afternoonDoses.length : null;
  const eveningAvg = eveningDoses.length > 0 ? eveningDoses.reduce((s, d) => s + d.units, 0) / eveningDoses.length : null;

  // Check for stacking (doses within 2 hours)
  const stackingEvents: string[] = [];
  for (let i = 0; i < recentDoses.length - 1; i++) {
    const current = new Date(recentDoses[i].taken_at);
    const next = new Date(recentDoses[i + 1].taken_at);
    const hoursDiff = (current.getTime() - next.getTime()) / (1000 * 60 * 60);
    if (Math.abs(hoursDiff) < 2 && recentDoses[i].units > 2 && recentDoses[i + 1].units > 2) {
      stackingEvents.push(`${recentDoses[i].units}u + ${recentDoses[i + 1].units}u within ${Math.abs(hoursDiff).toFixed(1)}hrs`);
    }
  }

  let analysis = `Analyzing your last ${recentDoses.length} insulin doses:\n\n`;
  
  analysis += `**Dosing Overview:**\n`;
  analysis += `• Average dose: ${avgDose.toFixed(1)} units\n`;
  analysis += `• Range: ${minDose.toFixed(1)} - ${maxDose.toFixed(1)} units\n`;
  analysis += `• Today: ${todayDoses.length} doses (${totalDaily.toFixed(1)}u total)\n`;
  if (rapidDoses.length > 0) analysis += `• Rapid/Bolus: ${rapidDoses.length} doses\n`;
  if (longDoses.length > 0) analysis += `• Long/Basal: ${longDoses.length} doses\n`;

  analysis += `\n**Time of Day Patterns:**\n`;
  if (morningAvg) analysis += `• Morning (6am-12pm): ${morningDoses.length} doses, avg ${morningAvg.toFixed(1)}u\n`;
  if (afternoonAvg) analysis += `• Afternoon (12pm-6pm): ${afternoonDoses.length} doses, avg ${afternoonAvg.toFixed(1)}u\n`;
  if (eveningAvg) analysis += `• Evening (6pm-12am): ${eveningDoses.length} doses, avg ${eveningAvg.toFixed(1)}u\n`;

  // Identify patterns
  if (morningAvg && eveningAvg && morningAvg > eveningAvg * 1.5) {
    analysis += `\n🌅 **Morning Pattern:** You're using significantly more insulin in the morning (${morningAvg.toFixed(1)}u vs ${eveningAvg.toFixed(1)}u evening).\n`;
    analysis += `• This is common due to dawn phenomenon and morning insulin resistance\n`;
    analysis += `• Consider pre-bolusing 20-30 minutes before breakfast\n`;
    analysis += `• You might need a higher insulin-to-carb ratio in the morning\n`;
  }

  if (eveningAvg && eveningAvg > 8) {
    analysis += `\n🌙 **Evening Pattern:** Your evening doses average ${eveningAvg.toFixed(1)}u - that's substantial.\n`;
    analysis += `• Large evening doses can cause overnight lows\n`;
    analysis += `• Consider eating dinner earlier or reducing dinner carbs\n`;
    analysis += `• Monitor your glucose at bedtime and 3am to check for lows\n`;
  }

  // Stacking warnings
  if (stackingEvents.length > 0) {
    analysis += `\n🚨 **STACKING ALERT:** I found ${stackingEvents.length} instances of doses within 2 hours:\n`;
    stackingEvents.slice(0, 3).forEach(event => {
      analysis += `• ${event}\n`;
    });
    analysis += `\nThis is dangerous! Insulin stacking can cause severe hypoglycemia.\n`;
    analysis += `**Action:** Always check your IOB before dosing. Wait at least 3-4 hours between correction doses.\n`;
  }

  // Find the largest dose
  const largestDose = recentDoses.reduce((max, dose) => dose.units > max.units ? dose : max);
  if (largestDose.units > 15) {
    const doseTime = new Date(largestDose.taken_at).toLocaleString();
    analysis += `\n⚠️ **Large Dose Alert:** You took ${largestDose.units}u on ${doseTime}.\n`;
    analysis += `• Doses over 15u are difficult to manage and increase low risk\n`;
    analysis += `• Consider splitting large doses: take part now, part 30-60min later\n`;
    analysis += `• Or reduce the carbs in that meal\n`;
  }

  // Calculate estimated daily total
  const daysTracked = Math.ceil((new Date(recentDoses[0].taken_at).getTime() - new Date(recentDoses[recentDoses.length - 1].taken_at).getTime()) / (1000 * 60 * 60 * 24));
  const totalUnits = recentDoses.reduce((sum, d) => sum + d.units, 0);
  const avgDailyTotal = totalUnits / Math.max(daysTracked, 1);
  
  analysis += `\n**Estimated Daily Total:** ${avgDailyTotal.toFixed(1)} units/day\n`;
  if (avgDailyTotal > 100) {
    analysis += `⚠️ This is quite high - discuss with your doctor about insulin resistance or dosing strategy.\n`;
  } else if (avgDailyTotal < 20) {
    analysis += `This is relatively low - make sure you're dosing adequately for all meals.\n`;
  }

  return analysis;
}

function analyzeSensors(sensors: any[]): string {
  if (sensors.length === 0) {
    return "Add your CGM sensors to track their performance and get longevity insights!";
  }

  const activeSensors = sensors.filter(s => !s.removed_at);
  const completedSensors = sensors.filter(s => s.removed_at);
  
  let avgDuration = 0;
  if (completedSensors.length > 0) {
    avgDuration = completedSensors.reduce((sum, sensor) => {
      const start = new Date(sensor.inserted_at);
      const end = new Date(sensor.removed_at);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }, 0) / completedSensors.length;
  }

  let analysis = `📡 **Sensor Performance**\n\n`;
  analysis += `• Active sensors: ${activeSensors.length}\n`;
  analysis += `• Total sensors tracked: ${sensors.length}\n`;
  if (avgDuration > 0) {
    analysis += `• Average sensor duration: ${avgDuration.toFixed(1)} days\n`;
  }
  analysis += `\n💡 **Tips:**\n`;
  analysis += `• Rotate insertion sites to prevent scar tissue buildup\n`;
  analysis += `• Keep sensors clean and dry for better adhesion\n`;
  analysis += `• Track problematic sensors to identify patterns`;

  return analysis;
}

function generateGeneralInsights(userData: any): string {
  const hasGlucose = userData.glucose.length > 0;
  const hasFood = userData.food.length > 0;
  const hasInsulin = userData.insulin.length > 0;
  const hasSensors = userData.sensors.length > 0;

  let insights = `📈 **Your Diabetes Management Overview**\n\n`;

  if (hasGlucose) {
    const avg = userData.glucose.reduce((sum: number, g: any) => sum + g.value, 0) / userData.glucose.length;
    insights += `✅ Glucose tracking active (Avg: ${avg.toFixed(0)} mg/dL)\n`;
  } else {
    insights += `⚠️ No glucose data yet - connect your CGM\n`;
  }

  if (hasFood) {
    insights += `✅ Meal logging active (${userData.food.length} recent meals)\n`;
  } else {
    insights += `⚠️ Start logging meals for better insights\n`;
  }

  if (hasInsulin) {
    insights += `✅ Insulin tracking active (${userData.insulin.length} recent doses)\n`;
  } else {
    insights += `⚠️ Log insulin doses for comprehensive tracking\n`;
  }

  if (hasSensors) {
    insights += `✅ Sensor management active (${userData.sensors.length} sensors)\n`;
  }

  insights += `\n💡 Keep logging consistently for more personalized insights!`;

  return insights;
}
