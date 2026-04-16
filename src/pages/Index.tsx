import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RunEntry, SiteIndex } from "@/types/benchmark";
import { compareIsoDesc, fetchIndex } from "@/lib/benchmark";
import { LanguageCard, LanguageSummary } from "@/components/LanguageCard";
import { LanguageBenchmarksView } from "@/components/LanguageBenchmarksView";
import { MachineCard } from "@/components/MachineCard";

const Index = () => {
  const [index, setIndex] = useState<SiteIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchIndex()
      .then(setIndex)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedMachineIdParam = searchParams.get("machine");
  const selectedLanguageParam = searchParams.get("language");
  const selectedBenchmarkId = searchParams.get("benchmark");

  const updateNavigation = useCallback(
    (
      updates: {
        machine?: string | null;
        language?: string | null;
        benchmark?: string | null;
      },
      replace = false
    ) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  const sortedMachines = useMemo(() => {
    if (!index) return [];

    return [...index.machines].sort((left, right) => {
      return (
        compareIsoDesc(left.latest_collected_at, right.latest_collected_at) ||
        right.run_count - left.run_count ||
        left.machine.label.localeCompare(right.machine.label)
      );
    });
  }, [index]);

  const selectedMachineId = useMemo(() => {
    if (!index || !selectedMachineIdParam) return null;

    return index.machines.some((machine) => machine.machine.machine_id === selectedMachineIdParam)
      ? selectedMachineIdParam
      : null;
  }, [index, selectedMachineIdParam]);

  const selectedMachineEntry = useMemo(() => {
    return index?.machines.find((machine) => machine.machine.machine_id === selectedMachineId) ?? null;
  }, [index, selectedMachineId]);

  const machineScopedRuns = useMemo(() => {
    if (!index) return [];

    const runs = selectedMachineId
      ? index.runs.filter((run) => run.machine.machine_id === selectedMachineId)
      : index.runs;

    return [...runs].sort((left, right) => {
      return (
        compareIsoDesc(left.collected_at, right.collected_at) ||
        left.language.localeCompare(right.language) ||
        left.suite_name.localeCompare(right.suite_name)
      );
    });
  }, [index, selectedMachineId]);

  const selectedLanguage = useMemo(() => {
    if (!selectedLanguageParam) return null;

    return machineScopedRuns.some((run) => run.language === selectedLanguageParam)
      ? selectedLanguageParam
      : null;
  }, [machineScopedRuns, selectedLanguageParam]);

  useEffect(() => {
    if (!index) return;

    const normalizedMachine = selectedMachineId;
    const normalizedLanguage = selectedLanguage;
    const normalizedBenchmark = normalizedLanguage ? selectedBenchmarkId : null;

    if (
      selectedMachineIdParam !== normalizedMachine ||
      selectedLanguageParam !== normalizedLanguage ||
      selectedBenchmarkId !== normalizedBenchmark
    ) {
      updateNavigation(
        {
          machine: normalizedMachine,
          language: normalizedLanguage,
          benchmark: normalizedBenchmark,
        },
        true
      );
    }
  }, [
    index,
    selectedBenchmarkId,
    selectedLanguage,
    selectedLanguageParam,
    selectedMachineId,
    selectedMachineIdParam,
    updateNavigation,
  ]);

  const searchScopedRuns = useMemo(() => {
    if (!search) return machineScopedRuns;

    const query = search.toLowerCase();
    return machineScopedRuns.filter(
      (run) =>
        run.suite_name.toLowerCase().includes(query) ||
        run.commit_sha.toLowerCase().includes(query) ||
        run.language.toLowerCase().includes(query) ||
        run.platform.toLowerCase().includes(query) ||
        run.harness.toLowerCase().includes(query) ||
        run.groups.some((group) => group.toLowerCase().includes(query)) ||
        run.tools.some((tool) => tool.toLowerCase().includes(query))
    );
  }, [machineScopedRuns, search]);

  const languageSummaries = useMemo<LanguageSummary[]>(() => {
    const byLanguage = searchScopedRuns.reduce<Record<string, RunEntry[]>>((acc, run) => {
      acc[run.language] ??= [];
      acc[run.language].push(run);
      return acc;
    }, {});

    return Object.entries(byLanguage)
      .map(([language, runs]) => ({
        language,
        latestCollectedAt: runs.map((run) => run.collected_at).sort(compareIsoDesc)[0],
        runCount: runs.length,
        suiteCount: new Set(runs.map((run) => run.suite_name)).size,
        platforms: Array.from(new Set(runs.map((run) => run.platform))).sort(),
        tools: Array.from(new Set(runs.flatMap((run) => run.tools))).sort(),
      }))
      .sort((left, right) => {
        return (
          compareIsoDesc(left.latestCollectedAt, right.latestCollectedAt) ||
          left.language.localeCompare(right.language)
        );
      });
  }, [searchScopedRuns]);

  const visibleRuns = useMemo(() => {
    const runs = selectedLanguage
      ? machineScopedRuns.filter((run) => run.language === selectedLanguage)
      : searchScopedRuns;

    return [...runs].sort((left, right) => compareIsoDesc(left.collected_at, right.collected_at));
  }, [machineScopedRuns, searchScopedRuns, selectedLanguage]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="rounded-md border border-white/[0.12] bg-[#0a0a0a] px-4 py-2.5 font-mono text-[13px] text-white/85">
          <span className="dot mr-2 text-white/80" aria-hidden />
          $ loading benchmarks…
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="rounded-md border border-destructive/50 bg-[#0a0a0a] px-4 py-2.5 font-mono text-[13px] text-destructive">
          <span className="dot mr-2 text-destructive" aria-hidden />
          failed to load benchmark data.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-black/85 backdrop-blur-md px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}boltffi-logo.png`}
              alt="BoltFFI"
              className="h-9 w-9 rounded-md border border-white/[0.1] bg-black object-cover p-1"
            />
            <div className="flex flex-col">
              <h1 className="font-mono text-[15px] font-semibold tracking-tight text-white leading-tight">
                boltffi <span className="text-white/55">/</span> benchmarks
              </h1>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/60 leading-tight">
                machine <span className="text-white/40">→</span> language{" "}
                <span className="text-white/40">→</span> run{" "}
                <span className="text-white/40">→</span> chart
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.1] bg-[#0a0a0a] px-2.5 py-1.5 text-white/85">
              <span className="text-white/55 uppercase tracking-[0.14em] text-[11px]">scope</span>
              <span className="text-white truncate max-w-[160px]">
                {selectedMachineEntry?.machine.label ?? "all machines"}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.1] bg-[#0a0a0a] px-2.5 py-1.5 text-white/85">
              <span className="nums-tabular text-white font-semibold">{languageSummaries.length}</span>
              <span className="text-white/55 uppercase tracking-[0.14em] text-[11px]">langs</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.1] bg-[#0a0a0a] px-2.5 py-1.5 text-white/85">
              <span className="nums-tabular text-white font-semibold">{searchScopedRuns.length}</span>
              <span className="text-white/55 uppercase tracking-[0.14em] text-[11px]">runs</span>
            </div>
            <a
              href={`${import.meta.env.BASE_URL}data/index.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#0a0a0a] px-2.5 py-1.5 text-white/85 transition-colors hover:border-white/25 hover:text-white hover:bg-[#0c0c0c]"
            >
              <span className="text-white/65">$</span>
              index.json
              <span aria-hidden className="text-white/60">↗</span>
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div>
              <div className="mb-3 flex items-center justify-between px-0.5">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  $ machines
                </h2>
                <span className="nums-tabular font-mono text-[11px] text-white/55">
                  [{sortedMachines.length}]
                </span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    updateNavigation({
                      machine: null,
                      language: null,
                      benchmark: null,
                    });
                  }}
                  className={`w-full rounded-md border px-3 py-2.5 text-left font-mono text-[13px] transition-colors ${
                    !selectedMachineId
                      ? "border-white/25 bg-[#0a0a0a] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      : "border-white/[0.1] bg-[#0a0a0a] text-white/75 hover:bg-[#0c0c0c] hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${!selectedMachineId ? "bg-white" : "bg-white/45"}`}
                      aria-hidden
                    />
                    <span className="text-white/65">*</span> all machines
                  </span>
                </button>
                {sortedMachines.map((machine) => (
                  <MachineCard
                    key={machine.machine.machine_id}
                    entry={machine}
                    selected={selectedMachineId === machine.machine.machine_id}
                    onSelect={() => {
                      const nextSelectedMachine =
                        selectedMachineId === machine.machine.machine_id ? null : machine.machine.machine_id;
                      updateNavigation({
                        machine: nextSelectedMachine,
                        language: null,
                        benchmark: null,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            {selectedLanguage ? (
              <LanguageBenchmarksView
                language={selectedLanguage}
                runs={visibleRuns}
                groupEntries={index.groups}
                selectedBenchmarkId={selectedBenchmarkId}
                onBackToLanguages={() =>
                  updateNavigation({
                    language: null,
                    benchmark: null,
                  })
                }
                onSelectBenchmark={(benchmarkId) =>
                  updateNavigation({
                    language: selectedLanguage,
                    benchmark: benchmarkId,
                  })
                }
                onClearBenchmark={() =>
                  updateNavigation({
                    benchmark: null,
                  })
                }
              />
            ) : (
              <>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      $ languages
                    </h2>
                    <p className="font-mono text-[18px] font-semibold text-white tracking-tight leading-tight">
                      choose a language to explore the latest run
                    </p>
                    <p className="font-mono text-[13px] text-white/65">
                      inspect benchmark-by-benchmark with historical context.
                    </p>
                  </div>
                  <div className="relative w-full lg:w-72">
                    <input
                      type="text"
                      placeholder="search suites, tags, tools…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full rounded-md border border-white/[0.12] bg-[#0a0a0a] px-3 py-2.5 pr-9 font-mono text-[13px] text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:bg-[#0c0c0c]"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/[0.12] bg-black px-1.5 py-0.5 font-mono text-[10px] text-white/65"
                    >
                      /
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {languageSummaries.map((summary) => (
                    <LanguageCard
                      key={summary.language}
                      summary={summary}
                      selected={false}
                      onSelect={() =>
                        updateNavigation({
                          language: summary.language,
                          benchmark: null,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
