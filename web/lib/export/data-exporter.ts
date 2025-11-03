import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeAnalytics?: boolean;
  includePhotos?: boolean;
  includeNotes?: boolean;
}

export interface ExportData {
  sensors: Sensor[];
  analytics?: {
    totalSensors: number;
    successRate: number;
    averageDuration: number;
    monthlyTrends: any[];
  };
  exportInfo: {
    exportedAt: Date;
    exportedBy: string;
    format: string;
    recordCount: number;
  };
}

export class DataExporter {
  async exportSensorData(sensors: Sensor[], options: ExportOptions): Promise<Blob> {
    const exportData = await this.prepareExportData(sensors, options);
    
    switch (options.format) {
      case 'csv':
        return this.generateCSV(exportData);
      case 'json':
        return this.generateJSON(exportData);
      case 'pdf':
        return this.generatePDF(exportData);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async prepareExportData(sensors: Sensor[], options: ExportOptions): Promise<ExportData> {
    let filteredSensors = sensors;

    // Apply date range filter
    if (options.dateRange) {
      filteredSensors = sensors.filter(sensor => {
        const sensorDate = new Date(sensor.date_added);
        return sensorDate >= options.dateRange!.start && sensorDate <= options.dateRange!.end;
      });
    }

    const exportData: ExportData = {
      sensors: filteredSensors,
      exportInfo: {
        exportedAt: new Date(),
        exportedBy: 'CGM Tracker User',
        format: options.format,
        recordCount: filteredSensors.length
      }
    };

    // Add analytics if requested
    if (options.includeAnalytics) {
      exportData.analytics = this.calculateAnalytics(filteredSensors);
    }

    return exportData;
  }

  private calculateAnalytics(sensors: Sensor[]) {
    const totalSensors = sensors.length;
    const successfulSensors = sensors.filter(s => !s.is_problematic).length;
    const successRate = totalSensors > 0 ? (successfulSensors / totalSensors) * 100 : 0;

    // Calculate average duration
    const durations: number[] = [];
    const sortedSensors = [...sensors].sort((a, b) => 
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    );

    for (let i = 0; i < sortedSensors.length - 1; i++) {
      const current = sortedSensors[i];
      const next = sortedSensors[i + 1];
      const duration = Math.floor(
        (new Date(next.date_added).getTime() - new Date(current.date_added).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      if (duration >= 1 && duration <= 30) {
        durations.push(duration);
      }
    }

    const averageDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;

    // Monthly trends
    const monthlyData = new Map<string, { sensors: number; successful: number }>();
    sensors.forEach(sensor => {
      const date = new Date(sensor.date_added);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { sensors: 0, successful: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.sensors++;
      if (!sensor.is_problematic) {
        data.successful++;
      }
    });

    const monthlyTrends = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      sensors: data.sensors,
      successful: data.successful,
      successRate: data.sensors > 0 ? (data.successful / data.sensors) * 100 : 0
    }));

    return {
      totalSensors,
      successRate,
      averageDuration,
      monthlyTrends
    };
  }

  private generateCSV(data: ExportData): Blob {
    const headers = [
      'Serial Number',
      'Lot Number',
      'Sensor Type',
      'Date Added',
      'Is Problematic',
      'Issue Notes',
      'Created At'
    ];

    const rows = data.sensors.map(sensor => [
      sensor.serial_number || '',
      sensor.lot_number || '',
      sensor.sensor_type || '',
      sensor.date_added || '',
      sensor.is_problematic ? 'Yes' : 'No',
      sensor.issue_notes || '',
      sensor.created_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add analytics section if available
    if (data.analytics) {
      const analyticsSection = [
        '',
        '--- Analytics Summary ---',
        `Total Sensors,${data.analytics.totalSensors}`,
        `Success Rate,${data.analytics.successRate.toFixed(1)}%`,
        `Average Duration,${data.analytics.averageDuration.toFixed(1)} days`,
        '',
        '--- Monthly Trends ---',
        'Month,Total Sensors,Successful,Success Rate',
        ...data.analytics.monthlyTrends.map(trend => 
          `${trend.month},${trend.sensors},${trend.successful},${trend.successRate.toFixed(1)}%`
        )
      ];
      
      return new Blob([csvContent + '\n' + analyticsSection.join('\n')], {
        type: 'text/csv;charset=utf-8;'
      });
    }

    return new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
  }

  private generateJSON(data: ExportData): Blob {
    const jsonData = {
      ...data,
      sensors: data.sensors.map(sensor => ({
        ...sensor,
        // Format dates for better readability
        date_added: new Date(sensor.date_added).toISOString(),
        created_at: sensor.created_at ? new Date(sensor.created_at).toISOString() : null
      }))
    };

    return new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json;charset=utf-8;'
    });
  }

  private async generatePDF(data: ExportData): Promise<Blob> {
    // For now, return a simple HTML-to-PDF approach
    // In production, you might want to use a library like jsPDF or Puppeteer
    const htmlContent = this.generateHTMLReport(data);
    
    // Create a simple PDF-like HTML document
    const pdfHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CGM Sensor Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px; 
              color: #333; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #3b82f6; 
              padding-bottom: 20px; 
            }
            .summary { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 30px; 
            }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 20px; 
            }
            .summary-item { 
              text-align: center; 
            }
            .summary-value { 
              font-size: 2em; 
              font-weight: bold; 
              color: #3b82f6; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #f8fafc; 
              font-weight: bold; 
            }
            .problematic { 
              background-color: #fef2f2; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #666; 
              font-size: 0.9em; 
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    return new Blob([pdfHTML], {
      type: 'text/html;charset=utf-8;'
    });
  }

  private generateHTMLReport(data: ExportData): string {
    const { sensors, analytics, exportInfo } = data;

    let html = `
      <div class="header">
        <h1>CGM Sensor Report</h1>
        <p>Generated on ${exportInfo.exportedAt.toLocaleDateString()} at ${exportInfo.exportedAt.toLocaleTimeString()}</p>
        <p>${exportInfo.recordCount} sensors included</p>
      </div>
    `;

    // Analytics summary
    if (analytics) {
      html += `
        <div class="summary">
          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${analytics.totalSensors}</div>
              <div>Total Sensors</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${analytics.successRate.toFixed(1)}%</div>
              <div>Success Rate</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${analytics.averageDuration.toFixed(1)}</div>
              <div>Avg Duration (days)</div>
            </div>
          </div>
        </div>
      `;
    }

    // Sensor table
    html += `
      <h2>Sensor Details</h2>
      <table>
        <thead>
          <tr>
            <th>Serial Number</th>
            <th>Type</th>
            <th>Date Added</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
    `;

    sensors.forEach(sensor => {
      html += `
        <tr class="${sensor.is_problematic ? 'problematic' : ''}">
          <td>${sensor.serial_number}</td>
          <td>${sensor.sensor_type || 'N/A'}</td>
          <td>${new Date(sensor.date_added).toLocaleDateString()}</td>
          <td>${sensor.is_problematic ? '❌ Problematic' : '✅ Good'}</td>
          <td>${sensor.issue_notes || '-'}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      
      <div class="footer">
        <p>Report generated by CGM Tracker</p>
        <p>This report contains ${exportInfo.recordCount} sensor records</p>
      </div>
    `;

    return html;
  }
}

// Utility functions for file downloads
export const downloadUtils = {
  downloadBlob: (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  generateFilename: (format: string, prefix = 'cgm-sensors') => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}-${timestamp}.${format}`;
  }
};

// Export instance
export const dataExporter = new DataExporter();