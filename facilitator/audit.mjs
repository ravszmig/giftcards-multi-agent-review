// What each Copilot session started with scripts/copilot-* read, wrote and ran, from its
// own event log under .lab/sessions.
//
//   node facilitator/audit.mjs
import { audit, cli, repo } from './tools.mjs'

cli(() => console.log(audit(repo)))
