import { existsSync, readFileSync } from "node:fs"
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
        expect(dockerfile).not.toContain("RUN npm install")
        expect(dockerfile).not.toContain("RUN npm ci")
    })
})
