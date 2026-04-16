import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { BenchmarkRow } from "@/components/LanguageBenchmarksView";
import { LanguageBadge, PlatformBadge, ToolBadge } from "@/components/badges";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  compareIsoDesc,
  fetchBenchmarkDetail,
  formatAbsoluteDate,
  formatLanguageLabel,
  formatMetric,
  formatParameterValue,
  humanizeDirection,
  shortenSha,
  timeAgo,
} from "@/lib/benchmark";
import { BenchmarkDetail, BenchmarkRunEntry, RunEntry } from "@/types/benchmark";

interface Props {
  benchmark: BenchmarkRow;
  language: string;
  latestRun: RunEntry;
  onBack: () => void;
}

interface AggregatedToolStat {
  toolName: string;
  unit: string;
  latestValue: number;
  averageValue: number;
  sampleRuns: number;
}

const TOOL_COLORS: Record<string, string> = {
  boltffi: "hsl(var(--tool-boltffi))",
  uniffi: "hsl(var(--tool-uniffi))",
  "wasm-bindgen": "hsl(var(--tool-wasm))",
};

const chartConfig = {
  average: {
    label: "Average across runs",
    color: "rgba(255,255,255,0.45)",
  },
  latest: {
    label: "Latest run",
    color: "rgba(255,255,255,0.95)",
  },
};

export function BenchmarkDetailView({ benchmark, language, latestRun, onBack }: Props) {
  const [detail, setDetail] = useState<BenchmarkDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBenchmarkDetail(benchmark.viewPath)
      .then((detailDocument) => {
        if (!cancelled) setDetail(detailDocument);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [benchmark.viewPath]);

  const scopedRuns = useMemo(() => {
    if (!detail) return [];

    return detail.runs
      .filter(
        (run) =>
          run.language === language && run.machine.machine_id === latestRun.machine.machine_id
      )
      .sort((left, right) => compareIsoDesc(left.collected_at, right.collected_at));
  }, [detail, language, latestRun.machine.machine_id]);

  const latestBenchmarkRun = scopedRuns[0] ?? null;
  const previousRuns = scopedRuns.slice(1);

  const toolStats = useMemo<AggregatedToolStat[]>(() => {
    if (!latestBenchmarkRun) return [];

    const variantsByTool = new Map<string, BenchmarkRunEntry["variants"]>();
    for (const run of scopedRuns) {
      for (const variant of run.variants) {
        const variants = variantsByTool.get(variant.subject.tool.name) ?? [];
        variants.push(variant);
        variantsByTool.set(variant.subject.tool.name, variants);
      }
    }

    return latestBenchmarkRun.variants
      .map((variant) => {
        const history = variantsByTool.get(variant.subject.tool.name) ?? [variant];
        const values = history.map((candidate) => candidate.metrics.value);
        return {
          toolName: variant.subject.tool.name,
          unit: variant.metrics.unit,
          latestValue: variant.metrics.value,
          averageValue: values.reduce((sum, value) => sum + value, 0) / values.length,
          sampleRuns: history.length,
        };
      })
      .sort((left, right) => left.latestValue - right.latestValue);
  }, [latestBenchmarkRun, scopedRuns]);

  const fastestTool = toolStats[0] ?? null;
  const slowestTool = toolStats[toolStats.length - 1] ?? null;
  const spread =
    fastestTool && slowestTool ? slowestTool.latestValue / fastestTool.latestValue : null;

  const chartRows = toolStats.map((toolStat) => ({
    tool: toolStat.toolName,
    latest: toolStat.latestValue,
    average: toolStat.averageValue,
    unit: toolStat.unit,
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 font-mono text-[13px] text-white/70 transition-colors hover:text-white"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
          cd ../benchmarks
        </button>
        <header className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                $ benchmark detail
              </div>
              <h2 className="font-mono text-[24px] font-semibold tracking-tight text-white leading-tight">
                {benchmark.title}
              </h2>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <LanguageBadge language={language} />
                <PlatformBadge platform={latestRun.platform} />
                <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] text-white/80">
                  {benchmark.category}
                </span>
                <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] text-white/80">
                  {humanizeDirection(benchmark.direction)}
                </span>
              </div>
              <p className="font-mono text-[12px] text-white/55">{benchmark.id}</p>
              {Object.keys(benchmark.parameters).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(benchmark.parameters).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-1 font-mono text-[12px] text-white/85"
                    >
                      <span className="text-white/55">{key}</span>
                      <span className="mx-1 text-white/40">=</span>
                      <span className="nums-tabular text-white">{formatParameterValue(value)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a
              href={`${import.meta.env.BASE_URL}${latestRun.archive_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 self-start rounded-md border border-white/[0.1] bg-[#0a0a0a] px-3 py-2 font-mono text-[13px] text-white/85 transition-colors hover:border-white/25 hover:bg-[#0c0c0c] hover:text-white"
            >
              $ latest-run.json
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">↗</span>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="language" value={formatLanguageLabel(language)} subvalue={latestRun.machine.label} />
            <StatCard label="latest run" value={latestRun.suite_name} subvalue={shortenSha(latestRun.commit_sha)} />
            <StatCard
              label="collected"
              value={latestBenchmarkRun ? timeAgo(latestBenchmarkRun.collected_at) : "—"}
              subvalue={latestBenchmarkRun ? formatAbsoluteDate(latestBenchmarkRun.collected_at) : undefined}
            />
            <StatCard
              label="history"
              value={`${scopedRuns.length} runs`}
              subvalue={previousRuns.length > 0 ? `${previousRuns.length} previous runs` : "first recorded run"}
            />
          </div>
        </header>
      </div>

      <section className="overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a]">
        <header className="border-b border-white/[0.08] bg-[#070707] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/75" />
            <h3 className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-white">
              $ latest comparison
            </h3>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white/65">
            // single benchmark comparison for the latest recorded run plus the historical average
          </p>
        </header>
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="py-12 text-center font-mono text-[13px] text-white/70">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white/80" />
                $ loading benchmark history…
              </span>
            </div>
          ) : !latestBenchmarkRun || toolStats.length === 0 ? (
            <div className="py-12 text-center font-mono text-[13px] text-white/70">
              No benchmark history was available for this language and machine scope.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {fastestTool && (
                  <InsightCard
                    label="fastest latest"
                    tool={fastestTool.toolName}
                    value={formatMetric(fastestTool.latestValue, fastestTool.unit)}
                  />
                )}
                {slowestTool && (
                  <InsightCard
                    label="slowest latest"
                    tool={slowestTool.toolName}
                    value={formatMetric(slowestTool.latestValue, slowestTool.unit)}
                  />
                )}
                <div className="group relative overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.18] hover:bg-[#0c0c0c]">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    $ spread
                  </div>
                  <div className="mt-2 nums-tabular font-mono text-[26px] font-semibold text-white leading-none">
                    {spread ? `${spread.toFixed(2)}x` : "—"}
                  </div>
                  <div className="mt-2 font-mono text-[12px] text-white/65">
                    slowest to fastest in the latest run
                  </div>
                </div>
              </div>

              <ChartContainer
                config={chartConfig}
                className="w-full rounded-md border border-white/[0.1] bg-black p-5"
                style={{ height: Math.max(260, chartRows.length * 110) }}
              >
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ left: 12, right: 72, top: 12, bottom: 24 }}
                  barCategoryGap={28}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="2 4"
                    stroke="rgba(255,255,255,0.12)"
                    strokeOpacity={1}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{
                      fill: "rgba(255,255,255,0.65)",
                      fontSize: 12,
                      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
                    }}
                    tickFormatter={(value) =>
                      formatMetric(Number(value), chartRows[0]?.unit ?? "ns_per_op")
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="tool"
                    axisLine={false}
                    tickLine={false}
                    width={130}
                    tickMargin={12}
                    tick={{
                      fill: "rgba(255,255,255,0.95)",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
                    }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => (
                          <div className="flex min-w-[200px] items-center justify-between gap-4">
                            <span className="font-mono text-[12px] capitalize text-white/70">{String(name)}</span>
                            <span className="nums-tabular font-mono text-[13px] font-semibold text-white">
                              {formatMetric(Number(value), String(item.payload.unit))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="average"
                    name="average"
                    fill="rgba(255,255,255,0.85)"
                    fillOpacity={0.25}
                    stroke="rgba(255,255,255,0.25)"
                    strokeOpacity={1}
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="latest"
                    name="latest"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                  >
                    {chartRows.map((entry) => (
                      <Cell
                        key={entry.tool}
                        fill={TOOL_COLORS[entry.tool] ?? "rgba(255,255,255,0.95)"}
                      />
                    ))}
                    <LabelList
                      dataKey="latest"
                      position="right"
                      offset={10}
                      formatter={(value: number | string) =>
                        formatMetric(Number(value), chartRows[0]?.unit ?? "ns_per_op")
                      }
                      style={{
                        fill: "#ffffff",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily:
                          "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a]">
        <header className="border-b border-white/[0.08] bg-[#070707] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/75" />
            <h3 className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-white">
              $ tool summary
            </h3>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white/65">
            // latest result plus average across all recorded runs in this language scope
          </p>
        </header>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                <th className="text-left py-3 px-3 font-semibold">tool</th>
                <th className="text-left py-3 px-3 font-semibold">latest</th>
                <th className="text-left py-3 px-3 font-semibold">average</th>
                <th className="text-left py-3 px-3 font-semibold">samples</th>
              </tr>
            </thead>
            <tbody>
              {toolStats.map((toolStat) => (
                <tr
                  key={toolStat.toolName}
                  className="border-b border-white/[0.06] transition-colors last:border-b-0 hover:bg-[#0c0c0c]"
                >
                  <td className="py-3 px-3">
                    <ToolBadge name={toolStat.toolName} />
                  </td>
                  <td className="py-3 px-3 nums-tabular font-mono text-[13px] font-semibold text-white">
                    {formatMetric(toolStat.latestValue, toolStat.unit)}
                  </td>
                  <td className="py-3 px-3 nums-tabular font-mono text-[13px] text-white/80">
                    {formatMetric(toolStat.averageValue, toolStat.unit)}
                  </td>
                  <td className="py-3 px-3 nums-tabular font-mono text-[13px] text-white/70">
                    {toolStat.sampleRuns}
                  </td>
                </tr>
              ))}
              {!loading && toolStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-mono text-[13px] text-white/70">
                    No tool summary was available for this benchmark.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a]">
        <header className="border-b border-white/[0.08] bg-[#070707] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <h3 className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-white">
              $ previous runs
            </h3>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white/65">
            // historical runs for this same benchmark
          </p>
        </header>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                <th className="text-left py-3 px-3 font-semibold">run</th>
                <th className="text-left py-3 px-3 font-semibold">commit</th>
                <th className="text-left py-3 px-3 font-semibold">metrics</th>
                <th className="text-left py-3 px-3 font-semibold">collected</th>
              </tr>
            </thead>
            <tbody>
              {previousRuns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-mono text-[13px] text-white/70">
                    No previous runs for this benchmark yet.
                  </td>
                </tr>
              ) : (
                previousRuns.map((run) => (
                  <tr
                    key={run.run_id}
                    className="border-b border-white/[0.06] align-top transition-colors last:border-b-0 hover:bg-[#0c0c0c]"
                  >
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-mono text-[13px] font-semibold text-white">{run.suite_name}</div>
                        <div className="font-mono text-[12px] text-white/65">{run.harness}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 nums-tabular font-mono text-[13px] text-white/85">
                      {shortenSha(run.commit_sha)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-2">
                        {run.variants
                          .slice()
                          .sort((left, right) => left.metrics.value - right.metrics.value)
                          .map((variant) => (
                            <div
                              key={`${run.run_id}-${variant.subject.tool.name}`}
                              className="rounded border border-white/[0.1] bg-black px-3 py-2 transition-colors hover:border-white/20"
                            >
                              <div className="mb-1.5">
                                <ToolBadge name={variant.subject.tool.name} />
                              </div>
                              <div className="nums-tabular font-mono text-[13px] font-semibold text-white">
                                {formatMetric(variant.metrics.value, variant.metrics.unit)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-mono text-[12px] text-white/80">{timeAgo(run.collected_at)}</div>
                        <div className="nums-tabular font-mono text-[12px] text-white/55">
                          {formatAbsoluteDate(run.collected_at)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InsightCard({
  label,
  tool,
  value,
}: {
  label: string;
  tool: string;
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.18] hover:bg-[#0c0c0c]">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
        $ {label}
      </div>
      <div className="mt-2.5">
        <ToolBadge name={tool} />
      </div>
      <div className="mt-2 nums-tabular font-mono text-[15px] font-semibold text-white leading-tight">
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.18] hover:bg-[#0c0c0c]">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
        $ {label}
      </div>
      <div className="mt-2 nums-tabular font-mono text-[14px] font-semibold text-white leading-tight">
        {value}
      </div>
      {subvalue ? (
        <div className="mt-1.5 nums-tabular font-mono text-[12px] text-white/65">{subvalue}</div>
      ) : null}
    </div>
  );
}
