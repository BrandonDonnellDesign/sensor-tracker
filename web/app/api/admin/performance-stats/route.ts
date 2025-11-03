import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is admin (you may need to adjust this based on your auth setup)
    // For now, we'll allow access but you should add proper admin verification

    // Get performance data from the last 24 hours
    const { data: webVitals, error } = await supabase
      .from('web_vitals')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching web vitals:', error);
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
    }

    // If no data, return empty state
    if (!webVitals || webVitals.length === 0) {
      return NextResponse.json({
        overallScore: 0,
        grade: 'N/A',
        metrics: {
          lcp: { value: 0, rating: 'poor' },
          inp: { value: 0, rating: 'poor' },
          cls: { value: 0, rating: 'poor' },
          fcp: { value: 0, rating: 'poor' },
        },
        trend: 'stable',
        totalMeasurements: 0,
      });
    }

    // Calculate metrics
    const metrics = {
      lcp: calculateMetricStats(webVitals.filter(v => v.metric_name === 'LCP')),
      inp: calculateMetricStats(webVitals.filter(v => v.metric_name === 'INP')),
      cls: calculateMetricStats(webVitals.filter(v => v.metric_name === 'CLS')),
      fcp: calculateMetricStats(webVitals.filter(v => v.metric_name === 'FCP')),
    };

    // Calculate overall score (0-100)
    const scores = [
      getMetricScore('LCP', metrics.lcp.value),
      getMetricScore('INP', metrics.inp.value),
      getMetricScore('CLS', metrics.cls.value),
      getMetricScore('FCP', metrics.fcp.value),
    ];
    
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const grade = getGrade(overallScore);

    // Calculate trend (simplified - you could make this more sophisticated)
    const trend = calculateTrend(webVitals);

    return NextResponse.json({
      overallScore,
      grade,
      metrics,
      trend,
      totalMeasurements: webVitals.length,
    });

  } catch (error) {
    console.error('Performance stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateMetricStats(vitals: any[]) {
  if (vitals.length === 0) {
    return { value: 0, rating: 'poor' };
  }

  // Calculate median value
  const values = vitals.map(v => parseFloat(v.metric_value)).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];

  // Determine rating based on the most common rating
  const ratings = vitals.map(v => v.metric_rating);
  const ratingCounts = ratings.reduce((acc: any, rating: string) => {
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});
  
  const mostCommonRating = Object.keys(ratingCounts).reduce((a, b) => 
    ratingCounts[a] > ratingCounts[b] ? a : b
  );

  return {
    value: Math.round(median),
    rating: mostCommonRating,
  };
}

function getMetricScore(metricName: string, value: number): number {
  // Convert metric values to scores (0-100)
  switch (metricName) {
    case 'LCP':
      if (value <= 2500) return 100;
      if (value <= 4000) return 50;
      return 0;
    case 'INP':
      if (value <= 200) return 100;
      if (value <= 500) return 50;
      return 0;
    case 'CLS':
      if (value <= 0.1) return 100;
      if (value <= 0.25) return 50;
      return 0;
    case 'FCP':
      if (value <= 1800) return 100;
      if (value <= 3000) return 50;
      return 0;
    default:
      return 50;
  }
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateTrend(vitals: any[]): 'up' | 'down' | 'stable' {
  if (vitals.length < 10) return 'stable';

  // Simple trend calculation - compare first half vs second half
  const midpoint = Math.floor(vitals.length / 2);
  const firstHalf = vitals.slice(0, midpoint);
  const secondHalf = vitals.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, v) => sum + parseFloat(v.metric_value), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + parseFloat(v.metric_value), 0) / secondHalf.length;

  const difference = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (difference > 5) return 'down'; // Performance got worse (higher values are bad for most metrics)
  if (difference < -5) return 'up'; // Performance improved
  return 'stable';
}