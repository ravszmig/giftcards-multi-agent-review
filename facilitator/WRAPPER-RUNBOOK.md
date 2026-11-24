# Multi-agent review · wrapper-command runbook

The same one-to-one as [FACILITATOR-GUIDE.md](../FACILITATOR-GUIDE.md), driven from one
terminal with the fixture's wrapper commands (`fx`, `build`, `review`) in place of IntelliJ
and interactive Copilot CLI. The session itself follows the guide. This runbook is for
rehearsals, for the [offline fallback](#offline-fallback), and for the reference tables the
guide links to: [the disputed item](#the-disputed-item), [Acting on FAIL](#acting-on-fail)
and the [facilitator key](#facilitator-key).

The participant works in one Git repository from the base commit, feature by feature. They
build two tickets with a Copilot CLI builder session, review each with the multi-agent
review stage, act on every FAIL, and add one reviewer role of their own. There are no
reference branches and no pre-seeded diff. Everything is synthetic: a gift card service
with no client code and no real data. It follows the
[intro deck](../../../../../together/06-multi-agent-review/slides.md).

The facilitator runs the clock, holds [facilitator/EXPECTED.md](EXPECTED.md),
and asks the questions. The participant drives the terminal and makes the one human
decision.

## What this is

Each ticket contradicts a knowledge file under `docs/knowledge/`. The builder never reads
those files, and each reviewer reads only its own, so each contradiction has one expected
reviewer. That makes the outcome of every review predictable enough to run in 90 minutes,
while every finding still comes from a live model reading a live diff.

| Step | Ticket | What happens | Optional roles |
|---|---|---|---|
| 1 | GC-207 partial refund | Build, review, FAIL on three HIGH, fix, rerun to PASS | none: R1 and R2 do not fire |
| 2 | GC-207, same pin | The participant adds the Primitive obsession role and rule R3, then shows with `fx route` that R3 does not match ticket 1's diff | none: R3 does not match |
| 3 | GC-212 card expiry, with a migration | Build, review, FAIL on CRITICAL and HIGH from four roles, one disputed item the participant decides, fix in one or two rounds to PASS | R1 API compatibility, R2 Migrations, R3 Primitive obsession |
| 4 | none | Debrief | |

Rehearsed in this order as A4 and B4: both tickets reached PASS after one fix round each.
See the [rehearsal record](#rehearsal-record).

### How it maps to the intro slides

| Slide | Claim | Where the participant sees it |
|---|---|---|
| 2 · One diff, several named roles | Every role reads the same pinned base and head | `fixture.mjs pin` writes `review/PIN`; every record and the report quote both SHAs, and the report check fails if one does not |
| 2 · On FAIL, two actions | Fix a confirmed blocker; a human decides a disputed one; nothing reruns automatically | Steps 1 and 2: every rerun is a command the participant types |
| 3 · Each reviewer starts fresh | No builder conversation, no peer findings, no source edits by the Tester | The builder and the review are separate CLI sessions with separate profiles. Reviewers run with `["read","search"]` only |
| 3 · Role knowledge | Each reviewer has its own instructions | [Knowledge scoping](#knowledge-scoping): each knowledge file has one reader, checked from the event log |
| 4 · Optional roles need a routing reason | A role is added only when a skill rule matches, and the report names the rule | Ticket 1 adds none. Step 2 shows R3 not matching ticket 1. Ticket 2 adds R1, R2 and R3 with their matched lines. The deck calls this role PrimitiveObsessionChecker; the fixture names it `primitive-obsession` |
| 5 · The review contract | Run status, finding fields, one report | [base/REVIEW-CONTRACT.md](../base/REVIEW-CONTRACT.md), `review/runs/*.md`, `review/REPORT.md` |
| 6 · PASS or FAIL | PASS needs every required role RAN and no open CRITICAL or HIGH. PASS makes no correctness claim | Ticket 2 reaches PASS only once the Primitive obsession findings are fixed too; ticket 1's PASS made no claim about primitives because the role was not there |
| 7 · Parallel review | Reviewers start together; a TIMEOUT is missing coverage | The launcher's subagent timeline. TIMEOUT is stated as the coverage rule, not shown live: see [Acting on FAIL](#acting-on-fail) |
| 8 · The skill or `/fleet` | The skill sets the split | The skill starts each reviewer with `task` and says "You do not use `/fleet`" |

### Layout

| Path | What it is | Who opens it |
|---|---|---|
| [base/](../base/) | The gift card service: 26 classes, 44 tests, migrations V1 to V3 | participant |
| [base/tickets/](../base/tickets/) | GC-207 and GC-212 | participant, builder |
| [base/AGENTS.md](../base/AGENTS.md) | Build, layout, conventions, how to implement a ticket. Names no knowledge file | participant, builder |
| [base/docs/knowledge/](../base/docs/knowledge/) | Nine knowledge files, one reader each | reviewers; the participant during the decision |
| [base/.github/](../base/.github/) | The skill with rules R1 and R2, its pin script, five reviewers, the reconciler | review session, participant |
| [base/scripts/](../base/scripts/) | `copilot-builder` and `copilot-reviewer`: the interactive sessions of the guide | participant |
| [base/review-templates/](../base/review-templates/) | The step 2 role and rule R3, inactive until step 2 | participant, step 2 |
| [facilitator/](./) | `EXPECTED.md`, `REHEARSAL.md`, proof tests, patches for `verify` and the offline fallback | facilitator only |
| `fixture.mjs` | setup, start, commit, pin, decide, route, proofs, finish, add-role, audit, verify | |
| `builder-cli.mjs` | The builder session: `ticket <n>`, `fix [--decision]`, `prompt <file>` | |
| `review-cli.mjs` | `review`, `reconcile`, `rerun <agent>`, `check` | |
| `report-check.mjs` | Mechanical check of a report: pin SHAs, roster against the rules, every finding kept, verdict | |

`setup` copies `base/` only. Nothing under `facilitator/` reaches the participant's
repository.

## Controls

What is enforced by the CLI, and what is only an instruction that a script checks after
the run. None of this is an OS sandbox.

| Control | Where | Kind | Checked after the run by |
|---|---|---|---|
| Builder sees no knowledge file named | `AGENTS.md` | instruction | `verify`: `AGENTS.md` names no knowledge file and there is no `copilot-instructions.md` |
| Builder cannot read `docs/` | `builder-cli.mjs`: `--deny-tool=read(<workspace>/docs/**)` | permission rule | builder summary: `Knowledge files touched by the builder`, `Calls naming docs/` |
| Builder cannot commit, start a subagent or use a skill | `--deny-tool=shell(git commit)`, `--excluded-tools=task,skill,…` | permission rule, hidden tools | builder summary: `HEAD unchanged: yes` |
| Builder shell use | `--allow-tool=shell(mvn:*)`, `shell(git status)`, `shell(git diff)`, `shell(ls)` approve commands that change state; the deny rules block `git commit`, `push`, `reset`, `checkout`, `stash` | permission rule, **not an allowlist**: Copilot CLI runs any command it recognises as read-only without asking (`copilot help permissions`), so `git show HEAD^:<file>`, `cat` or `grep` run too. A5's builder ran `git show`. The `docs/` deny covers the `read` tool only, not shell | builder summary: `Calls naming docs/` counts shell calls too |
| Reviewer reads only its own knowledge files | `## Knowledge` in each agent file | **instruction only**: a reviewer's `read` tool can open any file | review summary: `Persona scoping: held` or `VIOLATED`, from every tool call in the session event log |
| Reviewers cannot edit or run anything | `tools: ["read", "search"]` in each agent file | tool list | review summary prints each subagent's tools |
| The review writes only under `review/` | `--allow-tool=write(review/**)` with `-p`, which cannot ask | permission rule | `Files changed outside review/: none` and `Writes landed outside review/: none`; the launcher exits 3 if a write landed. A refused attempt prints a `WARNING` line and does not fail the run |
| Roster follows R1 to R3 | `fixture.mjs pin` (or the skill's `pin.mjs`) applies the rules in code and writes `review/ROSTER`; the skill starts those roles and the reconciler copies the lines | code, then instruction | report check: the report's ROSTER equals `review/ROSTER`, each quote is an added or removed diff line, and the rules agree |
| Verdict follows the contract | reconciler, applied by the model | instruction | report check: `contract rule gives <verdict>` |
| Report format | reconciler and contract: canonical role names, one heading each, `WHERE <path>:<line>` only, no em dash | instruction | report check. The last line of every review is `REPORT CHECK: N problems`; with N above 0 the launcher exits 4. Exit codes: 0 usable, 3 a write landed outside `review/`, 4 the report failed its check: run `review reconcile` only |

In rehearsals A2 and B2 every builder summary reported `Knowledge files touched by the
builder: none` and `HEAD unchanged: yes`.

## Preparation, the morning of

Node.js 22 or later, Git, Java 21, Maven 3.9 with `~/.m2` populated (every build runs
`mvn -o`), Copilot CLI 1.0.114 or later, and `gh` signed in. In one terminal, from the
repository root:

```sh
F="$PWD/forge/demos/demo-fixtures/multi-agent-review"
node "$F/fixture.mjs" verify "$HOME/mar-java-verify-$(date +%Y%m%d-%H%M)"
```

It takes about 25 s and must end `Verify passed`. Any other output: stop and use the
offline fallback.

**Dry run on the participant's model.** Models change between rehearsals, and AGENTS.md
asks for every demo to run the morning of on the model the audience uses. In a scratch run
directory, run step 1 to its first report (build, commit, pin, review) and check it against
[EXPECTED.md](EXPECTED.md#expected-outcome-per-step). About 15 minutes,
estimated.

**Builder instruction in force.** `AGENTS.md` tells the builder to implement only what the
ticket or the pasted findings ask, and to add no validation or rule nobody asked for.
Rehearsal C showed the builder follows the ticket without being told to implement it as
written, so that line is gone. In C the builder invented a store-id format check, which
the second line now forbids.

**Model.** `--model <id>` is honoured by Copilot CLI 1.0.114 here, with no admin policy
forcing `auto` (checked 2026-11-20 with `gpt-6-luna` and `gpt-6.2-sol`), and subagents
inherit the session model. Rehearsals A to C ran on `auto`, which put builder fixes on
`gpt-6.1-sol` or `gpt-6.2-sol` and reviews on `gpt-6-luna`. Pin one model for every builder
and review run, the one the participant will use.

**Set up the session.** The run directory must be new, outside this repository and
outside `/tmp`. Paste this block into the terminal the participant will use. The
functions work in zsh and bash.

```sh
F="<repository root>/forge/demos/demo-fixtures/multi-agent-review"
RUN="$HOME/mar-java-1to1-$(date +%Y%m%d-%H%M)"
W="$RUN/workspace"
MODEL_ARGS=(--model gpt-6-luna)      # the participant's model; one model for every run
export COPILOT_GITHUB_TOKEN="$(gh auth token)"
fx()     { local c=$1; shift; node "$F/fixture.mjs" "$c" "$RUN" "$@"; }
build()  { node "$F/builder-cli.mjs" "$RUN" "$@" "${MODEL_ARGS[@]}"; }
review() { node "$F/review-cli.mjs" "$RUN" "$@" "${MODEL_ARGS[@]}"; }
fx setup
```

`fx setup` prints `base <sha> (tag base, branch main)`. The commit has a fixed author and
date, so the SHA is the same on every macOS or Linux machine set up from the same `base/`.
It changes whenever any file in `base/` changes, so compare it with a colleague's setup
rather than with a value written down here. Open `$W` in the participant's editor. Never open `$F/facilitator/` on the shared
screen.

The token goes to each Copilot process through its environment and is never written to a
file. Every Copilot run uses a disposable profile under `$RUN/attempts/NN-*/profile`, so no
personal setting, skill or login reaches it. Builder runs time out after 15 minutes, review
runs after 25; `--timeout <minutes>` overrides.

Keep a second terminal of your own with the same variables, for proofs and for the
offline fallback.

## Run of show

Machine time, measured in rehearsals A4 and B4 of this order on `gpt-6-luna`: about 6.5
minutes for ticket 1 (build 110 to 120 s, review 85 to 105 s, fix 55 to 85 s, review 100 to
105 s) and 7 to 8 for ticket 2 with one fix round (build 120 to 150 s, review 135 to 155 s,
fix 75 to 90 s, review 75 to 85 s). A second round, not needed in either run, adds about
3. Step 2 has no model call. Pins and proofs add
about 20 s each. Everything else is the participant reading reports and deciding. Ticket 2
now carries four roles' findings, so it gets the most time.

| Minutes | Step | Participant | Facilitator |
|---|---|---|---|
| 00–08 | Open | Opens `AGENTS.md`, `REVIEW-CONTRACT.md`, the skill and `tester.agent.md`. Names the required roles, R1, R2 and the verdict rule | Maps the session onto slides 2 to 6. Points at `## Knowledge` in one agent file |
| 08–14 | 1 · Build GC-207 | Reads the ticket while the builder runs, about 2 minutes. Writes down, privately, what each required role will find | Starts the builder |
| 14–24 | 1 · Review | Commits, pins, runs the review (about 2 minutes), reads the launcher summary and the report. Checks one record against the report | Runs proofs in their own terminal. Compares the report with EXPECTED.md |
| 24–32 | 1 · Fix to PASS | Confirms the blockers, runs the builder fix, commits, pins, reruns to PASS (about 3 minutes of machine time), merges | Shows proofs as confirmation. Enforces the three-loop limit |
| 32–40 | 2 · Add R3 | Copies the role, adds the R3 row by hand, runs `fx route` on ticket 1's pin: no match. Commits on main | Checks the edit with `fx route`. Has `fx add-role` ready |
| 40–46 | 3 · Build GC-212 | Reads the ticket while the builder runs, about 2 minutes. Predicts which of R1, R2 and R3 fire | Starts the builder. At minute 44 with no result, switches to the stand-in build |
| 46–58 | 3 · Review | Commits, pins, reads the routing line, runs the review (about 2 minutes), reads a report with four roles' findings | Checks R1, R2 and R3 on the roster with their matched lines |
| 58–80 | 3 · Decide and fix | Reads both sources for the disputed item, decides, records it with `fx decide`, runs the fix with the decision, reruns; a second round if needed (about 3 minutes of machine time each) | Asks the decision questions. Does not decide. Enforces the three-loop limit |
| 80–90 | 4 · Debrief and close | Answers the debrief questions | Unsets the token, files feedback, deletes the run directory |
| **Total** | | | **90** |

If step 1 ends after minute 36, do step 2 with `fx add-role` instead of the hand edit. If
ticket 2 still fails at minute 80, stop the loop and debrief on the open findings: the
report says what a third round would fix.

## Steps

Every command runs in the session terminal set up above.

### 00–08 · Open

The participant opens, in this order:

1. [AGENTS.md](../base/AGENTS.md). It is all the builder reads besides the ticket.
2. [REVIEW-CONTRACT.md](../base/REVIEW-CONTRACT.md): the run status block, the finding block,
   the severity table, and the two verdict lines under the report format.
3. [.github/skills/multi-agent-review/SKILL.md](../base/.github/skills/multi-agent-review/SKILL.md):
   the three required roles, rules R1 and R2, "Start every reviewer at once", "Record every
   status".
4. [.github/agents/tester.agent.md](../base/.github/agents/tester.agent.md): the remit, the
   `tools` line, and `## Knowledge`.

Ask: "Which file does the builder never see, and why does that matter for the review?"

### 08–14 · Step 1: build GC-207

```sh
fx start 1
build ticket 1
```

While it runs, the participant reads
[TICKET-1-partial-refund.md](../base/tickets/TICKET-1-partial-refund.md) and writes down which
roles R1 and R2 add, and what each required role will report. Keep it private until the
report.

Expected builder summary: `Knowledge files touched by the builder: none`,
`HEAD unchanged: yes`, a working tree with changes under `src/`. The builder's last message
is in `$RUN/attempts/01-build-ticket-1/final-message.md`. Read it now if the builder was
told to say what looked wrong.

### 14–24 · Step 1: review

```sh
fx commit "GC-207 partial refund"
fx pin
review
```

`fx pin` runs the suite and prints `CI: exit 0` and `Routing (R1, R2): no optional role`.
The participant opens `review/PIN`, `review/diff.patch` and `review/ci-results.txt`.

The review takes about 72 to 108 s, estimated. Read the launcher summary top to bottom:

- `Subagents`: Architect, Tester and Security Auditor start in the same second, then the
  reconciler. `Reviewers overlapped in time: yes`.
- `Knowledge files read, by agent`, then `Persona scoping: held`.
- `Files changed outside review/: none`.
- `Report check: … 0 problems`.

Then `review/REPORT.md`. Expected: VERDICT FAIL, a HIGH from each required role.

| ID | Role | Rule | What it says |
|---|---|---|---|
| T1-A | Tester | BD-007 | The £50.00 goodwill allowance lets refunds exceed the redemption |
| T1-B | Security Auditor | S-2 | The audit log line carries the full card number |
| T1-C | Architect | A-1, A-2 | `RefundService` in the domain calls the webhook adapter |

The participant opens one file in `review/runs/` and finds each of its findings in
FINDINGS, with that role under RAISED BY. Then each `WHERE` against the file: in the Node
fixture's rehearsals they drifted by up to three lines. Compare with the prediction.

In your own terminal, now: `fx proofs 1`. Expected: T1-A, T1-B and T1-C `FAIL`.

### 24–32 · Step 1: fix to PASS

Show the proofs output: each failing proof confirms one blocker. Slide 6: a confirmed
blocker means fix the code.

```sh
build fix
fx commit "GC-207 fix review findings"
fx pin
review
```

`build fix` pastes FINDINGS, DISAGREEMENTS and NEXT from the report into a new builder
session, and nothing else. Expected: VERDICT PASS, the same three roles, no optional role.
MEDIUM and below may remain: they do not block. `fx proofs 1` gives three `PASS`.

If the verdict is still FAIL, repeat the four commands, at most three loops in total. Then
merge:

```sh
fx finish
```

Ask: "PASS. What does that claim, and what does it not?"

### 32–40 · Step 2: add the Primitive obsession role

The participant makes both edits by hand, following
[review-templates/R3-routing-rule.md](../base/review-templates/R3-routing-rule.md):

```sh
cp "$W/review-templates/primitive-obsession.agent.md" "$W/.github/agents/"
# add the R3 row under R2 in $W/.github/skills/multi-agent-review/SKILL.md
fx route
```

`fx route` reads ticket 1's pin, still in `review/`. Expected: `Active rules: R1, R2, R3`
and `No optional rule matches`. Slide 4: a rule fires only on a diff it matches, so a new
role costs nothing on a diff it does not concern. If the edit is wrong, reset and use the
script:

```sh
git -C "$W" checkout -- .github && git -C "$W" clean -fd -- .github && fx add-role
```

Then commit on `main`, so ticket 2 branches from it and the role's files stay out of
ticket 2's diff:

```sh
fx commit "Add the primitive-obsession reviewer and rule R3"
```

No review rerun on ticket 1's head: the roster comes from the same diff and would not
change, and the run costs about 2 minutes. Ask instead: "Ticket 1 passed without this role.
What did that PASS claim about primitives?" Nothing: the role was not on the roster.

### 40–46 · Step 3: build GC-212

```sh
fx start 2
build ticket 2
```

The participant reads [TICKET-2-card-expiry.md](../base/tickets/TICKET-2-card-expiry.md) and
predicts which of R1, R2 and R3 fire, and on which line.

At minute 44 with no builder result, stop it with Ctrl-C and use the stand-in build from
the [offline fallback](#offline-fallback). Say aloud that it is a prepared patch.

### 46–58 · Step 3: review

```sh
fx commit "GC-212 card expiry"
fx pin
review
```

`fx pin` prints `Routing (R1, R2, R3): R1, R2, R3` and the first matching line for each.
Expected report: VERDICT FAIL, roster of six, R1, R2 and R3 named with their lines.

| ID | Role | Severity | Rule | What it says |
|---|---|---|---|---|
| T2-A | Migrations | CRITICAL | M-1, M-2 | `V1__create_cards.sql` is applied everywhere and was edited, or `cards` is dropped |
| T2-B | API compatibility | HIGH | P-2 | `balance(CardNumber)` was replaced: 1.x callers break |
| T2-D | API compatibility | HIGH | P-3, P-5 | New public method, `VERSION` still `1.4.0`. May be merged with T2-B |
| T2-C | Tester | HIGH, `DISPUTED:` | BD-011 against the ticket | 30 days against 14. Under DISAGREEMENTS too; NEXT reads "a human decides" |
| T2-E | Primitive obsession | HIGH | CP-2, CP-3, CP-4 | `balance(String)` and `int daysUntilExpiry(String)` in the published API. ACTION names `CardNumber` and `Period` or `Duration` |

Architect and Security Auditor report no blocking finding. Your terminal:
`fx proofs all`. Expected: T1 `PASS`, T2-A to T2-E `FAIL`.

### 58–80 · Step 3: decide and fix

Run the decision as in [The disputed item](#the-disputed-item). Then, with the
participant's decision in their own words:

```sh
fx decide BD-011 "<the participant's decision, one or two sentences>"
build fix --decision "<the same decision>"
fx commit "GC-212 fix review findings; <decision in five words>"
fx pin
review
```

`fx decide` writes `review/DECISIONS.md`. Every reviewer and the reconciler read it, and
`fx pin` keeps it across re-pins of the same branch. A recorded decision closes the
dispute: code that matches it gets no finding, and nobody disputes it again.

Two roles flag `balance(String)` and their ACTIONs read differently. API compatibility says
keep the 1.4.0 signature `balance(CardNumber)`; Primitive obsession says take a
`CardNumber`, not a `String`. If the participant reads them as a conflict, point out that
`balance(CardNumber)` alone, with `balance(String)` removed, satisfies both. Neither asks for
the `String` overload.

`build fix` pastes the findings, so the T2-E fix reaches the builder as the finding's
own words: the rule ID in OBSERVED and the replacement type in ACTION. The builder never
reads `CODE_PATTERNS.md`.

Expected, for the 14-day decision, after one or two rounds: VERDICT PASS, `fx proofs all`
gives T2-A to T2-E `PASS`. The roster keeps R1 and R2. R3 covers the `api` package only, so
Primitive obsession leaves the roster once no `api/` signature carries a raw primitive. For
a second round run `build fix` without `--decision`: the decision is already recorded and
in the code. At most three rounds in total. Then:

```sh
fx finish
```

### 78–90 · Debrief and close

Ask, and take one answer each:

1. "Ticket 1 passed without Primitive obsession, ticket 2 needed it. What decided whether
   it ran?" The diff, through rule R3.
2. "Which finding would your team's current review have missed, and which knowledge file
   held the rule?"
3. "Name one rule you type into review prompts today. Which role owns it, and what would
   make its routing rule fire?"
4. "Where did the builder's own final message agree with a reviewer?"

Close:

```sh
unset COPILOT_GITHUB_TOKEN
rm -rf "$RUN"
```

Feedback about the participant goes to the cockpit store with the
[log-a-session](../../../../skillbook/log-a-session/SKILL.md) skill, never into the run
directory or this repository.

## The disputed item

T2-C is built to be disputed. The Tester reports it at HIGH with OBSERVED beginning
`DISPUTED:`, and the reconciler lists it under DISAGREEMENTS with NEXT "a human decides".
It counts towards FAIL until a human decides.

The participant opens the evidence. The knowledge file is open to a human, unlike to the
builder.

| Source | Line | Says |
|---|---|---|
| Ticket GC-212 | `tickets/TICKET-2-card-expiry.md:19` | 30 days. Written by the Stores PO on 2026-11-12. "Legal agreed 30 days on the call of 2026-11-10" |
| BD-011 | `docs/knowledge/BUSINESS_DECISIONS.md:36` | 14 days. Finance and Legal, 2025-03-04 |
| BD-018 | `docs/knowledge/BUSINESS_DECISIONS.md:38` | The Stores PO owns grace periods from 2026-10-01 and records each change in this file |
| How a decision changes | `docs/knowledge/BUSINESS_DECISIONS.md:8-22` | The owner changes a decision by adding an entry that supersedes it. A ticket does not change a decision by itself. Rule 4 is why this one is disputed |

Ask, in this order, and do not answer any of them:

1. "Who owns the grace period today?"
2. "Did the owner change BD-011 the way the file says a decision changes?"
3. "What would you need to see before shipping 30 days?"
4. "Which one do you ship today?"

The participant states the decision in one or two sentences. Either outcome is valid; the
point is that a person made it, with the evidence, and recorded it.

**14 days, BD-011 holds.** The scripted outcome, matching
[EXPECTED.md](EXPECTED.md#contradictions). For example: "BD-011 holds: the grace
period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted." Record it
with `fx decide BD-011 "…"` and pass the same text with `build fix --decision`. `GracePeriodProofTest` passes on the fixed head.

**30 days, the ticket holds.** Record it the same way:
`fx decide BD-011 "The ticket holds: 30 days, decided by the Stores PO under BD-018."`, then
`build fix --decision` with the same text. The decision closes the dispute, so the Tester
gives no finding on 30 days. `GracePeriodProofTest` fails on that head, which is correct:
the proof shows which reading the code follows. It does not decide.

> **TODO.** The 30-day outcome has not been rehearsed. Whether the Tester accepts the
> recorded 30-day decision with no finding, and the rerun reaches PASS, is unobserved.
> Rehearse it once, then replace this block with the result.

## Acting on FAIL

The report's CAUSES and NEXT say which action applies. Nothing reruns automatically: each
action is a command the participant types. Every code change is a new commit and a new pin;
a review is always of a pin, never of a working tree. Superseded pins are kept in
`$RUN/pins/`.

| Cause | Action | Command | Shown live |
|---|---|---|---|
| Blocking finding, confirmed | Fix the code | `build fix`, `fx commit`, `fx pin`, `review` | steps 1 and 2 |
| Blocking finding, `DISPUTED:` | A human decides, records it, then fix | `fx decide <ID> "…"`, `build fix --decision "…"` | step 2 |
| Missing coverage: a required role at TIMEOUT, ERROR or NOT RUN | Rerun that reviewer only | `review rerun <agent>` | ERROR, in the 2026-11-22 recording; TIMEOUT no |
| `REPORT CHECK: N problems`, launcher exit 4 | Do not use the verdict. The records stand; rewrite only the report | `review reconcile` | only if it happens |

**TIMEOUT, as the coverage rule.** The skill stops a reviewer that has not returned after
10 minutes and writes `RUN TIMEOUT` in its record. The contract counts TIMEOUT and ERROR as
missing coverage: they say nothing about the code. So a review with a timed-out Tester is
FAIL even with no finding at all, and the action is `review rerun tester`, which overwrites
only the Tester's record and reconciles again. The other records stand. This is slide 7.
No reviewer in any rehearsal or in the recording took longer than 60 s, so TIMEOUT has not
been seen live. ERROR has: in the 2026-11-22 recording, every reviewer of ticket 1's second
review ended `RUN ERROR`, the report said FAIL on missing coverage, and a rerun of the three
gave PASS. See [FACILITATOR-GUIDE.md](../FACILITATOR-GUIDE.md#if-something-goes-wrong).

Stop after three fix loops on one ticket, and debrief on why the builder and the reviewers
disagree. If `build fix` changes nothing (`git -C "$W" status` is clean), skip the commit
and say so. If the launcher prints `Persona scoping: VIOLATED`, a reviewer read a file
outside its list: treat any finding citing that file as unscoped, and record it.

### If the builder does not follow the ticket

The tickets are written so that a ticket-following build trips every contradiction. A
builder may refuse a point instead. Your proofs show it: a proof that already passes on the first build means the
builder did not follow the ticket on that point. The matching finding does not appear, and
that is a builder deviation, not a review miss.

- Ask the participant to find the point in the builder's `final-message.md` and in the
  diff. The decision moved from the review to the builder, with no record of who made it.
- If every step 1 proof passes, the first review may PASS. Skip the fix loop and spend the
  time on the step 2 decision.
- If the builder chose 14 days on its own, T2-C is not disputed in the report. Run the
  decision from the table anyway: the participant decides whether the builder was entitled
  to choose.

## Offline fallback

**Fallback only.** The live session never uses these patches and has no reference
branches. Use it when Copilot CLI cannot authenticate or the model is unavailable. Say before showing
anything that the builds are prepared patches and that no model reviews anything. Routing,
the suite and the proofs run on the participant's machine as normal.

In place of `build ticket <n>`, the facilitator applies the ticket-following stand-in build from `facilitator/reference/`:

```sh
git -C "$W" apply "$F/facilitator/reference/ticket-1-naive.patch"     # ticket-2-naive for step 2
```

In place of `build fix`, revert it and apply the knowledge-following patch:

```sh
git -C "$W" apply -R "$F/facilitator/reference/ticket-1-naive.patch"
git -C "$W" apply "$F/facilitator/reference/ticket-1-reference.patch"
```

`fx commit`, `fx pin`, `fx proofs`, `fx finish`, `fx add-role` and `fx route` work as in
the live steps. In place of each `review`, the participant takes one role on the roster,
reads only that role's knowledge files from the table below, and writes its record in the
contract format to `review/runs/<agent>.md`. Then compare it with the proofs. The
reference patch for ticket 2 uses 14 days, so the 30-day outcome cannot be shown offline.

This whole sequence was run on 2026-11-20 and gave the proofs in the
[deterministic checks](#deterministic-checks). It uses the patches the live session never
does; that is the only time the participant sees them.

> **TODO.** No recorded review ships for the fallback. Add the A2 reports under
> `prepared/`, each first line `PREPARED`, with a check in `verify` that every prepared
> file is labelled.

## Facilitator key

Full citations, checked by `verify`, are in
[EXPECTED.md](EXPECTED.md#contradictions). The fix column describes the
knowledge-following patch in `facilitator/reference/`.

| ID | Ticket line | Rule | Reviewer | Severity | Proof | The fix |
|---|---|---|---|---|---|---|
| T1-A | `TICKET-1:27` goodwill up to £50.00 above | BD-007 | Tester | HIGH | `RefundLimitProofTest` | Cap refunds at the redemption amount |
| T1-B | `TICKET-1:28` full card number in the log | S-2 | Security Auditor | HIGH | `RefundLoggingProofTest` | Log `number.masked()` |
| T1-C | `TICKET-1:29` webhook from the domain | A-1, A-2 | Architect | HIGH | `LayeringProofTest` | Notify from the handler, not from `RefundService` |
| T2-A | `TICKET-2:26-27` edit V1, or drop and recreate | M-1, M-2 | Migrations (R2) | CRITICAL | `AppliedMigrationsProofTest` | New `V4__add_expiry_to_cards.sql`, `ADD COLUMN` |
| T2-B | `TICKET-2:21` `balance` takes a `String` | P-2 | API compatibility (R1) | HIGH | `ApiCompatibilityProofTest` | Keep `balance(CardNumber)` |
| T2-D | `TICKET-2:22` keep `VERSION` at 1.4.0 | P-3, P-5 | API compatibility (R1) | HIGH | `ApiCompatibilityProofTest` | `VERSION` and `pom.xml` to 1.5.0 |
| T2-C | `TICKET-2:19` 30 days | BD-011, BD-018, disputed | Tester | HIGH | `GracePeriodProofTest` shows the reading, does not decide | `GRACE_DAYS = 14`, or BD-019 and 30 |
| T2-E | `TICKET-2:21` `String` in, `int` out | CP-2, CP-3, CP-4 | Primitive obsession (R3), from step 2 | HIGH | `PrimitiveSignatureProofTest` | `untilExpiry(CardNumber)` returning `Optional<Period>`, `balance(CardNumber)` only, `Period GRACE` |

R1 and R2 must not fire on ticket 1: `TICKET-1:31` keeps refunds out of `GiftCards`, and
`TICKET-1:25` says no schema change. If the builder adds refunds to `GiftCards` anyway, R1
matches, API compatibility is rightly on the roster, and it is a builder deviation.

## Knowledge scoping

Each knowledge file has one reader: the table is in [the README](../README.md#who-reads-what).
`fixture.mjs verify` checks it against the agent files, and `review-cli.mjs` checks it against
what each subagent opened, from the session event log. The builder reads `AGENTS.md` and the
ticket, and is denied `docs/`. The skill's main agent reads no knowledge file.

## Deterministic checks

`node fixture.mjs verify <new directory>` runs all of these with no Copilot call and stops
at the first mismatch. Last run 2026-11-24, macOS, Node.js 24.14.0, Maven 3.9.16, Java
21.0.9: 26 s, `Verify passed`.

| Check | Result |
|---|---|
| Builder scope | `AGENTS.md` names no knowledge file; no `copilot-instructions.md` |
| Persona scoping | 9 knowledge files, each read by exactly one of 7 agents; the README's table matches |
| Knowledge locators | 182 `path:line` references resolve |
| Facilitator key | 30 citations in EXPECTED.md match their lines |
| Voice | No em dash in 87 fixture files, this runbook and the guide among them |
| Base suite | exit 0, 44 passed, 0 failed; 26 production classes, 17 test classes |
| Ticket 1, ticket-following | CI 48 passed; no optional role, none with R3; T1-A, T1-B, T1-C `FAIL` |
| Ticket 1, knowledge-following | CI 48 passed; no optional role; T1-A, T1-B, T1-C `PASS` |
| Ticket 2, ticket-following | CI 52 passed; R1, R2, R3; T1 `PASS`, T2-A to T2-E `FAIL` |
| Ticket 2, knowledge-following | CI 52 passed; R1, R2, no R3: no raw primitive left; T2-A to T2-E `PASS` |
| Report check, ticket 1 | Flags a dropped finding, a PASS with a HIGH open, an optional role with no matching rule, a WHERE outside the diff, "a human decides" without a disagreement and the reverse, an open blocker missing from CAUSES, a blocker on a rule `review/DECISIONS.md` closed |
| Report check, format | Flags an em dash, a duplicated heading, a non-canonical role name or roster form, a field label off column 10, a dispute not named by its BD- decision in CAUSES and NEXT, a finding above its rule's maximum severity, a CAUSES line not indented to column 10 |
| Severity caps | The 11 ceilings the report check enforces, such as S-5 MEDIUM and CS-4 LOW, match the severity each rule's text states |
| Decisions | `decide BD-011` writes `review/DECISIONS.md`; the re-pin keeps it |
| Report check, ticket 2 | Flags Migrations missing from the roster when R2 matches, Primitive obsession kept on the roster when R3 no longer matches, a roster quote that is a diff header, and a report roster that differs from `review/ROSTER` |
| Step 2 | `add-role` activates R1, R2, R3; on ticket 1's pin no optional rule matches; the role is committed on main and stays out of ticket 2's diff |
| Launchers | `review-cli.mjs` and `builder-cli.mjs` print usage with no arguments |
| Launch scripts | `scripts/copilot-builder`, `copilot-reviewer` and `copilot-session.sh` are executable and parse as bash |
| Skill pin script | In every scenario, `.github/skills/multi-agent-review/pin.mjs` (executable) writes the same `review/PIN`, `diff.patch`, `ci-results.txt`, `ROSTER` and `DECISIONS.md` as `fixture.mjs pin`, and `--route` gives the same rules |

The CI suite passes on every head, ticket-following or not. Only a reviewer with the right
knowledge file, or a proof, tells the two apart.

## Rehearsal record

**A, B and C** (2026-11-20, model `auto`) found the bugs: reviewers blocked on ticket text,
a human decision never reached the reviewers, gaps in the report check, a builder that
invented a store-id check, model drift between builder and reviewers, and two unplanted
defects. No ticket reached PASS. Each was fixed before A2 and B2.

**A2 and B2** (2026-11-20, `--model gpt-6-luna`) ran the earlier order, with the role
added at the end: both tickets reached PASS after one fix round, and the late role failed
ticket 2's pin on T2-E as designed. They found the format drift fixed below.

**A4 and B4** (2026-11-20, Copilot CLI 1.0.114, `--model gpt-6-luna` on every run), in the
current order. Evidence: each run's `EVIDENCE.md` and `attempts/*/summary.txt`.

| Review | A4 | B4 | Expected |
|---|---|---|---|
| Ticket 1, first | FAIL; Architect, Tester, Security Auditor; A-1/A-2, BD-007, S-2 HIGH | the same | FAIL on T1-A, T1-B, T1-C |
| Ticket 1, after 1 fix round | PASS; same roster; 3 MEDIUM, 1 LOW | PASS; same roster; 3 MEDIUM, 1 LOW | PASS |
| Step 2, `route` on ticket 1's pin | R1, R2, R3 active; no optional role matches | the same | no match |
| Ticket 2, first | FAIL; + API compatibility (R1), Migrations (R2), Primitive obsession (R3); M-1 CRITICAL, P-2 and P-3 HIGH, BD-011 HIGH `DISPUTED:`, CP-2 and CP-3 HIGH | the same | FAIL on T2-A to T2-E |
| Ticket 2, after `decide` and 1 fix round | PASS; R1, R2; R3 left the roster; 1 NIT | PASS; R1, R2, R3; 1 MEDIUM CP-3 | PASS |
| Machine time, end to end | about 14 minutes | about 15 minutes | |

Observed against expected: every EXPECTED.md ID appeared from the expected role at the
expected severity. Proofs matched at every head. Persona scoping held in every review. No
write landed outside `review/`, and no `WARNING` line appeared. The builder touched no
knowledge file.

What varied:

- Findings at MEDIUM and below.
- R3 after the fix. In B4 Primitive obsession stayed on the roster because
  `CardService.daysUntilExpiry` in `domain/` returned `int`, and the builder does not fix
  MEDIUMs. R3 and the role now cover the `api` package only, so the role leaves the roster
  predictably.
- Report format. B4 had one em dash in a PASS report and, on a rerun of an unchanged head, a
  reconciler WHERE prefixed with a rule ID (`WHERE     CP-3: src/...`), which gave 4
  report-check problems on a PASS while the launcher exited 0. The contract and the
  reconciler now say WHERE is `<path>:<line>` only, and the launcher ends on
  `REPORT CHECK: N problems` and exits 4 when N is above 0.
- In A4 the ticket 2 fix also edited a `MigrationRunner` message no finding named; nothing
  flagged it.
- In B4 `fixture.mjs commit` with nothing to commit printed a stack trace. It now prints one
  line and exits 1.

> **TODO.** A live TIMEOUT has not been observed. The rerun path was observed in the
> 2026-11-22 interactive recording, not with `review rerun`.

Interactive use and `/tasks` were recorded on 2026-11-22: see the
[guide's Evidence](../FACILITATOR-GUIDE.md#evidence).

> **TODO.** No model other than `gpt-6-luna` has been rehearsed in the current order.

**A5** (2026-11-20, `--model gpt-6-luna`), a confirmation run after the R3 scope, WHERE
and exit-4 changes. Both tickets reached PASS after one fix round each. R3 did not match
ticket 1's pin, fired on ticket 2's first review and left the roster after the fix. Every
review exited 0 with `REPORT CHECK: 0 problems`, and every WHERE was `<path>:<line>`. All
blocking findings matched EXPECTED.md, with no deviation. About 13.5 minutes of machine time
end to end. The builder ran `git show HEAD^:<file>`, which the permission rules allow as a
read-only command; see [Controls](#controls).
