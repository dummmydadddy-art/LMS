# Frontend Plugins & Design Standards Guidance

**Source**: Antigravity installed plugins & skills (`modern-web-guidance-plugin`, `building-data-apps`, `gsd-ui-review`).
**Target**: Orchestrator_2 and all Workers/Reviewers/Challengers working on Milestones M1 and M2.

---

## 1. Modern Web Guidance (`modern-web-guidance-plugin` - Google Chrome)

Apply modern web platform standards to `AiTutorModal.tsx` and `StudentDashboard.tsx`:

- **Smooth Visual Transitions & States**:
  - Modal open/close should use smooth transitions (`backdrop-blur`, fade-in, scale animation).
  - Use `text-wrap: balance` / `text-wrap: pretty` for headings and message snippets.
  - Active chat scroll tracking with `smooth` behavior and scrollbar styling (`scrollbar-thin`, `scrollbar-color`).
- **Modern Form & Input Patterns**:
  - Use `:focus-visible` outline rings with proper contrast.
  - Auto-scrolling on new messages with `AbortController` cleanup on component unmount or cancel.
- **Accessibility & Contrast**:
  - High contrast for citation badges and CRAG warning cards (AA standard contrast).
  - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-label="AI Course Tutor"`.
  - Accessible error announcements with clear recovery actions (e.g. retry button on connection failure).

---

## 2. Dashboard & Data App Standards (`building-data-apps` - Data Agent Kit)

Apply modern data visualization standards to `RagMetricsDashboard.tsx` (`/admin/rag-metrics`):

- **Executive KPI Metric Cards**:
  - Top row stat cards: Total Queries, P50 Latency, Cache Hit Rate, Active Corpus Chunks.
  - Trend badges / status dots (green = healthy, amber = degraded, red = offline) for FrankenPHP, Reranker, and Ollama.
- **Visual Latency & Stage Breakdown**:
  - Clean horizontal or vertical bar charts showing latency per stage: `cache_lookup` -> `retrieval` -> `confidence_gate` -> `context_compression` -> `llm_generation`.
  - Color-coded stages with tooltip / subtext displaying duration in milliseconds.
- **Academic Benchmark Scorecard**:
  - Structured card displaying the 8 AAAI RGB + NeurIPS RAGChecker metrics with pass/target status badges (`≥ 95%`, `≤ 8%`).
- **Responsive Layout**:
  - Grid layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) that scales gracefully on tablet and desktop.
  - Clean dark/light theme alignment consistent with EduConnect-LMS styling.

---

## 3. 6-Pillar UI Review Audit (`gsd-ui-review`)

Reviewers and Challengers must evaluate the frontend changes against these 6 pillars:
1. **Visual Hierarchy**: Primary actions (Send, New Conversation) clearly stand out; secondary metadata (page numbers, similarity %) legible but unobtrusive.
2. **Intentional Design**: Distinct visual treatment for CRAG abstentions (amber warning box) vs regular assistant answers vs query condensation notes (`↳ Interpreted as`).
3. **Typography & Spacing**: Consistent spacing scale (Tailwind `p-4`, `space-y-4`, `gap-2`), clear font size hierarchy (`text-xs` for metadata, `text-sm` for chat body, `text-base` for headings).
4. **Responsive & Layout**: Modals and dashboard cards must fit without horizontal scroll on desktop, laptop, and tablet viewports.
5. **Motion & Interaction**: Loading spinner during synthesis, smooth scroll to latest message, hover states on suggested question pills and action buttons.
6. **Accessibility & Contrast**: Accessible button labels, keyboard focus indicators, no low-contrast text on colored backgrounds.
