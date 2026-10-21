import { spawnSync } from 'node:child_process'

// Migrations use the direct (non-pooled) Neon connection; the app uses the pooled one.
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

function run(args, env = {}) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['payload', 'migrate'], { DATABASE_URL: direct })
run(['build'])
