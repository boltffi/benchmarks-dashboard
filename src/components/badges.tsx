import { formatLanguageLabel } from "@/lib/benchmark";
import { cn } from "@/lib/utils";

const toolDotColors: Record<string, string> = {
  boltffi: "bg-tool-boltffi",
  uniffi: "bg-tool-uniffi",
  "wasm-bindgen": "bg-tool-wasm",
};

export function ToolBadge({ name }: { name: string }) {
  const dotColor = toolDotColors[name.toLowerCase()] ?? "bg-tool-default";
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] font-medium text-white/95">
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", dotColor)}
      />
      <span className="inline-block min-w-[4.5rem] text-left tracking-tight">
        {name}
      </span>
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] text-white/85">
      {platform}
    </span>
  );
}

export function LanguageBadge({ language }: { language: string }) {
  return (
    <span className="inline-flex items-center rounded border border-white/[0.1] bg-black px-2 py-0.5 font-mono text-[12px] text-white/85">
      {formatLanguageLabel(language)}
    </span>
  );
}

export function SophisticationBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    trivial: "text-white/75",
    moderate: "text-tool-uniffi",
    async: "text-tool-boltffi",
  };
  return (
    <span
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.16em]",
        colors[level] ?? "text-white/65"
      )}
    >
      {level}
    </span>
  );
}
