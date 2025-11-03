'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Users, 
  Shield, 
  Eye, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Activity,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

interface UserThreatAnalysis {
  user_id: string;
  analysis_period_hours: number;
  sensor_activity_count: number;
  login_frequency: number;
  risk_score: number;
  unusual_activity_detected: boolean;
  risk_level: 'low' | 'medium' | 'high';
  analyzed_at: string;
}

interface AuthThreatAnalysis {
  analysis_period_hours: number;
  total_failed_attempts: number;
  unique_ips_involved: number;
  suspicious_ips: Array<{
    ip_address: string;
    targeted_users: number;
    total_attempts: number;
    most_recent: string;
  }>;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  analyzed_at: string;
}

interface DataAccessAnalysis {
  analysis_period_hours: number;
  bulk_access_users: Array<{
    user_id: string;
    sensors_accessed: number;
    active_hours: number;
    access_rate: number;
  }>;
  admin_activities: Array<{
    user_hash: string;
    admin_actions: number;
    action_types: string[];
  }>;
  analyzed_at: string;
}

export function ThreatAnalysis() {
  const [activeAnalysis, setActiveAnalysis] = useState<'users' | 'auth' | 'data'>('users');
  const [userAnalysis, setUserAnalysis] = useState<UserThreatAnalysis[]>([]);
  const [authAnalysis, setAuthAnalysis] = useState<AuthThreatAnalysis | null>(null);
  const [dataAnalysis, setDataAnalysis] = useState<DataAccessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<number>(24);

  const fetchUserAnalysis = async (userId?: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/security-analysis?action=user-patterns&userId=${userId}&hours=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        if (data.analysis) {
          setUserAnalysis([data.analysis]);
        }
      }
    } catch (error) {
      console.error('Error fetching user analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/security-analysis?action=failed-auth&hours=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAuthAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error fetching auth analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/security-analysis?action=data-access&hours=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setDataAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error fetching data analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = () => {
    switch (activeAnalysis) {
      case 'users':
        if (selectedUserId) fetchUserAnalysis(selectedUserId);
        break;
      case 'auth':
        fetchAuthAnalysis();
        break;
      case 'data':
        fetchDataAnalysis();
        break;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const exportAnalysis = () => {
    const data = {
      userAnalysis,
      authAnalysis,
      dataAnalysis,
      exportedAt: new Date().toISOString(),
      timeRange
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Advanced Threat Analysis
          </h3>
          
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last week</option>
            </select>
            
            <button
              onClick={exportAnalysis}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Analysis Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
          {[
            { id: 'users', label: 'User Behavior', icon: Users },
            { id: 'auth', label: 'Authentication', icon: Shield },
            { id: 'data', label: 'Data Access', icon: Eye }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAnalysis(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeAnalysis === tab.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Analysis Controls */}
        <div className="flex items-center space-x-4">
          {activeAnalysis === 'users' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                User ID to Analyze
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Enter user UUID..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
                <button
                  onClick={runAnalysis}
                  disabled={loading || !selectedUserId}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  <Search className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Analyze</span>
                </button>
              </div>
            </div>
          )}

          {activeAnalysis !== 'users' && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Run Analysis</span>
            </button>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {activeAnalysis === 'users' && userAnalysis.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            User Behavior Analysis Results
          </h4>
          
          {userAnalysis.map((analysis, index) => (
            <div key={index} className="space-y-4">
              {/* Risk Overview */}
              <div className={`p-4 rounded-lg border ${getRiskColor(analysis.risk_level)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <h5 className="font-semibold">Risk Assessment</h5>
                      <p className="text-sm opacity-80">User ID: {analysis.user_id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{analysis.risk_score}</div>
                    <div className="text-sm opacity-80 capitalize">{analysis.risk_level} Risk</div>
                  </div>
                </div>
                
                {analysis.unusual_activity_detected && (
                  <div className="bg-white dark:bg-slate-800 bg-opacity-50 rounded p-3">
                    <p className="text-sm font-medium">⚠️ Unusual Activity Detected</p>
                    <p className="text-xs opacity-80 mt-1">This user's behavior deviates from normal patterns</p>
                  </div>
                )}
              </div>

              {/* Activity Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-slate-400">Sensor Activity</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                        {analysis.sensor_activity_count}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        Last {analysis.analysis_period_hours}h
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-slate-400">Login Frequency</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                        {analysis.login_frequency}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        Profile updates
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-slate-400">Analysis Time</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {new Date(analysis.analyzed_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {analysis.analysis_period_hours}h period
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Risk Factors</h6>
                <div className="space-y-2">
                  {analysis.sensor_activity_count > 10 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-slate-300">
                        High sensor activity ({analysis.sensor_activity_count} operations)
                      </span>
                    </div>
                  )}
                  {analysis.login_frequency > 20 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-slate-300">
                        Frequent profile updates ({analysis.login_frequency} times)
                      </span>
                    </div>
                  )}
                  {analysis.risk_score < 25 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-slate-300">
                        Normal activity patterns detected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAnalysis === 'auth' && authAnalysis && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Authentication Threat Analysis
          </h4>

          {/* Threat Level Overview */}
          <div className={`p-4 rounded-lg border mb-6 ${getRiskColor(authAnalysis.threat_level)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h5 className="text-lg font-semibold capitalize">{authAnalysis.threat_level} Threat Level</h5>
                  <p className="text-sm opacity-80">
                    Analysis period: {authAnalysis.analysis_period_hours} hours
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{authAnalysis.total_failed_attempts}</div>
                <div className="text-sm opacity-80">Failed Attempts</div>
              </div>
            </div>
          </div>

          {/* Authentication Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Attack Summary</h6>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Total Failed Attempts:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {authAnalysis.total_failed_attempts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Unique IPs Involved:</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {authAnalysis.unique_ips_involved}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Suspicious IPs:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {authAnalysis.suspicious_ips.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Threat Assessment</h6>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Risk Level:</span>
                  <span className={`font-semibold capitalize ${
                    authAnalysis.threat_level === 'critical' ? 'text-red-600 dark:text-red-400' :
                    authAnalysis.threat_level === 'high' ? 'text-orange-600 dark:text-orange-400' :
                    authAnalysis.threat_level === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {authAnalysis.threat_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Analysis Time:</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {new Date(authAnalysis.analyzed_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Suspicious IPs */}
          {authAnalysis.suspicious_ips.length > 0 && (
            <div>
              <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Suspicious IP Addresses</h6>
              <div className="space-y-3">
                {authAnalysis.suspicious_ips.map((ip, index) => (
                  <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{ip.ip_address}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            Targeted {ip.targeted_users} users with {ip.total_attempts} attempts
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-slate-400">Most Recent</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {new Date(ip.most_recent).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeAnalysis === 'data' && dataAnalysis && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Data Access Pattern Analysis
          </h4>

          {/* Bulk Access Users */}
          {dataAnalysis.bulk_access_users.length > 0 && (
            <div className="mb-6">
              <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Bulk Data Access Detection</h6>
              <div className="space-y-3">
                {dataAnalysis.bulk_access_users.map((user, index) => (
                  <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            User: {user.user_id.substring(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            Accessed {user.sensors_accessed} sensors over {user.active_hours} hours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {user.access_rate.toFixed(1)}/hr
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">Access Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Activities */}
          {dataAnalysis.admin_activities.length > 0 && (
            <div>
              <h6 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Administrative Activities</h6>
              <div className="space-y-3">
                {dataAnalysis.admin_activities.map((admin, index) => (
                  <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            Admin: {admin.user_hash}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {admin.admin_actions} actions: {admin.action_types.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {admin.admin_actions}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">Actions</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dataAnalysis.bulk_access_users.length === 0 && dataAnalysis.admin_activities.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h5 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No Suspicious Data Access
              </h5>
              <p className="text-gray-600 dark:text-slate-400">
                No bulk data access or unusual administrative activity detected in the analysis period.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No Results State */}
      {((activeAnalysis === 'users' && userAnalysis.length === 0) ||
        (activeAnalysis === 'auth' && !authAnalysis) ||
        (activeAnalysis === 'data' && !dataAnalysis)) && !loading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
              No Analysis Results
            </h4>
            <p className="text-gray-600 dark:text-slate-400">
              {activeAnalysis === 'users' 
                ? 'Enter a user ID and click "Analyze" to run user behavior analysis.'
                : 'Click "Run Analysis" to start the threat analysis.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}