# Multi-agent review: 1:1, 60 to 90 minutes

One repository, two tickets, one review stage made of named reviewer agents. The
participant builds each ticket with one Copilot CLI session and reviews it with another.
They act on every FAIL, add a reviewer role of their own halfway, and make the one decision
no agent may make. Everything on their screen is IntelliJ and Copilot CLI.

The gift card service is synthetic Java 21. Each ticket asks for something a knowledge file
under `docs/knowledge/` forbids. The builder never reads those files, and each one has one
reviewer, so every review has a predictable answer. Every finding still comes from a live
model. The answers are in [EXPECTED.md](EXPECTED.md).

**What the participant leaves with:** a review is a roster of named roles on one change,
each with its own rules. The change decides the roster. The verdict follows a contract:
missing coverage fails it, and a dispute goes to a person.

## At a glance

| Min | Step | What the room sees |
|---|---|---|
| 0–8 | [Tour](#08-tour) | `AGENTS.md`, the review skill's roster and rules, the verdict rule, `## Knowledge` in one reviewer |
| 8–36 | [Ticket 1](#836-ticket-1-gc-207-partial-refund) | The builder follows the ticket. Three reviewers start together. FAIL on A-1/A-2, BD-007 and S-2. One fix, PASS |
| 36–42 | [Add a role by hand](#3642-add-the-primitive-obsession-role) | The participant copies a reviewer and types rule R3. Copilot: no optional rule matches ticket 1 |
| 42–64 | [Ticket 2](#4264-ticket-2-gc-212-card-expiry) | Six reviewers. FAIL: M-1 CRITICAL, P-2, P-3, CP-2, CP-3 HIGH, and BD-011 `DISPUTED:` with "a human decides" |
| 64–82 | [Decide, fix, PASS](#6482-the-decision-then-fix-to-pass) | The participant decides 14 days. One fix, PASS with R1 and R2 only |
| 82–90 | [Close](#8290-close) | The whole change in the Commit tool window. What PASS claims and what it does not |

Each Copilot turn takes up to about 5 minutes; the whole session needs 11 to 24 minutes of
model time in rehearsal. The rest is reading and talk. Nothing is committed: both tickets
stay as uncommitted changes, and every review covers the working tree against `HEAD`.

Each step below follows the same order: **Do** (the actions and the exact prompt), **Say**,
**Expected** (what rehearsals did), **Show** and **Talking points**. **Ask** marks a question
for the participant. Let them answer before you go on.

## Before the session

1. **Clone and open.** `git clone https://github.com/ravszmig/giftcards-multi-agent-review.git`.
   In IntelliJ, File, Open, the `giftcards-multi-agent-review` folder. Project SDK: a JDK 21.
   Let IntelliJ import Maven, and run `mvn -q test` once in its terminal, with network, so
   every later `mvn -o` works offline.
2. **Clean Copilot.** The sessions must see only this repository's instructions, skill and
   agents. Move aside any personal ones for the session: `~/.copilot/copilot-instructions.md`,
   `~/.copilot/agents/`, `~/.copilot/skills/`, and any user-level hooks.
3. **Two terminal tabs**, both in the repository root: `builder` and `review` (right-click a
   tab, Rename). Each runs plain `copilot`. Builder and review are always separate sessions:
   no reviewer may inherit the builder's conversation. Start a fresh review session for
   every review.
4. **Model.** In every new session, `/model` and pick `gpt-6-luna`.
5. **Approvals.** Each new session asks to trust the folder: Yes. When Copilot asks to edit
   files, the builder may edit source and tests, and the review session may write under
   `review/` only: approve the first write for the rest of the session. A review runs no
   shell command but `git status` and `git diff`, which need no approval. It deletes and
   writes its files with Copilot's file tool.
6. A hook in `.github/hooks/` keeps the builder out of `docs/`; do not switch it off.
7. **Morning check, on the participant's model.** In a second clone, run ticket 1's build
   and first review with the prompts below. Pass: FAIL with HIGHs from the Architect (A-1,
   A-2, as one finding or two), the Tester (BD-007) and the Security Auditor (S-2), and no
   CRITICAL. Models change; last week's run proves nothing today.

### Reset between participants

In IntelliJ: Git, Rollback, select all, Rollback. Then delete the `review/` folder (it is
ignored by Git, so Rollback keeps it). Or delete the clone and clone again.

## How the review works

```
ticket ──► builder session (plain copilot): reads AGENTS.md and the ticket, never docs/
           leaves the change uncommitted
                       │
review session (plain copilot, fresh each time): "Run the multi-agent-review skill"
   1  git status, git diff HEAD ──► roster: Architect, Tester, Security Auditor,
                                    plus R1, R2, R3 when a changed line matches
   2  one task per role, all in one turn ──► each reads its own docs/knowledge files
   3  review/runs/<n>/<agent>.md, one record per role, a fresh folder per review
   4  reconciler ──► review/REPORT.md: VERDICT PASS or FAIL
```

**PASS** needs every required role at `RUN RAN` and no open CRITICAL or HIGH finding.
MEDIUM, LOW and NIT do not block. **FAIL** is missing coverage, a blocking finding, or both.
`RUN ERROR` and `RUN TIMEOUT` are missing coverage: rerun that reviewer. A `DISPUTED:`
finding blocks until a person records a decision in `review/DECISIONS.md`. PASS makes no
claim that the code is correct.

Read every report against [EXPECTED.md](EXPECTED.md) before the participant does.

## 0–8: Tour

**Ask.** "How does your team decide today that a change is ready to merge?" Keep the answer
for the close.

**Do.** Open these in IntelliJ, in this order. **Say** the line for each.

1. `AGENTS.md`. "The builder reads this and the ticket, and nothing else. No knowledge file
   named."
2. `.github/skills/multi-agent-review/SKILL.md`, "The change" and section 1. "The review
   looks at the uncommitted changes. Architect, Tester and Security Auditor run on every
   change. R1 adds API compatibility for a public line in the `api` package. R2 adds
   Migrations for a migration file."
3. Section 2. "Every reviewer starts at once, in one turn."
4. `REVIEW-CONTRACT.md`, the severities and the verdict. "CRITICAL and HIGH block. The
   reconciler writes one report with one verdict."
5. `.github/agents/tester.agent.md`, `## Knowledge`. "Read exactly these files, and no
   other: `TEST_PATTERNS.md` and `BUSINESS_DECISIONS.md`."

**Ask.** "Which files does the builder never see?" Every knowledge file. "Why does that
matter?" The rules live with the reviewers. If a ticket breaks one, the builder cannot know.

## 8–36: Ticket 1, GC-207 partial refund

### Read the ticket, 3 minutes

**Do.** Open `tickets/TICKET-1-partial-refund.md`, items 4 to 6. Then the rules they break:
BD-007 in `docs/knowledge/BUSINESS_DECISIONS.md`, S-2 in `SECURITY.md`, A-1 and A-2 in
`ARCHITECTURE.md`.

**Say.** "Each of those three items breaks one of these rules. The builder will never see
the rules."

### Build, 7 minutes

**Do.** In the `builder` tab: `copilot`, trust the folder, `/model` gpt-6-luna, then paste:

```text
Implement tickets/TICKET-1-partial-refund.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask**, while it builds. "Which optional roles will join?" None: item 8 keeps refunds out of
the partner API, item 2 says no schema change. "What will each required role find?" Keep the
prediction.

**Expected (up to 5 min):** a new `RefundService` and a refunds route, tests, `mvn -o -q
test` passing, 8 to 12 changed files. It follows the ticket: a £50.00 goodwill limit, a log
line with `number.value()`, the webhook called from the domain.

**Show.** The Commit tool window lists the changes. Open `RefundService.java` and point at
the three. Double-click `StoreWebhookNotifier.java` for the diff viewer.

### Review, 8 minutes

**Do.** In the `review` tab: `copilot`, trust, `/model` gpt-6-luna, then paste:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-1-partial-refund.md.
```

Type `/tasks` when the reviewers start; Esc closes it.

**Say.** "A fresh session. None of the builder's conversation. It reads the change with
`git diff`, sets the roster, and starts every reviewer at once."

**Expected (up to 3 min):** three reviewers start together, then the reconciler.
`review/REPORT.md`:

- `VERDICT   FAIL`, roster of the three required roles, no `added by`.
- HIGH from the Architect (A-1, A-2), the Tester (BD-007) and the Security Auditor (S-2), all
  in `RefundService.java`. NEXT: fix the code.
- MEDIUM and below vary and do not block.

**Show.** `review/REPORT.md`, then `review/runs/1/tester.md`: its HIGH is in the report with
`RAISED BY Tester`. Each review writes its records to the next folder, `review/runs/2/` and
so on, so earlier reviews stay as they were.

**Ask.** "Your prediction?"

**Talking points.**

- Three roles, one change, started together. None saw another's output.
- The builder did what the ticket asked. The reviewers found what the ticket broke.

### Fix to PASS, 10 minutes

**Do.** In the `builder` tab, the same session, paste:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. Change no file the findings do not name, except tests that assert the behaviour a finding removes: update those. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Expected (up to 1.5 min):** refunds capped at the redemption, `number.masked()` in the log,
the notification moved out of the domain, for example behind a domain port. A test that
asserted the full card number in the log is updated with it.

If the builder leaves the suite failing, do not stop for it: this lesson is about the review,
and the Tester neither runs the suite nor blocks on a failing test. Use it as a talking point:
this is why a developer agent in a full pipeline, with several agents and quality checks,
would do better.

**Do.** In the `review` tab, `/exit`, then `copilot`, trust, `/model`, and the same review
prompt:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-1-partial-refund.md.
```

**Expected (up to 3.5 min):** `VERDICT   PASS`, the same three roles, MEDIUM and below only.

**Ask.** "PASS. What does that claim?" Every required role ran, and no CRITICAL or HIGH is
open. "What does it not claim?" That the code is correct.

Do not commit. Ticket 2 builds on top of this.

## 36–42: Add the Primitive obsession role

**Do.**

1. Open `review-templates/R3-routing-rule.md` and `review-templates/primitive-obsession.agent.md`.
   "Two changes to the review setup. No source code."
2. In the project tree, copy `primitive-obsession.agent.md` into `.github/agents/`.
3. In `SKILL.md`, paste the `| R3 |` row from `R3-routing-rule.md` under the `| R2 |` row.
4. In the `review` tab, the session still open, paste:

```text
I added rule R3 and the primitive-obsession role to the skill. Which optional rules match the current changes? Check every rule in the skill against git status and git diff HEAD, name each match with its line, and start no reviewer.
```

**Ask**, before the answer. "Prediction?" None: ticket 1 changed nothing in `api/`.

**Expected (under a minute):** "No optional rule matches." No reviewer starts.

**Ask.** "Ticket 1 passed without this role. What did that PASS claim about primitives?"
Nothing: the role was not on the roster.

## 42–64: Ticket 2, GC-212 card expiry

### Read the ticket, 5 minutes

**Do.** Open `tickets/TICKET-2-card-expiry.md` and the rules it breaks: BD-011 and BD-018 in
`BUSINESS_DECISIONS.md`, and its "How a decision changes" rule 4; P-2, P-3 and P-5 in
`API_POLICY.md`; M-1 in `MIGRATION_PATTERNS.md`; CP-2 and CP-3 in `CODE_PATTERNS.md`.

### Build, 6 minutes

**Do.** In the `builder` tab, `/exit`, `copilot`, trust, `/model`, then:

```text
Implement tickets/TICKET-2-card-expiry.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask.** "Which of R1, R2 and R3 will fire, and on which line?" R1 and R3 on
`balance(String)`, R2 on `V1`. "And the Tester?" BD-011 says 14 days, the ticket 30.

**Expected (up to 3.5 min):** `balance(String)` in place of `balance(CardNumber)`, `int
daysUntilExpiry(String)`, `VERSION` still 1.4.0, 30 days, and `expires_on DATE` added inside
`V1__create_cards.sql`.

**Show.** The diff viewer on `GiftCards.java` and `V1__create_cards.sql`. "V1 is applied in
every environment."

### Review, 11 minutes

**Do.** In the `review` tab, `/exit`, `copilot`, trust, `/model`, then:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-2-card-expiry.md.
```

**Expected (up to 3 min):** six reviewers start together. `review/REPORT.md`:

- `VERDICT   FAIL`. ROSTER: the three required roles, then API compatibility (R1),
  Migrations (R2) and Primitive obsession (R3), each with the line that matched.
- CRITICAL from Migrations, M-1, at `V1__create_cards.sql`.
- HIGH from API compatibility: P-2 (`balance(CardNumber)` replaced by `balance(String)`) and
  P-3 (`VERSION`). A MEDIUM P-4 may come with them and stays MEDIUM.
- HIGH from Primitive obsession: CP-2 and CP-3 at `GiftCards.java`. P-2 and CP-2 both point
  at `balance(String)` and stay two findings, one per role.
- HIGH from the Tester, OBSERVED starting `DISPUTED: BD-011`, listed under DISAGREEMENTS,
  with NEXT "a human decides: BD-011: …". CAUSES names BD-011 first.
- No blocker from the Architect or the Security Auditor.

**Show.** The roster first: "Each optional role names the rule and the line that put it
there." Then the CRITICAL, then the disputed finding.

**Say.** Read the "a human decides" line out loud. "That one is for you. The builder cannot
settle it."

## 64–82: The decision, then fix to PASS

### Decide, 6 minutes

**Do.** Open the evidence: `tickets/TICKET-2-card-expiry.md` line 19, and in
`BUSINESS_DECISIONS.md` BD-011, BD-018 and "How a decision changes".

**Ask**, in this order, without answering:

1. "Who owns the grace period today?" The Stores PO, under BD-018.
2. "Did the owner change BD-011 the way this file says a decision changes?" No.
3. "What would you need to see before shipping 30 days?" A new entry that supersedes BD-011.
4. "Which one do you ship today?"

**Do.** The participant states the decision. In the `review` tab, the same session:

```text
Do not run any reviewer. Record this decision in review/DECISIONS.md under the rule ID BD-011, as "DECISION  BD-011": "BD-011 holds: the grace period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted." Then print review/DECISIONS.md.
```

Put the participant's own words in place of the scripted text. A 30-day decision is equally
valid; it has not been rehearsed.

**Expected (seconds):** the file printed, with `DECISION  BD-011`, today's date and the text.

**Say.** "You made this one, with the evidence, and it is written down. Every reviewer reads
this file."

### Fix, 4 minutes

**Do.** In the `builder` tab, the same session:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. The human decision on the disputed BD-011 finding is in review/DECISIONS.md: follow it. Change no file the findings do not name, except tests that assert the behaviour a finding removes: update those. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask.** "Two roles flagged `balance(String)`. Do their actions conflict?" No:
`balance(CardNumber)` alone satisfies both.

**Expected (up to 2 min):** V1 restored and a new V4 migration that adds the column, 14 days,
`balance(CardNumber)` back with no `String` overload and not deprecated, a method taking a
`CardNumber` and returning `Optional<Period>`, `VERSION` and `pom.xml` at 1.5.0. A small
change to a file no finding names, such as an error message, has been seen; it is harmless.

### Review to PASS, 8 minutes

**Do.** In the `review` tab, `/exit`, `copilot`, trust, `/model`, then:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-2-card-expiry.md.
```

**Ask.** "Does R3 still match?" No raw primitive is left in `api/`.

**Expected (up to 2.5 min):** `VERDICT   PASS`. Roster: the three required roles, API
compatibility (R1) and Migrations (R2). No Primitive obsession. No disagreement. MEDIUM and
below only, or no findings.

**Talking points.**

- Primitive obsession joined when its rule matched, and left when the code no longer matched
  it. The change decided both times.
- The recorded decision closed the dispute: the Tester raised nothing on 14 days.

## 82–90: Close

**Do.** The Commit tool window: the whole session as one uncommitted change, both tickets and
the role.

**Ask**, one answer each:

1. "Ticket 1 passed without Primitive obsession, ticket 2 needed it. What decided whether it
   ran?" The change, through rule R3.
2. "Which finding would your team's current review have missed, and which file held the
   rule?" Often the edit to V1: M-1.
3. "Name one rule you type into review prompts today. Which role would own it, and what would
   make its routing rule fire?"
4. Back to the tour: "How does your team decide a change is ready to merge?"

**What PASS claims.** Every required role ran on this change, and no CRITICAL or HIGH is open
under this contract. **What it does not claim.** That the code is correct: a role not on the
roster made no claim.

Then reset the clone (above). Feedback about the participant goes to the cockpit store, never
into the clone.

Seen in rehearsal, harmless, and no reason to stop:

- An extra P-2 when the builder also changes `CardView`; R1 and R3 may then quote that line.
- BD-007 raised twice, once on the code and once on the test that asserts it.
- BD-011 followed by BD-018 and T-3 in the NEXT line of the dispute.
- Ticket 1's non-blocking findings (S-5, CS-4, T-1) appearing again on ticket 2, whose review
  also sees ticket 1's changes.
- R1 quoting a line whose only change is a renamed parameter.
- R2 quoting the file path of a new migration file instead of a changed line.
- "none." in place of "none" in DISAGREEMENTS or NEXT.

## If something goes wrong

| Symptom | Fix |
|---|---|
| Every reviewer `RUN ERROR`, FAIL on missing coverage. Seen with `"prompt": Required` and `"name": Required` | Missing coverage is the contract working. Same session: "Rerun the reviewers that ended RUN ERROR, then reconcile." |
| A reviewer is missing from the roster, or one joined that no rule matches | Do not use the verdict. Fresh review session, the review prompt, plus "Check every rule against the file paths in git status and quote the matching line." |
| The report drops, rewords, merges or re-rates a record's finding, or CAUSES misses a rule a blocker cites | Same session: "Reconcile only: start no reviewer and keep the records as they are." At most twice, then a fresh review |
| A new, unplanted HIGH after a fix | Fix it with the same fix prompt and review again |
| A planted finding is missing: the builder refused that point of the ticket | No finding appears there. See [EXPECTED.md](EXPECTED.md#if-the-builder-does-not-follow-the-ticket) |
| A permission question for any shell command other than `git status` or `git diff` in a review, such as `rm` | No. The review deletes and writes its files with the file tool; if it stops instead, start a fresh review session |
| The builder asks to read an odd path | No. It retries |
| Still FAIL after three fix loops | Stop and debrief on the open findings |

## Evidence

Rehearsed 2026-11-20 to 2026-11-24 on `gpt-6-luna`, Copilot CLI 1.0.114 and 1.0.115, macOS,
JDK 21: an IntelliJ recording, ten scripted dry runs of an earlier setup, and three of this
one. In every run each planted issue came from the
expected reviewer at the expected severity, and both tickets reached PASS, after one fix round
each in most runs. Model time for a whole session: 11 to 24 minutes.

The three dry runs of this setup, 2026-11-24, on the published lab: every planted ID came from
the expected role at the expected severity, R1, R2 and R3 were right in all twelve reviews,
both tickets reached PASS after one fix round, and nothing touched Git. They led to the
current fix prompts, the BD- rule IDs on business findings, the hook's handling of chained
`git status` and `git diff`, records cleared at the start of each review, and ticket 2's
explicit "replace, not overload".

Round 3, three more dry runs: every step matched, one fix round per ticket, the suite green,
no approval prompts or hook denials, findings copied verbatim. It led to a fresh records
folder per review and every cited rule in CAUSES.

> **TODO.** Those last changes have not been run end to end. It has not been rehearsed on
> Windows, and a live `RUN TIMEOUT` has not been seen.
