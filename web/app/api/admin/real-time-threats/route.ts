import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ThreatEvent {
  id: string;
  timestamp: string;
  type: 'authentication' | 'behavior' | 'data_access' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  metadata: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // ISO timestamp
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recent security events from system_logs
    let query = supabase
      .from('system_logs')
      .select('*')
      .eq('category', 'security')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gt('created_at', since);
    } else {
      // Default to last 10 minutes if no since parameter
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      query = query.gte('created_at', tenMinutesAgo);
    }

    const { data: securityLogs, error } = await query;

    if (error) {
      console.error('Error fetching security logs:', error);
      return NextResponse.json({ threats: [] });
    }

    // Transform security logs into threat events
    const threats: ThreatEvent[] = (securityLogs || []).map(log => {
      const threat: ThreatEvent = {
        id: log.id,
        timestamp: log.created_at,
        type: determineThreatType(log.message, log.metadata),
        severity: mapLogLevelToSeverity(log.level),
        message: log.message,
        source: extractSource(log.user_hash, log.metadata),
        metadata: {
          ...log.metadata,
          user_hash: log.user_hash,
          log_level: log.level
        }
      };

      return threat;
    });

    // Also check for new high-risk users and authentication failures
    const additionalThreats = await generateAdditionalThreats(since);
    
    const allThreats = [...threats, ...additionalThreats]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ 
      threats: allThreats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in real-time threats API:', error);
    return NextResponse.json({ threats: [] }, { status: 500 });
  }
}

function determineThreatType(message: string, metadata: any): ThreatEvent['type'] {
  const lowerMessage = message.toLowerCase();
  
  // Check metadata for specific threat indicators first
  if (metadata?.threat_type) {
    return metadata.threat_type;
  }
  
  if (metadata?.authentication_failure || lowerMessage.includes('login') || lowerMessage.includes('auth') || lowerMessage.includes('failed')) {
    return 'authentication';
  }
  
  if (metadata?.suspicious_behavior || lowerMessage.includes('user') || lowerMessage.includes('behavior') || lowerMessage.includes('suspicious')) {
    return 'behavior';
  }
  
  if (metadata?.data_access || lowerMessage.includes('data') || lowerMessage.includes('access') || lowerMessage.includes('bulk')) {
    return 'data_access';
  }
  
  return 'system';
}

function mapLogLevelToSeverity(level: string): ThreatEvent['severity'] {
  switch (level) {
    case 'error': return 'critical';
    case 'warn': return 'high';
    case 'info': return 'medium';
    default: return 'low';
  }
}

function extractSource(userHash: string | null, metadata: any): string {
  if (metadata?.ip_address) {
    return metadata.ip_address;
  }
  
  if (userHash && userHash !== 'system') {
    return userHash;
  }
  
  if (metadata?.user_id) {
    return `user_${metadata.user_id.substring(0, 8)}`;
  }
  
  return 'system';
}

async function generateAdditionalThreats(since: string | null): Promise<ThreatEvent[]> {
  const threats: ThreatEvent[] = [];
  const timeThreshold = since ? new Date(since) : new Date(Date.now() - 10 * 60 * 1000);

  try {
    // Check for recent high-risk user behavior
    const { data: recentSensors } = await supabase
      .from('sensors')
      .select('user_id, created_at')
      .gte('created_at', timeThreshold.toISOString())
      .eq('is_deleted', false);

    if (recentSensors) {
      // Group by user and count
      const userActivity = new Map<string, number>();
      recentSensors.forEach(sensor => {
        const count = userActivity.get(sensor.user_id) || 0;
        userActivity.set(sensor.user_id, count + 1);
      });

      // Generate threats for users with excessive activity
      userActivity.forEach((count, userId) => {
        if (count > 5) { // More than 5 sensors in the time period
          threats.push({
            id: `behavior_${userId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'behavior',
            severity: count > 10 ? 'high' : 'medium',
            message: `Excessive sensor creation detected: ${count} sensors`,
            source: `user_${userId.substring(0, 8)}`,
            metadata: {
              user_id: userId,
              sensor_count: count,
              detection_type: 'bulk_creation',
              time_window: '10_minutes'
            }
          });
        }
      });
    }

    // Check for recent profile updates (potential account compromise)
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, updated_at, role')
      .gte('updated_at', timeThreshold.toISOString());

    if (recentProfiles) {
      const userUpdates = new Map<string, number>();
      recentProfiles.forEach(profile => {
        const count = userUpdates.get(profile.id) || 0;
        userUpdates.set(profile.id, count + 1);
      });

      userUpdates.forEach((count, userId) => {
        if (count > 3) { // More than 3 profile updates in 10 minutes
          threats.push({
            id: `auth_${userId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'authentication',
            severity: count > 5 ? 'high' : 'medium',
            message: `Frequent profile updates detected: ${count} updates`,
            source: `user_${userId.substring(0, 8)}`,
            metadata: {
              user_id: userId,
              update_count: count,
              detection_type: 'frequent_updates',
              time_window: '10_minutes'
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('Error generating additional threats:', error);
  }

  return threats;
}