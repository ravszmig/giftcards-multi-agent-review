# Multi-agent review: 1:1, 60 to 90 minutes

The facilitator's script for the whole session. Everything you need to say, do and expect is
in this file. Keep it off the shared screen: it holds the answers.

The participant builds two tickets for a synthetic gift card service with one Copilot CLI
session, and reviews each with another. The review is a team of named reviewer agents. Each
reviewer reads only its own file of team rules. Each ticket asks for something those rules
forbid, and the builder never sees the rules, so it follows the ticket and the reviewers
catch it. The participant fixes what they find, adds a reviewer of their own, and makes the
one decision no agent may make.

**What the participant leaves with:** a review is a roster of named roles on one change, each
with its own rules. The change decides who reviews. The verdict follows a written contract:
a reviewer that did not run fails the review, and a genuine conflict between rules goes to a
person.

## Run of show

| Min | Step | What the room sees |
|---|---|---|
| 0–8 | [Tour](#08-tour) | How the builder, the reviewers and the verdict fit together |
| 8–36 | [Ticket 1: partial refunds](#836-ticket-1-partial-refunds) | The builder follows the ticket. Three reviewers start together. FAIL on three problems. One fix, PASS |
| 36–42 | [Add a reviewer by hand](#3642-add-a-reviewer-by-hand) | The participant adds a reviewer and its routing rule. It does not join ticket 1 |
| 42–64 | [Ticket 2: card expiry](#4264-ticket-2-card-expiry) | Six reviewers. FAIL on one critical and several high problems, and one dispute |
| 64–82 | [The decision, then PASS](#6482-the-decision-then-pass) | The participant decides the dispute. One fix, PASS |
| 82–90 | [Debrief](#8290-debrief) | The whole change in IntelliJ. What PASS claims and what it does not |

Each Copilot turn takes up to about 5 minutes; a whole session needs 11 to 24 minutes of model
time. Nothing is committed: both tickets stay as uncommitted changes, and every review looks at
the working tree compared with the last commit.

Below, an ID in brackets, such as "(on screen: BD-007)", is only there so you can match what
the screen shows. Never read it out as the explanation; read the sentence.

## Before the session

1. **Clone and open.** `git clone https://github.com/ravszmig/giftcards-multi-agent-review.git`.
   In IntelliJ, File, Open, the `giftcards-multi-agent-review` folder. Project SDK: a JDK 21.
   Let IntelliJ import Maven, and run `mvn -q test` once in its terminal, with network, so
   every later `mvn -o` works offline.
2. **Clean Copilot.** The sessions must see only this repository's instructions, skill and
   agents. Move aside any personal ones for the session: `~/.copilot/copilot-instructions.md`,
   `~/.copilot/agents/`, `~/.copilot/skills/`, and any user-level hooks.
3. **Two terminal tabs**, both in the repository root: `builder` and `review` (right-click a
   tab, Rename). Each runs plain `copilot`. Builder and review are always separate sessions,
   so no reviewer inherits the builder's conversation. Start a fresh review session for every
   review.
4. **Model.** In every new session, `/model` and pick `gpt-6-luna`.
5. **Approvals.** Each new session asks to trust the folder: Yes. When Copilot asks to edit
   files, the builder may edit source and tests, and the review session may write under
   `review/` only: approve the first write for the rest of the session. A review runs no shell
   command but `git status` and `git diff`, which need no approval.
6. A hook in `.github/hooks/` keeps the builder out of `docs/`; do not switch it off.
7. **Morning check, on the participant's model.** In a second clone, run ticket 1's build and
   first review with the prompts below. Pass: FAIL, with high-severity findings from the
   Architect, the Tester and the Security Auditor, and nothing critical. Models change; last
   week's run proves nothing today.

Copilot CLI 1.0.114 and 1.0.115 were used in rehearsal.

### Reset between participants

In IntelliJ: Git, Rollback, select all, Rollback. Then delete the `review/` folder: Git
ignores it, so Rollback keeps it. Or delete the clone and clone again.

## 0–8: Tour

**What this step is for:** the participant sees who does what before anything runs.

**Ask.** "How does your team decide today that a change is ready to merge?" Keep the answer
for the debrief.

**Do.** Open these in IntelliJ while you read the lines.

1. `AGENTS.md`.
2. `.github/skills/multi-agent-review/SKILL.md`, the two roster tables.
3. `REVIEW-CONTRACT.md`, the severity table and the verdict.
4. `.github/agents/tester.agent.md`, the `## Knowledge` section.

**Say.**

- "This file, `AGENTS.md`, is all the builder reads besides the ticket: how to build and test,
  where code lives, and the conventions. It does not mention the team's rules."
- "The team's rules live in `docs/knowledge/`, one file per area. The builder never reads
  them. Each reviewer reads only its own: the Architect reads the architecture and code
  structure files, the Tester the test patterns and the business decisions, the Security
  Auditor the security rules, API compatibility the partner API policy, Migrations the
  database migration rules, and the reconciler, who writes the final report, the review
  patterns."
- "This is the review skill. Three reviewers run on every change: Architect, Tester and
  Security Auditor. Two more join only when the change touches their area. API compatibility
  joins when a public line of the partner API changes. Migrations joins when a database
  migration file changes. The change decides the roster, before anyone has an opinion of the
  code."
- "All reviewers start at the same time, and none sees another's output. Then the reconciler
  merges their records into one report with one verdict."
- "The contract sets the verdict. Critical and high findings block. Medium, low and nit do
  not. A reviewer that crashed or timed out also fails the review, because a missing reviewer
  says nothing about the code."

**Ask.** "Which files does the builder never see?" The team's rules. "Why does that matter?"
If a ticket breaks a rule, the builder cannot know. Only the reviewer that holds the rule can
catch it.

## 8–36: Ticket 1, partial refunds

**What this step is for:** a full loop: build, review, FAIL, fix, PASS.

### What the ticket asks, and what is wrong with it

The ticket asks for partial refunds back onto a gift card. Three of its requests break team
rules:

- **Goodwill.** The ticket allows a refund of up to £50 more than the customer spent. The
  team's business decisions say the refunds against one purchase can never add up to more than
  that purchase. Goodwill is never a refund: Customer Services issues it as a new card, which
  Finance books as a marketing cost. Finance owns this rule, so there is no dispute.
- **Logging.** The ticket asks for a log line with the full card number. The security rules
  say a full card number never goes in a log line, an error or a webhook. The 16 digits are
  all anyone needs to spend the balance, there is no PIN, and every support engineer can read
  the logs for 90 days. Only Security can sign off an exception; a ticket cannot.
- **Webhook from the domain.** The ticket asks the core refund logic to call the store
  webhook directly. The architecture rules say the core logic depends on nothing outward, and
  outbound calls start in an adapter, at the edge of the system.

Its other requests follow the rules. Item 9, refusing a refund that would take a card above
£500, matches the business rule that a card never holds more than £500.

**Do.** Open `tickets/TICKET-1-partial-refund.md`, items 4 to 6.

**Say.** "Read items 4, 5 and 6. Each asks for something one of the team's rules forbids.
Item 4 lets a refund exceed what the customer spent; the business rule says it never may.
Item 5 logs the full card number; the security rule says that number is as good as cash and
never goes in a log. Item 6 makes the core logic call the webhook; the architecture rule says
calls to the outside start at the edge. The builder will see the ticket, not the rules."

### Build, 7 minutes

**Do.** In the `builder` tab: `copilot`, trust the folder, `/model` gpt-6-luna, then paste:

```text
Implement tickets/TICKET-1-partial-refund.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask**, while it builds. "Which extra reviewers will join?" None: the ticket keeps refunds
out of the partner API and needs no database change. "What will each of the three find?"
Keep their prediction.

**What we expect while it runs (up to 5 minutes):** it reads `AGENTS.md`, the ticket and the
code, adds a refund service, a refund route and tests, runs the tests, and says the changes
are uncommitted. About 8 to 12 files change.

**Outcome.** The builder does what the ticket asked. Open `RefundService.java` in the Commit
tool window and point at the three spots.

**Say.** "Here is the £50 goodwill allowance. Here is the log line with the full number. Here
the core logic calls the webhook. The builder did its job: it followed the ticket."

### Review, 8 minutes

**Do.** In the `review` tab: `copilot`, trust, `/model` gpt-6-luna, then paste:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-1-partial-refund.md.
```

Type `/tasks` when the reviewers start; Esc closes it.

**Say.** "A fresh session, with none of the builder's conversation. It reads the change with
`git diff`, works out the roster, and starts every reviewer at once."

**What we expect while it runs (up to 3 minutes):** three reviewers start in the same second,
each reads its own rules and the change, then the reconciler writes `review/REPORT.md` and
prints it. The records are in `review/runs/1/`.

**Outcome: FAIL**, three reviewers, no extra reviewer. Read each blocking finding:

- **Tester, high (on screen: BD-007).** "The refunds against one purchase can add up to £50
  more than the purchase. The business rule says they never may. Fix: cap the refunds at the
  purchase amount."
- **Security Auditor, high (on screen: S-2).** "The refund log line contains the full card
  number. Anyone who reads the logs could spend the card. Fix: log the masked number."
- **Architect, high (on screen: A-1, A-2).** "The core refund logic imports and calls the
  webhook adapter. Dependencies must point inward, and outbound calls start at the edge. Fix:
  the core logic notifies through an interface that the adapter implements." This may come as
  one finding or two.

**Say.** "Three findings, one per reviewer, each from the file of rules that reviewer holds.
None of them saw the others. The builder could not have known any of this."

It may also:

- Show medium or low findings, such as a missing test at the refund limit, a store id logged
  without validation, or a third copy of the code that loads a card. **Say.** "Medium and low
  findings are advice. They do not block."
- Raise the refund limit twice, once on the code and once on the test that expects the £50
  allowance. **Say.** "Same problem, seen in the code and in the test that locks it in."

**Show.** `review/REPORT.md`, then `review/runs/1/tester.md`: the same finding, word for word,
with `RAISED BY Tester` added in the report.

**Ask.** "Your prediction?"

### Fix to PASS, 10 minutes

**Do.** In the `builder` tab, the same session, paste:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. Change no file the findings do not name, except tests that assert the behaviour a finding removes: update those. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**What we expect while it runs (up to 1.5 minutes):** refunds capped at the purchase, the
masked number in the log, and the notification moved behind an interface. A test that
expected the full number in the log is updated with it. 4 to 7 files change.

If the builder leaves the tests failing, carry on: this lesson is about the review, and the
Tester neither runs the tests nor blocks on them. **Say.** "This is why a developer agent in a
full pipeline, with several agents and quality checks, would do better."

**Do.** In the `review` tab, `/exit`, then `copilot`, trust, `/model`, and the same prompt:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-1-partial-refund.md.
```

**Outcome: PASS** (up to 3.5 minutes), the same three reviewers, medium and below only. The
records are in `review/runs/2/`.

**Ask.** "PASS. What does that claim?" Every required reviewer ran, and nothing critical or
high is open. "What does it not claim?" That the code is correct.

**If it differs:** see [If something goes wrong](#if-something-goes-wrong).

Do not commit. Ticket 2 builds on top of this.

## 36–42: Add a reviewer by hand

**What this step is for:** the participant adds a reviewer and sees that the change, not a
person, decides when it joins.

**Do.**

1. Open `review-templates/primitive-obsession.agent.md` and `review-templates/R3-routing-rule.md`.
2. In the project tree, copy `primitive-obsession.agent.md` into `.github/agents/`.
3. In `SKILL.md`, paste the `| R3 |` row from `R3-routing-rule.md` under the `| R2 |` row.
4. In the `review` tab, the session still open, paste:

```text
I added rule R3 and the primitive-obsession role to the skill. Which optional rules match the current changes? Check every rule in the skill against git status and git diff HEAD, name each match with its line, and start no reviewer.
```

**Say.** "This reviewer, Primitive obsession, reads the team's code patterns. It looks for
raw text or plain numbers standing in for a card number, money or a length of time in the
partner API, where the code has its own types for them. Its routing rule says it joins only
when the change adds such a public signature in the partner API."

**Ask**, before the answer. "Will it join a review of ticket 1?" No: ticket 1 changed nothing
in the partner API.

**Outcome (under a minute):** "No optional rule matches." No reviewer starts.

**Ask.** "Ticket 1 passed without this reviewer. What did that PASS say about raw types?"
Nothing: the reviewer was not on the roster, so it made no claim.

## 42–64: Ticket 2, card expiry

**What this step is for:** the routing adds three reviewers, the review finds a critical
problem, and one finding is a genuine dispute between two team rules.

### What the ticket asks, and what is wrong with it

The ticket asks for gift cards to expire 12 months after issue, with a grace period. Five of
its requests break team rules:

- **Editing the first migration.** The tech notes say to add the expiry column by editing the
  first database migration, or to drop and recreate the cards table. The migration rules say a
  migration already applied anywhere is never edited: the runner checks each file's checksum
  and refuses to start if one changed. A table with data is never dropped. A new column goes
  in a new migration.
- **Changing `balance` to take text.** The ticket replaces `balance(CardNumber)` in the
  partner API with `balance(String)`. The API policy says no signature changes within version
  1: partner apps upgrade automatically to any 1.x release, and a changed signature breaks
  them at run time.
- **Keeping version 1.4.0.** The ticket adds a public method but keeps the version at 1.4.0.
  The API policy says a new public method means version 1.5.0, and a ticket cannot waive that.
- **Raw types in the partner API.** `balance(String)` and `int daysUntilExpiry(String)` pass a
  card number as text and return days as a plain number. The code patterns say a card number
  is a `CardNumber` and a length of time is a `Period` or `Duration`.
- **A 30-day grace period.** The ticket says 30 days. The business decisions say 14. This one
  is a dispute; it is explained in the next step.

**Do.** Open `tickets/TICKET-2-card-expiry.md`.

**Say.** "Five problems this time. The ticket edits a database migration that every
environment has already run, which stops the service starting. It changes a partner method in
a way that breaks partner apps, and keeps the old version number to hide it. It passes card
numbers and days as raw values. And it sets a 30-day grace period where the business decision
says 14."

### Build, 6 minutes

**Do.** In the `builder` tab, `/exit`, `copilot`, trust, `/model`, then paste:

```text
Implement tickets/TICKET-2-card-expiry.md. Read AGENTS.md and the ticket, and nothing under docs/. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask.** "Which extra reviewers will join, and why?" API compatibility and Primitive
obsession, because `balance` changes in the partner API. Migrations, because the first
migration changes.

**What we expect while it runs (up to 3.5 minutes):** `balance(String)` in place of
`balance(CardNumber)`, `int daysUntilExpiry(String)`, the version still 1.4.0, 30 days, and the
expiry column added inside the first migration, `V1__create_cards.sql`.

**Say**, on the diff of `V1__create_cards.sql`. "This file has already run in every
environment. Editing it is what the migration rule forbids."

### Review, 11 minutes

**Do.** In the `review` tab, `/exit`, `copilot`, trust, `/model`, then paste:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-2-card-expiry.md.
```

**Say.** "This review also sees ticket 1's changes, because nothing was committed. They are
already fixed, so they should not produce new blockers."

**What we expect while it runs (up to 3 minutes):** six reviewers start together. The report
names each extra reviewer with the rule and the changed line that put it there.

**Outcome: FAIL.** Read each blocking finding:

- **Migrations, critical (on screen: M-1).** "The expiry column was added to the first
  migration, which every environment has already run. Its checksum changes, and the service
  refuses to start on the next deploy. Fix: restore it and add the column in a new migration."
- **API compatibility, high (on screen: P-2).** "`balance(CardNumber)` was replaced by
  `balance(String)`. Partner apps built against 1.4.0 break at run time. Fix: keep
  `balance(CardNumber)`."
- **API compatibility, high (on screen: P-3).** "A new public method was added and the
  version stayed 1.4.0. Partners cannot tell the two APIs apart. Fix: version 1.5.0 in the
  code and in `pom.xml`."
- **Primitive obsession, high (on screen: CP-2, CP-3).** "The partner API takes the card
  number as text and returns days as a plain number. Fix: take a `CardNumber` and return a
  `Period`, empty when the card never expires." The `balance(String)` signature is flagged by
  both API compatibility and Primitive obsession; they stay two findings, one per reviewer.
- **Tester, high and disputed (on screen: DISPUTED: BD-011).** "The code allows 30 days of
  grace. The business decision says 14. The ticket's author now owns that decision, but has
  not recorded a change. The Tester cannot pick a side, so the report says a human decides."

**Say.** "The Architect and the Security Auditor found nothing blocking: ticket 1's problems
are fixed. One finding is not for the builder: read the line that says a human decides."

It may also:

- Show medium or low findings, including ticket 1's again, such as a store id logged without
  validation, the third copy of the card lookup, or a missing boundary test. **Say.** "Advice,
  not blockers."
- Show a medium finding that the old `balance` was removed without first being marked
  deprecated. **Say.** "The fix keeps the method, so this resolves itself."
- Show an extra API compatibility finding if the builder also changed the card view record
  the API returns. **Say.** "Another public signature changed; the same rule applies."
- Name the dispute in the last line together with the ownership note and a test rule (on
  screen: BD-011, BD-018, T-3). **Say.** "Same dispute, with its evidence."
- Show nothing on an `int daysUntilExpiry` the builder added to the internal card service.
  **Say.** "Primitive obsession only covers the partner API. Inside the service it is not a
  finding."

## 64–82: The decision, then PASS

**What this step is for:** the participant makes the decision the agents may not make, records
it, and the review accepts it.

### The dispute, 6 minutes

The ticket's 30 days and the recorded 14 days conflict, and both have a claim. The decision
for 14 days came from Finance and Legal in March 2025. A newer note in the same file, from
October 2026, makes the Stores product owner the owner of grace periods, and says the owner
records each change in the decisions file. The product owner wrote the ticket in November 2026
but never recorded a change. The file says a ticket does not change a decision by itself.

**Do.** Open `docs/knowledge/BUSINESS_DECISIONS.md` and the ticket's item 3.

**Say.** "Here is the conflict. The ticket says 30 days, and its author, the Stores product
owner, owns grace periods since last October. The decisions file says 14 days, set by Finance
and Legal, and it says the owner changes a decision by recording a new one in this file. That
never happened. Both sides have a claim, so the Tester refused to choose."

**Ask**, in this order, without answering:

1. "Who owns the grace period today?" The Stores product owner.
2. "Did they change the decision the way the file says decisions change?" No.
3. "What would you need to see before shipping 30 days?" A recorded decision that replaces
   the 14 days.
4. "Which one do you ship today?"

**Do.** The participant states the decision. In the `review` tab, the same session, paste it
in this form, with their words in place of the scripted text:

```text
Do not run any reviewer. Record this decision in review/DECISIONS.md under the rule ID BD-011, as "DECISION  BD-011": "BD-011 holds: the grace period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted." Then print review/DECISIONS.md.
```

**Outcome (seconds):** the file is printed with the decision, today's date and the text.

**Say.** "Either answer is valid. You made this one, with the evidence, and it is written
down. Every reviewer reads this file, so the dispute is closed."

A 30-day decision is equally valid; the Tester then raises nothing on 30 days. It has not
been rehearsed.

### Fix, 4 minutes

**Do.** In the `builder` tab, the same session, paste:

```text
Fix only the CRITICAL and HIGH findings in review/REPORT.md. The human decision on the disputed BD-011 finding is in review/DECISIONS.md: follow it. Change no file the findings do not name, except tests that assert the behaviour a finding removes: update those. Run mvn -o -q test before you finish and leave the changes uncommitted.
```

**Ask.** "Two reviewers flagged `balance(String)` with different fixes. Do they conflict?" No:
`balance(CardNumber)` alone satisfies both.

**What we expect while it runs (up to 2 minutes):** the first migration restored and a new one
that adds the column, 14 days, `balance(CardNumber)` back with no text version and not marked
deprecated, a method that takes a `CardNumber` and returns a `Period`, and version 1.5.0. It may
also change a line no finding names, such as an error message. **Say.** "Harmless; leave it."

### Review to PASS, 8 minutes

**Do.** In the `review` tab, `/exit`, `copilot`, trust, `/model`, then paste:

```text
Run the multi-agent-review skill on the current changes. They implement tickets/TICKET-2-card-expiry.md.
```

**Ask.** "Will Primitive obsession join this time?" No: no raw types are left in the partner
API.

**Outcome: PASS** (up to 2.5 minutes). The three required reviewers, plus API compatibility and
Migrations. No Primitive obsession, no dispute, medium and below only, or no findings at all.

**Say.** "Primitive obsession joined when its rule matched and left when the code stopped
matching it. The change decided both times. The recorded decision closed the dispute: the
Tester raised nothing on 14 days."

It may also show the migration reviewer's note that the new file's name does not follow the
naming pattern, or the routing quote showing the new migration's file name. **Say.** "Style
only."

## 82–90: Debrief

**Do.** Open the Commit tool window: the whole session as one uncommitted change.

**Ask**, one at a time, and wait for each answer:

1. "Ticket 1 passed without Primitive obsession, ticket 2 needed it. What decided whether it
   ran?" The change itself: its routing rule matched ticket 2's partner API change and not
   ticket 1.
2. "Which finding would your team's current review have missed, and where was the rule
   written down?" Often the edited migration: a rule in a file the builder never saw.
3. "Name one rule you type into review prompts today. Which reviewer would own it, and what
   change would make that reviewer join?"
4. "How does your team decide a change is ready to merge?" Compare it with their answer from
   the tour.

**Say.** "PASS means every required reviewer ran on this change and nothing critical or high
is open under this contract. It does not mean the code is correct. A reviewer that was not on
the roster made no claim."

Then reset the clone. Feedback about the participant goes to the cockpit store, never into
the clone.

## If something goes wrong

| What you see | What to say and do |
|---|---|
| Every reviewer ended `RUN ERROR` and the report fails on missing coverage. Seen with `"prompt": Required` and `"name": Required` | "A reviewer that did not run counts against the review. That is the contract working." Same session: "Rerun the reviewers that ended RUN ERROR, then reconcile." |
| A reviewer is missing from the roster, or one joined that no rule matches | Do not use the verdict. Fresh review session, the review prompt, plus "Check every rule against the file paths in git status and quote the matching line." |
| The report drops, rewords, merges or re-rates a reviewer's finding, or its causes miss a rule a finding cites | Same session: "Reconcile only: start no reviewer and keep the records as they are." At most twice, then a fresh review |
| A new high finding nobody planted, after a fix | Fix it with the same fix prompt and review again |
| A planted finding is missing because the builder refused that part of the ticket | "The builder made a decision the review should have made, and nobody recorded who made it." Show the point in the builder's last message and in the diff. If it chose 14 days by itself, run the decision anyway: the participant decides whether the builder was entitled to choose |
| A permission question for any shell command other than `git status` or `git diff` in a review, such as `rm` | No. If the review stops, start a fresh review session |
| The builder asks to read an odd path | No. It retries |
| Still FAIL after three fix loops | Stop and debrief on the open findings |

Harmless and no reason to stop: "none." in place of "none", or a routing quote showing a
renamed parameter or a new file's name.

## Evidence

Rehearsed 2026-11-20 to 2026-11-25 on `gpt-6-luna`, Copilot CLI 1.0.114 and 1.0.115, macOS,
JDK 21: an IntelliJ recording, ten dry runs of an earlier setup and nine of this one. In every
run each planted problem came from the expected reviewer at the expected severity, and both
tickets reached PASS, after one fix round each in most runs. Model time for a whole session:
11 to 24 minutes.

> **TODO.** The last changes, a fresh records folder per review and every rule in the
> report's causes, have not been run end to end. It has not been rehearsed on Windows, and a
> live reviewer timeout has not been seen.
