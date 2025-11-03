'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Clock, 
  MapPin, 
  Users,
  Zap,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ThreatEvent {
  id: string;
  timestamp: string;
  type: 'authentication' | 'behavior' | 'data_access' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  metadata: Record<string, any>;
}

export function RealTimeThreats() {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetchRef = useRef<string | null>(null);

  // Initialize audio for alerts
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  }, []);

  const fetchThreats = async () => {
    if (!isMonitoring) return;

    try {
      // Get the timestamp of the most recent threat for incremental updates
      const since = lastFetchRef.current || (threats.length > 0 ? threats[0].timestamp : undefined);
      
      const response = await fetch(`/api/admin/real-time-threats${since ? `?since=${encodeURIComponent(since)}` : ''}`);
      
      if (response.ok) {
        const data = await response.json();
        const newThreats = data.threats || [];
        
        if (newThreats.length > 0) {
          setThreats(prev => {
            // Merge new threats with existing ones, avoiding duplicates
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewThreats = newThreats.filter((t: ThreatEvent) => !existingIds.has(t.id));
            
            if (uniqueNewThreats.length === 0) return prev;
            
            const updated = [...uniqueNewThreats, ...prev].slice(0, 50); // Keep last 50 threats
            
            // Play sound for new high/critical threats
            const highPriorityThreats = uniqueNewThreats.filter((t: ThreatEvent) => 
              ['high', 'critical'].includes(t.severity)
            );
            
            if (soundEnabled && highPriorityThreats.length > 0) {
              audioRef.current?.play().catch(() => {
                // Ignore audio play errors
              });
            }
            
            return updated;
          });
          
          // Update last fetch timestamp
          lastFetchRef.current = new Date().toISOString();
        }
      }
    } catch (error) {
      console.error('Error fetching real threats:', error);
    }
  };

  const generateTestEvent = async () => {
    try {
      const response = await fetch('/api/admin/generate-security-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'demo', count: 1 })
      });

      if (response.ok) {
        // Immediately fetch new threats to show the generated event
        setTimeout(fetchThreats, 500);
      }
    } catch (error) {
      console.error('Error generating test event:', error);
    }
  };

  useEffect(() => {
    if (isMonitoring) {
      intervalRef.current = setInterval(fetchThreats, 3000); // Check every 3 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring, soundEnabled]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'authentication': return <Shield className="w-4 h-4" />;
      case 'behavior': return <Users className="w-4 h-4" />;
      case 'data_access': return <Activity className="w-4 h-4" />;
      case 'system': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredThreats = threats.filter(threat => 
    filter === 'all' || threat.severity === filter
  );

  const threatCounts = {
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    medium: threats.filter(t => t.severity === 'medium').length,
    low: threats.filter(t => t.severity === 'low').length
  };

  return (
    <div className="space-y-6">
      {/* Real-time Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Real-time Threat Monitor
            </h3>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {isMonitoring ? 'Active' : 'Paused'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
              }`}
              title={soundEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <button
              onClick={generateTestEvent}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Zap className="w-4 h-4" />
              <span>Test Event</span>
            </button>
            
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isMonitoring ? 'Pause' : 'Resume'}</span>
            </button>
          </div>
        </div>

        {/* Threat Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{threatCounts.critical}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Critical</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{threatCounts.high}</div>
            <div className="text-sm text-orange-700 dark:text-orange-300">High</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{threatCounts.medium}</div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Medium</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{threatCounts.low}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Low</div>
          </div>
        </div>
      </div>

      {/* Threat Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Filter:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Threat Feed */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold text-gray-900 dark:text-slate-100">
            Live Threat Feed ({filteredThreats.length})
          </h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredThreats.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h5 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No Threats Detected
              </h5>
              <p className="text-gray-600 dark:text-slate-400">
                {isMonitoring ? 'System is monitoring for threats...' : 'Monitoring is paused'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredThreats.map((threat) => (
                <div key={threat.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(threat.severity)}`}>
                      {getTypeIcon(threat.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {threat.message}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(threat.severity)}`}>
                          {threat.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(threat.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{threat.source}</span>
                        </div>
                        <span className="capitalize">{threat.type.replace('_', ' ')}</span>
                      </div>
                      
                      {/* Metadata */}
                      {Object.keys(threat.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                          {Object.entries(threat.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: <span className="font-medium">{String(value)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}