# Review contract

Every reviewer replies in this format and nothing else. The reconciler reads only these
blocks. Plain text, one field per line, field names in capitals.

## Run status: one block per reviewer

```text
ROLE      <role name>
DIFF      base <sha> · head <sha>
RUN       RAN | TIMEOUT | ERROR | NOT RUN
RESULT    FINDINGS | NO FINDINGS
```

- RESULT appears only when RUN is RAN.
- TIMEOUT and ERROR count as missing coverage. They say nothing about the code.
- Only RAN with NO FINDINGS means the reviewer looked and found nothing.

## Finding: one block per issue, after the run status

```text
SEVERITY  CRITICAL | HIGH | MEDIUM | LOW | NIT
WHERE     <file>:<line in the head commit>
OBSERVED  what the reviewer saw in the diff or the files, and the rule ID it breaks
IMPACT    what it would break, and for whom
ACTION    what would resolve it
```

- One issue per block. Two issues in one place are two blocks.
- IMPACT sets the severity. Use the policy below, and the severity your knowledge file
  gives for the rule.
- OBSERVED quotes the code or names the evidence. A claim without evidence is not a finding.
- WHERE is `<path>:<line>` and nothing else: a file in the diff, relative to the repository
  root, with no rule ID, label or prefix. Rule IDs go in OBSERVED. The ticket is context,
  never the place of a finding.
- Where the code breaks a rule and the evidence supports two readings, OBSERVED begins with
  `DISPUTED:` and quotes both sources. The finding keeps its severity. Code that follows
  the rule is never DISPUTED.
- A decision recorded in `review/DECISIONS.md` closes its dispute. Code that matches it
  gets no finding.
- Report only issues inside your own remit.

## Severity policy

| Level | Effect | Impact | Example |
| --- | --- | --- | --- |
| CRITICAL | Blocks | Exploitable, losing data or taking the service down as shipped | Secret committed, auth bypass |
| HIGH | Blocks | Breaks or exposes users or callers in normal use | A retry charges the customer twice |
| MEDIUM | Does not block | Wrong in an edge case, or design debt | Missing error path |
| LOW | Does not block | Minor gap with no user impact | Missing test for unchanged code |
| NIT | Does not block | Naming, comments, style | Naming, style |

## Report: written once, by the reconciler

```text
REVIEW REPORT
DIFF      base <sha> · head <sha>
VERDICT   PASS | FAIL
CAUSES    <each cause of FAIL on its own line, naming every open CRITICAL and HIGH by rule ID and file, or "none">

ROSTER
<the lines of review/ROSTER, copied unchanged: "<role>    required", or
"<role>    added by <rule id>: <the added or removed diff line that matched>">

COVERAGE
<role>    RUN <status>    RESULT <result, or "none">   (one line per role on the roster)

FINDINGS
<one finding block per issue, merged; each block adds:>
RAISED BY <role, role>
EVIDENCE  <role>: <that role's OBSERVED text>   (one line per role that raised it)

DISAGREEMENTS
<each disagreement, with both readings and the roles or sources that hold them, or "none">

NEXT
<one line per FAIL cause: fix the code, a human decides: <decision ID>: <reading one> or <reading two>, or rerun <role>>
```

- Role names are exactly: Architect, Tester, Security Auditor, API compatibility,
  Migrations, Primitive obsession. An added role reads `added by R1: <line>`.
- Each heading appears once, on its own line. No em dash anywhere in the report.
- PASS needs every required role at RUN RAN and no open CRITICAL or HIGH finding.
- FAIL means missing coverage, a blocking finding, or both. CAUSES lists each one.
- Two roles giving the same issue different severities is a disagreement. So is a finding
  marked `DISPUTED:` whose rule has no decision in `review/DECISIONS.md`. NEXT says "a
  human decides" exactly when DISAGREEMENTS is not "none". Report both readings. The higher severity counts towards the verdict
  until a human decides.
- PASS means no blocker under this policy. It makes no claim that the code is correct.
- Nothing reruns automatically. The person who invoked the review decides the next step.
- CAUSES and NEXT name every blocker by a rule ID its OBSERVED cites. When it cites a
  business decision, such as `BD-007` or `BD-011`, that ID is the one named, never a T- rule
  alone. A `DISPUTED:` finding is named the same way in DISAGREEMENTS.
- Every field label is padded to column 10, as in the blocks above.
- CAUSES has one cause per line. The first follows `CAUSES    `; every further line is
  indented 10 spaces, so each cause starts at column 10.
- Every DIFF line is copied from the `DIFF` line of `review/PIN`, character for character.
- Every record's finding appears in FINDINGS once, with its WHERE copied verbatim and every
  rule ID it cites. Findings with different rule IDs are never merged.
- No finding is rated above the severity its rule gives. A finding that cites only rules
  with a stated severity takes at most the highest of them.
