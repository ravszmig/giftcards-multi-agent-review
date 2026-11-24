import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('.', import.meta.url))

export const tickets = {
  1: { file: 'tickets/TICKET-1-partial-refund.md', branch: 'ticket-1' },
  2: { file: 'tickets/TICKET-2-card-expiry.md', branch: 'ticket-2' },
}

// Fixed identities keep a user's global Git config out: it could sign, rewrite line endings
// or pick another hash. The base commit also has a fixed date, so its SHA is the same on
// every machine.
const gitEnv = (date) => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'author@fixture.invalid',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'author@fixture.invalid',
  ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
})

export const run = (cwd, command, args, { input, env = process.env, timeout } = {}) => {
  const result = spawnSync(command, args, { cwd, input, env, encoding: 'utf8', timeout,
    maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  return result
}

export const git = (cwd, args, { input, date, allowFail = false } = {}) => {
  const result = run(cwd, 'git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
    ...args], { input, env: gitEnv(date) })
  if (!allowFail) assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stdout}${result.stderr}`)
  return allowFail ? result : result.stdout.trim()
}

// Offline, so a run never depends on the network. Counts come from the surefire XML, which
// Maven writes whether or not a test fails. A compile failure leaves no XML and a non-zero
// exit, which callers report as such.
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

export const workspaceOf = (dir) => join(dir, 'workspace')

// A disposable Copilot profile per attempt: no personal skills, agents, settings, history or
// saved approvals reach the run. It also means no saved login, so the token comes from the
// caller's COPILOT_GITHUB_TOKEN and is passed to the child only.
export const copilotEnv = (attempt, ceiling) => {
  const home = join(attempt, 'profile')
  mkdirSync(join(home, 'temp'), { recursive: true, mode: 0o700 })
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    TMPDIR: join(home, 'temp'),
    COPILOT_HOME: join(home, 'copilot'),
    COPILOT_CACHE_HOME: join(home, 'cache'),
    GIT_CEILING_DIRECTORIES: ceiling,
    // Maven looks for its repository under HOME; point it at the real one, offline.
    MAVEN_ARGS: `-o -Dmaven.repo.local=${join(homedir(), '.m2/repository')}`,
  }
  if (process.env.JAVA_HOME) env.JAVA_HOME = process.env.JAVA_HOME
  if (process.env.COPILOT_GITHUB_TOKEN) env.COPILOT_GITHUB_TOKEN = process.env.COPILOT_GITHUB_TOKEN
  return env
}

export const nextAttempt = (dir, label) => {
  const attempts = join(dir, 'attempts')
  mkdirSync(attempts, { recursive: true })
  const number = String(readdirSync(attempts).length + 1).padStart(2, '0')
  const attempt = join(attempts, `${number}-${label}`)
  mkdirSync(attempt, { recursive: true })
  return { number, attempt }
}

export const runCopilot = ({ workspace, attempt, ceiling, args, prompt, timeoutMinutes }) => {
  const env = copilotEnv(attempt, ceiling)
  const started = Date.now()
  const result = spawnSync('copilot', [...args, '--log-dir', join(attempt, 'logs'),
    '--usage-output-file', join(attempt, 'usage.json'),
    '--output-format', 'json', '-p', prompt], {
    cwd: workspace, env, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    timeout: timeoutMinutes * 60_000, killSignal: 'SIGKILL',
  })
  writeFileSync(join(attempt, 'prompt.txt'), `${prompt}\n`)
  writeFileSync(join(attempt, 'events.jsonl'), result.stdout ?? '')
  if (result.stderr) writeFileSync(join(attempt, 'stderr.txt'), result.stderr)
  const parse = (text) => text.split('\n').flatMap((line) => {
    try { return [JSON.parse(line)] } catch { return [] }
  })
  const events = parse(result.stdout ?? '')
  // The JSON stream on stdout does not say which agent made a tool call. The session's own
  // event log does: every subagent event carries an agentId, and subagent.started maps it to
  // the agent's name. It is copied next to events.jsonl as session-events.jsonl.
  const sessions = join(env.COPILOT_HOME, 'session-state')
  const sessionLog = existsSync(sessions) ? readdirSync(sessions)
    .map((id) => join(sessions, id, 'events.jsonl')).find((path) => existsSync(path)) : undefined
  const sessionText = sessionLog ? readFileSync(sessionLog, 'utf8') : ''
  writeFileSync(join(attempt, 'session-events.jsonl'), sessionText)
  // The package cache is a quarter of a gigabyte per attempt and is not evidence.
  rmSync(join(env.COPILOT_CACHE_HOME, 'pkg'), { recursive: true, force: true })
  rmSync(env.TMPDIR, { recursive: true, force: true })
  return { result, events, sessionEvents: parse(sessionText), started,
    elapsed: (Date.now() - started) / 1000 }
}

// Which agent made each tool call, from the session log: an event with no agentId is the
// main agent's.
export const toolCalls = (sessionEvents) => {
  const names = new Map(sessionEvents.filter((e) => e.type === 'subagent.started')
    .map((e) => [e.agentId, e.data.agentName]))
  const done = new Map(sessionEvents.filter((e) => e.type === 'tool.execution_complete')
    .map((e) => [e.data.toolCallId, e.data]))
  return sessionEvents.filter((e) => e.type === 'tool.execution_start').map((e) => ({
    agent: e.agentId ? names.get(e.agentId) ?? `unknown(${e.agentId})` : 'main',
    tool: e.data.toolName,
    args: e.data.arguments,
    result: done.get(e.data.toolCallId)?.result?.content ?? '',
    success: done.get(e.data.toolCallId)?.success === true,
    id: e.data.toolCallId,
  }))
}

// The knowledge files a call opened by path, or whose text a search returned. A `task` call
// is the main agent starting a subagent; its prompt naming a file is not a read.
export const knowledgeTouched = (call) => {
  if (call.tool === 'task') return []
  const text = `${JSON.stringify(call.args ?? '')}\n${String(call.result)}`
  return [...new Set([...text.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1]))]
}
