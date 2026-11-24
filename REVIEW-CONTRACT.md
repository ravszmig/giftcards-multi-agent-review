# Review contract

Every reviewer replies in this format and nothing else. The reconciler reads only these
blocks and writes one report.

## Run status: one block per reviewer

```text
ROLE      <role name>
RUN       RAN | TIMEOUT | ERROR | NOT RUN
RESULT    FINDINGS | NO FINDINGS
```

- RESULT appears only when RUN is RAN.
- TIMEOUT, ERROR and NOT RUN are missing coverage. They say nothing about the code.

## Finding: one block per issue, after the run status

```text
SEVERITY  CRITICAL | HIGH | MEDIUM | LOW | NIT
WHERE     <file>:<line>
OBSERVED  what the reviewer saw, quoting the code, and the rule ID it breaks
IMPACT    what it would break, and for whom
ACTION    what would resolve it
```

- One issue per block.
- WHERE is a changed file and a line in it. The ticket is context, never the place of a
  finding.
- Where the code breaks a rule and the evidence supports two readings, OBSERVED begins with
  `DISPUTED:` and quotes both sources. The finding keeps its severity.
- A decision recorded in `review/DECISIONS.md` closes its dispute. Code that matches it gets
  no finding.

## Severities

Use the severity your knowledge file gives for a rule. Where it gives none:

| Level | Effect | Impact | Example |
| --- | --- | --- | --- |
| CRITICAL | Blocks | Exploitable, losing data or taking the service down as shipped | Secret committed, auth bypass |
| HIGH | Blocks | Breaks or exposes users or callers in normal use | A retry charges the customer twice |
| MEDIUM | Does not block | Wrong in an edge case, or design debt | Missing error path |
| LOW | Does not block | Minor gap with no user impact | Missing test for unchanged code |
| NIT | Does not block | Naming, comments, style | Naming, style |

## Report

```text
REVIEW REPORT
VERDICT   PASS | FAIL
CAUSES    <each cause of FAIL, or "none">

ROSTER
<role>    required
<role>    added by <rule ID>: <the changed line that matched>

COVERAGE
<role>    RUN <status>    RESULT <result, or "none">

FINDINGS
<the finding blocks, merged where two roles found the same issue; each adds:>
RAISED BY <role, role>

DISAGREEMENTS
<each disagreement with both readings, or "none">

NEXT
<one line per cause, naming its rule: fix the code, a human decides between two readings, or rerun <role>>
```

## Verdict

- **PASS** needs every required role at RUN RAN and no open CRITICAL or HIGH finding.
- **FAIL** is missing coverage, a blocking finding, or both. CAUSES lists each one.
- A disputed finding counts towards FAIL until a human decides and records the decision.
- PASS means no blocker under this policy. It makes no claim that the code is correct.
- Nothing reruns automatically. The person who asked for the review decides the next step.
