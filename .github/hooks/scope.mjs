// preToolUse: keeps each agent to the files it may read.
//
// - Nobody reads facilitator/.
// - The main agent, which is the builder in a build session, reads nothing under docs/.
// - A reviewer subagent reads only the docs/knowledge files its own agent file lists, and
//   runs no shell command but `git status` and `git diff`.
//
// A tool call from a subagent carries agentId and agentType; one from the main agent carries
// neither. Tool arguments are checked as text, so a shell command that names a path is caught
// the same way as a file read. A search with no path is not inspected.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BUILT_IN = ['general-purpose', 'explore', 'task', 'code-review', 'rubber-duck', 'research',
  'security-review']
// Tools that read or run nothing themselves. A task prompt names files only to instruct.
const SKIP = ['task', 'skill', 'report_intent', 'update_todo', 'ask_user', 'read_agent',
  'list_agents', 'write_agent']

const WRITE = ['create', 'edit', 'write', 'str_replace', 'apply_patch']

const strings = (value) => typeof value === 'string' ? [value]
  : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []

const decide = (event) => {
  const tool = event.toolName ?? event.tool_name ?? ''
  if (SKIP.includes(tool)) return undefined
  let args = event.toolArgs ?? event.tool_input ?? {}
  if (typeof args === 'string') {
    try { args = JSON.parse(args) } catch { args = { text: args } }
  }
  // Windows sends backslashes. The clone's own path is cut first, so a clone kept under a
  // folder named docs does not look like a read of docs/.
  const root = repo.replaceAll('\\', '/')
  // A write is judged by where it goes, not by what it says: the review session writes
  // reviewer records that quote knowledge rules by file name.
  const written = WRITE.includes(tool) ? [
    ...['path', 'file_path', 'filePath'].map((key) => args[key]).filter(Boolean),
    ...strings(args).flatMap((v) => [...v.matchAll(/^\*\*\* \w+ File: *(.+?) *$/gm)]
      .map((m) => m[1])),
  ] : strings(args)
  const text = written.map((s) => String(s).replaceAll('\\', '/').split(`${root}/`).join(''))
    .join('\n')
  if (/(^|[^\w-])facilitator([/\s"'`]|$)/im.test(text)) {
    return 'facilitator/ is not part of the project.'
  }
  const docs = /(^|[\s"'`=(:,/])docs(\/|[\s"'`]|$)/m.test(text)
  const agentId = event.agentId ?? event.agent_id
  const type = String(event.agentType ?? event.agent_type ?? '').toLowerCase()
  const agentFile = /^[a-z][a-z-]*$/.test(type) ? join(repo, '.github/agents', `${type}.agent.md`)
    : ''

  if (!agentId || BUILT_IN.includes(type)) {
    if (!docs) return undefined
    return 'docs/ holds the reviewers\' rules. Work from AGENTS.md and the ticket.'
  }
  if (!agentFile || !existsSync(agentFile)) return undefined

  if (['bash', 'powershell'].includes(tool)
    && !/^\s*git\s+(status|diff)\b[^;&|<>`$]*$/.test(String(args.command ?? ''))) {
    return 'A reviewer runs only git status and git diff.'
  }
  if (!docs) return undefined
  const list = readFileSync(agentFile, 'utf8').split(/^## Knowledge$/m)[1]?.split(/^## /m)[0] ?? ''
  const own = [...list.matchAll(/docs\/knowledge\/([A-Z_]+\.md)/g)].map((m) => m[1])
  const asked = [...text.matchAll(/docs\/knowledge\/([A-Za-z_]+\.md)/g)].map((m) => m[1])
  const otherDocs = text.replace(/docs\/knowledge\/[A-Za-z_]+\.md/g, '')
  if (asked.length && asked.every((f) => own.includes(f))
    && !/(^|[\s"'`=(:,/])docs(\/|[\s"'`]|$)/m.test(otherDocs)) return undefined
  return `This reviewer reads only ${own.map((f) => `docs/knowledge/${f}`).join(', ')}.`
}

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => { input += chunk })
process.stdin.on('end', () => {
  let reason
  try {
    reason = decide(JSON.parse(input || '{}'))
  } catch {
    reason = undefined
  }
  console.log(JSON.stringify(reason
    ? { permissionDecision: 'deny', permissionDecisionReason: reason } : {}))
})
