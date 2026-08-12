#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEVERITY_RANK = {
    info: 0,
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4,
}

export function parsePnpmLockPackages(lockText) {
    const packages = new Map()
    let inPackages = false

    for (const line of lockText.split(/\r?\n/)) {
        if (line === 'packages:') {
            inPackages = true
            continue
        }
        if (inPackages && /^[a-zA-Z][^:]*:\s*$/.test(line)) break
        if (!inPackages) continue

        const match = line.match(/^  (['"]?)(.+?)\1:\s*$/)
        if (!match) continue

        const key = match[2]
        const parsed = parsePackageKey(key)
        if (!parsed) continue

        const versions = packages.get(parsed.name) ?? new Set()
        versions.add(parsed.version)
        packages.set(parsed.name, versions)
    }

    return Object.fromEntries(
        [...packages.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, versions]) => [name, [...versions].sort()])
    )
}

function parsePackageKey(key) {
    if (key.startsWith('link:') || key.startsWith('file:') || key.startsWith('workspace:')) return null

    const baseKey = key.split('(')[0]
    const separator = baseKey.lastIndexOf('@')
    if (separator <= 0) return null

    const name = baseKey.slice(0, separator)
    const version = baseKey.slice(separator + 1)
    if (!name || !version) return null

    return { name, version }
}

export function extractAdvisoryId(value) {
    const match = String(value ?? '').match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i)
    return match ? match[0] : null
}

export function filterAdvisoriesBySeverity(response, auditLevel = 'moderate') {
    const minimum = SEVERITY_RANK[auditLevel] ?? SEVERITY_RANK.moderate
    const advisories = []

    for (const [packageName, packageAdvisories] of Object.entries(response)) {
        if (!Array.isArray(packageAdvisories)) continue

        for (const advisory of packageAdvisories) {
            const severity = String(advisory.severity ?? 'low').toLowerCase()
            if ((SEVERITY_RANK[severity] ?? -1) < minimum) continue

            const id = extractAdvisoryId(advisory.url) ?? extractAdvisoryId(advisory.title)
            if (!id) continue

            advisories.push({
                id,
                packageName,
                severity,
                title: advisory.title ?? 'Untitled advisory',
                url: advisory.url ?? null,
            })
        }
    }

    return advisories.sort((a, b) => a.id.localeCompare(b.id))
}

function extractWaiverSection(registerText, advisoryId) {
    const heading = `### ${advisoryId}`
    const headingIndex = registerText.indexOf(heading)
    if (headingIndex === -1) return null

    const afterHeading = registerText.slice(headingIndex + heading.length)
    const nextHeadingIndex = afterHeading.search(/\n###\s+/)
    return nextHeadingIndex === -1
        ? registerText.slice(headingIndex)
        : registerText.slice(headingIndex, headingIndex + heading.length + nextHeadingIndex)
}

function extractTableField(section, field) {
    const match = section.match(new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*([^|\\r\\n]+?)\\s*\\|`, 'i'))
    return match?.[1]?.trim() ?? null
}

function isConcreteMetadata(value) {
    return Boolean(value && !/^(?:n\/?a|none|tbd|unknown|-+)$/i.test(value))
}

export function validateWaivers(advisories, registerText, today = new Date().toISOString().slice(0, 10)) {
    const accepted = []
    const expired = []
    const invalid = []
    const missing = []
    const seen = new Set()

    for (const advisory of advisories) {
        if (seen.has(advisory.id)) continue
        seen.add(advisory.id)

        const section = extractWaiverSection(registerText, advisory.id)
        if (!section) {
            missing.push(advisory)
            continue
        }

        const reviewBy = section.match(/Review By[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1]
        if (!reviewBy || today > reviewBy) {
            expired.push({ ...advisory, reviewBy: reviewBy ?? null })
            continue
        }

        const owner = extractTableField(section, 'Owner')
        const justification = extractTableField(section, 'Justification')
        const reasons = []
        if (!isConcreteMetadata(owner)) reasons.push('owner')
        if (!isConcreteMetadata(justification)) reasons.push('justification')
        if (reasons.length > 0) {
            invalid.push({ ...advisory, reviewBy, reasons })
            continue
        }

        accepted.push({ ...advisory, reviewBy, owner, justification })
    }

    return {
        valid: expired.length === 0 && invalid.length === 0 && missing.length === 0,
        accepted,
        expired,
        invalid,
        missing,
    }
}

export function buildAuditReceipt({
    packageCount,
    auditLevel,
    advisories,
    waiverResult,
    generatedAt = new Date().toISOString(),
}) {
    const residuals = [
        ...waiverResult.expired.map(item => `expired_waiver:${item.id}`),
        ...waiverResult.invalid.map(item => `invalid_waiver:${item.id}`),
        ...waiverResult.missing.map(item => `missing_waiver:${item.id}`),
    ].sort()
    const blockedIds = new Set([
        ...waiverResult.expired,
        ...waiverResult.invalid,
        ...waiverResult.missing,
    ].map(item => item.id))
    return {
        schema: 'bootandstrap.supply-chain-audit/v1',
        status: waiverResult.valid ? 'passed' : 'failed',
        auditLevel,
        packageCount,
        counts: {
            advisories: advisories.length,
            high: advisories.filter(item => item.severity === 'high').length,
            critical: advisories.filter(item => item.severity === 'critical').length,
            acceptedWaivers: waiverResult.accepted.length,
            expiredWaivers: waiverResult.expired.length,
            invalidWaivers: waiverResult.invalid.length,
            missingWaivers: waiverResult.missing.length,
            unwaivedHighCritical: advisories.filter(item =>
                (item.severity === 'high' || item.severity === 'critical') && blockedIds.has(item.id)
            ).length,
        },
        acceptedWaivers: waiverResult.accepted.map(item => ({
            id: item.id,
            severity: item.severity,
            reviewBy: item.reviewBy,
            owner: item.owner,
            justification: item.justification,
        })).sort((left, right) => left.id.localeCompare(right.id)),
        residuals,
        generatedAt,
    }
}

async function fetchBulkAdvisories(packages, chunkSize = 500) {
    const entries = Object.entries(packages)
    const merged = {}

    for (let index = 0; index < entries.length; index += chunkSize) {
        const chunk = Object.fromEntries(entries.slice(index, index + chunkSize))
        const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(chunk),
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(`Bulk advisory endpoint failed: ${response.status} ${response.statusText} ${body}`)
        }

        const data = await response.json()
        for (const [packageName, advisories] of Object.entries(data)) {
            merged[packageName] = [...(merged[packageName] ?? []), ...advisories]
        }
    }

    return merged
}

function parseArgs(argv) {
    const args = {
        root: process.cwd(),
        auditLevel: 'moderate',
    }

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        if (arg === '--root') args.root = argv[++index]
        else if (arg === '--lockfile') args.lockfile = argv[++index]
        else if (arg === '--register') args.register = argv[++index]
        else if (arg === '--audit-level') args.auditLevel = argv[++index]
        else if (arg === '--output') args.output = argv[++index]
    }

    args.lockfile ??= resolve(args.root, 'pnpm-lock.yaml')
    args.register ??= resolve(args.root, 'docs/operations/DEPENDENCY_RISK_REGISTER.md')
    return args
}

function writeReceipt(outputPath, receipt) {
    const resolved = resolve(outputPath)
    mkdirSync(dirname(resolved), { recursive: true })
    const temporary = `${resolved}.tmp-${process.pid}`
    writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
    renameSync(temporary, resolved)
}

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const lockText = readFileSync(args.lockfile, 'utf-8')
    const registerText = readFileSync(args.register, 'utf-8')
    const packages = parsePnpmLockPackages(lockText)

    console.log(`Bulk advisory audit: ${Object.keys(packages).length} package(s), level=${args.auditLevel}`)

    const response = await fetchBulkAdvisories(packages)
    const advisories = filterAdvisoriesBySeverity(response, args.auditLevel)
    const waiverResult = validateWaivers(advisories, registerText)
    const receipt = buildAuditReceipt({
        packageCount: Object.keys(packages).length,
        auditLevel: args.auditLevel,
        advisories,
        waiverResult,
    })
    if (args.output) writeReceipt(args.output, receipt)

    if (advisories.length === 0) {
        console.log('No moderate+ advisories found')
        console.log(JSON.stringify({ status: receipt.status, counts: receipt.counts }))
        return
    }

    for (const advisory of waiverResult.accepted) {
        console.log(`WAIVED ${advisory.id} ${advisory.packageName} ${advisory.severity} Review By: ${advisory.reviewBy}`)
    }
    for (const advisory of waiverResult.expired) {
        console.error(`EXPIRED ${advisory.id} ${advisory.packageName} ${advisory.severity} Review By: ${advisory.reviewBy ?? 'missing'}`)
    }
    for (const advisory of waiverResult.invalid) {
        console.error(`INVALID ${advisory.id} ${advisory.packageName} ${advisory.severity} Missing: ${advisory.reasons.join(',')}`)
    }
    for (const advisory of waiverResult.missing) {
        console.error(`MISSING ${advisory.id} ${advisory.packageName} ${advisory.severity}`)
    }

    if (!waiverResult.valid) {
        process.exitCode = 1
    }
    console.log(JSON.stringify({ status: receipt.status, counts: receipt.counts }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    })
}
