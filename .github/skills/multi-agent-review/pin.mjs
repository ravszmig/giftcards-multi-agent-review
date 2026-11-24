#!/usr/bin/env node
// Pins the change under review for the review session. Base is the merge-base of the ticket
// branch with main, head is HEAD. Writes review/PIN, review/diff.patch, review/ci-results.txt
// (mvn -o -q test on head) and review/ROSTER, and keeps review/DECISIONS.md across re-pins
// of the same branch.
//
// The roster comes from the routing rules in code, not from a model reading the diff: in
// rehearsal a model left Migrations off a roster that R2 matched. Each rule's test is the
// one the skill's table describes, and the one the facilitator's report check applies.
//
// --route prints what the rules switched on in SKILL.md give for the pinned diff, and
// changes nothing.
import { spawnSync } from 'node:child_process'
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'src/main/java/com/example/giftcard/api/'
const MIGRATIONS = 'src/main/resources/db/migration/'
const comment = /^\s*(\/\/|\*|\/\*)/
const meaning = '(amount|pence|money|balance|card|number|days|grace|expir)'
const primitive = new RegExp(`\\b(long|int|Long|Integer|String)\\s+\\w*${meaning}\\w*`, 'i')
const rawReturn = new RegExp('\\bpublic\\s+(static\\s+)?(final\\s+)?(long|int|Long|Integer|String)'
  + `\\s+\\w*${meaning}\\w*\\s*[(=;]`, 'i')
const required = ['Architect', 'Tester', 'Security Auditor']
const optional = { R1: 'API compatibility', R2: 'Migrations', R3: 'Primitive obsession' }

const files = (diff) => diff.split(/^(?=diff --git )/m)
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

// The first matching added or removed line per rule, as { rule: { path, line } }.
const route = (diff, active) => {
  const matches = {}
  for (const file of files(diff)) {
    const changed = [...file.added, ...file.removed]
    if (active.includes('R1') && !matches.R1 && file.path.startsWith(API)) {
      const line = changed.find((text) => /\bpublic\b/.test(text.slice(1))
        && !comment.test(text.slice(1)))
      if (line) matches.R1 = { path: file.path, line: line.trim() }
    }
    if (active.includes('R2') && !matches.R2 && file.path.startsWith(MIGRATIONS)) {
      matches.R2 = { path: file.path, line: (changed[0] ?? '(renamed or mode change)').trim() }
    }
    if (active.includes('R3') && !matches.R3 && file.path.startsWith(API)) {
      const line = file.added.find((text) => {
        const code = text.slice(1)
        if (comment.test(code) || !/\bpublic\b/.test(code)) return false
        const params = code.match(/\(([^)]*)\)/)?.[1] ?? ''
        return primitive.test(params) || rawReturn.test(code)
      })
      if (line) matches.R3 = { path: file.path, line: line.trim() }
    }
  }
  return matches
}

const run = (cmd, args) => spawnSync(cmd, args,
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
// The repository is the one this script lives in, wherever it is started from.
const ws = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const git = (...args) => {
  const r = run('git', ['-C', ws, ...args])
  if (r.status !== 0) {
    console.error(`git ${args.join(' ')} failed\n${r.stderr}`)
    process.exit(1)
  }
  return r.stdout.trim()
}
process.chdir(ws)
const review = join(ws, 'review')
const active = [...readFileSync(join(ws, '.github/skills/multi-agent-review/SKILL.md'), 'utf8')
  .matchAll(/^\|\s*(R\d+)\s*\|/gm)].map((m) => m[1])
const routing = (matches) => [`Active rules: ${active.join(', ')}`,
  ...Object.keys(matches).length
    ? Object.keys(matches).sort().map((r) => `${r} matches: ${matches[r].path}: ${matches[r].line}`)
    : ['No optional rule matches']]

if (process.argv.includes('--route')) {
  if (!existsSync(join(review, 'diff.patch'))) {
    console.error('Nothing pinned yet: no review/diff.patch.')
    process.exit(1)
  }
  console.log(routing(route(readFileSync(join(review, 'diff.patch'), 'utf8'), active))
    .join('\n'))
  process.exit(0)
}
const status = git('status', '--porcelain')
if (status) {
  console.error(`Uncommitted changes. Commit them before pinning:\n${status}`)
  process.exit(1)
}
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch === 'main') {
  console.error('On main: switch to the ticket branch to pin its change against main.')
  process.exit(1)
}
const base = git('rev-parse', git('merge-base', 'main', 'HEAD'))
const head = git('rev-parse', 'HEAD')
if (base === head) {
  console.error('Nothing to review: HEAD is the base.')
  process.exit(1)
}
const tickets = {
  'ticket-1': 'tickets/TICKET-1-partial-refund.md',
  'ticket-2': 'tickets/TICKET-2-card-expiry.md',
}
const ticket = tickets[branch]

const HEADER = '# Decisions\n\nHuman decisions on disputed findings for this change. Each '
  + 'closes the dispute on its rule ID.\n\nnone\n'
const oldPin = existsSync(join(review, 'PIN')) ? readFileSync(join(review, 'PIN'), 'utf8') : ''
const keep = oldPin.match(/^branch (\S+)/m)?.[1] === branch
  && existsSync(join(review, 'DECISIONS.md'))
  ? readFileSync(join(review, 'DECISIONS.md'), 'utf8') : undefined
rmSync(review, { recursive: true, force: true })
mkdirSync(join(review, 'runs'), { recursive: true })
// The DIFF line every record and the report quote, written once so nobody retypes a SHA.
writeFileSync(join(review, 'PIN'),
  `base ${base}\nhead ${head}\n${ticket ? `ticket ${ticket}\n` : ''}branch ${branch}\n`
  + `DIFF      base ${base} \u00b7 head ${head}\n`)
writeFileSync(join(review, 'DECISIONS.md'), keep ?? HEADER)
const diff = `${git('diff', base, head)}\n`
writeFileSync(join(review, 'diff.patch'), diff)
const matches = route(diff, active)
const roster = [...required.map((role) => `${role}    required`),
  ...Object.keys(matches).sort().map((r) => `${optional[r]}    added by ${r}: ${matches[r].line}`)]
writeFileSync(join(review, 'ROSTER'), `${roster.join('\n')}\n`)

const mvn = run('mvn', ['-o', '-B', '-q', 'test'])
const reports = join(ws, 'target/surefire-reports')
const cases = !existsSync(reports) ? [] : readdirSync(reports)
  .filter((f) => /^TEST-.*\.xml$/.test(f))
  .flatMap((f) => readFileSync(join(reports, f), 'utf8').split('<testcase').slice(1))
  .map((chunk) => ({
    name: chunk.match(/\bname="([^"]*)"/)[1],
    cls: chunk.match(/\bclassname="([^"]*)"/)[1],
    failed: /<failure|<error/.test(chunk.split('</testcase>')[0]),
  }))
const failed = cases.filter((c) => c.failed).length
const noReports = mvn.status !== 0 && cases.length === 0
  ? ['# No surefire reports: the build failed before tests ran. Last lines of output:',
    ...(mvn.stdout + mvn.stderr).trim().split('\n').slice(-15).map((l) => `# ${l}`)]
  : []
writeFileSync(join(review, 'ci-results.txt'), [
  `# CI run on head ${head}: mvn -o -q test, exit ${mvn.status}`,
  `# Tests run: ${cases.length}, Passed: ${cases.length - failed}, Failed: ${failed}`,
  ...noReports,
  ...cases.map((c) => `${c.failed ? 'FAIL' : 'PASS'} ${c.cls} ${c.name}`).sort(), '',
].join('\n'))
rmSync(join(ws, 'target'), { recursive: true, force: true })
console.log([`Pinned ${branch}`, `base ${base}`, `head ${head}`, `ticket ${ticket ?? 'none'}`,
  `CI: exit ${mvn.status}, ${cases.length - failed} passed, ${failed} failed`,
  `Decisions: ${keep ? 'kept from the previous pin of this branch' : 'none yet'}`,
  ...routing(matches), 'Roster (review/ROSTER):', ...roster.map((line) => `  ${line}`)].join('\n'))
