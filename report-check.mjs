import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const roles = {
  'architect': 'Architect',
  'tester': 'Tester',
  'security-auditor': 'Security Auditor',
  'api-compatibility': 'API compatibility',
  'migrations': 'Migrations',
  'primitive-obsession': 'Primitive obsession',
}
export const required = ['architect', 'tester', 'security-auditor']

// The highest severity each rule allows, from the knowledge files: the severity a rule states
// is its ceiling. A finding that cites only capped rules may not go above the highest of
// their caps; a rule not listed here sets no ceiling. In rehearsal an S-5 came back HIGH and
// blocked a review. verify.mjs checks every entry against the rule's own text.
export const severityCaps = {
  'S-5': 'MEDIUM', 'CS-4': 'LOW', 'T-1': 'MEDIUM', 'T-4': 'MEDIUM', 'P-4': 'MEDIUM',
  'A-3': 'MEDIUM', 'A-4': 'MEDIUM', 'M-5': 'NIT', 'M-6': 'MEDIUM', 'BD-006': 'MEDIUM',
  'BD-014': 'LOW',
}
export const severities = ['NIT', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const ruleRoles = { R1: 'api-compatibility', R2: 'migrations', R3: 'primitive-obsession' }

// R3 covers the published API only: a raw primitive elsewhere is MEDIUM under CP-4 and does
// not block, so routing a role to it would keep the role on every roster for a non-blocker.
// The skill states the routing rules in prose and the model applies them. This is the same
// three rules applied mechanically: the yardstick the model's roster is checked against, so
// a rule the model reads differently from this code shows up as a report-check problem.
const API = 'src/main/java/com/example/giftcard/api/'
const MIGRATIONS = 'src/main/resources/db/migration/'
const comment = /^\s*(\/\/|\*|\/\*)/
const meaning = '(amount|pence|money|balance|card|number|days|grace|expir)'
const primitive = new RegExp(`\\b(long|int|Long|Integer|String)\\s+\\w*${meaning}\\w*`, 'i')
const rawReturn = new RegExp('\\bpublic\\s+(static\\s+)?(final\\s+)?(long|int|Long|Integer|String)'
  + `\\s+\\w*${meaning}\\w*\\s*[(=;]`, 'i')

export const files = (diff) => diff.split(/^(?=diff --git )/m)
  .filter((part) => part.startsWith('diff --git'))
  .map((part) => {
    const target = part.match(/^\+\+\+ b\/(.*)$/m)?.[1] ?? part.match(/^--- a\/(.*)$/m)?.[1]
    const lines = part.split('\n')
    return {
      path: target ?? part.match(/^diff --git a\/(\S+)/)[1],
      added: lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')),
      removed: lines.filter((line) => line.startsWith('-') && !line.startsWith('---')),
    }
  })

export const route = (diff, active = ['R1', 'R2']) => {
  const matches = {}
  for (const file of files(diff)) {
    const changed = [...file.added, ...file.removed]
    if (active.includes('R1') && !matches.R1 && file.path.startsWith(API)) {
      const line = changed.find((text) => /\bpublic\b/.test(text.slice(1))
        && !comment.test(text.slice(1)))
      if (line) matches.R1 = `${file.path}: ${line.trim()}`
    }
    if (active.includes('R2') && !matches.R2 && file.path.startsWith(MIGRATIONS)) {
      matches.R2 = `${file.path}: ${(changed[0] ?? '(renamed or mode change)').trim()}`
    }
    if (active.includes('R3') && !matches.R3 && file.path.startsWith(API)) {
      const line = file.added.find((text) => {
        const code = text.slice(1)
        if (comment.test(code) || !/\bpublic\b/.test(code)) return false
        const params = code.match(/\(([^)]*)\)/)?.[1] ?? ''
        return primitive.test(params) || rawReturn.test(code)
      })
      if (line) matches.R3 = `${file.path}: ${line.trim()}`
    }
  }
  return matches
}

// The roster the rules give, in the report's form. pin writes it to review/ROSTER, and the
// skill's own pin.mjs writes the same lines: verify compares the two.
export const pinnedRoster = (diff, active) => {
  const matches = route(diff, active)
  return [...required.map((agent) => `${roles[agent]}    required`),
    ...Object.keys(matches).sort().map((rule) => {
      const [path] = matches[rule].split(': ', 1)
      const line = matches[rule].slice(path.length + 2)
      return `${roles[ruleRoles[rule]]}    added by ${rule}: ${line}`
    })]
}

// The rules a workspace's skill has switched on: every `| Rn |` row in its routing table.
export const activeRules = (workspace) => {
  const skill = join(workspace, '.github/skills/multi-agent-review/SKILL.md')
  return [...readFileSync(skill, 'utf8').matchAll(/^\|\s*(R\d+)\s*\|/gm)].map((m) => m[1])
}

export const readPin = (review) => {
  const path = join(review, 'PIN')
  if (!existsSync(path)) return undefined
  const text = readFileSync(path, 'utf8')
  return {
    base: text.match(/^base (\S+)/m)?.[1],
    head: text.match(/^head (\S+)/m)?.[1],
    ticket: text.match(/^ticket (\S+)/m)?.[1],
  }
}
const field = (block, name) => block.match(new RegExp(`^${name}\\s+(.*)$`, 'm'))?.[1].trim()
const blocks = (text) => text.split(/\n(?=SEVERITY\s)/).slice(1)
const file = (where = '') => where.replace(/`/g, '').split(':')[0].trim()
const section = (text, name, next) => {
  const after = text.split(new RegExp(`^${name}\\s*$`, 'm'))[1] ?? ''
  return next ? after.split(new RegExp(`^${next}\\s*$`, 'm'))[0] : after
}
const ruleIds = (text = '') => [...new Set(text.match(/\b(?:SEC-RA-\d+-\d+|BD|CS|CP|RP|A|T|S|P|M)-\d+\b/g) ?? [])]
export const closedDecisions = (review) => {
  const path = join(review, 'DECISIONS.md')
  return existsSync(path)
    ? [...readFileSync(path, 'utf8').matchAll(/^DECISION\s+(\S+)/gm)].map((m) => m[1]) : []
}
const byLength = Object.entries(roles).sort(([, a], [, b]) => b.length - a.length)
const roleOf = (line) => byLength
  .find(([, name]) => line.trim().toLowerCase().startsWith(name.toLowerCase()))?.[0]

// A mechanical cross-check of the reconciler's report against the reviewer records and the
// pinned diff. It reads only contract fields, so it cannot judge a merge. It catches a
// dropped finding, a role missing from COVERAGE, a roster that does not match the routing
// rules, a verdict that contradicts the contract's rule, and a DIFF line that does not
// quote the pinned SHAs.
export const checkReport = (review, { pin = readPin(review), rules } = {}) => {
  const problems = []
  const report = readFileSync(join(review, 'REPORT.md'), 'utf8')
  const diffPath = join(review, 'diff.patch')
  const checkPin = (label, text) => {
    const quoted = field(text, 'DIFF') ?? ''
    if (pin && !(quoted.includes(`base ${pin.base}`) && quoted.includes(`head ${pin.head}`))) {
      problems.push(`${label}: DIFF ${quoted || 'missing'} does not quote the pinned SHAs`)
    }
  }
  checkPin('REPORT.md', report)

  // Format: one of each heading, no em dash, canonical role names and the exact roster forms.
  for (const heading of ['REVIEW REPORT', 'ROSTER', 'COVERAGE', 'FINDINGS', 'DISAGREEMENTS', 'NEXT']) {
    const count = report.split('\n').filter((line) => line.trim() === heading).length
    if (count !== 1) problems.push(`FORMAT: heading ${heading} appears ${count} times`)
  }
  if (report.includes('\u2014')) problems.push('FORMAT: the report contains an em dash')
  const names = Object.values(roles).join('|')
  const rosterLines = section(report, 'ROSTER', 'COVERAGE').split('\n').filter((l) => l.trim())
  for (const line of rosterLines) {
    if (!new RegExp(`^(${names})\\s{2,}(required|added by R\\d+: .+)$`).test(line.trim())) {
      problems.push(`ROSTER: non-canonical line "${line.trim()}"`)
    }
  }
  for (const line of section(report, 'COVERAGE', 'FINDINGS').split('\n').filter((l) => l.trim())) {
    if (!new RegExp(`^(${names})\\s{2,}RUN `).test(line.trim())) {
      problems.push(`COVERAGE: non-canonical line "${line.trim()}"`)
    }
  }
  const roster = rosterLines
    .map((line) => ({ agent: roleOf(line), rule: line.match(/\badded by (?:rule )?(R\d+)/)?.[1],
      line }))
    .filter((row) => row.agent)
  // An added role quotes one added or removed line of the diff, never a header.
  const squash = (text) => text.replace(/\s+/g, '')
  const diffLines = existsSync(diffPath) ? readFileSync(diffPath, 'utf8').split('\n')
    .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l)).map(squash) : []
  for (const row of roster.filter((r) => r.rule)) {
    const quote = row.line.split(/added by (?:rule )?R\d+:\s*/)[1] ?? ''
    if (!/^[+-]/.test(quote) || /^(\+\+\+|---) /.test(quote)) {
      problems.push(`ROSTER: ${roles[row.agent]} quotes "${quote}", `
        + 'not an added or removed line')
    } else if (diffLines.length && !diffLines.includes(squash(quote))) {
      problems.push(`ROSTER: ${roles[row.agent]} quotes a line not in the diff: "${quote}"`)
    }
  }
  // pin wrote the roster the rules give. The report copies it, line for line.
  const pinned = join(review, 'ROSTER')
  if (existsSync(pinned)) {
    const want = readFileSync(pinned, 'utf8').split('\n').filter((l) => l.trim()).map(squash)
    const got = rosterLines.map(squash)
    if (want.join('\n') !== got.join('\n')) {
      problems.push('ROSTER: differs from review/ROSTER, which the report copies line for line')
    }
  }
  if (rules) {
    const expected = existsSync(diffPath) ? route(readFileSync(diffPath, 'utf8'), rules) : {}
    for (const agent of required) {
      if (!roster.some((row) => row.agent === agent)) {
        problems.push(`ROSTER: ${roles[agent]} missing`)
      }
    }
    for (const [rule, match] of Object.entries(expected)) {
      const row = roster.find((r) => r.agent === ruleRoles[rule])
      if (!row) {
        problems.push(`ROSTER: rule ${rule} matches (${match}) but `
          + `${roles[ruleRoles[rule]]} is not on it`)
      } else if (row.rule !== rule) {
        problems.push(`ROSTER: ${roles[ruleRoles[rule]]} does not name rule ${rule}`)
      }
    }
    for (const row of roster.filter((r) => !required.includes(r.agent))) {
      const rule = Object.keys(ruleRoles).find((id) => ruleRoles[id] === row.agent)
      if (!expected[rule]) {
        problems.push(`ROSTER: ${roles[row.agent]} added, but rule ${rule} does not match the diff`)
      }
    }
  }

  const merged = blocks(section(report, 'FINDINGS', 'DISAGREEMENTS')).map((block) => ({
    file: file(field(block, 'WHERE')),
    where: field(block, 'WHERE'),
    severity: field(block, 'SEVERITY'),
    raisedBy: (field(block, 'RAISED BY') ?? '').toLowerCase(),
    observed: field(block, 'OBSERVED') ?? '',
  }))
  const blocking = merged.filter((finding) => /^(CRITICAL|HIGH)\b/.test(finding.severity ?? ''))

  // Each finding once. In rehearsal a reconcile listed the same finding twice.
  const seen = new Set()
  for (const finding of merged) {
    const key = [finding.where, finding.severity, finding.raisedBy, finding.observed].join('|')
    if (seen.has(key)) {
      problems.push(`FINDINGS: the ${finding.severity} at ${finding.where} is listed twice`)
    }
    seen.add(key)
  }

  // A finding is about code in the diff. The ticket or a knowledge file is never its place.
  if (existsSync(diffPath)) {
    const inDiff = new Set(files(readFileSync(diffPath, 'utf8')).map((f) => f.path))
    for (const finding of merged) {
      if (!inDiff.has(finding.file)) problems.push(`FINDINGS: WHERE ${finding.where} is not a file in the diff`)
    }
  }

  // "A human decides" and DISAGREEMENTS go together: one without the other is a report that
  // either hides a dispute or asks a human about nothing.
  const disagreements = section(report, 'DISAGREEMENTS', 'NEXT').trim()
  const none = /^none\.?$/i.test(disagreements) || disagreements === ''
  const human = /a human decides/i.test(section(report, 'NEXT'))
  if (human && none) problems.push('NEXT says "a human decides" but DISAGREEMENTS is none')
  if (!human && !none) problems.push('DISAGREEMENTS lists a dispute but NEXT has no "a human decides"')

  // No finding goes above its rules' ceiling.
  const rank = (severity) => severities.indexOf((severity ?? '').split(/\s/)[0])
  for (const finding of merged) {
    const ids = ruleIds(finding.observed)
    if (!ids.length || !ids.every((id) => severityCaps[id])) continue
    const cap = ids.map((id) => severityCaps[id]).sort((a, b) => rank(b) - rank(a))[0]
    if (rank(finding.severity) > rank(cap)) {
      problems.push(`FINDINGS: ${finding.severity} at ${finding.where} is above the maximum `
        + `of ${ids.join(', ')}, ${cap}`)
    }
  }

  // CAUSES puts one cause per line; every line after the first is indented to column 10.
  const causeLines = (report.match(/^CAUSES {4}.*\n((?:.+\n)*)/m)?.[1] ?? '').split('\n')
    .filter((line) => line.trim())
  const unindented = causeLines.filter((line) => !/^ {10}\S/.test(line))
  if (unindented.length) {
    problems.push(`FORMAT: ${unindented.length} CAUSES line(s) not indented to column 10`)
  }

  // CAUSES and NEXT name every open blocker by a rule its OBSERVED cites: its BD- decision
  // when it cites one, never a T- rule alone. In rehearsal a BD-007 blocker was listed as T-3.
  const closedIds = closedDecisions(review)
  const next = section(report, 'NEXT')
  const causesText = report.match(/^CAUSES\s+([\s\S]*?)\n\s*\n/m)?.[1] ?? ''
  const citesId = (text, id) => new RegExp(`\\b${id}\\b`).test(text)
  for (const finding of blocking) {
    const ids = ruleIds(finding.observed)
    const decision = ids.find((id) => id.startsWith('BD-'))
    const disputed = /^DISPUTED:/.test(finding.observed)
    if (disputed && !decision) {
      problems.push(`FINDINGS: DISPUTED finding at ${finding.where} names no BD- decision`)
      continue
    }
    if (!ids.length || (decision && closedIds.includes(decision))) continue
    const want = decision ? [decision] : ids
    const label = want.join(' or ')
    if (!want.some((id) => citesId(causesText, id))) {
      problems.push(`CAUSES: the ${finding.severity} at ${finding.where} is not named by ${label}`)
    }
    const lines = next.split('\n').filter((l) => !disputed || /a human decides/i.test(l))
    if (!lines.some((l) => want.some((id) => citesId(l, id)))) {
      problems.push(`NEXT: the ${finding.severity} at ${finding.where} is not named by ${label}`)
    }
  }

  // Field labels are padded to column 10, as in the contract.
  const labels = ['SEVERITY', 'WHERE', 'OBSERVED', 'IMPACT', 'ACTION', 'RAISED BY', 'EVIDENCE']
  const misaligned = report.split('\n').flatMap((l) => {
    const label = labels.find((name) => l.startsWith(`${name} `))
    return label && !/^\S/.test(l.slice(10)) ? [label] : []
  })
  if (misaligned.length) {
    problems.push(`FORMAT: ${misaligned.length} field label(s) not padded to column 10 `
      + `(${[...new Set(misaligned)].join(', ')})`)
  }

  // CAUSES names every open blocker, by rule ID or by file.
  const causes = (report.match(/^CAUSES\s+([\s\S]*?)\n\s*\n/m)?.[1] ?? '')
  for (const finding of blocking) {
    const base = finding.file.split('/').pop()
    if (!causes.includes(base) && !ruleIds(finding.observed).some((id) => causes.includes(id))) {
      problems.push(`CAUSES: open ${finding.severity} at ${finding.where} is not listed`)
    }
  }

  // A recorded decision closes its dispute; a blocker that still rests on it is stale.
  const closed = closedDecisions(review)
  for (const finding of blocking) {
    const ids = ruleIds(finding.observed).filter((id) => closed.includes(id))
    if (ids.length) {
      problems.push(`FINDINGS: ${finding.severity} at ${finding.where} still blocks on `
        + `${ids.join(', ')}, which review/DECISIONS.md closed`)
    }
  }
  const coverage = section(report, 'COVERAGE', 'FINDINGS')
  const runs = join(review, 'runs')
  const records = existsSync(runs) ? readdirSync(runs).filter((name) => name.endsWith('.md')) : []

  for (const name of records) {
    const agent = name.replace(/\.md$/, '')
    const role = roles[agent] ?? agent
    const text = readFileSync(join(runs, name), 'utf8')
    checkPin(`runs/${name}`, text)
    const run = field(text, 'RUN')
    const line = coverage.split('\n').find((row) => roleOf(row) === agent)
    if (!line) problems.push(`${role}: no COVERAGE line`)
    else if (run && !line.includes(run)) {
      problems.push(`${role}: record says RUN ${run}, report says ${line.trim()}`)
    }
    for (const block of blocks(text)) {
      const where = field(block, 'WHERE')
      const found = merged.some((finding) => finding.file === file(where)
        && finding.raisedBy.includes(role.toLowerCase()))
      if (!found) {
        problems.push(`${role}: ${field(block, 'SEVERITY')} at ${where} is not in FINDINGS`)
        continue
      }
      // The report keeps the record's WHERE and every rule ID it cites: a rewritten path, or
      // findings with different rules merged into one, loses what the reviewer said.
      const flat = (text = '') => text.replace(/[`\s]/g, '')
      const ids = ruleIds(field(block, 'OBSERVED'))
      const kept = merged.some((finding) => flat(finding.where) === flat(where)
        && finding.raisedBy.includes(role.toLowerCase())
        && ids.every((id) => ruleIds(finding.observed).includes(id)))
      if (!kept) {
        problems.push(`${role}: ${field(block, 'SEVERITY')} at ${where}`
          + `${ids.length ? ` (${ids.join(', ')})` : ''} is changed in FINDINGS: `
          + 'WHERE or rule differs')
      }
    }
  }
  for (const row of roster) {
    if (!records.includes(`${row.agent}.md`)) {
      problems.push(`${roles[row.agent]}: on the roster, no record in runs/`)
    }
  }

  const covered = required.every((agent) => {
    const path = join(runs, `${agent}.md`)
    return existsSync(path) && field(readFileSync(path, 'utf8'), 'RUN') === 'RAN'
  })
  const blocker = blocking.length > 0
  const expected = covered && !blocker ? 'PASS' : 'FAIL'
  const verdict = field(report, 'VERDICT')
  if (verdict !== expected) {
    problems.push(`VERDICT is ${verdict}; the contract's rule gives ${expected}`)
  }
  return { verdict, expected, problems, roster, findings: merged }
}
