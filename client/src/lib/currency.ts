import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function addDecimals(...values: (string | number | null | undefined)[]): Decimal {
  return values.reduce((sum: Decimal, val) => sum.plus(toDecimal(val)), new Decimal(0));
}

export function subtractDecimals(a: string | number | null | undefined, b: string | number | null | undefined): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function multiplyDecimals(a: string | number | Decimal | null | undefined, b: string | number | Decimal | null | undefined): Decimal {
  const aDec = a instanceof Decimal ? a : toDecimal(a);
  const bDec = b instanceof Decimal ? b : toDecimal(b);
  return aDec.times(bDec);
}

export function divideDecimals(a: string | number | Decimal | null | undefined, b: string | number | Decimal | null | undefined): Decimal {
  const aDec = a instanceof Decimal ? a : toDecimal(a);
  const bDec = b instanceof Decimal ? b : toDecimal(b);
  if (bDec.isZero()) {
    return new Decimal(0);
  }
  return aDec.dividedBy(bDec);
}

export function formatKWD(value: string | number | Decimal | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0.000";
  }
  if (value instanceof Decimal) {
    return value.toFixed(3);
  }
  return toDecimal(value).toFixed(3);
}

export function formatCurrency(value: string | number | Decimal | null | undefined, decimals: number = 3): string {
  if (value === null || value === undefined || value === "") {
    return (0).toFixed(decimals);
  }
  if (value instanceof Decimal) {
    return value.toFixed(decimals);
  }
  return toDecimal(value).toFixed(decimals);
}

export function parseDecimalInput(value: string): string {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
}

export function calculateLineTotal(quantity: string | number, unitPrice: string | number): Decimal {
  return multiplyDecimals(quantity, unitPrice);
}

export function calculateVAT(amount: string | number | Decimal, vatRate: number = 0): Decimal {
  const amountDec = amount instanceof Decimal ? amount : toDecimal(amount);
  return amountDec.times(vatRate).dividedBy(100);
}

export function calculateNetFromGross(grossAmount: string | number | Decimal, vatRate: number = 0): Decimal {
  const gross = grossAmount instanceof Decimal ? grossAmount : toDecimal(grossAmount);
  if (vatRate === 0) return gross;
  return gross.dividedBy(new Decimal(1).plus(new Decimal(vatRate).dividedBy(100)));
}

export function calculateGrossFromNet(netAmount: string | number | Decimal, vatRate: number = 0): Decimal {
  const net = netAmount instanceof Decimal ? netAmount : toDecimal(netAmount);
  if (vatRate === 0) return net;
  return net.times(new Decimal(1).plus(new Decimal(vatRate).dividedBy(100)));
}

export function convertCurrency(
  amount: string | number | Decimal,
  exchangeRate: string | number
): Decimal {
  const amountDec = amount instanceof Decimal ? amount : toDecimal(amount);
  return amountDec.times(toDecimal(exchangeRate));
}

export function sumLineItems(
  items: Array<{ quantity?: string | number; unitPrice?: string | number; total?: string | number }>
): Decimal {
  return items.reduce((sum, item) => {
    if (item.total !== undefined) {
      return sum.plus(toDecimal(item.total));
    }
    return sum.plus(calculateLineTotal(item.quantity || 0, item.unitPrice || 0));
  }, new Decimal(0));
}

export function isValidAmount(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  try {
    const dec = new Decimal(value);
    return !dec.isNaN();
  } catch {
    return false;
  }
}

export function isPositive(value: string | number | Decimal | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const dec = value instanceof Decimal ? value : toDecimal(value);
  return dec.greaterThan(0);
}

export function isZero(value: string | number | Decimal | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return true;
  const dec = value instanceof Decimal ? value : toDecimal(value);
  return dec.isZero();
}

export function compareDecimals(
  a: string | number | Decimal | null | undefined,
  b: string | number | Decimal | null | undefined
): number {
  const aDec = a instanceof Decimal ? a : toDecimal(a);
  const bDec = b instanceof Decimal ? b : toDecimal(b);
  return aDec.comparedTo(bDec);
}

export function maxDecimal(...values: (string | number | Decimal | null | undefined)[]): Decimal {
  const decimals = values.map(v => v instanceof Decimal ? v : toDecimal(v));
  return Decimal.max(...decimals);
}

export function minDecimal(...values: (string | number | Decimal | null | undefined)[]): Decimal {
  const decimals = values.map(v => v instanceof Decimal ? v : toDecimal(v));
  return Decimal.min(...decimals);
}

export function absoluteValue(value: string | number | Decimal | null | undefined): Decimal {
  const dec = value instanceof Decimal ? value : toDecimal(value);
  return dec.abs();
}

export function roundToDecimals(value: string | number | Decimal, decimals: number = 3): Decimal {
  const dec = value instanceof Decimal ? value : toDecimal(value);
  return dec.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}
