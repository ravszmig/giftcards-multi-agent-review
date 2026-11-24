# Multi-agent review · facilitator reference

The tables the [guide](FACILITATOR-GUIDE.md) links to: how the session maps to the intro
slides, the disputed item, acting on FAIL, the offline fallback, the facilitator key and the
deterministic checks. Facilitator only, like everything in `facilitator/`.

## How the session maps to the intro slides

| Slide | Claim | Where the participant sees it |
|---|---|---|
| 2 · One diff, several named roles | Every role reads the same pinned base and head | `pin.mjs` writes `review/PIN` with one DIFF line; every record and the report copy it, and the report check fails if one does not |
| 2 · On FAIL, two actions | Fix a confirmed blocker; a human decides a disputed one; nothing reruns automatically | Every rerun is a prompt the participant types |
| 3 · Each reviewer starts fresh | No builder conversation, no peer findings, no source edits by the Tester | The builder and each review are separate Copilot sessions with separate profiles. Reviewers have `["read", "search"]` only |
| 3 · Role knowledge | Each reviewer has its own instructions | Each knowledge file has one reader ([EXPECTED.md](EXPECTED.md#who-reads-what)), checked from the event log by `node facilitator/audit.mjs` |
| 4 · Optional roles need a routing reason | A role is added only when a rule matches, and the report names the rule | Ticket 1 adds none. The routing check shows R3 not matching ticket 1. Ticket 2 adds R1, R2 and R3 with their matched lines. The deck calls this role PrimitiveObsessionChecker; the lab names it `primitive-obsession` |
| 5 · The review contract | Run status, finding fields, one report | `REVIEW-CONTRACT.md`, `review/runs/*.md`, `review/REPORT.md` |
| 6 · PASS or FAIL | PASS needs every required role RAN and no open CRITICAL or HIGH. PASS makes no correctness claim | Ticket 1's PASS made no claim about primitives: the role was not there |
| 7 · Parallel review | Reviewers start together; a TIMEOUT is missing coverage | `/tasks`. TIMEOUT is stated as the coverage rule, not shown live: see [Acting on FAIL](#acting-on-fail) |
| 8 · The skill or `/fleet` | The skill sets the split | The skill starts each reviewer with `task` and says "You do not use `/fleet`" |

## The disputed item

T2-C is built to be disputed. The Tester reports it at HIGH with OBSERVED beginning
`DISPUTED: BD-011`, and the reconciler lists it under DISAGREEMENTS with NEXT "a human
decides: BD-011: …". It counts towards FAIL until a human decides.

The participant opens the evidence. The knowledge file is open to a human, unlike to the
builder.

| Source | Line | Says |
|---|---|---|
| Ticket GC-212 | `tickets/TICKET-2-card-expiry.md:19` | 30 days. Written by the Stores PO on 2026-11-12. "Legal agreed 30 days on the call of 2026-11-10" |
| BD-011 | `docs/knowledge/BUSINESS_DECISIONS.md:36` | 14 days. Finance and Legal, 2025-03-04 |
| BD-018 | `docs/knowledge/BUSINESS_DECISIONS.md:38` | The Stores PO owns grace periods from 2026-10-01 and records each change in this file |
| How a decision changes | `docs/knowledge/BUSINESS_DECISIONS.md:8-22` | The owner changes a decision by adding an entry that supersedes it. A ticket does not change a decision by itself. Rule 4 is why this one is disputed |

The participant states the decision in one or two sentences. Either outcome is valid; the
point is that a person made it, with the evidence, and recorded it.

**14 days, BD-011 holds.** The scripted outcome, matching
[EXPECTED.md](EXPECTED.md#contradictions): "BD-011 holds: the grace period is 14 days. No
entry supersedes it. The PO adds one if 30 days is wanted." `GracePeriodProofTest` passes on
the fixed head.

**30 days, the ticket holds.** Record it with the same prompt and the participant's words,
for example "The ticket holds: 30 days, decided by the Stores PO under BD-018." The decision
closes the dispute, so the Tester gives no finding on 30 days. `GracePeriodProofTest` fails
on that head, which is correct: the proof shows which reading the code follows. It does not
decide.

> **TODO.** The 30-day outcome has not been rehearsed. Whether the Tester accepts the
> recorded 30-day decision with no finding, and the rerun reaches PASS, is unobserved.
> Rehearse it once, then replace this block with the result.

## Acting on FAIL

The report's CAUSES and NEXT say which action applies. Nothing reruns automatically: each
action is a prompt the participant types. Every code change is a new commit and a new pin; a
review is always of a pin, never of a working tree.

| Cause | Action | Prompt | Seen live |
|---|---|---|---|
| Blocking finding, confirmed | Fix the code, commit, review again | The guide's fix prompt, then the review prompt in a fresh review session | every session |
| Blocking finding, `DISPUTED:` | A human decides and records it, then fix | The guide's decision prompt, then the fix prompt with the decision | every session |
| Missing coverage: a required role at TIMEOUT, ERROR or NOT RUN | Rerun that reviewer only, then reconcile | The guide's rerun prompt | ERROR, in the recording and one dry run; TIMEOUT no |
| The report check finds a problem | Do not use the verdict. A record problem: rerun that reviewer. A report problem: reconcile only, at most twice | The guide's record and reconcile-only prompts | in four dry runs |

**TIMEOUT, as the coverage rule.** The skill stops a reviewer that has not returned after
10 minutes and writes `RUN TIMEOUT` in its record. The contract counts TIMEOUT and ERROR as
missing coverage: they say nothing about the code. So a review with a timed-out Tester is
FAIL even with no finding at all, and the action is to rerun the Tester alone. This is slide
7. No reviewer in any rehearsal or dry run took longer than 2 minutes, so TIMEOUT has not
been seen live.

Stop after three fix loops on one ticket, and debrief on why the builder and the reviewers
disagree. If a fix changes nothing (the Commit tool window is empty), skip the commit and say
so. If the audit prints `Persona scoping: VIOLATED`, a reviewer read a file outside its
list: treat any finding citing that file as unscoped, and record it.

### If the builder does not follow the ticket

The tickets are written so that a ticket-following build trips every contradiction. A
builder may refuse a point instead. Your proofs show it: a proof that already passes on the
first build means the builder did not follow the ticket on that point. The matching finding
does not appear, and that is a builder deviation, not a review miss.

- Ask the participant to find the point in the builder's last message and in the diff. The
  decision moved from the review to the builder, with no record of who made it.
- If every ticket 1 proof passes, the first review may PASS. Skip the fix loop and spend the
  time on the ticket 2 decision.
- If the builder chose 14 days on its own, T2-C is not disputed in the report. Run the
  decision anyway: the participant decides whether the builder was entitled to choose.

## Offline fallback

**Fallback only.** Use it when Copilot CLI cannot authenticate or the model is unavailable.
Say before showing anything that the builds are prepared patches and that no model reviews
anything. The suite, the pin, the routing and the proofs run on the participant's machine as
normal.

In place of the builder, on the ticket branch, apply the ticket-following stand-in build:

```sh
git apply facilitator/reference/ticket-1-naive.patch     # ticket-2-naive for ticket 2
```

In place of the fix, revert it and apply the knowledge-following patch:

```sh
git apply -R facilitator/reference/ticket-1-naive.patch
git apply facilitator/reference/ticket-1-reference.patch
```

Commit in IntelliJ, then pin with `.github/skills/multi-agent-review/pin.mjs` in the
terminal. In place of each review, the participant takes one role on `review/ROSTER`, reads
only that role's knowledge files, and writes its record in the contract format to
`review/runs/<agent>.md`. Then compare it with `node facilitator/proofs.mjs 1`. Step 3 works
as in the guide. The reference patch for ticket 2 uses 14 days, so the 30-day outcome cannot
be shown offline.

> **TODO.** No recorded review ships for the fallback. Add a dry run's reports under
> `facilitator/prepared/`, each first line `PREPARED`, with a check in `verify` that every
> prepared file is labelled.

## Facilitator key

Full citations, checked by `verify`, are in [EXPECTED.md](EXPECTED.md#contradictions). The
fix column describes the knowledge-following patch in `facilitator/reference/`.

| ID | Ticket line | Rule | Reviewer | Severity | Proof | The fix |
|---|---|---|---|---|---|---|
| T1-A | `TICKET-1:27` goodwill up to £50.00 above | BD-007 | Tester | HIGH | `RefundLimitProofTest` | Cap refunds at the redemption amount |
| T1-B | `TICKET-1:28` full card number in the log | S-2 | Security Auditor | HIGH | `RefundLoggingProofTest` | Log `number.masked()` |
| T1-C | `TICKET-1:29` webhook from the domain | A-1, A-2 | Architect | HIGH | `LayeringProofTest` | Notify from the handler, not from `RefundService` |
| T2-A | `TICKET-2:26-27` edit V1, or drop and recreate | M-1, M-2 | Migrations (R2) | CRITICAL | `AppliedMigrationsProofTest` | New V4 migration, `ADD COLUMN` |
| T2-B | `TICKET-2:21` `balance` takes a `String` | P-2 | API compatibility (R1) | HIGH | `ApiCompatibilityProofTest` | Keep `balance(CardNumber)`, not deprecated |
| T2-D | `TICKET-2:22` keep `VERSION` at 1.4.0 | P-3, P-5 | API compatibility (R1) | HIGH | `ApiCompatibilityProofTest` | `VERSION` and `pom.xml` to 1.5.0 |
| T2-C | `TICKET-2:19` 30 days | BD-011, BD-018, disputed | Tester | HIGH | `GracePeriodProofTest` shows the reading, does not decide | `GRACE_DAYS = 14`, or BD-019 and 30 |
| T2-E | `TICKET-2:21` `String` in, `int` out | CP-2, CP-3, CP-4 | Primitive obsession (R3), from step 3 | HIGH | `PrimitiveSignatureProofTest` | A method taking `CardNumber` and returning `Optional<Period>`, `balance(CardNumber)` only |

R1 and R2 must not fire on ticket 1: `TICKET-1:31` keeps refunds out of `GiftCards`, and
`TICKET-1:25` says no schema change. If the builder adds refunds to `GiftCards` anyway, R1
matches, API compatibility is rightly on the roster, and it is a builder deviation.

## Deterministic checks

`node facilitator/verify.mjs <new directory>` copies this lab into a new directory outside
it, commits it on `main`, and runs all of these with no Copilot call. It stops at the first
mismatch. Last run 2026-11-24, macOS, Node.js 24.14.0, Maven 3.9.16, Java 21.0.9:
`Verify passed`.

| Check | Result |
|---|---|
| Isolation | `AGENTS.md` names no knowledge file and not `facilitator/`; no `copilot-instructions.md`; the builder is denied `docs/` and `facilitator/`, the reviewer `facilitator/`; `.ignore` hides `facilitator/` from search tools; `.gitignore` covers `.idea/`, `*.iml`, `target/`, `review/` and `.lab/` |
| Persona scoping | 9 knowledge files, each read by exactly one of 7 agents; EXPECTED.md's table matches |
| Severity caps | The 11 ceilings the report check enforces, such as S-5 MEDIUM and CS-4 LOW, match the severity each rule's text states |
| Knowledge locators | 182 `path:line` references resolve |
| Facilitator key | 30 citations in EXPECTED.md match their lines |
| Launch scripts | `scripts/copilot-builder`, `copilot-reviewer` and `copilot-session.sh` are executable bash; `pin.mjs` is executable |
| Voice | No em dash in any Markdown, Java, SQL, XML or JavaScript file of the lab |
| Base suite | exit 0, 44 passed, 0 failed; 26 production classes, 17 test classes |
| Ticket 1, ticket-following | CI 48 passed; no optional role, none with R3; T1-A, T1-B, T1-C `FAIL` |
| Ticket 1, knowledge-following | CI 48 passed; no optional role; T1-A, T1-B, T1-C `PASS` |
| Ticket 2, ticket-following | CI 52 passed; R1, R2, R3; T1 `PASS`, T2-A to T2-E `FAIL` |
| Ticket 2, knowledge-following | CI 52 passed; R1, R2, no R3; T2-A to T2-E `PASS` |
| Pin | In every scenario `pin.mjs` writes the DIFF line, a `review/ROSTER` equal to the report check's routing, and `--route` agrees; on `main` it refuses |
| Report check | Flags a dropped finding, a wrong verdict, an unrouted role, a WHERE outside the diff, NEXT and DISAGREEMENTS out of step, a blocker missing from CAUSES or not named by its BD- decision, a blocker on a closed decision, an em dash, a duplicated heading, a non-canonical role, field padding, an unindented CAUSES line, a severity above its rule's ceiling, a finding listed twice, a rewritten WHERE, a finding merged under another rule, Migrations left off when R2 matches, Primitive obsession kept on when R3 no longer matches, a roster quote that is a diff header, and a report roster that differs from `review/ROSTER` |
| Step 3 | The role and R3 activate R1, R2, R3; `--route` on ticket 1's pin: no optional rule matches; committed on `main`, it stays out of ticket 2's diff |
| Decision | A BD-011 decision in `review/DECISIONS.md` is kept across the re-pin |

The CI suite passes on every head, ticket-following or not. Only a reviewer with the right
knowledge file, or a proof, tells the two apart.
