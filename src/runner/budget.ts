export function spentUsd(costs: readonly (number | null)[]): number {
  const cents = costs.reduce<number>(
    (sum, cost) => sum + (cost === null ? 0 : Math.round(cost * 100)),
    0,
  );
  return cents / 100;
}

export function remainingBudgetUsd(
  budgetUsd: number,
  costs: readonly (number | null)[],
): number {
  return budgetUsd - spentUsd(costs);
}

export function budgetExceeded(
  budgetUsd: number,
  costs: readonly (number | null)[],
): boolean {
  return spentUsd(costs) > budgetUsd;
}
