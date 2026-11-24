---
name: multi-agent-review
description: Reviews the pinned diff in review/ with named reviewer agents in parallel, then has the reconciler write one report with a PASS or FAIL verdict. Use when asked to review a branch's changes or the pinned diff, to rerun one reviewer, to reconcile the existing records again, or to record a human decision.
---

# Multi-agent review

You run the review stage. You do not review the code yourself, you read no file under
`docs/`, and you change no file outside `review/`. Each reviewer and the reconciler is a
custom agent. You start each one with the `task` tool, `agent_type` set to the agent's
name. You do not use `/fleet`.

## Inputs

- `review/PIN`: `base <sha>`, `head <sha>`, `ticket <path>` when the change implements a
  ticket, `branch <name>`, and the `DIFF` line every record and the report quote.
- `review/diff.patch`: the diff from base to head. The working tree is at head.
- `review/ci-results.txt`: the existing test suite, already run on head by CI.
- `review/ROSTER`: the roles for this diff, from the routing rules.
- `review/DECISIONS.md`: human decisions on disputed findings for this change, or "none".
- `AGENTS.md`, `REVIEW-CONTRACT.md` and `review/DECISIONS.md`: passed to every reviewer by
  path.

## 0 · Pin the change

When you are asked to review a branch or its changes, pin it first. Run this command with
the shell tool, from the workspace root, exactly as written, with nothing in front of it:

```sh
.github/skills/multi-agent-review/pin.mjs
```

It is executable. Do not prefix it with `node`: this session refuses `node` commands. It is
the only shell command you run. It refuses to pin uncommitted
changes. It writes `review/PIN`, `review/diff.patch`, `review/ci-results.txt` from Git and
`mvn -o -q test`, and `review/ROSTER`, and keeps `review/DECISIONS.md` for the same branch.
Do not write those files yourself. If it fails, stop and show its output.

When you are asked to review the pinned diff, it is already pinned: skip this section. Do
not pin for a rerun, a reconcile only, a routing question or a human decision.

## 1 · Read the roster

`review/ROSTER` is the roster: one line per role. Start exactly the roles it lists, and
no other. Do not add, drop or re-route a role, and do not apply the rules below yourself.
If `review/ROSTER` is missing, stop and say so.

The pin script wrote it by applying the routing rules to `review/diff.patch` in code. The
three required roles are always on it:

| Role | Agent |
| --- | --- |
| Architect | `architect` |
| Tester | `tester` |
| Security Auditor | `security-auditor` |

An optional role is on it when its rule matches an added or removed line of the diff. The
line names the rule and quotes that line. A rule is active when its row is in this table:

| Rule | Role | Agent | Added when the diff |
| --- | --- | --- | --- |
| R1 | API compatibility | `api-compatibility` | adds, removes or changes a line containing `public` in a file under `src/main/java/com/example/giftcard/api/`: a public class, constructor, method, field or constant of the published API |
| R2 | Migrations | `migrations` | adds, changes or deletes any file under `src/main/resources/db/migration/` |

If you are asked which optional rules match, run
`.github/skills/multi-agent-review/pin.mjs --route` with the shell tool, as written and with
no `node` in front, show its output
unchanged, and start no reviewer. It applies the rules active in this file now to the
pinned diff, and changes nothing.

## 2 · Start every reviewer at once

Start all reviewers on the roster in a single
response: one `task` call per role, all in the same turn, so they run in parallel. Every
`task` call sets four fields: `name` (the agent, for example `tester`), `agent_type` (the
same agent), `description` and `prompt`. A call without one of them is rejected and the
reviewer ends `RUN ERROR`. Send each the same prompt, with only the role changed:

```text
You are the <Role> reviewer. Review the pinned diff.
<the DIFF line of review/PIN, copied verbatim>
Copy that DIFF line into your run status block character for character. The diff is review/diff.patch. The working tree is at head.
The change implements <ticket path>. It is the author's intent, given as context. Review only the code in the diff.
Recorded human decisions are in review/DECISIONS.md. A recorded decision is final.
Read AGENTS.md and REVIEW-CONTRACT.md first, then the knowledge files your agent file lists.
CI results for head are in review/ci-results.txt.
Reply only with the contract blocks: your run status, then one finding block per issue.
```

Copy the DIFF line from `review/PIN` itself; never type a SHA. Leave out the ticket line
when `review/PIN` names no ticket. Do not add a summary of the
diff, a hint, your routing notes or another reviewer's output.

## 3 · Record every status

When a reviewer returns, write its reply verbatim to `review/runs/<agent>.md`. Write one
file per write call, with the path relative to the workspace root, for example
`review/runs/tester.md`. Never put several files in one patch.

- If the task fails, write a run status block with `RUN ERROR` and the error in one line.
- If a reviewer has not returned after 10 minutes, stop it and write `RUN TIMEOUT`.
- Do not start any reviewer a second time. Nothing reruns automatically.

## 4 · Reconcile

When every reviewer on the roster has a file in `review/runs/`, start the `reconciler`
agent once with this prompt:

```text
Reconcile the review of the pin in review/PIN. Copy its DIFF line into the report character for character:
<the DIFF line of review/PIN, copied verbatim>
Read REVIEW-CONTRACT.md, review/DECISIONS.md and the knowledge file your agent file lists.
The reviewer records are review/runs/<agent>.md for: <agents>.
The roster is review/ROSTER. Copy its lines under ROSTER exactly as they are.
Reply only with the report in the contract's report format.
```

Write its reply verbatim to `review/REPORT.md`, as one write call with the path
`review/REPORT.md`. Then print the report and stop.

## Rerun one reviewer

If you are asked to rerun one role, for example `rerun tester`, read the roster from
`review/ROSTER`. Start only that agent, with the step 2 prompt. Overwrite only its file
in `review/runs/`. Keep every other record as it is. Then reconcile as in step 4.

## Reconcile only

If you are asked to reconcile only, start no reviewer. Read the roster from
`review/ROSTER` and reconcile the records in `review/runs/` as they are, as in step 4.

## Record a human decision

If you are asked to record a human decision on a disputed rule, start no reviewer and do not
pin. In `review/DECISIONS.md`, remove a last line that reads `none`, then append exactly:

```text

DECISION  <rule ID>
DATE      <today, YYYY-MM-DD>
TEXT      <the decision, in the human's words>
```

Then read `review/DECISIONS.md` back and print all of it, unchanged, as your reply. Stop.
