import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  git, knowledgeTouched, nextAttempt, runCopilot, tickets, toolCalls, workspaceOf,
} from './lib.mjs'

const usage = `Usage: node builder-cli.mjs <dir> <ticket <1|2> | fix | prompt <file>>
       [--decision <text>] [--model <id>] [--timeout <minutes>]

  ticket <n>   implement tickets/TICKET-<n>-*.md as the participant's builder session
  fix          paste the FINDINGS, DISAGREEMENTS and NEXT of review/REPORT.md and ask for fixes
  prompt <f>   send the text of <f> as the prompt
  --decision   with fix: a human decision on a disputed finding, pasted after the findings`

const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv.splice(index, 2)[1]
}
const model = option('--model')
const decision = option('--decision')
const timeout = Number(option('--timeout') ?? 15)
const [destination, verb, value] = argv
if (!destination || !['ticket', 'fix', 'prompt'].includes(verb)
  || (verb === 'ticket' && !tickets[value]) || (verb === 'prompt' && !value)) {
  console.error(usage)
  process.exit(2)
}

const dir = resolve(destination)
const workspace = workspaceOf(dir)
const current = git(workspace, ['rev-parse', '--abbrev-ref', 'HEAD'])
const ticket = Object.values(tickets).find((t) => t.branch === current)

// The builder reads AGENTS.md (loaded as custom instructions) and the ticket, nothing more.
// It is not shown the knowledge files, so it follows the ticket where the ticket is wrong.
const rules = [
  'Read AGENTS.md and the ticket. Do not open, search or list anything under docs/.',
  'Work only inside this repository. Run `mvn -o -q test` before you finish.',
  'Leave your changes uncommitted.',
].join('\n')

const section = (text, name, next) => (text.split(new RegExp(`^${name}\\s*$`, 'm'))[1] ?? '')
  .split(new RegExp(`^${next}\\s*$`, 'm'))[0].trim()

let prompt
if (verb === 'ticket') {
  assert.equal(current, tickets[value].branch,
    `Switch to ${tickets[value].branch} first: node fixture.mjs start <dir> ${value}`)
  prompt = `Implement the ticket in ${tickets[value].file}.\n${rules}`
} else if (verb === 'fix') {
  const report = readFileSync(join(workspace, 'review/REPORT.md'), 'utf8')
  prompt = [
    `The review of your change for ${ticket?.file ?? 'this branch'} returned `
      + `${report.match(/^VERDICT\s+(\S+)/m)?.[1] ?? 'no verdict'}.`,
    'Fix every CRITICAL and HIGH finding below whose NEXT line says to fix the code.',
    'Where a finding conflicts with the ticket, the finding wins: the ticket was wrong on that'
      + ' point. Change nothing the findings do not name.',
    rules,
    '',
    'FINDINGS', section(report, 'FINDINGS', 'DISAGREEMENTS'),
    '',
    'DISAGREEMENTS', section(report, 'DISAGREEMENTS', 'NEXT'),
    '',
    'NEXT', section(report, 'NEXT', '$^'),
    ...(decision ? ['', 'HUMAN DECISION ON THE DISPUTED FINDING', decision] : []),
  ].join('\n')
} else {
  assert.ok(existsSync(value), `No prompt file ${value}`)
  prompt = `${readFileSync(value, 'utf8').trim()}\n${rules}`
}

const label = verb === 'ticket' ? `build-ticket-${value}` : verb === 'fix' ? 'build-fix'
  : 'build-prompt'
const { number, attempt } = nextAttempt(dir, label)
const before = git(workspace, ['rev-parse', 'HEAD'])

// The builder may edit files and run Maven inside the workspace. The allow rules are not an
// allowlist: Copilot CLI runs commands it recognises as read-only (git show, cat, grep)
// without asking, so read-only shell use is measured after the run, not prevented. It cannot
// commit, push, fetch, reach a URL, store a memory, start a subagent or use a skill, and the
// knowledge files, the review setup and the tickets are closed to it.
const args = [
  '--no-auto-update', '--disable-builtin-mcps', '--disallow-temp-dir', '--sync-session=off',
  '--no-ask-user', '--trust-folder',
  '--excluded-tools=task,skill,web_fetch,semantic_code_search,session_store_sql,'
    + 'run_dynamic_workflow,dynamic_workflows_manage',
  '--allow-tool=write', '--allow-tool=shell(mvn:*)', '--allow-tool=shell(git status)',
  '--allow-tool=shell(git diff)', '--allow-tool=shell(ls)',
  '--deny-tool=shell(git commit)', '--deny-tool=shell(git push)',
  '--deny-tool=shell(git reset)', '--deny-tool=shell(git checkout)',
  '--deny-tool=shell(git stash)', '--deny-tool=url', '--deny-tool=memory',
  `--deny-tool=read(${workspace}/docs/**)`,
  `--deny-tool=write(${workspace}/docs/**)`, `--deny-tool=write(${workspace}/.github/**)`,
  `--deny-tool=write(${workspace}/tickets/**)`, `--deny-tool=write(${workspace}/review/**)`,
  `--deny-tool=write(${workspace}/scripts/**)`,
  `--deny-tool=write(${workspace}/REVIEW-CONTRACT.md)`,
  ...(model ? ['--model', model] : []),
]
const { result, events, sessionEvents, elapsed } = runCopilot({
  workspace, attempt, ceiling: dir, args, prompt, timeoutMinutes: timeout,
})
if (result.error) console.error(`Copilot CLI: ${result.error.code ?? result.error.message}`)

const calls = toolCalls(sessionEvents)
const knowledge = [...new Set(calls.flatMap(knowledgeTouched))]
const docs = calls.filter((call) => /docs\//.test(JSON.stringify(call.args ?? '')))
const mvn = calls.filter((call) => /\bmvn\b/.test(JSON.stringify(call.args ?? '')))
const denied = events.filter((e) => e.type === 'tool.execution_complete' && e.data?.success === false
  && /denied|not permitted|permission/i.test(JSON.stringify(e.data?.error ?? e.data?.result ?? '')))
const resolved = events.find((event) => event.type === 'session.auto_mode_resolved')
const models = new Set(events.flatMap((event) => event.data?.model ?? []))
const message = events.filter((e) => e.type === 'assistant.message').at(-1)?.data?.content ?? ''
const lines = [
  `Attempt ${number}: ${label} on ${current}`,
  `Exit ${result.status ?? result.signal}, ${elapsed.toFixed(1)} s wall clock`,
  `Session model: ${resolved ? `auto, resolved to ${resolved.data.chosenModel}`
    : [...models].join(', ')}`,
  `Tool calls: ${calls.length}, Maven runs: ${mvn.length}, denied: ${denied.length}`,
  `Knowledge files touched by the builder: ${knowledge.join(', ') || 'none'}`,
  `Calls naming docs/: ${docs.length}`,
  `HEAD unchanged: ${git(workspace, ['rev-parse', 'HEAD']) === before ? 'yes' : 'NO'}`,
  'Working tree:',
  ...git(workspace, ['status', '--porcelain']).split('\n').map((line) => `  ${line}`),
]
writeFileSync(join(attempt, 'final-message.md'), `${message}\n`)
writeFileSync(join(attempt, 'summary.txt'), `${lines.join('\n')}\n`)
console.log(lines.join('\n'))
console.log(`Attempt directory: ${attempt}`)
process.exitCode = result.status ?? 1
