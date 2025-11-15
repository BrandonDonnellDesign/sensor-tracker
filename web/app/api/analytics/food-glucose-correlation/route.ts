import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface FoodImpact {
  food_name: string;
  occurrences: number;
  avg_glucose_before: number;
  avg_glucose_after: number;
  avg_spike: number;
  max_spike: number;
  min_spike: number;
  avg_carbs: number;
  spike_per_carb: number;
  consistency_score: number; // How consistent the spike is
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const minOccurrences = parseInt(searchParams.get('minOccurrences') || '2');

    // Get food logs with glucose readings within 2 hours
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: foodLogs, error: foodError } = await supabase
      .from('food_logs')
      .select(`
        *,
        food_items(product_name)
      `)
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false });

    if (foodError) throw foodError;

    // Get glucose readings
    const { data: glucoseReadings, error: glucoseError } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', user.id)
      .gte('reading_time', startDate.toISOString())
      .order('reading_time', { ascending: true });

    if (glucoseError) throw glucoseError;

    // Analyze food impact
    const foodImpactMap = new Map<string, {
      spikes: number[];
      glucoseBefore: number[];
      glucoseAfter: number[];
      carbs: number[];
    }>();

    for (const food of foodLogs || []) {
      const foodTime = new Date(food.logged_at);
      
      // Find glucose reading before meal (within 30 min before)
      const beforeWindow = new Date(foodTime.getTime() - 30 * 60 * 1000);
      const glucoseBefore = (glucoseReadings || []).find(g => {
        const readingTime = new Date(g.system_time);
        return readingTime >= beforeWindow && readingTime <= foodTime;
      });

      // Find glucose reading after meal (1-2 hours after)
      const afterWindowStart = new Date(foodTime.getTime() + 60 * 60 * 1000);
      const afterWindowEnd = new Date(foodTime.getTime() + 120 * 60 * 1000);
      const glucoseAfter = (glucoseReadings || []).find(g => {
        const readingTime = new Date(g.system_time);
        return readingTime >= afterWindowStart && readingTime <= afterWindowEnd;
      });

      if (glucoseBefore && glucoseAfter) {
        const spike = glucoseAfter.value - glucoseBefore.value;
        const foodName = (food.food_items as any)?.product_name || food.custom_food_name || 'Unknown';
        
        if (!foodImpactMap.has(foodName)) {
          foodImpactMap.set(foodName, {
            spikes: [],
            glucoseBefore: [],
            glucoseAfter: [],
            carbs: []
          });
        }

        const impact = foodImpactMap.get(foodName)!;
        impact.spikes.push(spike);
        impact.glucoseBefore.push(glucoseBefore.value);
        impact.glucoseAfter.push(glucoseAfter.value);
        impact.carbs.push(food.total_carbs_g || 0);
      }
    }

    // Calculate statistics
    const foodImpacts: FoodImpact[] = [];

    for (const [foodName, data] of foodImpactMap.entries()) {
      if (data.spikes.length < minOccurrences) continue;

      const avgSpike = data.spikes.reduce((a, b) => a + b, 0) / data.spikes.length;
      const avgCarbs = data.carbs.reduce((a, b) => a + b, 0) / data.carbs.length;
      
      // Calculate consistency (lower standard deviation = more consistent)
      const variance = data.spikes.reduce((sum, spike) => 
        sum + Math.pow(spike - avgSpike, 2), 0) / data.spikes.length;
      const stdDev = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (stdDev / avgSpike) * 100);

      foodImpacts.push({
        food_name: foodName,
        occurrences: data.spikes.length,
        avg_glucose_before: data.glucoseBefore.reduce((a, b) => a + b, 0) / data.glucoseBefore.length,
        avg_glucose_after: data.glucoseAfter.reduce((a, b) => a + b, 0) / data.glucoseAfter.length,
        avg_spike: avgSpike,
        max_spike: Math.max(...data.spikes),
        min_spike: Math.min(...data.spikes),
        avg_carbs: avgCarbs,
        spike_per_carb: avgCarbs > 0 ? avgSpike / avgCarbs : 0,
        consistency_score: Math.round(consistencyScore)
      });
    }

    // Sort by average spike (highest first)
    foodImpacts.sort((a, b) => b.avg_spike - a.avg_spike);

    return NextResponse.json({
      success: true,
      data: foodImpacts,
      summary: {
        total_foods_analyzed: foodImpacts.length,
        days_analyzed: days,
        highest_spike_food: foodImpacts[0]?.food_name,
        highest_spike_value: foodImpacts[0]?.avg_spike,
        most_consistent_food: foodImpacts.sort((a, b) => 
          b.consistency_score - a.consistency_score)[0]?.food_name
      }
    });

  } catch (error) {
    console.error('Food-glucose correlation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }, { status: 500 });
  }
}
