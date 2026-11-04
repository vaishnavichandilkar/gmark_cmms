// Indian GST (Goods and Services Tax) Compliance Validation Utility
// Implements statutory checks under the CGST Act, 2017 & Rules:
// 1. 15-character structural format
// 2. Official 2-digit State / UT code directory (01-38, 97, 99)
// 3. Embedded 10-character PAN structure with 4th character constitution validation
// 4. Entity vertical code (13th char: 1-9, A-Z)
// 5. Default 14th character 'Z'
// 6. Modulo 36 (Luhn-variant) checksum check-digit verification

export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction / OIDAR'
};

// 4th character of PAN identifies the legal entity status / constitution
export const PAN_ENTITY_TYPES: Record<string, string> = {
  C: 'Company',
  P: 'Individual / Proprietorship',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Partnership Firm / LLP',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government Entity'
};

export interface GSTValidationResult {
  isValid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  panEntityType?: string;
  entityNumber?: string;
  checkDigit?: string;
}

/**
 * Calculates the expected 15th check digit for a 14-character GSTIN prefix using Modulo 36.
 */
export function calculateGSTChecksum(gstin14: string): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const factor = 36;
  let totalSum = 0;

  for (let i = 0; i < 14; i++) {
    const char = gstin14.charAt(i);
    const digitValue = chars.indexOf(char);
    if (digitValue === -1) return '';

    const multiplier = (i % 2 === 0) ? 1 : 2;
    const product = digitValue * multiplier;
    const quotient = Math.floor(product / factor);
    const remainder = product % factor;
    totalSum += quotient + remainder;
  }

  const remainderSum = totalSum % factor;
  const checkCodeVal = (factor - remainderSum) % factor;
  return chars.charAt(checkCodeVal);
}

/**
 * Validates a GSTIN string against statutory Indian GST specifications.
 * @param gstin The 15-character GSTIN string to validate.
 * @param enforceChecksum Whether to enforce the Modulo-36 check digit. Defaults to true.
 */
export function validateGSTIN(gstin: string, enforceChecksum = true): GSTValidationResult {
  const cleaned = (gstin || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!cleaned) {
    return { isValid: false, error: 'Please enter a valid GST number.' };
  }

  if (cleaned.length !== 15) {
    return { 
      isValid: false, 
      error: `GST number must be exactly 15 characters (currently ${cleaned.length} characters).` 
    };
  }

  // Check state code (first 2 digits)
  const stateCode = cleaned.slice(0, 2);
  if (!/^\d{2}$/.test(stateCode)) {
    return { isValid: false, error: 'GSTIN must start with a 2-digit Indian State/UT code.' };
  }

  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return { isValid: false, error: `Invalid GST state code "${stateCode}". Must be a valid Indian state/UT code (01-38, 97, 99).` };
  }

  // Check embedded PAN (characters 3 to 12)
  const pan = cleaned.slice(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) {
    return { isValid: false, error: 'Characters 3 to 12 must be a valid 10-character PAN (e.g. ABCDE1234F).' };
  }

  // Check PAN 4th character (legal entity type)
  const entityChar = pan.charAt(3);
  const panEntityType = PAN_ENTITY_TYPES[entityChar];
  if (!panEntityType) {
    return { 
      isValid: false, 
      error: `Invalid PAN constitution code '${entityChar}'. Must be C, P, H, F, A, T, B, L, J, or G.` 
    };
  }

  // Check 13th character (Entity registration index: 1-9 or A-Z)
  const entityNumber = cleaned.charAt(12);
  if (!/^[1-9A-Z]$/.test(entityNumber)) {
    return { isValid: false, error: '13th character must be alphanumeric (1-9 or A-Z).' };
  }

  // Check 14th character (Must be 'Z')
  if (cleaned.charAt(13) !== 'Z') {
    return { isValid: false, error: '14th character of GSTIN must be "Z".' };
  }

  // Check 15th character (Modulo-36 check digit)
  const actualCheckDigit = cleaned.charAt(14);
  const expectedCheckDigit = calculateGSTChecksum(cleaned.slice(0, 14));

  if (enforceChecksum && actualCheckDigit !== expectedCheckDigit) {
    return { 
      isValid: false, 
      error: `Invalid GST check digit "${actualCheckDigit}". Expected check digit is "${expectedCheckDigit}".` 
    };
  }

  return {
    isValid: true,
    stateCode,
    stateName,
    pan,
    panEntityType,
    entityNumber,
    checkDigit: actualCheckDigit
  };
}
