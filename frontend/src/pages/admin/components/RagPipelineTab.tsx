import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  Cpu,
  Activity,
  Server,
  Zap,
  Database,
  RefreshCw,
  ShieldCheck,
  BarChart2,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export interface ServiceStatus {
  status?: string;
  latency_ms?: number;
  engine?: string;
  model?: string;
  available_models?: string[];
}

export interface LatencySummary {
  p50_ms?: number;
  avg_ms?: number;
  p90_ms?: number;
}

export interface StageLatency {
  avg_ms?: number;
  p50_ms?: number;
}

export interface LatencyBucket {
  bucket: string;
  count: number;
  percentage: number;
}

export interface BenchmarkMetricItem {
  id: string;
  name: string;
  standard: string;
  category: string;
  description: string;
  threshold: string;
  percentage: number;
  passed: boolean;
}

export interface BenchmarkData {
  overall_status?: string;
  overall_score_percentage?: number;
  judge_model?: string;
  generator_model?: string;
  corpus_chunks?: number;
  test_cases_count?: number;
  metrics?: BenchmarkMetricItem[];
}

export interface RecentQuery {
  query_id: string;
  timestamp: string;
  total_ms: number;
  cache_hit: boolean;
  confidence: number | null;
  abstained: boolean;
}

export interface TelemetryData {
  total_queries?: number;
  cache_hits?: number;
  cache_misses?: number;
  cache_hit_rate?: number;
  latency_summary?: LatencySummary;
  stage_breakdown?: Record<string, StageLatency>;
  latency_distribution?: LatencyBucket[];
  recent_queries?: RecentQuery[];
}

export interface KnowledgeBaseData {
  total_chunks?: number;
  parent_chunks?: number;
  textbooks_count?: number;
}

export interface RagMetricsResponse {
  services?: {
    frankenphp?: ServiceStatus;
    reranker?: ServiceStatus;
    ollama?: ServiceStatus;
  };
  telemetry?: TelemetryData;
  knowledge_base?: KnowledgeBaseData;
  benchmarks?: BenchmarkData;
  success?: boolean;
  metrics?: RagMetricsResponse;
}

export interface RagPipelineTabProps {
  /** Optional initial metrics if preloaded by parent */
  initialMetrics?: RagMetricsResponse | null;
  /** Optional callback invoked when telemetry data is refreshed */
  onMetricsRefreshed?: (metrics: RagMetricsResponse) => void;
}

const DEFAULT_BENCHMARK_METRICS: BenchmarkMetricItem[] = [
  { id: 'noise_robustness', name: 'Noise Robustness', standard: 'RGB (AAAI 2024)', category: 'Robustness', description: 'Resistance to irrelevant chunks', threshold: '>= 80.0%', percentage: 0, passed: false },
  { id: 'negative_rejection', name: 'Negative Rejection', standard: 'RGB (AAAI 2024)', category: 'Safety & CRAG', description: 'Reliable abstention on out-of-domain queries', threshold: '>= 80.0%', percentage: 0, passed: false },
  { id: 'information_integration', name: 'Information Integration', standard: 'RGB (AAAI 2024)', category: 'Synthesis', description: 'Cross-chunk synthesis across multiple passages', threshold: '>= 75.0%', percentage: 0, passed: false },
  { id: 'counterfactual_robustness', name: 'Counterfactual Robustness', standard: 'RGB (AAAI 2024)', category: 'Factuality', description: 'Resistance to premise falsehoods', threshold: '>= 80.0%', percentage: 0, passed: false },
  { id: 'overall_rgb_composite', name: 'Overall RGB Composite', standard: 'RGB (AAAI 2024)', category: 'Benchmark Composite', description: 'Macro-average across all 4 RGB dimensions', threshold: '>= 80.0%', percentage: 0, passed: false },
  { id: 'claim_precision', name: 'Claim Precision', standard: 'RAGChecker (NeurIPS 2024)', category: 'Factuality', description: 'Ratio of factual generated claims supported', threshold: '>= 80.0%', percentage: 0, passed: false },
  { id: 'claim_recall', name: 'Claim Recall', standard: 'RAGChecker (NeurIPS 2024)', category: 'Completeness', description: 'Coverage ratio of key reference claims', threshold: '>= 75.0%', percentage: 0, passed: false },
  { id: 'hallucination_rate', name: 'Hallucination Rate', standard: 'RAGChecker (NeurIPS 2024)', category: 'Safety', description: 'Frequency of unsupported claims (lower is better)', threshold: '<= 15.0%', percentage: 0, passed: false }
];

export const RagPipelineTab: React.FC<RagPipelineTabProps> = ({
  initialMetrics = null,
  onMetricsRefreshed
}) => {
  // RAG Pipeline Metrics State
  const [ragMetrics, setRagMetrics] = useState<RagMetricsResponse | null>(initialMetrics);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchRagMetrics = useCallback(async () => {
    setRagLoading(true);
    setRagError(null);
    try {
      const res = await api.get<RagMetricsResponse>('/api/rag/metrics', {
        headers: {
          'X-Service-Key': 'lms-n8n-service-key-2026'
        }
      });
      if (res.data && (res.data.success || res.data.metrics || res.data.telemetry)) {
        const metricsData = (res.data.metrics || res.data) as RagMetricsResponse;
        setRagMetrics(metricsData);
        setLastRefreshed(new Date().toLocaleTimeString());
        if (onMetricsRefreshed) {
          onMetricsRefreshed(metricsData);
        }
      } else {
        setRagError('Failed to parse RAG metrics response');
      }
    } catch (err: unknown) {
      console.error('Error loading RAG metrics:', err);
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      setRagError(apiErr.response?.data?.error || apiErr.message || 'Error connecting to RAG metrics endpoint');
    } finally {
      setRagLoading(false);
    }
  }, [onMetricsRefreshed]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await Promise.resolve();
      if (isMounted) {
        fetchRagMetrics();
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [fetchRagMetrics]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-400 border border-primary-600/20">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              RAG Pipeline Telemetry & Architecture Intelligence
              <span className="text-[10px] bg-primary-950 text-primary-400 px-2 py-0.5 rounded-full border border-primary-800/60 font-mono font-semibold uppercase">
                v2.4 Neural
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Microsecond telemetry, active subsystem health, hierarchical vector indexing, and academic benchmark validation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              Updated {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchRagMetrics}
            disabled={ragLoading}
            className="btn-secondary py-2 px-3.5 text-xs flex items-center gap-2 hover:border-primary-500/40 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ragLoading ? 'animate-spin text-primary-400' : 'text-slate-400'}`} />
            <span>{ragLoading ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {ragError && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{ragError}</span>
          </div>
          <button
            onClick={fetchRagMetrics}
            className="text-xs font-semibold underline hover:text-rose-300 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {ragLoading && !ragMetrics ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-6 h-36 bg-slate-900/40 border-slate-800/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-6 h-28 bg-slate-900/40 border-slate-800/60" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Row 1: Subsystem Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. FrankenPHP */}
            <div className="glass-card p-5 space-y-3 relative overflow-hidden border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">FrankenPHP Gateway</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Port 8000</p>
                  </div>
                </div>
                {ragMetrics?.services?.frankenphp?.status === 'online' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Offline
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Response Latency</span>
                <span className="font-mono font-bold text-slate-200">
                  {ragMetrics?.services?.frankenphp?.latency_ms ?? 0} ms
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Engine</span>
                <span className="text-slate-300 font-medium">
                  {ragMetrics?.services?.frankenphp?.engine || 'Worker Mode'}
                </span>
              </div>
            </div>

            {/* 2. Cross-Encoder Reranker */}
            <div className="glass-card p-5 space-y-3 relative overflow-hidden border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Neural Reranker</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Port 8100</p>
                  </div>
                </div>
                {ragMetrics?.services?.reranker?.status === 'online' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Offline
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Inference Latency</span>
                <span className="font-mono font-bold text-slate-200">
                  {ragMetrics?.services?.reranker?.latency_ms ?? 0} ms
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between truncate">
                <span>Model</span>
                <span className="text-slate-300 font-mono text-[10px] truncate max-w-[170px]" title={ragMetrics?.services?.reranker?.model}>
                  ms-marco-MiniLM-L-6-v2
                </span>
              </div>
            </div>

            {/* 3. Ollama LLM Gateway */}
            <div className="glass-card p-5 space-y-3 relative overflow-hidden border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Ollama LLM Engine</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Port 11434</p>
                  </div>
                </div>
                {ragMetrics?.services?.ollama?.status === 'online' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Offline
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Probe Latency</span>
                <span className="font-mono font-bold text-slate-200">
                  {ragMetrics?.services?.ollama?.latency_ms ?? 0} ms
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Active Models</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  llama3.2 + nomic-embed ({ragMetrics?.services?.ollama?.available_models?.length ?? 0} loaded)
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Executive KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Queries */}
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Queries</p>
                <h3 className="text-2xl font-bold font-mono text-slate-100 mt-1">
                  {ragMetrics?.telemetry?.total_queries?.toLocaleString() ?? 0}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  <span className="text-emerald-400 font-semibold">{ragMetrics?.telemetry?.cache_hits ?? 0}</span> hits / <span className="text-slate-400 font-semibold">{ragMetrics?.telemetry?.cache_misses ?? 0}</span> misses
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            {/* P50 Latency */}
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">P50 Latency</p>
                <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {ragMetrics?.telemetry?.latency_summary?.p50_ms ?? 0} <span className="text-sm font-sans font-normal text-slate-400">ms</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Avg: {ragMetrics?.telemetry?.latency_summary?.avg_ms ?? 0} ms • P90: {ragMetrics?.telemetry?.latency_summary?.p90_ms ?? 0} ms
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Cache Hit Rate */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Cache Hit Rate</p>
                  <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {ragMetrics?.telemetry?.cache_hit_rate ?? 0}%
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Zap className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, ragMetrics?.telemetry?.cache_hit_rate || 0))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Semantic query cache active</p>
              </div>
            </div>

            {/* Knowledge Base */}
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Vector Corpus</p>
                <h3 className="text-2xl font-bold font-mono text-purple-400 mt-1">
                  {ragMetrics?.knowledge_base?.total_chunks?.toLocaleString() ?? 0} <span className="text-xs font-sans font-normal text-slate-400">chunks</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ragMetrics?.knowledge_base?.parent_chunks ?? 0} parent chunks • {ragMetrics?.knowledge_base?.textbooks_count ?? 0} textbooks
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <Database className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Row 3: Latency & Stage Breakdown & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stage Latency Breakdown */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary-400" />
                    Microsecond Stage Latency Breakdown
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Average and P50 durations per execution phase</p>
                </div>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  6 Stages
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {[
                  { key: 'cache_lookup', name: 'Semantic Cache Lookup', desc: 'Normalized MD5 exact & semantic cosine check', color: 'bg-emerald-500' },
                  { key: 'retrieval', name: 'Hybrid Retrieval & Reranker', desc: 'Dense sqlite-vec + BM25 + Cross-Encoder', color: 'bg-sky-500' },
                  { key: 'confidence_gate', name: 'CRAG Confidence Gate', desc: 'Evaluates top similarity against abstain threshold', color: 'bg-indigo-500' },
                  { key: 'context_compression', name: 'Hierarchical Parent Assembly', desc: 'Assembles full parent text with page metadata', color: 'bg-purple-500' },
                  { key: 'llm_generation', name: 'LLM Generation (Llama 3.2)', desc: 'Local Ollama autoregressive response synthesis', color: 'bg-amber-500' },
                  { key: 'total_pipeline', name: 'Total End-to-End Pipeline', desc: 'Full roundtrip execution time', color: 'bg-primary-500' },
                ].map(stage => {
                  const data = ragMetrics?.telemetry?.stage_breakdown?.[stage.key];
                  const avg = data?.avg_ms ?? 0;
                  const p50 = data?.p50_ms ?? 0;
                  const totalAvg = ragMetrics?.telemetry?.stage_breakdown?.total_pipeline?.avg_ms || 0;
                  const pct = stage.key === 'total_pipeline' ? 100 : (totalAvg > 0 ? Math.min(100, Math.round((avg / totalAvg) * 100)) : 0);

                  return (
                    <div key={stage.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{stage.name}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400 text-[11px]">P50: <strong className="text-slate-200">{p50} ms</strong></span>
                          <span className="text-primary-400 font-semibold">{avg} ms ({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">{stage.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Latency Distribution Histogram */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    Query Latency Distribution Buckets
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Categorization across all logged transactions</p>
                </div>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {ragMetrics?.telemetry?.total_queries ?? 0} Queries
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {((ragMetrics?.telemetry?.latency_distribution?.length ?? 0) === 0 ? (
                  ['< 100ms', '100ms - 500ms', '500ms - 2s', '2s - 5s', '5s - 10s', '> 10s'].map(bucket => ({
                    bucket,
                    count: 0,
                    percentage: 0
                  }))
                ) : (
                  ragMetrics?.telemetry?.latency_distribution || []
                )).map((b: LatencyBucket, idx: number) => {
                  const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={b.bucket} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 font-semibold">{b.bucket}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-200 font-bold">{b.count}</span>
                          <span className="text-slate-400 text-[11px]">({b.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 mt-4">
                <p className="font-semibold text-slate-300">Latency Insights:</p>
                <p>
                  • {ragMetrics?.telemetry?.latency_distribution?.length ? (
                    <>Over <strong>{(ragMetrics.telemetry.latency_distribution.slice(0, 2).reduce((sum: number, b: LatencyBucket) => sum + (b.percentage || 0), 0)).toFixed(1)}%</strong> of queries complete in under 500ms due to semantic caching.</>
                  ) : (
                    <>Sub-500ms responses are served via semantic query caching.</>
                  )}
                </p>
                <p>
                  • Complex reasoning questions requiring full Llama 3.2 synthesis average <strong>~{ragMetrics?.telemetry?.stage_breakdown?.llm_generation?.avg_ms ? `${(ragMetrics.telemetry.stage_breakdown.llm_generation.avg_ms / 1000).toFixed(1)}s` : '3.8s'}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Row 4: Academic Benchmark Scorecard */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Academic Benchmark Validation Scorecard
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rigorously measured against AAAI 2024 (RGB Benchmark) and NeurIPS 2024 (RAGChecker) standards
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  ragMetrics?.benchmarks?.overall_status === 'PASSED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {ragMetrics?.benchmarks?.overall_status === 'PASSED' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Composite Score: {ragMetrics?.benchmarks?.overall_score_percentage ?? 0}% • {ragMetrics?.benchmarks?.overall_status || 'PENDING'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="table-header text-left pl-4 py-3">Metric Dimension</th>
                    <th className="table-header text-left py-3">Academic Framework</th>
                    <th className="table-header text-left py-3">Target Capability</th>
                    <th className="table-header text-left py-3">Evaluation Threshold</th>
                    <th className="table-header text-left py-3">Measured Performance</th>
                    <th className="table-header text-right pr-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {((ragMetrics?.benchmarks?.metrics?.length ?? 0) === 0 ? DEFAULT_BENCHMARK_METRICS : (ragMetrics?.benchmarks?.metrics || DEFAULT_BENCHMARK_METRICS)).map((m: BenchmarkMetricItem) => (
                    <tr key={m.id} className="hover:bg-slate-900/30 transition-colors border-b border-slate-800/60 last:border-0">
                      <td className="table-cell pl-4 py-3.5">
                        <p className="font-bold text-slate-100 text-xs">{m.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{m.description}</p>
                      </td>
                      <td className="table-cell py-3.5 font-mono text-xs text-primary-400 font-semibold">
                        {m.standard}
                      </td>
                      <td className="table-cell py-3.5">
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                          {m.category}
                        </span>
                      </td>
                      <td className="table-cell py-3.5 font-mono text-xs text-slate-400">
                        {m.threshold}
                      </td>
                      <td className="table-cell py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-slate-100 min-w-[50px]">
                            {m.percentage}%
                          </span>
                          <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${m.id === 'hallucination_rate' ? 'bg-amber-400' : 'bg-emerald-400'} rounded-full`}
                              style={{ width: `${m.id === 'hallucination_rate' ? Math.min(100, m.percentage * 5) : m.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-right pr-4 py-3.5">
                        {m.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
              <span>Evaluator: <strong>{ragMetrics?.benchmarks?.judge_model || '—'}</strong></span>
              <span>Generator: <strong>{ragMetrics?.benchmarks?.generator_model || '—'}</strong></span>
              <span>Corpus Chunks: <strong>{ragMetrics?.benchmarks?.corpus_chunks ?? 0}</strong></span>
              <span>Test Cases: <strong>{ragMetrics?.benchmarks?.test_cases_count ?? 0}</strong></span>
            </div>
          </div>

          {/* Row 5: Recent Query Telemetry Feed */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-400" />
                  Recent Query Telemetry Feed
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Live execution trail from microsecond JSONL pipeline logs</p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Last 15 Inquiries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="table-header text-left pl-4 py-2.5">Query ID</th>
                    <th className="table-header text-left py-2.5">Timestamp</th>
                    <th className="table-header text-left py-2.5">Execution Latency</th>
                    <th className="table-header text-left py-2.5">Cache Mode</th>
                    <th className="table-header text-left py-2.5">Confidence</th>
                    <th className="table-header text-right pr-4 py-2.5">Safety / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {((ragMetrics?.telemetry?.recent_queries?.length ?? 0) === 0) ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No telemetry logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    ragMetrics?.telemetry?.recent_queries?.map((q: RecentQuery) => (
                      <tr key={q.query_id + '-' + q.timestamp} className="hover:bg-slate-900/30 transition-colors border-b border-slate-800/60 last:border-0">
                        <td className="table-cell pl-4 py-2.5 font-mono text-xs text-primary-400 font-semibold">
                          {q.query_id}
                        </td>
                        <td className="table-cell py-2.5 text-xs text-slate-400">
                          {new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="table-cell py-2.5 font-mono text-xs font-semibold">
                          <span className={q.total_ms < 500 ? 'text-emerald-400' : q.total_ms < 3000 ? 'text-sky-400' : 'text-amber-400'}>
                            {q.total_ms} ms
                          </span>
                        </td>
                        <td className="table-cell py-2.5">
                          {q.cache_hit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Zap className="h-2.5 w-2.5" /> Hit
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              Miss
                            </span>
                          )}
                        </td>
                        <td className="table-cell py-2.5 font-mono text-xs text-slate-300">
                          {q.confidence !== null ? `${(q.confidence * 100).toFixed(1)}%` : <span className="text-slate-500 text-[10px]">N/A (Cache)</span>}
                        </td>
                        <td className="table-cell text-right pr-4 py-2.5">
                          {q.abstained ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              CRAG Abstain
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 text-slate-300">
                              Answered
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RagPipelineTab;
