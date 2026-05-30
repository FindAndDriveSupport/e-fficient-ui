export function repeatedDigits(number: string) {
  const digits = number.replace(/\D/g, "");
  return /^(\d)\1+$/.test(digits);
}

const fakePatterns = ["0123456789", "1234567890", "0987654321", "9876543210"];

export function sequential(number: string) {
  const digits = number.replace(/\D/g, "");
  return fakePatterns.some((p) => digits.includes(p));
}

const validPrefixes = [
  "060", "061", "062", "063", "064", "065", "066", "067", "068",
  "071", "072", "073", "074", "076", "078", "079",
  "081", "082", "083", "084",
];

export function validPrefix(number: string) {
  const local = number.replace(/\D/g, "").slice(-10);
  return validPrefixes.includes(local.substring(0, 3));
}

export type MobileStatus = { valid: boolean; message: string };

export function validateMobile(number: string): MobileStatus {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 0) return { valid: false, message: "" };
  if (digits.length < 10) return { valid: false, message: "10 digits required" };
  if (digits.length > 10) return { valid: false, message: "Mobile number must be 10 digits" };
  if (repeatedDigits(digits)) return { valid: false, message: "Mobile number looks invalid" };
  if (sequential(digits)) return { valid: false, message: "Mobile number looks invalid" };
  if (!validPrefix(digits)) return { valid: false, message: "Invalid SA mobile prefix" };
  return { valid: true, message: "Mobile number is valid" };
}

/** Format a number string with spaces every 3 digits from the right. */
export function formatThousands(value: number | string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function parseThousands(value: string): number | "" {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? "" : Number(digits);
}
