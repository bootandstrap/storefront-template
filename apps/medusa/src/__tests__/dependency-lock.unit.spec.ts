import { spawnSync } from "node:child_process"
import {
    chmodSync,
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"

function resolveAppRoot() {
    const candidates = [
        process.cwd(),
        resolve(process.cwd(), "apps/medusa"),
        resolve(__dirname, "../.."),
    ]

    const appRoot = candidates.find((candidate) =>
        existsSync(resolve(candidate, "package.json")) &&
        existsSync(resolve(candidate, "package-lock.json")) &&
        existsSync(resolve(candidate, "Dockerfile"))
    )

    if (!appRoot) {
        throw new Error("Unable to resolve Medusa app root")
    }

    return appRoot
}

function runEntrypoint(
    appRoot: string,
    scenario: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string; calls: string[] } {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "bns-medusa-entrypoint-"))
    const fakeCli = resolve(temporaryRoot, "medusa")
    const callsPath = resolve(temporaryRoot, "calls")
    writeFileSync(fakeCli, `#!/bin/sh
case "\${1:-}" in
  db:migrate) echo migrate >> "$BNS_ENTRYPOINT_CALLS"; exit "\${BNS_FAKE_MIGRATE_STATUS:-0}" ;;
  user) echo user >> "$BNS_ENTRYPOINT_CALLS"; exit "\${BNS_FAKE_USER_STATUS:-0}" ;;
  start) echo start >> "$BNS_ENTRYPOINT_CALLS"; exit "\${BNS_FAKE_START_STATUS:-0}" ;;
  *) exit 64 ;;
esac
`)
    chmodSync(fakeCli, 0o700)

    try {
        const result = spawnSync("sh", [resolve(appRoot, "docker-entrypoint.sh")], {
            encoding: "utf8",
            env: {
                PATH: process.env.PATH,
                MEDUSA_CLI: fakeCli,
                BNS_ENTRYPOINT_CALLS: callsPath,
                ...scenario,
            },
        })
        const calls = existsSync(callsPath)
            ? readFileSync(callsPath, "utf8").trim().split("\n").filter(Boolean)
            : []
        return {
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            calls,
        }
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true })
    }
}

describe("Medusa dependency lock contract", () => {
    it("keeps direct Medusa packages locked to package.json versions", () => {
        const appRoot = resolveAppRoot()
        const packageJson = JSON.parse(
            readFileSync(resolve(appRoot, "package.json"), "utf8")
        )
        const packageLock = JSON.parse(
            readFileSync(resolve(appRoot, "package-lock.json"), "utf8")
        )

        const rootLock = packageLock.packages?.[""]
        expect(rootLock).toBeDefined()

        const directMedusaDeps = Object.entries({
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        }).filter(([name]) => name.startsWith("@medusajs/"))

        expect(directMedusaDeps.length).toBeGreaterThan(0)

        for (const [name, version] of directMedusaDeps) {
            expect(rootLock.dependencies?.[name] ?? rootLock.devDependencies?.[name])
                .toBe(version)
            expect(packageLock.packages?.[`node_modules/${name}`]?.version)
                .toBe(version)
        }
    })

    it("builds workspace dependencies from the canonical pnpm root", () => {
        const appRoot = resolveAppRoot()
        const repoRoot = resolve(appRoot, "../..")
        const dockerfile = readFileSync(resolve(appRoot, "Dockerfile"), "utf8")
        const workflow = readFileSync(
            resolve(repoRoot, ".github/workflows/build-medusa.yml"),
            "utf8"
        )
        const dockerignore = readFileSync(resolve(repoRoot, ".dockerignore"), "utf8")
        const entrypoint = readFileSync(resolve(appRoot, "docker-entrypoint.sh"), "utf8")

        expect(workflow).toContain("context: .")
        const nodeImage = "node:20.9.0-bookworm-slim@sha256:d272d96f3ad3a4e5bb2b6c36ea7427b4e83d1b23fb24b9df8b71d01aa59951b1"
        expect(dockerfile).toContain(`FROM ${nodeImage} AS builder`)
        expect(dockerfile).toContain(`FROM ${nodeImage} AS runner`)
        expect(dockerfile).toContain("pnpm install --frozen-lockfile")
        expect(dockerfile).toContain("pnpm --filter @bootandstrap/shared build")
        expect(dockerfile).toContain("pnpm --filter apps/medusa deploy --prod /opt/medusa")
        expect(dockerignore).toContain("node_modules")
        expect(dockerignore).toContain("**/.env*")
        expect(dockerignore).toContain("\n.artifacts\n")
        expect(dockerignore).not.toMatch(/^apps\/storefront\/?$/m)
        expect(dockerignore).not.toMatch(/^packages\/platform-contract\/?$/m)
        expect(dockerignore).not.toMatch(/^packages\/tenant-context\/?$/m)
        expect(dockerfile).not.toContain("RUN npm install")
        expect(dockerfile).not.toContain("RUN npm ci")
        expect(entrypoint).toContain("set -eu")
        expect(entrypoint).toContain('MEDUSA_CLI="${MEDUSA_CLI:-/app/node_modules/.bin/medusa}"')
        expect(entrypoint).toContain('exec "$MEDUSA_CLI" start')
        expect(entrypoint).not.toContain("sleep ")
        expect(entrypoint).not.toContain("|| true")
        expect(entrypoint).not.toMatch(/echo .*MEDUSA_ADMIN_EMAIL/)
    })

    it("runs the storefront image gate when the root Docker context changes", () => {
        const appRoot = resolveAppRoot()
        const repoRoot = resolve(appRoot, "../..")
        const workflow = readFileSync(
            resolve(repoRoot, ".github/workflows/docker-publish.yml"),
            "utf8"
        )

        expect(workflow).toMatch(/^\s+- ['"]?\.dockerignore['"]?\s*$/m)
    })

    it("fails closed at migration and admin boundaries without fixed-delay retries", () => {
        const appRoot = resolveAppRoot()
        const migrationFailure = runEntrypoint(appRoot, {
            BNS_FAKE_MIGRATE_STATUS: "9",
        })
        expect(migrationFailure.status).not.toBe(0)
        expect(migrationFailure.calls).toEqual(["migrate"])

        const incompleteCredentials = runEntrypoint(appRoot, {
            MEDUSA_ADMIN_EMAIL: "owner@example.invalid",
        })
        expect(incompleteCredentials.status).not.toBe(0)
        expect(incompleteCredentials.calls).toEqual(["migrate"])
        expect(incompleteCredentials.stderr).toContain("Admin credential pair is incomplete")

        const adminFailure = runEntrypoint(appRoot, {
            MEDUSA_ADMIN_EMAIL: "owner@example.invalid",
            MEDUSA_ADMIN_PASSWORD: "synthetic-password",
            BNS_FAKE_USER_STATUS: "7",
        })
        expect(adminFailure.status).not.toBe(0)
        expect(adminFailure.calls).toEqual(["migrate", "user"])
        expect(`${adminFailure.stdout}${adminFailure.stderr}`).not.toContain("owner@example.invalid")
        expect(`${adminFailure.stdout}${adminFailure.stderr}`).not.toContain("synthetic-password")

        const noAdminRequired = runEntrypoint(appRoot)
        expect(noAdminRequired.status).toBe(0)
        expect(noAdminRequired.calls).toEqual(["migrate", "start"])

        const success = runEntrypoint(appRoot, {
            MEDUSA_ADMIN_EMAIL: "owner@example.invalid",
            MEDUSA_ADMIN_PASSWORD: "synthetic-password",
        })
        expect(success.status).toBe(0)
        expect(success.calls).toEqual(["migrate", "user", "start"])
    })
})
