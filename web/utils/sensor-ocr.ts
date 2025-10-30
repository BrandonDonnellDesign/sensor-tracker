/**
 * extractSensorData.ts
 *
 * Improved recovery when OCR returns XCOMG7 / PEXCOMG7 etc.:
 * - If only the short printed token is found, the extractor now searches
 *   for the nearest 12-digit (or 10-14 digit) numeric candidate and selects it.
 * - Includes optional debug output to trace decisions.
 */

export interface ExtractedSensorData {
  serialNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  manufactureDate?: string;
  manufacturer?: 'Dexcom' | 'Freestyle' | 'Abbott';
  modelName?: string;
  confidence: number;
}

/**
 * Options for extractSensorData
 */
export interface ExtractOptions {
  // No debug option
}

/**
 * Parse GS1-style tags from OCR text
 * Accepts (21) or common OCR variations like 21:, 21)...
 */
function parseGS1Tags(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // matches (##)value or ##)value or ##:value or (##):value etc.
  const gs1Pattern = /(?:\(|\b)(\d{2,3})(?:\)|:|\b|\s*)\s*[:\)\-]?\s*([A-Z0-9]{6,20})/gi;
  let match: RegExpExecArray | null;
  while ((match = gs1Pattern.exec(text)) !== null) {
    if (!result[match[1]]) result[match[1]] = match[2];
  }
  return result;
}

/**
 * Normalize OCR text (keeps original for proximity checks when needed)
 */
export function cleanExtractedText(text: string): string {
  let cleaned = text
    .replace(/[^\x20-\x7E\r\n]/g, '') // remove weird invisible chars
    .replace(/[^\w\s\/\-:()]/g, '') // keep parentheses and basic punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // OCR correction layer for common corrupted brand tokens:
  cleaned = cleaned
    .replace(/\bP[EFP]XCOM\b/g, 'DEXCOM')
    .replace(/\bPEXCOMG7\b/g, 'XCOMG7')
    .replace(/\bXCOMG7\b/g, 'XCOMG7')
    .replace(/\bDEXCOMG7\b/g, 'XCOMG7')
    .replace(/\bDEXC0M\b/g, 'DEXCOM') // 0 -> O confusion
    .replace(/\bDEXCQM\b/g, 'DEXCOM') // Q -> O confusion
    .replace(/\bD3XCOM\b/g, 'DEXCOM') // 3 -> E confusion
    .replace(/\bD[E3]XC?OM\b/g, 'DEXCOM')
    .replace(/\bG7SENS0R\b/g, 'G7 SENSOR')
    .replace(/\bG7SENSOR\b/g, 'G7 SENSOR')
    // if brand+digits glued, insert space to help pattern matches later
    .replace(/(DEXCOM G7)([0-9]{6,})/g, '$1 $2')
    .replace(/(XCOMG7)([0-9]{6,})/g, '$1 $2')
    .replace(/\bP21\b/g, '(21)');

  return cleaned;
}

/**
 * Detect manufacturer and model from text
 */
function detectManufacturerAndModel(text: string): {
  manufacturer: ExtractedSensorData['manufacturer'] | null;
  modelName: string | null;
} {
  const lower = text.toLowerCase();
  const hasDexcom = lower.includes('dexcom') || lower.includes('xcom') || lower.includes('g7');
  const hasFreestyle = lower.includes('freestyle') || lower.includes('libre') || lower.includes('abbott');

  if (hasDexcom || /\(21\)/.test(text)) {
    let modelName: string | null = null;
    if (lower.includes('g7')) modelName = 'G7';
    else if (lower.includes('g6')) modelName = 'G6';
    else if (lower.includes('g5')) modelName = 'G5';
    else if (/\(21\)/.test(text)) modelName = 'G7';
    return { manufacturer: 'Dexcom', modelName };
  }

  if (hasFreestyle) {
    let modelName: string | null = null;
    if (lower.includes('libre 3') || lower.includes('libre3')) modelName = 'Libre 3';
    else if (lower.includes('libre 2') || lower.includes('libre2')) modelName = 'Libre 2';
    else if (lower.includes('libre')) modelName = 'Libre';
    return { manufacturer: 'Freestyle', modelName };
  }

  return { manufacturer: null, modelName: null };
}

/**
 * Normalize a date string to YYYY-MM-DD when possible
 */
function normalizeDate(dateStr: string): string {
  const iso = dateStr.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }

  return dateStr;
}

/**
 * Helper: choose best numeric candidate by proximity to a token index
 */
function chooseNearestNumericCandidate(
  _text: string,
  tokenIndex: number,
  candidates: Array<{ value: string; index: number }>
): string | null {
  if (!candidates || candidates.length === 0) return null;
  // compute distance by absolute char index difference
  let best = candidates[0];
  let bestDist = Math.abs(candidates[0].index - tokenIndex);
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(candidates[i].index - tokenIndex);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    } else if (dist === bestDist) {
      // prefer exact length 12 if tie
      if (candidates[i].value.length === 12 && best.value.length !== 12) {
        best = candidates[i];
      }
    }
  }
  return best.value;
}

/**
 * Find numeric candidates (10-14 digits) and return value + start index
 */
function findNumericCandidates(text: string): Array<{ value: string; index: number }> {
  const regex = /[0-9]{10,14}/g;
  const out: Array<{ value: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    out.push({ value: m[0], index: m.index });
  }
  return out;
}

/**
 * Extract Dexcom G7 serial robustly:
 * - Try GS1 (21) first (parseGS1Tags)
 * - Strict (21) patterns next
 * - If only XCOMG7-like token present, pick nearest 12-digit candidate from raw text
 * - As final fallback, use first standalone 12-digit found
 *
 * Accepts rawOriginalText (not uppercased/cleaned) to compute proximity more reliably.
 */
function extractDexcomG7Serial(rawOriginalText: string, cleanedText: string, debug: boolean = false): string | null {
  // 1a) Try to match (23) as fallback for OCR misread of (21)
  const gs1Pattern23 = /\(23\)\s*[:\-]?\s*([A-Z0-9\-]{6,20})/i;
  const gs1Match23 = cleanedText.match(gs1Pattern23);
  if (gs1Match23 && gs1Match23[1]) {
    const candidate = gs1Match23[1].replace(/[^0-9]/g, '');
    if (candidate.length === 12) {
      return candidate;
    }
    const sub = gs1Match23[1].match(/([0-9]{12})/);
    if (sub) {
      return sub[1];
    }
  }
  // 1) Try to match (21) or corrupted variants (e.g., (2Yl), (2Il), (2I1), etc.) and extract value after
  const gs1PatternCorrupt = /\(2[1IlYy]\)\s*[:\-]?\s*([A-Z0-9\-]{6,20})/i;
  const gs1Match = cleanedText.match(gs1PatternCorrupt);
  if (gs1Match && gs1Match[1]) {
    // If value is a 12-digit number, return it
    const candidate = gs1Match[1].replace(/[^0-9]/g, '');
    if (candidate.length === 12) {
      if (debug) console.debug('Found (21) or variant with exact 12 digits:', candidate);
      return candidate;
    }
    // If not, fallback to searching for a 12-digit number elsewhere
    const sub = gs1Match[1].match(/([0-9]{12})/);
    if (sub) {
      if (debug) console.debug('Found 12-digit substring inside (21) variant value:', sub[1]);
      return sub[1];
    }
    // If value is not a number, fallback to next step
  }

  // 2) GS1 (21) tag from parseGS1Tags (for perfect matches)
  const gs1 = parseGS1Tags(cleanedText);
  if (gs1['21']) {
    const candidate = gs1['21'].replace(/[^0-9]/g, '');
    if (candidate.length === 12) {
      return candidate;
    }
    const sub = candidate.match(/([0-9]{12})/);
    if (sub) {
      return sub[1];
    }
  }

  // 3) Strict explicit patterns on cleanedText
  const strictPatterns = [
    /\(21\)\s*[:\-]*\s*([0-9]{10,14})(?![0-9])/g,
    /\b21[:\)\s\-]+\s*([0-9]{10,14})\b/g,
    /\(2[I1l]\)\s*[:\-]*\s*([0-9]{10,14})/g,
  ];
  for (const p of strictPatterns) {
    const m = p.exec(cleanedText);
    if (m && m[1]) {
      const cleaned = m[1].replace(/[^0-9]/g, '');
      if (cleaned.length >= 10) return cleaned;
    }
  }

  // 4) If cleanedText contains XCOMG7-like tokens, try to find nearest numeric candidate in rawOriginalText
  const tokenRegex = /\b(DEXCOM|XCOMG7|PEXCOMG7|PEXCOM|XCOM|DEXC0M|DEXCQM|DEXCOMG7)\b/ig;
  let tokenMatch: RegExpExecArray | null;
  const allTokens: Array<{ token: string; index: number }> = [];
  while ((tokenMatch = tokenRegex.exec(cleanedText)) !== null) {
    allTokens.push({ token: tokenMatch[1], index: tokenMatch.index });
  }


  if (allTokens.length > 0) {
    const candidates = findNumericCandidates(rawOriginalText);

    if (candidates.length > 0) {
      // const tokenIndex = allTokens[0].index;
      const tokenInRawRegex = new RegExp(allTokens[0].token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const rawTokenMatch = rawOriginalText.match(tokenInRawRegex);
      const rawTokenIndex = rawTokenMatch ? rawTokenMatch.index || 0 : 0;

      const chosen = chooseNearestNumericCandidate(rawOriginalText, rawTokenIndex, candidates);
      if (chosen) {
        const sub = chosen.match(/([0-9]{12})/);
        if (sub) return sub[1];
        return chosen;
      }
    }
  }

  // 5) final fallback: first standalone 12-digit in cleanedText
  const any12 = cleanedText.match(/([0-9]{12})/);
  if (any12) {
    return any12[1];
  }

  // 6) fallback: first 10-14 digit in rawOriginalText
  const rawCandidate = rawOriginalText.match(/([0-9]{10,14})/);
  if (rawCandidate) {
    return rawCandidate[1];
  }

  return null;
}

/**
 * Extract Dexcom LOT number robustly
 */
function extractDexcomLotNumber(cleanedText: string, rawOriginalText: string, debug: boolean = false): string | null {
  const lotPatterns = [
    /\bLOT[:\s\-]*([0-9A-Z]{6,14})\b/i,
    /\(10\)\s*([0-9A-Z]{6,14})/i,
    /\(1[O0]\)\s*([0-9A-Z]{6,14})/i,
    /lot[^\d]{0,3}([0-9]{6,14})/i,
  ];

  for (const pattern of lotPatterns) {
    const match = cleanedText.match(pattern);
    if (match && match[1]) {
      if (debug) console.debug('Lot matched from cleanedText:', match[1]);
      return match[1].trim().toUpperCase();
    }
  }

  // fallback to GS1 parse
  const gs1 = parseGS1Tags(cleanedText);
  if (gs1['10']) {
    const cand = gs1['10'].replace(/[^0-9A-Z]/gi, '');
    if (debug) console.debug('Lot matched via GS1(10):', cand);
    return cand;
  }

  // fallback: any 6-14 digit in rawOriginalText near "LOT" token
  const rawLotMatch = rawOriginalText.match(/LOT[:\s\-]*([0-9A-Z]{6,14})/i);
  if (rawLotMatch && rawLotMatch[1]) {
    if (debug) console.debug('Lot matched in rawOriginalText:', rawLotMatch[1]);
    return rawLotMatch[1].toUpperCase();
  }

  if (debug) console.debug('No lot found.');
  return null;
}

/**
 * Extract expiration/manufacture dates
 */
function extractDates(cleanedText: string, debug: boolean = false): { manufactureDate?: string; expirationDate?: string } {
  const gs1 = parseGS1Tags(cleanedText);
  if (debug) console.debug('GS1 tags for dates:', gs1);
  let manufactureDate: string | undefined;
  let expirationDate: string | undefined;
  if (gs1['11']) manufactureDate = normalizeDate(gs1['11']);
  if (gs1['17']) expirationDate = normalizeDate(gs1['17']);

  const dateMatches = [...cleanedText.matchAll(/\b(20\d{2}[-\/]\d{2}[-\/]\d{2})\b/g)].map(m => m[1]);
  if (!manufactureDate && dateMatches.length >= 1) manufactureDate = normalizeDate(dateMatches[0]);
  if (!expirationDate && dateMatches.length >= 2) expirationDate = normalizeDate(dateMatches[1]);

  if (debug) console.debug('Extracted dates:', { manufactureDate, expirationDate });
  return { 
    ...(manufactureDate && { manufactureDate }), 
    ...(expirationDate && { expirationDate }) 
  };
}

/**
 * Generic pattern-based extraction fallback
 */
function extractWithPatterns(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}

/**
 * Confidence calculation (simple weighted)
 */
function calculateConfidence(data: Partial<ExtractedSensorData>, cleanedText: string): number {
  let score = 0;
  if (data.manufacturer) score += 25;
  if (data.modelName) score += 15;
  if (data.serialNumber) score += 40;
  if (data.lotNumber) score += 10;
  if (data.expirationDate) score += 5;
  if (/\(21\)/.test(cleanedText)) score += 10;
  if (/\(10\)/.test(cleanedText)) score += 5;
  return Math.min(score, 100);
}

/**
 * Main export: extractSensorData
 * Accepts raw OCR text (as returned by your OCR engine) and optional options.
 *
 * Example:
 *   const result = extractSensorData(ocrText, { debug: true });
 */
export function extractSensorData(ocrText: string, _options: ExtractOptions = {}): ExtractedSensorData {
  const raw = typeof ocrText === 'string' ? ocrText : String(ocrText);
  const cleaned = cleanExtractedText(raw);


  const { manufacturer, modelName } = detectManufacturerAndModel(cleaned);

  // Serial extraction tries use both raw and cleaned texts for best proximity handling
  const serialNumber = manufacturer === 'Dexcom'
    ? extractDexcomG7Serial(raw, cleaned)
    : extractWithPatterns(cleaned, [
        /(?:SERIAL|SER|S\/N|SN)[:\s]*([A-Z0-9]{6,14})/i,
        /\b([A-Z0-9]{10,14})\b/i,
      ]);

  const lotNumber = manufacturer === 'Dexcom'
    ? extractDexcomLotNumber(cleaned, raw)
    : extractWithPatterns(cleaned, [
        /\bLOT[:\s]*([A-Z0-9]{4,14})/i,
        /(?:BATCH|LOT NO)[:\s]*([A-Z0-9]{4,14})/i,
      ]);

  const dates = extractDates(cleaned);
  const manufactureDate = dates.manufactureDate;
  const expirationDate = dates.expirationDate;

  const extractedData: Partial<ExtractedSensorData> = {
    ...(manufacturer && { manufacturer }),
    ...(modelName && { modelName }),
    ...(serialNumber && { serialNumber }),
    ...(lotNumber && { lotNumber }),
    ...(manufactureDate && { manufactureDate }),
    ...(expirationDate && { expirationDate }),
  };

  const confidence = calculateConfidence(extractedData, cleaned);


  return {
    ...extractedData,
    confidence,
  } as ExtractedSensorData;
}

/**
 * Validate serial number format
 */
export function validateSerialNumber(serialNumber: string | undefined, manufacturer?: string): boolean {
  if (!serialNumber) return false;
  const cleaned = String(serialNumber).replace(/[^A-Z0-9]/gi, '');
  if (manufacturer === 'Dexcom') {
    if (/^XCOMG7$/i.test(cleaned)) return true; // short printed label variant allowed
    // prefer numeric 12-digit for actual GS1 serials
    if (/^[0-9]{12}$/.test(cleaned)) return true;
    if (/^[0-9]{10,14}$/.test(cleaned)) return true;
    return cleaned.length >= 6 && cleaned.length <= 14;
  } else if (manufacturer === 'Freestyle') {
    return cleaned.length >= 6 && cleaned.length <= 12;
  }
  return cleaned.length >= 6 && cleaned.length <= 14;
}
