/**
 * Utility fun    serialNumber: [
      // G7 pattern: Look for EXACTLY (21) followed by 12-digit serial number
      // Most specific patterns first
      /\(21\)\s*([0-9]{12})(?![0-9])/,
      /\(21\)([0-9]{12})(?![0-9])/,
      /\(21\):\s*([0-9]{12})(?![0-9])/,
      /\(21\)[:\s\-\/]*([0-9]{12})(?![0-9])/,
      // More permissive - up to 5 non-digit characters between (21) and the number
      /\(21\)[^\d]{0,5}([0-9]{12})(?![0-9])/,
      // Very permissive - any characters between (21) and 12 digits on same line
      /\(21\).*?([0-9]{12})/,
      // General Dexcom serial patterns (older models)
      /(?:serial|ser|s\/n|sn)[:\s]*([a-z0-9]{12})/i,
      /(?:serial|ser|s\/n|sn)[:\s]*([a-z0-9]{10,14})/i,
      // Standalone 12-digit numeric patterns for G7 (last resort)
      /(?<![\(\d])([0-9]{12})(?![\)\d])/,
      // Alphanumeric patterns for older models
      /\b([a-z0-9]{10,14})\b/i,
    ],racting sensor data from OCR text
 */

export interface ExtractedSensorData {
  serialNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  manufacturer?: 'Dexcom' | 'Freestyle' | 'Abbott';
  modelName?: string; // Add model name detection
  confidence: number;
}

/**
 * Common patterns for sensor data extraction
 */
const PATTERNS = {
  // Dexcom patterns
  dexcom: {
    serialNumber: [
      // G7 pattern: Look for EXACTLY (21) followed by 12-digit serial number
      /\(21\)\s*([0-9]{12})(?![0-9])/,
      /\(21\)([0-9]{12})(?![0-9])/,
      // With various separators after (21)
      /\(21\)[:\s\-\/]*([0-9]{12})(?![0-9])/,
      // General Dexcom serial patterns (older models)
      /(?:serial|ser|s\/n|sn)[:\s]*([a-z0-9]{12})/i,
      /(?:serial|ser|s\/n|sn)[:\s]*([a-z0-9]{10,14})/i,
      // Standalone 12-digit numeric patterns for G7
      /(?<!\([0-9])\b([0-9]{12})\b(?!\))/,
      // Alphanumeric patterns for older models
      /\b([a-z0-9]{10,14})\b/i,
    ],
    lotNumber: [
      // LOT: format from the green box
      /LOT[:\s]*([0-9A-Z]{8,12})/i,
      // (10) format from barcode area
      /\(10\)\s*([0-9A-Z]{8,12})/i,
      // Traditional lot patterns
      /lot[:\s]*([a-z0-9]{4,12})/i,
      /lot\s+no[:\s]*([a-z0-9]{4,12})/i,
      /lot\s+number[:\s]*([a-z0-9]{4,12})/i,
      /batch[:\s]*([a-z0-9]{4,12})/i,
    ],
    modelName: [
      // Exact formats from the images
      /(dexcom\s*g7)/i,
      /(dexcom\s+g6)/i,
      /(dexcom\s+g5)/i,
      /\b(g7)\b/i,
      /\b(g6)\b/i,
      /\b(g5)\b/i,
    ],
    expiration: [
      // Date formats seen in images: 2025-07-01, 2026-12-31
      /(\d{4}-\d{2}-\d{2})/,
      /(?:exp|expires?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:use by|expiry)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ]
  },
  
  // Freestyle/Abbott patterns
  freestyle: {
    serialNumber: [
      /(?:serial|ser|s\/n)[:\s]*([a-z0-9]{6,12})/i,
      /\b([a-z0-9]{6,8})\b/i, // Generic pattern for Freestyle
    ],
    lotNumber: [
      // Must have "lot" prefix
      /lot[:\s]*([a-z0-9]{4,8})/i,
      /lot\s+no[:\s]*([a-z0-9]{4,8})/i,
      /batch[:\s]*([a-z0-9]{4,8})/i,
    ],
    modelName: [
      // Freestyle/Abbott model patterns
      /(freestyle\s+libre\s*3)/i,
      /(freestyle\s+libre\s*2)/i,
      /(freestyle\s+libre)/i,
      /(libre\s*3)/i,
      /(libre\s*2)/i,
      /(libre)/i,
      /(abbott)/i,
    ],
    expiration: [
      /(?:exp|expires?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:use by|expiry)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ]
  }
};

/**
 * Detect manufacturer and model from OCR text
 */
function detectManufacturerAndModel(text: string): { manufacturer: ExtractedSensorData['manufacturer'] | null, modelName: string | null } {
  const lowerText = text.toLowerCase();
  console.log('Detecting manufacturer from text:', text);
  
  // Dexcom detection - look for (21) specifically, not other numbers
  const has21Indicator = /\(21\)/.test(text);
  const hasDexcomText = lowerText.includes('dexcom') || lowerText.includes('dex');
  
  if (has21Indicator || hasDexcomText) {
    console.log('Detected Dexcom - (21) found:', has21Indicator, 'Dexcom text found:', hasDexcomText);
    let modelName = null;
    
    if (lowerText.includes('g7')) {
      modelName = 'G7';
    } else if (lowerText.includes('g6')) {
      modelName = 'G6';
    } else if (lowerText.includes('g5')) {
      modelName = 'G5';
    } else if (has21Indicator) {
      // If we have (21) but no explicit model, assume G7
      modelName = 'G7';
    }
    
    return { manufacturer: 'Dexcom', modelName };
  }
  
  // Freestyle/Abbott detection
  if (lowerText.includes('freestyle') || lowerText.includes('abbott') || lowerText.includes('libre')) {
    let modelName = null;
    
    if (lowerText.includes('libre 3') || lowerText.includes('libre3')) {
      modelName = 'Libre 3';
    } else if (lowerText.includes('libre 2') || lowerText.includes('libre2')) {
      modelName = 'Libre 2';
    } else if (lowerText.includes('libre')) {
      modelName = 'Libre';
    }
    
    return { manufacturer: 'Freestyle', modelName };
  }
  
  console.log('No manufacturer detected');
  return { manufacturer: null, modelName: null };
}

/**
 * Extract data using patterns with enhanced Dexcom G7 support
 */
function extractWithPatterns(text: string, patterns: RegExp[], isNumericOnly: boolean = false): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let extracted = match[1].trim();
      
      // Clean up based on whether we expect numeric-only (G7) or alphanumeric
      if (isNumericOnly) {
        extracted = extracted.replace(/[^0-9]/g, '');
      } else {
        extracted = extracted.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      }
      
      // Validate length for Dexcom (should be 12 characters)
      if (extracted.length === 12) {
        return extracted;
      }
      
      // Return other valid lengths too
      if (extracted.length >= 6 && extracted.length <= 14) {
        return extracted;
      }
    }
  }
  return null;
}

/**
 * Enhanced extraction specifically for Dexcom G7 serial numbers
 */
function extractDexcomG7Serial(text: string): string | null {
  console.log('🔍 Searching for (21) pattern in text:', text);
  
  // Look for EXACTLY (21) followed by 12 digits - format from actual images
  const g7Patterns = [
    // Most common format: (21)481513546652
    /\(21\)([0-9]{12})(?![0-9])/g,
    // With space: (21) 481513546652
    /\(21\)\s+([0-9]{12})(?![0-9])/g,
    // With colon: (21):481513546652
    /\(21\):\s*([0-9]{12})(?![0-9])/g,
    // With other separators
    /\(21\)[:\s\-\/]*([0-9]{12})(?![0-9])/g,
    // More permissive - any non-digit chars between (21) and 12 digits
    /\(21\)[^\d]*([0-9]{12})(?![0-9])/g,
  ];
  
  for (const pattern of g7Patterns) {
    // Reset pattern index for global patterns
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      if (match && match[1]) {
        const cleaned = match[1].replace(/[^0-9]/g, '');
        if (cleaned.length === 12) {
          console.log('✅ Found G7 serial with (21):', cleaned);
          return cleaned;
        }
      }
    }
  }
  
  // Try a more aggressive search for any 12-digit number after (21)
  const aggressivePattern = /\(21\)[\s\S]*?([0-9]{12})/;
  const aggressiveMatch = text.match(aggressivePattern);
  
  if (aggressiveMatch && aggressiveMatch[1]) {
    const cleaned = aggressiveMatch[1].replace(/[^0-9]/g, '');
    if (cleaned.length === 12) {
      console.log('✅ Found G7 serial with aggressive (21) search:', cleaned);
      return cleaned;
    }
  }
  
  console.log('❌ No (21) pattern found in text');
  return null;
}

/**
 * Extract lot number from Dexcom packaging
 */
function extractDexcomLotNumber(text: string): string | null {
  console.log('Searching for lot number in text:', text);
  
  // Patterns based on the actual images
  const lotPatterns = [
    // LOT: format from green box: LOT 18251880012
    /LOT[:\s]+([0-9A-Z]{8,12})/i,
    // (10) format from barcode area: (10) 18251880012
    /\(10\)\s*([0-9A-Z]{8,12})/i,
    // Traditional patterns
    /lot[:\s]*([a-z0-9]{8,12})/i,
  ];
  
  for (const pattern of lotPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].trim().toUpperCase();
      console.log('✅ Found lot number:', cleaned);
      return cleaned;
    }
  }
  
  console.log('❌ No lot number found');
  return null;
}

/**
 * Normalize date format
 */
function normalizeDate(dateStr: string): string {
  // Try to parse and format as YYYY-MM-DD
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let [month, day, year] = parts;
    
    // Handle 2-digit years
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const century = Math.floor(currentYear / 100) * 100;
      year = String(century + parseInt(year));
    }
    
    // Ensure proper formatting
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(data: Partial<ExtractedSensorData>): number {
  let score = 0;
  
  if (data.manufacturer) score += 25;
  if (data.modelName) score += 15;
  if (data.serialNumber) score += 40;
  if (data.lotNumber) score += 15;
  if (data.expirationDate) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Main function to extract sensor data from OCR text
 */
export function extractSensorData(ocrText: string): ExtractedSensorData {
  const text = ocrText.replace(/\s+/g, ' ').trim();
  console.log('=== OCR Text Analysis ===');
  console.log('Raw OCR text:', JSON.stringify(ocrText));
  console.log('Cleaned text:', JSON.stringify(text));
  
  // Check for specific patterns
  const has21 = /\(21\)/.test(text);
  const has01 = /\(01\)/.test(text);
  console.log('Contains (21):', has21);
  console.log('Contains (01):', has01);
  
  // Show all numbers that look like they could be serial numbers
  const allNumbers = text.match(/\d{10,15}/g);
  console.log('All long numbers found:', allNumbers);
  
  // Show all parenthetical codes
  const allCodes = text.match(/\(\d{1,3}\)/g);
  console.log('All parenthetical codes:', allCodes);
  
  // Detect manufacturer and model first
  const { manufacturer, modelName } = detectManufacturerAndModel(text);
  
  // Choose appropriate patterns based on manufacturer
  const patterns = manufacturer === 'Dexcom' ? PATTERNS.dexcom : 
                  manufacturer === 'Freestyle' ? PATTERNS.freestyle : 
                  PATTERNS.dexcom; // Default to Dexcom patterns
  
  // Extract data
  let serialNumber = null;
  
  // Try Dexcom G7 specific extraction first if manufacturer is detected as Dexcom
  if (manufacturer === 'Dexcom') {
    console.log('Attempting G7 extraction for Dexcom...');
    serialNumber = extractDexcomG7Serial(text);
    if (serialNumber) {
      console.log('G7 extraction successful:', serialNumber);
    } else {
      console.log('G7 extraction failed, will try general patterns');
    }
  }
  
  // Fall back to general pattern extraction if G7 extraction didn't work
  if (!serialNumber) {
    // For Dexcom, try numeric-only patterns first (for G7), then alphanumeric (older models)
    if (manufacturer === 'Dexcom') {
      serialNumber = extractWithPatterns(text, [/(?<!\([0-9])\b([0-9]{12})\b(?!\))/], true); // G7 numeric
      if (!serialNumber) {
        serialNumber = extractWithPatterns(text, patterns.serialNumber, false); // Older models
      }
    } else {
      serialNumber = extractWithPatterns(text, patterns.serialNumber, false);
    }
  }
  
  // Extract lot number using specific Dexcom extraction if it's Dexcom
  let lotNumber = null;
  if (manufacturer === 'Dexcom') {
    lotNumber = extractDexcomLotNumber(text);
  }
  if (!lotNumber) {
    lotNumber = extractWithPatterns(text, patterns.lotNumber, false);
  }
  
  const rawExpiration = extractWithPatterns(text, patterns.expiration, false);
  const expirationDate = rawExpiration ? normalizeDate(rawExpiration) : undefined;
  
  const extractedData: Partial<ExtractedSensorData> = {
    manufacturer: manufacturer || undefined,
    modelName: modelName || undefined,
    serialNumber: serialNumber || undefined,
    lotNumber: lotNumber || undefined,
    expirationDate: expirationDate || undefined,
  };
  
  const confidence = calculateConfidence(extractedData);
  
  return {
    ...extractedData,
    confidence
  } as ExtractedSensorData;
}

/**
 * Validate extracted serial number format
 */
export function validateSerialNumber(serialNumber: string, manufacturer?: string): boolean {
  if (!serialNumber) return false;
  
  // Remove common OCR errors
  const cleaned = serialNumber.replace(/[^a-zA-Z0-9]/g, '');
  
  if (manufacturer === 'Dexcom') {
    // Check if it's a G7 (12 digits, numeric only)
    const numericOnly = cleaned.replace(/[^0-9]/g, '');
    if (numericOnly.length === 12 && cleaned === numericOnly) {
      return true; // G7 format
    }
    // Older Dexcom models (alphanumeric, various lengths)
    return cleaned.length >= 10 && cleaned.length <= 14;
  } else if (manufacturer === 'Freestyle') {
    // Freestyle serial numbers vary but are typically 6-8 characters
    return cleaned.length >= 6 && cleaned.length <= 10;
  }
  
  // Generic validation - prefer 12-character for unknown manufacturers (likely Dexcom)
  return cleaned.length >= 6 && cleaned.length <= 14;
}

/**
 * Clean and format extracted text for better accuracy
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/[^\w\s\/\-:()]/g, '') // Keep parentheses for (21) detection
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toUpperCase();
}