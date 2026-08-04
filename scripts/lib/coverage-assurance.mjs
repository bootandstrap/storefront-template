function matches(relativePath, selector) {
  if (selector.exact) return relativePath === selector.exact
  if (selector.prefix) return relativePath.startsWith(selector.prefix)
  if (selector.suffix) return relativePath.endsWith(selector.suffix)
  if (selector.contains) return relativePath.includes(selector.contains)
  return false
}

function metricPct(entry, metric) {
  const value = entry?.[metric]
  return typeof value === 'number' ? value : value?.pct
}

function metricWeight(entry, metric) {
  const value = entry?.[metric]
  if (typeof value === 'object' && Number.isFinite(value?.total) && value.total > 0) {
    return value.total
  }
  return entry?.executableLines > 0 ? entry.executableLines : 1
}

function aggregateMetric(entries, metric) {
  const measured = entries.flatMap((entry) => {
    const value = entry?.[metric]
    if (typeof value === 'object') {
      if (!Number.isFinite(value?.total) || value.total <= 0 || !Number.isFinite(value?.covered)) return []
      return [{ covered: value.covered, total: value.total }]
    }

    const pct = metricPct(entry, metric)
    if (!Number.isFinite(pct)) return []
    const weight = metricWeight(entry, metric)
    return [{ covered: (pct / 100) * weight, total: weight }]
  })
  if (measured.length === 0) return null
  const covered = measured.reduce((total, entry) => total + entry.covered, 0)
  const total = measured.reduce((sum, entry) => sum + entry.total, 0)
  return Number(((covered / total) * 100).toFixed(2))
}

function evaluateGlobalRatchet(policy, coverage, metrics, failures) {
  const maximumRegression = policy.globalRatchet?.maximumRegression ?? 0
  for (const metric of metrics) {
    const actual = coverage.totals?.[metric]
    const baseline = policy.globalRatchet?.baseline?.[metric]
    if (!Number.isFinite(actual)) {
      failures.push(`global ${metric} is missing from coverage report`)
    } else if (!Number.isFinite(baseline)) {
      failures.push(`global ${metric} baseline is missing from policy`)
    } else if (actual < baseline - maximumRegression) {
      failures.push(`global ${metric} regressed: actual ${actual}, required ${baseline}`)
    }
  }
}

function matchedDomainEntries(domain, coverage) {
  return Object.entries(coverage.files ?? {})
    .filter(([relativePath]) => domain.sourceSelectors.some((selector) => matches(relativePath, selector)))
}

function evaluateDomainThresholds(domain, totals, metrics, failures) {
  for (const metric of metrics) {
    const actual = totals[metric]
    const threshold = domain.ratchetThresholds?.[metric]
    if (!Number.isFinite(threshold)) {
      failures.push(`${domain.id}: missing ${metric} ratchet threshold`)
    } else if (!Number.isFinite(actual) || actual < threshold) {
      failures.push(`${domain.id}: ${metric} ${actual ?? 'missing'} is below ratchet ${threshold}`)
    }
  }
}

function evaluateCriticalDomain(domain, coverage, metrics, failures) {
  const sourceEntries = matchedDomainEntries(domain, coverage)
  if (sourceEntries.length === 0) {
    failures.push(`${domain.id}: no source coverage records matched the declared selectors`)
    return null
  }
  const executableSourceEntries = sourceEntries
    .filter(([, entry]) => (entry.executableLines ?? metricWeight(entry, 'lines')) > 0)
  if (executableSourceEntries.length === 0) {
    failures.push(`${domain.id}: matched source coverage records contain no executable runtime`)
    return null
  }

  const files = executableSourceEntries.map(([, entry]) => entry)
  const totals = Object.fromEntries(metrics.map((metric) => [metric, aggregateMetric(files, metric)]))
  const zeroCoverageFiles = executableSourceEntries
    .filter(([, entry]) => metricPct(entry, 'lines') === 0)
    .map(([relativePath]) => relativePath)
  const maxZeroCoverageFiles = domain.maxZeroCoverageFiles ?? 0
  if (zeroCoverageFiles.length > maxZeroCoverageFiles) {
    failures.push(`${domain.id}: zero-coverage files ${zeroCoverageFiles.length}, allowed ${maxZeroCoverageFiles}`)
  }
  evaluateDomainThresholds(domain, totals, metrics, failures)

  return {
    id: domain.id,
    sourceFiles: sourceEntries.length,
    executableSourceFiles: executableSourceEntries.length,
    zeroCoverageFiles,
    totals,
    ratchetThresholds: domain.ratchetThresholds,
    targetThresholds: domain.targetThresholds,
  }
}

export function evaluateCoverage(policy, coverage) {
  const failures = []
  const metrics = ['lines', 'functions', 'branches']
  evaluateGlobalRatchet(policy, coverage, metrics, failures)

  const domainResults = []
  for (const domain of policy.criticalDomains ?? []) {
    const result = evaluateCriticalDomain(domain, coverage, metrics, failures)
    if (result) domainResults.push(result)
  }

  return {
    status: failures.length === 0 ? 'passed' : 'failed',
    failures,
    totals: coverage.totals,
    domains: domainResults,
  }
}

export function normalizeVitestSummary(summary, repoRoot) {
  const normalizePath = (filePath) => filePath
    .replaceAll('\\', '/')
    .replace(`${repoRoot.replaceAll('\\', '/')}/`, '')
  const metric = (entry, name) => ({
    total: entry?.[name]?.total ?? 0,
    covered: entry?.[name]?.covered ?? 0,
    pct: entry?.[name]?.pct ?? 0,
  })
  const total = summary.total ?? {}
  const files = Object.fromEntries(Object.entries(summary)
    .filter(([filePath]) => filePath !== 'total')
    .map(([filePath, entry]) => [normalizePath(filePath), {
      lines: metric(entry, 'lines'),
      functions: metric(entry, 'functions'),
      branches: metric(entry, 'branches'),
      executableLines: entry?.lines?.total ?? 0,
    }]))

  return {
    totals: Object.fromEntries(['lines', 'functions', 'branches'].map((name) => [
      name,
      total?.[name]?.pct,
    ])),
    files,
  }
}
