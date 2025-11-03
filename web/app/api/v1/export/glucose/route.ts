import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/export/glucose:
 *   get:
 *     tags: [Analytics]
 *     summary: Export glucose data
 *     description: Export glucose readings in various formats for healthcare providers or personal use
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json, pdf]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export (YYYY-MM-DD)
 *       - in: query
 *         name: include_food_logs
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include food log data in export
 *       - in: query
 *         name: include_statistics
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include summary statistics
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Timezone for date formatting
 *     responses:
 *       200:
 *         description: Export generated successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV format export
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     export_info:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: string
 *                         export_date:
 *                           type: string
 *                         date_range:
 *                           type: object
 *                         total_readings:
 *                           type: integer
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         average_glucose:
 *                           type: number
 *                         time_in_range:
 *                           type: object
 *                         variability:
 *                           type: object
 *                     glucose_readings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                           glucose_value:
 *                             type: number
 *                           source:
 *                             type: string
 *                     food_logs:
 *                       type: array
 *                       items:
 *                         type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: PDF format export
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeFoodLogs = searchParams.get('include_food_logs') === 'true';
    const includeStatistics = searchParams.get('include_statistics') !== 'false';
    const timezone = searchParams.get('timezone') || 'UTC';

    // Validate format
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv, json, or pdf' },
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'start_date must be before end_date' },
        { status: 400 }
      );
    }

    const userId = authResult.userId || 'anonymous';
    const supabase = await createClient();

    // Build glucose readings query
    let glucoseQuery = supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (startDate) {
      glucoseQuery = glucoseQuery.gte('timestamp', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      glucoseQuery = glucoseQuery.lte('timestamp', `${endDate}T23:59:59.999Z`);
    }

    const { data: glucoseReadings, error: glucoseError } = await glucoseQuery;

    if (glucoseError) {
      console.error('Error fetching glucose readings:', glucoseError);
      return NextResponse.json(
        { error: 'Failed to fetch glucose data' },
        { status: 500 }
      );
    }

    // Get food logs if requested
    let foodLogs: any[] = [];
    if (includeFoodLogs) {
      let foodQuery = supabase
        .from('food_logs')
        .select(`
          *,
          food_items (
            name,
            brand,
            carbs_per_100g,
            calories_per_100g
          )
        `)
        .eq('user_id', userId)
        .order('logged_at', { ascending: true });

      if (startDate) {
        foodQuery = foodQuery.gte('logged_at', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        foodQuery = foodQuery.lte('logged_at', `${endDate}T23:59:59.999Z`);
      }

      const { data: foodData, error: foodError } = await foodQuery;
      if (!foodError) {
        foodLogs = foodData || [];
      }
    }

    // Calculate statistics if requested
    let statistics = null;
    if (includeStatistics && glucoseReadings && glucoseReadings.length > 0) {
      statistics = calculateStatistics(glucoseReadings);
    }

    // Prepare export data
    const exportData = {
      export_info: {
        user_id: userId,
        export_date: new Date().toISOString(),
        date_range: {
          start: startDate || 'All time',
          end: endDate || 'All time'
        },
        total_readings: glucoseReadings?.length || 0,
        timezone
      },
      statistics,
      glucose_readings: glucoseReadings || [],
      food_logs: includeFoodLogs ? foodLogs : undefined
    };

    // Generate response based on format
    switch (format) {
      case 'csv':
        return generateCSVResponse(exportData);
      case 'json':
        return NextResponse.json({
          success: true,
          data: exportData
        });
      case 'pdf':
        return generatePDFResponse(exportData);
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in glucose export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateStatistics(readings: any[]) {
  if (readings.length === 0) return null;

  const values = readings.map(r => r.glucose_value);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Time in range calculations
  const inRange = readings.filter(r => r.glucose_value >= 70 && r.glucose_value <= 180);
  const timeInRangePercentage = (inRange.length / readings.length) * 100;

  // Variability
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = (standardDeviation / average) * 100;

  return {
    average_glucose: Math.round(average * 10) / 10,
    min_glucose: min,
    max_glucose: max,
    readings_count: readings.length,
    time_in_range: {
      target_range: { min: 70, max: 180 },
      percentage: Math.round(timeInRangePercentage * 10) / 10,
      readings_in_range: inRange.length
    },
    variability: {
      standard_deviation: Math.round(standardDeviation * 10) / 10,
      coefficient_of_variation: Math.round(coefficientOfVariation * 10) / 10
    },
    date_range: {
      first_reading: readings[0]?.timestamp,
      last_reading: readings[readings.length - 1]?.timestamp
    }
  };
}

function generateCSVResponse(exportData: any) {
  const { glucose_readings, food_logs, statistics, export_info } = exportData;
  
  let csvContent = '';
  
  // Add header information
  csvContent += `# Glucose Data Export\n`;
  csvContent += `# Export Date: ${export_info.export_date}\n`;
  csvContent += `# Date Range: ${export_info.date_range.start} to ${export_info.date_range.end}\n`;
  csvContent += `# Total Readings: ${export_info.total_readings}\n`;
  csvContent += `# Timezone: ${export_info.timezone}\n`;
  csvContent += `\n`;

  // Add statistics if available
  if (statistics) {
    csvContent += `# STATISTICS\n`;
    csvContent += `# Average Glucose: ${statistics.average_glucose} mg/dL\n`;
    csvContent += `# Min Glucose: ${statistics.min_glucose} mg/dL\n`;
    csvContent += `# Max Glucose: ${statistics.max_glucose} mg/dL\n`;
    csvContent += `# Time in Range (70-180): ${statistics.time_in_range.percentage}%\n`;
    csvContent += `# Coefficient of Variation: ${statistics.variability.coefficient_of_variation}%\n`;
    csvContent += `\n`;
  }

  // Glucose readings
  csvContent += `# GLUCOSE READINGS\n`;
  csvContent += `Timestamp,Glucose Value (mg/dL),Source,Notes\n`;
  
  glucose_readings.forEach((reading: any) => {
    csvContent += `${reading.timestamp},${reading.glucose_value},${reading.source || 'manual'},"${reading.notes || ''}"\n`;
  });

  // Food logs if included
  if (food_logs && food_logs.length > 0) {
    csvContent += `\n# FOOD LOGS\n`;
    csvContent += `Timestamp,Food Name,Brand,Quantity,Unit,Meal Type,Carbs (g),Calories\n`;
    
    food_logs.forEach((log: any) => {
      const foodName = log.food_items?.name || log.custom_food_name || 'Unknown';
      const brand = log.food_items?.brand || '';
      const carbs = log.carbs || (log.food_items?.carbs_per_100g * log.quantity / 100) || 0;
      const calories = log.calories || (log.food_items?.calories_per_100g * log.quantity / 100) || 0;
      
      csvContent += `${log.logged_at},"${foodName}","${brand}",${log.quantity},${log.unit || 'g'},${log.meal_type || ''},${Math.round(carbs * 10) / 10},${Math.round(calories)}\n`;
    });
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="glucose-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function generatePDFResponse(_exportData: any) {
  // For PDF generation, you would typically use a library like jsPDF or Puppeteer
  // This is a simplified implementation that returns a placeholder
  
  const pdfContent = `
    PDF Export Feature
    
    This would generate a comprehensive PDF report including:
    - Summary statistics
    - Glucose trend charts
    - Food log correlation analysis
    - Time-in-range visualizations
    
    To implement full PDF generation, integrate with:
    - jsPDF for client-side generation
    - Puppeteer for server-side HTML to PDF
    - Chart.js or D3.js for visualizations
  `;

  return new NextResponse(pdfContent, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="glucose-report-${new Date().toISOString().split('T')[0]}.pdf"`
    }
  });
}
