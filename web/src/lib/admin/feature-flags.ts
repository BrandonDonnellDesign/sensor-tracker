// Admin feature flags helper functions that use API routes
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await fetch('/api/admin/feature-flags');
  
  if (!response.ok) {
    throw new Error('Failed to fetch feature flags');
  }
  
  return response.json();
}

export async function updateFeatureFlag(
  key: string, 
  updates: { enabled?: boolean; rollout_percentage?: number }
): Promise<FeatureFlag> {
  const response = await fetch('/api/admin/feature-flags', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, ...updates }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update feature flag');
  }
  
  return response.json();
}