#!/usr/bin/env node

const ALLOWED_OWNER = 'bootandstrap'
const REPOSITORY_NAME = /^[A-Za-z0-9_.-]+$/

function fail(message) {
  console.error(`[template-sync-repos] ${message}`)
  process.exit(1)
}

let input = ''
for await (const chunk of process.stdin) {
  input += chunk
}

let tenants
try {
  tenants = JSON.parse(input)
} catch {
  fail('tenant response must be valid JSON')
}

if (!Array.isArray(tenants)) {
  fail('tenant response must be an array')
}

const repos = []
const seen = new Set()

for (const [index, tenant] of tenants.entries()) {
  const rawUrl = tenant && typeof tenant === 'object'
    ? tenant.github_repo_url
    : null

  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    fail(`tenant row ${index} must define github_repo_url`)
  }

  let url
  try {
    url = new URL(rawUrl)
  } catch {
    fail(`tenant row ${index} has an invalid GitHub repository URL`)
  }

  const segments = url.pathname.split('/').filter(Boolean)
  const isAllowed = url.protocol === 'https:'
    && url.hostname === 'github.com'
    && url.port === ''
    && url.username === ''
    && url.password === ''
    && url.search === ''
    && url.hash === ''
    && segments.length === 2
    && segments[0] === ALLOWED_OWNER
    && REPOSITORY_NAME.test(segments[1])
    && !segments[1].toLowerCase().endsWith('.git')

  if (!isAllowed) {
    fail(`tenant row ${index} has a repository outside the authorized namespace`)
  }

  const repo = `${ALLOWED_OWNER}/${segments[1].toLowerCase()}`
  if (!seen.has(repo)) {
    seen.add(repo)
    repos.push(repo)
  }
}

process.stdout.write(JSON.stringify({ repos, count: repos.length }))
