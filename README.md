# Gift cards: multi-agent review lab

A synthetic Java 21 gift card service, two tickets, and a review stage made of named
reviewer agents. In 60 to 90 minutes the participant builds each ticket with one Copilot CLI
session, reviews it with another, acts on every FAIL, adds a reviewer role of their own, and
makes the one decision no agent may make. Everything happens in IntelliJ and Copilot CLI.

No services, no client code, no tickets of your own. It follows the
[intro deck](../../../../together/06-multi-agent-review/slides.md).

- **Running the session:** [FACILITATOR-GUIDE.md](FACILITATOR-GUIDE.md), step by step.
- **Rehearsing it, or running it with no model:**
  [facilitator/REHEARSAL.md](facilitator/REHEARSAL.md) and
  [facilitator/WRAPPER-RUNBOOK.md](facilitator/WRAPPER-RUNBOOK.md).
- **What each review should find:** [facilitator/EXPECTED.md](facilitator/EXPECTED.md).
  Facilitator only.

## Setup

On `PATH`: JDK 21, Maven 3.9 with `~/.m2` populated (every build runs `mvn -o`), Node.js 22
or later, Git, Copilot CLI 1.0.114 or later, and `gh` signed in. macOS or Linux: the launch
scripts are bash.

From the repository root, once per participant, into a new directory outside this
repository and outside `/tmp`:

```sh
node forge/demos/demo-fixtures/multi-agent-review/fixture.mjs setup "$HOME/mar-lab-$(date +%Y%m%d-%H%M)"
```

It prints `Workspace: <dir>/workspace` and `base <sha> (tag base, branch main)`. Open
`<dir>/workspace` in IntelliJ. The base commit has a fixed author and date, so the SHA is the
same on every macOS or Linux machine set up from the same `base/`. Any change to `base/`
changes it.

`setup` copies `base/` only. Nothing under `facilitator/` reaches the participant's
repository.

> **TODO.** Windows is not covered. The launch scripts are bash and the session profile
> relies on `env -i`. A PowerShell twin of `scripts/copilot-session.sh`, rehearsed once on a
> Windows laptop, closes this.

## What is in it

| Path | What |
|---|---|
| `base/` | The participant's repository: 26 classes, 44 tests, migrations V1 to V3 |
| `base/tickets/` | GC-207 partial refund, GC-212 card expiry. Each contradicts a knowledge file |
| `base/AGENTS.md` | All the builder reads besides the ticket. Names no knowledge file |
| `base/docs/knowledge/` | Nine knowledge files, one reader each. The builder is denied them |
| `base/.github/skills/multi-agent-review/` | The review skill, routing rules R1 and R2, and `pin.mjs`, which pins the change under review and computes its roster from the rules |
| `base/.github/agents/` | Five reviewers and the reconciler |
| `base/review-templates/` | The Primitive obsession role and rule R3, added by hand in the session |
| `base/scripts/copilot-builder`, `copilot-reviewer` | Start Copilot CLI as the builder or the reviewer, each with its own permissions and a disposable profile |
| `facilitator/` | `EXPECTED.md`, proof tests, reference patches for `verify` and the offline fallback, the rehearsal handbook and the wrapper runbook |
| `fixture.mjs` | `setup`, `proofs`, `route`, `audit`, `verify`, and the wrapper commands |
| `builder-cli.mjs`, `review-cli.mjs` | The builder and the review with `-p`, for rehearsals. `review-cli.mjs <dir> check` is the report check |
| `report-check.mjs` | The routing rules and the contract, applied mechanically to a report |

## Who reads what

Each knowledge file has one reader. `fixture.mjs verify` checks this table against the agent
files, and `fixture.mjs audit` checks it against what each subagent opened.

| Agent | Knowledge files | Rules a ticket contradicts |
|---|---|---|
| `architect` | ARCHITECTURE.md, CODE_STRUCTURE.md | A-1, A-2 (T1-C) |
| `tester` | TEST_PATTERNS.md, BUSINESS_DECISIONS.md | BD-007 (T1-A), BD-011 (T2-C) |
| `security-auditor` | SECURITY.md | S-2 (T1-B) |
| `api-compatibility` | API_POLICY.md | P-2, P-3, P-5 (T2-B, T2-D) |
| `migrations` | MIGRATION_PATTERNS.md | M-1, M-2 (T2-A) |
| `primitive-obsession` | CODE_PATTERNS.md | CP-2, CP-3, CP-4 (T2-E) |
| `reconciler` | REVIEW_PATTERNS.md | none: RP-5 sends a disputed finding to DISAGREEMENTS |

The builder reads `AGENTS.md` and the ticket, and is denied `docs/`. The skill's main agent
reads no knowledge file.

## Checking the fixture

```sh
node forge/demos/demo-fixtures/multi-agent-review/fixture.mjs verify "$HOME/mar-verify-$(date +%Y%m%d-%H%M)"
```

About 30 s, no Copilot call. It must end `Verify passed`. The list of checks is in
[the wrapper runbook](facilitator/WRAPPER-RUNBOOK.md#deterministic-checks).

## Starting again

Close the project in IntelliJ, delete the setup directory, and run `setup` into a new one.
The directory holds the workspace, every Copilot session's profile and event log under
`sessions/`, superseded pins under `pins/` and proof runs under `proof-runs/`.
