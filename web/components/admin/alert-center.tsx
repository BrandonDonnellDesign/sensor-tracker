'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, X, Bell } from 'lucide-react';
import { Alert } from '@/lib/monitoring/alert-system';

export function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAlertCheck = async () => {
    try {
      const response = await fetch('/api/admin/alerts?action=check');
      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          // Refresh alerts if new ones were created
          fetchAlerts();
        }
      }
    } catch (error) {
      console.error('Error running alert check:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Run alert checks every 5 minutes
    const interval = setInterval(runAlertCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <Bell className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const otherAlerts = alerts.filter(a => !['critical', 'high'].includes(a.severity));

  const displayAlerts = showAll ? alerts : [...criticalAlerts, ...highAlerts].slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Alert Center
          </h3>
          {alerts.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={runAlertCheck}
            className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Run Alert Check"
          >
            <Bell className="w-4 h-4" />
          </button>
          
          {alerts.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showAll ? 'Show Less' : `Show All (${alerts.length})`}
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            All Clear
          </h4>
          <p className="text-gray-600 dark:text-slate-400">
            No active alerts. System is running smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-slate-100">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {alert.message}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-slate-500">
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      <span className="capitalize">{alert.type}</span>
                      <span className="uppercase font-medium">{alert.severity}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {!showAll && alerts.length > 5 && (
            <div className="text-center pt-4 border-t border-gray-200 dark:border-slate-600">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {alerts.length - 5} more alerts
              </p>
            </div>
          )}
        </div>
      )}

      {/* Alert Summary */}
      {alerts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {criticalAlerts.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Critical</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {highAlerts.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400">High</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {otherAlerts.filter(a => a.severity === 'medium').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Medium</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {otherAlerts.filter(a => a.severity === 'low').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Low</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}