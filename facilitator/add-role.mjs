// Step 3 for a dry run, in place of the hand edit: copies the Primitive obsession role into
// .github/agents and adds rule R3 to the skill, uncommitted.
//
//   node facilitator/add-role.mjs
import { addRole, cli, repo } from './tools.mjs'

cli(() => console.log(`Added the primitive-obsession role and rule R3. Active rules: `
  + `${addRole(repo).join(', ')}`))
