const decimalPattern = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:e([+-]?\d+))?$/i;

export function parseDecimal(text) {
  // Bound work before constructing BigInts from untrusted file contents.
  if (text.length > 1024) return null;
  const match = decimalPattern.exec(text);
  if (!match) return null;
  const exponent = Number(match[4] ?? 0);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 1024) return null;
  const fraction = match[3] ?? '';
  return {
    coefficient: BigInt(match[1] + match[2] + fraction),
    exponent: exponent - fraction.length,
  };
}

export function withinTolerance(left, right, tolerance) {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  if (!a || !b || !tolerance) return false;
  const exponent = Math.min(a.exponent, b.exponent, tolerance.exponent);
  const scaled = (value) =>
    value.coefficient * 10n ** BigInt(value.exponent - exponent);
  const difference = scaled(a) - scaled(b);
  return (difference < 0n ? -difference : difference) <= scaled(tolerance);
}
