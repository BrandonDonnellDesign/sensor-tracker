import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Export all user data in JSON format
 * Useful for insurance claims, doctor visits, or data portability
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeGlucose = searchParams.get('includeGlucose') !== 'false';
    const includeInsulin = searchParams.get('includeInsulin') !== 'false';
    const includeFood = searchParams.get('includeFood') !== 'false';
    const includeSensors = searchParams.get('includeSensors') !== 'false';
    const includeOrders = searchParams.get('includeOrders') !== 'false';
    const includeInventory = searchParams.get('includeInventory') !== 'false';

    // Fetch all user data
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
    };

    // Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    exportData.profile = profile;

    // Glucose data
    if (includeGlucose) {
      const { data: glucoseData } = await supabase
        .from('glucose_data')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      exportData.glucoseData = glucoseData || [];
    }

    // Insulin doses
    if (includeInsulin) {
      const { data: insulinDoses } = await supabase
        .from('insulin_doses')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      exportData.insulinDoses = insulinDoses || [];
    }

    // Food logs
    if (includeFood) {
      const { data: foodLogs } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false });
      exportData.foodLogs = foodLogs || [];
    }

    // Sensors
    if (includeSensors) {
      const { data: sensors } = await supabase
        .from('sensors')
        .select('*, sensor_models(*)')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });
      exportData.sensors = sensors || [];
    }

    // Orders
    if (includeOrders) {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('order_date', { ascending: false });
      exportData.orders = orders || [];
    }

    // Inventory
    if (includeInventory) {
      const { data: inventory } = await supabase
        .from('sensor_inventory')
        .select('*, sensor_models(*)')
        .eq('user_id', user.id);
      exportData.inventory = inventory || [];
    }

    // Return based on format
    if (format === 'csv') {
      // For CSV, we'll export each table separately
      const csv = generateCSV(exportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="diabetes-data-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // JSON format
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="diabetes-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to export user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any): string {
  let csv = '';

  // Glucose Data
  if (data.glucoseData && data.glucoseData.length > 0) {
    csv += 'GLUCOSE DATA\n';
    csv += 'Timestamp,Value (mg/dL),Source,Notes\n';
    data.glucoseData.forEach((row: any) => {
      csv += `${row.timestamp},${row.value},${row.source || ''},${row.notes || ''}\n`;
    });
    csv += '\n';
  }

  // Insulin Doses
  if (data.insulinDoses && data.insulinDoses.length > 0) {
    csv += 'INSULIN DOSES\n';
    csv += 'Timestamp,Type,Amount (units),Notes\n';
    data.insulinDoses.forEach((row: any) => {
      csv += `${row.timestamp},${row.type},${row.amount},${row.notes || ''}\n`;
    });
    csv += '\n';
  }

  // Food Logs
  if (data.foodLogs && data.foodLogs.length > 0) {
    csv += 'FOOD LOGS\n';
    csv += 'Date,Food Name,Carbs (g),Protein (g),Fat (g),Calories\n';
    data.foodLogs.forEach((row: any) => {
      csv += `${row.logged_at},${row.food_name || ''},${row.total_carbs_g || 0},${row.total_protein_g || 0},${row.total_fat_g || 0},${row.total_calories || 0}\n`;
    });
    csv += '\n';
  }

  // Sensors
  if (data.sensors && data.sensors.length > 0) {
    csv += 'SENSORS\n';
    csv += 'Date Added,Serial Number,Model,Status,Notes\n';
    data.sensors.forEach((row: any) => {
      csv += `${row.date_added},${row.serial_number},${row.sensor_models?.model_name || ''},${row.is_problematic ? 'Problematic' : 'Normal'},${row.notes || ''}\n`;
    });
    csv += '\n';
  }

  // Orders
  if (data.orders && data.orders.length > 0) {
    csv += 'ORDERS\n';
    csv += 'Order Date,Order Number,Supplier,Status,Quantity,Tracking Number\n';
    data.orders.forEach((row: any) => {
      csv += `${row.order_date},${row.order_number || ''},${row.supplier || ''},${row.status},${row.quantity || ''},${row.tracking_number || ''}\n`;
    });
    csv += '\n';
  }

  return csv;
}
