# Rehearsal handbook

Exact steps for one rehearsal of the whole one-to-one. Several rehearsals can run at once:
each uses its own run directory, `$RUN`, and nothing is shared between runs. Compare every
outcome with [EXPECTED.md](EXPECTED.md).

Two forms. [The guide with `-p`](#the-guide-with--p) runs
[FACILITATOR-GUIDE.md](../FACILITATOR-GUIDE.md) step by step: the same launch scripts, the same
prompts, the same flags, with `-p` in place of a person at the keyboard. It is the dry run of
the session as delivered. Sections 0 to 5 below run the older wrapper commands
(`builder-cli.mjs`, `review-cli.mjs`), which the [wrapper runbook](WRAPPER-RUNBOOK.md) and
the offline fallback use.

## The guide with `-p`

Every prompt below is copied from the guide. Send each one unchanged. The launch scripts
take the token from `gh auth token` themselves; run them with `COPILOT_GITHUB_TOKEN` set only
when `gh` is not signed in.

```sh
F=<repository root>/forge/demos/demo-fixtures/multi-agent-review
RUN=<new directory outside this repository and outside /tmp>
node "$F/fixture.mjs" setup "$RUN"
cd "$RUN/workspace"
```

What the guide does by hand, and the `-p` equivalent:

| Guide | Dry run |
|---|---|
| Builder tab: `scripts/copilot-builder`, trust the folder, paste the prompt | `scripts/copilot-builder --trust-folder -p "<prompt>"` |
| The same builder session for the fix | `MAR_SESSION="$RUN/sessions/<NN>-builder" scripts/copilot-builder --continue -p "<prompt>"` |
| Review tab: `scripts/copilot-reviewer`, trust, paste | `scripts/copilot-reviewer --trust-folder -p "<prompt>"` |
| A prompt in the review session still open (rerun, the R3 question, the decision) | `MAR_SESSION="$RUN/sessions/<NN>-reviewer" scripts/copilot-reviewer --continue -p "<prompt>"` |
| Branch widget, New Branch `ticket-n` | `git switch -c ticket-n` |
| Commit tool window | `git add -A && git commit -q -m "<message>"` |
| Checkout `main`, Merge `ticket-n` into `main` | `git switch main && git merge --ff-only ticket-n` |
| Copy the template, paste the R3 row by hand | `node "$F/fixture.mjs" add-role "$RUN"` |

`--trust-folder` stands in for the folder-trust question a person answers on screen. Add
nothing else: the reviewer script already allows the pin script by its path, and only that.
`-p` cannot ask, so any other command is refused, which is the point: a refused command in
the output is a deviation to record. Each script call without `MAR_SESSION` creates
`$RUN/sessions/NN-<role>/`. With one fix round per ticket they are, in order: `01-builder`
(ticket 1 build and fix), `02-reviewer`, `03-reviewer` (ticket 1 reviews; the R3 question
continues `03`), `04-builder` (ticket 2 build and fix), `05-reviewer` (ticket 2 review; the
decision continues `05`), `06-reviewer`. An extra review or fix round shifts the numbers:
check with `ls "$RUN/sessions"`. Wrap each call in `time` and keep its output in
`$RUN/dry-run/<step>.out`.

`-p` folds the pin script's output into one line ("12 lines…"), so the guide's pin output
cannot be read from it. Check the files the pin wrote instead: `review/ROSTER` against the
guide's roster, `review/ci-results.txt` for `exit 0`, and `review/PIN` for the `DIFF` line.

After every review, the facilitator's checks from the guide:

```sh
node "$F/review-cli.mjs" "$RUN" check
node "$F/fixture.mjs" proofs "$RUN" 1        # all, for ticket 2
node "$F/fixture.mjs" route "$RUN"
```

At the end, `node "$F/fixture.mjs" audit "$RUN"`. Record one row per step, as in
[section 5](#5--evidence), and every deviation from the guide's **Expected** blocks with
the text quoted. Where the guide's
[If something goes wrong](../FACILITATOR-GUIDE.md#if-something-goes-wrong) table applies,
follow it and record that it was needed.

## 0 · Variables

Run every command from the repository root. `$RUN` must be a new directory outside this
repository and outside `/tmp`, unique per rehearsal.

```sh
F=forge/demos/demo-fixtures/multi-agent-review
RUN=<new directory, for example $HOME/.copilot/session-state/<session>/files/rehearsal-a>
M=gpt-6-luna    # one model for every builder and review run
```

Copilot CLI 1.0.114 authenticates from `COPILOT_GITHUB_TOKEN`. Pass it to each command's
environment only, never print it and never write it to a file:

```sh
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/<script> ...
```

Every Copilot run uses a disposable profile under `$RUN/attempts/NN-*/profile`, so runs do
not see each other's sessions or your personal settings. Builder runs time out after 15
minutes, review runs after 25. Override with `--timeout <minutes>`.

Pass `--model $M` to every `builder-cli.mjs` and `review-cli.mjs` call, as below. Copilot
CLI 1.0.114 honours it here; no admin policy forces `auto` (checked 2026-11-20), and
subagents inherit the session model. Without it, rehearsals A to C ran builder fixes on
`gpt-6.1-sol` or `gpt-6.2-sol` and reviews on `gpt-6-luna`. Record the model from each
`summary.txt` (`Session model:`).

## 1 · Setup

```sh
node $F/fixture.mjs setup $RUN
```

Expected: `base <sha> (tag base, branch main)`. The repository is `$RUN/workspace`.

## 2 · Ticket 1: partial refund

```sh
node $F/fixture.mjs start $RUN 1
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/builder-cli.mjs $RUN ticket 1 --model $M
node $F/fixture.mjs commit $RUN "GC-207 partial refund"
node $F/fixture.mjs pin $RUN
node $F/fixture.mjs proofs $RUN 1
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/review-cli.mjs $RUN review --model $M
cat $RUN/workspace/review/REPORT.md
```

Expected:

- builder summary: `Knowledge files touched by the builder: none`, `HEAD unchanged: yes`
- pin: `CI: exit 0`, `Routing (R1, R2): no optional role`
- proofs: T1-A, T1-B, T1-C `FAIL`. A `PASS` means the builder did not follow the ticket on
  that point; record it as a builder deviation, not a review miss.
- review: roster of three required roles, VERDICT FAIL, a HIGH from each of Architect
  (A-1), Tester (BD-007) and Security Auditor (S-2), `Persona scoping: held`,
  `Report check: ... 0 problems`, `Files changed outside review/: none`

Fix loop. Repeat at most three times, until the verdict is PASS:

```sh
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/builder-cli.mjs $RUN fix --model $M
node $F/fixture.mjs commit $RUN "GC-207 fix review findings"
node $F/fixture.mjs pin $RUN
node $F/fixture.mjs proofs $RUN 1
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/review-cli.mjs $RUN review --model $M
```

Expected after one loop: proofs all `PASS`, VERDICT PASS, still no optional role.

- If a required role ends `TIMEOUT` or `ERROR`, do not rerun the whole review. Run
  `node $F/review-cli.mjs $RUN rerun <agent> --model $M` with the token, as slide 6 says.
- Every review summary has `Writes landed outside review/:`. Anything but `none` is a stray
  write and the launcher exits 3. A `WARNING refused write attempts` line means the
  permission rules refused a mangled path; the run still counts. Record both.
- The last line of every review is `REPORT CHECK: N problems`. With N above 0 the launcher
  exits 4 and the verdict is not to be used: run
  `node $F/review-cli.mjs $RUN reconcile --model $M` with the token. The reviewer records
  stand; only the report is rewritten. Record both attempts.
- `Report check:` problems now include a WHERE outside the diff, "a human decides" without
  a disagreement or the reverse, an open blocker missing from CAUSES, and a blocker on a
  decided rule. Record each one; they mean the report is wrong, not the code.
- If `builder-cli fix` exits with nothing changed (`git -C $RUN/workspace status` is clean),
  skip the commit and record it.

Then merge the ticket:

```sh
node $F/fixture.mjs finish $RUN
```

## 3 · Add the Primitive obsession role

Right after ticket 1, so it survives a session cut short at the end. In the one-to-one the
participant makes the two edits by hand from `review-templates/R3-routing-rule.md`. In a
rehearsal:

```sh
node $F/fixture.mjs add-role $RUN
node $F/fixture.mjs route $RUN
node $F/fixture.mjs commit $RUN "Add the primitive-obsession reviewer and rule R3"
```

Expected: `Active rules: R1, R2, R3` and `No optional rule matches`. `route` reads ticket 1's
pin, which is still in `review/`: R3 matches no line of ticket 1's diff, so the role would
not join a review of it. The commit lands on `main`, so ticket 2 branches from it and the
role's files are not in ticket 2's diff.

No review rerun on ticket 1's head: the roster is computed from the same diff and would not
change, and the run costs about 2 minutes.

## 4 · Ticket 2: card expiry

```sh
node $F/fixture.mjs start $RUN 2
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/builder-cli.mjs $RUN ticket 2 --model $M
node $F/fixture.mjs commit $RUN "GC-212 card expiry"
node $F/fixture.mjs pin $RUN
node $F/fixture.mjs proofs $RUN all
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/review-cli.mjs $RUN review --model $M
cat $RUN/workspace/review/REPORT.md
```

Expected:

- pin: `Routing (R1, R2, R3): R1, R2, R3`
- proofs: T1-* `PASS`; T2-A to T2-E `FAIL`
- review: roster adds API compatibility (R1), Migrations (R2) and Primitive obsession (R3),
  VERDICT FAIL. CRITICAL from Migrations (M-1). HIGH from API compatibility (P-2, P-3).
  HIGH from Tester on BD-011 with OBSERVED beginning `DISPUTED:`, the grace period under
  DISAGREEMENTS, NEXT naming "a human decides". HIGH from Primitive obsession (CP-2, CP-3)
  at `GiftCards.balance(String)` and `GiftCards.daysUntilExpiry(String)`, with ACTION
  naming `CardNumber` and `Period` or `Duration`. Primitive obsession reads only
  CODE_PATTERNS.md.

The human decision, scripted. Record it first, so every reviewer and the reconciler read it
from `review/DECISIONS.md` (the pin keeps it across re-pins of this branch). Then paste the
same text to the builder with the findings:

```sh
D="BD-011 holds: the grace period is 14 days. No entry supersedes it. The PO adds one if 30 days is wanted."
node $F/fixture.mjs decide $RUN BD-011 "$D"
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/builder-cli.mjs $RUN fix --model $M --decision "$D"
node $F/fixture.mjs commit $RUN "GC-212 fix review findings; grace 14 days per BD-011"
node $F/fixture.mjs pin $RUN
node $F/fixture.mjs proofs $RUN all
COPILOT_GITHUB_TOKEN="$(gh auth token)" node $F/review-cli.mjs $RUN review --model $M
```

Expected after one or two rounds: T2-A to T2-E `PASS`, VERDICT PASS,
`cat $RUN/workspace/review/DECISIONS.md` shows `DECISION  BD-011`, DISAGREEMENTS none, no
"a human decides" in NEXT. The roster keeps R1 and R2. R3 leaves it once no `api/` signature carries
a raw primitive; R3 does not look outside `api/`. For a second round, rerun `builder-cli.mjs fix --model $M` without
`--decision`: the decision is already in `review/DECISIONS.md` and in the code. At most
three rounds. Then:

```sh
node $F/fixture.mjs finish $RUN
```

## 5 · Evidence

Every Copilot run leaves `$RUN/attempts/NN-<label>/` with `prompt.txt`, `events.jsonl`,
`session-events.jsonl` (per-agent attribution), `summary.txt`, `usage.json`, and for
reviews a copy of `review/`. Every proof run leaves `$RUN/proof-runs/NN-*/result.txt`.
Superseded pins are in `$RUN/pins/`.

Write `$RUN/EVIDENCE.md` with one row per step:

| Step | Attempt | Model | Verdict | Roster and rules | Blocking findings (role, rule, severity) | Report check | Persona scoping | Proofs | Matches EXPECTED.md |
|---|---|---|---|---|---|---|---|---|---|

Fill it from each `summary.txt` and `result.txt`. Under the table list every deviation
from EXPECTED.md with the finding text quoted, and whether the cause was the builder (a
proof shows it did not follow the ticket) or the review (the proof shows the defect and no
reviewer flagged it). Never paste a token, and never copy anything from outside `$RUN`
into it.

## Known results

| Date | Head | Model | Roster | Verdict | Report check | Persona scoping |
|---|---|---|---|---|---|---|
| 2026-11-20 | ticket 1, `facilitator/reference/ticket-1-reference.patch` on base | gpt-6-luna | Architect, Tester, Security Auditor; no optional role | PASS, 109.6 s | 0 problems; no write outside review/ | held |
| 2026-11-24 | ticket 1, built by `scripts/copilot-builder -p` (the guide with `-p`) | gpt-6-luna | Architect, Tester, Security Auditor; no optional role | FAIL in 184 s: A-1/A-2, BD-007 with T-3, S-2 HIGH. After one fix with `--continue`: PASS in 133 s, 1 LOW | 0 problems both times; proofs FAIL, then PASS | held |
| 2026-11-24 | ticket 1, `ticket-1-naive.patch`, `review-cli.mjs review` with the skill's pin section | gpt-6-luna | Architect, Tester, Security Auditor; no optional role | FAIL, 169.3 s, three HIGH | 0 problems; no write outside review/ | held |
