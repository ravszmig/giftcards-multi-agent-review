# Rehearsal handbook

The dry run of the session as delivered: [FACILITATOR-GUIDE.md](FACILITATOR-GUIDE.md) step by
step, with the same launch scripts, the same prompts and the same flags, and `-p` in place of
a person at the keyboard. Several dry runs can go at once: each uses its own clone, and
nothing is shared between them. Compare every outcome with the guide's **Expected** blocks
and with [EXPECTED.md](EXPECTED.md).

## A clone for each dry run

`$RUN` is a new directory outside any other repository and outside `/tmp`. From the
published lab:

```sh
git clone -q https://github.com/ravszmig/giftcards-multi-agent-review.git "$RUN"
```

Or from the lab's source folder, to test changes not yet published. This commits the folder
as one `main` commit in `$RUN.src` and clones that, so `origin/main` exists as in a real
clone:

```sh
SRC=<the lab's source folder>
mkdir -p "$RUN.src"
rsync -a --exclude .git --exclude .lab --exclude review --exclude target --exclude .idea "$SRC/" "$RUN.src/"
git -C "$RUN.src" init -q -b main && git -C "$RUN.src" add -A
git -C "$RUN.src" commit -q -m "Gift card service 1.4.0"
git clone -q "$RUN.src" "$RUN"
```

Then, once per clone, with network:

```sh
cd "$RUN" && node scripts/warm-up.mjs
```

The launch scripts take the token from `gh auth token` themselves; set
`COPILOT_GITHUB_TOKEN` in a command's environment only when `gh` is not signed in.

## What the guide does by hand, and the `-p` equivalent

Every command runs from `$RUN`. Every prompt is copied from the guide, unchanged.

| Guide | Dry run |
|---|---|
| Builder tab: `scripts/copilot-builder`, trust the folder, paste the prompt | `scripts/copilot-builder --trust-folder -p "<prompt>"` |
| The same builder session for the fix | `MAR_SESSION=.lab/sessions/<NN>-builder scripts/copilot-builder --continue -p "<prompt>"` |
| Review tab: `scripts/copilot-reviewer`, trust, paste | `scripts/copilot-reviewer --trust-folder -p "<prompt>"` |
| A prompt in the review session still open (rerun, the R3 question, the decision) | `MAR_SESSION=.lab/sessions/<NN>-reviewer scripts/copilot-reviewer --continue -p "<prompt>"` |
| Branch widget, New Branch `ticket-n` | `git switch -c ticket-n` |
| Commit tool window | `git add -A && git commit -q -m "<message>"` |
| Checkout `main`, Merge `ticket-n` into `main` | `git switch main && git merge --ff-only ticket-n` |
| Copy the template, paste the R3 row by hand | `node facilitator/add-role.mjs` |

`--trust-folder` stands in for the folder-trust question a person answers on screen. Add
nothing else: the reviewer script already allows the pin script by its path, and only that.
`-p` cannot ask, so any other command is refused, which is the point: a refused command in
the output is a deviation to record.

Each script call without `MAR_SESSION` creates `.lab/sessions/NN-<role>/`. With one fix
round per ticket they are, in order: `01-builder` (ticket 1 build and fix), `02-reviewer`,
`03-reviewer` (ticket 1 reviews; the R3 question continues `03`), `04-builder` (ticket 2
build and fix), `05-reviewer` (ticket 2 review; the decision continues `05`),
`06-reviewer`. An extra review or fix round shifts the numbers: check with
`ls .lab/sessions`. Wrap each call in `time` and keep its output outside the clone.

`-p` folds the pin script's output into one line ("12 lines…"), so the guide's pin output
cannot be read from it. Check the files the pin wrote instead: `review/ROSTER` against the
guide's roster, `review/ci-results.txt` for `exit 0`, and `review/PIN` for the `DIFF` line.

After every review, the facilitator's checks from the guide:

```sh
node facilitator/check.mjs
node facilitator/proofs.mjs 1        # all, for ticket 2
```

At the end, `node facilitator/audit.mjs`. Every builder must show
`Knowledge files touched by the builder: none`, `Calls naming docs/: 0` and
`Calls naming facilitator/: 0`; every review `Persona scoping: held`,
`Calls naming facilitator/: 0` and `Writes landed outside review/: none`.

## Evidence

Write `EVIDENCE.md`, outside the clone, with one row per step:

| Step | Session | Prompt | Time | Verdict | Roster and rules | Blocking findings (role, rule, severity) | Report check | Proofs | Matches the guide |
|---|---|---|---|---|---|---|---|---|---|

Under the table list every deviation from the guide's **Expected** blocks with the text
quoted, and whether the cause was the builder (a proof shows it did not follow the ticket) or
the review (the proof shows the defect and no reviewer flagged it). Never paste a token.

## Known results

| Date | Head | Model | Roster | Verdict | Report check | Persona scoping |
|---|---|---|---|---|---|---|
| 2026-11-20 | ticket 1, `facilitator/reference/ticket-1-reference.patch` on the base | gpt-6-luna | Architect, Tester, Security Auditor; no optional role | PASS, 109.6 s | 0 problems; no write outside review/ | held |
| 2026-11-24 | ticket 1, built by `scripts/copilot-builder -p` (the guide with `-p`) | gpt-6-luna | Architect, Tester, Security Auditor; no optional role | FAIL in 184 s: A-1/A-2, BD-007 with T-3, S-2 HIGH. After one fix with `--continue`: PASS in 133 s, 1 LOW | 0 problems both times; proofs FAIL, then PASS | held |
