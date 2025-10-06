import { NextRequest, NextResponse } from 'next/server';

// Mock feature flags data - in production this would come from your database
const mockFeatureFlags = [
  {
    key: 'new_dashboard_ui',
    name: 'New Dashboard UI',
    description: 'Enable the redesigned dashboard interface',
    enabled: true,
    rollout_percentage: 85,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T12:00:00.000Z'
  },
  {
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Show detailed analytics and insights',
    enabled: false,
    rollout_percentage: 0,
    created_at: '2024-01-05T00:00:00.000Z',
    updated_at: '2024-01-05T00:00:00.000Z'
  },
  {
    key: 'mobile_notifications',
    name: 'Mobile Push Notifications',
    description: 'Enable push notifications for mobile app',
    enabled: true,
    rollout_percentage: 100,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-20T08:30:00.000Z'
  },
  {
    key: 'auto_sync',
    name: 'Automatic Data Sync',
    description: 'Automatically sync data in the background',
    enabled: true,
    rollout_percentage: 60,
    created_at: '2024-01-12T00:00:00.000Z',
    updated_at: '2024-01-25T14:45:00.000Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Return mock data - in production, this would query the database
    return NextResponse.json(mockFeatureFlags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, enabled, rollout_percentage } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Feature flag key is required' },
        { status: 400 }
      );
    }

    // Find and update the mock flag
    const flagIndex = mockFeatureFlags.findIndex(flag => flag.key === key);
    
    if (flagIndex === -1) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Update the flag
    const flag = mockFeatureFlags[flagIndex];
    if (typeof enabled === 'boolean') {
      flag.enabled = enabled;
    }
    if (typeof rollout_percentage === 'number') {
      flag.rollout_percentage = rollout_percentage;
    }
    flag.updated_at = new Date().toISOString();

    return NextResponse.json(flag);
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}