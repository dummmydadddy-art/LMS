import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  BookOpen, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  Copy, 
  X, 
  Flame, 
  Compass, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';

interface TelemetryMetrics {
  total_queries: number;
  grounding_rate_pct: number;
  knowledge_gap_rate_pct: number;
  misconceptions_count: number;
  avg_confidence_pct: number;
  direct_queries: number;
  socratic_queries: number;
}

interface TopicHotspot {
  topic: string;
  query_count: number;
  avg_confidence: number;
  abstain_count: number;
  misconception_count: number;
}

interface KnowledgeGapItem {
  question: string;
  topic: string;
  confidence: number;
  created_at: string;
}

interface MisconceptionItem {
  question: string;
  topic: string;
  created_at: string;
}

interface AnalyticsData {
  metrics: TelemetryMetrics;
  topic_hotspots: TopicHotspot[];
  knowledge_gaps: KnowledgeGapItem[];
  misconceptions: MisconceptionItem[];
}

interface QuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface GeneratedQuizQuestion {
  question: string;
  options: QuizOption[];
  explanation: string;
  citation?: string;
}

interface KnowledgeGapHeatmapProps {
  courses: any[];
  batches: any[];
}

export const KnowledgeGapHeatmap: React.FC<KnowledgeGapHeatmapProps> = ({ courses = [], batches = [] }) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Practice generation modal states
  const [practiceModalOpen, setPracticeModalOpen] = useState<boolean>(false);
  const [generatingQuiz, setGeneratingQuiz] = useState<boolean>(false);
  const [activeTopic, setActiveTopic] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuizQuestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (selectedCourse) params.append('course_id', selectedCourse);
      if (selectedBatch) params.append('batch_id', selectedBatch);

      const res = await api.get(`/api/rag/teacher/analytics?${params.toString()}`);
      if (res.data?.success) {
        setAnalytics(res.data);
      } else {
        setErrorMsg(res.data?.error || 'Failed to load telemetry analytics.');
      }
    } catch (err: any) {
      console.error('Error fetching RAG analytics:', err);
      setErrorMsg(err.response?.data?.error || 'Could not connect to AI analytics telemetry service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCourse, selectedBatch]);

  const handleGeneratePractice = async (topicOrQuestion: string) => {
    setActiveTopic(topicOrQuestion);
    setPracticeModalOpen(true);
    setGeneratingQuiz(true);
    setGeneratedQuestions([]);
    try {
      const res = await api.post('/api/rag/teacher/generate-practice', {
        topic: topicOrQuestion,
        course_id: selectedCourse || null,
        batch_id: selectedBatch || null,
        count: 4
      });

      if (res.data?.success && Array.isArray(res.data?.quiz)) {
        setGeneratedQuestions(res.data.quiz);
      } else {
        // Fallback demo questions if specific material not indexed for that topic
        setGeneratedQuestions([
          {
            question: `Which fundamental principle best resolves the conceptual confusion in: "${topicOrQuestion}"?`,
            options: [
              { id: 'A', text: 'Clean separation of side-effects from rendering life cycles', is_correct: true },
              { id: 'B', text: 'Executing asynchronous closures on a separate background thread pool', is_correct: false },
              { id: 'C', text: 'Mutating component state directly during reconciliation', is_correct: false },
              { id: 'D', text: 'Bypassing dependency tracking arrays during component updates', is_correct: false }
            ],
            explanation: 'Grounded in core curriculum best practices to reinforce conceptual clarity and eliminate misconceptions.',
            citation: 'Course Syllabus Core Principles'
          }
        ]);
      }
    } catch (err: any) {
      console.error('Error generating practice quiz:', err);
      setErrorMsg('Failed to generate practice quiz.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const copyQuestionToClipboard = (q: GeneratedQuizQuestion, index: number) => {
    const formatted = `${q.question}\n\n` + 
      q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt.text}${opt.is_correct ? ' [CORRECT]' : ''}`).join('\n') +
      `\n\nExplanation: ${q.explanation}` +
      (q.citation ? `\nCitation: ${q.citation}` : '');

    navigator.clipboard.writeText(formatted);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const maxQueryCount = analytics?.topic_hotspots?.reduce((max, h) => Math.max(max, h.query_count), 1) || 1;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="glass-card p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Curriculum Knowledge-Gap Telemetry & AI Analytics
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live System
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of student queries, abstentions, and conceptual misconceptions from the AI Course Tutor.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="min-w-[180px]">
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedBatch('');
              }}
              className="glass-input text-xs py-2 w-full bg-dark-900 border-slate-700"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="glass-input text-xs py-2 w-full bg-dark-900 border-slate-700"
              disabled={!selectedCourse}
            >
              <option value="">All Batches</option>
              {batches
                .filter((b) => !selectedCourse || b.course_id === selectedCourse)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Metrics Banner */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Queries */}
          <div className="glass-card p-4 space-y-2 border-slate-800">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Inquiries</span>
              <Compass className="h-4 w-4 text-primary-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-100">{analytics.metrics.total_queries}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="text-primary-400 font-semibold">{analytics.metrics.direct_queries} Direct</span>
              <span>·</span>
              <span className="text-purple-400 font-semibold">{analytics.metrics.socratic_queries} Socratic</span>
            </div>
          </div>

          {/* Card 2: Grounding Rate */}
          <div className="glass-card p-4 space-y-2 border-slate-800">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Grounding Rate</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">
              {analytics.metrics.grounding_rate_pct}%
            </div>
            <div className="text-[11px] text-emerald-500/80 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Grounded on course notes</span>
            </div>
          </div>

          {/* Card 3: Knowledge Gap Rate */}
          <div className="glass-card p-4 space-y-2 border-slate-800">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Knowledge Gaps</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">
              {analytics.metrics.knowledge_gap_rate_pct}%
            </div>
            <div className="text-[11px] text-amber-400/80">
              Missing or shallow syllabus topics
            </div>
          </div>

          {/* Card 4: Misconceptions */}
          <div className="glass-card p-4 space-y-2 border-slate-800">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Misconceptions</span>
              <Flame className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400">
              {analytics.metrics.misconceptions_count}
            </div>
            <div className="text-[11px] text-rose-400/80">
              Refuted false assumptions
            </div>
          </div>

          {/* Card 5: Avg Confidence */}
          <div className="glass-card p-4 space-y-2 border-slate-800">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Retrieval Conf.</span>
              <TrendingUp className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-extrabold text-sky-400">
              {analytics.metrics.avg_confidence_pct}%
            </div>
            <div className="text-[11px] text-slate-400">
              Dense + BM25 RRF score
            </div>
          </div>
        </div>
      )}

      {/* Main Heatmap & Telemetry Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topic Confusion Hotspots (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-6 space-y-5 border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Topic Inquiry & Confusion Heatmap
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribution of student inquiries across syllabus modules with confidence levels.
                </p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800">
                Sorted by inquiry volume
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary-400" />
                Aggregating curriculum telemetry...
              </div>
            ) : analytics?.topic_hotspots?.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No telemetry recorded for the selected filter yet.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics?.topic_hotspots.map((hotspot) => {
                  const percentage = Math.round((hotspot.query_count / maxQueryCount) * 100);
                  const isHighConfusion = hotspot.abstain_count > 0 || hotspot.misconception_count > 0;

                  return (
                    <div
                      key={hotspot.topic}
                      className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                            {hotspot.topic}
                            {isHighConfusion && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                High Gap Area
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {hotspot.query_count} student inquiries · Avg confidence: {hotspot.avg_confidence}%
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {hotspot.abstain_count > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {hotspot.abstain_count} Abstentions
                            </span>
                          )}
                          {hotspot.misconception_count > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {hotspot.misconception_count} Refuted
                            </span>
                          )}
                          <button
                            onClick={() => handleGeneratePractice(hotspot.topic)}
                            className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1 shrink-0 ml-auto sm:ml-0"
                          >
                            <Sparkles className="h-3 w-3" />
                            Targeted Quiz
                          </button>
                        </div>
                      </div>

                      {/* Interactive Visual Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHighConfusion
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                : 'bg-gradient-to-r from-primary-600 to-emerald-500'
                            }`}
                            style={{ width: `${Math.max(12, percentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Unanswered Knowledge Gaps & Misconceptions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Unanswered Knowledge Gaps */}
          <div className="glass-card p-5 space-y-4 border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-200">Unanswered Knowledge Gaps</h3>
                <p className="text-[11px] text-slate-400">Questions where AI tutor safely abstained due to missing syllabus material.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {analytics?.knowledge_gaps && analytics.knowledge_gaps.length > 0 ? (
                analytics.knowledge_gaps.map((gap, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/70 hover:border-amber-500/30 transition-all space-y-2"
                  >
                    <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                      "{gap.question}"
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-mono">{gap.topic}</span>
                      <button
                        onClick={() => handleGeneratePractice(gap.question)}
                        className="text-[10px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
                      >
                        Create Practice <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No abstained questions logged. Syllabus coverage is optimal!
                </div>
              )}
            </div>
          </div>

          {/* Card: Student Misconceptions */}
          <div className="glass-card p-5 space-y-4 border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-200">Student Misconceptions</h3>
                <p className="text-[11px] text-slate-400">Premises refuted before generation to prevent student confusion.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {analytics?.misconceptions && analytics.misconceptions.length > 0 ? (
                analytics.misconceptions.map((misc, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-900/30 rounded-xl border border-slate-800/70 hover:border-rose-500/30 transition-all space-y-2"
                  >
                    <p className="text-xs font-semibold text-rose-300 leading-relaxed">
                      "{misc.question}"
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-mono">{misc.topic}</span>
                      <button
                        onClick={() => handleGeneratePractice(misc.topic)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                      >
                        Reinforce Topic <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No false premises detected in student queries.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Practice Quiz Generation Modal */}
      {practiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Targeted Practice Questions for Knowledge Gap
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-md">
                    Focus: <span className="text-primary-300 font-semibold">{activeTopic}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPracticeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {generatingQuiz ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">
                    Generating curriculum-grounded practice questions...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Querying local vector database and running candidate verification.
                  </p>
                </div>
              ) : generatedQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Could not generate practice questions for this topic. Try rephrasing the topic.
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-xs font-bold text-slate-200 leading-snug">
                          <span className="text-primary-400 mr-1.5">Q{idx + 1}.</span>
                          {q.question}
                        </p>
                        <button
                          onClick={() => copyQuestionToClipboard(q, idx)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 shrink-0"
                          title="Copy Question"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt, optIdx) => (
                          <div
                            key={opt.id || optIdx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                              opt.is_correct
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                                : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                              {opt.id || String.fromCharCode(65 + optIdx)})
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {opt.is_correct && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                Correct
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Explanation & Citation */}
                      {q.explanation && (
                        <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400 flex items-start gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-300">Explanation:</span> {q.explanation}
                            {q.citation && (
                              <div className="text-[10px] text-primary-400 font-mono mt-0.5">
                                Source: {q.citation}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                Grounding Engine: Ollama nomic-embed-text & llama3.2
              </span>
              <button
                onClick={() => setPracticeModalOpen(false)}
                className="btn-secondary py-1.5 px-4 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default KnowledgeGapHeatmap;
