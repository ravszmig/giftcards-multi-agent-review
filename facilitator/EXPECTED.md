# Expected outcomes · facilitator only

The answer key. Keep it off the shared screen.

Each ticket asks for something a knowledge file forbids. The builder never sees the
knowledge files, so it follows the ticket. Each file has one reviewer, so each contradiction
has one expected reviewer. Every review covers the uncommitted working tree against `HEAD`.
Ticket 2 is built on top of ticket 1's fixed code, so its review sees ticket 1's changes too.
Those are already fixed and are not expected to produce findings.

## Planted issues

| ID | The ticket asks | The rule it breaks | Reviewer | Severity |
|---|---|---|---|---|
| T1-A | `tickets/TICKET-1-partial-refund.md:27` goodwill refunds up to £50.00 above the redemption | BD-007 (`docs/knowledge/BUSINESS_DECISIONS.md:34`): refunds never add up to more than the redemption. Finance owns refunds, so it is not disputed | Tester | HIGH |
| T1-B | `TICKET-1:28` the full card number in a log line | S-2 (`docs/knowledge/SECURITY.md:24`): no full card number in a log line. A ticket cannot grant an exception | Security Auditor | HIGH |
| T1-C | `TICKET-1:29` call the webhook from the domain | A-1 and A-2 (`docs/knowledge/ARCHITECTURE.md:80`, `:87`): dependencies point inward; outbound calls start in an adapter | Architect | HIGH, as one finding or two |
| T2-A | `tickets/TICKET-2-card-expiry.md:26-27` edit `V1__create_cards.sql`, or drop and recreate `cards` | M-1, M-2 (`docs/knowledge/MIGRATION_PATTERNS.md:30`, `:34`): never edit an applied migration; never drop a table with data | Migrations (R2) | CRITICAL |
| T2-B | `TICKET-2:21` `balance` takes a `String` | P-2 (`docs/knowledge/API_POLICY.md:40`): no breaking change inside 1.x. The fix keeps `balance(CardNumber)` | API compatibility (R1) | HIGH |
| T2-D | `TICKET-2:22` keep `VERSION` at 1.4.0 | P-3, P-5 (`API_POLICY.md:47`, `:55`): a new public method is a minor release; a ticket cannot waive it | API compatibility (R1) | HIGH |
| T2-C | `TICKET-2:19` a 30-day grace period | BD-011 (`BUSINESS_DECISIONS.md:36`): 14 days. **Disputed**: see below | Tester | HIGH, `DISPUTED:` |
| T2-E | `TICKET-2:21` `balance(String)` and `int daysUntilExpiry(String)` in the published API | CP-2, CP-3 (`docs/knowledge/CODE_PATTERNS.md:46`, `:48`): a card number is a `CardNumber`, a length of time a `Period` or `Duration` | Primitive obsession (R3, from step 3) | HIGH |

## Expected review by review

| Review | Roster | Verdict | Blocking findings |
|---|---|---|---|
| Ticket 1, first | Architect, Tester, Security Auditor | FAIL | T1-A, T1-B, T1-C |
| Ticket 1, after the fix | the same | PASS | none. MEDIUM and below may remain |
| Step 3, "which optional rules match?" | no review | n/a | "No optional rule matches": ticket 1 changes nothing in `api/` or in the migrations |
| Ticket 2, first | + API compatibility (R1), Migrations (R2), Primitive obsession (R3), each with the line that matched | FAIL | T2-A, T2-B, T2-D, T2-C under DISAGREEMENTS with NEXT "a human decides", T2-E |
| Ticket 2, after the decision and the fix | + R1 and R2. No Primitive obsession: no raw primitive left in `api/` | PASS | none |

Architect and Security Auditor are expected to have no blocking finding on ticket 2. Any other
blocker is a deviation: note it with the finding's text.

Seen in rehearsal and harmless: Tester MEDIUMs on boundary tests (T-1, T-4), a Security
Auditor MEDIUM S-5 on an unvalidated store id in a log line, an Architect LOW on a third copy
of the card lookup (CS-4) or a MEDIUM on a test helper importing the JDBC adapter (CS-2), an
API compatibility MEDIUM P-4, a Migrations NIT M-5 on the new migration's file name.

## The disputed item

T2-C is built to be disputed. The ticket's author, the Stores PO, has owned the rule since
2026-10-01 (BD-018, `BUSINESS_DECISIONS.md:38`) and wrote the ticket later, but no entry
supersedes BD-011. Rule 4 of "How a decision changes" (`BUSINESS_DECISIONS.md:8-22`) makes
that a dispute. The Tester begins OBSERVED with `DISPUTED:`, and the reconciler lists it
under DISAGREEMENTS with NEXT "a human decides".

The scripted decision: "BD-011 holds: the grace period is 14 days. No entry supersedes it.
The PO adds one if 30 days is wanted." The review session writes it to
`review/DECISIONS.md`. Every reviewer and the reconciler read that file, so the next review
raises nothing on 14 days and lists no disagreement.

A 30-day decision is equally valid. The Tester then gives no finding on 30 days.

> **TODO.** The 30-day outcome has not been rehearsed.

## Agreements that must not produce a finding

- A fixed ticket 1 refuses goodwill above the redemption, masks the number and notifies from
  outside the domain: no Architect, Tester or Security Auditor blocker, whatever the ticket
  asked.
- `TICKET-1:32` asks for `BALANCE_LIMIT`: a refund that would take a card above £500.00 is
  refused (BD-003). It is not a contradiction.
- S-2 covers card numbers and secrets only. Echoing the caller's own redemption id or store
  id is at most S-5 MEDIUM.
- API compatibility and Primitive obsession both flag `balance(String)`. `balance(CardNumber)`
  alone, with `balance(String)` removed, satisfies both. Neither asks for a `String`
  overload, and nothing asks to deprecate `balance(CardNumber)`.
- R3 covers the `api` package only. An `int daysUntilExpiry(CardNumber)` in
  `domain/CardService` neither puts Primitive obsession on the roster nor produces a finding.
- R1 and R2 do not fire on ticket 1: `TICKET-1:31` keeps refunds out of `GiftCards`, and
  `TICKET-1:25` says no schema change. If the builder changes `GiftCards` anyway, R1 rightly
  adds API compatibility: a builder deviation.

## If the builder does not follow the ticket

A builder may refuse a point. The matching finding then does not appear: a builder
deviation, not a review miss. Show the participant the point in the builder's last message
and in the diff: the decision moved from the review to the builder, with no record of who
made it. If the builder chose 14 days on its own, run the decision anyway: the participant
decides whether the builder was entitled to choose.

## Who reads what

| Agent | Knowledge files | Rules a ticket breaks |
|---|---|---|
| `architect` | ARCHITECTURE.md, CODE_STRUCTURE.md | A-1, A-2 (T1-C) |
| `tester` | TEST_PATTERNS.md, BUSINESS_DECISIONS.md | BD-007 (T1-A), BD-011 (T2-C) |
| `security-auditor` | SECURITY.md | S-2 (T1-B) |
| `api-compatibility` | API_POLICY.md | P-2, P-3, P-5 (T2-B, T2-D) |
| `migrations` | MIGRATION_PATTERNS.md | M-1, M-2 (T2-A) |
| `primitive-obsession` | CODE_PATTERNS.md | CP-2, CP-3 (T2-E) |
| `reconciler` | REVIEW_PATTERNS.md | none: RP-5 sends a disputed finding to DISAGREEMENTS |

The builder reads `AGENTS.md` and the ticket. The skill's main agent reads no knowledge file.
