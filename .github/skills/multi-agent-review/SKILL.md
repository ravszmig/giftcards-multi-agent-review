---
name: multi-agent-review
description: Reviews the current uncommitted changes with named reviewer agents in parallel, then has the reconciler write one report with a PASS or FAIL verdict. Use when asked to review the current changes, to say which optional roles the changes route to, to rerun one reviewer, to reconcile the existing records again, or to record a human decision.
---

# Multi-agent review

You run the review stage. You do not review the code yourself, you read no file under
`docs/`, and you change no file outside `review/`. Each reviewer and the reconciler is a
custom agent. You start each one with the `task` tool. You do not use `/fleet`.

## The change

The change under review is every uncommitted change in the working tree, compared with
`HEAD`. See it with two commands:

- `git status --porcelain`: the changed files. A file marked `??` is new.
- `git diff HEAD`: the changed lines of every file Git already tracks. Read a new file whole.

Ignore changes under `.github/`, `review-templates/` and `review/`: they are the review
setup, not the change. If nothing else has changed, say so and stop.

## 1 · Set the roster

Three roles run on every change:

| Role | Agent |
| --- | --- |
| Architect | `architect` |
| Tester | `tester` |
| Security Auditor | `security-auditor` |

An optional role joins only when its rule matches a changed line. Check each rule against
the file's path first, then its added or removed lines:

| Rule | Role | Agent | Added when the change |
| --- | --- | --- | --- |
| R1 | API compatibility | `api-compatibility` | adds, removes or changes a line containing `public` in a file under `src/main/java/com/example/giftcard/api/`: a public class, constructor, method, field or constant of the published API |
| R2 | Migrations | `migrations` | adds, changes or deletes any file under `src/main/resources/db/migration/` |

For each rule that matches, note the rule ID and the first changed line that matched. If no
optional rule matches, the roster is the three required roles. Do not form an opinion of the
code.

If you are asked only which optional rules match, answer with each matching rule and its
line, or "No optional rule matches", and start no reviewer.

## 2 · Start every reviewer at once

Before a full review, delete the previous records in `review/runs/` and `review/REPORT.md`
with your file tool, for example one `apply_patch` with a `*** Delete File: <path>` line per
file. Keep `review/DECISIONS.md`. Never use a shell command to delete or write a file: the
only shell commands in a review are `git status` and `git diff`.

Start all reviewers on the roster in a single response: one `task` call per role, all in the
same turn, so they run in parallel. Every `task` call sets four fields: `name` (the agent,
for example `tester`), `agent_type` (the same agent), `description` and `prompt`. Send each
the same prompt, with only the role changed:

```text
You are the <Role> reviewer. Review the current uncommitted changes against HEAD.
The change implements <ticket path>. It is the author's intent, given as context. Review only the changed code.
Recorded human decisions, if any, are in review/DECISIONS.md. A recorded decision is final.
Read AGENTS.md and REVIEW-CONTRACT.md first, then the knowledge files your agent file lists.
Reply only with the contract blocks: your run status, then one finding block per issue.
```

Name the ticket the user names, or leave that line out. Do not add a summary of the change,
a hint, your routing notes or another reviewer's output.

## 3 · Record every status

When a reviewer returns, write its reply verbatim to `review/runs/<agent>.md` as a new file
with your file tool, one file per call. If a file is already at that path, delete it first
with the file tool, then create it. Never patch a record, and never write a file through the
shell: no heredoc, no redirect.

- If the task fails, write a run status block with `RUN ERROR` and the error in one line.
- If a reviewer has not returned after 10 minutes, stop it and write `RUN TIMEOUT`.
- Do not start any reviewer a second time. Nothing reruns automatically.

## 4 · Reconcile

When every reviewer on the roster has a record, start the `reconciler` agent once:

```text
Reconcile the review of the current changes.
Read REVIEW-CONTRACT.md, review/DECISIONS.md if it exists, and the knowledge file your agent file lists.
The reviewer records are review/runs/<agent>.md for: <agents>.
Roster: <one line per role: "<Role name>    required" or "<Role name>    added by <rule ID>: <matched line, without its leading + or ??>">.
Reply only with the report in the contract's format.
```

Write its reply verbatim to `review/REPORT.md` as a new file with your file tool: delete any
earlier report first with the file tool, never patch it. Then print the report and stop.

## Rerun one reviewer

If you are asked to rerun a role, start only that agent with the step 2 prompt, delete and
recreate only its record, and reconcile as in step 4 with the roster of the last report.

## Reconcile only

If you are asked to reconcile only, start no reviewer and reconcile the records as they are,
with the roster of the last report.

## Record a human decision

If you are asked to record a human decision on a disputed rule, start no reviewer. The rule
ID is the business decision, such as `BD-011`, never a T- rule. Use your file
tool. Create `review/DECISIONS.md` if it does not exist, with the line `# Decisions`. Append:

```text

DECISION  <rule ID>
DATE      <today, YYYY-MM-DD>
TEXT      <the decision, in the human's words>
```

Then print the file and stop.
