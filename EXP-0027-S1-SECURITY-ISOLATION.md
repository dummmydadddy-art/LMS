# EXP-0027-S1: Security Remediation Isolation & Experiment Preservation Report

**Experiment ID:** EXP-0027-S1  
**Target Repository:** `EduConnect-LMS-Experimental`  
**Base Commit:** `924d8a157a48dd8bb8d4763fe72c43ddd3a42aff`  
**Consolidated Commit:** `8a75e47d505ebbd21e746b436b181de478185769`  
**Pure Security Isolation Commit:** `3b41440e06a2c58902f0136b2cbc900fb86bcebb`  
**Security Branch:** `exp-0027-s1-security`  
**Experiment Branch:** `exp-0027`  
**Production Repository Modified:** **NO** (`EduConnect-LMS-Production` left untouched)  
**Date:** 2026-09-15  

---

## 1. Context & Objective

Commit `8a75e47` on branch `exp-0027` successfully resolved all 12 code-level and runtime security issues identified in the EXP-0027-S1 forensic re-audit. However, an independent audit revealed that commit `8a75e47` bundled pure security remediations with experimental research features (Tier-2 NLI model integration in `rag_premise_verifier.php`) and frontend prototype interfaces (AI Course Tutor modal in `Layout.tsx` and `StudentDashboard.tsx`).

To adhere to rigorous engineering governance:
1. Pure security remediations must be cleanly isolated so they can be reviewed and deployed without experimental side effects.
2. Ongoing experimental research, NLI algorithmic verifier enhancements, and UI developments must remain intact and functional on `exp-0027`.
3. Historical commits must not be destructively rewritten.

---

## 2. Comprehensive File Classification

An audit of all 17 files modified between base `924d8a1` and commit `8a75e47` established the following strict breakdown:

### A. Pure Security Remediation Files (14 files)

These files directly implement or support the 12 P0/P1 security remediation requirements:

| # | File Path | Type | Associated Remediation Requirement |
|---|---|---|---|
| 1 | `.gitignore` | Config | Prevent tracking of `config.php`, `otps.json`, debug logs, and caches |
| 2 | `EXP-0027-S1-FINAL-REPORT.md` | Doc | Security remediation validation and audit report |
| 3 | `EXP-0027-S1-SECURITY-RESULTS.json` | Test/Data | Machine-readable static & runtime verification evidence |
| 4 | `backend/auth_middleware.php` | Backend | P0-04 Gateway trust verification, P0-06 TLS, P1-07 token cache hardening |
| 5 | `backend/config.example.php` | Config | Safe configuration template without secrets |
| 6 | `backend/config.php` | Removed | P0-01/02 Hardcoded secret removal (removed from git tracking) |
| 7 | `backend/db.php` | Backend | P0-06 Enforce TLS verification (`CURLOPT_SSL_VERIFYPEER=true`) |
| 8 | `backend/gateway.js` | Gateway | P0-04 Strip client trust headers & inject authoritative trust token; P1-12 stderr diagnostics |
| 9 | `backend/index.php` | Backend | P0-03 Auth on `/api/rag/flags`, P0-05 `display_errors=0` & no `api_debug.log`, P0-06 TLS, P1-08 CSPRNG `random_int()`, P1-09 hash OTP, P1-10 rate limiting |
| 10 | `backend/otps.json` | Removed | P1-09 Eliminate plaintext OTP tracking (removed from git tracking) |
| 11 | `backend/payment.php` | Backend | P0-06 Enforce TLS verification (`CURLOPT_SSL_VERIFYPEER=true`) |
| 12 | `backend/rag_flags.php` | Backend | P0-01 Dynamic env lookup, P0-04 Gateway trust header enforcement |
| 13 | `backend/start-backend.ps1` | Ops | Start-up script using environment-based secrets |
| 14 | `database/seed_student.php` | Database | P0-06 Enforce TLS verification (`CURLOPT_SSL_VERIFYPEER=true`) |

### B. Unrelated Experimental Research & UI Files (3 files)

These files contain active experimental research work belonging to EXP-0027 and were excluded from the pure security branch:

| # | File Path | Type | Nature of Changes |
|---|---|---|---|
| 1 | `backend/rag_premise_verifier.php` | Research | Implementation of Tier-2 Natural Language Inference (NLI) model verification using Ollama `llama3.2:latest` (+314/-96 lines). Contains premise entailment/contradiction prompt chains, empirical ablation switches, and hypothesis testing thresholds. |
| 2 | `frontend/src/components/Layout.tsx` | Frontend | AI Course Tutor launch modal and navigation button integration (+53 lines). |
| 3 | `frontend/src/pages/student/StudentDashboard.tsx` | Frontend | Student dashboard Materials Vault UI update adding quick launch for AI Tutor (+14 lines). |

---

## 3. Isolation Strategy & Execution

To satisfy all governance criteria without destructive rebase or loss of experimental progress, a two-branch architecture was implemented:

```
                  [exp-0027-s1-security] (Pure Security)
                 /
                /--> Commit 3b41440 (14 security files ONLY)
               /
[Commit 924d8a1] (Base)
               \
                \--> Commit 8a75e47 (Complete: 14 security files + 3 research/UI files)
                 \
                  [exp-0027] (Active Experiment)
```

### Exact Git Commands Executed:

```bash
# Step 1: Create isolated security branch from base commit
git checkout -b exp-0027-s1-security 924d8a157a48dd8bb8d4763fe72c43ddd3a42aff

# Step 2: Selectively check out pure security remediation files from 8a75e47
git checkout 8a75e47 -- \
  .gitignore \
  EXP-0027-S1-FINAL-REPORT.md \
  EXP-0027-S1-SECURITY-RESULTS.json \
  backend/auth_middleware.php \
  backend/config.example.php \
  backend/db.php \
  backend/gateway.js \
  backend/index.php \
  backend/payment.php \
  backend/rag_flags.php \
  backend/start-backend.ps1 \
  database/seed_student.php

# Step 3: Remove tracked sensitive files from git tracking
git rm backend/config.php backend/otps.json

# Step 4: Commit pure security patch to isolation branch
git commit -m "feat(security): EXP-0027-S1 isolated security remediation patch"
# Result: Commit 3b41440 created on exp-0027-s1-security

# Step 5: Switch back to active experiment branch
git checkout exp-0027
```

---

## 4. Verification of Experimental Preservation

A diff between commit `3b41440` (`exp-0027-s1-security`) and commit `8a75e47` (`exp-0027`) confirms exact parity on security items and complete preservation of experimental assets on `exp-0027`:

```
$ git diff 3b41440 8a75e47 --stat
 backend/rag_premise_verifier.php                | 410 ++++++++++++++++++++++--
 frontend/src/components/Layout.tsx              |  53 +++-
 frontend/src/pages/student/StudentDashboard.tsx |  14 +-
 3 files changed, 378 insertions(+), 99 deletions(-)
```

- **Experimental NLI Verifier:** Intact on `exp-0027` with full Tier-2 Ollama Llama 3.2 inference logic.
- **Frontend Student Experience:** Intact on `exp-0027` with AI Course Tutor modal and Materials Vault integration.
- **Security Baseline:** Both branches share 100% identical security implementations in authentication, authorization, TLS enforcement, error suppression, and OTP generation.

---

## 5. Certification Verdict

- **Security Isolation:** **PASS** (Pure security patch available at commit `3b41440` on branch `exp-0027-s1-security`).
- **Experiment Preservation:** **PASS** (Zero loss of research code, models, or UI features on branch `exp-0027`).
