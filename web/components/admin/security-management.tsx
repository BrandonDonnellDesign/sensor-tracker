'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  UserX,
  Activity,
  MapPin,
  TrendingUp,
  FileText,
  Users,
  RefreshCw
} from 'lucide-react';
import { ThreatAnalysis } from './threat-analysis';
import { RealTimeThreats } from './real-time-threats';

interface SecurityMetrics {
  failed_logins_24h: number;
  suspicious_activity_24h: number;
  admin_actions_24h: number;
  unique_ips_24h: number;
  high_risk_users: number;
  last_security_scan: string;
  security_status: 'normal' | 'elevated' | 'critical';
}

interface SecurityReport {
  report_generated_at: string;
  analysis_period_hours: number;
  authentication_analysis: any;
  data_access_analysis: any;
  threat_summary: any;
  security_recommendations: string[];
  overall_security_status: string;
}

export function SecurityManagement() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'realtime' | 'reports'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/security-analysis');
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateSecurityReport = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/security-analysis?action=security-report&hours=24');
      
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error generating security report:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSecurityData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'elevated': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'normal': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'elevated': return <Eye className="w-5 h-5" />;
      case 'normal': return <Shield className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Security Management
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            Advanced threat detection, analysis, and security monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSecurityData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={generateSecurityReport}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Security Status Overview */}
      {metrics && (
        <div className={`rounded-xl p-6 border ${getStatusColor(metrics.security_status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(metrics.security_status)}
              <div>
                <h3 className="text-lg font-semibold capitalize">
                  Security Status: {metrics.security_status}
                </h3>
                <p className="text-sm opacity-80">
                  Last scan: {new Date(metrics.last_security_scan).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold">
                {metrics.suspicious_activity_24h}
              </div>
              <div className="text-sm opacity-80">
                Threats (24h)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Security Overview', icon: Shield },
            { id: 'analysis', label: 'Threat Analysis', icon: Eye },
            { id: 'realtime', label: 'Real-time Monitor', icon: Activity },
            { id: 'reports', label: 'Security Reports', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Security Metrics Cards */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100">Failed Logins</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Last 24 hours</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {metrics.failed_logins_24h}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              {metrics.failed_logins_24h > 10 ? 'High activity detected' : 'Normal levels'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100">Suspicious Activity</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Security events</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {metrics.suspicious_activity_24h}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              Automated threat detection
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100">Admin Actions</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Administrative activity</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.admin_actions_24h}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              Privileged operations logged
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100">Unique IPs</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Network diversity</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.unique_ips_24h}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              Geographic distribution
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-slate-100">High-Risk Users</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Anomalous behavior</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.high_risk_users}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500">
              Behavioral analysis
            </div>
          </div>

          {/* Security Trends */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-slate-100">Security Trends</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">24-hour analysis</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Threat Level:</span>
                <span className={`font-medium capitalize ${
                  metrics.security_status === 'critical' ? 'text-red-600 dark:text-red-400' :
                  metrics.security_status === 'elevated' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {metrics.security_status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Risk Score:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {Math.round((metrics.suspicious_activity_24h + metrics.failed_logins_24h) / 2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <ThreatAnalysis />
      )}

      {activeTab === 'realtime' && (
        <RealTimeThreats />
      )}

      {activeTab === 'reports' && report && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Security Report
              </h3>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Generated: {new Date(report.report_generated_at).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Overall Status</h4>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.overall_security_status)}`}>
                  {getStatusIcon(report.overall_security_status)}
                  <span className="ml-2 capitalize">{report.overall_security_status}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Analysis Period</h4>
                <p className="text-gray-600 dark:text-slate-400">{report.analysis_period_hours} hours</p>
              </div>
            </div>

            {report.security_recommendations && report.security_recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Security Recommendations</h4>
                <div className="space-y-2">
                  {report.security_recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <p className="text-sm text-blue-800 dark:text-blue-200">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}