// The report check for the review in review/: the contract, the routing rules and
// review/ROSTER, applied mechanically. Then the roster the rules give for the pinned diff.
//
//   node facilitator/check.mjs
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { activeRules, checkReport, route } from './report-check.mjs'
import { cli, repo } from './tools.mjs'

cli(() => {
  const review = join(repo, 'review')
  assert.ok(existsSync(join(review, 'PIN')), 'No review/PIN: nothing has been pinned yet')
  const rules = activeRules(repo)
  const routing = route(readFileSync(join(review, 'diff.patch'), 'utf8'), rules)
  const lines = [`Active rules: ${rules.join(', ')}`,
    ...Object.keys(routing).length ? Object.keys(routing).sort()
      .map((rule) => `${rule} matches: ${routing[rule]}`) : ['No optional rule matches']]
  if (!existsSync(join(review, 'REPORT.md'))) {
    console.log([...lines, 'No review/REPORT.md yet'].join('\n'))
    return
  }
  const { verdict, expected, problems } = checkReport(review, { rules })
  console.log([...lines, `Report check: verdict ${verdict}, contract rule gives ${expected}, `
    + `${problems.length} problem${problems.length === 1 ? '' : 's'}`,
  ...problems.map((problem) => `  ${problem}`)].join('\n'))
  process.exitCode = problems.length ? 1 : 0
})
