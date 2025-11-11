import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parse } from 'csv-parse/sync'

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

interface BatchImportResponse {
  success: boolean
  data: ImportResult
  message: string
}

export async function POST(request: NextRequest): Promise<NextResponse<BatchImportResponse>> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: { imported: 0, skipped: 0, errors: [] }, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, data: { imported: 0, skipped: 0, errors: [] }, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|json|xlsx)$/i)) {
      return NextResponse.json(
        { 
          success: false, 
          data: { imported: 0, skipped: 0, errors: ['Unsupported file type'] }, 
          message: 'Unsupported file type' 
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          data: { imported: 0, skipped: 0, errors: ['File too large'] }, 
          message: 'File size exceeds 10MB limit' 
        },
        { status: 400 }
      )
    }

    const fileContent = await file.text()
    let records: any[] = []
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: []
    }

    try {
      if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(fileContent)
        records = Array.isArray(jsonData) ? jsonData : [jsonData]
      } else {
        // Parse CSV
        records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
      }
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          data: { imported: 0, skipped: 0, errors: ['Failed to parse file'] }, 
          message: 'Invalid file format' 
        },
        { status: 400 }
      )
    }

    if (records.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          data: { imported: 0, skipped: 0, errors: ['No data found in file'] }, 
          message: 'Empty file' 
        },
        { status: 400 }
      )
    }

    // Process records in batches
    const batchSize = 100
    const insulinLogs: any[] = []
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          const processedRecord = await processRecord(record, user.id)
          if (processedRecord) {
            insulinLogs.push(processedRecord)
          } else {
            result.skipped++
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Processing error'}`)
          result.skipped++
        }
      }
    }

    // Insert processed records
    if (insulinLogs.length > 0) {
      // Check for duplicates
      const existingLogs = await supabase
        .from('insulin_logs')
        .select('taken_at, units, delivery_type')
        .eq('user_id', user.id)
        .in('taken_at', insulinLogs.map(log => log.taken_at))

      const existingSet = new Set(
        existingLogs.data?.map(log => 
          `${log.taken_at}-${log.units}-${log.delivery_type}`
        ) || []
      )

      const uniqueLogs = insulinLogs.filter(log => {
        const key = `${log.taken_at}-${log.units}-${log.delivery_type}`
        return !existingSet.has(key)
      })

      result.skipped += insulinLogs.length - uniqueLogs.length

      if (uniqueLogs.length > 0) {
        const { error: insertError } = await supabase
          .from('insulin_logs')
          .insert(uniqueLogs)

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`)
        }

        result.imported = uniqueLogs.length
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} imported, ${result.skipped} skipped`
    })

  } catch (error) {
    console.error('Batch import error:', error)
    return NextResponse.json(
      { 
        success: false, 
        data: { imported: 0, skipped: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }, 
        message: 'Import failed' 
      },
      { status: 500 }
    )
  }
}

async function processRecord(record: any, userId: string): Promise<any | null> {
  // Flexible field mapping for different data sources
  const fieldMappings = [
    // Glooko format
    { date: 'Date', time: 'Time', units: 'Insulin Units', type: 'Insulin Type', delivery: 'Delivery Type' },
    // Medtronic format
    { date: 'Date', time: 'Time', units: 'Amount', type: 'Type', delivery: 'Delivery Method' },
    // Generic format
    { date: 'date', time: 'time', units: 'units', type: 'insulin_type', delivery: 'delivery_type' },
    // Alternative formats
    { date: 'timestamp', time: null, units: 'dose', type: 'type', delivery: 'method' }
  ]

  let mappedRecord: any = null

  // Try each mapping until one works
  for (const mapping of fieldMappings) {
    const dateValue = record[mapping.date]
    const timeValue = mapping.time ? record[mapping.time] : null
    const unitsValue = record[mapping.units]

    if (dateValue && unitsValue) {
      mappedRecord = {
        date: dateValue,
        time: timeValue,
        units: unitsValue,
        type: record[mapping.type] || 'Unknown',
        delivery: record[mapping.delivery] || 'bolus'
      }
      break
    }
  }

  if (!mappedRecord) {
    throw new Error('Required fields not found (date, units)')
  }

  // Parse date and time
  let takenAt: Date
  try {
    if (mappedRecord.time) {
      takenAt = new Date(`${mappedRecord.date} ${mappedRecord.time}`)
    } else {
      takenAt = new Date(mappedRecord.date)
    }

    if (isNaN(takenAt.getTime())) {
      throw new Error('Invalid date format')
    }
  } catch {
    throw new Error('Invalid date/time format')
  }

  // Parse units
  const units = parseFloat(mappedRecord.units)
  if (isNaN(units) || units <= 0) {
    throw new Error('Invalid units value')
  }

  // Normalize delivery type
  const deliveryType = mappedRecord.delivery.toLowerCase().includes('basal') ? 'basal' : 'bolus'

  // Normalize insulin type
  let insulinType = mappedRecord.type || 'Unknown'
  if (insulinType.toLowerCase().includes('rapid') || insulinType.toLowerCase().includes('humalog') || insulinType.toLowerCase().includes('novolog')) {
    insulinType = 'Rapid-Acting'
  } else if (insulinType.toLowerCase().includes('short') || insulinType.toLowerCase().includes('regular')) {
    insulinType = 'Short-Acting'
  } else if (insulinType.toLowerCase().includes('long') || insulinType.toLowerCase().includes('lantus') || insulinType.toLowerCase().includes('levemir')) {
    insulinType = 'Long-Acting'
  }

  return {
    user_id: userId,
    insulin_type: insulinType,
    units: units,
    delivery_type: deliveryType,
    taken_at: takenAt.toISOString(),
    notes: record.notes || record.Notes || null,
    confidence: 0.9, // High confidence for imported data
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}