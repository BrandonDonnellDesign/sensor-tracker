import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get category statistics
    const { data: categoryStats, error } = await supabase
      .from('community_tips')
      .select('category')
      .not('category', 'is', null);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch categories' },
        { status: 500 }
      );
    }
    
    // Count tips per category
    const categoryCounts = categoryStats?.reduce((acc, tip) => {
      acc[tip.category] = (acc[tip.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Define category metadata
    const categoryMetadata = {
      insertion: {
        name: 'Insertion Tips',
        description: 'Tips for proper sensor insertion and placement',
        icon: '💉'
      },
      adhesion: {
        name: 'Adhesion & Longevity',
        description: 'Keep your sensors secure and lasting longer',
        icon: '🔒'
      },
      troubleshooting: {
        name: 'Troubleshooting',
        description: 'Solutions for common sensor issues',
        icon: '🔧'
      },
      longevity: {
        name: 'Sensor Longevity',
        description: 'Maximize your sensor lifespan',
        icon: '⏰'
      },
      general: {
        name: 'General Tips',
        description: 'General advice and best practices',
        icon: '💡'
      }
    };
    
    // Build categories response
    const categories = Object.entries(categoryMetadata).map(([id, meta]) => ({
      id,
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      tipCount: categoryCounts[id] || 0
    }));
    
    const responseTime = `${Date.now() - startTime}ms`;
    
    return NextResponse.json({
      data: categories,
      meta: {
        responseTime,
        apiVersion: '1.0.0',
        rateLimit: {
          limit: '1000',
          remaining: '999',
          reset: Math.floor(Date.now() / 1000) + 3600
        }
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
