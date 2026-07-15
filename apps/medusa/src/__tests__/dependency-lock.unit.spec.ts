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

    it("uses the lockfile as the Docker build authority", () => {
        const appRoot = resolveAppRoot()
        const dockerfile = readFileSync(resolve(appRoot, "Dockerfile"), "utf8")

        expect(dockerfile).toContain("RUN npm ci")
        expect(dockerfile).not.toContain("RUN npm install")
    })
})
