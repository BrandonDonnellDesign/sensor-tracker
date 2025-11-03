import { createClient } from '@/lib/supabase-client';
import { 
  Target, 
  Sparkles, 
  BarChart3, 
  Brain, 
  Smartphone, 
  Database, 
  Users, 
  Heart, 
  Globe,
  Shield,
  Zap,
  Calendar,
  Bell
} from 'lucide-react';

// Icon mapping for dynamic loading
const iconMap: Record<string, any> = {
  Target,
  Sparkles,
  BarChart3,
  Brain,
  Smartphone,
  Database,
  Users,
  Heart,
  Globe,
  Shield,
  Zap,
  Calendar,
  Bell
};

export interface DatabaseRoadmapItem {
  id: string;
  item_id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned' | 'future';
  category: 'core' | 'analytics' | 'integrations' | 'mobile' | 'ai' | 'social' | 'security';
  priority: 'high' | 'medium' | 'low';
  estimated_quarter: string;
  target_date?: string | null;
  icon_name: string;
  progress: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  features?: DatabaseRoadmapFeature[];
  tags?: DatabaseRoadmapTag[];
  dependencies?: DatabaseRoadmapItem[];
  icon?: any; // For the actual icon component
}

export interface DatabaseRoadmapFeature {
  id: string;
  feature_text: string;
  is_completed: boolean;
  sort_order: number;
}

export interface DatabaseRoadmapTag {
  id: string;
  tag_name: string;
}

export interface RoadmapStats {
  totalItems: number;
  completed: number;
  'in-progress': number;
  planned: number;
  future: number;
  totalFeatures: number;
  completedFeatures: number;
  upcomingDeadlines: number;
}

/**
 * Fetch all roadmap items with their features, tags, and dependencies
 */
export async function fetchRoadmapItems(): Promise<DatabaseRoadmapItem[]> {
  try {
    const supabase = createClient();
    // Fetch roadmap items with features and tags, ordered by status priority and sort_order
    const { data: items, error } = await (supabase as any)
      .from('roadmap_items')
      .select(`
        *,
        features:roadmap_features(
          id,
          feature_text,
          is_completed,
          sort_order
        ),
        tags:roadmap_tags(
          id,
          tag_name
        )
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching roadmap items:', error);
      return [];
    }

    if (!items) return [];

    // Fetch dependencies separately (due to Supabase join limitations)
    const itemsWithDependencies = await Promise.all(
      items.map(async (item: any) => {
        const { data: deps } = await (supabase as any)
          .from('roadmap_dependencies')
          .select(`
            depends_on:roadmap_items!roadmap_dependencies_depends_on_id_fkey(
              id,
              item_id,
              title,
              status
            )
          `)
          .eq('item_id', item.id);

        // Defensive: if deps is not an array, set dependencies to undefined
        let dependencies: any[] | undefined = undefined;
        if (Array.isArray(deps)) {
          dependencies = deps
            .map(d => d.depends_on)
            .filter(dep => dep && typeof (dep as any).id === 'string' && typeof (dep as any).title === 'string') as unknown as DatabaseRoadmapItem[];
        }

        return {
          ...item,
          dependencies
        } as DatabaseRoadmapItem;
      })
    );

    // Only keep items with a valid sort_order property
    // Only keep items with a numeric sort_order
    const validItems = itemsWithDependencies.filter(item => typeof item.sort_order === 'number');
    // Sort items by status priority and then by sort_order
    const sortedItems = validItems.sort((a, b) => {
      const statusPriority = {
        'in-progress': 1,
        'planned': 2,
        'future': 3,
        'completed': 4
      };
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 5;
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 5;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.sort_order - b.sort_order;
    });
    return sortedItems.map(transformDatabaseItem);
  } catch (error) {
    console.error('Error in fetchRoadmapItems:', error);
    return [];
  }
}

/**
 * Fetch roadmap statistics
 */
export async function fetchRoadmapStats(): Promise<RoadmapStats> {
  try {
    const supabase = createClient();
    const { data: items, error } = await (supabase as any)
      .from('roadmap_items')
      .select(`
        status,
        features:roadmap_features(
          is_completed
        )
      `);

    if (error || !items) {
      console.error('Error fetching roadmap stats:', error);
      return {
        totalItems: 0,
        completed: 0,
        'in-progress': 0,
        planned: 0,
        future: 0,
        totalFeatures: 0,
        completedFeatures: 0,
        upcomingDeadlines: 0
      };
    }

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const stats = items.reduce(
      (acc: any, item: any) => {
        acc[item.status as keyof RoadmapStats] = (acc[item.status as keyof RoadmapStats] as number) + 1;
        
        const features = item.features || [];
        acc.totalFeatures += features.length;
        acc.completedFeatures += features.filter((f: any) => f.is_completed).length;
        
        return acc;
      },
      {
        totalItems: items.length,
        completed: 0,
        'in-progress': 0,
        planned: 0,
        future: 0,
        totalFeatures: 0,
        completedFeatures: 0,
        upcomingDeadlines: 0
      } as RoadmapStats
    );

    // Calculate upcoming deadlines (items with target_date within next 3 months)
    const { data: upcomingItems } = await (supabase as any)
      .from('roadmap_items')
      .select('target_date')
      .not('target_date', 'is', null)
      .gte('target_date', now.toISOString().split('T')[0])
      .lte('target_date', threeMonthsFromNow.toISOString().split('T')[0]);

    stats.upcomingDeadlines = upcomingItems?.length || 0;

    return stats;
  } catch (error) {
    console.error('Error in fetchRoadmapStats:', error);
    return {
      totalItems: 0,
      completed: 0,
      'in-progress': 0,
      planned: 0,
      future: 0,
      totalFeatures: 0,
      completedFeatures: 0,
      upcomingDeadlines: 0
    };
  }
}



/**
 * Update roadmap item progress (admin only)
 */
export async function updateRoadmapProgress(
  itemId: string, 
  progress: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('roadmap_items')
      .update({ 
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('item_id', itemId);

    if (error) {
      console.error('Error updating roadmap progress:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateRoadmapProgress:', error);
    return { success: false, error: 'Failed to update progress' };
  }
}

/**
 * Update roadmap item status (admin only)
 */
export async function updateRoadmapStatus(
  itemId: string, 
  status: DatabaseRoadmapItem['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('roadmap_items')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('item_id', itemId);

    if (error) {
      console.error('Error updating roadmap status:', error);
      return { success: false, error: error.message };
    }

    // Update all features to completed if item is completed
    if (status === 'completed') {
      const { data: item } = await (supabase as any)
        .from('roadmap_items')
        .select('id')
        .eq('item_id', itemId)
        .single();

      if (item) {
        await (supabase as any)
          .from('roadmap_features')
          .update({ is_completed: true })
          .eq('roadmap_item_id', item.id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateRoadmapStatus:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

/**
 * Update existing roadmap item (admin only)
 */
export async function updateRoadmapItem(
  itemId: string,
  updates: Partial<Omit<DatabaseRoadmapItem, 'id' | 'created_at' | 'updated_at' | 'features' | 'tags' | 'dependencies' | 'icon'>> & {
    features?: string[];
    tags?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    // Get the current item
    const { data: currentItem, error: fetchError } = await (supabase as any)
      .from('roadmap_items')
      .select('id')
      .eq('item_id', itemId)
      .single();

    if (fetchError || !currentItem) {
      return { success: false, error: 'Item not found' };
    }

    // Update the main item
    const itemUpdates: any = {};
    if (updates.title !== undefined) itemUpdates.title = updates.title;
    if (updates.description !== undefined) itemUpdates.description = updates.description;
    if (updates.status !== undefined) itemUpdates.status = updates.status;
    if (updates.category !== undefined) itemUpdates.category = updates.category;
    if (updates.priority !== undefined) itemUpdates.priority = updates.priority;
    if (updates.target_date !== undefined) itemUpdates.target_date = updates.target_date;
    if (updates.icon_name !== undefined) itemUpdates.icon_name = updates.icon_name;
    if (updates.sort_order !== undefined) itemUpdates.sort_order = updates.sort_order;
    
    itemUpdates.updated_at = new Date().toISOString();

    if (Object.keys(itemUpdates).length > 1) { // More than just updated_at
      const { error: updateError } = await (supabase as any)
        .from('roadmap_items')
        .update(itemUpdates)
        .eq('id', currentItem.id);

      if (updateError) {
        console.error('Error updating roadmap item:', updateError);
        return { success: false, error: updateError.message };
      }
    }

    // Update features if provided
    if (updates.features !== undefined) {
      // Delete existing features
      await (supabase as any)
        .from('roadmap_features')
        .delete()
        .eq('roadmap_item_id', currentItem.id);

      // Insert new features
      if (updates.features.length > 0) {
        const features = updates.features
          .filter(f => f.trim())
          .map((feature, index) => ({
            roadmap_item_id: currentItem.id,
            feature_text: feature,
            sort_order: index + 1
          }));

        const { error: featuresError } = await (supabase as any)
          .from('roadmap_features')
          .insert(features);

        if (featuresError) {
          console.error('Error updating features:', featuresError);
        }
      }
    }

    // Update tags if provided
    if (updates.tags !== undefined) {
      // Delete existing tags
      await (supabase as any)
        .from('roadmap_tags')
        .delete()
        .eq('roadmap_item_id', currentItem.id);

      // Insert new tags
      if (updates.tags.length > 0) {
        const tags = updates.tags
          .filter(t => t.trim())
          .map(tag => ({
            roadmap_item_id: currentItem.id,
            tag_name: tag
          }));

        const { error: tagsError } = await (supabase as any)
          .from('roadmap_tags')
          .insert(tags);

        if (tagsError) {
          console.error('Error updating tags:', tagsError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateRoadmapItem:', error);
    return { success: false, error: 'Failed to update roadmap item' };
  }
}

/**
 * Delete roadmap item (admin only)
 */
export async function deleteRoadmapItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('roadmap_items')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      console.error('Error deleting roadmap item:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteRoadmapItem:', error);
    return { success: false, error: 'Failed to delete roadmap item' };
  }
}

/**
 * Add new roadmap item (admin only)
 */
export async function addRoadmapItem(
  item: Omit<DatabaseRoadmapItem, 'id' | 'created_at' | 'updated_at' | 'features' | 'tags' | 'dependencies' | 'icon' | 'estimated_quarter'> & {
    features: string[];
    tags: string[];
  }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = createClient();
    // Insert roadmap item
    const { data: newItem, error: itemError } = await (supabase as any)
      .from('roadmap_items')
      .insert([{
        item_id: item.item_id,
        title: item.title,
        description: item.description,
        status: item.status,
        category: item.category,
        priority: item.priority,
        target_date: item.target_date,
        icon_name: item.icon_name,
        sort_order: item.sort_order
      }])
      .select()
      .single();

    if (itemError || !newItem) {
      console.error('Error creating roadmap item:', itemError);
      return { success: false, error: itemError?.message || 'Failed to create item' };
    }

    // Insert features
    if (item.features.length > 0) {
      const features = item.features.map((feature, index) => ({
        roadmap_item_id: newItem.id,
        feature_text: feature,
        sort_order: index + 1
      }));

      const { error: featuresError } = await (supabase as any)
        .from('roadmap_features')
        .insert(features);

      if (featuresError) {
        console.error('Error creating features:', featuresError);
      }
    }

    // Insert tags
    if (item.tags.length > 0) {
      const tags = item.tags.map(tag => ({
        roadmap_item_id: newItem.id,
        tag_name: tag
      }));

      const { error: tagsError } = await (supabase as any)
        .from('roadmap_tags')
        .insert(tags);

      if (tagsError) {
        console.error('Error creating tags:', tagsError);
      }
    }

    return { success: true, id: newItem.id };
  } catch (error) {
    console.error('Error in addRoadmapItem:', error);
    return { success: false, error: 'Failed to add roadmap item' };
  }
}

/**
 * Transform database item to match the expected format
 */
function transformDatabaseItem(item: any): DatabaseRoadmapItem {
  return {
    ...item,
    icon: iconMap[item.icon_name] || Target, // Fallback to Target icon
    features: item.features?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
    tags: item.tags || [],
    dependencies: item.dependencies || []
  };
}

/**
 * Subscribe to roadmap changes (real-time updates)
 */
export function subscribeToRoadmapChanges(
  callback: (payload: any) => void
) {
  const supabase = createClient();
  const subscription = supabase
    .channel('roadmap-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'roadmap_items'
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

/**
 * Check if user is admin (for roadmap management)
 */
export async function isRoadmapAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}