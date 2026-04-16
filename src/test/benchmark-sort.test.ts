import { describe, expect, it } from "vitest";

import { sortBenchmarksByBoltffi, type SortableBenchmarkRow } from "@/lib/benchmark-sort";

function row(
  id: string,
  boltffiValue: number | null,
  competitorValues: number[],
  options?: Partial<Pick<SortableBenchmarkRow, "category">> & { unit?: string }
): SortableBenchmarkRow {
  const unit = options?.unit ?? "ns_per_op";

  return {
    id,
    category: options?.category ?? "primitives",
    toolStats: [
      ...(boltffiValue === null ? [] : [{ toolName: "boltffi", unit, latestValue: boltffiValue }]),
      ...competitorValues.map((latestValue, index) => ({
        toolName: index === 0 ? "uniffi" : `tool-${index}`,
        unit,
        latestValue,
      })),
    ],
  };
}

describe("sortBenchmarksByBoltffi", () => {
  it("orders fastest rows by biggest boltffi win over the competitor", () => {
    const rows = [
      row("small_absolute_but_small_win", 10, [11]),
      row("large_absolute_but_big_win", 100, [1000]),
      row("middle", 20, [50]),
    ];

    const sorted = sortBenchmarksByBoltffi(rows, "boltffi_fastest");

    expect(sorted.map((entry) => entry.id)).toEqual([
      "large_absolute_but_big_win",
      "middle",
      "small_absolute_but_small_win",
    ]);
  });

  it("orders slowest rows by biggest boltffi loss against the competitor", () => {
    const rows = [
      row("looks_fast_absolutely_but_loses_hard", 20, [2]),
      row("looks_slow_absolutely_but_loses_less", 100, [50]),
      row("still_wins", 80, [160]),
    ];

    const sorted = sortBenchmarksByBoltffi(rows, "boltffi_slowest");

    expect(sorted.map((entry) => entry.id)).toEqual([
      "looks_fast_absolutely_but_loses_hard",
      "looks_slow_absolutely_but_loses_less",
      "still_wins",
    ]);
  });

  it("uses the best non-boltffi competitor when multiple tools exist", () => {
    const rows = [
      row("beats_one_loses_to_one", 100, [110, 90]),
      row("beats_everyone", 100, [150, 160]),
      row("loses_to_everyone", 100, [70, 80]),
    ];

    const sorted = sortBenchmarksByBoltffi(rows, "boltffi_fastest");

    expect(sorted.map((entry) => entry.id)).toEqual([
      "beats_everyone",
      "beats_one_loses_to_one",
      "loses_to_everyone",
    ]);
  });

  it("sinks rows without a boltffi comparison to the bottom", () => {
    const rows = [
      row("missing_boltffi", null, [50]),
      row("missing_competitor", 20, []),
      row("real_comparison", 20, [100]),
    ];

    const sorted = sortBenchmarksByBoltffi(rows, "boltffi_fastest");

    expect(sorted.map((entry) => entry.id)).toEqual([
      "real_comparison",
      "missing_boltffi",
      "missing_competitor",
    ]);
  });

  it("reverses the comparison correctly for ops-per-sec metrics", () => {
    const rows = [
      row("big_win", 2_000, [500], { unit: "ops_per_sec" }),
      row("small_win", 8_000, [6_000], { unit: "ops_per_sec" }),
      row("loss", 600, [2_000], { unit: "ops_per_sec" }),
    ];

    expect(sortBenchmarksByBoltffi(rows, "boltffi_fastest").map((entry) => entry.id)).toEqual([
      "big_win",
      "small_win",
      "loss",
    ]);
    expect(sortBenchmarksByBoltffi(rows, "boltffi_slowest").map((entry) => entry.id)).toEqual([
      "loss",
      "small_win",
      "big_win",
    ]);
  });
});
