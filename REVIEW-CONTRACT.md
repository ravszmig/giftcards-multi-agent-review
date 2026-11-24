# Review contract

Every reviewer replies in this format and nothing else. Each full review keeps its records in
a fresh folder, `review/runs/<n>/`. The reconciler reads only that folder and writes one
report, `review/REPORT.md`.

## Run status: one block per reviewer

```text
ROLE      <role name>
RUN       RAN | TIMEOUT | ERROR | NOT RUN
RESULT    FINDINGS | NO FINDINGS
```

- Exactly one RUN line and one RESULT line. RESULT appears only when RUN is RAN.
- TIMEOUT, ERROR and NOT RUN are missing coverage. They say nothing about the code.

## Finding: one block per issue, after the run status

```text
SEVERITY  CRITICAL | HIGH | MEDIUM | LOW | NIT
WHERE     <file>:<line>
OBSERVED  what the reviewer saw, quoting the code, and the rule ID it breaks
IMPACT    what it would break, and for whom
ACTION    what would resolve it
```

- One issue per block.
- WHERE is a changed file and a line in it. The ticket is context, never the place of a
  finding.
- Where the code breaks a rule and the evidence supports two readings, OBSERVED begins with
  `DISPUTED:` and quotes both sources. The finding keeps its severity.
- A decision recorded in `review/DECISIONS.md` closes its dispute. Code that matches it gets
  no finding.

## Severities

Use the severity your knowledge file gives for a rule. Where it gives none:

| Level | Effect | Impact | Example |
| --- | --- | --- | --- |
| CRITICAL | Blocks | Exploitable, losing data or taking the service down as shipped | Secret committed, auth bypass |
| HIGH | Blocks | Breaks or exposes users or callers in normal use | A retry charges the customer twice |
| MEDIUM | Does not block | Wrong in an edge case, or design debt | Missing error path |
| LOW | Does not block | Minor gap with no user impact | Missing test for unchanged code |
| NIT | Does not block | Naming, comments, style | Naming, style |

## Report

```text
REVIEW REPORT
VERDICT   PASS | FAIL
CAUSES    <one line per blocking finding: every rule ID cited in its OBSERVED, then its WHERE; one line per missing role; or "none">

ROSTER
<Role name>    required
<Role name>    added by <rule ID>: <the changed line that matched, without its leading + or ??>

COVERAGE
<Role name>    RUN <status>    RESULT <result, or "none">

FINDINGS
<each finding block copied exactly from its record, one per finding, never merged; each adds:>
RAISED BY <Role name>

DISAGREEMENTS
<each disagreement with both readings, or "none">

NEXT
<one line per cause, naming its rule: fix the code, a human decides between two readings, or rerun <role>>
```

Role names are Architect, Tester, Security Auditor, API compatibility, Migrations and
Primitive obsession.

### Example

```text
REVIEW REPORT
VERDICT   FAIL
CAUSES    A-1, A-2: src/main/java/com/example/giftcard/domain/RefundService.java:3
          BD-007: src/main/java/com/example/giftcard/domain/RefundService.java:40
          M-1: src/main/resources/db/migration/V1__create_cards.sql:4
          CP-2, CP-3: src/main/java/com/example/giftcard/api/GiftCards.java:34

ROSTER
Architect    required
Tester    required
Security Auditor    required
Migrations    added by R2: expires_on DATE,
Primitive obsession    added by R3: public int daysUntilExpiry(String cardNumber) {

COVERAGE
Architect    RUN RAN    RESULT FINDINGS
Tester    RUN RAN    RESULT FINDINGS
Security Auditor    RUN RAN    RESULT NO FINDINGS
Migrations    RUN RAN    RESULT FINDINGS
Primitive obsession    RUN RAN    RESULT FINDINGS

FINDINGS
SEVERITY  CRITICAL
WHERE     src/main/resources/db/migration/V1__create_cards.sql:4
OBSERVED  M-1: `expires_on DATE,` was added to V1, which every environment has applied.
IMPACT    The changed checksum stops the service starting on the next deploy.
ACTION    Restore V1 and add the column in a new migration.
RAISED BY Migrations

SEVERITY  HIGH
WHERE     src/main/java/com/example/giftcard/domain/RefundService.java:3
OBSERVED  A-1, A-2: the domain imports `adapter.web.StoreWebhookNotifier` and calls it.
IMPACT    The domain depends on an adapter, against the inward dependency rule.
ACTION    Notify through a port the adapter implements, wired in the application.
RAISED BY Architect

SEVERITY  HIGH
WHERE     src/main/java/com/example/giftcard/domain/RefundService.java:40
OBSERVED  BD-007: refunds may exceed the redemption by `GOODWILL_LIMIT`.
IMPACT    Money is created that Finance cannot book.
ACTION    Cap the refunds against one redemption at the redemption amount.
RAISED BY Tester

SEVERITY  HIGH
WHERE     src/main/java/com/example/giftcard/api/GiftCards.java:34
OBSERVED  CP-2, CP-3: `int daysUntilExpiry(String cardNumber)` takes a raw card number and returns raw days.
IMPACT    Partners can pass any text as a card number and must guess the unit of the result.
ACTION    `public Optional<Period> daysUntilExpiry(CardNumber number)`.
RAISED BY Primitive obsession

SEVERITY  MEDIUM
WHERE     src/test/java/com/example/giftcard/domain/RefundServiceTest.java:54
OBSERVED  T-1: no test refunds one penny over the redemption.
IMPACT    A regression at the limit would pass the suite.
ACTION    Add a test at the limit and one penny either side.
RAISED BY Tester

DISAGREEMENTS
none

NEXT
fix the code: A-1, A-2: src/main/java/com/example/giftcard/domain/RefundService.java:3
fix the code: BD-007: src/main/java/com/example/giftcard/domain/RefundService.java:40
fix the code: M-1: src/main/resources/db/migration/V1__create_cards.sql:4
fix the code: CP-2, CP-3: src/main/java/com/example/giftcard/api/GiftCards.java:34
```

The example mixes the two tickets' issues to show every part once. A disputed finding adds
its two readings under DISAGREEMENTS and a NEXT line such as
`a human decides: BD-011: 14 days or 30 days`.

## Verdict

- **PASS** needs every required role at RUN RAN and no open CRITICAL or HIGH finding.
- **FAIL** is missing coverage, a blocking finding, or both. CAUSES lists each one.
- A disputed finding counts towards FAIL until a human decides and records the decision.
- PASS means no blocker under this policy. It makes no claim that the code is correct.
- Nothing reruns automatically. The person who asked for the review decides the next step.
