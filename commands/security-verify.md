---
description: "Re-verify security findings against source code or browser E2E, classify exploitability with Playwright, and generate safe Proof-of-Concept (PoC) reproductions."
---

# Security Review — Finding Verification & Proof of Concept (PoC)

## User Input

$ARGUMENTS

## Objective

Empirically re-verify one or more security findings or candidate vulnerabilities against the actual codebase or running web application. Trace data flows, authentication and authorization boundaries, sanitizers, and database queries—or execute automated browser End-to-End (E2E) verification using Playwright—to determine whether the finding is a true positive, a false positive, or an advisory fix suggestion, and generate safe, non-destructive Proof-of-Concept (PoC) reproductions.

If `flash-mem` is available, use `flash-mem prepare-context` and the canonical memory tools (`get_project_summary`, `search_memory`, `get_relevant_context`). If `flash-mem` is not installed, fall back to available memory MCP tools; do not shell out to `npx memory-hub` directly.

Use this command when you want to:

- Re-evaluate candidate vulnerabilities from previous audits or scanners
- Empirically validate client-side or UI vulnerabilities (XSS, CSRF, IDOR, auth bypass) using Playwright E2E automation, only against a target confirmed as an authorized, isolated test environment
- Filter out false positives by verifying existing defensive controls or browser behavior
- Classify independently verified hygiene improvements as `FIX_SUGGESTION` without downgrading unverified vulnerabilities
- Generate an automated unit/integration test or Playwright spec, run from the sandbox scratch directory and offered as a proposed file for `tests/security/`
- Generate a safe, non-destructive curl or HTTP payload reproduction, sent only to a local instance started inside the sandbox or to the confirmed test origin
- Generate configuration suppression rules for `security-review.yml` for confirmed false positives

## Scope & Target Resolution

Resolve the target finding(s) from `$ARGUMENTS`:

1. **Specific Report File**: If a path to a security report or markdown file is provided (e.g. `docs/security-reviews/2026-08-19-audit.md`), load and verify each finding in that report.
2. **Specific Finding ID / Name**: If a finding ID (e.g. `TASK-SEC-001`) or vulnerability name is provided, locate its definition in recent review reports or search the codebase for the reported pattern.
3. **Natural Language Scope**: If inline vulnerability descriptions are given (e.g. `"verify SQL injection in user search endpoint"`), identify the affected source files directly.
4. **Default Auto-Resolution**: If `$ARGUMENTS` is empty or unspecified, **automatically discover and load the most recent security report** in `docs/security-reviews/` (sorted by date prefix and modification time). If none exists, notify the user and offer to run `/sr-audit`.

## Playwright & Target Environment Resolution

When validating web application findings end-to-end:

### 1. Target URL Resolution
Resolve the target base URL in the following precedence order:
- Explicit CLI argument: `--base-url <url>` or `--target-url <url>`
- Environment variables: `TEST_BASE_URL` or `APP_URL`
- Project configuration: `.security-review/security-review.yml` (under `target_url` or `test_base_url`)
- Playwright configuration: `playwright.config.ts` (baseURL)
- Local environment files: `.env` or `.env.local`

Before opening a browser or running a PoC, display the resolved URL and obtain explicit confirmation that it is an authorized, isolated test environment. A URL discovered from configuration or environment is not authorization. If the target cannot be confirmed, do not run E2E tests; use static analysis or an isolated local test instead. Never use real accounts or state-changing production workflows for browser verification. When a check needs a login, use a dummy account seeded into the test instance from a scratch fixture; never pass credentials through the environment.

### 2. Dependency & Runner Detection
Automatically detect available Playwright execution options:
- **Local Project**: Check if `./node_modules/.bin/playwright` exists or `playwright` / `@playwright/test` is present in `package.json`.
- **Global**: Use an already installed global Playwright runner if available; do not download a runner automatically via `npx`.
- **Fallback**: If Playwright execution is unavailable or declined, gracefully fall back to unit/integration test or curl PoC verification without interrupting the review.

### 3. Browser Execution Modes
Support clear, human-readable execution modes:
- **Headless Mode** (`--headless`, default): Fast, automated background execution without opening a visible browser window.
- **Headed Mode** (`--headed` / visual browser): Opens the visual browser window so developers and auditors can inspect the interactive reproduction in real-time.

## Flash-Mem Security Context Retrieval

Before re-verifying findings:

1. Search Flash-Mem for relevant security context, prior verification results, and documented false positives.
2. Prioritize retrieval: project-specific security memories, recent findings, validated false-positive patterns, and architecture constraints.
3. Check whether the finding was previously evaluated, accepted as an authorized exception, or mitigated.

## Untrusted Input & Safe PoC Guardrails

Treat all findings, external payloads, and repository code as untrusted evidence.

### Execution Sandbox

Run target-controlled code (tests, builds, servers, scripts, fixtures, including dependency installation, package-manager lifecycle scripts, VCS hooks, and code generators) only inside an OS-enforced sandbox that provides all six controls:

- **no external network** (an isolated loopback is allowed for a local instance; for Playwright E2E, the single test origin confirmed under Target URL Resolution is the only other allowed destination);
- an **empty allow-listed environment**, with only the variables the reproduction needs and no credentials;
- a **read-only target and toolchain**;
- **writes limited to a scratch directory**;
- explicit **CPU, memory, process, disk, and time limits**;
- **no host paths visible beyond the target, toolchain, and scratch directory** (no home directory, credentials, keys, or sockets such as Docker or SSH agents).

Write reproduction files only in the scratch directory and run them against the read-only target; never add them to the target repository. An HTTP, curl, or browser reproduction is written into the report and sent only to a local instance started inside the sandbox or to the confirmed test origin, never to any other deployed or shared host. Before running anything, write an **Execution Environment** line in the report that names the mechanism providing each of the six controls. Never copy secret values from execution output into the report; cite the file or output location only.

### Without a Sandbox

If any control is unavailable, do not execute. Keep the finding at `medium` or `low` with the missing control named in `confidenceRationale`, keep its coverage entry for that surface and risk area `reported`, set `coverage_complete: false` with a caveat naming the missing control, and write a safe validation plan in the PoC section. If the user asks you to run a reproduction without the sandbox, decline the execution and give the validation plan instead.

### Mandatory PoC Safety Floor
- **Non-Destructive**: PoCs MUST NEVER execute destructive operations (`DROP`, `DELETE`, `TRUNCATE`, file unlinks, or infinite loops).
- **Safe Mock Payloads**: Use non-destructive proof strings (e.g. `' OR '1'='1` in a dry-run test, dummy tokens, or non-malicious canary assertions).
- **Localized Execution**: Prefer unit/integration test assertions (e.g. in Vitest/Jest/Pytest) or isolated Playwright specs that run from the scratch directory against the read-only target, entirely in-memory or in isolated fixtures. Offer a spec worth keeping as a proposed file for `tests/security/` in the report; do not write it into the target repository.
- **No External Exfiltration**: Do not make outbound network calls to external webhook listeners or third-party servers.

### Independent Verification

Verify each finding in a context that did not produce it: a fresh session or sub-agent that has not seen the original reasoning. When the host cannot provide one, write "Verification was not independent" in the Executive Verification Summary.

## Candidate Closure

Every candidate you open ends in exactly one of three states; "I moved on" is not one of them.

- **`confirmed`**: a working proof, or a complete source → control → sink → impact trace with evidence the path is reachable. File it as a finding when it **meets the Finding Bar**.
- **`ruled_out`**: you can name the specific control, at a file and line, that runs on every attacker-reachable path before the sink and does not fail open. Record it as `ruled_out` coverage with that control as the evidence. Or a Finding Bar element is **shown absent in source**: record it as `not_applicable` coverage with that source fact as the evidence; a constraint that **only narrows the principal** (privileged, authenticated, or internal-only) lowers severity instead.
- **`open_proof_gap`**: plausible, not confirmed, and no control you can name rules it out. Record it as `needs_follow_up` coverage with the gap as the evidence. Never relabel it `ruled_out` to tidy the list.

What does not rule out a candidate: generic trust in a library or framework ("the ORM handles it") without confirming that call in that context; a control on a different path (middleware on the common route but not the sibling route, batch job, or admin alias); a control that runs after the dangerous effect or can fail open; a safe sibling call site; missing information ("could not find a caller", "could not stand up the service"); difficulty; operator configurability; being internal-only (lower the severity, keep the finding).

Before filing a finding, run the counterevidence pass and record it in the finding:

- `counterevidence` (required): the strongest case against the finding, or what you checked and found absent ("no input validation, allow-list, or authorization check on this path").
- `confidence` (required): `high` only for an executed reproduction; `medium` for a complete source trace or strong static evidence you could not execute; `low` for a plausible path with a material unresolved gap. A static-only trace is reportable at `medium` or `low`: never inflate it to `high`, and never drop it because runtime proof was out of reach.
- `confidenceRationale` (required unless `high`): the specific gap, for example "static-only trace; service could not be run".
- `severityChangeConditions` (required): the one piece of evidence that would raise or lower the severity.

Instance discipline: one root cause is not one candidate. A dangerous helper with three independently reachable call sites is three findings, each citing its own entrypoint and the shared helper as the sink. When a finding cites several locations, label each as entrypoint, control, sink, or implementation.

Severity calibration: rate the weakness you proved, not the worst case you can imagine. Before `CRITICAL` or `HIGH`, all of these must hold: a realistic, in-scope attack path; an attacker position that can actually be obtained, reflected honestly in privileges required and attack complexity; demonstrated, not asserted, impact; a counterevidence pass that found no limiting constraint, or an explanation of why it does not hold; concrete reachability evidence. A finding limited by a confirmed constraint (internal-only, privileged role, narrow precondition) gets a lower severity and stays in the report. Downgrade; do not delete.

## Finding Bar

File a finding only when you can name all six of these. A confirmed candidate that cannot name one is not a finding yet.

1. **lower-trust principal**: who acts, and with what starting capability (an unauthenticated caller, a tenant user, a plugin, a file author, a CI contributor).
2. **accepted input or action**: the value, request, file, or state transition that principal controls.
3. **intended control**: the check that should reject, bind, isolate, limit, or revoke it, at a file and line, or the file and line where it is missing.
4. **crossed boundary**: the trust boundary the input gets past.
5. **affected principal or resource**: whose data, account, process, or shared resource changes.
6. **observed or owner-observable result**: the concrete effect, either from an executed reproduction or established by a complete source trace (under the confidence rules above, a traced result is at most `medium`).

Below the bar, close the candidate under Candidate Closure:

- An element **not yet established** makes it an `open_proof_gap`: record `needs_follow_up` coverage naming the missing element.
- An element **shown absent in source** rules it out: record `not_applicable` coverage naming the source fact.
- A constraint that **only narrows the principal** (privileged, authenticated, or internal-only) does not show an element absent. Keep the finding, record the constraint in `counterevidence`, and lower its severity under the calibration rules.

Only `/sr-verify` executes target code, and only under its Execution Sandbox rules; every other review relies on source evidence and obtains runtime proof through `/sr-verify`.

### Not a finding

Unless all six elements are named, none of these is a finding:

- a **checklist** or best-practice deviation;
- **defense-in-depth** advice with no reachable boundary violation;
- a **guessed** deployment, proxy, provider, or identity behaviour that source does not show;
- an intended same-principal action or **self-impact**;
- a runtime effect stated as **stronger than** the one observed.

Put a **hardening note** in the evidence of a `not_applicable` coverage entry for that surface and risk area instead of filing it.

## Coverage Ledger

Findings say what you found. Coverage says what you looked at and how each surface closed, so a clean area is distinguishable from an unvisited one. Record one entry per surface and risk area you assessed; when one pair has several outcomes, keep the strongest (`reported`, `needs_follow_up`, `ruled_out`, `no_issue_found`, `not_applicable`) and merge the other notes into its evidence:

| Outcome | Meaning | Evidence |
|---|---|---|
| `reported` | A finding was filed for this surface | Optional |
| `ruled_out` | A named control at file:line rules the risk out on every attacker path | Required: the control |
| `no_issue_found` | Tested thoroughly with nothing to show for it | Optional |
| `not_applicable` | The risk cannot apply to this surface | Required: why |
| `needs_follow_up` | Open proof gap | Required: the gap |

State completeness honestly: `coverage_complete: true` only when every planned surface closed; otherwise `false` with one `coverage_caveats` entry per reason (budget, missing runtime, unavailable credentials, unreviewed paths).

When you emit findings JSON for `security-review report` or `security-review tasks`, include the closure fields on every finding and the ledger at report level:

```json
{
  "findings": [
    {
      "id": "SEC-001", "title": "...", "severity": "HIGH", "category": "A05:Injection", "description": "...",
      "confidence": "medium", "confidenceRationale": "static-only trace; service could not be run",
      "counterevidence": "...", "severityChangeConditions": "..."
    }
  ],
  "coverage": [
    { "surface": "POST /login", "riskArea": "auth bypass", "outcome": "ruled_out", "evidence": "requireAuth at auth.ts:12 on every route" }
  ],
  "coverage_complete": false,
  "coverage_caveats": ["budget exhausted before the admin routes"]
}
```

In the Markdown report, render the ledger as the `## Coverage` section: a table of surface, risk area, outcome, and evidence, followed by a completeness line and the caveats.

## Verification & Classification Methodology

For each candidate finding, trace the complete execution path:

1. **Source Entrypoint**: How does untrusted input enter the application? (HTTP parameter, header, body, webhook, CLI argument, UI input form).
2. **Transformations & Sanitization**: Is the input sanitized, validated, cast, or filtered before reaching the sink or rendering in DOM?
3. **Sink & Control**: Where does the input land? (SQL query, shell execution, template engine, serializer, authorization gate, DOM injection).
4. **Context & Environment**: Are there framework-level or browser protections active? (e.g., CSRF tokens, ORM parameterized queries, CSP headers, HttpOnly cookies).

### Classification Taxonomy:
- **`CONFIRMED`**: The candidate is `confirmed` (by E2E reproduction, an executed test, or a complete source trace) and meets the Finding Bar; no defensive control prevents the attack. Keep the finding with `reported` coverage.
- **`FALSE_POSITIVE`**: The candidate is `ruled_out`: either a named control at a file and line runs on every attacker-reachable path before the sink (`ruled_out` coverage naming the control), or a Finding Bar element is shown absent in source or the item is listed under Not a finding (`not_applicable` coverage naming the source fact). Validation, type-safety, ORM abstraction, or an architecture boundary counts only when confirmed for that call on that path.
- **`FIX_SUGGESTION`**: A previously reported finding that re-verification shows has no remaining credible exploit path, but whose hardening change is independently verified to be worth making. Keep it in the report at its original severity with `reported` coverage so it is not silently dropped. A failed or unavailable E2E attempt alone is inconclusive: retain the original severity and do not suppress or downgrade the finding. A new candidate that is only defense-in-depth advice is still not a finding (see Not a finding).
- **`MITIGATED`**: A compensating control blocks the reported path, but the Finding Bar is still met on another path or under a stated precondition; keep the finding at lowered severity and record the control in `counterevidence`. Use it only when the compensating control has been verified. A control on every attacker-reachable path means there is no finding: classify it `FALSE_POSITIVE` and record `ruled_out` coverage.
- **`ACCEPTED_RISK`**: The behavior is intentional and governed by an approved architecture or business exception.

A finding that re-verification can neither confirm nor rule out stays an `open_proof_gap`: give it none of these five statuses, record `needs_follow_up` coverage with the gap, add a `coverage_caveats` entry naming it, and leave it out of the verification-status counts in the Document Header (it still counts in `total_findings` at its original severity as an inconclusive finding).

## Document Header

Emit this YAML frontmatter at the start of the verification report:

```yaml
---
document_type: security-review
review_type: verify
assessment_date: <YYYY-MM-DD>
codebase_analyzed: <project name, directory, or repository path>
total_findings: <integer; sum of severity counts>
overall_risk: <CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL|NONE>
critical_count: <integer>
high_count: <integer>
medium_count: <integer>
low_count: <integer>
informational_count: <integer>
findings_evaluated: <integer>
confirmed_count: <integer>
false_positive_count: <integer>
fix_suggestion_count: <integer>
mitigated_count: <integer>
accepted_risk_count: <integer>
overall_exploitability: <HIGH|MEDIUM|LOW|NONE>
e2e_verified: <true|false>
target_artifacts: [<source report or files evaluated>]
owasp_categories: [<A01>, <A05>, ...]
cwe_ids: [<CWE-89>, ...]
coverage_complete: <true|false>
coverage_caveats: [<reason the verification is incomplete>, ...]  # required when coverage_complete is false
field_summaries:
  document_type: "Always 'security-review'. Allows indexers to skip non-review documents."
  review_type: "Which command generated this document: audit, branch, staged, plan, tasks, followup, export, or verify."
  coverage_complete: "Whether every planned surface was reviewed and closed; false when any caveat applies."
  coverage_caveats: "Why the review is incomplete (required when coverage_complete is false)."
  assessment_date: "ISO 8601 date the review was performed (YYYY-MM-DD)."
  overall_risk: "Highest severity tier with active findings (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL), or NONE when no active findings exist."
  critical_count: "Number of Critical findings (CVSS 9.0-10.0)."
  high_count: "Number of High findings (CVSS 7.0-8.9)."
  medium_count: "Number of Medium findings (CVSS 4.0-6.9)."
  low_count: "Number of Low findings (CVSS 0.1-3.9)."
  informational_count: "Number of Informational findings."
---
```

Count every evaluated finding once in `findings_evaluated` and, when classified, once in its verification-status count. `total_findings` and the severity counts cover only active findings (`CONFIRMED`, `MITIGATED`, `FIX_SUGGESTION`, and unverified or inconclusive findings) at their current severity: the original severity for every status except `MITIGATED`, which counts at its lowered severity; exclude `FALSE_POSITIVE` and `ACCEPTED_RISK` so `overall_risk` stays the highest active tier and is `NONE` when no active findings remain. Set `e2e_verified` to true only when an authorized browser check actually ran, and record inconclusive attempts in the finding analysis rather than claiming verification.

## Output Structure

Produce a structured Markdown report with the following mandatory sections:

---

# Security Finding Verification & PoC Report

## 1. Executive Verification Summary

| Finding ID / Target | Vulnerability Type | Original Severity | Current Severity | Verification Status | Exploitability | Confidence | E2E Mode |
|---|---|---|---|---|---|---|---|
| `TASK-SEC-001` | SQL Injection | Critical | Critical | **CONFIRMED** | High | high | Unit Test |
| `TASK-SEC-002` | Reflected XSS | Medium | Medium | **CONFIRMED** | High | high | Playwright (Headless) |
| `TASK-SEC-003` | Open Redirect | Low | Low | **FIX_SUGGESTION** | Low | medium — static trace only | Playwright (Headless) |
| `TASK-SEC-004` | CSRF on Settings | High | High | **FALSE_POSITIVE** | None | high | Playwright (Headless) |

### Summary Analysis
[Concise summary of verified risks, Playwright E2E findings, fix suggestions, and false positives identified in this review session.]

---

## 2. Detailed Finding Verifications & PoC Reproductions

For each evaluated finding:

### Finding: [FINDING_ID] — [Finding Title]
- **Original Severity**: [Critical|High|Medium|Low]
- **Current Severity**: [Critical|High|Medium|Low]; equals Original Severity unless `MITIGATED` lowered it
- **Verification Status**: [CONFIRMED | FALSE_POSITIVE | FIX_SUGGESTION | MITIGATED | ACCEPTED_RISK]
- **Confidence**: high | medium | low — <rationale when not high>
- **Counterevidence**: <the strongest case against the finding, or what was checked and found absent>
- **Severity Change Conditions**: <the one piece of evidence that would raise or lower the severity>
- **Affected File(s)**: `path/to/file.ts:L12-L34`
- **E2E Validation**: [Playwright (Headless/Headed) | Unit Test | Curl | Static Dataflow]

#### A. Control & Data Flow Analysis
- **Source**: Where untrusted data originates.
- **Intermediate Flow**: Path taken through controllers, services, models, or frontend UI components.
- **Sink / Control**: The point of execution/rendering and why existing defenses succeeded or failed.

#### B. Proof of Concept (PoC) & Steps to Reproduce

**Execution Environment**: [the mechanism providing each of the six Execution Sandbox controls, and the confirmed test origin for E2E, or "not executed" with the missing control]

**Runnable Test File**: `<scratch>/[FINDING_ID].spec.ts` (or unit test path), proposed for `tests/security/[FINDING_ID].spec.ts`

```typescript
// Description: Automated Playwright / Unit test showing the vulnerability
// Target Base URL: the confirmed URL, set as Playwright `baseURL` (paths below stay relative)
// Execution (inside the sandbox, when locally installed): ./node_modules/.bin/playwright test <scratch>/[FINDING_ID].spec.ts [--headed]
import { test, expect } from '@playwright/test';

test('Verify [FINDING_ID] - [Vulnerability Name]', async ({ page }) => {
  // Safe, non-destructive reproduction payload
  await page.goto('/vulnerable-endpoint');
  // ... reproduction steps and assertions
});
```

**Steps to Reproduce (Manual / End-User)**:
1. Navigate to: `<confirmed base URL>/vulnerable-endpoint`
2. Enter payload: `[Non-destructive payload]` into `[Target field]`
3. Click: `[Submit / Action button]`
4. **Observed Vulnerable Behavior**: [Explain what happens when vulnerable, e.g. payload executes or unauthorized data returned]
5. **Expected Remediated Behavior**: [Explain what should happen once secured, e.g. sanitized input or 403 Forbidden]
6. **Validation Plan** (when not executed): [safe local or owner-observed steps that would settle the finding]

#### C. Remediation Guidance
[Specific code-level recommendation to remediate the finding or implement defense-in-depth fix suggestion.]

---

## 3. Coverage

| Surface | Risk Area | Outcome | Evidence |
|---|---|---|---|
| `GET /api/search` | SQL Injection | reported | Exploited via raw string query in userRepo.ts:45 |
| `POST /api/login` | Auth Bypass | ruled_out | Verified bcrypt compare & rate limiter at authController.ts:22 |

**Completeness:** complete | incomplete
- <caveat, one per reason, when incomplete>

---

## 4. False Positive Suppression Config (If applicable)

If any findings were classified as `FALSE_POSITIVE`, emit the configuration snippet to add to `.security-review/security-review.yml`:

```yaml
# Add to .security-review/security-review.yml under false-positives:
false-positives:
  - rule: "<rule-or-cwe-id>"
    file: "path/to/file.ts"
    reason: "<Why this finding was verified as a false positive>"
    date: "<YYYY-MM-DD>"
```

## 5. Automatic File Persistence

When completing the finding verification, you MUST write the full Markdown verification report directly to disk:
1. **Target File Path**: `docs/security-reviews/<YYYY-MM-DD>-verify.md` (or `docs/security-reviews/<YYYY-MM-DD>-<scope>-verify.md` if specific scope is provided).
2. **Directory Creation**: Automatically create the `docs/security-reviews/` directory if it does not already exist.
3. **Response Output**: In your conversational response to the user, render the executive verification summary table and include a clickable markdown file link to the saved report (e.g. `[Verification Report](file:///absolute/path/to/docs/security-reviews/YYYY-MM-DD-verify.md)`).

---

## 6. Durable Memory Preservation

If durable lessons or validated false-positive patterns exist, ask for authorization before persisting them to project memory.
