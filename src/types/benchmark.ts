// Types for the benchmark data model

export interface Machine {
  machine_id: string;
  label: string;
  subtitle: string;
  kind: string;
  os: string;
  os_version: string;
  arch: string;
  cpu_model: string;
  hostname: string;
  ci_provider: string | null;
  ci_runner: string | null;
  physical_cores: number;
  logical_cores: number;
  memory_bytes: number;
}

export interface MachineEntry {
  machine: Machine;
  latest_collected_at: string;
  run_count: number;
  suite_count: number;
  group_count: number;
  tools: string[];
  platforms: string[];
  languages: string[];
}

export interface RunEntry {
  run_id: string;
  collected_at: string;
  repository: string;
  branch: string;
  commit_sha: string;
  suite_name: string;
  harness: string;
  platform: string;
  language: string;
  archive_path: string;
  content_sha256: string;
  benchmark_count: number;
  groups: string[];
  tools: string[];
  machine: Machine;
}

export interface GroupEntry {
  group: string;
  title: string;
  category: string;
  sophistication: string;
  direction: string;
  latest_collected_at: string;
  run_count: number;
  machine_count: number;
  machine_ids: string[];
  view_path?: string;
  history_path?: string;
  group_index_path?: string;
}

export interface SiteIndex {
  schema_version: string;
  generated_at: string;
  totals: { run_count: number; group_count: number };
  machines: MachineEntry[];
  runs: RunEntry[];
  groups: GroupEntry[];
}

export interface BenchmarkDescriptor {
  id: string;
  group: string;
  title: string;
  category: string;
  sophistication: string;
  direction: string;
  platform: string;
  language: string;
  description: string | null;
  tags: string[];
  parameters: Record<string, string | number | boolean | null>;
}

export interface ToolInfo {
  name: string;
  version: string;
  git_sha: string | null;
  crate_version: string;
}

export interface BuildInfo {
  compiler_name?: string;
  compiler_version?: string;
  target?: string;
  profile?: string;
  optimization?: string;
  features?: string[];
  flags?: string[];
}

export interface FfiInfo {
  bridge: string;
  transport: string;
  ownership_model: string | null;
  attributes: Record<string, string>;
}

export interface Metrics {
  unit: string;
  estimator: string;
  value: number;
  std_dev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
}

export interface Variant {
  subject: {
    tool: ToolInfo;
    build: BuildInfo;
    ffi: FfiInfo;
    attributes: Record<string, string>;
  };
  metrics: Metrics;
  sampling: {
    warmup_iterations?: number | null;
    measurement_iterations?: number | null;
    sample_count?: number | null;
    total_operations?: number | null;
  };
  notes: string[];
}

export interface BenchmarkRunEntry {
  run_id: string;
  collected_at: string;
  suite_name: string;
  platform: string;
  language: string;
  harness: string;
  commit_sha: string;
  archive_path: string;
  machine: Machine;
  descriptor: BenchmarkDescriptor;
  variants: Variant[];
  notes?: string[];
}

export interface GroupDetail {
  schema_version: string;
  generated_at: string;
  group: string;
  title: string;
  category: string;
  sophistication: string;
  direction: string;
  latest_run_id: string;
  latest_archive_path: string;
  runs: BenchmarkRunEntry[];
}

export interface BenchmarkRunDocument {
  schema_version: string;
  run_id: string;
  collected_at: string;
  provenance: {
    repository?: {
      name?: string;
      url?: string;
      branch?: string;
      commit_sha?: string;
      dirty?: boolean;
    };
    collector?: {
      name?: string;
      version?: string;
      invocation?: string;
    };
    artifacts?: Array<{
      kind?: string;
      path?: string;
      sha256?: string;
    }>;
  };
  environment: Record<string, unknown>;
  suite: {
    name: string;
    harness: string;
    platform: string;
    language: string;
    profile?: string;
    tags?: string[];
    attributes?: Record<string, unknown>;
  };
  benchmarks: Array<{
    descriptor: BenchmarkDescriptor;
    variants: Variant[];
    notes?: string[];
  }>;
  notes?: string[];
}

export interface BenchmarkLanguageAverage {
  name: string;
  unit: string;
  average_value: number;
  run_count: number;
}

export interface BenchmarkCatalogEntry {
  id: string;
  group: string;
  title: string;
  category: string;
  sophistication: string;
  direction: string;
  parameters: Record<string, string | number | boolean | null>;
  latest_collected_at: string;
  run_count: number;
  languages: string[];
  averages: Record<
    string,
    {
      run_count: number;
      tools: BenchmarkLanguageAverage[];
    }
  >;
  latest_run_id: string;
  view_path?: string;
  history_path?: string;
  detail_path?: string;
}

export interface BenchmarkCatalogIndex {
  schema_version: string;
  generated_at: string;
  benchmarks: BenchmarkCatalogEntry[];
}

export interface BenchmarkDetail {
  schema_version: string;
  generated_at: string;
  benchmark_id: string;
  group: string;
  title: string;
  category: string;
  sophistication: string;
  direction: string;
  parameters: Record<string, string | number | boolean | null>;
  latest_run_id: string;
  latest_archive_path: string;
  runs: BenchmarkRunEntry[];
}
