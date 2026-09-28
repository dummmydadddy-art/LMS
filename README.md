# LMS

An enterprise-grade, multi-portal Learning Management System (LMS) designed to facilitate a complete digital classroom ecosystem. The platform connects Administrators, Teachers, and Students into a cohesive, interactive environment.

A comprehensive widescreen presentation detailing all pages and features can be found in the root directory.

---

## 🚀 Key Portals & Features

### 1. 🔑 Super Admin Portal
* **Central Executive Dashboard**: Real-time stats showing total student enrollment, active course list, scheduled exams, and financial metrics (collections vs. outstanding balances).
* **Course & Batch Management**: Full CRUD operations to configure courses, syllabus descriptions, fee structures, default teacher mappings, and active/inactive status toggles.
* **User Accounts Controller**: Add and manage profiles for Teachers and Students, automatically syncing credentials with Supabase Auth.
* **Financial Ledger & Invoices**: Log manual cash transactions, adjust student fee structures, and broadcast payment due alerts.
* **Weekly Timetable Builder**: Graphical calendar scheduling tool with a bulk timetable creator helper.
* **Course Certificates**: Issue digital course completion certificates with unique tracking IDs and public QR code verification.
* **Broadcast Alerts**: Broadcast announcements globally or filter by course, batch, or individual user.
* **CSV Reporting**: One-click Excel/CSV report exports (Student Enrollments, Collections Ledger, and Batch Attendance logs).

### 2. 👩‍🏫 Teacher Portal
* **Class Attendance Roster**: Track and mark daily batch attendance (Present/Absent status) with direct log records.
* **Study Materials Manager**: Share course documents, video links, PDFs, and notes batched under specific classes.
* **Online Exam Creator**: Design online MCQ quizzes (with timer controls, option mapping, and auto-submit) or coding compiler exams.
* **Grades & Evaluation**: Grade student submissions, enter custom review marks, and return textual feedback.
* **Interactive Live Webinars**: Launch video stream classrooms with full sidebar controls to toggle student chat, raise-hand doubt queues, and voice messages.

### 3. 👨‍🎓 Student Workspace
* **Academic Classroom**: Access active courses, watch lecture recordings, and download study notes or assignments.
* **Timetable Sync**: Personal weekly timetable mapping out subjects, timing, and instructors.
* **Interactive Webinars**: Attend live classes, send chat messages, raise hands for doubt clearing, and record voice notes.
* **Online Test Center**: Take scheduled quizzes with live count-down timers and submit solutions in an online coding compiler workspace.
* **Academic Record**: View scores, grades, and teacher feedback for all evaluated assignments and examinations.
* **Fees Ledger & Razorpay Checkout**: Check total balances, view transaction history, and pay school fees online securely using Razorpay integration.
* **Verified Certificates**: View and print earned completion certificates, featuring public validation URLs for employers.

---

## 🛠️ Technology Stack
* **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons, React Router DOM, React Markdown.
* **Backend**: PHP 8.x REST API gateway with custom JWT authorization and CORS handlers.
* **Database**: Supabase PostgreSQL featuring 28+ relational tables, pgvector extension, and PL/pgSQL sync triggers.
* **AI/RAG Engine**: Local Ollama runtime with nomic-embed-text (768-dim embeddings) and llama3.2 (3B parameter synthesis).
* **Integrations**: Razorpay Checkout SDK, n8n workflow automation with Telegram chatbot.

---

## 🤖 AI Course Tutor (RAG System)

The platform includes a fully local **Retrieval-Augmented Generation (RAG)** system that enables students to ask curriculum-grounded questions and receive accurate, cited answers from their approved study materials.

### Architecture Overview

```
Student Question
      │
      ▼
┌─────────────────────┐
│  Safety Boundary    │ ◄── Blocks injection attacks, out-of-curriculum
│  (8-vector defense) │     tech (Vue/Angular/Docker), fabricated APIs
└──────────┬──────────┘
           │ PASS
           ▼
┌─────────────────────┐
│  Query Condenser    │ ◄── Resolves pronouns: "how does it work?"
│  (Coreference)      │     → "how does useEffect work?"
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Hybrid Retrieval (BM25 + Dense + RRF) │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ BM25     │  │ nomic-embed-text   │   │
│  │ (Okapi)  │  │ (768-dim cosine)   │   │
│  └────┬─────┘  └────────┬───────────┘   │
│       └────────┬────────┘               │
│                ▼                        │
│     Reciprocal Rank Fusion (k=60)       │
│                │                        │
│                ▼                        │
│     MMR Diversity Reranker (λ=0.75)     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Calibrated         │ ◄── Multi-factor confidence gate
│  Confidence Gate    │     Abstains on out-of-domain queries
└──────────┬──────────┘
           │ GROUNDED
           ▼
┌─────────────────────┐
│  llama3.2 (3B)      │ ◄── Synthesis with source citations
│  Grounded Generation│     "[Document Title, Section X]"
└─────────────────────┘
```

### Key Features
* **Hybrid BM25 + Dense Search with RRF** — Combines lexical keyword matching with semantic vector similarity for robust retrieval.
* **Calibrated Confidence Gate** — Multi-factor scoring (similarity × margin × keyword coverage) prevents hallucination by abstaining on low-confidence queries.
* **8-Vector Safety Boundary** — Blocks prompt injection (instruction overrides, role confusion, base64 payloads), out-of-curriculum technology queries, fabricated APIs, and admin credential requests.
* **Conversational Coreference Resolution** — Rewrites follow-up questions with detected curriculum entities (e.g., "why does it throw?" → "why does TDZ throw?").
* **Document Extraction** — Ingests PDF (PyMuPDF), DOCX (ZipArchive), Markdown, TXT, HTML, and CSV.
* **Grounded Quiz Generation** — Generates MCQs with 4 options (A-D), answer keys, and source citations grounded in course materials.
* **Course Access Isolation** — Students can only retrieve chunks for courses they are enrolled in (enforced at SQLite query level and Supabase RLS).
* **Dual Storage** — SQLite primary (sub-5ms local retrieval) with automatic Supabase cloud sync.

### RAG API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rag/stats` | JWT / Service Key | Chunk count, indexed documents, model info |
| `POST` | `/api/rag/search` | JWT / Service Key | Hybrid BM25+Dense+RRF search with course scoping |
| `POST` | `/api/rag/ask` | JWT / Service Key | Grounded Q&A with confidence gate and abstention |
| `POST` | `/api/rag/quiz` | JWT / Service Key | Generate curriculum-grounded MCQ quizzes |
| `POST` | `/api/rag/ingest` | Service Key / Teacher | Ingest document content into vector store |
| `POST` | `/api/rag/embed` | JWT / Service Key | Generate 768-dim embeddings for text |
| `GET/POST` | `/api/rag/conversation` | JWT / Service Key | Read/write student conversation history |

### Hardware Requirements
* **GPU**: NVIDIA RTX 3050 Laptop (4 GB VRAM) or equivalent
* **CPU**: Intel i5-12th Gen or equivalent
* **RAM**: 16 GB minimum
* **Models**: `nomic-embed-text` (~280 MB) + `llama3.2:latest` (~2.0 GB) = ~2.3 GB VRAM

---

## 🏃‍♂️ Getting Started

### Prerequisites
* PHP 8.x
* Node.js & npm
* Supabase Account (configured inside frontend & backend config files)
* [Ollama](https://ollama.com) (for AI Course Tutor)

### Setting Up Ollama (AI Course Tutor)
1. Install Ollama from https://ollama.com
2. Pull the required models:
   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3.2:latest
   ```
3. Verify models are running:
   ```bash
   ollama list
   ```

### Starting the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Start the PHP built-in server:
   ```bash
   php -S localhost:8000
   ```

### Seeding the RAG Knowledge Base
After starting the backend, seed the curriculum vectors:
```bash
php backend/seed_rag_knowledge.php
```
This creates `backend/storage/vectors.sqlite` with 23 curriculum chunks across 5 modules.

### Starting the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### One-Click Launch (All Services)
To start all services together (Docker, n8n, Cloudflare Tunnel, Ollama, PHP backend, Vite frontend):
```bash
launch.bat
```
To stop all services:
```bash
stop.bat
```

### Applying Supabase RAG Migration
Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project and execute `database/rag_migration.sql` to provision the `document_chunks` table, HNSW vector index, `match_documents` RPC, and Row Level Security policies.
