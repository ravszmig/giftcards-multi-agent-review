// Run once before the session, with network access. Downloads what the offline Maven runs
// need (the build, JUnit and Surefire), then checks the suite passes offline.
//
//   node scripts/warm-up.mjs

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

const step = (name, args) => {
  const r = spawnSync('mvn', args, { encoding: 'utf8', shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024 })
  mkdirSync('target', { recursive: true })
  writeFileSync('target/warm-up.log', `${r.stdout ?? ''}${r.stderr ?? ''}`)
  if (r.status !== 0) {
    console.error(`Warm-up failed at: ${name} (see target/warm-up.log)`)
    process.exit(r.status ?? 1)
  }
  console.log(`ok  ${name}`)
}

step('download and run the suite', ['-q', '-B', 'test'])
step('the suite offline', ['-o', '-q', '-B', 'test'])
rmSync('target', { recursive: true, force: true })
console.log('Ready: the suite passes offline.')
