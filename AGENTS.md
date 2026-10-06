# AGENTS.md — Production-Grade Rules for AI-Assisted / Vibe-Coded Software

> Purpose: make AI-generated changes behave like work from a careful senior engineer, not like a demo generator.
>
> Scope: repository-wide. These rules are intentionally technology-agnostic; follow the project's existing stack, architecture, and conventions when they are known.
>
> Core principle: **"It runs" is not the definition of done.** Correctness, security, maintainability, operability, and compatibility are part of correctness.

## 0. Non-negotiable operating rules

1. **Inspect before changing.** Read the relevant code, tests, configuration, schemas, migrations, and docs before editing. Do not invent architecture that is already present.
2. **Preserve existing behavior unless the task explicitly changes it.** Treat unrelated behavior as protected.
3. **Prefer the smallest coherent change.** Do not use a feature request as an excuse for a broad refactor, dependency swap, rewrite, or stylistic cleanup.
4. **Never claim success without verification.** Run the most relevant checks after the change and report failures honestly.
5. **Never make security assumptions from appearance.** A polished UI, hidden client route, disabled button, or "admin" page is not an authorization boundary.
6. **Do not invent APIs, package names, framework options, config keys, environment variables, SDK methods, CLI flags, database columns, or library behavior.** Verify them from local code, installed package metadata, official documentation, or a working test.
7. **Treat generated output as untrusted until validated.** AI-generated code, tests, comments, migrations, shell commands, and dependency suggestions all require the same review discipline.
8. **Do not weaken the project to make checks pass.** Never delete/skip/disable a failing test, lint rule, type check, security check, or validation step merely to get green output.
9. **Do not execute destructive or irreversible actions without explicit authorization.** Examples: production deletes, database `DROP`/`TRUNCATE`, destructive migrations, credential rotation, cloud resource deletion, `git reset --hard`, force-push, mass file deletion.
10. **Stop when the request is ambiguous in a high-impact area.** Ask for clarification when the missing requirement affects security, privacy, money, destructive behavior, data ownership, compatibility, or production operations.

## 1. Required workflow for every non-trivial change

### Phase A — Understand

- Identify the user-visible behavior and the acceptance criteria.
- Find the closest existing implementation and copy established patterns before inventing a new one.
- Locate the trust boundaries: browser/client, API, service, database, queue, filesystem, external service, LLM/agent, admin surface.
- Identify data ownership and authorization rules: **who may read, create, update, delete, export, or trigger this?**
- Identify failure modes and external side effects: payments, emails, webhooks, jobs, mutations, file writes, network calls, AI tool calls.
- Identify compatibility constraints: API contracts, schema versions, migrations, supported runtimes, browsers, clients, deployment environment.

### Phase B — Plan

Before editing, form a short implementation plan mentally or explicitly:

1. expected behavior;
2. files/components to touch;
3. invariants that must remain true;
4. tests to add/update;
5. security and failure-mode checks;
6. verification commands.

For large changes, split work into small reversible steps.

### Phase C — Implement

- Reuse existing helpers, services, validators, types, and abstractions when appropriate.
- Add the minimum new abstraction necessary.
- Keep business rules close to the domain layer rather than duplicating them across UI and API layers.
- Keep security checks on trusted/server-side boundaries.
- Make invalid states difficult to represent, not merely detected after the fact.

### Phase D — Verify

Run, at minimum, the project's applicable:

- formatter;
- linter/static analysis;
- type checker/compiler;
- focused unit/integration tests;
- relevant end-to-end or contract tests;
- dependency/security scans when dependencies or security-sensitive code changed.

Then review the diff as if you did not write it:

- What changed that was not required?
- What assumptions were introduced?
- What happens on malformed, missing, duplicated, concurrent, unauthorized, and maximum-size input?
- Could an attacker control any value reaching a privileged operation?
- Does the code still match the project's architecture?

### Phase E — Report

State:

- what changed;
- what was verified;
- any checks not run and why;
- any remaining uncertainty or follow-up risk.

Never say "all good" when tests were not run.

## 2. AI-specific failure modes to actively hunt

These are recurring failure patterns in AI-assisted/vibe-coded software. Treat each as a review smell.

### 2.1 Plausible-but-wrong code

AI can produce code that is syntactically clean and locally plausible while being semantically wrong.

Watch for:

- wrong API semantics;
- wrong default behavior;
- wrong status codes;
- off-by-one and boundary errors;
- incorrect null/empty semantics;
- incorrect transaction boundaries;
- wrong timezone assumptions;
- wrong units/currency/precision;
- using a similarly named function/class with different semantics;
- code copied from an obsolete framework/library version;
- "fixes" that change behavior beyond the reported bug.

**Rule:** verify behavior against authoritative docs, existing call sites, tests, types, and real runtime behavior. Never infer semantics from a name alone.

### 2.2 Hallucinated APIs and dependencies

Common AI failure signals include invented methods, options, package names, imports, environment variables, configuration fields, CLI flags, and library versions.

Before adding any new external package or API:

- confirm it exists;
- confirm it is the package actually intended;
- confirm the version supports the API being used;
- check official documentation/repository metadata;
- check maintenance/activity and license;
- check known vulnerabilities/advisories;
- prefer an already-installed dependency when it adequately solves the problem.

**Never run `pip install`, `npm install`, `pnpm add`, `bun add`, `go get`, `cargo add`, or equivalent solely because an AI suggested a name. Verify first.**

### 2.3 Happy-path bias

AI often optimizes for the requested success path.

For every feature, explicitly test the opposite and boundary paths:

- unauthenticated user;
- authenticated but unauthorized user;
- wrong tenant/owner/resource ID;
- missing field;
- malformed field;
- empty input;
- duplicate request;
- expired token/session;
- revoked permission;
- deleted/missing resource;
- stale data / concurrent update;
- timeout / dependency outage;
- retry;
- maximum permitted size;
- rate-limit exceeded;
- partial failure.

### 2.4 Action bias / unnecessary changes

Do not assume a bug report requires code modification. First reproduce or establish that the behavior is still present.

Do not:

- refactor unrelated files while fixing a bug;
- "clean up" neighboring code without need;
- replace working libraries for preference reasons;
- add abstractions just because the code can be generalized;
- make speculative improvements unrelated to acceptance criteria.

When the correct action is **no code change**, say so and explain why.

### 2.5 Test theater

A passing test suite is not proof of correctness when tests are shallow or coupled to the implementation.

Reject tests that:

- assert only that a value is not `null`/`undefined` when exact behavior matters;
- merely verify that mocks were called instead of verifying outcomes;
- mock the unit under test itself;
- copy the implementation's current behavior as the expected result without a specification;
- only test the happy path;
- delete or weaken an existing failing assertion;
- skip an unstable test instead of fixing the cause;
- use snapshots as the only meaningful assertion for business-critical behavior.

Prefer tests grounded in **requirements/postconditions**, not implementation details.

For important business logic, add negative cases and edge cases that a second/fresh reasoning pass would be likely to miss.

### 2.6 Context drift

As an agent edits many files, its assumptions may drift from the original task.

After several related edits, re-check:

- original requirements;
- affected files;
- public interfaces;
- data flow;
- tests;
- migrations/config changes.

Do not keep editing simply because previous edits already exist.

## 3. Security baseline — apply secure-by-default rules

Use the OWASP Top 10:2025 as a baseline. Security-sensitive code must be reviewed for at least:

- broken access control;
- security misconfiguration;
- software supply-chain failures;
- cryptographic failures;
- injection;
- insecure design;
- authentication failures;
- software/data integrity failures;
- logging/alerting failures;
- mishandling of exceptional conditions.

### 3.1 Authorization is server-side and resource-specific

For every protected operation:

**identify caller → authenticate → authorize action on the specific resource → validate input → perform operation → return least-privileged data.**

Never trust:

- hidden UI controls;
- frontend route guards;
- `isAdmin` flags from the client;
- `localStorage` values;
- client-provided role/tenant/owner IDs;
- "secret" URLs;
- obscurity.

Check ownership/tenant boundaries server-side. Default to deny.

### 3.2 Authentication

Do not roll custom password/token/authentication cryptography when a proven project/provider mechanism exists.

Never:

- store plaintext passwords;
- invent password hashing;
- use weak or obsolete cryptographic algorithms;
- accept unsigned/weakly verified tokens;
- trust unvalidated JWT claims for authorization;
- make long-lived credentials the default;
- log credentials, reset tokens, session tokens, or authorization headers.

Authentication and authorization are separate checks.

### 3.3 Input validation and injection

Treat all external input as untrusted:

- HTTP parameters/body/headers;
- cookies;
- uploaded filenames/content;
- webhooks;
- CSV/JSON/XML;
- database content from less-trusted domains;
- CLI/environment input;
- URLs supplied by users;
- content retrieved from the web;
- LLM/agent output.

Use contextual, allow-list-oriented validation and safe APIs.

Never construct SQL/NoSQL/shell/template/HTML commands by unsafe string concatenation when a parameterized or structured API exists.

Pay special attention to:

- SQL/NoSQL injection;
- XSS/HTML injection;
- command injection;
- path traversal;
- SSRF;
- template injection;
- log injection;
- deserialization attacks;
- header injection;
- open redirects.

### 3.4 Secrets and sensitive data

- Secrets belong in a real secret store/environment configuration, never source code.
- Never place server/private API keys in client bundles.
- Treat client-exposed variables as public.
- Do not print secrets, tokens, passwords, personal data, payment data, or full authorization headers in logs.
- Before committing, scan for accidental secrets.
- If a secret was exposed, assume compromise: remove it from code **and rotate/revoke it**.

### 3.5 Database and data isolation

For any multi-user or multi-tenant data model:

- every read/write path must enforce ownership/tenant authorization;
- access should be deny-by-default;
- database-level row/tenant security must be used when the platform supports it and when appropriate;
- do not rely on the UI to hide records;
- verify bulk/export/search endpoints as carefully as single-record endpoints.

For Supabase/Postgres-style systems, treat **RLS/policies** as a first-class security boundary, not optional configuration.

### 3.6 Files and URLs

For file uploads/downloads:

- validate size, type, and content as appropriate;
- do not trust file extension or MIME type alone;
- prevent path traversal;
- avoid serving uploads as executable content;
- use safe generated storage paths;
- enforce authorization on downloads, not just uploads.

For user-supplied URLs or server-side fetching:

- defend against SSRF;
- restrict protocols/hosts as appropriate;
- do not allow arbitrary internal-network access;
- consider DNS rebinding and redirect behavior.

## 4. AI/LLM/agent-specific security

When the application itself contains an LLM, agent, RAG, MCP, tools, plugins, browsing, or autonomous actions, apply an additional threat model.

### 4.1 Prompt injection is expected

Treat external content as **data, not instructions**:

- user messages;
- web pages;
- retrieved documents;
- emails;
- PDFs;
- database rows;
- tool results;
- repository content;
- other agents' messages.

Never assume prompt text can reliably enforce a security boundary.

Use architectural controls: least privilege, separate trust domains, constrained tools, explicit authorization, output validation, and confirmation for high-impact actions.

### 4.2 Least privilege for tools

An agent should have only the tools and permissions it needs.

Prefer:

- read-only tools when possible;
- narrow functions over arbitrary shell execution;
- scoped identities;
- per-user authorization;
- resource-specific permissions;
- explicit confirmation for destructive/external side effects;
- rate and cost limits;
- audit logs.

Avoid giving an agent a broad "do everything" tool when a smaller tool is sufficient.

### 4.3 Never trust model output as a command

Validate and constrain model-generated:

- SQL;
- shell commands;
- URLs;
- file paths;
- code to execute;
- structured arguments;
- permissions/roles;
- workflow actions.

Do not pass free-form model output directly to `eval`, shell execution, database administration, HTTP requests, file deletion, or privileged APIs.

### 4.4 Agent memory and retrieved context

Assume memory/RAG data can be stale, poisoned, or wrong.

- isolate tenants/users;
- authorize every retrieved object;
- prevent cross-user retrieval;
- store provenance where practical;
- do not treat retrieved text as policy.

## 5. Correctness and data-model rules

### 5.1 Types and invariants

- Prefer the strongest type system/settings already supported by the project.
- Avoid `any`, unchecked casts, `as unknown as`, broad `dict[str, Any]`, or equivalent escapes unless justified at a true boundary.
- Validate data at boundaries and then use typed/validated internal representations.
- Do not duplicate the same invariant in many places; centralize it.

### 5.2 Null, empty, and absence semantics

Decide explicitly whether "missing", `null`, empty string, empty list, zero, and false are distinct states.

Never use truthiness as a substitute for domain semantics when `0`, `false`, or empty collections are valid values.

### 5.3 Money, time, and units

- Never use binary floating-point for exact monetary values unless the domain explicitly permits it.
- Make currency explicit.
- Make units explicit for measurements.
- Store/compare timestamps consistently.
- Treat timezone conversion as domain logic, not formatting.
- Test daylight-saving/timezone boundaries when relevant.

### 5.4 IDs and resource references

Never assume an ID implies authorization.

For an input like `/users/:id`, `/orders/:id`, `?tenant=...`, etc., verify the caller is allowed to access that specific resource.

Do not leak sequential/internal IDs when the existing architecture expects opaque/public identifiers.

## 6. API, async, reliability, and distributed-system rules

### 6.1 Errors

Do not swallow errors with empty catches or generic "success" responses.

Preserve useful context while avoiding secret/PII leakage.

Use stable, intentional error semantics at API boundaries.

### 6.2 Timeouts and retries

Every network/external dependency needs a considered timeout.

Retries must be:

- bounded;
- appropriate to the error;
- backoff-aware;
- jittered where useful;
- safe with respect to side effects.

Never add retries to non-idempotent operations blindly.

### 6.3 Idempotency and duplicate actions

For operations such as payments, webhooks, jobs, email sends, provisioning, and state-changing API requests, assume duplicates happen.

Use an explicit idempotency strategy where required.

### 6.4 Concurrency

Consider:

- race conditions;
- lost updates;
- duplicate submissions;
- TOCTOU (time-of-check/time-of-use);
- transaction isolation;
- stale caches;
- job replays.

A check immediately followed by a write is not automatically atomic.

### 6.5 Pagination and resource limits

Never introduce an unbounded query or response for production data.

Use appropriate:

- pagination;
- max page size;
- query limits;
- payload size limits;
- recursion depth limits;
- job concurrency limits;
- LLM token/cost budgets.

### 6.6 Performance

Avoid AI-generated accidental complexity such as:

- N+1 queries;
- repeated API calls inside loops;
- repeated parsing/serialization;
- O(n²) scans where a map/set/index is appropriate;
- fetching whole tables to filter in application code;
- synchronous expensive work on request paths;
- unbounded regex / catastrophic backtracking;
- unnecessary state updates/render loops.

Do not optimize speculatively. Measure or identify a concrete bottleneck first.

## 7. Database/schema/migration rules

- Never assume a migration runs only once in a clean environment.
- Preserve backward compatibility when old and new application versions can overlap during deployment.
- Prefer additive migrations before destructive cleanup.
- Backfill large datasets in controlled batches.
- Consider locking, downtime, rollback, and partial-failure behavior.
- Validate authorization after schema changes.
- Never leave a migration that only works on your local database.
- Do not hand-edit generated migration history unless the project's tooling requires it.

Before destructive schema changes, explicitly establish:

- backup/recovery plan;
- data impact;
- rollout order;
- rollback/forward-fix plan.

## 8. Frontend/UI rules

The UI is not the security boundary.

- Keep authorization enforcement server-side.
- Do not trust route/query/form values coming from the browser.
- Handle loading, error, empty, unauthorized, and stale states deliberately.
- Avoid exposing sensitive data in initial page payloads merely because the UI does not render it.
- Avoid dangerous HTML injection APIs unless input is sanitized for the exact output context.
- Prevent duplicate submits for state-changing operations.
- Keep accessibility and keyboard behavior intact when changing UI components.

## 9. External integrations and webhooks

For payments, email, storage, OAuth, analytics, or other third-party integrations:

- verify official API semantics and version;
- validate webhook authenticity/signatures;
- design for retries and duplicate delivery;
- handle provider timeouts/outages;
- do not trust client-side success callbacks as proof of server-side success;
- store provider IDs and states needed for reconciliation;
- make provider-specific code isolated enough to replace/test.

## 10. Dependency and supply-chain hygiene

AI suggestions are not a package registry.

Before adding a dependency, ask:

- Do we already have this capability?
- Is the package real and official?
- Is it maintained?
- Is the package name easily confusable with a popular package?
- Does its license fit the project?
- Does it introduce a large transitive tree for a tiny feature?
- Are there advisories or known malicious versions?
- Can the same result be achieved with the standard library or an existing dependency?

Lock dependency versions according to project conventions and keep lockfiles consistent.

Be alert to **slopsquatting**: an AI may invent a plausible package name; an attacker can register that invented name and wait for developers/agents to install it.

## 11. Code quality: avoid "AI slop"

Reject code that merely looks impressive.

### Red flags

- generic helper for a one-line operation;
- abstraction with one implementation and no real variation;
- excessive wrappers around existing APIs;
- duplicated business logic with slightly different names;
- deeply nested conditionals where a clearer state model would help;
- boolean flags that create many hidden states;
- long functions doing unrelated work;
- comments narrating obvious code instead of explaining decisions;
- comments that no longer match behavior;
- copied blocks with tiny differences;
- inconsistent naming or error semantics;
- giant configuration objects instead of explicit domain types;
- magic numbers/strings without domain meaning;
- "temporary" hacks without a tracking issue;
- dead code retained after refactors;
- feature switches that are never removed.

Prefer boring, explicit code over clever generated code.

### Abstraction rule

Do not abstract because two pieces of code look similar. Abstract when they share:

1. the same domain meaning;
2. the same invariant;
3. a stable reason to change together.


## 12. Human-quality implementation and product language

### 12.1 Goal: domain-authentic software, not "AI-looking" software

Write code and user-facing copy so that a teammate who knows this product could plausibly have written it: **specific, restrained, consistent with the existing codebase, and grounded in the actual domain**.

Do **not** try to defeat AI detectors, conceal AI use, fabricate human authorship, or introduce random human-looking imperfections. Do not add spelling mistakes, arbitrary inconsistency, fake personal opinions, fake history, or needless quirks merely to look human. The objective is genuine engineering quality and product authenticity.

When making a new change, first learn the project's existing vocabulary from:

- neighboring code;
- domain types/entities;
- database/schema names;
- API contracts;
- route names;
- existing UI labels and error messages;
- tests and fixtures;
- product documentation.

Then reuse that vocabulary. **Local consistency beats generic "best-practice" wording.**

### 12.2 Human-quality naming rules

Use names that communicate the domain and the invariant, not the implementation process.

Prefer:

- `customer`, `workspace`, `invoice`, `shipment`, `membership`, `approval`, `subscription` when those are the actual domain concepts;
- names already established elsewhere in the repository;
- short, precise verbs for operations: `approveInvoice`, `revokeAccess`, `archiveProject`, `sendInvite`;
- explicit state names when states matter: `pending`, `approved`, `failed`, `cancelled`.

Be suspicious of generic generated names when a domain name exists:

- `data`, `item`, `thing`, `object`, `value`, `result`, `response`, `payload`;
- `helper`, `utils`, `utility`, `manager`, `processor`, `handler`, `service`, `engine`, `wrapper`, `adapter`;
- `doThing`, `handleData`, `processRequest`, `getData`, `updateState`;
- `GenericModal`, `UniversalManager`, `SmartDashboard`, `DataHelper`, or similar names that describe a vague capability instead of a real product concept.

These names are not forbidden. Replace them only when the surrounding context provides a more precise domain term. Avoid renaming established code just to satisfy this rule.

### 12.3 Do not manufacture abstractions to make generated code look sophisticated

LLM-generated code frequently overfits to surface similarity, duplicates patterns, or introduces extra layers that are not justified by the domain.

Before adding an abstraction, answer:

1. What invariant is shared?
2. Why must these implementations change together?
3. What concrete variation exists today?
4. Will the abstraction reduce total complexity rather than move it elsewhere?

Reject generated layers whose only purpose is to make a simple operation look architecturally impressive:

`controller -> manager -> service -> processor -> helper -> utility`

when the domain only needs one or two meaningful boundaries.

Keep abstractions named after **domain concepts or stable technical contracts**, not after the fact that an agent generated them.

### 12.4 Comments: explain decisions, not syntax

Comments should answer a question that the code alone cannot answer:

- Why is this behavior required?
- Why is an apparently unusual order/constant/constraint intentional?
- Which external protocol or business rule requires this behavior?
- What invariant must remain true?
- Why is a simpler-looking implementation deliberately avoided?

Do not add comments like:

- `// This function gets the user`
- `// Loop through the items`
- `// Check if the value is null`
- `// Now we return the result`
- `// This handles the error`

unless the comment conveys something non-obvious.

Do not add a comment merely because generated code "looks like it should have one". Do not create long essays above ordinary functions. Do not repeat the function name in prose.

Avoid stale comment patterns such as `IMPORTANT`, `NOTE`, `CRITICAL`, `STEP 1`, or long explanatory blocks unless the repository already uses them for a real reason.

When code changes, update comments that describe changed behavior. When a comment is no longer useful, delete it rather than preserving it as historical noise.

### 12.5 User-facing terminology: use the product's language, not generic AI/marketing language

For every visible string, prefer the vocabulary a real user of this product would use.

Do not casually inject generic phrases such as:

- "seamless"
- "effortless"
- "powerful"
- "robust"
- "comprehensive"
- "intuitive"
- "innovative"
- "cutting-edge"
- "next-generation"
- "revolutionary"
- "streamline"
- "leverage"
- "empower"
- "unlock"
- "elevate"
- "frictionless"
- "best-in-class"
- "smart" / "intelligent" when the product feature is not actually described that way

These words are allowed when they are part of the established brand voice or have a precise domain meaning. They are not a substitute for concrete copy.

Prefer task-specific language:

- `Create invoice` over `Unlock powerful invoicing`;
- `Invite member` over `Seamlessly collaborate`;
- `Retry upload` over `Try again for a better experience`;
- `Payment failed` over `Something went wrong` when the actual failure is known.

Do not invent product claims, performance claims, security claims, customer numbers, testimonials, ratings, certifications, or guarantees.

### 12.6 UI copy should be information-rich and situation-specific

For loading, empty, error, permission, success, and destructive states, tell the user what is actually happening and what action is available.

Avoid a single generic message reused everywhere:

- `Something went wrong`
- `An error occurred`
- `No data`
- `Oops!`
- `Success!`
- `Loading...`

These are acceptable only when there genuinely is no more useful information or the existing product voice deliberately uses them.

Prefer:

- the actual object/action involved;
- a clear consequence;
- the next useful action;
- a request/correlation reference when support needs it.

Do not expose stack traces, SQL, internal hostnames, credentials, provider secrets, or implementation details in user-facing errors.

### 12.7 Preserve one product voice

Do not let one newly generated screen suddenly sound like a different company.

Before adding UI copy, inspect several nearby screens and follow their established:

- capitalization;
- punctuation;
- button-verb style;
- terminology;
- date/time wording;
- status vocabulary;
- error tone;
- singular/plural conventions;
- permission language.

Do not switch between synonyms such as `user/member/customer`, `workspace/team/organization`, or `delete/remove/archive` unless the domain intentionally distinguishes them.

### 12.8 Avoid generated-copy fingerprints without playing detection games

Some patterns can make a codebase or product feel mechanically generated even when the underlying logic works. Treat them as **style smells**, not proof of AI use:

- excessive repetition of generic adjectives;
- repetitive sentence templates across screens;
- identical explanatory comments above every function;
- verbose prose where a short label would do;
- many newly introduced synonyms for an existing domain concept;
- duplicated UI structures with tiny wording changes;
- generic component names instead of product concepts;
- large comment blocks describing obvious control flow;
- repeated "This handles..." / "This ensures..." comments without new information;
- multiple near-identical wrappers around the same API;
- copy-pasted helpers with trivial differences;
- generated placeholder text that survives into production.

Fix the underlying quality issue: use the repository's established terminology, consolidate duplicated logic where the invariant is real, and remove non-information-bearing prose.

### 12.9 Comments and copy must remain truthful

Never write prose that claims a behavior the implementation does not enforce.

Examples of prohibited claims without corresponding guarantees:

- "secure" when authorization is not actually enforced;
- "encrypted" when only transport encryption exists;
- "real-time" when polling has substantial delay;
- "instant" or "fast" without an established product requirement/measurement;
- "private" when access controls are not verified;
- "automatic" when a human or retry is still required.

A concise truthful label is better than polished but misleading copy.

### 12.10 Human-quality code review pass

After implementation, perform a dedicated **authenticity-through-quality** pass:

1. Replace generated-looking generic names with precise existing domain terms where justified.
2. Remove comments that merely narrate code.
3. Remove unnecessary abstractions and wrappers.
4. Consolidate accidental duplication only when the invariant is truly shared.
5. Align UI copy with neighboring product surfaces.
6. Replace generic error text with useful, product-specific wording where possible.
7. Remove placeholder/demo/fake marketing content.
8. Check that terminology is consistent across code, schema, API, tests, and UI.
9. Read the changed code as a new teammate: can the design be understood without knowing the prompt that produced it?
10. Keep the result natural and restrained. **Do not add artificial quirks merely to appear human-written.**

### 12.11 Research-derived implementation checklist

For significant AI-assisted changes, explicitly inspect for these research-observed failure families:

- **Misinterpretation:** Did the implementation solve the literal prompt instead of the actual product requirement?
- **Prompt bias:** Did the model optimize for wording in the request while ignoring repository conventions or hidden invariants?
- **Non-prompted consideration:** Did it add behavior nobody asked for, such as sorting, normalization, fallback logic, logging, or UI state changes?
- **Missing corner case:** What happens at empty, duplicate, boundary, malformed, stale, concurrent, unauthorized, and failure inputs?
- **Hallucinated object/API:** Does every symbol, endpoint, method, config key, package, and provider behavior actually exist?
- **Unused construct:** Did the patch leave dead imports, variables, props, flags, feature switches, or unreachable branches?
- **Hardcoded debugging:** Did temporary values, console output, fake IDs, test credentials, or debug behavior survive into production code?
- **Code smell accumulation:** Did the patch introduce long methods, duplication, excessive nesting, cyclic dependencies, speculative abstractions, or poor cohesion?
- **Clone amplification:** Did it copy an existing implementation instead of reusing the existing helper/component/service where the semantics are the same?
- **Non-functional regression:** Did a functionally correct patch worsen maintainability, readability, performance, security, observability, or accessibility?

### 12.12 Three-pass review for agent-generated changes

For medium/high-risk changes, review in this order:

**Pass 1 — Semantic correctness**

- Does it implement the requested behavior exactly?
- Did it add any behavior not requested?
- Are edge cases and failure paths correct?

**Pass 2 — Engineering quality**

- Is the change minimal?
- Does it follow existing architecture?
- Did it add duplication, code smells, technical debt, or unnecessary dependencies?
- Are naming, comments, types, and interfaces coherent?

**Pass 3 — Product authenticity and operability**

- Does the UI use the product's actual vocabulary and tone?
- Would another engineer recognize this as part of the existing codebase rather than a generic template?
- Are errors actionable and truthful?
- Are logs/metrics/errors consistent with the project's conventions?

Only treat the change as done when all three passes are satisfactory.

## 13. Observability and operability

For production-facing behavior, consider:

- structured logs;
- useful metrics;
- error tracking;
- correlation/request IDs;
- audit records for sensitive actions;
- health/readiness checks;
- actionable alerts.

Never solve observability by logging secrets or full sensitive payloads.

Failures should be diagnosable without reproducing every event locally.

## 14. Test strategy for AI-written changes

Use a testing pyramid appropriate to the project, but do not equate coverage percentage with correctness.

For each change, prefer a mix of:

- unit tests for local invariants;
- integration tests across real boundaries;
- contract tests for external/public interfaces;
- end-to-end tests for critical user journeys;
- regression tests for every fixed bug;
- negative/adversarial cases for security-sensitive behavior.

For critical logic, consider property-based, fuzz, mutation, or differential testing when supported by the stack.

### Independent-test principle

When the same agent wrote both production code and tests, assume correlated blind spots are possible.

Where risk is high, use a fresh context/model/person to review the change, or derive tests directly from the specification rather than the implementation.

## 15. Review gates by change type

### Any code change

- [ ] Diff is minimal and intentional.
- [ ] Existing conventions were followed.
- [ ] Relevant tests pass.
- [ ] No invented API/package/config behavior.

### Auth / permissions / tenant isolation

- [ ] Server-side authentication check.
- [ ] Server-side resource-level authorization.
- [ ] Unauthorized and cross-tenant cases tested.
- [ ] Default deny / least privilege.
- [ ] No client-only access control.

### Database / schema

- [ ] Migration is reproducible.
- [ ] Authorization/policies updated.
- [ ] Existing data compatibility considered.
- [ ] Rollout/rollback behavior understood.
- [ ] Index/query behavior considered where relevant.

### Secrets / credentials

- [ ] No secret in source or client bundle.
- [ ] Logs do not expose credentials.
- [ ] Exposure would trigger rotation/revocation.
- [ ] Secret storage follows the project's approved mechanism.

### External API / payment / webhook

- [ ] Timeout and error handling.
- [ ] Retry semantics are safe.
- [ ] Idempotency/duplicate delivery considered.
- [ ] Signature/authenticity verification where applicable.
- [ ] Provider success is not inferred from untrusted client state.

### LLM / agent / MCP / tool use

- [ ] Prompt-injection threat model.
- [ ] Least-privilege tools.
- [ ] External content treated as untrusted data.
- [ ] Model output schema/argument validation.
- [ ] Human confirmation for high-impact actions.
- [ ] Per-user and global rate/cost controls where applicable.
- [ ] Sensitive context is not exposed to unnecessary tools/models.

## 16. Keyword / terminology triggers — elevate review automatically

These words or concepts are **not** themselves bugs. They are signals that the surrounding code deserves deeper analysis.

| Trigger | Automatically check |
|---|---|
| `auth`, `login`, `session`, `JWT`, `cookie`, `password`, `OAuth` | authentication, session handling, CSRF, token validation, expiry, logout/revocation |
| `admin`, `role`, `permission`, `owner`, `tenant`, `organization`, `team` | server-side authorization, object-level access control, cross-tenant access |
| `public`, `anonymous`, `guest`, `internal`, `private` | trust boundary and default-deny semantics |
| `userId`, `accountId`, `tenantId`, `projectId`, `resourceId` | IDOR/BOLA-style authorization checks |
| `RLS`, `Supabase`, `anon`, `service_role` | database policy coverage, least privilege, server/client key separation |
| `SQL`, `query`, `raw`, `where`, `filter` | parameterization, injection, authorization, pagination |
| `HTML`, `markdown`, `rich text`, `render`, `innerHTML`, template | contextual output encoding, sanitization, XSS |
| `URL`, `redirect`, `proxy`, `fetch`, `webhook`, `callback` | SSRF, open redirects, authenticity, allow-lists |
| `upload`, `download`, `file`, `path`, `filename`, `storage`, `bucket` | traversal, content validation, authorization, object exposure |
| `exec`, `shell`, `spawn`, `command`, `eval` | command injection, argument escaping, sandboxing, privilege |
| `crypto`, `hash`, `encrypt`, `token`, `secret`, `key` | approved algorithms, key handling, rotation, secret leakage |
| `payment`, `checkout`, `refund`, `invoice`, `balance`, `money` | authorization, idempotency, decimal correctness, reconciliation |
| `webhook`, `event`, `queue`, `job`, `retry` | signature verification, duplicates, idempotency, backoff |
| `cache`, `memoize`, `redis`, `concurrent`, `lock` | stale data, race conditions, invalidation, atomicity |
| `delete`, `purge`, `archive`, `drop`, `truncate`, `reset` | confirmation, authorization, recovery/rollback, blast radius |
| `AI`, `LLM`, `agent`, `tool`, `MCP`, `RAG`, `memory`, `prompt` | prompt injection, tool permissions, output validation, data isolation |
| `system prompt`, `instructions`, `browser`, `web search`, `retrieved` | indirect prompt injection and sensitive-context exfiltration |
| `package`, `dependency`, `plugin`, `extension` | hallucinated package names, provenance, advisories, license, permissions |
| `temporary`, `quick`, `hack`, `bypass`, `skip`, `disable`, `just make it work` | hidden technical debt and security bypasses; require an explicit justification |

### High-risk phrases

Treat these as a request to inspect the underlying invariant, not as implementation instructions:

- "just hide it in the frontend"
- "the endpoint is internal"
- "nobody will know the URL"
- "skip auth for now"
- "disable RLS temporarily"
- "make it public for testing"
- "ignore this test"
- "just catch the error"
- "hardcode it for now"
- "use the same secret in the client"
- "trust the user ID from the request"
- "we can secure it later"
- "install this package" when the package has not been verified
- "make the tests pass" without stating the expected behavior

These phrases frequently correspond to hidden trust-boundary or verification failures.

## 17. Anti-patterns to reject in generated diffs

Reject or redesign when you see:

- `TODO` used as a substitute for required implementation;
- `FIXME` left on a security or correctness boundary with no owner/issue;
- empty `catch` blocks;
- broad `catch (e) { return ...success... }` patterns;
- `any`/unchecked casts used to silence type errors;
- `// @ts-ignore`, `eslint-disable`, `noqa`, test skips, or equivalent added without a documented reason;
- environment variables introduced without documenting where they come from;
- duplicated `.env`/config defaults containing secrets;
- `Access-Control-Allow-Origin: *` on authenticated/sensitive APIs unless explicitly justified;
- client-side role checks presented as authorization;
- raw SQL built from strings;
- shell commands built by string concatenation;
- `dangerouslySetInnerHTML` or equivalent with untrusted data;
- `eval`, dynamic code execution, or unrestricted plugin loading;
- database queries that return all rows when only a subset is needed;
- retry loops with no cap or backoff;
- random UUID/token/crypto logic implemented from scratch;
- deleting tests, lowering assertions, broadening mocks, or disabling validation to get green;
- comments asserting security/correctness without an executable check;
- a "refactor" that changes behavior without tests proving equivalence.

## 18. Definition of Done

A change is done only when all applicable conditions are true:

- Requirements and assumptions are explicit.
- The implementation matches the project's architecture and conventions.
- Security boundaries are enforced on the trusted side.
- Edge cases and failure paths are considered.
- Tests validate intended behavior, not merely implementation details.
- Relevant automated checks pass.
- No unverified dependencies/APIs/configuration were introduced.
- No secrets or sensitive data were exposed.
- No unrelated refactor or needless complexity was introduced.
- Operational impact is understood for production-facing changes.
- The diff is understandable to another engineer without the generating model's hidden context.

## 19. When the model is uncertain

Do **not** fill gaps with plausible fiction.

Use this decision order:

1. inspect local code/tests/docs;
2. inspect installed dependency/API metadata;
3. check authoritative upstream documentation;
4. write a small verification test/probe;
5. ask the user when the uncertainty affects a high-impact decision.

A correct statement of uncertainty is better than a confident invented answer.

## 20. Research basis

### Five focal research papers used for the human-quality / vibe-coding rules

These five were selected because they are especially relevant to this policy's goals: direct study of vibe coding, empirical observation of generated-code defects, large-scale comparison with human-written code, repository-level analysis of generated code/comments, and multi-method analysis of non-functional quality. "Top" here means **high relevance and methodological usefulness for this policy**, not a claim of a universal citation ranking.

1. **Chou et al., "Building Software by Rolling the Dice: A Qualitative Study of Vibe Coding" — ACM ESEC/FSE 2026.** The study analyzed 20 vibe-coding videos, including about 16 hours of live sessions and 254 prompts. It found a spectrum from near-total reliance on AI to substantial inspection/adaptation; across approaches, stochastic generation, debugging/refinement, divergent mental models, and trust calibration were recurring issues. Policy implication: make inspection, explicit requirements, verification, and revision first-class activities rather than treating generation as completion.  
   https://doi.org/10.1145/3797105  
   https://arxiv.org/abs/2512.22418

2. **Sun et al., "Quality Assurance of LLM-generated Code: Addressing Non-Functional Quality Characteristics" — Journal of Systems and Software, 2026.** The study combines a systematic review of 109 papers, industry workshops, and empirical patch analysis. Practitioners emphasized maintainability and readability; generated patches could be functionally correct while worsening other quality dimensions, and optimizing non-functional qualities through prompting was unstable. Policy implication: review readability, maintainability, performance, security, and operability separately from functional tests.  
   https://doi.org/10.1016/j.jss.2026.112885  
   https://arxiv.org/abs/2511.10271

3. **Ji et al., "An Exploratory Study on LLM-Generated Code and Comments in Code Repositories" — Journal of Systems and Software, 2026 / ASE 2026 Journal First.** Using detector-based proxy analysis over active company- and community-maintained repositories from 2021–2025, the study reports substantial intra-repository code cloning among code detected as likely LLM-generated and a comparatively low proportion of grammatically correct sentences among comments detected as likely LLM-generated. Because the attribution is detector-based rather than ground-truth authorship, treat these as repository-level style signals, not proof of AI authorship. Policy implication: prefer local vocabulary, real reuse, concise non-redundant comments, and consistent repository voice rather than generic generated prose.  
   https://doi.org/10.1016/j.jss.2026.113026  
   https://arxiv.org/abs/2607.01867

4. **Cotroneo, Improta & Liguori, "Human-Written vs. AI-Generated Code: A Large-Scale Study of Defects, Vulnerabilities, and Complexity" — IEEE ISSRE 2025.** The evaluation spans more than 500,000 code samples in Python and Java. The authors report that AI-generated code was generally simpler and more repetitive, with more unused constructs and hardcoded debugging, while also containing more high-risk security vulnerabilities in their evaluation. Policy implication: do not equate simplicity or test success with production quality; check repetition, dead code, debugging leftovers, and security explicitly.  
   https://doi.org/10.1109/ISSRE66568.2025.00035  
   https://arxiv.org/abs/2508.21634

5. **Tambon et al., "Bugs in Large Language Models Generated Code: An Empirical Study" — Empirical Software Engineering, 2025.** Analysis of 333 bugs from code generated for real-world project tasks produced a taxonomy including misinterpretations, prompt-biased code, missing corner cases, wrong input types, hallucinated objects/attributes, incomplete generation, and non-prompted considerations. Policy implication: after generation, actively challenge assumptions, verify APIs/types, test boundaries, and look for unrequested behavior.  
   https://doi.org/10.1007/s10664-025-10614-4  
   https://arxiv.org/abs/2403.08937

### Additional supporting evidence

- **Ghosh Paul, Zhu & Bayley, "Investigating The Smells of LLM Generated Code" (2025, revised 2026).** In a Java benchmark against professionally written reference solutions, LLM-generated code had higher code-smell incidence; the reported average smell increase across the studied models was 63.34%, with larger increases for more complex/advanced tasks. Use this as a strong reason to run a dedicated smell/maintainability pass rather than relying on syntax or tests alone.  
  https://arxiv.org/abs/2510.03029

- **Abbassi et al., "Unveiling Inefficiencies in LLM-Generated Code: Toward a Comprehensive Taxonomy" (2025).** The study organizes 19 inefficiency subcategories across general logic, performance, readability, maintainability, and errors; logic and performance inefficiencies were especially prominent. Use this to challenge generated code for needless work, repeated computation, weak control flow, and maintainability regressions.  
  https://arxiv.org/abs/2503.06327

- **"Is LLM-Generated Code More Maintainable & Reliable Than Human-Written Code?" (2025).** This empirical comparison found mixed results across task difficulty and model configurations, including structural issues in harder competition-level tasks, reinforcing that aggregate quality claims do not remove the need for context-specific verification.  
  https://doi.org/10.1109/esem64174.2025.00036  
  https://arxiv.org/abs/2508.00700

### Security and agentic-system evidence retained from the original policy

This policy was assembled from recent empirical research and primary engineering/security guidance. The rules above are intentionally stronger than any single study because the goal is prevention, not merely describing average model behavior.

### Key evidence

- OpenCode: `AGENTS.md` is the persistent project-instruction mechanism and should contain architecture, conventions, and verification requirements. It is combined into the model context.  
  https://opencode.ai/docs/instructions

- GitHub's AI-generated code review guidance recommends functional checks, context/intent review, code-quality review, dependency scrutiny, and explicit checks for hallucinated APIs, ignored constraints, deleted/skipped tests, and code that merely "looks right".  
  https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/review-ai-generated-code

- Veracode's 2025 GenAI Code Security Report evaluated 100+ models on 80 coding tasks across Java, JavaScript, C#, and Python. In that constrained benchmark, only about 55% of generations were secure; 45% introduced one of four detectable vulnerabilities (SQL injection, XSS, log injection, or risky cryptography). The report also found little security improvement from larger/newer models.  
  https://www.veracode.com/blog/genai-code-security-report/  
  https://www.veracode.com/wp-content/uploads/2025_GenAI_Code_Security_Report_Final.pdf

- Fu et al., empirical study of Copilot/CodeWhisperer/Codeium snippets in GitHub projects, found substantial security weakness rates in analyzed Python and JavaScript snippets and weaknesses spanning many CWE categories.  
  https://arxiv.org/abs/2310.02059

- Schreiber & Tippe (2025), large-scale analysis of 7,703 AI-attributed files using CodeQL, found 4,241 CWE instances across 77 vulnerability types and notable language/tool differences.  
  https://arxiv.org/abs/2510.26103

- Liu et al. (2026), large-scale analysis of 304,362 verified AI-authored commits across 6,275 repositories, identified 484,606 distinct issues; 89.1% were code smells, more than 15% of commits from every studied AI assistant introduced at least one issue, and 24.2% of tracked AI-introduced issues remained in the latest revision.  
  https://arxiv.org/abs/2603.28592

- Zhao et al. (ICML 2026), SUSVIBES benchmark of 186 real-world feature-request tasks where human programmers had produced vulnerable implementations: agents performed poorly on security even when functional success was substantially higher; one reported setting achieved 57% functional correctness but only 11.8% security. Treat functional success and security as separate gates.  
  https://proceedings.mlr.press/v306/zhao26ax.html

- Wang, Pradel & Liu (2025) found that passing the SWE-bench test suite can overstate correctness: 7.8% of plausible patches counted as correct while failing developer-written tests, and 29.6% showed behavior different from the ground truth patch. Passing tests alone is not proof of semantic equivalence.  
  https://arxiv.org/abs/2503.15223

- Gloaguen et al. (2026) found modern coding agents often modify code when no change is needed, proposing undesirable changes in 35–65% of FixedBench cases. Explicit reproduction helps. This supports the rule to verify that a reported bug is still present before editing.  
  https://arxiv.org/abs/2605.07769

- Chou et al. (2025) qualitative study of vibe coding observed stochastic generation, debugging/refinement burden, divergent mental models, and differences in how much generated code developers inspect or adapt.  
  https://arxiv.org/abs/2512.22418

- Pimenova et al. (2025) systematic qualitative study of vibe coding surfaced recurring problems around specification, reliability, debugging, code-review burden, and collaboration.  
  https://arxiv.org/abs/2509.12491

- Villamizar et al. (2026) found that requirement smells were generally associated with lower test-based functional correctness of generated code; clear requirements help, but do not guarantee correctness.  
  https://arxiv.org/abs/2609.29208

- OWASP Top 10:2025 provides the baseline application-security categories used above, including broken access control, supply-chain failures, injection, authentication failures, and exceptional-condition handling.  
  https://top10.owasp.org/2025/en/

- OWASP's Agentic AI guidance highlights prompt injection, excessive functionality/permissions/autonomy, tool misuse, identity/privilege abuse, supply-chain compromise, unexpected code execution, and memory/context poisoning as agent-specific risks.  
  https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/  
  https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

- OpenAI's prompt-injection guidance describes malicious instructions embedded in external content and emphasizes architectural controls so that manipulation is constrained even when detection is imperfect.  
  https://openai.com/index/designing-agents-to-resist-prompt-injection/

- METR's randomized controlled trial of experienced open-source developers found early-2025 AI tools made participants 19% slower in that study setting despite participants expecting and perceiving speedups. The study is not a universal statement about all developers/tools; it is evidence against assuming AI always reduces total engineering time.  
  https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/

## 21. Final rule

**Do not optimize for code generation. Optimize for verified software.**

The agent's job is not to maximize lines changed, prompts completed, tests turned green, or features claimed. The job is to produce the smallest correct, secure, understandable, and maintainable change that satisfies the user's actual goal.
