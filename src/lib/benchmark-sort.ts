export type BenchmarkSortMode = "boltffi_fastest" | "boltffi_slowest";

export interface SortableBenchmarkToolStat {
  toolName: string;
  unit: string;
  latestValue: number;
}

export interface SortableBenchmarkRow {
  id: string;
  category: string;
  toolStats: SortableBenchmarkToolStat[];
}

function stableBenchmarkOrderKey(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function isLowerMetricBetter(unit: string): boolean {
  return unit !== "ops_per_sec";
}

function findBoltffiStat(toolStats: SortableBenchmarkToolStat[]): SortableBenchmarkToolStat | null {
  return toolStats.find((toolStat) => toolStat.toolName.toLowerCase() === "boltffi") ?? null;
}

function findBestNonBoltffiValue(toolStats: SortableBenchmarkToolStat[], unit: string): number | null {
  const competitorValues = toolStats
    .filter((toolStat) => toolStat.toolName.toLowerCase() !== "boltffi" && toolStat.unit === unit)
    .map((toolStat) => toolStat.latestValue)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (competitorValues.length === 0) {
    return null;
  }

  return isLowerMetricBetter(unit)
    ? Math.min(...competitorValues)
    : Math.max(...competitorValues);
}

function calculateBoltffiRelativeScore(toolStats: SortableBenchmarkToolStat[]): number | null {
  const boltffiStat = findBoltffiStat(toolStats);

  if (!boltffiStat || !Number.isFinite(boltffiStat.latestValue) || boltffiStat.latestValue <= 0) {
    return null;
  }

  const bestCompetitorValue = findBestNonBoltffiValue(toolStats, boltffiStat.unit);

  if (bestCompetitorValue === null) {
    return null;
  }

  if (isLowerMetricBetter(boltffiStat.unit)) {
    return bestCompetitorValue / boltffiStat.latestValue;
  }

  return boltffiStat.latestValue / bestCompetitorValue;
}

export function sortBenchmarksByBoltffi<T extends SortableBenchmarkRow>(
  rows: T[],
  sortMode: BenchmarkSortMode
): T[] {
  return [...rows].sort((left, right) => {
    const leftRelativeScore = calculateBoltffiRelativeScore(left.toolStats);
    const rightRelativeScore = calculateBoltffiRelativeScore(right.toolStats);
    const missingComparisonDelta =
      Number(leftRelativeScore === null) - Number(rightRelativeScore === null);

    if (missingComparisonDelta !== 0) {
      return missingComparisonDelta;
    }

    if (leftRelativeScore !== null && rightRelativeScore !== null && leftRelativeScore !== rightRelativeScore) {
      return sortMode === "boltffi_fastest"
        ? rightRelativeScore - leftRelativeScore
        : leftRelativeScore - rightRelativeScore;
    }

    return (
      left.category.localeCompare(right.category) ||
      stableBenchmarkOrderKey(left.id) - stableBenchmarkOrderKey(right.id) ||
      left.id.localeCompare(right.id)
    );
  });
}
