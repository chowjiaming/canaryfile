export const WILSON_Z = 1.96;

export type WilsonInterval = {
  lower: number;
  upper: number;
  width: number;
};

export function wilsonInterval(k: number, n: number): WilsonInterval {
  if (n <= 0) {
    throw new RangeError("wilsonInterval requires n > 0");
  }
  const z = WILSON_Z;
  const phat = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (phat + z2 / (2 * n)) / denom;
  const half =
    (z / denom) *
    Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));
  const lower = Math.max(0, center - half);
  const upper = Math.min(1, center + half);
  return {
    lower,
    upper,
    width: upper - lower,
  };
}

export function isFlakyInterval(interval: WilsonInterval): boolean {
  return interval.width > 0.5;
}
