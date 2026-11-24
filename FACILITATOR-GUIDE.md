# Multi-agent review: 1:1, 60 to 90 minutes

One repository, two tickets, one review stage made of named reviewer agents. The
participant builds each ticket with one Copilot CLI session and reviews it with another.
Every FAIL gets acted on, a reviewer role of their own joins halfway, and they make the one
decision no agent may make. Everything on their screen is IntelliJ and Copilot CLI.

The gift card service is synthetic Java 21. Nobody brings a ticket. Each ticket breaks a
rule in a knowledge file the builder never sees, and each knowledge file has one reviewer,
so every review has a predictable answer and every finding still comes from a live model.

**What the participant leaves with:** a review is a roster of named roles on one pinned
diff, each with its own rules. The diff decides the roster. The verdict follows a contract.
Missing coverage fails it, and a dispute goes to a person.

## At a glance

| Min | Step | What the room sees |
|---|---|---|
| 0–8 | [Tour](#08-tour) | `AGENTS.md`, the skill's roster and rules R1 and R2, the verdict rule, `## Knowledge` in one reviewer |
| 8–36 | [Ticket 1: build, FAIL, fix, PASS, merge](#836-ticket-1-gc-207-partial-refund) | The builder follows the ticket. Three reviewers start in the same second. FAIL on A-1/A-2, BD-007 and S-2, all HIGH. One fix, PASS, merge |
| 36–42 | [Add a role by hand](#3642-add-the-primitive-obsession-role) | The participant copies a reviewer and types rule R3. The routing check: R1, R2, R3 active, none matches ticket 1 |
| 42–64 | [Ticket 2: build, six reviewers, FAIL](#4264-ticket-2-gc-212-card-expiry) | The pin puts R1, R2 and R3 on the roster. Six reviewers. FAIL: M-1 CRITICAL, P-2, P-3, CP-2, CP-3 HIGH, and BD-011 `DISPUTED:` with "a human decides" |
| 64–82 | [Decide, fix, PASS, merge](#6482-the-human-decision-then-fix-to-pass) | The participant decides 14 days. `review/DECISIONS.md`. One fix, PASS with R1 and R2 only, merge |
| 82–90 | [Close](#8290-close) | The Git log. What PASS claims and what it does not |

Timings come from three dry runs of this guide on 2026-11-24, the IntelliJ recording of
2026-11-22, and the rehearsals of 2026-11-20 (see [Evidence](#evidence)). Copilot time for
the whole session was about 11 to 24 minutes over ten dry runs. Each Expected block gives
the slowest time seen; most turns finish well inside it. The rest is reading and
talk.

Each step below follows the same order: **Do** (the clicks and the exact prompt), **Say**
(what to tell the participant), **Expected** (what the dry runs did, and what a dry run
checks), **Show** (the evidence afterwards) and **Talking points**. **Ask** marks a
question for the participant. Let them answer before you go on.

Every prompt is in a block of its own. The participant pastes it unchanged.

## Before the session

Do this the day before, and again on the morning.

1. **Check the fixture** in a terminal of your own, from the repository root. About 30 s,
   no Copilot call. It must end `Verify passed`:

   ```sh
   F="$PWD/forge/demos/demo-fixtures/multi-agent-review"
   node "$F/fixture.mjs" verify "$HOME/mar-verify-$(date +%Y%m%d-%H%M%S)"
   ```

   Then delete that directory.
2. **Set up the participant's repository.** A new directory outside this repository and
   outside `/tmp`:

   ```sh
   RUN="$HOME/mar-lab-$(date +%Y%m%d-%H%M%S)"
   node "$F/fixture.mjs" setup "$RUN"
   ```

   It prints `Workspace: $RUN/workspace` and `base <sha> (tag base, branch main)`. Keep
   `F` and `RUN` set in this terminal: it is your **facilitator terminal**, never on the
   shared screen. The workspace has a local Git identity, `Participant`, so commits from
   IntelliJ carry no personal name.
3. **Open `$RUN/workspace` in IntelliJ** (File, Open). Project SDK: a JDK 21, such as
   `temurin-21` (File, Project Structure, SDK). Let IntelliJ import Maven. Never open `$F`
   or `$F/facilitator/` on the shared screen.
4. **IntelliJ settings, once:**
   - Settings, Version Control, Confirmation, When files are created: **Add silently**,
     with "including files created outside IntelliJ" ticked. The builder creates files from
     the terminal. Without this, they wait under Unversioned Files and miss the commit.
   - Commit tool window (Cmd+0), the gear: untick **Analyze code** and **Check TODO**.
     Otherwise every commit stops on a "Commit contains problems" balloon.
5. **Two terminal tabs.** Open the terminal (Alt+F12). Rename the first tab `builder`
   (right-click the tab, Rename) and open a second named `review`. In one of them:

   ```sh
   java -version && mvn -v && node --version && copilot --version && gh auth status
   ```

   JDK 21, Maven 3.9, Node 22 or later, Copilot CLI 1.0.114 or later, signed in to `gh`.
   The launch scripts take the token from `gh auth token` for each Copilot process only.
6. **Dry run on the participant's model.** Ticket 1 to its first report, in a separate
   setup, from the facilitator terminal. Up to 6 minutes:

   ```sh
   DRY="$HOME/mar-dry-$(date +%Y%m%d-%H%M%S)"
   node "$F/fixture.mjs" setup "$DRY" && cd "$DRY/workspace" && git switch -q -c ticket-1
   scripts/copilot-builder --trust-folder -p "Implement tickets/TICKET-1-partial-refund.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted."
   git add -A && git commit -q -m "GC-207 partial refund"
   scripts/copilot-reviewer --trust-folder -p "Run the multi-agent-review skill on this branch's changes against main."
   grep -E '^(VERDICT|SEVERITY|RAISED BY)' review/REPORT.md
   node "$F/review-cli.mjs" "$DRY" check && node "$F/fixture.mjs" proofs "$DRY" 1
   cd -
   ```

   **Pass:** `VERDICT   FAIL`; three or four HIGHs, all from the expected rules, and no
   CRITICAL: the Architect's A-1 and A-2 as one HIGH or two, the Tester's BD-007, the
   Security Auditor's S-2; `Report check: … 0 problems`; proofs T1-A, T1-B and
   T1-C `FAIL`. Decide pass or fail from that output, then delete the directory:
   `rm -rf "$DRY"`. Anything else: run it once more. Two misses on the same model: use the
   [offline fallback](facilitator/WRAPPER-RUNBOOK.md#offline-fallback). Models change. A
   dry run from last week proves nothing today.
7. **Lay out IntelliJ:** project tree left, editor centre, terminal bottom, Commit tool
   window (Cmd+0) on the left edge, the branch widget in the title bar.

### Reset between participants

Close the project, delete `$RUN`, and run `setup` into a new directory. Nothing is reused:
the run directory also holds every session's profile and log, the old pins and the proof
runs.

## How the lab works

Read this once. It is the explanation for every "why does that happen" question.

```
tickets/TICKET-n ──► builder tab: scripts/copilot-builder
                       reads AGENTS.md and the ticket; denied docs/
                       cannot commit, start a subagent or use a skill
                       leaves the change uncommitted
participant commits in IntelliJ
                       │
review tab: scripts/copilot-reviewer, a fresh session per review
   skill multi-agent-review
   0  pin.mjs ──► review/PIN, diff.patch, ci-results.txt
                  review/ROSTER: the three required roles, plus R1, R2, R3 when a diff line
                  matches, computed in code
   1  read review/ROSTER; start exactly those roles
   2  one task per role, all in one turn ──► each reads its own docs/knowledge files
   3  review/runs/<agent>.md, one per role, verbatim
   4  reconciler ──► review/REPORT.md: ROSTER copied from review/ROSTER, VERDICT PASS or FAIL
```

| Piece | File | Who reads it |
|---|---|---|
| Build instructions | `AGENTS.md` | Builder. Names no knowledge file |
| The review stage | `.github/skills/multi-agent-review/SKILL.md` | Review session. Its rules table says which rules are active. The participant adds R3 to it |
| Pin and routing | `.github/skills/multi-agent-review/pin.mjs` | Review session, step 0. `--route` answers "which rules match" without pinning |
| Reviewers | `.github/agents/*.agent.md` | One per role, `tools: ["read", "search"]`, a `## Knowledge` list each |
| Contract | `REVIEW-CONTRACT.md` | Every reviewer and the reconciler |
| Knowledge | `docs/knowledge/*.md` | One reviewer per file. See [Who reads what](README.md#who-reads-what) |
| Decisions | `review/DECISIONS.md` | Every reviewer and the reconciler. Kept across re-pins of a branch |

**The roster is computed, not judged.** `pin.mjs` applies each active rule's test to the
diff and writes `review/ROSTER`. The skill starts exactly those roles, and the reconciler
copies the lines unchanged. A model deciding routing left Migrations off a roster in one dry
run; code does not.

**Two sessions, two sets of permissions.** `scripts/copilot-builder` and
`scripts/copilot-reviewer` each start Copilot CLI on `gpt-6-luna` with a disposable profile
under `$RUN/sessions/NN-<role>/`, so no personal setting, skill or saved approval reaches
it. `MAR_MODEL=<id>` before the script changes the model.

| Control | Builder | Review session |
|---|---|---|
| Reads `docs/` | Denied | Each reviewer its own files, by instruction. Checked afterwards by `fixture.mjs audit` |
| Writes | Anywhere except `docs/`, `.github/`, `tickets/`, `review/`, `scripts/`, `REVIEW-CONTRACT.md` | `review/` only. The rest of the workspace is denied |
| Shell | `mvn`, `git status`, `git diff`, `ls` run without asking. Other read-only commands run too. Commit, push, reset, checkout, stash denied | The pin script by its path, allowed. About 40 common commands denied by name, `wc`, `rg`, `cat`, `git` and `node` among them. Anything else asks |
| Subagents, skills | Hidden | The skill starts every reviewer with `task` |

**Fresh sessions.** Every review starts a new review session, so no reviewer inherits the
builder's conversation or an earlier review. The builder keeps one session per ticket: the
fix runs in the session that built it. Each new session asks to trust the folder, because
its profile is new.

**PASS and FAIL.** PASS needs every required role at `RUN RAN` and no open CRITICAL or HIGH
finding (`REVIEW-CONTRACT.md:83`). MEDIUM, LOW and NIT do not block. FAIL is missing
coverage, a blocking finding, or both. `RUN ERROR` and `RUN TIMEOUT` are missing coverage:
they say nothing about the code, and the action is to rerun that reviewer. PASS makes no
claim that the code is correct (`REVIEW-CONTRACT.md:89`).

**Disputed.** When a ticket from a decision's current owner, written after the decision,
breaks it and nothing supersedes it, the Tester reports the finding as
`DISPUTED: BD-011: …`. The reconciler lists it under DISAGREEMENTS, names it `BD-011` in
CAUSES, and NEXT says "a human decides: BD-011: …". It blocks until a person records a
decision in `review/DECISIONS.md`.

### Your checks, off screen

Four commands in the facilitator terminal. None calls a model. They prove which findings are
real, and whether the report keeps the contract.

| When | Command | What it proves |
|---|---|---|
| After every review | `node "$F/review-cli.mjs" "$RUN" check` | The report against the contract, the routing rules and `review/ROSTER`. Any problem: do not use the verdict |
| After every review | `node "$F/fixture.mjs" proofs "$RUN" 1` (ticket 2: `all`) | One proof test per planted contradiction, on HEAD, in a throwaway worktree. FAIL means the defect is in the code |
| After every review | `node "$F/fixture.mjs" route "$RUN"` | The roster the rules give. It matches `review/ROSTER` |
| After each build, and at the end | `node "$F/fixture.mjs" audit "$RUN"` | Per session: knowledge files the builder touched, persona scoping, writes outside `review/`, shell commands |

Run the report check before the participant reads a verdict. The answers are in
[facilitator/EXPECTED.md](facilitator/EXPECTED.md). Keep it open on your side only.

## 0–8: Tour

**Ask.** "How does your team decide today that a change is ready to merge?" Keep the answer:
the close comes back to it.

**Do.** Open these in IntelliJ, in this order. **Say** the quoted line for each.

1. `AGENTS.md`. "The builder reads this and the ticket, and nothing else. Build, layout,
   conventions. No knowledge file named."
2. `.github/skills/multi-agent-review/SKILL.md`, section 0. "The review skill pins the
   change itself. It refuses uncommitted changes, and it writes the roster."
3. The same file, section 1. "Architect, Tester and Security Auditor run on every diff. R1
   adds API compatibility for a public line in the `api` package. R2 adds Migrations for a
   migration file. A script applies the rules. No model decides who reviews."
4. Section 2, "Start every reviewer at once". "One task call per role, in one turn."
5. `REVIEW-CONTRACT.md`, the severity table and lines 83 to 89. "CRITICAL and HIGH block.
   MEDIUM, LOW and NIT do not. The reconciler writes one report, with one verdict."
6. `.github/agents/tester.agent.md`, `## Knowledge`. "Read exactly these files, and no other
   file under `docs/knowledge`: `TEST_PATTERNS.md` and `BUSINESS_DECISIONS.md`."

**Ask.** "Which file does the builder never see?" Every knowledge file under `docs/`. Then:
"Why does that matter for the review?" The rules live with the reviewers. If a ticket breaks
one, the builder cannot know.

**Talking point.** One diff, several named roles, each with its own rules and nothing else.
The roster is decided by the diff, before anyone has an opinion of the code.

## 8–36: Ticket 1, GC-207 partial refund

### Read the ticket, 3 minutes

**Do.** Open `tickets/TICKET-1-partial-refund.md`, items 4 to 6 (lines 27 to 29). Then the
three rules they break:

| Ticket | Rule | Where |
|---|---|---|
| Item 4: goodwill up to £50.00 above the redemption | BD-007: refunds never add up to more than the redemption. Finance owns it | `docs/knowledge/BUSINESS_DECISIONS.md:34` |
| Item 5: log the full card number | S-2: a card number is a bearer credential. Never in a log line | `docs/knowledge/SECURITY.md:24` |
| Item 6: call the webhook from the domain | A-1: dependencies point inward. A-2: outbound calls start in an adapter | `docs/knowledge/ARCHITECTURE.md:80`, `:87` |

**Say.** "Each of those three items breaks one of these rules. The builder will never see
the rules."

### Build, 7 minutes

**Do.**

1. Branch widget in the title bar, **New Branch**, `ticket-1`, Create.
2. In the `builder` tab:

   ```sh
   scripts/copilot-builder
   ```

   Trust the folder: choose **Yes**. The banner lists `Disabled tools`, among them `skill`
   and `task`.
3. Paste:

```text
Implement tickets/TICKET-1-partial-refund.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Say.** "Skill and task are disabled, so the builder cannot start a reviewer."

**Ask**, while it builds: "Which optional roles join?" None: item 8 keeps refunds out of the
partner API, and item 2 says no schema change. Then: "What will each required role find?"
Tester BD-007, Security Auditor S-2, Architect A-1 and A-2. Ask them to keep the prediction.

**Expected (up to 4 min 50 s):** the builder reads
`AGENTS.md`, the ticket and the code, adds `RefundService` and a refunds route, runs
`mvn -o -q test`, and may correct its own test once. It ends by saying the changes are
uncommitted. It follows the ticket: refunds capped at the redemption plus £50.00, a log line
with the full card number, the webhook called from the domain. 8 to 12 changed files.

**Show.** Commit tool window: the changed files. Open
`src/main/java/com/example/giftcard/domain/RefundService.java`:

- A goodwill limit of £50.00, for example `GOODWILL_LIMIT`: item 4.
- A log line with `number.value()`: the full card number.
- `notifier.refund(...)` called from the domain service.

Double-click `StoreWebhookNotifier.java` and `CardHandler.java` in the Commit tool window for
the diff viewer: a `REFUND` event, and the refunds route.

### Review, 8 minutes

**Do.**

1. Commit tool window: message `GC-207 partial refund`, **Commit**.
2. In the `review` tab:

   ```sh
   scripts/copilot-reviewer
   ```

   Trust the folder. Paste:

```text
Run the multi-agent-review skill on this branch's changes against main.
```

3. The pin script runs: `.github/skills/multi-agent-review/pin.mjs`. Its output ends with
   the roster. If Copilot asks to run it, choose **1. Yes**. If it asks to run anything
   else, choose **No**.
4. When the reviewers start, type `/tasks` to see them. Esc closes it.

**Say.** "A fresh session. It has none of the builder's conversation. The pin records the
diff, runs the test suite and writes the roster."

**Ask**, while the reviewers run: "What verdict do you expect?" FAIL, a HIGH from each
required role.

**Expected (up to 2 min 45 s):**

1. `skill(multi-agent-review)`, then the pin: `CI: exit 0`, `Active rules: R1, R2`,
   `No optional rule matches`, and the roster of three.
2. Architect, Tester and Security Auditor start in the same second. `/tasks` lists three
   subagents on `gpt-6-luna`.
3. 30 s to 1 min 40 s later the reconciler starts. The report prints in the terminal.

A dry run checks, in `review/REPORT.md`:

| Field | Value |
|---|---|
| VERDICT | `FAIL` |
| ROSTER | `Architect    required`, `Tester    required`, `Security Auditor    required`, as in `review/ROSTER`. No `added by` line |
| HIGH | Architect A-1, A-2, as one finding or two; Tester BD-007 (T-3 may be cited with it); Security Auditor S-2. All `WHERE` in `RefundService.java`. CAUSES and NEXT name BD-007, not T-3 alone |
| NEXT | `fix the code` for each blocker |
| Your checks | Report check `0 problems`. Proofs T1-A, T1-B, T1-C `FAIL`. Route `No optional rule matches` |

Non-blocking findings vary between runs: a Tester MEDIUM on a missing boundary test (T-1), an
Architect LOW on a third copy of the card lookup.

**Show.** Project tree, `review/REPORT.md`: VERDICT, CAUSES, ROSTER, COVERAGE, then FINDINGS.
Read the three HIGHs out loud:

- Architect: the domain imports the web adapter.
- Tester: the code accepts more than the redemption.
- Security Auditor: log `number.masked()`.

Then `review/runs/tester.md`. Its HIGH is in the report's FINDINGS with `RAISED BY Tester`.

**Ask.** "Your prediction?" Compare it with the roster and the three rules.

**Say**, after your proof check. "I ran one proof test per rule on this commit. All three
fail, one per blocker. The findings are real."

**Talking points.**

- Three roles, one pinned diff, started in the same second. None saw another's output.
- The builder did what the ticket asked. The reviewers found what the ticket broke, because
  each holds one file of rules.
- `review/` is excluded from Git: the review never changes the commit it reviews.

### Fix to PASS, and merge, 10 minutes

**Say.** "A confirmed blocker means fix the code."

**Do.** In the `builder` tab, the same session, paste:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. Change no file the findings do not name. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask.** "What should the fix leave alone?" Anything the findings do not name.

**Expected (up to 1 min 25 s):** a domain port, for example `RefundNotifier`,
that the webhook adapter implements; refunds capped at the redemption amount;
`number.masked()` in the log line; adjusted tests. 4 to 7 files. Still no read of `docs/`:
the builder gets the rules only through the findings.

**Show.** Commit tool window: the new port, and `RefundService.java` in the diff viewer. The
goodwill limit is gone. `number.value()` became `number.masked()`.

**Do.**

1. Commit: `GC-207 fix review findings`.
2. In the `review` tab, `/exit`, then `scripts/copilot-reviewer`, trust, and paste the same
   prompt:

```text
Run the multi-agent-review skill on this branch's changes against main.
```

**Ask.** "Prediction?" PASS, with the same three roles.

**Expected (up to 3 min 20 s):**

| Field | Value |
|---|---|
| VERDICT | `PASS` |
| CAUSES | `none` |
| ROSTER | the same three required roles |
| COVERAGE | all three `RUN RAN` |
| FINDINGS | MEDIUM and below, or none. Seen: Tester MEDIUMs on boundary tests (T-1, BD-003, BD-008), a Security Auditor MEDIUM S-5 on an unvalidated store id in a log line, an Architect LOW |
| NEXT | `none` |
| Your checks | Report check `0 problems`. Proofs T1-A, T1-B, T1-C `PASS` |

If it comes back FAIL with every reviewer at `RUN ERROR`, or with a new HIGH, see
[If something goes wrong](#if-something-goes-wrong).

**Ask.** "PASS. What does that claim?" Every required role ran, and no CRITICAL or HIGH is
open. "What does it not claim?" That the code is correct.

**Do. Merge.** Branch widget: `main`, **Checkout**. Then the widget again: `ticket-1`,
**Merge 'ticket-1' into 'main'**. A fast-forward. Leave the `review` session open.

## 36–42: Add the Primitive obsession role

**Do.**

1. Open `review-templates/R3-routing-rule.md`. "Two changes, both in the review setup.
   Neither touches source code."
2. Open `review-templates/primitive-obsession.agent.md`. Its remit: public signatures in the
   published API. Signatures outside `api` are outside it.
3. Project tree: select `review-templates/primitive-obsession.agent.md`, Cmd+C, select
   `.github/agents`, Cmd+V, OK.
4. Open `.github/skills/multi-agent-review/SKILL.md`. The participant copies the `| R3 |`
   row from `R3-routing-rule.md` and pastes it on the line under `| R2 |`. Save.
5. In the `review` tab, the session still open from ticket 1, paste:

```text
I added rule R3 and the primitive-obsession role to the skill. Run .github/skills/multi-agent-review/pin.mjs --route and show its output unchanged. Start no reviewer.
```

**Ask**, before the answer. "Prediction?" None: ticket 1 changed nothing in the `api`
package.

**Expected (up to 10 s):** the session runs the routing check on ticket 1's pin, which is
still in `review/`, and prints:

```text
Active rules: R1, R2, R3
No optional rule matches
```

Nothing is pinned and no reviewer starts. Your `route` check prints the same.

**Show.** The two lines. "R3 is active now, because its row is in the table. It matches
nothing in ticket 1, so the role would not join a review of it."

**Do.** Commit tool window on `main`: `.github/agents/primitive-obsession.agent.md` and
`SKILL.md`. Message `Add the primitive-obsession reviewer and rule R3`, Commit. Ticket 2
branches from this commit, so the role's files stay out of ticket 2's diff.

**Ask.** "Ticket 1 passed without this role. What did that PASS claim about primitives?"
Nothing: the role was not on the roster.

**Talking point.** A rule fires only on a diff it matches, so a new role costs nothing on a
diff it does not concern. Its absence is visible in the report: no role, no claim.

## 42–64: Ticket 2, GC-212 card expiry

### Read the ticket and the rules, 5 minutes

**Do.** Open `tickets/TICKET-2-card-expiry.md`, then each rule it breaks:

| Ticket line | Says | Rule | Where |
|---|---|---|---|
| 19 | Grace period 30 days, "replaces the old 14-day rule". PO, 2026-11-12 | BD-011: 14 days, Finance and Legal, 2025-03-04. BD-018: the Stores PO owns it from 2026-10-01 | `BUSINESS_DECISIONS.md:36`, `:38` |
| 21 | `balance` takes a `String`. `int daysUntilExpiry(String)` | P-2: no breaking change inside 1.x. CP-2: a card number is a `CardNumber`. CP-3: a length of time is a `Period` or `Duration` | `API_POLICY.md:40`, `CODE_PATTERNS.md:46`, `:48` |
| 22 | Keep `VERSION` at 1.4.0 | P-3: a new public method is a minor version. P-5: a ticket cannot waive P-2 or P-3 | `API_POLICY.md:47`, `:55` |
| 26, 27 | Add the column by editing `V1`, or drop and recreate | M-1: never edit an applied migration. M-2: never drop a table with data | `MIGRATION_PATTERNS.md:30`, `:34` |

Then `BUSINESS_DECISIONS.md` lines 8 to 22, rule 4: **Disputed**.

**Say.** "Rule 4 covers a ticket from the current owner, written after the decision, with
no entry superseding it. Remember it."

### Build, 6 minutes

**Do.**

1. Branch widget: **New Branch** `ticket-2`, from `main`.
2. In the `builder` tab, `/exit`, then:

   ```sh
   scripts/copilot-builder
   ```

   Trust the folder. Paste:

```text
Implement tickets/TICKET-2-card-expiry.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask**, while it builds. "Which of R1, R2 and R3 will fire, and on which line?" R1 and R3
on `balance(String)`, R2 on `V1`. "And the Tester?" BD-011 says 14 days, the ticket says 30,
and the ticket's author owns the rule now.

**Expected (up to 3 min 25 s):** 12 to 15 changed
files. The builder's summary says redemption is allowed through 30 days after expiry and
`GiftCards.VERSION` remains 1.4.0.

**Show.** Diff viewer, from the Commit tool window:

- `GiftCards.java`: `balance(String cardNumber)`, `int daysUntilExpiry(String)`, `VERSION`
  still `"1.4.0"`.
- `GiftCard.java`, `CardService.java` or `RedemptionService.java`: 30 days. In every run so far `CardService`
  also gained its own `int daysUntilExpiry(CardNumber)`, in `domain/`. "R3 covers the
  `api` package only. This one is outside it."
- `V1__create_cards.sql`: `expires_on DATE,` added inside the first migration. "V1 is
  applied in every environment."

### Review, 11 minutes

**Do.**

1. Commit: `GC-212 card expiry`.
2. In the `review` tab, `/exit`, `scripts/copilot-reviewer`, trust, paste:

```text
Run the multi-agent-review skill on this branch's changes against main.
```

3. `/tasks` when the reviewers start.

**Ask.** "Verdict?" FAIL, at least M-1 CRITICAL.

**Expected (up to 3 min 5 s):** the pin prints
`Active rules: R1, R2, R3`, a match line per rule, and a roster of six. Six reviewers start
in the same second. A dry run checks:

| Field | Value |
|---|---|
| VERDICT | `FAIL` |
| ROSTER | `review/ROSTER` unchanged: the three required roles, then `API compatibility    added by R1: +  public CardView balance(String cardNumber) {`, `Migrations    added by R2: <the first changed line of the migration>`, `Primitive obsession    added by R3: <a public api/ line with a raw primitive>`. The quotes depend on the build's diff |
| CRITICAL | Migrations M-1 at `V1__create_cards.sql` |
| HIGH | API compatibility P-2 (`balance(CardNumber)` removed; ACTION keeps `balance(CardNumber)`) and P-3 (`VERSION` 1.4.0). Separate findings: findings with different rule IDs are never merged, so P-2 and Primitive obsession's CP-2 stay apart too |
| HIGH | Tester, OBSERVED starts `DISPUTED: BD-011` |
| HIGH | Primitive obsession CP-2 (`String` card number) and CP-3 (`int` days) at `GiftCards.java`, one finding per signature, each ACTION one replacement signature |
| Architect, Security Auditor | No blocking finding. Security Auditor `RESULT NO FINDINGS`; the Architect may raise a MEDIUM, for example CS-2 on a test helper that imports the JDBC adapter |
| CAUSES | includes `BD-011: <path>` |
| DISAGREEMENTS | the BD-011 grace period |
| NEXT | `fix the code` lines, and `a human decides: BD-011: …` |
| Your checks | Report check `0 problems`. Proofs `all`: T1-A to T1-C `PASS`, T2-A to T2-E `FAIL`. Route: R1, R2 and R3 match |

Seen besides, non-blocking: an API compatibility MEDIUM P-4 (removed without deprecation). Its ACTION keeps the signature and asks for no `@Deprecated`.

**Show.** The report in the terminal, then `review/REPORT.md`. The roster first: "Each
optional role names the rule and the diff line that put it there. A script wrote those
lines." Then the CRITICAL, and the Tester's `DISPUTED:` finding.

**Say.** Read NEXT for BD-011 out loud. "That line is for you. The builder cannot settle it."

**Talking points.**

- Six reviewers on one diff, three of them because the diff said so.
- The proof for M-1 fails: an edited V1 changes its checksum, and production refuses to
  start. No test in the suite catches it. Only the Migrations reviewer had the rule.
- Two roles flag `balance(String)`. Hold that for the fix.

## 64–82: The human decision, then fix to PASS

### Decide, 6 minutes

**Do.** Open the evidence the builder never read: `tickets/TICKET-2-card-expiry.md:19`,
`docs/knowledge/BUSINESS_DECISIONS.md:36` (BD-011), `:38` (BD-018) and lines 8 to 22.

**Ask**, in this order, and do not answer any of them:

1. "Who owns the grace period today?" The Stores PO, under BD-018.
2. "Did the owner change BD-011 the way this file says a decision changes?" No. A ticket does
   not change a decision by itself.
3. "What would you need to see before shipping 30 days?" A new entry that supersedes BD-011.
4. "Which one do you ship today?"

**Do.** The participant states the decision in one or two sentences. Then, in the `review`
tab, the same session, paste it in this form. The scripted decision, used by every dry run:

```text
Do not run the review skill. Record this decision for BD-011 in review/DECISIONS.md: remove a last line that reads none, then append three lines: "DECISION  BD-011", then "DATE      " followed by today's date as YYYY-MM-DD, then "TEXT      BD-011 holds: the grace period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted." Then print review/DECISIONS.md.
```

**Expected (up to 15 s):** no skill, no reviewer and no pin. The session prints
`review/DECISIONS.md`, ending:

```text
DECISION  BD-011
DATE      <today>
TEXT      BD-011 holds: the grace period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted.
```

If it prints a one-line confirmation instead, open `review/DECISIONS.md` in the project tree.

**Say.** "Either answer is valid. You made this one, with the evidence, and it is written
down. Every reviewer and the reconciler read this file, and the pin keeps it."

If the participant chooses 30 days, put their words in the same prompt. That outcome has not
been rehearsed: see [the disputed item](facilitator/WRAPPER-RUNBOOK.md#the-disputed-item).

### Fix, 4 minutes

**Do.** In the `builder` tab, the ticket 2 session, paste:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. The human decision on the disputed BD-011 finding is in review/DECISIONS.md: follow it. Change no file the findings do not name. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask**, while it runs. "Two roles flagged `balance(String)`, with different actions. Do they
conflict?" No: `balance(CardNumber)` alone, with the `String` version removed, satisfies
both.

**Expected (up to 2 min):** V1 restored, a new V4
migration with `ALTER TABLE cards ADD COLUMN expires_on DATE;` (or `ADD` without `COLUMN`), the grace period 14 days,
`balance(CardNumber)` back with no `String` overload and no `@Deprecated`, a method taking a `CardNumber` and
returning `Optional<Period>` in place of `int daysUntilExpiry(String)` (named
`daysUntilExpiry` or `untilExpiry`), `VERSION` and `pom.xml` at 1.5.0. 7 to 11 files, one of
them the new migration. Its file name varies. A small change to a file no finding names,
such as an error message in `MigrationRunner.java` to suit a new test, has been seen once.
It is harmless: point it out, and leave it.

**Show.** Commit tool window: the V4 migration among the changes. Diff viewer on
`GiftCards.java`, and on `V1__create_cards.sql` (no change left).

### Review to PASS, and merge, 8 minutes

**Do.**

1. Commit: `GC-212 fix review findings; grace 14 days per BD-011`.
2. `review` tab: `/exit`, `scripts/copilot-reviewer`, trust, paste:

```text
Run the multi-agent-review skill on this branch's changes against main.
```

**Ask.** "Does R3 match now?" The `api` package uses `CardNumber` and `Period`. It should
not.

**Expected (up to 2 min 10 s):**

| Field | Value |
|---|---|
| VERDICT | `PASS` |
| ROSTER | `review/ROSTER` unchanged: three required, `API compatibility    added by R1: <a public line in api/>`, `Migrations    added by R2: +ALTER TABLE cards ADD COLUMN expires_on DATE;` (or `ADD` without `COLUMN`). **No Primitive obsession** |
| FINDINGS | None, or MEDIUM and below only. Seen: a Tester MEDIUM T-4 on a boundary test, an Architect MEDIUM on a test helper importing the JDBC adapter, a Migrations NIT M-5 on the V4 file name |
| DISAGREEMENTS | `none` |
| NEXT | `none` |
| Your checks | Report check `0 problems`. Proofs `all`: all eight `PASS`. Route: R1 and R2 match |

**Show.** `review/REPORT.md`: the roster and COVERAGE first, then the verdict. Then
`review/DECISIONS.md`.

**Do. Merge.** Checkout `main`, then Merge `ticket-2` into `main`.

**Talking points.**

- Primitive obsession joined ticket 2 when its rule matched, and left when the code no longer
  matched it. The diff decided both times.
- The decision closed the dispute: the Tester read it and raised nothing on 14 days.
- A MEDIUM does not block, and the fix prompt names blockers only, so MEDIUMs stay.

## 82–90: Close

**Do.** Git tool window (Cmd+9), Log tab. Six commits on `main`, seven or more if a ticket
needed a second fix round:

```text
GC-212 fix review findings; grace 14 days per BD-011
GC-212 card expiry
Add the primitive-obsession reviewer and rule R3
GC-207 fix review findings
GC-207 partial refund
Gift card service 1.4.0
```

**Ask**, one answer each:

1. "Ticket 1 passed without Primitive obsession. Ticket 2 needed it. What decided whether it
   ran?" The diff, through rule R3.
2. "Which finding would your team's current review have missed, and which knowledge file held
   the rule?" Often the edit to V1: M-1, in `MIGRATION_PATTERNS.md`.
3. "Name one rule you type into review prompts today. Which role owns it, and what would make
   its routing rule fire?"
4. Back to the tour: "How does your team decide a change is ready to merge?"

**What PASS claims.** Every required role ran on this pin, and no CRITICAL or HIGH is open
under this contract.

**What it does not claim.**

- That the code is correct. A role that is not on the roster made no claim.
- That every finding is real. The proofs, not the reviewers, showed that.
- That the report keeps the contract. The report check exists because a model writes it.

**For their repository.** Start with two roles and one knowledge file each, the rules the
team already repeats in reviews. Add an optional role when a diff pattern can name it.

**Afterwards.** In the facilitator terminal, `node "$F/fixture.mjs" audit "$RUN"` for the
record of the session. Feedback about the participant goes to the cockpit store with the
[log-a-session](../../../skillbook/log-a-session/SKILL.md) skill, never into the run directory
or this repository. Delete `$RUN`.

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Every reviewer `RUN ERROR`, VERDICT FAIL, CAUSES `missing coverage`, NEXT `rerun …` | The review session's `task` calls failed: `Invalid input: "prompt": Required` in the recording, `"name": Required` in one step 6 dry run | Missing coverage is the contract working. In the same review session, the rerun prompt below |
| Ticket 1's second review FAILs on a new HIGH | A reviewer flagged code the first review passed. Before the S-2 scope was written down, one dry run got an S-2 HIGH for echoing the caller's own `redemptionId` in an error | Run your proofs. If T1 all PASS and the HIGH is outside EXPECTED.md, it is unplanted: fix it anyway, with the same fix prompt, a commit and a fresh review. It adds about 4 minutes and a commit |
| Your report check flags a reviewer record: `runs/<role>.md … does not quote the pinned SHAs`, or a finding above its rule's maximum, such as an S-5 HIGH | That reviewer copied a SHA wrong, or overrated a rule. Seen once each in round 2 of the dry runs | Do not use the verdict. Same session: the record prompt below, with the role and the check's words. Reconcile-only is for report-level problems only |
| Your report check finds a ROSTER problem | The skill started other roles than `review/ROSTER`, or the reconciler did not copy it | Do not use the verdict. `/exit`, a fresh `scripts/copilot-reviewer`, and the roster prompt below |
| Report check finds a report-level problem: em dash, duplicated heading, role name, field padding, a CAUSES line not indented, a dispute not named by BD-011 | The reconciler drifted from the contract | Same session: the reconcile-only prompt below. The records stand. At most two reconciles: if the check still fails, `/exit` and run a fresh review |
| A WHERE outside the diff, or a record's finding missing from, listed twice in or changed in the report | The reconciler rewrote a path, merged findings under different rules, or repeated one. Seen once, in dry run 2d | Reconcile-only once. If the check still fails, `/exit` and run a fresh review |
| A folder-trust question at every session start | Each session has a new profile | Expected. Choose Yes |
| An approval question for a command other than the pin script | The model wants another command | Choose No. The review needs only the pin |
| The pin is refused: `denied due to … shell(node:*)` | The model put `node` in front of the pin script | Same session: the pin prompt below. Seen once in a smoke check, before the skill said "no `node` in front" |
| The pin stops with `Uncommitted changes` | The commit missed files | Commit tool window: tick Unversioned Files, commit, ask again |
| A builder's new file is missing from the commit | "Add silently" not set | Tick it under Unversioned Files. Set the option for next time |
| The builder asks to read an odd absolute path, for example one split mid-word | The model mangled a path | Choose No. It retries with the right path. Seen once, under `-p` |
| A proof already passes on the first build | The builder did not follow the ticket on that point | No finding is expected there. See [the builder deviation](facilitator/WRAPPER-RUNBOOK.md#if-the-builder-does-not-follow-the-ticket) |
| `No token` from a launch script | `gh` not signed in | `gh auth login` in that tab |
| Copilot cannot authenticate, or the model is unavailable | Network or service | [Offline fallback](facilitator/WRAPPER-RUNBOOK.md#offline-fallback). Say the builds are prepared patches |
| Still FAIL after a fix | A blocker remains | Same fix prompt, a new commit, a fresh review. At most three fix loops per ticket. Then debrief on the open findings |

The rerun prompt, recorded for ticket 1. Name the roles that ended `RUN ERROR`:

```text
The report says missing coverage: all three reviewers ended RUN ERROR. Rerun the architect, tester and security-auditor reviewers in parallel, as NEXT says, then reconcile.
```

Expected (recording 1 min 47 s): three reviewers start again, then the reconciler. PASS.

The record prompt, in the same review session. Fill in the role's agent name and the report
check's words, for example `review/runs/architect.md does not quote the pinned SHAs`:

```text
The report check found that review/runs/<role>.md <problem>. Rerun the <role> reviewer, then reconcile.
```

Expected (dry run 3b, 1 min 18 s): that reviewer alone, then the reconciler. Report check
`0 problems`.

The roster prompt, for a fresh review session:

```text
Run the multi-agent-review skill on this branch's changes against main. The last report check found the roster wrong. Start exactly the roles in review/ROSTER, and copy its lines into the report unchanged.
```

The pin prompt, in the same session:

```text
Run .github/skills/multi-agent-review/pin.mjs by its path, with nothing in front of it, then continue the review.
```

The reconcile-only prompt, in the same session:

```text
Reconcile only: start no reviewer, keep the records in review/runs/ as they are, and follow the contract's report format exactly.
```

The table of every FAIL cause and its action is in
[Acting on FAIL](facilitator/WRAPPER-RUNBOOK.md#acting-on-fail).

## Evidence

**Dry runs 1 to 3, 2026-11-24.** This guide end to end, three in parallel, each in a fresh
setup. The `-p` form of [facilitator/REHEARSAL.md](facilitator/REHEARSAL.md#the-guide-with--p),
Copilot CLI 1.0.114, `gpt-6-luna` for every session and subagent, macOS, JDK 21.0.9, Maven
3.9.16 offline, Node.js 24.14.0.

| Step | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Build ticket 1 | 4 min 48 s | 3 min | 2 min 55 s |
| Review | 2 min 45 s, FAIL as expected | 2 min 19 s, FAIL as expected | 2 min 5 s, FAIL as expected |
| Fix | 1 min 14 s | 1 min 24 s | 1 min 20 s |
| Review | 2 min 32 s, PASS | 3 min 17 s, PASS | 2 min 47 s, FAIL on an unplanted S-2 HIGH; after a second fix (58 s), 2 min 55 s, PASS |
| R3 question | 14 s, "None" | 11 s, "None" | 12 s, "None" |
| Build ticket 2 | 2 min 33 s | 3 min 24 s | 2 min 49 s |
| Review | 2 min 50 s, FAIL as expected | 2 min 39 s, FAIL as expected | 2 min 35 s, FAIL as expected |
| Decision | 10 s | 10 s | 13 s |
| Fix | 58 s | 1 min 45 s | 1 min 28 s |
| Review | 2 min 3 s, PASS | 2 min 9 s, PASS | 1 min 15 s, PASS with Migrations missing from the roster, report check 1 problem; the routing prompt then gave PASS in 2 min 36 s |
| Copilot time | 20 min 7 s | 20 min 18 s | 24 min 8 s |

In all three, every ID in EXPECTED.md came from the expected role at the expected severity,
every proof failed on the ticket-following head and passed after the fix, the builders
touched no knowledge file, persona scoping held, and no write landed outside `review/`.
Run 2's first ticket 1 review also ran `wc` and `rg` unasked.

What the dry runs changed, before any run of the changed version:

- The pin script now computes the roster from the rules and writes `review/ROSTER`. The skill
  starts those roles and the reconciler copies the lines. In run 3 the model had routed the
  final review itself and missed R2.
- `SECURITY.md` says S-2 covers card numbers and secrets only, and that echoing a caller's
  own identifier is at most S-5 MEDIUM. Run 1's S-5 MEDIUM on an unvalidated store id in a
  log line agrees with that wording.
- The Tester and the reconciler name a dispute by its decision, `BD-011`. In runs 1 and 3
  CAUSES named it `T-3`. The report check now requires `BD-011` in CAUSES and NEXT.
- API compatibility's P-2 ACTION keeps `balance(CardNumber)` and adds no overload. All three
  runs had suggested keeping both signatures; every builder still removed the `String` one.
- The report check flags a roster line that quotes a diff header (run 2), a roster that
  differs from `review/ROSTER`, and field labels off column 10 (runs 1 and 2).
- The R3 question runs the routing check. In all three runs Copilot had answered correctly
  without reading the diff.
- The decision prompt asks for the file to be printed. In all three runs the session had
  printed a one-line confirmation.
- The review session may run only the pin script, allowed by its path. About 40 read-only
  commands are denied by name. Checked with `-p`: `wc` and `node` refused, the pin and
  `--route` run. In a smoke review of the stand-in ticket 1 build, the model first wrote
  `node .github/…/pin.mjs`, was refused and stopped. The skill now says to run it by path
  with nothing in front. The rerun pinned by path and gave FAIL with the three HIGHs, the
  roster copied from `review/ROSTER`, report check 0 problems. The Mac slept during that
  rerun, so its time is not evidence.

**Dry runs 1b to 3b, 2026-11-24, round 2.** The same form, on the version with the changes
above. One fix round per ticket in all three, every ID from the expected role at the expected
severity, `review/ROSTER` identical to the report's ROSTER every time, BD-011 named in CAUSES
and NEXT, the P-2 ACTION keeping `balance(CardNumber)`, the routing check printing its two
lines, the decision printed whole, audits clean.

| Step | Run 1b | Run 2b | Run 3b |
|---|---|---|---|
| Build ticket 1 | 2 min 56 s | 3 min 4 s | 2 min 40 s |
| Review | 2 min 15 s, FAIL, plus an S-5 HIGH | 2 min 12 s, FAIL as expected | 2 min 9 s, FAIL as expected |
| Fix | 1 min 12 s | 1 min 5 s | 1 min 19 s |
| Review | 1 min 46 s, PASS | 1 min 48 s, PASS | 1 min 51 s, PASS |
| R3 question | 6 s | 7 s | 8 s |
| Build ticket 2 | 2 min 49 s | 2 min 34 s | 2 min 21 s |
| Review | 3 min 2 s, FAIL as expected | 2 min 29 s, FAIL as expected | 2 min 30 s, FAIL; the Architect's record dropped a character of the head SHA, report check 1 problem; the record prompt fixed it in 1 min 18 s |
| Decision | 12 s | 10 s | 12 s |
| Fix | 1 min 17 s | 1 min 59 s | 45 s |
| Review | 1 min 33 s, PASS | 1 min 30 s, PASS | 1 min 26 s, PASS |
| Copilot time | 17 min 8 s | 16 min 58 s | 16 min 39 s |

What round 2 changed, checked by `fixture.mjs verify` only: the report check rejects a
finding above its rule's maximum (S-5 came back HIGH twice, once in a step 6 dry run), the
pin writes the DIFF line into `review/PIN` for every record to copy, CAUSES lines are
indented to column 10, `fixture.mjs route` and `pin.mjs --route` print the same words,
Primitive obsession writes one ACTION per signature (2b's CP-2 and CP-3 ACTIONs disagreed on
`int` against `Optional<Period>`), and the decision prompt opens "Do not run the review
skill."

**Confirmation runs 1c and 2c, 2026-11-24.** Findings, rosters, verdicts, report checks,
proofs and audits as expected, one fix round per ticket, the new decision prompt closing the
dispute. Copilot time 12 min 46 s and 13 min 16 s. Three slips, fixed after them and checked
by `fixture.mjs verify` only:

- Both ticket 2 fixes put `@Deprecated` on the `balance(CardNumber)` they had restored,
  following a P-4 ACTION, once folded into P-2. P-2's ACTION now restores the signature and
  nothing else, P-4 never asks to deprecate a signature that stays, the fix prompts say
  "Fix only the CRITICAL and HIGH findings", and the T2-B proof fails on a deprecated 1.4.0
  signature.
- In 1c, CAUSES and NEXT named the Tester's BD-007 blocker `T-3` only. The contract, the
  reconciler and the report check now require the cited BD- decision, for every blocker.
- In 2c, an em dash from the Tester's record reached the report and needed the reconcile-only
  prompt. Every reviewer agent now writes no em dash, and the reconciler replaces any it
  copies.

**Rounds 1d and 2d, 2026-11-24.** 1d matched every Expected block with no recovery prompt,
in 11 min 39 s of Copilot time. 2d had every finding right and took 13 min 20 s, including
two reconcile-only prompts after ticket 2's first review.

| Step | Run 1d | Run 2d |
|---|---|---|
| Build ticket 1 | 2 min 7 s | 1 min 38 s |
| Review, FAIL | 1 min 25 s | 1 min 28 s |
| Fix | 33 s | 43 s |
| Review, PASS | 1 min 26 s | 1 min 30 s |
| R3 question | 7 s | 6 s |
| Build ticket 2 | 1 min 38 s | 1 min 30 s |
| Review, FAIL | 2 min 11 s | 2 min 2 s; report check 2 problems, then two reconciles, 2 min 8 s |
| Decision | 8 s | 11 s |
| Fix | 46 s | 41 s |
| Review, PASS | 1 min 18 s | 1 min 23 s |

Fixed after them, checked by `fixture.mjs verify` only:

- In a step 6 dry run of 1d, every reviewer `task` call was rejected with `"name": Required`
  and ended `RUN ERROR`. The skill now lists `name` among the four fields every call sets.
- In 2d, the reconciler rewrote a Tester WHERE to `api/CardService.java`. The first
  reconcile then merged P-4 into the P-2 HIGH, and the second listed a Primitive obsession
  finding twice. The reconciler now copies every WHERE verbatim, never merges findings with
  different rule IDs, and lists each finding once. The report check flags a finding listed
  twice, and a record's finding whose WHERE or rule IDs changed in the report. The guide
  allows two reconciles, then a fresh review.
- In 2d's step 6, the Architect gave A-1 and A-2 as two HIGHs. Step 6 now passes on three or
  four HIGHs from the expected rules.
- 2d's ticket 2 fix changed an error message in `MigrationRunner.java` that no finding named.
  The fix prompts now say "Change no file the findings do not name."

**IntelliJ recording, 2026-11-22.** IntelliJ IDEA 2025.3.6.1, Copilot CLI 1.0.114
interactive, `gpt-6-luna`, the same machine. The participant's typing and clicks were
automated and paced like a person. 19 clips, 56 minutes of screen time.

| Step | Time | Result |
|---|---|---|
| Build ticket 1 | 1 min 58 s | Followed the ticket |
| Review ticket 1 | 1 min 45 s | FAIL. A-1/A-2, BD-007, S-2 HIGH. Proofs T1 FAIL. Check 0 problems |
| Fix ticket 1 | 1 min 15 s | Port, cap, masked log |
| Review after the fix | 56 s | FAIL, all three `RUN ERROR`: missing coverage |
| Rerun the three | 1 min 47 s | PASS. Check 0 problems |
| Build ticket 2 | 2 min 4 s | Followed the ticket |
| Review ticket 2 | 2 min 16 s | FAIL. Six reviewers within 4 ms. M-1 CRITICAL; P-2, P-3, BD-011 `DISPUTED:`, CP-2 ×2, CP-3 HIGH. Check 0 problems |
| Record the decision | 14 s | `review/DECISIONS.md` with BD-011 |
| Fix ticket 2 | 1 min 22 s | V4, 14 days, `CardNumber`, `Optional<Period>`, 1.5.0 |
| Review after the fix | 1 min 57 s | PASS with Primitive obsession wrongly on the roster. Check 1 problem. Two more reviews, the last with a routing prompt: PASS, check 0 problems |

**Rehearsals A4, B4 and A5, 2026-11-20.** The same order with the `-p` launchers
(`builder-cli.mjs`, `review-cli.mjs`). Every blocking finding in EXPECTED.md came from the
expected role, and both tickets reached PASS after one fix round each.

> **TODO.** The 30-day decision has not been rehearsed. Windows is not covered: the launch
> scripts are bash. A live `RUN TIMEOUT` has not been seen. In interactive mode, whether the
> pin script runs with no approval question is unobserved: the recording used an older form.
