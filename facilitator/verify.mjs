import assert from 'node:assert/strict'
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  activeRules, checkReport, pinnedRoster, readPin, route, severities, severityCaps,
} from './report-check.mjs'
import { addRole, cli, git, maven, proofs, repo, run } from './tools.mjs'

// The repository root is the participant's project; facilitator/ is everything else.
const base = repo
const root = repo
const REFUND = 'src/main/java/com/example/giftcard/domain/RefundService.java:30'
const say = (line) => console.log(line)
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  if (['target', 'node_modules', '.git', '.lab', 'review', '.idea'].includes(name)) return []
  return statSync(path).isDirectory() ? walk(path) : [path]
})
const lineOf = (file, number) => readFileSync(file, 'utf8').split('\n')[number - 1] ?? ''
const knowledgeOf = (file) => {
  const list = readFileSync(file, 'utf8').split(/^## Knowledge$/m)[1]?.split(/^## /m)[0] ?? ''
  return [...list.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1])
}

const staticChecks = () => {
  const agentsMd = readFileSync(join(base, 'AGENTS.md'), 'utf8')
  const named = readdirSync(join(base, 'docs/knowledge')).filter((f) => agentsMd.includes(f))
  assert.ok(!/knowledge/i.test(agentsMd) && named.length === 0, `AGENTS.md names ${named}`)
  assert.ok(!/facilitator/i.test(agentsMd), 'AGENTS.md mentions facilitator/')
  assert.ok(!existsSync(join(base, '.github/copilot-instructions.md')),
    'base has .github/copilot-instructions.md; the builder would load it')
  const ignored = readFileSync(join(base, '.gitignore'), 'utf8').split('\n')
  for (const entry of ['.idea/', '*.iml', 'target/', 'review/', '.lab/']) {
    assert.ok(ignored.includes(entry), `.gitignore does not ignore ${entry}`)
  }
  assert.ok(readFileSync(join(base, '.ignore'), 'utf8').split('\n').includes('facilitator/'),
    '.ignore does not hide facilitator/ from search tools')
  const session = readFileSync(join(base, 'scripts/copilot-session.sh'), 'utf8')
  const [builderFlags, reviewerFlags] = session.split(/^reviewer\)$/m)
  for (const [role, flags, denied] of [['builder', builderFlags, ['docs', 'facilitator']],
    ['reviewer', reviewerFlags, ['facilitator']]]) {
    for (const dir of denied) {
      assert.ok(flags.includes(`--deny-tool="read($W/${dir}/**)"`), `${role} may read ${dir}/`)
    }
  }
  say('Isolation: AGENTS.md names no knowledge file and no facilitator/; no '
    + 'copilot-instructions.md; the builder is denied docs/ and facilitator/, the reviewer '
    + 'facilitator/; search tools skip facilitator/; .idea, target, review and .lab are ignored')

  const knowledge = readdirSync(join(base, 'docs/knowledge')).filter((f) => f.endsWith('.md'))
  const agents = Object.fromEntries([
    ...readdirSync(join(base, '.github/agents')).map((f) => [f, join(base, '.github/agents', f)]),
    ['primitive-obsession.agent.md', join(base, 'review-templates/primitive-obsession.agent.md')],
  ].map(([name, path]) => [name.replace('.agent.md', ''), knowledgeOf(path)]))
  const readers = new Map()
  for (const [agent, files] of Object.entries(agents)) {
    assert.ok(files.length > 0 && files.length < knowledge.length, `${agent}: ${files}`)
    for (const file of files) {
      assert.ok(knowledge.includes(file), `${agent} lists missing ${file}`)
      assert.ok(!readers.has(file), `${file} is read by ${readers.get(file)} and ${agent}`)
      readers.set(file, agent)
    }
  }
  for (const file of knowledge) assert.ok(readers.has(file), `${file} has no reader`)
  const table = readFileSync(join(root, 'facilitator/EXPECTED.md'), 'utf8').split('\n')
  for (const [agent, files] of Object.entries(agents)) {
    const row = table.find((l) => l.startsWith(`| \`${agent}\``))
    assert.ok(row, `EXPECTED.md has no who-reads-what row for ${agent}`)
    assert.deepEqual([...row.matchAll(/[A-Z_]+\.md/g)].map((m) => m[0]).sort(), [...files].sort(),
      `EXPECTED.md row for ${agent}`)
  }
  say(`Persona scoping: ${knowledge.length} knowledge files, each read by exactly one of `
    + `${Object.keys(agents).length} agents; EXPECTED.md's table matches the agent files`)

  // Every severity ceiling the report check enforces is the one the rule's own text states.
  const ruleLines = knowledge.flatMap((f) => readFileSync(join(base, 'docs/knowledge', f), 'utf8')
    .split('\n'))
  for (const [id, cap] of Object.entries(severityCaps)) {
    const row = ruleLines.find((l) => l.startsWith(`| ${id} |`))
    let stated
    if (row) {
      stated = row.split('|').map((c) => c.trim()).filter((c) => severities.includes(c))
    } else {
      const start = ruleLines.findIndex((l) => l.startsWith(`- **${id} `)
        || l.startsWith(`- **${id}**`))
      assert.ok(start >= 0, `severity cap ${id}: no such rule in docs/knowledge`)
      const end = ruleLines.findIndex((l, i) => i > start && (/^(- |#)/.test(l) || !l.trim()))
      stated = [...ruleLines.slice(start, end).join(' ')
        .matchAll(/\*\*(CRITICAL|HIGH|MEDIUM|LOW|NIT)\*\*/g)].map((m) => m[1])
    }
    const top = stated.sort((a, b) => severities.indexOf(b) - severities.indexOf(a))[0]
    assert.equal(top, cap, `severity cap ${id}: the rule states ${stated.join(', ') || 'none'}`)
  }
  say(`Severity caps: ${Object.keys(severityCaps).length} ceilings match their rules' text`)

  const prefixes = { 'M/': 'src/main/java/com/example/giftcard/',
    'T/': 'src/test/java/com/example/giftcard/', 'R/': 'src/main/resources/db/migration/' }
  let locators = 0
  for (const file of knowledge) {
    const text = readFileSync(join(base, 'docs/knowledge', file), 'utf8')
    for (const [, path, from, to] of
      text.matchAll(/`((?:M\/|T\/|R\/|pom\.xml)[^`:]*):(\d+)(?:-(\d+))?`/g)) {
      const target = join(base, prefixes[path.slice(0, 2)]
        ? prefixes[path.slice(0, 2)] + path.slice(2) : path)
      assert.ok(existsSync(target), `${file}: locator ${path} does not exist`)
      const length = readFileSync(target, 'utf8').split('\n').length
      assert.ok(Number(to ?? from) <= length, `${file}: ${path}:${from}-${to} beyond ${length}`)
      locators++
    }
  }
  say(`Knowledge locators: ${locators} resolve to existing lines`)

  const expected = readFileSync(join(root, 'facilitator/EXPECTED.md'), 'utf8')
  let citations = 0
  for (const [, path, number, needle] of expected.matchAll(/`([^`\s]+\.md):(\d+)` «([^»]+)»/g)) {
    assert.ok(lineOf(join(base, path), Number(number)).includes(needle),
      `EXPECTED.md: ${path}:${number} does not contain «${needle}»`)
    citations++
  }
  assert.ok(citations >= 16, `EXPECTED.md has only ${citations} checked citations`)
  say(`Facilitator key: ${citations} ticket and knowledge citations match their lines`)

  assert.ok(statSync(join(base, '.github/skills/multi-agent-review/pin.mjs')).mode & 0o100,
    'pin.mjs is not executable: the review session runs it by path')
  for (const script of ['copilot-builder', 'copilot-reviewer', 'copilot-session.sh']) {
    const file = join(base, 'scripts', script)
    assert.ok(statSync(file).mode & 0o100, `scripts/${script} is not executable`)
    assert.equal(run(base, 'bash', ['-n', file]).status, 0, `scripts/${script}: bash syntax`)
  }
  say('Launch scripts: scripts/copilot-builder and copilot-reviewer are executable bash')

  const texts = walk(base)
    .filter((f) => /\.(md|java|sql|xml|mjs)$/.test(f))
  const dashes = texts.filter((f) => readFileSync(f, 'utf8').includes('\u2014'))
  assert.deepEqual(dashes.map((f) => relative(root, f)), [], 'em dashes')
  say(`Voice: no em dash in ${texts.length} fixture files`)
}

const record = (role, sha, findings) => [
  `ROLE      ${role}`, `DIFF      base ${sha.base} · head ${sha.head}`, 'RUN       RAN',
  `RESULT    ${findings.length ? 'FINDINGS' : 'NO FINDINGS'}`, '',
  ...findings.flatMap(([severity, where]) => [`SEVERITY  ${severity}`, `WHERE     ${where}`,
    'OBSERVED  x', 'IMPACT    x', 'ACTION    x', '']),
].join('\n')
const report = (sha, verdict, roster, findings, { causes, disagreements = 'none',
  next = 'none', observed = 'x' } = {}) => [
  'REVIEW REPORT', `DIFF      base ${sha.base} · head ${sha.head}`, `VERDICT   ${verdict}`,
  `CAUSES    ${causes ?? (findings.filter(([s]) => /CRITICAL|HIGH/.test(s))
    .map(([, where]) => where.split(':')[0].split('/').pop()).join(', ') || 'none')}`,
  '', 'ROSTER', ...roster, '', 'COVERAGE',
  ...roster.map((line) => `${line.split(/\s{2,}/)[0]}    RUN RAN    RESULT x`), '', 'FINDINGS',
  ...findings.flatMap(([severity, where, by]) => [`SEVERITY  ${severity}`, `WHERE     ${where}`,
    `OBSERVED  ${observed}`, 'IMPACT    x', 'ACTION    x', `RAISED BY ${by}`,
    `EVIDENCE  ${by}: x`, '']),
  'DISAGREEMENTS', disagreements, '', 'NEXT', next, '',
].join('\n')

// The report check must catch each mistake a reconciler or a router can make.
const reportCheckSelfTest = (target, name, rules, sha, roster, records, findings) => {
  const dir = join(target, '.lab', 'report-check', name)
  mkdirSync(join(dir, 'runs'), { recursive: true })
  cpSync(join(target, 'review/diff.patch'), join(dir, 'diff.patch'))
  writeFileSync(join(dir, 'PIN'), `base ${sha.base}\nhead ${sha.head}\n`)
  for (const [role, own] of Object.entries(records)) {
    writeFileSync(join(dir, 'runs', `${role}.md`), record(role, sha, own))
  }
  const verdict = findings.some(([s]) => /CRITICAL|HIGH/.test(s)) ? 'FAIL' : 'PASS'
  const check = (label, text, count, pattern, decisions) => {
    writeFileSync(join(dir, 'DECISIONS.md'), decisions ?? '# Decisions\n\nnone\n')
    writeFileSync(join(dir, 'REPORT.md'), text)
    const { problems } = checkReport(dir, { rules })
    assert.equal(problems.length, count, `${label}: ${problems.join('; ')}`)
    if (pattern) assert.ok(problems.some((p) => pattern.test(p)), `${label}: ${problems}`)
  }
  check('correct report', report(sha, verdict, roster, findings), 0)
  check('dropped finding', report(sha, verdict, roster, findings.slice(1)), 2, /not in FINDINGS/)
  return check
}

// The skill's own pin script is the only pin. Its roster must be the one the report check's
// rules give.
const pinWith = (ws, label) => {
  const pinned = run(ws, join(ws, '.github/skills/multi-agent-review/pin.mjs'), [])
  assert.equal(pinned.status, 0, `${label}: pin.mjs\n${pinned.stdout}${pinned.stderr}`)
  const ci = readFileSync(join(ws, 'review/ci-results.txt'), 'utf8')
    .match(/exit (\d+)\n# Tests run: (\d+), Passed: (\d+)/)
  return { ...readPin(join(ws, 'review')), ci: { status: Number(ci[1]), passed: Number(ci[3]) } }
}

const scenario = (ws, label, patch, { ticket, rules, routes, expect = {} }) => {
  git(ws, ['apply'], { input: readFileSync(join(root, 'facilitator/reference', patch), 'utf8') })
  git(ws, ['add', '-A'])
  git(ws, ['commit', '-q', '-m', label])
  const pinned = pinWith(ws, label)
  assert.equal(pinned.ci.status, 0, `${label}: CI fails`)
  const diff = readFileSync(join(ws, 'review/diff.patch'), 'utf8')
  assert.deepEqual(Object.keys(route(diff, rules)).sort(), routes, `${label}: routing`)
  assert.equal(readFileSync(join(ws, 'review/ROSTER'), 'utf8'),
    `${pinnedRoster(diff, rules).join('\n')}\n`, `${label}: pin.mjs ROSTER`)
  assert.match(readFileSync(join(ws, 'review/PIN'), 'utf8'),
    new RegExp(`^DIFF {6}base ${pinned.base} \u00b7 head ${pinned.head}$`, 'm'), 'PIN DIFF line')
  const routed = run(ws, join(ws, '.github/skills/multi-agent-review/pin.mjs'), ['--route'])
  assert.equal(routed.stdout.split('\n')[0], `Active rules: ${rules.join(', ')}`, routed.stdout)
  assert.deepEqual(routed.stdout.split('\n').filter((l) => / matches: /.test(l))
    .map((l) => l.split(' ')[0]), routes, `${label}: pin.mjs --route`)
  const all = route(diff, ['R1', 'R2', 'R3'])
  say(`${label}: CI ${pinned.ci.passed} passed, 0 failed; pin.mjs routing (${rules.join(', ')}) `
    + `gives ${routes.join(', ') || 'no optional role'}, ROSTER and --route agree with the `
    + `report check; with R3 active: ${Object.keys(all).sort().join(', ') || 'none'}`)
  const { rows, lines } = proofs(ws, ticket, label)
  for (const row of rows) {
    const want = expect[row.id] ?? row[label.endsWith('naive') ? 'onNaive' : 'onReference']
    assert.equal(row.outcome, want, `${label}: ${row.id}\n${lines.join('\n')}`)
  }
  say(`${label}: proofs ${rows.map((r) => `${r.id} ${r.outcome}`).join(', ')}`)
  return { pinned, all }
}

export const verify = (target) => {
  assert.ok(!existsSync(target), `${target} exists; verify needs a new directory`)
  assert.ok(!`${target}/`.startsWith(`${repo}/`), 'verify needs a directory outside this lab')
  staticChecks()

  // A clone of this lab: the participant's files and facilitator/, one commit on main.
  const ws = target
  cpSync(repo, ws, { recursive: true, filter: (src) => !['.git', '.lab', 'review', 'target',
    '.idea', 'node_modules'].includes(src.split('/').pop()) })
  git(ws, ['init', '-q', '-b', 'main'])
  git(ws, ['add', '-A'])
  git(ws, ['commit', '-q', '-m', 'Gift card service 1.4.0'])
  assert.equal(git(ws, ['status', '--porcelain']), '')
  const ci = maven(ws)
  assert.equal(ci.status, 0, ci.output)
  const production = walk(join(ws, 'src/main/java')).filter((f) => f.endsWith('.java')).length
  say(`Base: mvn -o -q test exit 0, ${ci.passed} passed, ${ci.failed} failed; ${production} `
    + `production classes; ${new Set(ci.cases.map((c) => c.className)).size} test classes`)
  assert.ok(ci.failed === 0 && ci.passed >= 35 && ci.passed <= 45, 'base test count')
  git(ws, ['clean', '-q', '-fdX'])
  const rules = activeRules(ws)
  assert.deepEqual(rules, ['R1', 'R2'], 'base skill activates R1 and R2 only')

  git(ws, ['switch', '-q', '-c', 'ticket-1', 'main'])
  const t1 = scenario(ws, 'ticket-1-naive', 'ticket-1-naive.patch',
    { ticket: 1, rules, routes: [] })
  assert.deepEqual(Object.keys(t1.all), [], 'ticket 1 must not match R3 either')
  git(ws, ['switch', '-q', '-C', 'ticket-1', 'main'])
  const t1ref = scenario(ws, 'ticket-1-reference', 'ticket-1-reference.patch',
    { ticket: 1, rules, routes: [] })
  const required = ['Architect    required', 'Tester    required', 'Security Auditor    required']
  const t1line = readFileSync(join(ws, 'review/diff.patch'), 'utf8').split('\n')
    .find((l) => l.startsWith('+') && !l.startsWith('+++'))
  const check1 = reportCheckSelfTest(target, 't1', rules, t1ref.pinned, required,
    { 'architect': [], 'tester': [['HIGH', REFUND]], 'security-auditor': [] },
    [['HIGH', REFUND, 'Tester']])
  check1('optional role with no matching rule', report(t1ref.pinned, 'FAIL',
    [...required, `API compatibility    added by R1: ${t1line}`],
    [['HIGH', REFUND, 'Tester']]), 2, /API compatibility added, but rule R1 does not/)
  check1('verdict PASS with a HIGH', report(t1ref.pinned, 'PASS', required,
    [['HIGH', REFUND, 'Tester']]), 1, /VERDICT/)
  check1('WHERE outside the diff', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester'], ['MEDIUM', 'tickets/TICKET-1-partial-refund.md:27', 'Tester']]),
  1, /WHERE tickets\/TICKET-1-partial-refund.md:27 is not a file in the diff/)
  check1('human decides with no disagreement', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { next: 'a human decides: 14 or 30 days' }), 1,
  /a human decides" but DISAGREEMENTS is none/)
  check1('disagreement with no human decision', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { disagreements: 'BD-007: x or y' }), 1,
  /DISAGREEMENTS lists a dispute/)
  check1('CAUSES missing a blocker', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { causes: 'something else' }), 1, /CAUSES: open HIGH/)
  check1('blocker on a closed decision', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { observed: 'DISPUTED: BD-007 says x' }), 1,
  /still blocks on BD-007/, '# Decisions\n\nDECISION  BD-007\nDATE      2026-11-20\nTEXT      x\n')
  const good = report(t1ref.pinned, 'FAIL', required, [['HIGH', REFUND, 'Tester']])
  check1('em dash', good.replace(/^CAUSES {4}(.*)$/m, 'CAUSES    BD-007 \u2014 $1'), 1, /em dash/)
  check1('duplicated heading', good.replace('\nFINDINGS\n', '\nFINDINGS\n\nFINDINGS\n'), 3,
    /heading FINDINGS appears 2 times/)
  check1('non-canonical role name', good.replace('Security Auditor    required',
    'Security auditor    required'), 1, /ROSTER: non-canonical line "Security auditor/)
  check1('field padding', good.replace('IMPACT    x', 'IMPACT   x'), 1, /padded to column 10/)
  check1('severity above the rule\'s ceiling', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { observed: 'S-5: raw storeId in a log line',
      causes: `S-5: ${REFUND.split(':')[0]}`, next: `fix the code: S-5: ${REFUND.split(':')[0]}` }),
  1,
  /above the maximum of S-5, MEDIUM/)
  check1('blocker named by a test rule only', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { observed: 'BD-007 and T-3: x',
      causes: `T-3: ${REFUND.split(':')[0]}`, next: `fix the code: T-3: ${REFUND.split(':')[0]}` }),
  2, /not named by BD-007/)
  check1('a finding listed twice', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester'], ['HIGH', REFUND, 'Tester']]), 1, /listed twice/)
  check1('WHERE rewritten', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND.replace(/:\d+$/, ':31'), 'Tester']]), 1, /WHERE or rule differs/)
  const testerRecord = join(target, '.lab', 'report-check', 't1', 'runs', 'tester.md')
  const original = readFileSync(testerRecord, 'utf8')
  writeFileSync(testerRecord, original.replace('OBSERVED  x', 'OBSERVED  BD-007: x'))
  const where = REFUND.split(':')[0]
  check1('a finding merged under another rule', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { observed: 'T-3: x', causes: `T-3: ${where}`,
      next: `fix the code: T-3: ${where}` }), 1, /\(BD-007\) is changed in FINDINGS/)
  writeFileSync(testerRecord, original)
  check1('CAUSES continuation not indented', good.replace(/^(CAUSES {4}.*)$/m,
    '$1\nBD-007: src/x.java'), 1, /CAUSES line\(s\) not indented/)
  check1('dispute named by a test rule', report(t1ref.pinned, 'FAIL', required,
    [['HIGH', REFUND, 'Tester']], { observed: 'DISPUTED: BD-007 and T-3 say x',
      causes: `T-3: ${REFUND.split(':')[0]}`, disagreements: 'BD-007: x or y',
      next: 'a human decides: x or y' }), 2, /not named by BD-007/)
  say('Report check, format: catches an em dash, a duplicated heading, a non-canonical role, '
    + 'a field label off column 10, a dispute named by a test rule, not its BD- decision, a '
    + 'severity above its rule\'s ceiling, and an unindented CAUSES line')
  say('Report check, ticket 1: catches a dropped finding, a wrong verdict, an unrouted role, '
    + 'a WHERE outside the diff, NEXT and DISAGREEMENTS out of step, a blocker missing from '
    + 'CAUSES, and a blocker on a closed decision')
  git(ws, ['switch', '-q', 'main'])
  git(ws, ['merge', '-q', '--ff-only', 'ticket-1'])

  // Step 2 comes after ticket 1: the role joins, and R3 does not match ticket 1's pin.
  assert.deepEqual(addRole(ws), ['R1', 'R2', 'R3'])
  const onTicket1 = run(ws, join(ws, '.github/skills/multi-agent-review/pin.mjs'), ['--route'])
  assert.equal(onTicket1.stdout, 'Active rules: R1, R2, R3\nNo optional rule matches\n',
    'R3 must not match ticket 1')
  git(ws, ['add', '-A'])
  git(ws, ['commit', '-q', '-m', 'Add the primitive-obsession reviewer and rule R3'])
  say('Step 2: add-role activates R1, R2, R3; pin.mjs --route on ticket 1\'s pin: no optional '
    + 'rule matches; committed on main')
  const rules3 = activeRules(ws)
  const onMain = run(ws, join(ws, '.github/skills/multi-agent-review/pin.mjs'), [])
  assert.equal(onMain.status, 1)
  assert.match(onMain.stderr, /^On main: switch to the ticket branch/)
  say('pin.mjs on main: refused, one line on stderr')
  const domainOnly = ['diff --git a/src/main/java/com/example/giftcard/domain/CardService.java '
    + 'b/src/main/java/com/example/giftcard/domain/CardService.java',
  '--- a/src/main/java/com/example/giftcard/domain/CardService.java',
  '+++ b/src/main/java/com/example/giftcard/domain/CardService.java', '@@ -1 +1 @@',
  '+  public int daysUntilExpiry(CardNumber number) {', ''].join('\n')
  assert.deepEqual(route(domainOnly, rules3), {}, 'R3 must cover the api package only')
  say('R3 scope: a raw int in a domain signature does not match; only api/ does')

  // Ticket 2 on top of ticket 1's reference and the new role, both ways.
  git(ws, ['switch', '-q', '-c', 'ticket-2', 'main'])
  const t2 = scenario(ws, 'ticket-2-naive', 'ticket-2-naive.patch',
    { ticket: 'all', rules: rules3, routes: ['R1', 'R2', 'R3'],
      expect: { 'T1-A': 'PASS', 'T1-B': 'PASS', 'T1-C': 'PASS' } })
  assert.deepEqual(Object.keys(t2.all).sort(), ['R1', 'R2', 'R3'])
  // The decision as the review session records it, in the skill's format.
  const decisions = join(ws, 'review/DECISIONS.md')
  writeFileSync(decisions, readFileSync(decisions, 'utf8').replace(/\nnone\n$/, '\n')
    + '\nDECISION  BD-011\nDATE      2026-11-24\nTEXT      BD-011 holds: 14 days.\n')
  git(ws, ['switch', '-q', '-C', 'ticket-2', 'main'])
  const t2ref = scenario(ws, 'ticket-2-reference', 'ticket-2-reference.patch',
    { ticket: 'all', rules: rules3, routes: ['R1', 'R2'] })
  assert.match(readFileSync(join(ws, 'review/DECISIONS.md'), 'utf8'), /^DECISION\s+BD-011$/m,
    'the decision did not carry over to the re-pin')
  say('Decision: BD-011 in review/DECISIONS.md is kept across the re-pin')
  assert.ok(!readFileSync(join(ws, 'review/diff.patch'), 'utf8').includes('.github/'),
    'the role commit leaked into ticket 2\'s diff')

  const roster2 = readFileSync(join(ws, 'review/ROSTER'), 'utf8').split('\n').filter(Boolean)
  assert.deepEqual(roster2.map((l) => l.split(/\s{2,}/)[0]), ['Architect', 'Tester',
    'Security Auditor', 'API compatibility', 'Migrations'], 'ticket 2 fixed: review/ROSTER')
  const r1quote = roster2[3].split('added by R1: ')[1]
  const v1 = 'src/main/resources/db/migration/V4__add_expiry_to_cards.sql:1'
  const check2 = reportCheckSelfTest(target, 't2', rules3, t2ref.pinned, roster2,
    { 'architect': [], 'tester': [], 'security-auditor': [], 'api-compatibility': [],
      'migrations': [['CRITICAL', v1]] }, [['CRITICAL', v1, 'Migrations']])
  check2('Migrations missing while R2 matches', report(t2ref.pinned, 'FAIL', roster2.slice(0, 4),
    [['CRITICAL', v1, 'Migrations']]), 2, /rule R2 matches/)
  check2('Primitive obsession added on a diff R3 does not match', report(t2ref.pinned, 'FAIL',
    [...roster2, `Primitive obsession    added by R3: ${r1quote}`],
    [['CRITICAL', v1, 'Migrations']]), 2,
  /Primitive obsession added, but rule R3 does not match/)
  check2('roster quotes a diff header', report(t2ref.pinned, 'FAIL', [...roster2.slice(0, 4),
    'Migrations    added by R2: diff --git a/x.sql b/x.sql'], [['CRITICAL', v1, 'Migrations']]),
  1, /not an added or removed line/)
  const rosterFile = join(target, '.lab', 'report-check', 't2', 'ROSTER')
  writeFileSync(rosterFile, `${roster2.join('\n')}\n`)
  check2('report roster differs from review/ROSTER', report(t2ref.pinned, 'FAIL',
    roster2.slice(0, 4), [['CRITICAL', v1, 'Migrations']]), 3, /differs from review\/ROSTER/)
  rmSync(rosterFile)
  say('Report check, ticket 2: catches Migrations left off the roster when R2 matches, '
    + 'Primitive obsession kept on once its rule no longer matches, a roster that quotes a diff '
    + 'header, and a report roster that differs from review/ROSTER')

  assert.equal(git(ws, ['status', '--porcelain']), '')
  say(`Verify passed. Scratch: ${target}`)
}

cli(() => {
  const [target] = process.argv.slice(2)
  assert.ok(target, 'Usage: node facilitator/verify.mjs <new directory outside this repository>')
  verify(resolve(target))
})
