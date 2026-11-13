import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

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

export function validateGSTIN(gstin: string, enforceChecksum = false): { isValid: boolean; error?: string } {
  const cleaned = (gstin || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!cleaned) {
    return { isValid: false, error: 'Please enter a valid GST number.' };
  }

  return { isValid: true };
}

/**
 * Custom Class Validator decorator for GSTIN
 */
export function IsGSTIN(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isGSTIN',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return validateGSTIN(value).isValid;
        },
        defaultMessage(args: ValidationArguments) {
          if (typeof args.value === 'string') {
            const result = validateGSTIN(args.value);
            if (!result.isValid && result.error) {
              return result.error;
            }
          }
          return 'Please enter a valid 15-character GST number (valid state, PAN and checksum).';
        },
      },
    });
  };
}
