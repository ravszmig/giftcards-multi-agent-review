# Review patterns

Evidence: `gift-card-service`, the first commit on `main`.
Static inspection of that commit only. Review history was not inspected.

Read by: the reconciler. The reconciler adds no finding of its own; this file tells it how
to merge, what counts as a disagreement and how to word the next step. Rules carry an ID
(`RP-n`).

## 1. Maintained instructions

| File | What it requires of a review |
|---|---|
| `REVIEW-CONTRACT.md` | the record, finding and report formats, and the verdict rule |
| `.github/skills/multi-agent-review/SKILL.md` | the roster, the routing rules and the order of steps |
| `.github/agents/*.agent.md` | one remit per role, and the knowledge file each role reads |

## 2. Who owns which rule

Each reviewer applies the rules in its own knowledge file and cites them by ID. The
prefix tells the reconciler which role a rule belongs to.

| Prefix | Role |
|---|---|
| `A-`, `CS-` | Architect |
| `T-`, `BD-` | Tester |
| `S-`, `SEC-RA-` | Security Auditor |
| `P-` | API compatibility |
| `M-` | Migrations |
| `CP-` | Primitive obsession |

## 3. Copying findings

- **RP-1** Every finding is copied from its reviewer's record exactly as written, with
  `RAISED BY <role>` added. No finding is reworded or merged. Two roles reporting the same
  issue give two findings, each with its role.
- **RP-2** Findings with different rule IDs are always separate. A method that breaks a
  business rule and also imports the wrong package is two findings.
- **RP-3** A finding keeps the severity its reviewer gave. When two roles rate the same
  issue differently, both findings stay as written, the two readings go under
  DISAGREEMENTS, and the higher one counts towards the verdict.
- **RP-4** Order FINDINGS by severity, CRITICAL first.

## 4. Disagreements

- **RP-5** A reviewer's finding whose OBSERVED begins with `DISPUTED:` goes under
  DISAGREEMENTS as well as FINDINGS. Copy both readings and their sources, with dates and
  owners. The finding stays open and counts towards the verdict at its severity until a
  human decides. NEXT reads "a human decides: <decision ID>: <reading one> or <reading
  two>", naming the business decision, such as BD-011. A dispute
  whose rule ID has a decision in `review/DECISIONS.md` is closed: it is not a
  disagreement, NEXT does not say "a human decides" for it, and CAUSES does not list it.
- **RP-6** Findings are about the code in the diff. Code that differs from the ticket but
  follows a rule is not a finding and not a disagreement. A finding without `DISPUTED:`
  is a confirmed finding.
- **RP-7** One role reporting an issue and another role silent on it is not a disagreement.
  Silence outside a role's remit says nothing.

## 5. Coverage

- **RP-8** One COVERAGE line per role on the roster, in roster order, with RUN and RESULT
  copied from its record in this review's folder, `review/runs/<n>/`.
- **RP-9** A record with no `RUN` field, or one that is not in the contract format, counts
  as `RUN ERROR`. A RUN or RESULT line repeated with the same value counts once.

## 6. NEXT

- **RP-10** CAUSES has one line per open CRITICAL and HIGH finding: every rule ID cited in
  its OBSERVED, then its WHERE, such as `CP-2, CP-3: <path>:<line>`. One line per missing
  role. One line per FAIL cause. A confirmed blocker: "fix the code: <finding>". A
  disputed blocker: "a human decides: ...". Missing coverage: "rerun <role>".
- **RP-11** Nothing reruns automatically. NEXT names an action for a person; it starts
  nothing.

## 7. Open questions

None.
