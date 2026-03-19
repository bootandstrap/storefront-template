#!/usr/bin/env npx tsx
/**
 * setup-local-dev.ts — Interactive one-command local dev setup
 *
 * Usage: npx tsx scripts/setup-local-dev.ts
 *
 * What it does:
 * 1. Checks prerequisites (Node ≥18, pnpm, PostgreSQL)
 * 2. Copies .env.template → .env with prompts for Supabase keys
 * 3. Auto-generates secrets (COOKIE_SECRET, JWT_SECRET, MEDUSA_ADMIN_PASSWORD)
 * 4. Creates symlink .env → apps/storefront/.env.local
 * 5. Installs dependencies (pnpm install)
 * 6. Runs Medusa migrations
 * 7. Seeds demo data if seed script exists
 * 8. Prints next steps
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, symlinkSync, unlinkSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import * as readline from 'readline'

const ROOT_DIR = join(import.meta.dirname, '..')

// ── Colors ──────────────────────────────────────────────────────
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const BOLD = '\x1b[1m'
const NC = '\x1b[0m'

function log(msg: string) { console.log(msg) }
function ok(msg: string) { log(`  ${GREEN}✓${NC} ${msg}`) }
function warn(msg: string) { log(`  ${YELLOW}⚠${NC} ${msg}`) }
function fail(msg: string) { log(`  ${RED}✗${NC} ${msg}`) }
function step(n: number, total: number, msg: string) {
    log(`\n${BLUE}[${n}/${total}]${NC} ${BOLD}${msg}${NC}`)
}

function generateSecret(bytes = 32): string {
    return randomBytes(bytes).toString('hex')
}

function commandExists(cmd: string): boolean {
    try {
        execSync(`command -v ${cmd}`, { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

function getNodeMajor(): number {
    const version = process.version.replace('v', '')
    return parseInt(version.split('.')[0])
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    const suffix = defaultValue ? ` [${defaultValue}]` : ''
    return new Promise((resolve) => {
        rl.question(`  ${question}${suffix}: `, (answer) => {
            rl.close()
            resolve(answer.trim() || defaultValue || '')
        })
    })
}

async function main() {
    log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`)
    log(`${BOLD}  BootandStrap — Local Dev Setup${NC}`)
    log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`)

    const TOTAL_STEPS = 7

    // ── 1. Check Prerequisites ──────────────────────────────────
    step(1, TOTAL_STEPS, 'Checking prerequisites')
    let allOk = true

    if (getNodeMajor() >= 18) {
        ok(`Node.js ${process.version}`)
    } else {
        fail(`Node.js ${process.version} — need ≥18`)
        allOk = false
    }

    if (commandExists('pnpm')) {
        ok('pnpm installed')
    } else {
        fail('pnpm not found — install: npm i -g pnpm')
        allOk = false
    }

    const hasDocker = commandExists('docker')
    if (hasDocker) {
        ok('Docker available (for Redis)')
    } else {
        warn('Docker not found — Redis will be disabled')
    }

    // Check PostgreSQL
    const hasPsql = commandExists('psql')
    if (hasPsql) {
        ok('PostgreSQL available')
    } else {
        warn('psql not found — ensure DATABASE_URL points to a running PostgreSQL instance')
    }

    if (!allOk) {
        log(`\n${RED}Some prerequisites are missing. Fix them and re-run.${NC}\n`)
        process.exit(1)
    }

    // ── 2. Create .env ──────────────────────────────────────────
    step(2, TOTAL_STEPS, 'Setting up environment variables')

    const envPath = join(ROOT_DIR, '.env')
    const templatePath = join(ROOT_DIR, '.env.template')

    if (existsSync(envPath)) {
        warn('.env already exists — skipping (delete it to regenerate)')
    } else if (!existsSync(templatePath)) {
        fail('.env.template not found — cannot create .env')
        process.exit(1)
    } else {
        let envContent = readFileSync(templatePath, 'utf-8')

        log(`\n  Enter your Supabase credentials (from Dashboard → Settings → API):`)
        const supaUrl = await prompt('NEXT_PUBLIC_SUPABASE_URL')
        const supaAnon = await prompt('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        const supaService = await prompt('SUPABASE_SERVICE_ROLE_KEY')
        const tenantId = await prompt('NEXT_PUBLIC_TENANT_ID (dev tenant UUID)', '')

        if (supaUrl) envContent = envContent.replace('https://your-project.supabase.co', supaUrl)
        if (supaAnon) envContent = envContent.replace('eyJ...your-anon-key', supaAnon)
        if (supaService) envContent = envContent.replace('eyJ...your-service-role-key', supaService)
        if (tenantId) envContent = envContent.replace('your-dev-tenant-id', tenantId)

        // Auto-generate secrets
        const cookieSecret = generateSecret(32)
        const jwtSecret = generateSecret(32)
        const adminPassword = generateSecret(16)

        envContent = envContent.replace('change-me-to-random-string', cookieSecret)
        envContent = envContent.replace('change-me-to-random-string', jwtSecret)
        envContent = envContent.replace('demo-password-change-me', adminPassword)

        writeFileSync(envPath, envContent, 'utf-8')
        ok(`.env created with auto-generated secrets`)
    }

    // ── 3. Symlink .env → apps/storefront/.env.local ────────────
    step(3, TOTAL_STEPS, 'Creating storefront env symlink')

    const storefrontEnvLocal = join(ROOT_DIR, 'apps', 'storefront', '.env.local')
    try {
        if (existsSync(storefrontEnvLocal)) {
            unlinkSync(storefrontEnvLocal)
        }
        symlinkSync(envPath, storefrontEnvLocal)
        ok(`.env → apps/storefront/.env.local`)
    } catch (e) {
        warn(`Could not create symlink: ${(e as Error).message}`)
        warn('Copy .env to apps/storefront/.env.local manually')
    }

    // ── 4. Install dependencies ─────────────────────────────────
    step(4, TOTAL_STEPS, 'Installing dependencies')

    const installResult = spawnSync('pnpm', ['install'], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
    })
    if (installResult.status === 0) {
        ok('Dependencies installed')
    } else {
        fail('pnpm install failed')
        process.exit(1)
    }

    // ── 5. Medusa migrations ────────────────────────────────────
    step(5, TOTAL_STEPS, 'Running Medusa database migrations')

    const medusaDir = join(ROOT_DIR, 'apps', 'medusa')
    const migrateResult = spawnSync('npx', ['medusa', 'db:migrate'], {
        cwd: medusaDir,
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' },
    })
    if (migrateResult.status === 0) {
        ok('Migrations applied')
    } else {
        warn('Migrations failed — is PostgreSQL running? Check DATABASE_URL in .env')
    }

    // ── 6. Seed demo data ───────────────────────────────────────
    step(6, TOTAL_STEPS, 'Seeding demo data')

    const seedScript = join(ROOT_DIR, 'scripts', 'seed-demo.ts')
    if (existsSync(seedScript)) {
        const seedResult = spawnSync('npx', ['tsx', seedScript], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
        })
        if (seedResult.status === 0) {
            ok('Demo data seeded')
        } else {
            warn('Seed script failed — you can run it later: npx tsx scripts/seed-demo.ts')
        }
    } else {
        warn('No seed script found — skipping')
    }

    // ── 7. Print next steps ─────────────────────────────────────
    step(7, TOTAL_STEPS, 'Ready!')

    log(`
${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}✅ Setup complete!${NC}

  Start development:
    ${BLUE}./dev.sh${NC}

  URLs (after dev.sh starts):
    Storefront:   ${BLUE}http://localhost:3000/es${NC}
    Medusa Admin: ${BLUE}http://localhost:9000/app${NC}
    Medusa API:   ${BLUE}http://localhost:9000${NC}

  Medusa Admin login:
    Email:    admin@demo.localhost
    Password: ${YELLOW}(check .env → MEDUSA_ADMIN_PASSWORD)${NC}

  Troubleshooting: ${BLUE}docs/guides/DEVELOPMENT.md${NC}
${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
`)
}

main().catch((err) => {
    console.error(`\n${RED}Setup failed:${NC}`, err)
    process.exit(1)
})
