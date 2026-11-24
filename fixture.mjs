import assert from 'node:assert/strict'
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { activeRules, pinnedRoster, route } from './report-check.mjs'
import {
  git, knowledgeTouched, maven, root, tickets, toolCalls, workspaceOf,
} from './lib.mjs'
import { verify } from './verify.mjs'

const usage = `Usage: node fixture.mjs <command> <dir> [args]

  setup  <dir>              new repo at <dir>/workspace: base commit on main, tag base
  start  <dir> <1|2>        branch ticket-<n> from main
  commit <dir> <message>    commit every change outside review/
  pin    <dir> [--base <ref>]
                            pin HEAD against the commit the feature started from:
                            merge-base with main, or tag base when on main.
                            Writes review/PIN, review/diff.patch, review/ci-results.txt,
                            review/ROSTER
  decide <dir> <ID> "<text>"
                            record a human decision on a disputed rule in review/DECISIONS.md;
                            kept across re-pins of the same branch
  route  <dir>              the roster the routing rules give for the pinned diff
  proofs <dir> <1|2|all>    facilitator proof tests against HEAD, in a throwaway worktree
  finish <dir>              fast-forward main to the ticket branch and switch to main
  add-role <dir>            step 3: copy the primitive-obsession template into .github/agents
                            and add rule R3 to the skill, uncommitted
  audit  <dir>              from each scripts/copilot-* session's event log: what the builder
                            read, what each reviewer read, writes outside review/, shell use
  verify <dir>              every deterministic check of the fixture itself, in a new <dir>`

const [command, destination, ...rest] = process.argv.slice(2)
if (!command || !destination) {
  console.error(usage)
  process.exit(2)
}
const dir = resolve(destination)
const ws = workspaceOf(dir)
const review = join(ws, 'review')

const clean = () => {
  const status = git(ws, ['status', '--porcelain'])
  assert.equal(status, '', `Uncommitted changes. Commit them first:\n${status}`)
}
const branch = () => git(ws, ['rev-parse', '--abbrev-ref', 'HEAD'])

export const DECISIONS_HEADER = '# Decisions\n\nHuman decisions on disputed findings for '
  + 'this change. Each closes the dispute on its rule ID.\n\nnone\n'

export const decide = (target, id, text) => {
  const file = join(workspaceOf(target), 'review/DECISIONS.md')
  assert.ok(existsSync(file), 'No review/DECISIONS.md. Pin first.')
  assert.ok(/^[A-Z]+(-[A-Z]+)*-\d+$/.test(id), `Not a rule ID: ${id}`)
  assert.ok(text && text.trim(), 'decide needs the decision text')
  const date = new Date().toISOString().slice(0, 10)
  const body = readFileSync(file, 'utf8').replace(/\nnone\n$/, '\n')
  writeFileSync(file, `${body}\nDECISION  ${id}\nDATE      ${date}\nTEXT      ${text.trim()}\n`)
  return readFileSync(file, 'utf8')
}

export const setup = (target) => {
  const workspace = workspaceOf(target)
  mkdirSync(target, { recursive: true, mode: 0o700 })
  assert.ok(!existsSync(workspace), `${workspace} already exists`)
  cpSync(join(root, 'base'), workspace, { recursive: true })
  rmSync(join(workspace, 'target'), { recursive: true, force: true })
  git(workspace, ['-c', 'init.defaultBranch=main', 'init', '-q', '--object-format=sha1'])
  // IntelliJ's project files stay out of every commit and every review diff.
  writeFileSync(join(workspace, '.git/info/exclude'), 'review/\n.idea/\n*.iml\n')
  git(workspace, ['add', '-A'])
  git(workspace, ['commit', '-q', '-m', 'Gift card service 1.4.0'],
    { date: '2026-11-02T09:00:00Z' })
  git(workspace, ['tag', 'base'])
  // The participant commits from the IDE. A local identity keeps a personal one off the screen.
  git(workspace, ['config', 'user.name', 'Participant'])
  git(workspace, ['config', 'user.email', 'participant@example.invalid'])
  return git(workspace, ['rev-parse', 'HEAD'])
}

export const pin = (target, baseRef) => {
  const workspace = workspaceOf(target)
  const reviewDir = join(workspace, 'review')
  const status = git(workspace, ['status', '--porcelain'])
  assert.equal(status, '', `Uncommitted changes. Commit them before pinning:\n${status}`)
  const current = git(workspace, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const base = git(workspace, ['rev-parse', baseRef
    ?? (current === 'main' ? 'base' : git(workspace, ['merge-base', 'main', 'HEAD']))])
  const head = git(workspace, ['rev-parse', 'HEAD'])
  assert.notEqual(base, head, 'Nothing to review: HEAD is the base. Commit the change first.')

  // A new pin makes the old records stale. They are kept, not overwritten. Decisions are
  // about the change, not the head, so they carry over while the branch stays the same.
  const oldPin = existsSync(join(reviewDir, 'PIN')) ? readFileSync(join(reviewDir, 'PIN'), 'utf8') : ''
  const keep = oldPin.match(/^branch (\S+)/m)?.[1] === current
    && existsSync(join(reviewDir, 'DECISIONS.md'))
    ? readFileSync(join(reviewDir, 'DECISIONS.md'), 'utf8') : undefined
  if (existsSync(join(reviewDir, 'PIN'))) {
    const pins = join(target, 'pins')
    mkdirSync(pins, { recursive: true })
    const old = readFileSync(join(reviewDir, 'PIN'), 'utf8').match(/^head (\S{8})/m)?.[1]
    cpSync(reviewDir, join(pins, `${String(readdirSync(pins).length + 1).padStart(2, '0')}-${old}`),
      { recursive: true })
  }
  rmSync(reviewDir, { recursive: true, force: true })
  mkdirSync(join(reviewDir, 'runs'), { recursive: true })

  const ticket = Object.values(tickets).find((t) => t.branch === current)
  // The DIFF line every record and the report quote, written once so nobody retypes a SHA.
  writeFileSync(join(reviewDir, 'PIN'),
    `base ${base}\nhead ${head}\n${ticket ? `ticket ${ticket.file}\n` : ''}branch ${current}\n`
    + `DIFF      base ${base} \u00b7 head ${head}\n`)
  writeFileSync(join(reviewDir, 'DECISIONS.md'), keep ?? DECISIONS_HEADER)
  const diff = `${git(workspace, ['diff', base, head])}\n`
  writeFileSync(join(reviewDir, 'diff.patch'), diff)
  // The roster comes from the rules in code; the skill copies it and never routes itself.
  const roster = pinnedRoster(diff, activeRules(workspace))
  writeFileSync(join(reviewDir, 'ROSTER'), `${roster.join('\n')}\n`)
  const ci = maven(workspace)
  writeFileSync(join(reviewDir, 'ci-results.txt'), [
    `# CI run on head ${head}: mvn -o -q test, exit ${ci.status}`,
    `# Tests run: ${ci.cases.length}, Passed: ${ci.passed}, Failed: ${ci.failed}`,
    ...(ci.status !== 0 && ci.cases.length === 0
      ? ['# No surefire reports: the build failed before tests ran. Last lines of output:',
        ...ci.output.trim().split('\n').slice(-15).map((line) => `# ${line}`)]
      : []),
    ...ci.cases.map((c) => `${c.failed ? 'FAIL' : 'PASS'} ${c.className} ${c.name}`).sort(),
    '',
  ].join('\n'))
  // Reviewers read the tree at head; build output is not part of the diff.
  rmSync(join(workspace, 'target'), { recursive: true, force: true })
  return { base, head, ticket: ticket?.file, ci }
}

export const expectedRoster = (workspace) => {
  const diff = readFileSync(join(workspace, 'review/diff.patch'), 'utf8')
  const rules = activeRules(workspace)
  return { rules, matches: route(diff, rules) }
}

export const proofs = (target, which, label = 'proofs') => {
  const workspace = workspaceOf(target)
  const manifest = JSON.parse(readFileSync(join(root, 'facilitator/proofs/manifest.json'), 'utf8'))
  const selected = manifest.filter((p) => which === 'all' || String(p.ticket) === String(which))
  const head = git(workspace, ['rev-parse', 'HEAD'])
  const runs = join(target, 'proof-runs')
  mkdirSync(runs, { recursive: true })
  const name = `${String(readdirSync(runs).length + 1).padStart(2, '0')}-${label}-${head.slice(0, 8)}`
  const tree = join(runs, name, 'tree')
  git(workspace, ['worktree', 'add', '-q', '--detach', tree, head])
  try {
    const into = join(tree, 'src/test/java/com/example/giftcard/proof')
    mkdirSync(into, { recursive: true })
    for (const ticket of new Set(selected.map((p) => p.ticket))) {
      cpSync(join(root, `facilitator/proofs/ticket-${ticket}`), into, { recursive: true })
    }
    cpSync(join(root, 'facilitator/proofs/ProofSupport.java'), join(into, 'ProofSupport.java'))
    const result = maven(tree, ['-Dtest=*ProofTest', '-Dsurefire.failIfNoSpecifiedTests=false'])
    const rows = selected.map((p) => {
      const found = result.cases.find((c) => c.className.endsWith(`.${p.proof}`))
      const outcome = !found ? 'NOT RUN' : found.failed ? 'FAIL' : 'PASS'
      return { ...p, outcome, message: found?.message }
    })
    const lines = [`Proofs at ${head} (${which}): mvn exit ${result.status}`,
      ...(result.cases.length === 0 ? ['  No proof ran. Build output:',
        ...result.output.trim().split('\n').slice(-20).map((l) => `    ${l}`)] : []),
      ...rows.map((r) => `  ${r.id.padEnd(5)} ${r.outcome.padEnd(7)} ${r.proof}  `
        + `[${r.reviewer}, ${r.rule}]${r.outcome === 'FAIL' && r.message
          ? `\n          ${r.message.split('\n')[0].slice(0, 200)}` : ''}`)]
    writeFileSync(join(runs, name, 'result.txt'), `${lines.join('\n')}\n`)
    return { rows, lines, head }
  } finally {
    git(workspace, ['worktree', 'remove', '--force', tree])
  }
}

// The launchers' after-run checks, for interactive sessions started with scripts/copilot-*:
// each keeps its event log in its disposable profile under <dir>/sessions.
export const audit = (target) => {
  const workspace = workspaceOf(target)
  const sessions = join(target, 'sessions')
  assert.ok(existsSync(sessions), `No ${sessions}: no session was started with scripts/copilot-*`)
  const allowedOf = (name) => {
    const file = join(workspace, '.github/agents', `${name}.agent.md`)
    if (!existsSync(file)) return []
    const list = readFileSync(file, 'utf8').split(/^## Knowledge$/m)[1]?.split(/^## /m)[0] ?? ''
    return [...list.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1])
  }
  const shell = (calls) => calls.filter((c) => c.tool === 'bash')
    .map((c) => String(c.args?.command ?? '').slice(0, 90)).join(' | ') || 'none'
  const out = []
  for (const session of readdirSync(sessions).sort()) {
    const state = join(sessions, session, 'profile/copilot/session-state')
    if (!existsSync(state)) continue
    for (const id of readdirSync(state)) {
      const log = join(state, id, 'events.jsonl')
      if (!existsSync(log)) continue
      const events = readFileSync(log, 'utf8').split('\n').flatMap((line) => {
        try { return [JSON.parse(line)] } catch { return [] }
      })
      const calls = toolCalls(events)
      const lines = [`== ${session}`,
        `Models: ${[...new Set(events.flatMap((e) => e.data?.model ?? []))].join(', ')}`,
        `Prompts: ${events.filter((e) => e.type === 'user.message').length}, `
          + `tool calls: ${calls.length}`]
      if (session.endsWith('builder')) {
        lines.push(`Knowledge files touched by the builder: `
          + `${[...new Set(calls.flatMap(knowledgeTouched))].join(', ') || 'none'}`,
        `Calls naming docs/: ${calls.filter((c) => /docs\//.test(JSON.stringify(c.args ?? '')))
          .length}`)
      } else {
        for (const start of events.filter((e) => e.type === 'subagent.started')) {
          const end = events.find((e) => /^subagent\.(completed|failed)$/.test(e.type)
            && e.data.toolCallId === start.data.toolCallId)
          lines.push(`  ${start.data.agentName.padEnd(20)} ${start.timestamp} to `
            + `${end?.timestamp ?? '?'} ${end?.type.split('.')[1] ?? 'no end event'}`)
        }
        const reads = new Map()
        for (const call of calls) {
          for (const file of knowledgeTouched(call)) {
            reads.set(call.agent, new Set([...(reads.get(call.agent) ?? []), file]))
          }
        }
        const violations = []
        for (const [agent, files] of reads) {
          const may = agent === 'main' ? [] : allowedOf(agent)
          const extra = [...files].filter((f) => !may.includes(f))
          if (extra.length) violations.push(`${agent} read ${extra.join(', ')}`)
        }
        const writes = calls.filter((c) => /^(create|edit|apply_patch|write)/.test(c.tool))
        const inReview = (path) => resolve(workspace, String(path))
          .startsWith(`${join(workspace, 'review')}/`)
        const outside = writes.filter((c) => c.success && c.args?.path && !inReview(c.args.path))
          .map((c) => `${c.agent} ${c.args.path}`)
        lines.push(`Persona scoping: ${violations.length
          ? `VIOLATED (${violations.join('; ')})` : 'held'}`,
        `Writes landed outside review/: ${outside.join('; ') || 'none'}`)
      }
      lines.push(`Shell commands: ${shell(calls)}`)
      out.push(lines.join('\n'))
    }
  }
  return out.join('\n\n')
}

const main = () => {
  switch (command) {
    case 'setup': {
      const sha = setup(dir)
      console.log(`Workspace: ${ws}\nbase ${sha} (tag base, branch main)`)
      break
    }
    case 'start': {
      const ticket = tickets[rest[0]]
      assert.ok(ticket, 'start takes 1 or 2')
      clean()
      git(ws, ['switch', '-q', '-c', ticket.branch, 'main'])
      console.log(`On ${ticket.branch} from main ${git(ws, ['rev-parse', 'main'])}\n`
        + `Ticket: ${ticket.file}`)
      break
    }
    case 'commit': {
      assert.ok(rest[0], 'commit takes a message')
      git(ws, ['add', '-A'])
      const staged = git(ws, ['diff', '--cached', '--stat'])
      assert.ok(staged, 'Nothing to commit: no change outside review/.')
      git(ws, ['commit', '-q', '-m', rest.join(' ')])
      console.log(`${branch()} ${git(ws, ['rev-parse', 'HEAD'])}\n${staged}`)
      break
    }
    case 'pin': {
      const at = rest.indexOf('--base')
      const { base, head, ticket, ci } = pin(dir, at === -1 ? undefined : rest[at + 1])
      const { rules, matches } = expectedRoster(ws)
      console.log([`base ${base}`, `head ${head}`, `ticket ${ticket ?? 'none'}`,
        `CI: exit ${ci.status}, ${ci.passed} passed, ${ci.failed} failed`,
        `Routing (${rules.join(', ')}): ${Object.keys(matches).join(', ') || 'no optional role'}`,
        ...Object.entries(matches).map(([rule, line]) => `  ${rule} ${line}`)].join('\n'))
      break
    }
    case 'decide': {
      assert.ok(rest[0] && rest[1], 'decide takes <ID> "<decision text>"')
      console.log(decide(dir, rest[0], rest.slice(1).join(' ')))
      break
    }
    case 'route': {
      const { rules, matches } = expectedRoster(ws)
      console.log(`Active rules: ${rules.join(', ')}`)
      console.log(Object.keys(matches).length ? Object.entries(matches)
        .map(([rule, line]) => `${rule} matches: ${line}`).join('\n') : 'No optional rule matches')
      break
    }
    case 'proofs': {
      assert.ok(['1', '2', 'all'].includes(rest[0]), 'proofs takes 1, 2 or all')
      console.log(proofs(dir, rest[0], `ticket-${rest[0]}`).lines.join('\n'))
      break
    }
    case 'finish': {
      clean()
      const current = branch()
      assert.ok(/^ticket-\d$/.test(current), `Not on a ticket branch: ${current}`)
      git(ws, ['switch', '-q', 'main'])
      git(ws, ['merge', '-q', '--ff-only', current])
      console.log(`main at ${git(ws, ['rev-parse', 'HEAD'])} (${current} merged)`)
      break
    }
    case 'add-role': {
      const agentFile = join(ws, '.github/agents/primitive-obsession.agent.md')
      assert.ok(!existsSync(agentFile), 'primitive-obsession is already active')
      cpSync(join(ws, 'review-templates/primitive-obsession.agent.md'), agentFile)
      const row = readFileSync(join(ws, 'review-templates/R3-routing-rule.md'), 'utf8')
        .match(/^\| R3 \|.*$/m)[0]
      const skillFile = join(ws, '.github/skills/multi-agent-review/SKILL.md')
      const skill = readFileSync(skillFile, 'utf8')
      const r2 = skill.match(/^\| R2 \|.*$/m)[0]
      writeFileSync(skillFile, skill.replace(r2, `${r2}\n${row}`))
      console.log(`Added ${agentFile.slice(ws.length + 1)} and rule R3. Active rules: `
        + `${activeRules(ws).join(', ')}\n${git(ws, ['status', '--porcelain'])}\n`
        + 'Commit it on main before starting the next ticket: fixture.mjs commit <dir> "<message>"')
      break
    }
    case 'audit':
      console.log(audit(dir))
      break
    case 'verify':
      verify(dir)
      break
    default:
      console.error(usage)
      process.exit(2)
  }
}

// A refused command is a sentence for the participant, not a stack trace.
if (process.argv[1] && resolve(process.argv[1]) === resolve(root, 'fixture.mjs')) {
  try {
    main()
  } catch (error) {
    if (error.code !== 'ERR_ASSERTION') throw error
    console.error(error.message.split('\n')[0])
    process.exit(1)
  }
}
