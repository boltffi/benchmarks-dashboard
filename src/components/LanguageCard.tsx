import { cn } from "@/lib/utils";
import { formatLanguageLabel, formatPlatformLabel, timeAgo } from "@/lib/benchmark";
import { ArrowUpRight } from "lucide-react";
import { LanguageIcon } from "@/components/LanguageIcon";

export interface LanguageSummary {
  language: string;
  latestCollectedAt: string;
  runCount: number;
  suiteCount: number;
  platforms: string[];
  tools: string[];
}

interface Props {
  summary: LanguageSummary;
  selected: boolean;
  onSelect: () => void;
}

export function LanguageCard({ summary, selected, onSelect }: Props) {
  const label = formatLanguageLabel(summary.language);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-md border text-left font-mono transition-colors",
        "bg-[#0a0a0a]",
        selected
          ? "border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          : "border-white/[0.1] hover:border-white/[0.2] hover:bg-[#0c0c0c]"
      )}
    >
      {/* header row */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LanguageIcon language={summary.language} />
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-[15px] font-semibold text-white tracking-tight truncate leading-tight">
              {label}
            </h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/60 leading-tight">
              {timeAgo(summary.latestCollectedAt)}
            </p>
          </div>
        </div>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
          strokeWidth={2}
        />
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 border-t border-white/[0.08] bg-black">
        <div className="px-4 py-3 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            runs
          </span>
          <span className="nums-tabular font-mono text-[15px] font-semibold text-white leading-none">
            {summary.runCount}
          </span>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1.5 border-l border-white/[0.08]">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            suites
          </span>
          <span className="nums-tabular font-mono text-[15px] font-semibold text-white leading-none">
            {summary.suiteCount}
          </span>
        </div>
      </div>

      {/* platforms strip */}
      {summary.platforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.08] bg-[#070707] px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55 mr-1">
            $ platforms
          </span>
          {summary.platforms.map((platform) => (
            <span
              key={platform}
              className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[11px] text-white/85"
            >
              {formatPlatformLabel(platform)}
            </span>
          ))}
        </div>
      )}

      {/* tools strip */}
      {summary.tools.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.08] bg-[#070707] px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55 mr-1">
            $ tools
          </span>
          {summary.tools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[11px] text-white/85"
            >
              {tool}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
