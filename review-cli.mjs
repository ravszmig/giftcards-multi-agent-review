import assert from 'node:assert/strict'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { activeRules, checkReport, readPin, roles } from './report-check.mjs'
import {
  git, knowledgeTouched, nextAttempt, runCopilot, toolCalls, workspaceOf,
} from './lib.mjs'

const usage = 'Usage: node review-cli.mjs <dir> [review | reconcile | rerun <agent> | check]'
  + ' [--model <id>] [--timeout <minutes>]'

// The only user input each run gets. No prompt carries a finding, a hint or a summary of
// the diff: the roster, the reviewer prompts and the reconciler prompt all come from the
// skill in the workspace.
const prompts = {
  review: 'Use the multi-agent-review skill to review the pinned diff in review/.\n'
    + 'Follow the skill exactly. Change no file outside review/.',
  reconcile: 'Use the multi-agent-review skill to reconcile only. Start no reviewer.\n'
    + 'Use the records in review/runs/ as they are. Change no file outside review/.',
  rerun: 'Use the multi-agent-review skill to rerun one reviewer: rerun <agent>.\n'
    + 'Keep every other record in review/runs/ as it is. Change no file outside review/.',
}

const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv.splice(index, 2)[1]
}
const model = option('--model')
const timeout = Number(option('--timeout') ?? 25)
const [destination, verb = 'review', agent] = argv
const known = ['review', 'reconcile', 'rerun', 'check'].includes(verb)
if (!destination || !known || (verb === 'rerun' && !roles[agent])
  || argv.length > (verb === 'rerun' ? 3 : 2)) {
  console.error(`${usage}\nAgents: ${Object.keys(roles).join(', ')}`)
  process.exit(2)
}

const dir = resolve(destination)
const workspace = workspaceOf(dir)
const review = join(workspace, 'review')
assert.ok(existsSync(join(review, 'PIN')), 'No review/PIN. Run node fixture.mjs pin <dir> first')
if (verb !== 'review') assert.ok(existsSync(join(review, 'REPORT.md')), 'No review/REPORT.md yet')

const check = () => {
  const { verdict, expected, problems } = checkReport(review, { rules: activeRules(workspace) })
  return [`Report check: verdict ${verdict}, contract rule gives ${expected}, `
    + `${problems.length} problem${problems.length === 1 ? '' : 's'}`,
  ...problems.map((problem) => `  ${problem}`)]
}
if (verb === 'check') {
  const lines = check()
  console.log(lines.join('\n'))
  process.exit(lines.length === 1 ? 0 : 1)
}

// The knowledge files each agent may read, from the `## Knowledge` list in its agent file.
const allowed = Object.fromEntries(readdirSync(join(workspace, '.github/agents'))
  .filter((name) => name.endsWith('.agent.md'))
  .map((name) => {
    const text = readFileSync(join(workspace, '.github/agents', name), 'utf8')
    const list = text.split(/^## Knowledge$/m)[1]?.split(/^## /m)[0] ?? ''
    return [name.replace('.agent.md', ''),
      [...list.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1])]
  }))

const label = verb === 'rerun' ? `rerun-${agent}` : verb
const { number, attempt } = nextAttempt(dir, label)
if (verb === 'review') {
  // A full review replaces every record. The previous ones are in the last attempt's copy.
  rmSync(join(review, 'runs'), { recursive: true, force: true })
  rmSync(join(review, 'REPORT.md'), { force: true })
}
const before = git(workspace, ['status', '--porcelain'])

// Three controls, none of them the prompt. --excluded-tools hides the shell and network
// tools from every agent in the session. The permission rules deny shell, URL and memory
// again, whatever a model's tools are called, and allow writes only under review/: -p cannot
// ask, so any other write is refused. The reviewers' own `tools: ["read", "search"]` keeps
// them read-only even inside review/; only the main agent writes the records and the report.
const args = [
  '--no-auto-update', '--no-custom-instructions', '--disable-builtin-mcps',
  '--disallow-temp-dir', '--sync-session=off', '--no-ask-user', '--trust-folder',
  '--excluded-tools=bash,read_bash,stop_bash,list_bash,web_fetch,'
    + 'semantic_code_search,session_store_sql,run_dynamic_workflow,dynamic_workflows_manage',
  '--deny-tool=shell', '--deny-tool=url', '--deny-tool=memory',
  '--allow-tool=write(review/**)',
  ...(model ? ['--model', model] : []),
]
const prompt = prompts[verb].replaceAll('<agent>', agent ?? '')
const { result, events, sessionEvents, started, elapsed } = runCopilot({
  workspace, attempt, ceiling: dir, args, prompt, timeoutMinutes: timeout,
})
if (result.error) console.error(`Copilot CLI: ${result.error.code ?? result.error.message}`)

const pin = readPin(review)
const lines = [`Attempt ${number}: ${label}`, `Pin: base ${pin.base} head ${pin.head}`
  + `${pin.ticket ? ` ticket ${pin.ticket}` : ''}`,
`Exit ${result.status ?? result.signal}, ${elapsed.toFixed(1)} s wall clock`]

const at = (event) => (Date.parse(event.timestamp) - started) / 1000
const resolved = events.find((event) => event.type === 'session.auto_mode_resolved')
const models = new Set(events.flatMap((event) => event.data?.model ?? []))
lines.push(`Session model: ${resolved ? `auto, resolved to ${resolved.data.chosenModel}`
  : [...models].join(', ')}`)
const toolsOf = new Map(events.filter((event) => event.type === 'subagent.selected')
  .map((event) => [event.data.agentName, event.data.tools]))
const spans = events.filter((event) => event.type === 'subagent.started').map((start) => {
  const end = events.find((event) => /^subagent\.(completed|failed)$/.test(event.type)
    && event.data.toolCallId === start.data.toolCallId)
  return { name: start.data.agentName, model: start.data.model, from: at(start),
    to: end ? at(end) : undefined, outcome: end?.type.split('.')[1] ?? 'no end event',
    calls: end?.data.totalToolCalls }
})
lines.push('Subagents (seconds from launch):')
for (const span of spans) {
  lines.push(`  ${span.name.padEnd(20)} ${span.from.toFixed(1).padStart(6)} to `
    + `${span.to?.toFixed(1).padStart(6) ?? '     ?'}  ${span.outcome}, ${span.model}, `
    + `tools ${JSON.stringify(toolsOf.get(span.name))}, ${span.calls ?? '?'} tool calls`)
}
const reviewers = spans.filter((span) => span.name !== 'reconciler')
const overlap = reviewers.some((a, i) => reviewers.slice(i + 1)
  .some((b) => a.to !== undefined && b.to !== undefined && a.from < b.to && b.from < a.to))
lines.push(`Reviewers overlapped in time: ${overlap ? 'yes' : 'no'}`)

// Persona scoping is checked against what each agent read, not taken from its instructions.
const calls = toolCalls(sessionEvents)
const reads = new Map()
for (const call of calls) {
  for (const file of knowledgeTouched(call)) {
    reads.set(call.agent, new Set([...(reads.get(call.agent) ?? []), file]))
  }
}
const violations = []
lines.push('Knowledge files read, by agent (from tool calls in events.jsonl):')
for (const name of [...new Set(['main', ...spans.map((s) => s.name), ...reads.keys()])]) {
  const read = [...(reads.get(name) ?? [])].sort()
  const may = name === 'main' ? [] : allowed[name] ?? []
  const extra = read.filter((file) => !may.includes(file))
  const missing = may.filter((file) => !read.includes(file))
  if (extra.length) violations.push(`${name} read ${extra.join(', ')}`)
  lines.push(`  ${name.padEnd(20)} ${read.join(', ') || 'none'}`
    + `${extra.length ? `  OUTSIDE ITS LIST: ${extra.join(', ')}` : ''}`
    + `${missing.length ? `  (did not read: ${missing.join(', ')})` : ''}`)
}
lines.push(`Persona scoping: ${violations.length ? `VIOLATED (${violations.join('; ')})` : 'held'}`)

const landed = []
const refused = []
const writes = calls.filter((call) => /^(create|edit|apply_patch|write)/.test(call.tool))
lines.push(`Write tool calls: ${writes.length}`)
for (const write of writes) {
  const input = write.args
  const text = String(typeof input === 'string' ? input : input?.input ?? '')
  const targets = input?.path ? [input.path]
    : [...text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.*)$/gm)].map((m) => m[1])
  lines.push(`  ${write.agent}: ${write.tool} ${targets.join(', ') || '?'}`)
  for (const target of targets) {
    const absolute = resolve(workspace, target)
    if (!absolute.startsWith(`${review}/`)) {
      (write.success ? landed : refused).push(`${write.agent} ${write.tool} ${target}`)
    }
  }
}
// A write that landed outside review/ fails the run. A refused one is a warning: the model
// mangled a long path in a multi-file patch, the patch failed, and it retried.
lines.push(`Writes landed outside review/: ${landed.length ? landed.join('; ') : 'none'}`)
if (refused.length) lines.push(`WARNING refused write attempts outside review/: ${refused.join('; ')}`)

// The read-only claim is checked against the result, not taken from the prompt. The status
// is compared with the one before the run, so an uncommitted role being added (step 3 of
// the rehearsal) does not count as a change the review made.
const after = git(workspace, ['status', '--porcelain'])
lines.push(`Files changed outside review/: ${after === before ? 'none' : after}`)
const report = join(review, 'REPORT.md')
let reportProblems = 1
if (existsSync(report)) {
  const verdict = readFileSync(report, 'utf8').match(/^VERDICT\s+(\S+)/m)?.[1] ?? 'not found'
  const checked = check()
  reportProblems = checked.length - 1
  lines.push(`Report: review/REPORT.md, verdict ${verdict}`, ...checked)
} else {
  lines.push('Report: none written')
}
// The last line, so nobody reads a verdict without it. A report that fails the check is not
// trusted: rerun `reconcile` only; the reviewer records stand.
lines.push('', `REPORT CHECK: ${existsSync(report) ? `${reportProblems} problem`
  + `${reportProblems === 1 ? '' : 's'}` : 'no report'}${reportProblems
  ? '. Do not use this verdict. Run: node review-cli.mjs <dir> reconcile' : ''}`)
cpSync(review, join(attempt, 'review'), { recursive: true })
writeFileSync(join(attempt, 'summary.txt'), `${lines.join('\n')}\n`)
const last = lines.pop()
console.log([...lines, `Attempt directory: ${attempt}`, last].join('\n'))
assert.equal(after, before, 'Unexpected change outside review/')
process.exitCode = landed.length ? 3 : reportProblems ? 4 : result.status ?? 1
