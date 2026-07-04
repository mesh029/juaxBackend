const KENYA_E164 = /^\+254[17]\d{8}$/;

/** Normalize Kenyan mobile to +2547XXXXXXXX or +2541XXXXXXXX */
export function normalizeKenyaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    const e164 = `+${digits}`;
    return KENYA_E164.test(e164) ? e164 : null;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    const e164 = `+254${digits.slice(1)}`;
    return KENYA_E164.test(e164) ? e164 : null;
  }

  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    const e164 = `+254${digits}`;
    return KENYA_E164.test(e164) ? e164 : null;
  }

  if (input.startsWith("+254") && KENYA_E164.test(input)) {
    return input;
  }

  return null;
}
