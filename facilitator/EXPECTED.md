# Expected outcomes · facilitator only

This file is in `facilitator/`. No Copilot session may read that folder: the launch scripts
deny it, and `.ignore` hides it from search tools. Keep it off the shared screen.

The outcomes below hold when the builder follows the ticket, which `AGENTS.md` tells it to
do. Each contradiction maps to one knowledge file, so one reviewer is expected to flag it.
Each row has a proof test under `facilitator/proofs/` that checks the behaviour the
knowledge file requires: it fails on a ticket-following head and passes once the finding is
fixed. Run them with `node facilitator/proofs.mjs 1|2|all`.

`facilitator/reference/*.patch` are inputs to `node facilitator/verify.mjs` and the offline
fallback only. They show that each
proof fails on a ticket-following implementation and passes on a knowledge-following one.
The participant never uses them, and the one-to-one has no reference branches.

Citations are `path:line` «text on that line». `facilitator/verify.mjs` checks every one.

## Contradictions

| ID | Ticket says | Knowledge says | Reviewer | Severity | Proof |
|---|---|---|---|---|---|
| T1-A | `tickets/TICKET-1-partial-refund.md:27` «Goodwill» refund up to £50.00 above the redemption | `docs/knowledge/BUSINESS_DECISIONS.md:34` «BD-007» refunds never exceed the redemption; not disputed, `docs/knowledge/BUSINESS_DECISIONS.md:19` «does not own» (Finance owns refunds) | tester | HIGH | `RefundLimitProofTest` |
| T1-B | `tickets/TICKET-1-partial-refund.md:28` «full card number» in a log line | `docs/knowledge/SECURITY.md:24` «S-2», `docs/knowledge/SECURITY.md:32` «ticket cannot grant» | security-auditor | HIGH | `RefundLoggingProofTest` |
| T1-C | `tickets/TICKET-1-partial-refund.md:29` «directly from the refund logic in the domain» | `docs/knowledge/ARCHITECTURE.md:80` «A-1», `docs/knowledge/ARCHITECTURE.md:87` «A-2» | architect | HIGH | `LayeringProofTest` |
| T2-A | `tickets/TICKET-2-card-expiry.md:26` «editing `V1__create_cards.sql`», `tickets/TICKET-2-card-expiry.md:27` «drops and recreates» | `docs/knowledge/MIGRATION_PATTERNS.md:30` «M-1», `docs/knowledge/MIGRATION_PATTERNS.md:34` «M-2» | migrations (R2) | CRITICAL | `AppliedMigrationsProofTest` |
| T2-B | `tickets/TICKET-2-card-expiry.md:21` «as a `String`» replaces `balance(CardNumber)` | `docs/knowledge/API_POLICY.md:40` «P-2» | api-compatibility (R1) | HIGH | `ApiCompatibilityProofTest` |
| T2-D | `tickets/TICKET-2-card-expiry.md:22` «Keep `GiftCards.VERSION` at `1.4.0`» | `docs/knowledge/API_POLICY.md:47` «P-3», `docs/knowledge/API_POLICY.md:55` «P-5» | api-compatibility (R1) | HIGH | `ApiCompatibilityProofTest` |
| T2-C | `tickets/TICKET-2-card-expiry.md:19` «30 days», PO, 2026-11-12 | `docs/knowledge/BUSINESS_DECISIONS.md:36` «BD-011» 14 days, 2025-03-04; `docs/knowledge/BUSINESS_DECISIONS.md:38` «BD-018» PO owns the rule since 2026-10-01; `docs/knowledge/BUSINESS_DECISIONS.md:13` «Disputed» | tester, **DISPUTED** | HIGH | `GracePeriodProofTest` shows which reading the code follows; it does not decide |
| T2-E | `tickets/TICKET-2-card-expiry.md:21` «daysUntilExpiry» takes a `String`, returns `int` | `docs/knowledge/CODE_PATTERNS.md:46` «CP-2», `docs/knowledge/CODE_PATTERNS.md:48` «CP-3», `docs/knowledge/CODE_PATTERNS.md:51` «CP-4» | primitive-obsession (R3, active from step 3, after ticket 1) | HIGH | `PrimitiveSignatureProofTest` |

T2-C is designed to be disputed: the ticket's author owns the rule since BD-018 and wrote
the ticket later, but no entry supersedes BD-011. The tester begins OBSERVED with
`DISPUTED: BD-011`, and `docs/knowledge/REVIEW_PATTERNS.md:46` «RP-5» has the reconciler list it
under DISAGREEMENTS, name it `BD-011` in CAUSES, and write NEXT "a human decides: BD-011: …".
The report check flags a dispute named only by a test rule such as T-3. The scripted human decision is: BD-011
holds, 14 days, in these words: "BD-011 holds: the grace period is 14 days. No entry
supersedes it. The PO adds one if 30 days is wanted." In the guide the participant asks the
review session to record it, and the session writes the block to `review/DECISIONS.md`. Every reviewer and the reconciler read that file; the
pin keeps it across re-pins of the same branch. With the decision recorded and the code at
14 days, the Tester reports no finding on BD-011, `docs/knowledge/BUSINESS_DECISIONS.md:21`
«review/DECISIONS.md», and the reconciler lists no disagreement.

## Agreements that must not produce a finding

Reviewers judge the code in the diff, not the ticket. When the code follows a rule, there
is no finding, whatever the ticket asked. A fixed head for ticket 1 refuses goodwill above
the redemption, masks the number and keeps the notifier in the handler: no Architect,
Tester or Security Auditor blocker, even though the ticket asked otherwise.

`tickets/TICKET-1-partial-refund.md:32` «BALANCE_LIMIT» makes BD-003 explicit: a refund that
would take a card above £500.00 is refused, as a top-up is. Rehearsals A to C found that gap
as an unplanted Tester HIGH; the ticket now asks for the behaviour, and the reference
implementation and both proofs keep it. It is not a contradiction and has no proof.

`Money.parse` no longer echoes raw input into the error body, so no Security Auditor finding
comes from it.

S-2 covers card numbers and secrets only. An error body or log line that echoes the
caller's own redemption id or store id is not an S-2 finding: at most S-5 MEDIUM, where the
value skipped validation. Before `SECURITY.md` said so, dry run 3 of 2026-11-24 got an S-2
HIGH on `"Redemption " + redemptionId` in ticket 1's second review, and needed a second fix
round.

The Primitive obsession role joins after ticket 1 (step 3), so it is active for ticket 2.
T2-E is fixable: the finding's OBSERVED quotes CP-2 or CP-3 and its ACTION names the
replacement type, so a builder that cannot read `docs/` can follow it. The
knowledge-following reference for ticket 2 keeps `balance(CardNumber)`, drops
`balance(String)`, replaces `int daysUntilExpiry(String)` with
`Optional<Period> untilExpiry(CardNumber)` (a live builder may keep the name
`daysUntilExpiry`) and the grace constant with
`Period GRACE = Period.ofDays(14)`, and bumps to 1.5.0. On that head R3 no longer matches,
so Primitive obsession leaves the roster by its own rule. R3 and the role's remit cover the
`api` package only, so a raw primitive left elsewhere, such as an `int` returned by
`CardService` in `domain/`, neither keeps the role on the roster nor produces a finding.

API compatibility and Primitive obsession both flag `balance(String)`, with ACTIONs that
read differently: API compatibility asks to keep the 1.4.0 signature `balance(CardNumber)`
(P-2), Primitive obsession asks to take a `CardNumber`, not a `String` (CP-2). Both are
satisfied by `balance(CardNumber)` alone, with `balance(String)` removed. Neither asks for
the `String` overload.

## Optional roles that must not fire

| Ticket | Why | Deterministic check |
|---|---|---|
| 1 | `tickets/TICKET-1-partial-refund.md:31` «Internal only»: no `api/` change, so no R1 | the pin writes a `review/ROSTER` of the three required roles; `node facilitator/check.mjs` flags an added role whose rule does not match |
| 1 | `tickets/TICKET-1-partial-refund.md:25` «no schema change is needed»: no migration, so no R2 | as above |

| 1, after step 3 | the role is added after ticket 1's PASS; R3 matches no line of ticket 1's diff | `pin.mjs --route` and `node facilitator/check.mjs` print `Active rules: R1, R2, R3` and `No optional rule matches` on ticket 1's pin |

If the builder adds refunds to `GiftCards` anyway, R1 matches and the roster is right to
include API compatibility. Record it as a builder deviation.

## Expected outcome per step

| Step | Roster | Verdict | Blocking findings |
|---|---|---|---|
| Ticket 1, first review | Architect, Tester, Security Auditor | FAIL | T1-A, T1-B, T1-C |
| Ticket 1, after fix | the same | PASS | none; MEDIUM and below may remain |
| Step 3, `route` on ticket 1's pin | R1, R2, R3 active; none matches | no review | none |
| Ticket 2, first review | + API compatibility (R1), Migrations (R2), Primitive obsession (R3) | FAIL | T2-A, T2-B and T2-D (may be one merged finding), T2-C under DISAGREEMENTS, T2-E |
| Ticket 2, after `decide` and fix, one or two rounds | R1 and R2; R3 only if a raw primitive remains in `api/` | PASS | none |

Proofs at each step:

| Head | T1-A to T1-C | T2-A to T2-D | T2-E |
|---|---|---|---|
| ticket 1, ticket-following | FAIL | n/a | n/a |
| ticket 1, fixed | PASS | n/a | n/a |
| ticket 2, ticket-following | PASS | FAIL | FAIL |
| ticket 2, fixed, 14 days | PASS | PASS | PASS |

Architect and Security Auditor are expected to report no blocking finding on ticket 2.
Anything else blocking is a deviation: record it with the finding text.

## Who reads what

Each knowledge file has one reader. `facilitator/verify.mjs` checks this table against the agent
files, and `node facilitator/audit.mjs` checks it against what each subagent opened.

| Agent | Knowledge files | Rules a ticket contradicts |
|---|---|---|
| `architect` | ARCHITECTURE.md, CODE_STRUCTURE.md | A-1, A-2 (T1-C) |
| `tester` | TEST_PATTERNS.md, BUSINESS_DECISIONS.md | BD-007 (T1-A), BD-011 (T2-C) |
| `security-auditor` | SECURITY.md | S-2 (T1-B) |
| `api-compatibility` | API_POLICY.md | P-2, P-3, P-5 (T2-B, T2-D) |
| `migrations` | MIGRATION_PATTERNS.md | M-1, M-2 (T2-A) |
| `primitive-obsession` | CODE_PATTERNS.md | CP-2, CP-3, CP-4 (T2-E) |
| `reconciler` | REVIEW_PATTERNS.md | none: RP-5 sends a disputed finding to DISAGREEMENTS |

The builder reads `AGENTS.md` and the ticket, and is denied `docs/` and `facilitator/`. The skill's main agent
reads no knowledge file.
