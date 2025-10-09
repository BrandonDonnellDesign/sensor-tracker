// CSV export utilities for analytics data

export interface CSVExportData {
  date: string;
  newUsers: number;
  sensorsAdded: number;
  notificationsSent: number;
  notificationsRead: number;
  notificationReadRate: number;
  syncSuccessRate: number;
  syncSuccess: number;
  syncFailed: number;
  status: string;
}

export function exportToCSV(data: CSVExportData[], filename: string = 'analytics-data') {
  // Create CSV headers
  const headers = [
    'Date',
    'New Users',
    'Sensors Added',
    'Notifications Sent',
    'Notifications Read',
    'Notification Read Rate (%)',
    'Sync Success Rate (%)',
    'Sync Success Count',
    'Sync Failed Count',
    'Status'
  ];

  // Convert data to CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => [
      `"${row.date}"`,
      row.newUsers,
      row.sensorsAdded,
      row.notificationsSent,
      row.notificationsRead,
      row.notificationReadRate.toFixed(1),
      row.syncSuccessRate.toFixed(1),
      row.syncSuccess,
      row.syncFailed,
      `"${row.status}"`
    ].join(','))
  ];

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportAnalyticsToCSV(
  labels: string[],
  userGrowth: number[],
  sensorUsage: number[],
  notifications: Array<{ sent: number; read: number; successRate: number }>,
  syncRates: Array<{ success: number; failed: number; successRate: number }>,
  filename: string = 'analytics-export'
) {
  const data: CSVExportData[] = labels.map((date, index) => {
    const notificationData = notifications[index] || { sent: 0, read: 0, successRate: 0 };
    const syncData = syncRates[index] || { success: 0, failed: 0, successRate: 0 };
    
    // Determine status based on sync success rate
    let status = 'No Data';
    if (syncData.success > 0 || syncData.failed > 0) {
      if (syncData.successRate >= 95) status = 'Excellent';
      else if (syncData.successRate >= 85) status = 'Good';
      else if (syncData.successRate >= 70) status = 'Fair';
      else status = 'Poor';
    }

    return {
      date,
      newUsers: userGrowth[index] || 0,
      sensorsAdded: sensorUsage[index] || 0,
      notificationsSent: notificationData.sent,
      notificationsRead: notificationData.read,
      notificationReadRate: notificationData.successRate,
      syncSuccessRate: syncData.successRate,
      syncSuccess: syncData.success,
      syncFailed: syncData.failed,
      status
    };
  });

  exportToCSV(data, filename);
}

export function exportSummaryToCSV(
  totalUsers: number,
  totalSensors: number,
  totalNotifications: number,
  avgSuccessRate: number,
  timeRange: string,
  filename: string = 'analytics-summary'
) {
  const summaryData = [
    ['Metric', 'Value'],
    ['Time Range', timeRange],
    ['Total New Users', totalUsers.toString()],
    ['Total Sensors Added', totalSensors.toString()],
    ['Total Notifications Sent', totalNotifications.toString()],
    ['Average Success Rate (%)', avgSuccessRate.toFixed(1)],
    ['Export Date', new Date().toISOString().split('T')[0]],
    ['Export Time', new Date().toLocaleTimeString()]
  ];

  const csvContent = summaryData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}