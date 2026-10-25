import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, X, BookOpen, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { supabase } from '../supabaseClient';

interface SourceCitation {
  title: string;
  chunk_index: number;
  similarity: number;
  page?: string | number;
  page_citation?: string;
  page_number?: number;
  content?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: SourceCitation[];
  timestamp: string;
  interpretedQuery?: string;
  isAbstained?: boolean;
  backend?: string;
  isStreaming?: boolean;
}

interface AiTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  courseId?: string;
  batchId?: string;
  courseName?: string;
}

export const AiTutorModal: React.FC<AiTutorModalProps> = ({
  isOpen,
  onClose,
  studentId,
  courseId,
  batchId,
  courseName = 'Full Stack Web Development'
}) => {
  const [effectiveStudentId, setEffectiveStudentId] = useState<string>(studentId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I'm your EduConnect AI Course Tutor for **${courseName}**. I answer questions grounded strictly in your official syllabus and study materials. What would you like to explore today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!studentId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setEffectiveStudentId(user.id);
        }
      });
    }
  }, [studentId]);

  const sampleQuestions = [
    'How does Flexbox justify-content differ from align-items?',
    'Explain useEffect cleanup function with an example',
    'What are 1NF, 2NF, and 3NF in database normalization?',
    'What is the difference between let, const, and var?'
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const API_BASE = (api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const handleNewConversation = async () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setLoading(false);
    setIsClearing(true);
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: `Hello! I'm your EduConnect AI Course Tutor for **${courseName}**. I answer questions grounded strictly in your official syllabus and study materials. What would you like to explore today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    const targetStudentId = studentId || effectiveStudentId;
    if (targetStudentId) {
      try {
        await api.post('/api/rag/clear', {
          student_id: targetStudentId
        }, {
          headers: {
            'X-Service-Key': 'lms-n8n-service-key-2026'
          }
        });
      } catch (err) {
        console.warn('[AiTutorModal] Failed to clear session store:', err);
      }
    }
    setIsClearing(false);
  };

  const handleSend = useCallback(async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading || isStreaming) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsgId = String(Date.now());
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    const targetStudentId = effectiveStudentId || studentId;
    const assistantMsgId = String(Date.now() + 1);

    let streamSuccess = false;
    let receivedFirstToken = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Service-Key': 'lms-n8n-service-key-2026'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/api/rag/ask?stream=true`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          question: q,
          stream: true,
          student_id: targetStudentId || undefined,
          course_id: courseId,
          batch_id: batchId
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP stream error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventName = 'token';
          const dataLines: string[] = [];

          for (const rawLine of block.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          const dataStr = dataLines.join('\n');
          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);

            if (eventName === 'token' && typeof payload.token === 'string') {
              accumulatedText += payload.token;
              if (!receivedFirstToken) {
                receivedFirstToken = true;
                setLoading(false);
                setIsStreaming(true);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantMsgId,
                    sender: 'assistant',
                    text: accumulatedText,
                    sources: [],
                    isStreaming: true,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
              }
            } else if (eventName === 'done') {
              streamSuccess = true;
              const isAbstained = Boolean(
                payload.abstain ||
                payload.abstained ||
                payload.backend === 'crag_fallback_gate' ||
                payload.backend === 'safety_boundary_gate' ||
                payload.backend === 'safety_trap_gate' ||
                payload.backend === 'calibrated_abstention_gate' ||
                payload.backend === 'unverified_premise_gate'
              );

              if (payload.query_condensation?.rewritten && payload.query_condensation?.condensed_query) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === userMsgId
                      ? { ...m, interpretedQuery: payload.query_condensation.condensed_query }
                      : m
                  )
                );
              }

              const finalText = payload.answer || accumulatedText;
              const sources: SourceCitation[] = payload.sources || [];

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: finalText,
                        sources,
                        isAbstained,
                        backend: payload.backend,
                        isStreaming: false
                      }
                    : m
                )
              );
            }
          } catch (parseErr) {
            console.warn('[AiTutorModal] SSE JSON parse error:', parseErr, dataStr);
          }
        }
      }

      // Handle any trailing complete SSE event remaining in buffer
      if (buffer.trim()) {
        let eventName = 'token';
        const dataLines: string[] = [];
        for (const rawLine of buffer.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
        const dataStr = dataLines.join('\n');
        if (dataStr) {
          try {
            const payload = JSON.parse(dataStr);
            if (eventName === 'done') {
              streamSuccess = true;
              const isAbstained = Boolean(
                payload.abstain ||
                payload.abstained ||
                payload.backend === 'crag_fallback_gate' ||
                payload.backend === 'safety_boundary_gate' ||
                payload.backend === 'safety_trap_gate' ||
                payload.backend === 'calibrated_abstention_gate' ||
                payload.backend === 'unverified_premise_gate'
              );

              if (payload.query_condensation?.rewritten && payload.query_condensation?.condensed_query) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === userMsgId
                      ? { ...m, interpretedQuery: payload.query_condensation.condensed_query }
                      : m
                  )
                );
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: payload.answer || accumulatedText,
                        sources: payload.sources || [],
                        isAbstained,
                        backend: payload.backend,
                        isStreaming: false
                      }
                    : m
                )
              );
            }
          } catch (parseErr) {
            console.warn('[AiTutorModal] SSE trailing parse error:', parseErr);
          }
        }
      }
    } catch (streamErr: unknown) {
      if (controller.signal.aborted) {
        setIsStreaming(false);
        setLoading(false);
        return;
      }
      console.warn('[AiTutorModal] SSE streaming failed or disconnected, falling back to buffered mode:', streamErr);
    } finally {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && m.isStreaming
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }

    // Automatic Fallback to Buffered Axios Mode if streaming failed without receiving tokens
    if (!streamSuccess && !receivedFirstToken) {
      setLoading(true);
      try {
        const res = await api.post('/api/rag/ask', {
          question: q,
          stream: false,
          student_id: targetStudentId || undefined,
          course_id: courseId,
          batch_id: batchId
        }, {
          headers: {
            'X-Service-Key': 'lms-n8n-service-key-2026'
          }
        });

        const reply = res.data?.answer || 'I could not generate an answer at this time.';
        const sources: SourceCitation[] = res.data?.sources || [];
        const backend = res.data?.backend;

        const isAbstained = Boolean(
          res.data?.abstain ||
          res.data?.abstained ||
          backend === 'crag_fallback_gate' ||
          backend === 'safety_boundary_gate' ||
          backend === 'safety_trap_gate' ||
          backend === 'calibrated_abstention_gate' ||
          backend === 'unverified_premise_gate'
        );

        const queryCondensation = res.data?.query_condensation;
        if (queryCondensation?.rewritten === true && queryCondensation?.condensed_query) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId
                ? { ...m, interpretedQuery: queryCondensation.condensed_query }
                : m
            )
          );
        }

        const botMsg: ChatMessage = {
          id: assistantMsgId,
          sender: 'assistant',
          text: reply,
          sources: sources,
          isAbstained: isAbstained,
          backend: backend,
          isStreaming: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages((prev) => [...prev, botMsg]);
      } catch {
        const errorMsg: ChatMessage = {
          id: assistantMsgId,
          sender: 'assistant',
          text: 'Sorry, I encountered an issue connecting to the AI Tutor service. Please ensure the backend server and Ollama are running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [input, loading, isStreaming, effectiveStudentId, studentId, courseId, batchId, API_BASE]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Course Tutor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="flex flex-col w-full max-w-2xl h-[640px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight text-balance">EduConnect AI Course Tutor</h2>
              <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Grounded in Approved Syllabus & Notes (True RAG)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              disabled={loading || isStreaming || isClearing}
              title="Clear conversation history and start fresh"
              aria-label="New Conversation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 active:bg-white/25 text-white transition-colors border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">New Conversation</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close AI Course Tutor"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'user' ? (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-blue-600 text-white rounded-tr-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-pretty">{m.text}</div>
                  {m.interpretedQuery && (
                    <div className="mt-2 pt-2 border-t border-blue-400/30 text-[11px] text-blue-100 flex items-start gap-1.5 font-medium">
                      <span className="text-yellow-300 font-bold text-xs leading-none mt-0.5">↳</span>
                      <span className="leading-tight">
                        Interpreted as: <span className="italic font-normal text-white">"{m.interpretedQuery}"</span>
                      </span>
                    </div>
                  )}
                  <span className="block text-[10px] mt-1 text-right text-blue-200">
                    {m.timestamp}
                  </span>
                </div>
              ) : m.isAbstained ? (
                /* CRAG Fallback / Out-of-Domain Abstention Card */
                <div className="max-w-[85%] rounded-2xl rounded-tl-none p-4 text-sm shadow-sm bg-amber-50 border border-amber-300 text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-amber-200/80 text-amber-800 font-semibold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Curriculum Boundary Notice (CRAG Fallback)</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-pretty text-amber-950 font-normal">
                    {m.text}
                    {m.isStreaming && (
                      <span
                        aria-hidden="true"
                        className="inline-block w-1.5 h-4 ml-1 bg-amber-600 animate-pulse align-middle rounded-sm"
                      />
                    )}
                  </div>
                  <span className="block text-[10px] mt-2 text-right text-amber-700/80">
                    {m.timestamp}
                  </span>
                </div>
              ) : (
                /* Standard Assistant Message */
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm bg-white text-slate-800 border border-slate-200/80 rounded-tl-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-pretty">
                    {m.text}
                    {m.isStreaming && (
                      <span
                        aria-hidden="true"
                        className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle rounded-sm"
                      />
                    )}
                  </div>

                  {/* Sources Section */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Verified Course Sources:
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {m.sources.map((s, idx) => {
                          const pageDisplay = s.page || s.page_citation || (s.page_number ? `p. ${s.page_number}` : null);
                          return (
                            <span
                              key={idx}
                              title={s.content ? s.content.substring(0, 150) + '...' : undefined}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100/70 transition-colors cursor-default"
                            >
                              {s.title} (Sec {s.chunk_index + 1}{pageDisplay ? ` • ${pageDisplay}` : ''}) • {Math.round(s.similarity * 100)}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <span className="block text-[10px] mt-2 text-right text-slate-400">
                    {m.timestamp}
                  </span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2.5 shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Searching course knowledge base & synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-2 no-scrollbar">
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              disabled={loading || isStreaming}
              className="text-xs whitespace-nowrap bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium px-3 py-1.5 rounded-full transition-colors border border-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about your syllabus or study notes..."
            disabled={loading || isStreaming}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || isStreaming || !input.trim()}
            aria-label="Send message"
            className="p-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl shadow-sm transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiTutorModal;
