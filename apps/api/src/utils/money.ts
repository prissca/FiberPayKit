/**
 * Money helpers. Amounts are ALWAYS handled as integer strings in base units
 * (e.g. shannons for CKB) to avoid floating point errors. We use BigInt for
 * arithmetic and never coerce to Number for storage.
 */

export interface CurrencyMeta {
  code: string;
  /** Base-unit decimals for display conversion. Demo values. */
  decimals: number;
  label: string;
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  CKB: { code: "CKB", decimals: 8, label: "Nervos CKB" },
  RUSD: { code: "RUSD", decimals: 8, label: "RUSD Stablecoin" },
  CUSTOM_UDT: { code: "CUSTOM_UDT", decimals: 8, label: "Custom UDT" },
};

/** Validate that a value is a non-negative integer string. */
export function assertAmountString(amount: string): void {
  if (!/^\d+$/.test(amount)) {
    throw new Error(`Invalid amount "${amount}": must be integer base units`);
  }
}

/** Add two base-unit amount strings. */
export function addAmounts(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

/**
 * Format a base-unit amount for human display, e.g. "100000000" CKB (8 dp)
 * -> "1.00000000". DEMO conversion only — not used for settlement.
 */
export function formatDisplayAmount(amount: string, currency: string): string {
  const meta = CURRENCIES[currency];
  const decimals = meta?.decimals ?? 0;
  if (decimals === 0) return amount;
  const negative = amount.startsWith("-");
  const digits = negative ? amount.slice(1) : amount;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals);
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * DEMO-ONLY static conversion table (base-unit ratios). Clearly labelled as
 * mock. A real deployment would use a live rate oracle.
 */
export const DEMO_CONVERSION_RATES: Record<string, number> = {
  CKB: 1,
  RUSD: 1,
  CUSTOM_UDT: 1,
};
