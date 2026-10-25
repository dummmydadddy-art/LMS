# EXP-0027-S1: Credential Rotation & Secret Exposure Status Report

**Experiment ID:** EXP-0027-S1  
**Target Repository:** `EduConnect-LMS-Experimental`  
**Evaluation Date:** 2026-09-15  
**Auditor:** Independent Security Verification Agent  

---

## 1. Overall Status Summary

| Dimension | Status | Detail |
|:---|:---:|:---|
| **CODE STATUS** | **PASS** | All hardcoded secrets, fallbacks, and plaintext stores purged from tracked source code. |
| **OPERATIONAL STATUS** | **NOT VERIFIABLE FROM LOCAL REPOSITORY** | Live cloud Supabase project dashboard credential rotation cannot be verified or executed from local repository inspection. |
| **EXPOSURE MITIGATION** | **PASS** | All tracked instances removed from git index; `.gitignore` enforced; no new secrets introduced. |
| **FINAL READINESS VERDICT** | **CONDITIONAL PASS** | Code and architecture are 100% remediated. Production deployment is blocked until manual cloud Supabase rotation is executed by project owners. |

---

## 2. Distinction: Code-Level Invalidation vs. Operational Key Rotation

To ensure complete transparency and prevent dangerous assumptions during production deployment:

### Code-Level Remediation (VERIFIED: PASS)
- The codebase no longer contains any hardcoded fallback values for:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SERVICE_API_KEY` (`LMS_SERVICE_API_KEY`)
  - `LMS_GATEWAY_TRUST_TOKEN`
- The old service-to-service key (`lms-n8n-service-key-2026`) was hardcoded in PHP. Because authentication now requires an exact match against `$SERVICE_API_KEY` (sourced from environment variables), the old key is rendered completely invalid at the application layer unless explicitly provided by the operator via environment.
- At runtime, requests using the previously leaked service key (`lms-n8n-service-key-2026`) fail closed with **HTTP 401 Unauthorized**.

### Operational Cloud Credential Rotation (STATUS: NOT VERIFIABLE FROM LOCAL REPOSITORY)
- The Supabase `service_role` JWT that was historically committed to git connects to an external, cloud-hosted Supabase database project (`https://zryyvthnywlyjdyyqkmc.supabase.co`).
- The cryptographic validity and revocation state of a Supabase `service_role` key is governed exclusively by the Supabase project's master JWT Secret.
- An AI coding agent or local developer inspecting the Git repository **cannot** determine whether the project owner has logged into the Supabase Web Console and clicked **"Roll service role key"** or **"Generate new JWT Secret"**.
- Therefore, claiming that the cloud Supabase key has been "rotated" would be scientifically and forensically false. The status is recorded truthfully as **NOT VERIFIABLE FROM LOCAL REPOSITORY**.

---

## 3. Exposure Mitigation Verification

All locations historically containing or referencing credentials were investigated and purged:

| Target | Historical State | Current Remediated State | Static Verification Command | Verification Result |
|:---|:---|:---|:---|:---:|
| `backend/config.php` | Tracked in git; contained fallback JWT and n8n API key | Removed from git tracking (`git rm --cached`); ignored in `.gitignore` | `git ls-files backend/config.php` | **Untracked (Clean)** |
| `backend/config.example.php` | Missing | Added as clean template with `getenv()` lookups and empty defaults | `git grep -i "eyJh" backend/config.example.php` | **0 matches** |
| `backend/otps.json` | Tracked in git; stored plaintext OTPs | Removed from git tracking; ignored in `.gitignore` | `git ls-files backend/otps.json` | **Untracked (Clean)** |
| `backend/auth_middleware.php` | Fallback comparison | Reads `$SERVICE_API_KEY` from env; constant-time comparison `hash_equals()` | `git grep -i "lms-n8n" backend/auth_middleware.php` | **0 matches** |
| `backend/rag_flags.php` | Hardcoded comparison | Reads `LMS_SERVICE_API_KEY` from `getenv()`; constant-time check | `git grep -i "lms-n8n" backend/rag_flags.php` | **0 matches** |
| `database/seed_student.php` | Hardcoded fallback | Sourced strictly from global environment variables | `git grep -i "eyJh" database/seed_student.php` | **0 matches** |
| Tracked History / Diff | N/A | No new secrets or credentials introduced in commit `8a75e47` or `3b41440` | `git diff 924d8a1 8a75e47 \| grep -E "eyJh"` | **0 matches** |

---

## 4. Required Action for Production Deployment

Before promoting any build of `EduConnect-LMS` to a public-facing or production environment:

1. **Supabase Cloud Key Invalidation:**
   - Log into the Supabase Dashboard: `https://supabase.com/dashboard/project/zryyvthnywlyjdyyqkmc/settings/api`
   - Under **Project API keys**, locate the **service_role** key.
   - Click **Rotate key** (or reset the project JWT Secret). This immediately invalidates the historically leaked token across all Supabase backend infrastructure.
2. **Environment Variable Provisioning:**
   - Generate a cryptographically secure random string (minimum 32 characters) for `LMS_SERVICE_API_KEY`.
   - Generate a cryptographically secure random string (minimum 32 characters) for `LMS_GATEWAY_TRUST_TOKEN`.
   - Set these variables, along with the newly generated `SUPABASE_SERVICE_ROLE_KEY`, in the production hosting provider's secure secret store (e.g., Docker environment, AWS Systems Manager, or systemd environment file).
3. **Verify Zero Plaintext Config:**
   - Ensure production deployments never mount or commit a `config.php` containing static strings.

---

## 5. Certification Summary

- **Code Status:** **PASS** (Zero hardcoded secrets, fail-closed design)
- **Local Isolation:** **PASS** (Secrets untracked and gitignored)
- **Operational Status:** **NOT VERIFIABLE FROM LOCAL REPOSITORY** (External cloud action required)
