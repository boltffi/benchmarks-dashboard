import { useEffect, useMemo, useState } from "react";
import {
  BenchmarkCatalogIndex,
  BenchmarkRunDocument,
  GroupEntry,
  RunEntry,
  Variant,
} from "@/types/benchmark";
import {
  fetchBenchmarkCatalog,
  fetchBenchmarkRun,
  formatAbsoluteDate,
  formatLanguageLabel,
  formatMetric,
  formatParameterValue,
  humanizeDirection,
  slugifyPathToken,
  shortenSha,
  timeAgo,
} from "@/lib/benchmark";
import { BenchmarkSortMode, sortBenchmarksByBoltffi } from "@/lib/benchmark-sort";
import { LanguageBadge, PlatformBadge, ToolBadge } from "@/components/badges";
import { BenchmarkDetailView } from "@/components/BenchmarkDetailView";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  language: string;
  runs: RunEntry[];
  groupEntries: GroupEntry[];
  selectedBenchmarkId: string | null;
  onBackToLanguages: () => void;
  onSelectBenchmark: (benchmarkId: string) => void;
  onClearBenchmark: () => void;
}

export interface BenchmarkToolStat {
  toolName: string;
  unit: string;
  latestValue: number;
  averageValue: number;
  sampleRuns: number;
}

export interface BenchmarkRow {
  id: string;
  group: string;
  title: string;
  category: string;
  direction: string;
  parameters: Record<string, string | number | boolean | null>;
  latestVariants: Variant[];
  toolStats: BenchmarkToolStat[];
  viewPath: string;
}

function resolveBenchmarkViewPath(
  benchmarkId: string,
  catalogEntry?: BenchmarkCatalogIndex["benchmarks"][number]
): string {
  if (catalogEntry?.view_path) return catalogEntry.view_path;
  if (catalogEntry?.history_path) return catalogEntry.history_path;
  if (catalogEntry?.detail_path) return catalogEntry.detail_path;

  const slug = slugifyPathToken(benchmarkId);
  return `data/views/benchmarks/${slug}.json`;
}

export function LanguageBenchmarksView({
  language,
  runs,
  groupEntries,
  selectedBenchmarkId,
  onBackToLanguages,
  onSelectBenchmark,
  onClearBenchmark,
}: Props) {
  const [latestRunDocument, setLatestRunDocument] = useState<BenchmarkRunDocument | null>(null);
  const [benchmarkCatalog, setBenchmarkCatalog] = useState<BenchmarkCatalogIndex | null>(null);
  const [sortMode, setSortMode] = useState<BenchmarkSortMode>("boltffi_fastest");
  const [loading, setLoading] = useState(true);

  const latestRun = runs[0] ?? null;
  const previousRuns = runs.slice(1);

  useEffect(() => {
    let cancelled = false;

    if (!latestRun) {
      setLatestRunDocument(null);
      setBenchmarkCatalog(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    Promise.all([fetchBenchmarkRun(latestRun.archive_path), fetchBenchmarkCatalog()])
      .then(([runDocument, catalog]) => {
        if (cancelled) return;
        setLatestRunDocument(runDocument);
        setBenchmarkCatalog(catalog);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latestRun]);

  const benchmarkRows = useMemo<BenchmarkRow[]>(() => {
    if (!latestRunDocument || !benchmarkCatalog) return [];

    const catalogById = new Map(
      benchmarkCatalog.benchmarks.map((benchmark) => [benchmark.id, benchmark])
    );

    return sortBenchmarksByBoltffi(
      latestRunDocument.benchmarks
      .map((benchmarkDocument) => {
        const descriptor = benchmarkDocument.descriptor;
        const catalogEntry = catalogById.get(descriptor.id);
        const languageAverage = catalogEntry?.averages[language];

        const toolStats = benchmarkDocument.variants
          .map((variant) => {
            const averageTool = languageAverage?.tools.find(
              (toolSummary) => toolSummary.name === variant.subject.tool.name
            );

            return {
              toolName: variant.subject.tool.name,
              unit: variant.metrics.unit,
              latestValue: variant.metrics.value,
              averageValue: averageTool?.average_value ?? variant.metrics.value,
              sampleRuns: averageTool?.run_count ?? 1,
            } satisfies BenchmarkToolStat;
          })
          .sort((left, right) => left.latestValue - right.latestValue);

        return {
          id: descriptor.id,
          group: descriptor.group,
          title: descriptor.title,
          category: descriptor.category,
          direction: descriptor.direction,
          parameters: descriptor.parameters,
          latestVariants: benchmarkDocument.variants,
          toolStats,
          viewPath: resolveBenchmarkViewPath(descriptor.id, catalogEntry),
        } satisfies BenchmarkRow;
      }),
      sortMode
    );
  }, [benchmarkCatalog, language, latestRunDocument, sortMode]);

  const selectedBenchmark = useMemo(() => {
    if (!selectedBenchmarkId) return null;
    return benchmarkRows.find((benchmark) => benchmark.id === selectedBenchmarkId) ?? null;
  }, [benchmarkRows, selectedBenchmarkId]);

  useEffect(() => {
    if (!loading && selectedBenchmarkId && !selectedBenchmark) {
      onClearBenchmark();
    }
  }, [loading, onClearBenchmark, selectedBenchmark, selectedBenchmarkId]);

  const groupTitleMap = useMemo(() => {
    return new Map(groupEntries.map((group) => [group.group, group.title]));
  }, [groupEntries]);

  if (!latestRun) {
    return (
      <div className="space-y-4 font-mono">
        <button
          onClick={onBackToLanguages}
          className="group inline-flex items-center gap-1.5 font-mono text-[13px] text-white/75 transition-colors hover:text-white"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
          cd ../languages
        </button>
        <div className="rounded-md border border-white/[0.1] bg-[#0a0a0a] p-8 text-center font-mono text-[13px] text-white/75">
          No runs are available for this language in the current machine scope.
        </div>
      </div>
    );
  }

  if (selectedBenchmark) {
    return (
      <BenchmarkDetailView
        benchmark={selectedBenchmark}
        language={language}
        latestRun={latestRun}
        onBack={onClearBenchmark}
      />
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fade-in-up">
      <div className="space-y-4">
        <button
          onClick={onBackToLanguages}
          className="group inline-flex items-center gap-1.5 font-mono text-[13px] text-white/75 transition-colors hover:text-white"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
          cd ../languages
        </button>
        <header className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                $ latest run
              </div>
              <h2 className="font-mono text-[26px] font-semibold tracking-tight text-white leading-tight">
                {formatLanguageLabel(language)}
              </h2>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <LanguageBadge language={language} />
                <PlatformBadge platform={latestRun.platform} />
                <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] text-white/85">
                  {latestRun.harness}
                </span>
              </div>
              <p className="font-mono text-[12px] text-white/60">{latestRun.machine.subtitle}</p>
            </div>
            <a
              href={`${import.meta.env.BASE_URL}${latestRun.archive_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 self-start rounded-md border border-white/[0.1] bg-[#0a0a0a] px-3 py-2 font-mono text-[13px] text-white/85 transition-colors hover:border-white/25 hover:bg-[#0c0c0c] hover:text-white"
            >
              <span className="text-white/65">$</span>
              raw.json
              <span aria-hidden className="text-white/60 transition-transform group-hover:translate-x-0.5">↗</span>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="latest run" value={latestRun.suite_name} subvalue={shortenSha(latestRun.commit_sha)} />
            <StatCard
              label="collected"
              value={timeAgo(latestRun.collected_at)}
              subvalue={formatAbsoluteDate(latestRun.collected_at)}
            />
            <StatCard
              label="benchmarks"
              value={String(benchmarkRows.length)}
              subvalue={`${latestRun.tools.length} tools`}
            />
            <StatCard
              label="history"
              value={`${runs.length} runs`}
              subvalue={previousRuns.length > 0 ? `${previousRuns.length} previous runs` : "no previous runs"}
            />
          </div>
        </header>
      </div>

      <section className="overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a]">
        <header className="border-b border-white/[0.08] bg-[#070707] px-4 py-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/85" />
                <h3 className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-white">$ benchmarks</h3>
              </div>
              <p className="mt-1.5 font-mono text-[12px] text-white/65">
                // latest run benchmarks — click any row for detail and chart
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                sort
              </span>
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as BenchmarkSortMode)}>
                <SelectTrigger className="h-9 w-[190px] rounded-md border-white/[0.1] bg-black font-mono text-[12px] text-white/85">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.1] bg-[#0a0a0a] font-mono text-[12px] text-white">
                  <SelectItem value="boltffi_fastest">BoltFFI fastest</SelectItem>
                  <SelectItem value="boltffi_slowest">BoltFFI slowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full font-mono text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                <th className="py-3 px-3 text-left font-semibold">benchmark</th>
                <th className="py-3 px-3 text-left font-semibold whitespace-nowrap">latest</th>
                <th className="py-3 px-3 text-left font-semibold whitespace-nowrap min-w-[200px]">average across runs</th>
                <th className="py-3 px-3 text-left font-semibold">tags</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-mono text-[13px] text-white/75">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white/75" />
                      loading benchmark list…
                    </span>
                  </td>
                </tr>
              ) : benchmarkRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-mono text-[13px] text-white/75">
                    no benchmark rows were available for the latest run.
                  </td>
                </tr>
              ) : (
                benchmarkRows.map((benchmark) => (
                  <tr
                    key={benchmark.id}
                    onClick={() => onSelectBenchmark(benchmark.id)}
                    className="group cursor-pointer border-b border-white/[0.06] align-top transition-colors last:border-b-0 hover:bg-[#0c0c0c]"
                  >
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-mono text-[13px] font-semibold text-white tracking-tight">
                          {benchmark.title}
                        </div>
                        <div className="font-mono text-[11px] text-white/55">
                          {benchmark.id}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <MetricCompactList
                        items={benchmark.toolStats.map((toolStat) => ({
                          toolName: toolStat.toolName,
                          value: toolStat.latestValue,
                          unit: toolStat.unit,
                        }))}
                      />
                    </td>
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <MetricCompactList
                        items={benchmark.toolStats.map((toolStat) => ({
                          toolName: toolStat.toolName,
                          value: toolStat.averageValue,
                          unit: toolStat.unit,
                          suffix: `${toolStat.sampleRuns} runs`,
                        }))}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        <TagPill>{benchmark.category}</TagPill>
                        <TagPill>{humanizeDirection(benchmark.direction)}</TagPill>
                        <TagPill>{groupTitleMap.get(benchmark.group) ?? benchmark.group}</TagPill>
                        {Object.entries(benchmark.parameters).map(([key, value]) => (
                          <TagPill key={`${benchmark.id}-${key}`}>
                            {key}={formatParameterValue(value)}
                          </TagPill>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a]">
        <header className="border-b border-white/[0.08] bg-[#070707] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <h3 className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-white">$ previous runs</h3>
          </div>
          <p className="mt-1.5 font-mono text-[12px] text-white/65">
            // older runs for this language and machine scope
          </p>
        </header>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full font-mono text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                <th className="py-3 px-3 text-left font-semibold">run</th>
                <th className="py-3 px-3 text-left font-semibold">commit</th>
                <th className="py-3 px-3 text-left font-semibold">benchmarks</th>
                <th className="py-3 px-3 text-left font-semibold">collected</th>
                <th className="py-3 px-3 text-left font-semibold">json</th>
              </tr>
            </thead>
            <tbody>
              {previousRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-mono text-[13px] text-white/70">
                    no previous runs yet.
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
                        <div className="font-mono text-[11px] text-white/60">{run.harness}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 nums-tabular font-mono text-[12px] text-white/90">
                      {shortenSha(run.commit_sha)}
                    </td>
                    <td className="py-3 px-3 nums-tabular font-mono text-[12px] text-white/90">
                      {run.benchmark_count}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-mono text-[12px] text-white/80">{timeAgo(run.collected_at)}</div>
                        <div className="nums-tabular font-mono text-[11px] text-white/55">
                          {formatAbsoluteDate(run.collected_at)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={`${import.meta.env.BASE_URL}${run.archive_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 font-mono text-[12px] text-white/85 transition-colors hover:text-white"
                      >
                        <span className="text-white/60">$</span>
                        raw
                        <span aria-hidden className="text-white/60 transition-transform group-hover:translate-x-0.5">↗</span>
                      </a>
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
    <div className="group relative overflow-hidden rounded-md border border-white/[0.1] bg-[#0a0a0a] p-4 transition-colors hover:border-white/[0.2] hover:bg-[#0c0c0c]">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
        $ {label}
      </div>
      <div className="mt-2 nums-tabular font-mono text-[14px] font-semibold text-white tracking-tight leading-tight">
        {value}
      </div>
      {subvalue ? (
        <div className="mt-1.5 nums-tabular font-mono text-[12px] text-white/65">{subvalue}</div>
      ) : null}
    </div>
  );
}

function TagPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[11px] text-white/85">
      {children}
    </span>
  );
}

function MetricCompactList({
  items,
}: {
  items: Array<{ toolName: string; value: number; unit: string; suffix?: string }>;
}) {
  const fastestValue = items.length > 0 ? Math.min(...items.map((item) => item.value)) : null;

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const isFastest = fastestValue !== null && item.value === fastestValue && items.length > 1;
        return (
          <div key={item.toolName} className="flex items-center gap-2.5 whitespace-nowrap">
            <ToolBadge name={item.toolName} />
            <div className="flex items-baseline gap-1.5">
              <span
                className={`nums-tabular font-mono text-[13px] font-semibold leading-tight tracking-tight ${
                  isFastest ? "text-white" : "text-white/85"
                }`}
              >
                {formatMetric(item.value, item.unit)}
              </span>
              {item.suffix ? (
                <span className="nums-tabular font-mono text-[11px] leading-tight text-white/55">
                  · {item.suffix}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
