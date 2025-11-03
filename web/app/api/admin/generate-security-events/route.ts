import { NextRequest, NextResponse } from 'next/server';
import { securityEventLogger } from '@/lib/security/security-event-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType = 'demo', count = 1 } = body;

    const events = [];
    
    for (let i = 0; i < count; i++) {
      const context = {
        userId: `demo-user-${Math.random().toString(36).substring(7)}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        action: 'demo_action',
        metadata: {
          demo: true,
          generated_at: new Date().toISOString()
        }
      };

      switch (eventType) {
        case 'auth_failed':
          await securityEventLogger.logAuthEvent('login_failed', {
            ...context,
            action: 'login_attempt',
            metadata: {
              ...context.metadata,
              attempts: Math.floor(Math.random() * 5) + 1,
              user_agent: context.userAgent
            }
          });
          events.push('Failed login event generated');
          break;

        case 'bulk_sensors':
          await securityEventLogger.logBehaviorEvent('bulk_creation', {
            ...context,
            action: 'sensor_creation',
            metadata: {
              ...context.metadata,
              count: Math.floor(Math.random() * 15) + 5,
              time_window: '10_minutes'
            }
          });
          events.push('Bulk sensor creation event generated');
          break;

        case 'suspicious_behavior':
          await securityEventLogger.logBehaviorEvent('suspicious_activity', {
            ...context,
            action: 'user_activity',
            metadata: {
              ...context.metadata,
              risk_score: Math.floor(Math.random() * 100),
              pattern_type: 'unusual_timing'
            }
          });
          events.push('Suspicious behavior event generated');
          break;

        case 'data_access':
          await securityEventLogger.logDataAccessEvent('bulk_read', {
            ...context,
            action: 'data_access',
            resource: 'sensors',
            metadata: {
              ...context.metadata,
              records_accessed: Math.floor(Math.random() * 100) + 20,
              access_pattern: 'bulk_query'
            }
          });
          events.push('Bulk data access event generated');
          break;

        case 'admin_action':
          await securityEventLogger.logDataAccessEvent('admin_action', {
            ...context,
            action: 'user_management',
            resource: 'profiles',
            metadata: {
              ...context.metadata,
              admin_operation: 'user_role_change',
              target_user: `user_${Math.random().toString(36).substring(7)}`
            }
          });
          events.push('Admin action event generated');
          break;

        default:
          // Generate a random mix of events
          const eventTypes = ['auth_failed', 'bulk_sensors', 'suspicious_behavior', 'data_access'];
          const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          
          // Recursively call with random type
          const response = await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: randomType, count: 1 })
          });
          
          if (response.ok) {
            const data = await response.json();
            events.push(...data.events);
          }
          break;
      }

      // Add small delay between events to make them more realistic
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      }
    }

    return NextResponse.json({
      success: true,
      events,
      message: `Generated ${events.length} security events`
    });

  } catch (error) {
    console.error('Error generating security events:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate security events'
    }, { status: 500 });
  }
}