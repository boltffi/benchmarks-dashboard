import type { ComponentType } from "react";
import { MachineEntry } from "@/types/benchmark";
import { formatBytes, timeAgo } from "@/lib/benchmark";
import { ToolBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { Server, Laptop } from "lucide-react";
import {
  AppleLight,
  GitHubLight,
  Linux,
  Ubuntu,
} from "developer-icons";

type DeveloperIcon = ComponentType<{ size?: number; className?: string }>;

function pickMachineIcon(machine: MachineEntry["machine"]): {
  kind: "brand";
  Component: DeveloperIcon;
} | {
  kind: "lucide";
  Component: typeof Server;
} {
  const os = (machine.os ?? "").toLowerCase();
  const provider = (machine.ci_provider ?? "").toLowerCase();
  const subtitle = (machine.subtitle ?? "").toLowerCase();

  if (machine.kind === "ci" && provider.includes("github")) {
    return { kind: "brand", Component: GitHubLight };
  }
  if (os.includes("darwin") || os.includes("mac") || subtitle.includes("darwin")) {
    return { kind: "brand", Component: AppleLight };
  }
  if (os.includes("ubuntu") || subtitle.includes("ubuntu")) {
    return { kind: "brand", Component: Ubuntu };
  }
  if (os.includes("linux") || subtitle.includes("linux")) {
    return { kind: "brand", Component: Linux };
  }
  return {
    kind: "lucide",
    Component: machine.kind === "ci" ? Server : Laptop,
  };
}

interface Props {
  entry: MachineEntry;
  selected: boolean;
  onSelect: () => void;
}

export function MachineCard({ entry, selected, onSelect }: Props) {
  const { machine } = entry;
  const iconChoice = pickMachineIcon(machine);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full text-left font-mono rounded-md border transition-colors overflow-hidden",
        "bg-[#0a0a0a]",
        selected
          ? "border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          : "border-white/[0.08] hover:border-white/[0.14] hover:bg-[#0c0c0c]"
      )}
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
              selected
                ? "border-white/15 bg-black"
                : "border-white/[0.08] bg-black group-hover:border-white/[0.14]"
            )}
            aria-hidden
          >
            {iconChoice.kind === "brand" ? (
              <iconChoice.Component size={16} />
            ) : (
              <iconChoice.Component className="h-4 w-4 text-white/70" strokeWidth={2} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-[13px] font-semibold text-white tracking-tight truncate leading-tight">
              {machine.label}
            </h3>
            <p className="mt-0.5 text-[11px] font-mono text-white/45 tracking-tight truncate leading-tight">
              {machine.subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/40">
            {timeAgo(entry.latest_collected_at)}
          </span>
          <span className="text-[10px] font-mono text-white/55">
            {formatBytes(machine.memory_bytes)}
          </span>
        </div>
      </div>

      {/* stats strip — pure black sub-surface, dev-console vibe */}
      <div className="grid grid-cols-3 border-t border-white/[0.06] bg-black">
        <Stat label="runs" value={entry.run_count} />
        <Stat label="suites" value={entry.suite_count} divider />
        <Stat label="groups" value={entry.group_count} divider />
      </div>

      {/* tools strip */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] bg-[#070707] px-4 py-2.5">
        <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/35 mr-1">
          $ tools
        </span>
        {entry.tools.map((t) => (
          <ToolBadge key={t} name={t} />
        ))}
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: number;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 py-2.5 flex flex-col gap-1",
        divider && "border-l border-white/[0.06]"
      )}
    >
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      <span className="nums-tabular font-mono text-sm font-semibold text-white leading-none">
        {value}
      </span>
    </div>
  );
}
