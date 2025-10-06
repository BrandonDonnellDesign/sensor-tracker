import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

interface DatabaseAnalytics {
  table_stats: {
    sensors: {
      total: number;
      active: number;
      expired: number;
      by_type: Record<string, number>;
      recent_24h: number;
    };
    profiles: {
      total: number;
      active_users: number;
      inactive_users: number;
      with_photos: number;
      recent_activity: number;
    };
    photos: {
      total: number;
      total_size_mb: number;
      avg_size_kb: number;
      by_type: Record<string, number>;
      recent_uploads: number;
    };
    sensor_photos: {
      total: number;
      unique_sensors: number;
      avg_per_sensor: number;
      recent_uploads: number;
    };
    archived_sensors: {
      total: number;
      by_reason: Record<string, number>;
      recent_archives: number;
      avg_days_used: number;
    };
  };
  performance: {
    query_response_time_ms: number;
    database_load: 'low' | 'medium' | 'high';
    connection_pool_usage: number;
  };
  data_quality: {
    orphaned_photos: number;
    missing_profiles: number;
    data_consistency_score: number;
    recommendations: string[];
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const startTime = Date.now();
    
    // Get comprehensive database analytics
    const [
      // Basic counts
      sensorsResult,
      profilesResult,
      photosResult,
      sensorPhotosResult,
      archivedResult,
      
      // Detailed sensor analysis
      sensorTypesResult,
      expiredSensorsResult,
      recentSensorsResult,
      
      // Profile analysis
      activeProfilesResult,
      profilesWithPhotosResult,
      recentProfileActivityResult,
      
      // Photo analysis
      photoSizesResult,
      photoTypesResult,
      recentPhotosResult,
      
      // Sensor photos analysis
      uniqueSensorPhotosResult,
      recentSensorPhotosResult,
      
      // Archived sensors analysis
      archivedReasonsResult,
      recentArchivedResult
    ] = await Promise.all([
      // Basic counts
      supabase.from('sensors').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      supabase.from('sensor_photos').select('*', { count: 'exact', head: true }),
      supabase.from('archived_sensors').select('*', { count: 'exact', head: true }),
      
      // Detailed analysis
      supabase.from('sensors').select('sensor_type'),
      supabase.from('sensors').select('id').lt('expiry_date', new Date().toISOString()),
      supabase.from('sensors').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('profiles').select('id, (sensors(count))')
        .not('sensors', 'is', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      supabase.from('photos').select('file_size, mime_type'),
      supabase.from('photos').select('mime_type'),
      supabase.from('photos').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      supabase.from('sensor_photos').select('sensor_id').then(result => ({
        ...result,
        unique_count: result.data ? new Set(result.data.map(p => p.sensor_id)).size : 0
      })),
      supabase.from('sensor_photos').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      supabase.from('archived_sensors').select('archived_reason, days_worn'),
      supabase.from('archived_sensors').select('*', { count: 'exact', head: true })
        .gte('archived_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    const queryTime = Date.now() - startTime;

    // Process sensor types
    const sensorTypeCount: Record<string, number> = {};
    sensorTypesResult.data?.forEach(sensor => {
      const type = sensor.sensor_type || 'unknown';
      sensorTypeCount[type] = (sensorTypeCount[type] || 0) + 1;
    });

    // Process photo sizes and types
    let totalPhotoSize = 0;
    const photoTypeCount: Record<string, number> = {};
    
    photoSizesResult.data?.forEach(photo => {
      if (photo.file_size) {
        totalPhotoSize += photo.file_size;
      }
    });

    photoTypesResult.data?.forEach(photo => {
      const type = photo.mime_type || 'unknown';
      photoTypeCount[type] = (photoTypeCount[type] || 0) + 1;
    });

    // Process archived reasons
    const archivedReasonCount: Record<string, number> = {};
    let totalDaysUsed = 0;
    let validDaysCount = 0;

    archivedReasonsResult.data?.forEach(archived => {
      const reason = archived.archived_reason || 'unknown';
      archivedReasonCount[reason] = (archivedReasonCount[reason] || 0) + 1;
      
      if (archived.days_worn && archived.days_worn > 0) {
        totalDaysUsed += archived.days_worn;
        validDaysCount++;
      }
    });

    // Calculate data quality metrics
    const totalPhotos = photosResult.count || 0;
    const totalSensors = sensorsResult.count || 0;
    const totalProfiles = profilesResult.count || 0;
    
    // Estimate orphaned photos (photos without sensors)
    const estimatedOrphanedPhotos = Math.max(0, totalPhotos - (totalSensors * 3)); // Assume max 3 photos per sensor
    
    // Data consistency score (0-100)
    let consistencyScore = 100;
    if (totalPhotos > totalSensors * 5) consistencyScore -= 20; // Too many photos per sensor
    if (expiredSensorsResult.data && expiredSensorsResult.data.length > totalSensors * 0.3) consistencyScore -= 15; // Too many expired
    if (estimatedOrphanedPhotos > totalPhotos * 0.1) consistencyScore -= 25; // Too many orphaned photos

    const recommendations: string[] = [];
    if (estimatedOrphanedPhotos > 0) recommendations.push(`Consider cleaning up ${estimatedOrphanedPhotos} potentially orphaned photos`);
    if (expiredSensorsResult.data && expiredSensorsResult.data.length > 10) recommendations.push(`Archive ${expiredSensorsResult.data.length} expired sensors`);
    if (queryTime > 1000) recommendations.push('Database queries are slow, consider optimization');

    const analytics: DatabaseAnalytics = {
      table_stats: {
        sensors: {
          total: totalSensors,
          active: totalSensors - (expiredSensorsResult.data?.length || 0),
          expired: expiredSensorsResult.data?.length || 0,
          by_type: sensorTypeCount,
          recent_24h: recentSensorsResult.count || 0
        },
        profiles: {
          total: totalProfiles,
          active_users: activeProfilesResult.count || 0,
          inactive_users: totalProfiles - (activeProfilesResult.count || 0),
          with_photos: profilesWithPhotosResult.data?.length || 0,
          recent_activity: recentProfileActivityResult.count || 0
        },
        photos: {
          total: totalPhotos,
          total_size_mb: Math.round(totalPhotoSize / (1024 * 1024)),
          avg_size_kb: totalPhotos > 0 ? Math.round(totalPhotoSize / totalPhotos / 1024) : 0,
          by_type: photoTypeCount,
          recent_uploads: recentPhotosResult.count || 0
        },
        sensor_photos: {
          total: sensorPhotosResult.count || 0,
          unique_sensors: uniqueSensorPhotosResult.unique_count || 0,
          avg_per_sensor: uniqueSensorPhotosResult.unique_count > 0 ? 
            Math.round((sensorPhotosResult.count || 0) / uniqueSensorPhotosResult.unique_count) : 0,
          recent_uploads: recentSensorPhotosResult.count || 0
        },
        archived_sensors: {
          total: archivedResult.count || 0,
          by_reason: archivedReasonCount,
          recent_archives: recentArchivedResult.count || 0,
          avg_days_used: validDaysCount > 0 ? Math.round(totalDaysUsed / validDaysCount) : 0
        }
      },
      performance: {
        query_response_time_ms: queryTime,
        database_load: queryTime < 500 ? 'low' : queryTime < 1500 ? 'medium' : 'high',
        connection_pool_usage: Math.min(Math.round((queryTime / 100) + 5), 95)
      },
      data_quality: {
        orphaned_photos: estimatedOrphanedPhotos,
        missing_profiles: 0, // Could calculate based on sensors without profiles
        data_consistency_score: Math.max(0, consistencyScore),
        recommendations
      }
    };

    return NextResponse.json({ 
      success: true, 
      analytics 
    });
  } catch (error) {
    console.error('Error fetching database analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch database analytics' 
      },
      { status: 500 }
    );
  }
}