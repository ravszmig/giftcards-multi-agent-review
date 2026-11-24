// One proof test per planted contradiction, run on HEAD in a throwaway worktree.
//
//   node facilitator/proofs.mjs 1|2|all
import assert from 'node:assert/strict'
import { cli, proofs, repo } from './tools.mjs'

cli(() => {
  const which = process.argv[2]
  assert.ok(['1', '2', 'all'].includes(which), 'Usage: node facilitator/proofs.mjs 1|2|all')
  console.log(proofs(repo, which).lines.join('\n'))
})
