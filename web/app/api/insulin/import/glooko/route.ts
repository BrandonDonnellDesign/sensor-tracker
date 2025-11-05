import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
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

export async function POST(request: NextRequest) {
  try {
    console.log('Starting CSV import process...');
    
    const supabase = await createClient();
    console.log('Supabase client created');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('File received:', { name: file?.name, size: file?.size, type: file?.type });
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
        details: tableError.message
      }, { status: 500 });
    }

    const csvText = await file.text();
    console.log('CSV text length:', csvText.length);
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('CSV lines:', lines.length);
    
    if (lines.length < 2) {
      return NextResponse.json({ 
        error: 'CSV file must contain at least a header row and one data row' 
      }, { status: 400 });
    }

    // Find the actual header row (skip metadata rows)
    let headerRowIndex = 0;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const potentialHeaders = parseCSVLine(lines[i]);
      console.log(`Row ${i}:`, potentialHeaders);
      
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
        h.toLowerCase().includes('units')
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
        error: 'Could not find valid header row in CSV. Please ensure the file contains column headers.' 
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

    if (dateIndex === -1 || insulinTypeIndex === -1 || doseIndex === -1) {
      console.log('Missing required columns');
      return NextResponse.json({ 
        error: 'Required columns not found. CSV must contain date, insulin type, and dose columns.',
        headers: headers,
        foundColumns: {
          date: dateIndex !== -1,
          insulinType: insulinTypeIndex !== -1,
          dose: doseIndex !== -1
        }
      }, { status: 400 });
    }

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    // Process each data row (start after header row)
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
        const injectionSite = injectionSiteIndex !== -1 ? row[injectionSiteIndex]?.trim() : '';
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

        // Check for duplicates (same insulin type, dose, and time within 5 minutes)
        const fiveMinutesBefore = new Date(takenAt.getTime() - 5 * 60 * 1000);
        const fiveMinutesAfter = new Date(takenAt.getTime() + 5 * 60 * 1000);

        const { data: existingLog } = await supabase
          .from('insulin_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('insulin_type', insulinInfo.insulinType)
          .eq('units', dose)
          .gte('taken_at', fiveMinutesBefore.toISOString())
          .lte('taken_at', fiveMinutesAfter.toISOString())
          .single();

        if (existingLog) {
          result.duplicates++;
          continue;
        }

        // Determine meal relation based on delivery type
        let mealRelation = null;
        if (insulinInfo.deliveryType === 'bolus') {
          mealRelation = 'with_meal';
        } else if (insulinInfo.deliveryType === 'correction') {
          mealRelation = 'correction';
        }
        
        // Create comprehensive notes from Glooko data
        const glookoNotes = [];
        if (notes) glookoNotes.push(notes);
        if (carbs && parseFloat(carbs) > 0) glookoNotes.push(`Carbs: ${carbs}g`);
        if (carbsRatio) glookoNotes.push(`I:C Ratio: 1:${carbsRatio}`);
        if (initialDelivery && parseFloat(initialDelivery) > 0) glookoNotes.push(`Initial: ${initialDelivery}U`);
        if (extendedDelivery && parseFloat(extendedDelivery) > 0) glookoNotes.push(`Extended: ${extendedDelivery}U`);
        
        const combinedNotes = glookoNotes.join(', ') || null;
        
        // Parse blood glucose if available
        const bgBefore = bloodGlucose && parseFloat(bloodGlucose) > 0 ? parseFloat(bloodGlucose) : null;
        
        // Insert insulin log
        const { error: logError } = await supabase
          .from('insulin_logs')
          .insert({
            user_id: user.id,
            insulin_type: insulinInfo.insulinType,
            insulin_name: insulinInfo.insulinName,
            units: dose,
            delivery_type: insulinInfo.deliveryType,
            meal_relation: mealRelation,
            taken_at: takenAt.toISOString(),
            injection_site: injectionSite || 'pump',
            blood_glucose_before: bgBefore,
            notes: combinedNotes,
            logged_via: 'csv_import'
          });

        if (logError) {
          result.skipped++;
          result.errors.push(`Row ${i + 1}: Failed to save log entry - ${logError.message}`);
          console.log(`Database error on row ${i + 1}:`, logError);
          continue;
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

    console.log('Import completed:', result);
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