import crypto from 'crypto';

/**
 * Generates a license key formatted as MC-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'MC-';
  for (let i = 0; i < 4; i++) {
    let block = '';
    for (let j = 0; j < 4; j++) {
      const idx = crypto.randomInt(0, chars.length);
      block += chars[idx];
    }
    key += block + (i < 3 ? '-' : '');
  }
  return key;
}

/**
 * Calculates expiration date based on the plan type
 */
export function calculateExpirationDate(plan: string, purchaseDate: Date = new Date()): Date | null {
  const date = new Date(purchaseDate);
  if (plan === '6 Months') {
    date.setMonth(date.getMonth() + 6);
    return date;
  } else if (plan === '1 Year') {
    date.setFullYear(date.getFullYear() + 1);
    return date;
  } else if (plan === 'Lifetime') {
    return null; // Lifetime licenses never expire
  }
  return null;
}
