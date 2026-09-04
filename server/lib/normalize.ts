/**
 * Normalization helpers — the brief requires that formatting differences
 * never create duplicate records.
 */

/**
 * Normalizes a FUTMinna-style matriculation number so formatting differences
 * never create duplicates.
 *
 * FUTMinna numbers look like "2024/1/96440pp" (year/school/register + dept
 * letters) but students also write "2022/12345" or use dashes/dots/spaces.
 * We canonicalize to UPPERCASE with "/" separators:
 *   2024/1/96440pp -> 2024/1/96440PP
 *   2024-1-96440pp -> 2024/1/96440PP
 *   2022/12345     -> 2022/12345
 *
 * Returns null when the input does not look like a matric number.
 */
export function normalizeMatric(raw: string): string | null {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]+/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const m = cleaned.match(/^(\d{4})\/([0-9A-Z].*)$/);
  if (!m) return null;
  const tail = m[2];
  if (tail.length < 4) return null; // require a real serial after the year
  if (!/\d/.test(tail)) return null; // the serial must contain digits
  return cleaned;
}

/**
 * Normalizes a Nigerian phone number to a canonical E.164 form:
 *   08012345678  -> +2348012345678
 *   2348012345678 -> +2348012345678
 *   +2348012345678 -> +2348012345678
 * Returns null when the number can't be interpreted as a 10-15 digit number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.length < 10 || digits.length > 15) return null;

  let national: string;
  if (digits.startsWith('234') && digits.length === 13) {
    national = digits; // already country code, no leading 0
  } else if (digits.startsWith('0') && digits.length === 11) {
    national = '234' + digits.slice(1);
  } else if (digits.startsWith('234')) {
    national = digits;
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    // Common form-filling shortcut: 07032559810 typed as 7032559810.
    national = '234' + digits;
  } else {
    return null;
  }
  // Nigerian mobile lines start with 70-79, 80-89, 90-99 after 234.
  if (!/^234[789]\d{9}$/.test(national)) return null;
  return '+' + national;
}

/**
 * Converts a phone number (raw or normalized) to the "0..." local form a
 * student naturally types, e.g. "08153516386". Used as the initial password.
 * Returns null when the number is not a valid Nigerian mobile number.
 */
export function toLocalMobile(raw: string): string | null {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 13 && digits.startsWith('234')) return '0' + digits.slice(3);
  if (digits.length === 10 && /^[789]/.test(digits)) return '0' + digits;
  return null;
}
