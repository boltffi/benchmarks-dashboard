import type { ComponentType } from "react";
import {
  C,
  CPlusPlus,
  CSharp,
  Go,
  Java,
  Kotlin,
  PHP,
  Python,
  Ruby,
  RustLight,
  Swift,
  TypeScript,
  WebAssembly,
} from "developer-icons";
import { cn } from "@/lib/utils";
import { formatLanguageLabel } from "@/lib/benchmark";

type DeveloperIcon = ComponentType<{ size?: number; className?: string }>;

const LANGUAGE_ICONS: Record<string, DeveloperIcon> = {
  kotlin: Kotlin,
  swift: Swift,
  java: Java,
  typescript: TypeScript,
  ts: TypeScript,
  wasm: WebAssembly,
  webassembly: WebAssembly,
  rust: RustLight,
  rs: RustLight,
  python: Python,
  py: Python,
  go: Go,
  golang: Go,
  ruby: Ruby,
  rb: Ruby,
  php: PHP,
  csharp: CSharp,
  cs: CSharp,
  cpp: CPlusPlus,
  cplusplus: CPlusPlus,
  c: C,
};

function slugify(language: string): string {
  if (language === "java_script") {
    return "typescript";
  }

  return language
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

interface Props {
  language: string;
  className?: string;
  size?: "sm" | "md";
}

export function LanguageIcon({ language, className, size = "md" }: Props) {
  const slug = slugify(language);
  const IconComponent = LANGUAGE_ICONS[slug];
  const fallbackGlyph = formatLanguageLabel(language).charAt(0).toUpperCase();

  const dimensions =
    size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconPx = size === "sm" ? 18 : 20;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-black",
        dimensions,
        className
      )}
    >
      {IconComponent ? (
        <IconComponent size={iconPx} />
      ) : (
        <span className="font-mono text-[13px] font-semibold text-white/95">
          {fallbackGlyph}
        </span>
      )}
    </span>
  );
}
