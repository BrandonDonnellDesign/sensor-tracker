import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import AdmZip from 'adm-zip';
import csv from 'csv-parser';
import { Readable } from 'stream';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
  merged?: number;
}

// Glooko CSV column mappings - updated for actual Glooko format
const COLUMN_MAPPINGS = {
  // Date columns
  date: ['timestamp', 'date', 'datetime', 'event_date', 'log_date', 'time', 'created_at', 'recorded_at'],
  time: ['time', 'event_time', 'log_time', 'hour', 'clock_time'],
  
  // Insulin columns - Glooko specific
  insulinType: [
    'insulin_type', 'insulin', 'medication', 'drug_name', 'insulin_name', 'type',
    'medication_name', 'drug', 'medicine', 'product', 'brand', 'name'
  ],
  dose: [
    'insulin_delivered', 'insulin_delivered_u', 'delivered', 'dose', 'amount', 'units', 
    'dosage', 'insulin_dose', 'dose_units', 'value', 'quantity', 'total', 
    'bolus_amount', 'basal_amount', 'initial_delivery', 'extended_delivery'
  ],
  
  // Glooko specific columns
  initialDelivery: ['initial_delivery', 'initial_delivery_u', 'bolus_initial'],
  extendedDelivery: ['extended_delivery', 'extended_delivery_u', 'bolus_extended'],
  bloodGlucose: ['blood_glucose_input', 'blood_glucose_input_mg_dl', 'bg', 'glucose'],
  carbs: ['carbs_input', 'carbs_input_g', 'carbs', 'carbohydrates'],
  carbsRatio: ['carbs_ratio', 'carb_ratio', 'ic_ratio', 'insulin_carb_ratio'],
  
  // Basal/Bolus classification
  deliveryType: ['delivery_type', 'bolus_type', 'basal_type', 'insulin_delivery', 'pump_type', 'delivery_method'],
  bolusType: ['bolus_type', 'meal_bolus', 'correction_bolus', 'extended_bolus', 'bolus_subtype'],
  basalType: ['basal_type', 'temp_basal', 'basal_rate', 'basal_subtype'],
  
  // Optional columns
  injectionSite: ['injection_site', 'site', 'location', 'body_part', 'injection_location'],
  notes: ['notes', 'comment', 'comments', 'description', 'memo', 'remarks', 'details'],
  serialNumber: ['serial_number', 'device_serial', 'pump_serial']
};

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  
  // First try exact matches
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const exactIndex = normalizedHeaders.findIndex(h => h === normalizedName);
    if (exactIndex !== -1) return exactIndex;
  }
  
  // Then try partial matches
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const partialIndex = normalizedHeaders.findIndex(h => 
      h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (partialIndex !== -1) return partialIndex;
  }
  
  return -1;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(field => field.replace(/^"|"$/g, ''));
}

function parseDateTime(dateStr: string, timeStr?: string): Date | null {
  try {
    if (!dateStr || dateStr.includes('#')) {
      return null;
    }
    
    let dateTimeStr = dateStr.trim();
    
    // If we have separate time, combine them
    if (timeStr && timeStr.trim()) {
      dateTimeStr = `${dateStr.trim()} ${timeStr.trim()}`;
    }
    
    // Try direct parsing first (works for most formats including Glooko)
    let date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try with different separators and formats
    const variations = [
      dateTimeStr,
      dateTimeStr.replace(/\//g, '-'),
      dateTimeStr.replace(/\./g, '-'),
      dateTimeStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'), // MM/DD/YYYY to YYYY-MM-DD
      dateTimeStr.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/, '$3-$2-$1'), // DD.MM.YYYY to YYYY-MM-DD
    ];
    
    for (const variation of variations) {
      try {
        date = new Date(variation);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        continue;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function normalizeInsulinInfo(type: string, deliveryType?: string): { 
  insulinType: string; 
  deliveryType: string; 
  insulinName: string;
} {
  const normalized = type.toLowerCase().trim();
  const delivery = deliveryType?.toLowerCase().trim() || '';
  
  // Map common insulin types
  const typeMap: Record<string, { insulinType: string; defaultDelivery: string; insulinName: string }> = {
    // Rapid-Acting (Usually Bolus)
    'humalog': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'Humalog' },
    'novolog': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'NovoLog' },
    'apidra': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'Apidra' },
    'fiasp': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'Fiasp' },
    'rapid': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'Rapid-Acting' },
    'fast': { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: 'Fast-Acting' },
    
    // Short-Acting (Usually Bolus)
    'regular': { insulinType: 'short', defaultDelivery: 'bolus', insulinName: 'Regular' },
    'humulin r': { insulinType: 'short', defaultDelivery: 'bolus', insulinName: 'Humulin R' },
    'novolin r': { insulinType: 'short', defaultDelivery: 'bolus', insulinName: 'Novolin R' },
    
    // Intermediate-Acting (Usually Basal)
    'nph': { insulinType: 'intermediate', defaultDelivery: 'basal', insulinName: 'NPH' },
    'humulin n': { insulinType: 'intermediate', defaultDelivery: 'basal', insulinName: 'Humulin N' },
    'novolin n': { insulinType: 'intermediate', defaultDelivery: 'basal', insulinName: 'Novolin N' },
    
    // Long-Acting (Basal)
    'lantus': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Lantus' },
    'levemir': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Levemir' },
    'tresiba': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Tresiba' },
    'basaglar': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Basaglar' },
    'toujeo': { insulinType: 'ultra_long', defaultDelivery: 'basal', insulinName: 'Toujeo' },
    'degludec': { insulinType: 'ultra_long', defaultDelivery: 'basal', insulinName: 'Degludec' },
    'long': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Long-Acting' },
    'basal': { insulinType: 'long', defaultDelivery: 'basal', insulinName: 'Basal' },
    
    // Premixed
    '70/30': { insulinType: 'premixed', defaultDelivery: 'bolus', insulinName: '70/30 Mix' },
    '75/25': { insulinType: 'premixed', defaultDelivery: 'bolus', insulinName: '75/25 Mix' },
    'premix': { insulinType: 'premixed', defaultDelivery: 'bolus', insulinName: 'Premixed' },
  };
  
  // Find matching insulin type
  let insulinInfo = null;
  for (const [key, value] of Object.entries(typeMap)) {
    if (normalized.includes(key)) {
      insulinInfo = value;
      break;
    }
  }
  
  // If no match found, try to infer from context
  if (!insulinInfo) {
    if (normalized.includes('basal') || normalized.includes('long')) {
      insulinInfo = { insulinType: 'long', defaultDelivery: 'basal', insulinName: type };
    } else if (normalized.includes('bolus') || normalized.includes('rapid') || normalized.includes('fast')) {
      insulinInfo = { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: type };
    } else {
      // Default to rapid-acting bolus
      insulinInfo = { insulinType: 'rapid', defaultDelivery: 'bolus', insulinName: type };
    }
  }
  
  // Determine delivery type
  let finalDeliveryType = insulinInfo.defaultDelivery;
  
  // Override with explicit delivery type if provided
  if (delivery.includes('basal')) {
    finalDeliveryType = 'basal';
  } else if (delivery.includes('bolus') || delivery.includes('meal')) {
    finalDeliveryType = 'bolus';
  } else if (delivery.includes('correction')) {
    finalDeliveryType = 'correction';
  }
  
  return {
    insulinType: insulinInfo.insulinType,
    deliveryType: finalDeliveryType,
    insulinName: insulinInfo.insulinName
  };
}

// Helper: parse CSV content to JSON
const parseCsv = (content: string): Promise<any[]> =>
  new Promise((resolve, reject) => {
    const rows: any[] = [];
    Readable.from(content)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

// Helper: merge doses within a time window (in minutes)
function mergeDosesWithinTimeWindow(logs: any[], windowMinutes: number): any[] {
  if (logs.length === 0) return logs;

  // Sort by timestamp
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
  );

  const mergedLogs: any[] = [];
  let currentGroup: any[] = [sortedLogs[0]];

  for (let i = 1; i < sortedLogs.length; i++) {
    const currentLog = sortedLogs[i];
    const lastInGroup = currentGroup[currentGroup.length - 1];
    
    const timeDiff = Math.abs(
      new Date(currentLog.taken_at).getTime() - new Date(lastInGroup.taken_at).getTime()
    ) / (1000 * 60); // Convert to minutes

    // Check if same insulin type and within time window
    if (currentLog.insulin_type === lastInGroup.insulin_type && timeDiff <= windowMinutes) {
      currentGroup.push(currentLog);
    } else {
      // Merge the current group and start a new one
      if (currentGroup.length > 1) {
        mergedLogs.push(mergeGroup(currentGroup));
      } else {
        mergedLogs.push(currentGroup[0]);
      }
      currentGroup = [currentLog];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 1) {
    mergedLogs.push(mergeGroup(currentGroup));
  } else {
    mergedLogs.push(currentGroup[0]);
  }

  return mergedLogs;
}

// Helper: merge a group of doses into one
function mergeGroup(group: any[]): any {
  const totalUnits = group.reduce((sum, log) => sum + log.units, 0);
  const notesParts = group.map((log, idx) => 
    `Dose ${idx + 1}: ${log.units}u at ${new Date(log.taken_at).toLocaleTimeString()}`
  );
  
  // Combine all notes
  const existingNotes = group.map(log => log.notes).filter(Boolean);
  const allNotes = [...notesParts, ...existingNotes].join(' | ');

  // Use the earliest timestamp
  const earliestTime = group.reduce((earliest, log) => {
    const logTime = new Date(log.taken_at);
    return logTime < earliest ? logTime : earliest;
  }, new Date(group[0].taken_at));

  // Combine blood glucose (use first non-null value)
  const bloodGlucose = group.find(log => log.blood_glucose_before)?.blood_glucose_before || null;

  return {
    ...group[0],
    units: totalUnits,
    taken_at: earliestTime.toISOString(),
    blood_glucose_before: bloodGlucose,
    notes: `Merged ${group.length} doses: ${allNotes}`
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Glooko import process...');
    
    const supabase = await createClient();
    console.log('Supabase client created');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Unauthorized'],
        duplicates: 0
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('File received:', { name: file?.name, size: file?.size, type: file?.type });
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ 
        error: 'No file provided',
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['No file provided'],
        duplicates: 0
      }, { status: 400 });
    }

    // Test if insulin_logs table exists
    const { error: tableError } = await supabase
      .from('insulin_logs')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('Table error:', tableError);
      return NextResponse.json({ 
        error: 'Database table not ready. Please ensure migrations have been run.',
        details: tableError.message,
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Database table not ready. Please ensure migrations have been run.'],
        duplicates: 0
      }, { status: 500 });
    }

    // Check if file is ZIP or CSV
    const isZipFile = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
    
    if (isZipFile) {
      return await handleZipImport(file, user.id, supabase);
    } else {
      return await handleCsvImport(file, user.id, supabase);
    }
  } catch (error) {
    console.error('Import error:', error);
    
    let errorMessage = 'Failed to process file';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error',
        success: false,
        imported: 0,
        skipped: 0,
        errors: [errorMessage],
        duplicates: 0
      },
      { status: 500 }
    );
  }
}

async function handleZipImport(zipFile: File, userId: string, supabase: any) {
  try {
    // Extract ZIP
    const arrayBuffer = await zipFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Find all bolus_data_* files in any folder
    const bolusFiles = entries.filter((entry) =>
      /bolus_data_\d+(\.[a-z0-9]+)?$/i.test(entry.entryName)
    );

    // Find all insulin_data_* files for daily basal totals
    const insulinSummaryFiles = entries.filter((entry) =>
      /insulin_data_\d+(\.[a-z0-9]+)?$/i.test(entry.entryName) ||
      entry.entryName.toLowerCase().includes('insulin_data')
    );

    // Debug: Show all files in ZIP
    console.log('All files in ZIP:', entries.map(e => e.entryName));
    console.log('Found bolus files:', bolusFiles.map(f => f.entryName));
    console.log('Found insulin summary files:', insulinSummaryFiles.map(f => f.entryName));
    
    // Check for file overlap (same file being processed twice)
    const bolusFileNames = bolusFiles.map(f => f.entryName);
    const summaryFileNames = insulinSummaryFiles.map(f => f.entryName);
    const overlap = bolusFileNames.filter(name => summaryFileNames.includes(name));
    if (overlap.length > 0) {
      console.warn('WARNING: Files being processed as both bolus AND summary:', overlap);
    }

    if (bolusFiles.length === 0 && insulinSummaryFiles.length === 0) {
      const available = entries.map((e) => e.entryName);
      return NextResponse.json({
        error: 'No bolus_data_* or insulin_data_* files found.',
        availableFiles: available,
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['No bolus_data_* or insulin_data_* files found.'],
        duplicates: 0
      }, { status: 404 });
    }

    // Parse all bolus_data_* files (ONLY individual doses)
    const allRecords: any[] = [];
    for (const file of bolusFiles) {
      const content = file.getData().toString('utf-8');
      const parsed = await parseCsv(content);
      console.log(`Parsed ${parsed.length} records from BOLUS file: ${file.entryName}`);
      
      if (parsed.length > 0) {
        console.log('Raw first BOLUS record:', parsed[0]);
        
        // Handle Glooko's non-standard CSV format where real headers are in first data row
        const firstRecord = parsed[0];
        const hasGlookoFormat = firstRecord && (
          firstRecord['Name:Brandon Donnell'] === 'Timestamp' ||
          Object.values(firstRecord).includes('Timestamp') ||
          Object.values(firstRecord).includes('Insulin Type')
        );
        
        if (hasGlookoFormat && parsed.length > 1) {
          console.log('Detected Glooko format, restructuring data...');
          
          // Extract real column headers from first data row
          const realHeaders = Object.values(firstRecord);
          console.log('Real headers:', realHeaders);
          
          // Restructure all subsequent rows with proper headers
          const restructuredRecords = parsed.slice(1).map(row => {
            const values = Object.values(row);
            const newRecord: any = {};
            realHeaders.forEach((header, index) => {
              if (header && values[index] !== undefined) {
                newRecord[header as string] = values[index];
              }
            });
            return newRecord;
          });
          
          console.log('Restructured sample record:', restructuredRecords[0]);
          allRecords.push(...restructuredRecords);
        } else {
          console.log('Standard CSV format detected');
          allRecords.push(...parsed);
        }
      }
    }

    // Process insulin_data_* files for daily basal totals
    const basalRecords: any[] = [];
    for (const file of insulinSummaryFiles) {
      const content = file.getData().toString('utf-8');
      const parsed = await parseCsv(content);
      console.log(`Parsed ${parsed.length} basal summary records from ${file.entryName}`);
      
      if (parsed.length > 0) {
        console.log('Raw first basal record:', parsed[0]);
        
        // Handle Glooko's non-standard CSV format for insulin summary
        const firstRecord = parsed[0];
        const hasGlookoFormat = firstRecord && (
          firstRecord['Name:Brandon Donnell'] === 'Timestamp' ||
          Object.values(firstRecord).includes('Timestamp') ||
          Object.values(firstRecord).includes('Total Basal (U)')
        );
        
        if (hasGlookoFormat && parsed.length > 1) {
          console.log('Detected Glooko basal summary format, restructuring data...');
          
          // Extract real column headers from first data row
          const realHeaders = Object.values(firstRecord);
          console.log('Real basal headers:', realHeaders);
          
          // Restructure all subsequent rows with proper headers
          const restructuredRecords = parsed.slice(1).map(row => {
            const values = Object.values(row);
            const newRecord: any = {};
            realHeaders.forEach((header, index) => {
              if (header && values[index] !== undefined) {
                newRecord[header as string] = values[index];
              }
            });
            return newRecord;
          });
          
          console.log('Restructured basal sample record:', restructuredRecords[0]);
          basalRecords.push(...restructuredRecords);
        } else {
          console.log('Standard CSV format detected for basal data');
          basalRecords.push(...parsed);
        }
      }
    }

    console.log(`Total records from all files: ${allRecords.length} bolus + ${basalRecords.length} basal summaries`);
    
    // If no records found, return detailed debug info
    if (allRecords.length === 0 && basalRecords.length === 0) {
      return NextResponse.json({
        error: 'No records found in bolus_data or insulin_data files.',
        details: 'The CSV files were empty or could not be parsed.',
        filesProcessed: [...bolusFiles.map(f => f.entryName), ...insulinSummaryFiles.map(f => f.entryName)],
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['No records found in bolus_data or insulin_data files.'],
        duplicates: 0
      }, { status: 400 });
    }

    // Map CSV → insulin_logs schema with more flexible column detection
    const preparedLogs = allRecords.map((row, index) => {
      // Try multiple possible column names for timestamp (including Glooko format)
      const timestamp = row.Timestamp || row.DateTime || row.Time || row.Date || 
                       row.timestamp || row.datetime || row.time || row.date || null;
      
      // Try multiple possible column names for insulin units (including Glooko format)
      // EXCLUDE daily totals to prevent duplicates
      const units = parseFloat(
        row.Units || row.InsulinUnits || row.Dose || row.Amount || 
        row.units || row.insulin_units || row.dose || row.amount ||
        row['Insulin Delivered'] || row['Insulin Units'] || row['Bolus Amount'] ||
        row['Insulin Delivered (U)'] || row['Initial Delivery (U)'] || 0
      );
      
      // Safety check: Skip if this looks like a daily total summary
      const totalBolus = parseFloat(row['Total Bolus (U)'] || 0);
      const totalInsulin = parseFloat(row['Total Insulin (U)'] || 0);
      const totalBasal = parseFloat(row['Total Basal (U)'] || 0);
      
      if (totalBolus > 0 || totalInsulin > 0 || totalBasal > 0) {
        console.log(`Skipping record ${index} - appears to be daily summary:`, {
          totalBolus, totalInsulin, totalBasal, units
        });
        return null;
      }
      
      // Additional safety: Skip unusually large single doses that might be daily totals
      if (units > 15) {
        console.log(`Skipping record ${index} - dose too large (${units}u), likely a daily total`);
        return null;
      }
      
      // Check if this record has summary-like characteristics
      const hasMultipleTotals = Object.keys(row).filter(key => 
        key.toLowerCase().includes('total') && parseFloat(row[key] || 0) > 0
      ).length > 1;
      
      if (hasMultipleTotals) {
        console.log(`Skipping record ${index} - has multiple total columns, appears to be summary data`);
        return null;
      }
      
      // Debug first few records
      if (index < 5) {
        console.log(`Bolus Record ${index}:`, {
          timestamp,
          units,
          availableColumns: Object.keys(row),
          hasTotal: {
            totalBolus: row['Total Bolus (U)'],
            totalInsulin: row['Total Insulin (U)'],
            totalBasal: row['Total Basal (U)']
          },
          rawValues: {
            insulinDelivered: row['Insulin Delivered (U)'],
            initialDelivery: row['Initial Delivery (U)'],
            dose: row.Dose,
            amount: row.Amount
          }
        });
      }
      
      if (!timestamp || !units || units <= 0) {
        if (index < 5) {
          console.log(`Skipping record ${index}: timestamp=${timestamp}, units=${units}`);
        }
        return null;
      }

      // Determine insulin type from the data with more flexible detection
      let insulinType = 'rapid'; // Default
      let insulinName = 'Rapid-Acting';
      const type = (
        row.Type || row.InsulinType || row['Insulin Type'] || 
        row.type || row.insulin_type || row['insulin type'] ||
        row.Medication || row.Drug || row.medication || row.drug || ''
      ).toLowerCase();
      
      // Handle Glooko's "Normal" status (usually means rapid-acting bolus)
      if (type === 'normal' || type === '') {
        insulinType = 'rapid';
        insulinName = 'Rapid-Acting';
      } else if (type.includes('basal') || type.includes('long') || type.includes('lantus') || type.includes('levemir')) {
        insulinType = 'long';
        insulinName = 'Long-Acting';
      } else if (type.includes('short') || type.includes('regular')) {
        insulinType = 'short';
        insulinName = 'Short-Acting';
      } else if (type.includes('intermediate') || type.includes('nph')) {
        insulinType = 'intermediate';
        insulinName = 'Intermediate';
      } else if (type.includes('rapid') || type.includes('humalog') || type.includes('novolog') || type.includes('apidra')) {
        insulinType = 'rapid';
        insulinName = 'Rapid-Acting';
      }

      // Build comprehensive notes including Glooko-specific fields
      const notesParts = [];
      if (row.Notes || row.notes) notesParts.push(row.Notes || row.notes);
      if (row.Description || row.description) notesParts.push(row.Description || row.description);
      if (row.Comment || row.comment) notesParts.push(row.Comment || row.comment);
      
      // Add Glooko-specific context
      const bgInput = row['Blood Glucose Input (mg/dl)'];
      const carbsInput = row['Carbs Input (g)'];
      const carbsRatio = row['Carbs Ratio'];
      
      if (bgInput && parseFloat(bgInput) > 0) notesParts.push(`BG: ${bgInput} mg/dL`);
      if (carbsInput && parseFloat(carbsInput) > 0) notesParts.push(`Carbs: ${carbsInput}g`);
      if (carbsRatio && parseFloat(carbsRatio) > 0) notesParts.push(`I:C Ratio: 1:${carbsRatio}`);
      
      // Handle timestamp parsing with fallback
      let parsedTimestamp;
      try {
        parsedTimestamp = new Date(timestamp).toISOString();
        // Check if the date is valid
        if (parsedTimestamp === 'Invalid Date' || isNaN(new Date(timestamp).getTime())) {
          throw new Error('Invalid timestamp');
        }
      } catch (e) {
        // Use current time with offset for invalid timestamps
        const offsetMinutes = index * 5; // 5 minutes apart
        parsedTimestamp = new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();
        console.log(`Using fallback timestamp for record ${index}: ${parsedTimestamp}`);
      }

      // Extract blood glucose if available
      const bgValue = row['Blood Glucose Input (mg/dl)'];
      const bloodGlucoseBefore = bgValue && parseFloat(bgValue) > 0 ? parseFloat(bgValue) : null;

      return {
        user_id: userId,
        units: units,
        insulin_type: insulinType,
        insulin_name: row.InsulinName || row['Insulin Name'] || row.insulin_name || insulinName,
        taken_at: parsedTimestamp,
        delivery_type: 'bolus',
        meal_relation: 'with_meal',
        blood_glucose_before: bloodGlucoseBefore,
        notes: notesParts.length > 0 ? notesParts.join('; ') : 'Imported from Glooko ZIP',
        logged_via: 'csv_import'
      };
    }).filter(Boolean);

    if (preparedLogs.length === 0) {
      // Provide more detailed error information
      const sampleColumns = allRecords.length > 0 ? Object.keys(allRecords[0]) : [];
      return NextResponse.json({ 
        error: 'No valid insulin records found in bolus_data files.',
        details: `Processed ${allRecords.length} total records, but none had valid timestamp and insulin units.`,
        sampleColumns: sampleColumns,
        success: false,
        imported: 0,
        skipped: 0,
        errors: [
          'No valid insulin records found in bolus_data files.',
          `Available columns: ${sampleColumns.join(', ')}`,
          'Please ensure your export contains insulin dose data with timestamps.'
        ],
        duplicates: 0
      }, { status: 400 });
    }

    // Merge doses within 10 minutes of each other in the CSV
    console.log(`Before merging: ${preparedLogs.length} logs`);
    const mergedLogs = mergeDosesWithinTimeWindow(preparedLogs, 10);
    console.log(`After merging: ${mergedLogs.length} logs`);

    // Process each log individually to handle merging with existing entries
    let imported = 0;
    let duplicates = 0;
    let merged = 0;
    const errors: string[] = [];

    for (let i = 0; i < mergedLogs.length; i++) {
      const log = mergedLogs[i];
      if (!log) continue; // Skip null entries from filter
      
      try {
        // Check for existing entries within 5 minutes
        const logTime = new Date(log.taken_at);
        const fiveMinutesBefore = new Date(logTime.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(logTime.getTime() + 5 * 60 * 1000);

        const { data: existingLogs } = await supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('insulin_type', log.insulin_type)
          .gte('taken_at', fiveMinutesBefore.toISOString())
          .lte('taken_at', fiveMinutesAfter.toISOString())
          .order('taken_at', { ascending: true });

        const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

        if (existingLog) {
          const doseDifference = Math.abs(existingLog.units - log.units);
          const isManualEntry = existingLog.logged_via === 'manual' || existingLog.logged_via === 'quick_dose';
          
          if (isManualEntry || doseDifference > 0.1) {
            // Merge with existing entry
            const existingNotes = existingLog.notes || '';
            const mergedNotes = [
              existingNotes,
              `Glooko data: ${log.units}u`,
              log.notes
            ].filter(Boolean).join(' | ');

            const { error: updateError } = await supabase
              .from('insulin_logs')
              .update({
                // Use the imported dose (more accurate from Glooko)
                units: log.units,
                insulin_name: log.insulin_name,
                blood_glucose_before: log.blood_glucose_before || existingLog.blood_glucose_before,
                notes: mergedNotes,
                // Update timestamp to Glooko's more precise time
                taken_at: log.taken_at,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingLog.id);

            if (updateError) {
              errors.push(`Record ${i + 1}: Failed to merge - ${updateError.message}`);
            } else {
              merged++;
            }
          } else {
            // Exact duplicate
            duplicates++;
          }
        } else {
          // Insert new log
          const { error: insertError } = await supabase
            .from('insulin_logs')
            .insert(log);

          if (insertError) {
            errors.push(`Record ${i + 1}: Failed to insert - ${insertError.message}`);
          } else {
            imported++;
          }
        }
      } catch (error) {
        errors.push(`Record ${i + 1}: Processing error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process daily basal totals from insulin_data files
    let basalImported = 0;
    let basalDuplicates = 0;
    
    for (const basalRecord of basalRecords) {
      try {
        // Extract timestamp and basal amount - be very specific about basal only
        const timestamp = basalRecord.Timestamp || basalRecord.Date || basalRecord.timestamp || basalRecord.date;
        
        // ONLY extract basal amount, ignore bolus totals to prevent duplicates
        const basalAmount = parseFloat(basalRecord['Total Basal (U)'] || basalRecord['Total Basal'] || 0);
        
        // Debug logging to see what we're extracting
        console.log('Basal record processing:', {
          timestamp,
          basalAmount,
          totalBolus: basalRecord['Total Bolus (U)'],
          totalInsulin: basalRecord['Total Insulin (U)'],
          availableColumns: Object.keys(basalRecord)
        });
        
        // Skip if no valid basal amount (don't import bolus totals)
        if (!timestamp || !basalAmount || basalAmount <= 0) {
          console.log('Skipping basal record - invalid data:', { timestamp, basalAmount });
          continue;
        }
        
        // Safety check: Make sure we're not accidentally importing a bolus total
        const totalBolus = parseFloat(basalRecord['Total Bolus (U)'] || 0);
        if (basalAmount === totalBolus && totalBolus > 0) {
          console.log('WARNING: Basal amount equals bolus total, skipping to prevent duplicate:', { basalAmount, totalBolus });
          continue;
        }
        
        // Parse the date - use end of day for daily basal totals
        let basalDate;
        try {
          basalDate = new Date(timestamp);
          // Set to end of day (23:59) for daily basal totals
          basalDate.setHours(23, 59, 0, 0);
        } catch (e) {
          continue; // Skip invalid dates
        }
        
        // Check for existing basal entry for this day
        const dayStart = new Date(basalDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(basalDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const { data: existingBasal } = await supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('delivery_type', 'basal')
          .gte('taken_at', dayStart.toISOString())
          .lte('taken_at', dayEnd.toISOString())
          .limit(1);
        
        if (existingBasal && existingBasal.length > 0) {
          basalDuplicates++;
          continue; // Skip if basal already exists for this day
        }
        
        // Insert daily basal total
        const { error: basalError } = await supabase
          .from('insulin_logs')
          .insert({
            user_id: userId,
            units: basalAmount,
            insulin_type: 'long',
            insulin_name: 'Basal (Daily Total)',
            taken_at: basalDate.toISOString(),
            delivery_type: 'basal',
            meal_relation: null,
            injection_site: 'pump',
            notes: 'Daily basal total from Glooko import',
            logged_via: 'csv_import'
          });
        
        if (basalError) {
          errors.push(`Basal record for ${timestamp}: Failed to insert - ${basalError.message}`);
        } else {
          basalImported++;
          console.log(`Successfully imported basal: ${basalAmount}u for ${timestamp}`);
        }
        
      } catch (error) {
        errors.push(`Basal processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: 'ZIP import completed with smart merging',
      totalFiles: bolusFiles.length + insulinSummaryFiles.length,
      totalRows: preparedLogs.length,
      basalRecords: basalRecords.length,
      imported: imported,
      basalImported: basalImported,
      merged: merged,
      success: true,
      skipped: 0,
      errors: errors,
      duplicates: duplicates,
      basalDuplicates: basalDuplicates,
      // Debug info
      filesProcessed: {
        bolusFiles: bolusFiles.map(f => f.entryName),
        insulinSummaryFiles: insulinSummaryFiles.map(f => f.entryName)
      },
      basalProcessingDebug: {
        basalRecordsFound: basalRecords.length,
        basalImported: basalImported,
        basalDuplicates: basalDuplicates,
        sampleBasalRecord: basalRecords.length > 0 ? basalRecords[0] : null
      }
    });

  } catch (err: any) {
    console.error('ZIP import error:', err);
    return NextResponse.json({ 
      error: err.message,
      success: false,
      imported: 0,
      skipped: 0,
      errors: [err.message],
      duplicates: 0
    }, { status: 500 });
  }
}

async function handleCsvImport(file: File, userId: string, supabase: any) {
  try {
    // Check filename for basal summary indication
    const isBasalFilename = file.name.toLowerCase().includes('insulin_data');
    console.log('File analysis:', { 
      filename: file.name, 
      isBasalFilename,
      size: file.size 
    });

    const csvText = await file.text();
    console.log('CSV text length:', csvText.length);
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('CSV lines:', lines.length);
    
    if (lines.length < 2) {
      return NextResponse.json({ 
        error: 'CSV file must contain at least a header row and one data row',
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['CSV file must contain at least a header row and one data row'],
        duplicates: 0
      }, { status: 400 });
    }

    // Find the actual header row (skip metadata rows)
    let headerRowIndex = 0;
    let headers: string[] = [];
    let isBasalSummaryFile = false;
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const potentialHeaders = parseCSVLine(lines[i]);
      console.log(`Row ${i}:`, potentialHeaders);
      
      // Check if this is a basal summary file (insulin_data format)
      const hasBasalColumn = potentialHeaders.some(h => 
        h.toLowerCase().includes('total basal') ||
        h.toLowerCase().includes('basal (u)') ||
        h.toLowerCase().includes('total_basal')
      );
      const hasTotalBolusColumn = potentialHeaders.some(h => 
        h.toLowerCase().includes('total bolus')
      );
      const hasTotalInsulinColumn = potentialHeaders.some(h => 
        h.toLowerCase().includes('total insulin')
      );
      
      // More specific detection: must have all three "Total" columns OR filename indicates basal
      if ((hasBasalColumn && hasTotalBolusColumn && hasTotalInsulinColumn) || isBasalFilename) {
        isBasalSummaryFile = true;
        console.log('Detected BASAL SUMMARY file (insulin_data format)');
        console.log('Detection method:', {
          byHeaders: hasBasalColumn && hasTotalBolusColumn && hasTotalInsulinColumn,
          byFilename: isBasalFilename,
          headers: potentialHeaders
        });
      }
      
      // Check if this looks like a header row (contains common column names)
      const hasDateColumn = potentialHeaders.some(h => 
        h.toLowerCase().includes('date') || 
        h.toLowerCase().includes('time') ||
        h.toLowerCase().includes('timestamp')
      );
      const hasInsulinColumn = potentialHeaders.some(h => 
        h.toLowerCase().includes('insulin') || 
        h.toLowerCase().includes('medication') ||
        h.toLowerCase().includes('drug') ||
        h.toLowerCase().includes('dose') ||
        h.toLowerCase().includes('units') ||
        h.toLowerCase().includes('basal')
      );
      
      if (hasDateColumn && hasInsulinColumn) {
        headerRowIndex = i;
        headers = potentialHeaders;
        console.log(`Found header row at index ${i}:`, headers);
        break;
      }
    }
    
    if (headers.length === 0) {
      return NextResponse.json({ 
        error: 'Could not find valid header row in CSV. Please ensure the file contains column headers.',
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Could not find valid header row in CSV. Please ensure the file contains column headers.'],
        duplicates: 0
      }, { status: 400 });
    }
    
    // Find column indices
    const dateIndex = findColumnIndex(headers, COLUMN_MAPPINGS.date);
    const timeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.time);
    const insulinTypeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.insulinType);
    const doseIndex = findColumnIndex(headers, COLUMN_MAPPINGS.dose);
    const deliveryTypeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.deliveryType);
    const bolusTypeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.bolusType);
    const basalTypeIndex = findColumnIndex(headers, COLUMN_MAPPINGS.basalType);
    const injectionSiteIndex = findColumnIndex(headers, COLUMN_MAPPINGS.injectionSite);
    const notesIndex = findColumnIndex(headers, COLUMN_MAPPINGS.notes);
    
    // Glooko specific columns
    const initialDeliveryIndex = findColumnIndex(headers, COLUMN_MAPPINGS.initialDelivery);
    const extendedDeliveryIndex = findColumnIndex(headers, COLUMN_MAPPINGS.extendedDelivery);
    const bloodGlucoseIndex = findColumnIndex(headers, COLUMN_MAPPINGS.bloodGlucose);
    const carbsIndex = findColumnIndex(headers, COLUMN_MAPPINGS.carbs);
    const carbsRatioIndex = findColumnIndex(headers, COLUMN_MAPPINGS.carbsRatio);

    console.log('Column indices:', {
      dateIndex,
      timeIndex,
      insulinTypeIndex,
      doseIndex,
      deliveryTypeIndex,
      bolusTypeIndex,
      basalTypeIndex,
      injectionSiteIndex,
      notesIndex,
      initialDeliveryIndex,
      extendedDeliveryIndex,
      bloodGlucoseIndex,
      carbsIndex,
      carbsRatioIndex
    });

    // Handle basal summary files differently
    if (isBasalSummaryFile) {
      console.log('Processing as BASAL SUMMARY file');
      return await handleBasalSummaryCsv(lines, headerRowIndex, headers, userId, supabase);
    }

    if (dateIndex === -1 || insulinTypeIndex === -1 || doseIndex === -1) {
      console.log('Missing required columns');
      return NextResponse.json({ 
        error: 'Required columns not found. CSV must contain date, insulin type, and dose columns.',
        headers: headers,
        foundColumns: {
          date: dateIndex !== -1,
          insulinType: insulinTypeIndex !== -1,
          dose: doseIndex !== -1
        },
        success: false,
        imported: 0,
        skipped: 0,
        errors: ['Required columns not found. CSV must contain date, insulin type, and dose columns.'],
        duplicates: 0
      }, { status: 400 });
    }

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    // First pass: collect all valid logs from CSV
    const dataStartIndex = headerRowIndex + 1;
    console.log('Starting to process', lines.length - dataStartIndex, 'data rows');
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        
        if (row.length < headers.length) {
          result.skipped++;
          continue;
        }
        
        // Log first few rows for debugging
        if (i <= dataStartIndex + 3) {
          console.log(`Data row ${i}:`, row);
        }

        // Extract data
        const dateStr = row[dateIndex]?.trim();
        const timeStr = timeIndex !== -1 ? row[timeIndex]?.trim() : '';
        const insulinTypeStr = row[insulinTypeIndex]?.trim();
        const doseStr = row[doseIndex]?.trim();
        const deliveryType = deliveryTypeIndex !== -1 ? row[deliveryTypeIndex]?.trim().toLowerCase() : '';
        const bolusType = bolusTypeIndex !== -1 ? row[bolusTypeIndex]?.trim().toLowerCase() : '';
        const basalType = basalTypeIndex !== -1 ? row[basalTypeIndex]?.trim().toLowerCase() : '';
        const notes = notesIndex !== -1 ? row[notesIndex]?.trim() : '';
        
        // Glooko specific data
        const initialDelivery = initialDeliveryIndex !== -1 ? row[initialDeliveryIndex]?.trim() : '';
        const extendedDelivery = extendedDeliveryIndex !== -1 ? row[extendedDeliveryIndex]?.trim() : '';
        const bloodGlucose = bloodGlucoseIndex !== -1 ? row[bloodGlucoseIndex]?.trim() : '';
        const carbs = carbsIndex !== -1 ? row[carbsIndex]?.trim() : '';
        const carbsRatio = carbsRatioIndex !== -1 ? row[carbsRatioIndex]?.trim() : '';

        // Log first few rows data extraction for debugging
        if (i <= dataStartIndex + 3) {
          console.log(`Row ${i} extracted data:`, {
            dateStr, timeStr, insulinTypeStr, doseStr, deliveryType, bolusType, basalType,
            initialDelivery, extendedDelivery, bloodGlucose, carbs, carbsRatio
          });
        }

        // For Glooko data, we need at least a dose (insulin delivered)
        // The timestamp might be showing as ######## so we'll skip date validation for now
        if (!doseStr || doseStr === '0' || doseStr === '') {
          result.skipped++;
          if (i <= dataStartIndex + 5) {
            console.log(`Row ${i} skipped - no insulin delivered:`, { doseStr });
          }
          continue;
        }

        // Parse date/time - handle Glooko timestamp format
        let takenAt = parseDateTime(dateStr, timeStr);
        
        // If the basic parsing failed, try direct Date constructor for Glooko format
        if (!takenAt && dateStr && !dateStr.includes('#')) {
          try {
            // Try parsing the Glooko timestamp directly (e.g., "2025-11-01 19:24")
            takenAt = new Date(dateStr);
            if (isNaN(takenAt.getTime())) {
              takenAt = null;
            }
          } catch (e) {
            takenAt = null;
          }
        }
        
        // If timestamp is showing as ######## or still invalid, use current time with offset
        if (!takenAt || dateStr.includes('#')) {
          // Use current time minus row offset (so entries are in chronological order)
          const offsetMinutes = (i - dataStartIndex) * 5; // 5 minutes apart
          takenAt = new Date(Date.now() - offsetMinutes * 60 * 1000);
          console.log(`Row ${i}: Using fallback timestamp due to invalid date:`, dateStr);
        } else if (i <= dataStartIndex + 5) {
          console.log(`Row ${i}: Successfully parsed timestamp:`, dateStr, '→', takenAt.toISOString());
        }

        // Parse dose
        const dose = parseFloat(doseStr.replace(/[^\d.]/g, ''));
        if (isNaN(dose) || dose <= 0) {
          result.skipped++;
          result.errors.push(`Row ${i + 1}: Invalid dose amount`);
          continue;
        }

        // For Glooko data, if insulin type is "Normal" or similar status, 
        // assume it's rapid-acting bolus insulin since it has carb data
        let actualInsulinType = insulinTypeStr;
        if (insulinTypeStr.toLowerCase() === 'normal' || insulinTypeStr.toLowerCase() === 'status') {
          actualInsulinType = 'Rapid-Acting'; // Default for bolus with carbs
        }
        
        // Normalize insulin information
        const insulinInfo = normalizeInsulinInfo(actualInsulinType, deliveryType || bolusType || basalType || 'bolus');

        // Check for existing manual entries within 5 minutes to merge with
        const fiveMinutesBefore = new Date(takenAt.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(takenAt.getTime() + 5 * 60 * 1000);

        const { data: existingLogs } = await supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('insulin_type', insulinInfo.insulinType)
          .gte('taken_at', fiveMinutesBefore.toISOString())
          .lte('taken_at', fiveMinutesAfter.toISOString())
          .order('taken_at', { ascending: true });

        const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

        let shouldMerge = false;
        if (existingLog) {
          // Check if we should merge (different doses or one is manual entry)
          const doseDifference = Math.abs(existingLog.units - dose);
          const isManualEntry = existingLog.logged_via === 'manual' || existingLog.logged_via === 'quick_dose';
          
          if (isManualEntry || doseDifference > 0.1) {
            shouldMerge = true;
          } else {
            // Exact duplicate, skip
            result.duplicates++;
            continue;
          }
        }
        
        // Parse blood glucose if available
        const bgBefore = bloodGlucose && parseFloat(bloodGlucose) > 0 ? parseFloat(bloodGlucose) : null;
        
        // Create comprehensive notes from Glooko data
        const glookoNotes = [];
        if (notes) glookoNotes.push(notes);
        if (bgBefore && bgBefore > 0) glookoNotes.push(`BG: ${bgBefore} mg/dL`);
        if (carbs && parseFloat(carbs) > 0) glookoNotes.push(`Carbs: ${carbs}g`);
        if (carbsRatio) glookoNotes.push(`I:C Ratio: 1:${carbsRatio}`);
        if (initialDelivery && parseFloat(initialDelivery) > 0) glookoNotes.push(`Initial: ${initialDelivery}U`);
        if (extendedDelivery && parseFloat(extendedDelivery) > 0) glookoNotes.push(`Extended: ${extendedDelivery}U`);
        
        const combinedNotes = glookoNotes.join(' | ') || null;
        
        // Determine meal relation based on delivery type
        let mealRelation = null;
        if (insulinInfo.deliveryType === 'bolus') {
          mealRelation = 'with_meal';
        } else if (insulinInfo.deliveryType === 'correction') {
          mealRelation = 'correction';
        }

        if (shouldMerge && existingLog) {
          // Merge Glooko data with existing manual entry
          const existingNotes = existingLog.notes || '';
          const mergedNotes = [
            existingNotes,
            `Glooko data: ${dose}u`,
            combinedNotes
          ].filter(Boolean).join(' | ');

          // Update existing log with merged information
          const { error: updateError } = await supabase
            .from('insulin_logs')
            .update({
              // Use the imported dose (more accurate from Glooko)
              units: dose,
              insulin_name: insulinInfo.insulinName,
              blood_glucose_before: bgBefore || existingLog.blood_glucose_before,
              notes: mergedNotes,
              // Update timestamp to Glooko's more precise time
              taken_at: takenAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLog.id);

          if (updateError) {
            result.skipped++;
            result.errors.push(`Row ${i + 1}: Failed to merge with existing entry - ${updateError.message}`);
            console.log(`Merge error on row ${i + 1}:`, updateError);
            continue;
          }

          console.log(`Merged row ${i + 1} with existing manual entry`);
        } else {
          // Insert new insulin log
          const { error: logError } = await supabase
            .from('insulin_logs')
            .insert({
              user_id: userId,
              insulin_type: insulinInfo.insulinType,
              insulin_name: insulinInfo.insulinName,
              units: dose,
              taken_at: takenAt.toISOString(),
              delivery_type: insulinInfo.deliveryType,
              meal_relation: mealRelation,
              injection_site: 'pump',
              blood_glucose_before: bgBefore,
              notes: combinedNotes || `Imported from Glooko: ${insulinInfo.insulinName}`,
              logged_via: 'csv_import'
            });

          if (logError) {
            result.skipped++;
            result.errors.push(`Row ${i + 1}: Failed to save log entry - ${logError.message}`);
            console.log(`Database error on row ${i + 1}:`, logError);
            continue;
          }
        }

        result.imported++;

      } catch (error) {
        result.skipped++;
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Limit errors in response
    if (result.errors.length > 10) {
      const remainingErrors = result.errors.length - 10;
      result.errors = result.errors.slice(0, 10);
      result.errors.push(`... and ${remainingErrors} more errors`);
    }

    console.log('CSV import completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('CSV import error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process CSV file';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error',
        success: false,
        imported: 0,
        skipped: 0,
        errors: [errorMessage],
        duplicates: 0
      },
      { status: 500 }
    );
  }
}

async function handleBasalSummaryCsv(lines: string[], headerRowIndex: number, headers: string[], userId: string, supabase: any) {
  console.log('Processing basal summary CSV with headers:', headers);
  
  const result = {
    success: true,
    imported: 0,
    basalImported: 0,
    skipped: 0,
    errors: [] as string[],
    duplicates: 0,
    basalDuplicates: 0
  };

  // Find column indices for basal data
  const timestampIndex = headers.findIndex(h => 
    h.toLowerCase().includes('timestamp') || 
    h.toLowerCase().includes('date')
  );
  const basalIndex = headers.findIndex(h => 
    h.toLowerCase().includes('total basal')
  );

  console.log('Basal CSV column indices:', { timestampIndex, basalIndex });

  if (timestampIndex === -1 || basalIndex === -1) {
    return NextResponse.json({
      error: 'Basal summary file missing required columns (Timestamp, Total Basal)',
      headers: headers,
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['Missing Timestamp or Total Basal columns'],
      duplicates: 0
    }, { status: 400 });
  }

  // Process each data row
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    try {
      const row = parseCSVLine(lines[i]);
      
      if (row.length < headers.length) {
        result.skipped++;
        continue;
      }

      const timestamp = row[timestampIndex]?.trim();
      const basalAmountStr = row[basalIndex]?.trim();
      const basalAmount = parseFloat(basalAmountStr || '0');

      console.log(`Basal row ${i}:`, { timestamp, basalAmountStr, basalAmount });

      if (!timestamp || !basalAmount || basalAmount <= 0) {
        console.log(`Skipping basal row ${i} - invalid data`);
        result.skipped++;
        continue;
      }

      // Parse the date - use end of day for daily basal totals
      let basalDate;
      try {
        basalDate = new Date(timestamp);
        basalDate.setHours(23, 59, 0, 0);
      } catch (e) {
        console.log(`Skipping basal row ${i} - invalid date:`, timestamp);
        result.skipped++;
        continue;
      }

      // Check for existing basal entry for this day
      const dayStart = new Date(basalDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(basalDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existingBasal } = await supabase
        .from('insulin_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('delivery_type', 'basal')
        .gte('taken_at', dayStart.toISOString())
        .lte('taken_at', dayEnd.toISOString())
        .limit(1);

      if (existingBasal && existingBasal.length > 0) {
        result.basalDuplicates++;
        continue;
      }

      // Insert daily basal total
      const { error: basalError } = await supabase
        .from('insulin_logs')
        .insert({
          user_id: userId,
          units: basalAmount,
          insulin_type: 'long',
          insulin_name: 'Basal (Daily Total)',
          taken_at: basalDate.toISOString(),
          delivery_type: 'basal',
          meal_relation: null,
          injection_site: 'pump',
          notes: 'Daily basal total from Glooko CSV import',
          logged_via: 'csv_import'
        });

      if (basalError) {
        result.errors.push(`Basal row ${i}: Failed to insert - ${basalError.message}`);
        result.skipped++;
      } else {
        result.basalImported++;
        console.log(`Successfully imported basal: ${basalAmount}u for ${timestamp}`);
      }

    } catch (error) {
      result.errors.push(`Basal row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.skipped++;
    }
  }

  return NextResponse.json({
    message: `Basal import completed: ${result.basalImported} basal entries imported`,
    success: true,
    imported: result.basalImported, // Show basal as imported count
    basalImported: result.basalImported,
    skipped: result.skipped,
    errors: result.errors,
    duplicates: result.basalDuplicates, // Show basal duplicates
    basalDuplicates: result.basalDuplicates,
    fileType: 'basal_summary'
  });
}