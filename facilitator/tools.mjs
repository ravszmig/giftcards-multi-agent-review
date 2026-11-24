// The facilitator's tools, run from the repository root against this clone or any other:
//
//   node facilitator/check.mjs           the report check and the routing, for review/
//   node facilitator/proofs.mjs 1|2|all  the proof tests, on HEAD, in a throwaway worktree
//   node facilitator/audit.mjs           what each Copilot session read, wrote and ran
//   node facilitator/add-role.mjs        step 3 for a dry run: the role and rule R3, uncommitted
//   node facilitator/verify.mjs <dir>    every deterministic check of the lab, in a new <dir>
//
// None of them calls a model. They live in facilitator/, which no Copilot session may read.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { activeRules } from './report-check.mjs'

export const facilitator = dirname(fileURLToPath(import.meta.url))
export const repo = dirname(facilitator)

// A user's global Git config could sign or rewrite line endings, so none is read.
const gitEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Facilitator',
  GIT_AUTHOR_EMAIL: 'facilitator@example.invalid',
  GIT_COMMITTER_NAME: 'Facilitator',
  GIT_COMMITTER_EMAIL: 'facilitator@example.invalid',
}

export const run = (cwd, command, args, { input, env = process.env } = {}) => {
  const result = spawnSync(command, args, { cwd, input, env, encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  return result
}

export const git = (cwd, args, { input } = {}) => {
  const result = run(cwd, 'git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
    ...args], { input, env: gitEnv })
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stdout}${result.stderr}`)
  return result.stdout.trim()
}

// Offline, so a run never depends on the network. Counts come from the surefire XML, which
// Maven writes whether or not a test fails. A compile failure leaves no XML.
export const maven = (cwd, extra = []) => {
  const result = run(cwd, 'mvn', ['-o', '-B', '-q', ...extra, 'test'])
  const reports = join(cwd, 'target/surefire-reports')
  const cases = !existsSync(reports) ? [] : readdirSync(reports)
    .filter((file) => /^TEST-.*\.xml$/.test(file))
    .flatMap((file) => readFileSync(join(reports, file), 'utf8').split('<testcase').slice(1))
    .map((chunk) => {
      const body = chunk.split('</testcase>')[0]
      return {
        name: chunk.match(/\bname="([^"]*)"/)[1],
        className: chunk.match(/\bclassname="([^"]*)"/)[1],
        failed: /<failure|<error/.test(body),
        message: body.match(/<(?:failure|error)[^>]*message="([^"]*)"/)?.[1]
          ?.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
          .replace(/&amp;/g, '&'),
      }
    })
  const failed = cases.filter((testCase) => testCase.failed).length
  return { status: result.status, output: result.stdout + result.stderr, cases,
    passed: cases.length - failed, failed }
}

// The proof tests are facilitator material: they are copied into a throwaway worktree of
// HEAD, never into the participant's tree.
export const proofs = (ws, which, label = `ticket-${which}`) => {
  const manifest = JSON.parse(readFileSync(join(facilitator, 'proofs/manifest.json'), 'utf8'))
  const selected = manifest.filter((p) => which === 'all' || String(p.ticket) === String(which))
  const head = git(ws, ['rev-parse', 'HEAD'])
  const runs = join(ws, '.lab/proof-runs')
  mkdirSync(runs, { recursive: true })
  const name = `${String(readdirSync(runs).length + 1).padStart(2, '0')}-${label}-`
    + head.slice(0, 8)
  const tree = join(runs, name, 'tree')
  git(ws, ['worktree', 'add', '-q', '--detach', tree, head])
  try {
    const into = join(tree, 'src/test/java/com/example/giftcard/proof')
    mkdirSync(into, { recursive: true })
    for (const ticket of new Set(selected.map((p) => p.ticket))) {
      cpSync(join(facilitator, `proofs/ticket-${ticket}`), into, { recursive: true })
    }
    cpSync(join(facilitator, 'proofs/ProofSupport.java'), join(into, 'ProofSupport.java'))
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
    git(ws, ['worktree', 'remove', '--force', tree])
  }
}

// Step 3 without the hand edit: the template role into .github/agents, the R3 row under R2.
export const addRole = (ws) => {
  const agentFile = join(ws, '.github/agents/primitive-obsession.agent.md')
  assert.ok(!existsSync(agentFile), 'primitive-obsession is already active')
  cpSync(join(ws, 'review-templates/primitive-obsession.agent.md'), agentFile)
  const row = readFileSync(join(ws, 'review-templates/R3-routing-rule.md'), 'utf8')
    .match(/^\| R3 \|.*$/m)[0]
  const skillFile = join(ws, '.github/skills/multi-agent-review/SKILL.md')
  const skill = readFileSync(skillFile, 'utf8')
  const r2 = skill.match(/^\| R2 \|.*$/m)[0]
  writeFileSync(skillFile, skill.replace(r2, `${r2}\n${row}`))
  return activeRules(ws)
}

// Which agent made each tool call, from a session's event log: no agentId is the main agent.
export const toolCalls = (events) => {
  const names = new Map(events.filter((e) => e.type === 'subagent.started')
    .map((e) => [e.agentId, e.data.agentName]))
  const done = new Map(events.filter((e) => e.type === 'tool.execution_complete')
    .map((e) => [e.data.toolCallId, e.data]))
  return events.filter((e) => e.type === 'tool.execution_start').map((e) => ({
    agent: e.agentId ? names.get(e.agentId) ?? `unknown(${e.agentId})` : 'main',
    tool: e.data.toolName,
    args: e.data.arguments,
    result: done.get(e.data.toolCallId)?.result?.content ?? '',
    success: done.get(e.data.toolCallId)?.success === true,
  }))
}

// The knowledge files a call opened by path, or whose text a search returned. A `task` call
// is the main agent starting a subagent; its prompt naming a file is not a read.
export const knowledgeTouched = (call) => {
  if (call.tool === 'task') return []
  const text = `${JSON.stringify(call.args ?? '')}\n${String(call.result)}`
  return [...new Set([...text.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1]))]
}

// A call that names facilitator/ in its arguments, or a search that listed a file under it.
// The skill's own text and a reviewer's task prompt name the folder only to forbid it, and
// README.md names it in prose, so neither counts.
const facilitatorTouched = (call) => !['task', 'skill'].includes(call.tool)
  && (/facilitator/.test(JSON.stringify(call.args ?? ''))
    || (/grep|glob|search|bash|rg/.test(call.tool)
      && /(^|[\s"'/:])facilitator\/[\w.-]+\.(md|java|mjs|patch|json)/m.test(String(call.result))))

// For each session started with scripts/copilot-*: its event log is in its disposable
// profile under .lab/sessions.
export const audit = (ws) => {
  const sessions = join(ws, '.lab/sessions')
  assert.ok(existsSync(sessions), 'No .lab/sessions: no session was started with scripts/copilot-*')
  const allowedOf = (name) => {
    const file = join(ws, '.github/agents', `${name}.agent.md`)
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
      const touched = calls.filter(facilitatorTouched)
      const lines = [`== ${session}`,
        `Models: ${[...new Set(events.flatMap((e) => e.data?.model ?? []))].join(', ')}`,
        `Prompts: ${events.filter((e) => e.type === 'user.message').length}, `
          + `tool calls: ${calls.length}`,
        `Calls naming facilitator/: ${touched.length}${touched.length
          ? ` (${touched.map((c) => `${c.agent} ${c.tool}`).join('; ')})` : ''}`]
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
        const inReview = (path) => resolve(ws, String(path)).startsWith(`${join(ws, 'review')}/`)
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

// A refused command is a sentence for the facilitator, not a stack trace.
export const cli = (main) => {
  try {
    main()
  } catch (error) {
    if (error.code !== 'ERR_ASSERTION') throw error
    console.error(error.message.split('\n')[0])
    process.exit(1)
  }
}
