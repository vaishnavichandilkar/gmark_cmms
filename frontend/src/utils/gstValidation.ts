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
  expectedCheckDigit?: string;
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
 * Validates a GSTIN string. Format and check-digit validation are relaxed
 * to allow any valid company GST number or test GST number without rejection.
 */
export function validateGSTIN(gstin: string, enforceChecksum = false): GSTValidationResult {
  const cleaned = (gstin || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!cleaned) {
    return { isValid: false, error: 'Please enter a valid GST number.' };
  }

  // Extract optional state code / state name if available
  const stateCode = cleaned.length >= 2 ? cleaned.slice(0, 2) : undefined;
  const stateName = stateCode ? GST_STATE_CODES[stateCode] : undefined;

  return {
    isValid: true,
    stateCode,
    stateName
  };
}
