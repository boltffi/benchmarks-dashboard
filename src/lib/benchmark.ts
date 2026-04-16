import {
  BenchmarkCatalogIndex,
  BenchmarkDetail,
  BenchmarkRunDocument,
  GroupDetail,
  SiteIndex,
} from "@/types/benchmark";

const BASE = import.meta.env.BASE_URL;

export function slugifyPathToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchJson<T>(path: string, errorMessage: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function fetchIndex(): Promise<SiteIndex> {
  return fetchJson("data/index.json", "Failed to load index");
}

export async function fetchGroupDetail(path: string): Promise<GroupDetail> {
  const candidates = Array.from(
    new Set([
      path,
      path.replace("data/views/groups/", "data/history/groups/"),
      path.replace("data/views/groups/", "data/groups/"),
    ])
  );

  for (const candidate of candidates) {
    try {
      return await fetchJson(candidate, `Failed to load group: ${candidate}`);
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Failed to load group: ${path}`);
}

export async function fetchGroupDetails(paths: string[]): Promise<GroupDetail[]> {
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        return await fetchGroupDetail(path);
      } catch {
        return null;
      }
    })
  );

  return results.filter((result): result is GroupDetail => result !== null);
}

export async function fetchBenchmarkCatalog(): Promise<BenchmarkCatalogIndex> {
  try {
    return await fetchJson("data/catalog/benchmarks/index.json", "Failed to load benchmark catalog");
  } catch {
    return fetchJson("data/benchmarks/index.json", "Failed to load benchmark catalog");
  }
}

export async function fetchBenchmarkDetail(path: string): Promise<BenchmarkDetail> {
  const candidates = Array.from(
    new Set([
      path,
      path.replace("data/views/benchmarks/", "data/history/benchmarks/"),
      path.replace("data/views/benchmarks/", "data/benchmarks/"),
    ])
  );

  for (const candidate of candidates) {
    try {
      return await fetchJson(candidate, `Failed to load benchmark detail: ${candidate}`);
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Failed to load benchmark detail: ${path}`);
}

export async function fetchBenchmarkRun(path: string): Promise<BenchmarkRunDocument> {
  return fetchJson(path, `Failed to load run archive: ${path}`);
}

export function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(0)} GB`;
}

export function formatMetric(value: number, unit = "ns_per_op"): string {
  if (unit === "ops_per_sec") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M ops/s`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)} K ops/s`;
    return `${value.toFixed(1)} ops/s`;
  }

  return formatNs(value);
}

export function formatNs(ns: number): string {
  if (ns >= 1_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  if (ns >= 1_000) return `${(ns / 1_000).toFixed(2)} µs`;
  return `${ns.toFixed(1)} ns`;
}

export function formatAbsoluteDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function toolColor(name: string): string {
  switch (name.toLowerCase()) {
    case "boltffi": return "tool-boltffi";
    case "uniffi": return "tool-uniffi";
    case "wasm-bindgen": return "tool-wasm";
    default: return "tool-default";
  }
}

export function shortenSha(sha: string): string {
  return sha.slice(0, 8);
}

export function formatLanguageLabel(language: string): string {
  switch (language) {
    case "java_script":
      return "TypeScript";
    default:
      return language
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

export function formatPlatformLabel(platform: string): string {
  switch (platform) {
    case "jvm":
      return "JVM";
    case "wasm":
      return "WASM";
    default:
      return platform.charAt(0).toUpperCase() + platform.slice(1);
  }
}

export function humanizeDirection(direction: string): string {
  return direction
    .split("_")
    .map((part) => (part === "to" ? "→" : part))
    .join(" ");
}

export function compareIsoDesc(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

export function groupBy<Key extends string, Value>(
  items: Value[],
  getKey: (item: Value) => Key
): Record<Key, Value[]> {
  return items.reduce(
    (acc, item) => {
      const key = getKey(item);
      acc[key] ??= [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<Key, Value[]>
  );
}

export function formatParameterValue(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
