#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildTaskGraph,
  nextReadyBatch,
  propagateDependencyFailures,
  topologicalBatches,
  validateReceipt,
} from './lib/assurance-dag.mjs'
import {
  assuranceExecutionMode,
  buildTaskProcessEnvironment,
} from './lib/assurance-execution.mjs'
import { snapshotAssuranceProfile } from './lib/assurance-profile-receipts.mjs'
import { hashInputs, hashWorkingTree, runGit, sha256 } from './lib/assurance-identity.mjs'
import { discoverChangedFiles, selectImpact } from './lib/assurance-impact.mjs'
import { resolveProfile } from './lib/assurance-profile.mjs'
import { resolveAssuranceWorkerCount } from './lib/assurance-workers.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const artifactRoot = path.join(repoRoot, '.artifacts', 'assurance')
const taskReceiptRoot = path.join(artifactRoot, 'tasks')
const baselineEnvironmentKeys = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'SHELL',
  'USER',
  'LOGNAME',
  'LANG',
  'LC_ALL',
  'TERM',
  'NO_COLOR',
  'FORCE_COLOR',
]

function parseArgument(options, argv, index) {
  const argument = argv[index]
  if (argument === '--') return 0
  if (argument === '--dry-run' || argument === '--no-cache') {
    options[argument === '--dry-run' ? 'dryRun' : 'noCache'] = true
    return 0
  }
  if (argument !== '--profile' && argument !== '--base') {
    throw new Error(`unknown argument: ${argument}`)
  }
  const value = argv[index + 1]
  if (value === undefined) throw new Error(`${argument} requires a value`)
  options[argument === '--profile' ? 'profile' : 'base'] = value
  return 1
}

function parseArguments(argv) {
  const options = { profile: undefined, dryRun: false, noCache: false, base: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    index += parseArgument(options, argv, index)
  }
  if (!options.profile) throw new Error('--profile is required')
  return options
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function taskEnvironment(task) {
  const names = [...new Set([...baselineEnvironmentKeys, ...task.environmentKeys])]
    .filter((key) => process.env[key] !== undefined)
    .sort()
  return {
    names,
    values: Object.fromEntries(names.map((key) => [key, process.env[key]])),
  }
}

function hashEnvironment(environment) {
  return sha256(environment.names.map((name) => `${name}\0${environment.values[name]}\0`))
}

async function hashTaskOutputs(outputs) {
  const outputSha256 = {}
  for (const relativePath of [...outputs].sort()) {
    try {
      outputSha256[relativePath] = sha256([await fs.readFile(path.join(repoRoot, relativePath))])
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      outputSha256[relativePath] = null
    }
  }
  return outputSha256
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await fs.rename(temporaryPath, filePath)
}

async function readReceipt(receiptPath) {
  try {
    return await readJson(receiptPath)
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null
    throw error
  }
}

function outputExists(relativePath) {
  return existsSync(path.join(repoRoot, relativePath))
}

function fullProfileDryRun(profiles, taskConfig, impact) {
  if (!impact?.fullProfileDryRun) return null
  const full = resolveProfile(profiles, 'full', [])
  const fullGraph = buildTaskGraph(taskConfig, full.tasks)
  return {
    status: 'planned',
    profile: 'full',
    claimBoundary: full.claimBoundary,
    tasks: fullGraph.ids,
    batches: topologicalBatches(fullGraph),
    deferred: full.deferred.map((taskId) => ({ taskId, status: 'deferred' })),
  }
}

async function resolveRunPlan(options, profiles, taskConfig) {
  if (options.profile !== 'fast') {
    if (options.base !== undefined) throw new Error('--base is supported only by the fast profile')
    const resolved = resolveProfile(profiles, options.profile, [])
    return {
      resolved,
      graph: buildTaskGraph(taskConfig, resolved.tasks),
      changedFiles: [],
      impact: null,
      impactPlan: null,
    }
  }

  const impactConfig = await readJson(path.join(scriptDir, 'assurance-impact.json'))
  const policy = await readJson(path.join(scriptDir, 'assurance-policy.json'))
  const changedFiles = await discoverChangedFiles(repoRoot, {
    base: options.base,
    defaultBaseRef: impactConfig.defaultBaseRef,
  })
  const impact = selectImpact(impactConfig, changedFiles, { profiles, policy })
  const profile = resolveProfile(profiles, options.profile, changedFiles)
  const tasks = [...new Set([...profile.tasks, ...impact.tasks])]
  const resolved = {
    ...profile,
    tasks,
    deferred: profile.deferred.filter((taskId) => !tasks.includes(taskId)),
    matchedRules: [...new Set([...profile.matchedRules, ...impact.matchedRules])],
  }
  const impactPlan = {
    base: options.base ?? impactConfig.defaultBaseRef,
    reasons: impact.reasons,
    fullProfileDryRun: fullProfileDryRun(profiles, taskConfig, impact),
  }
  return {
    resolved,
    graph: buildTaskGraph(taskConfig, resolved.tasks),
    changedFiles,
    impact,
    impactPlan,
  }
}

function writeDryRunPlan({ resolved, graph, changedFiles, impactPlan }) {
  process.stdout.write(`${JSON.stringify({
    schema: 'bootandstrap.assurance-plan/v1',
    dryRun: true,
    status: 'planned',
    profile: resolved.profile,
    claimBoundary: resolved.claimBoundary,
    executionMode: 'planned_not_executed',
    tasks: graph.ids,
    batches: topologicalBatches(graph),
    deferred: resolved.deferred.map((taskId) => ({ taskId, status: 'deferred' })),
    changedFiles,
    impact: impactPlan,
  })}\n`)
}

function bindSignalHandlers(children, interruption) {
  const stopChildren = (signal) => {
    interruption.active = true
    interruption.signal = signal
    for (const child of children) child.kill('SIGTERM')
  }
  process.once('SIGINT', () => stopChildren('SIGINT'))
  process.once('SIGTERM', () => stopChildren('SIGTERM'))
}

async function executeTaskGraph(graph, states, workers, interruption, runTask) {
  while (Object.keys(states).length < graph.ids.length) {
    if (interruption.active) {
      for (const taskId of graph.ids) {
        if (states[taskId] === undefined) states[taskId] = 'interrupted'
      }
      break
    }
    Object.assign(states, propagateDependencyFailures(graph, states))
    const ready = nextReadyBatch(graph, states, workers)
    if (ready.length === 0) break
    const results = await Promise.all(ready.map(async (taskId) => [taskId, await runTask(taskId)]))
    for (const [taskId, status] of results) states[taskId] = status
  }
}

function finalizeTaskStates(graph, states, interruption) {
  Object.assign(states, propagateDependencyFailures(graph, states))
  for (const taskId of graph.ids) {
    if (states[taskId] === undefined) states[taskId] = interruption.active ? 'interrupted' : 'blocked'
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const profiles = await readJson(path.join(scriptDir, 'assurance-profiles.json'))
  const taskConfig = await readJson(path.join(scriptDir, 'assurance-tasks.json'))
  const plan = await resolveRunPlan(options, profiles, taskConfig)
  const { resolved, graph, changedFiles, impact, impactPlan } = plan

  if (options.dryRun) {
    writeDryRunPlan(plan)
    return
  }

  if (impactPlan) {
    process.stderr.write(`[assurance] impact ${JSON.stringify({
      changedFiles,
      selectedTasks: graph.ids,
      ...impactPlan,
    })}\n`)
  }

  const configuredWorkers = resolveAssuranceWorkerCount(process.env.BNS_ASSURANCE_WORKERS)
  const executionMode = assuranceExecutionMode(options)

  const revision = runGit(repoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim()
  const workingTreeSha256 = await hashWorkingTree(repoRoot)
  const packageJson = await readJson(path.join(repoRoot, 'package.json'))
  const states = {}
  const receipts = {}
  const children = new Set()
  const interruption = { active: false, signal: null }
  bindSignalHandlers(children, interruption)

  async function runTask(taskId) {
    const task = graph.tasks.get(taskId)
    const environment = taskEnvironment(task)
    const inputsSha256 = await hashInputs(repoRoot, task.inputs)
    const toolchainSha256 = sha256([
      process.version,
      packageJson.packageManager ?? '',
      JSON.stringify(task.command),
    ])
    const profileSha256 = sha256([
      JSON.stringify(profiles.profiles[resolved.profile]),
      JSON.stringify(task),
    ])
    const expected = {
      executionMode,
      profile: resolved.profile,
      claimBoundary: resolved.claimBoundary,
      taskId,
      revision,
      workingTreeSha256,
      inputsSha256,
      toolchainSha256,
      environmentSha256: hashEnvironment(environment),
      profileSha256,
      outputs: task.outputs,
      environmentKeys: environment.names,
    }
    const receiptPath = path.join(taskReceiptRoot, `${taskId}.json`)

    if (!options.noCache) {
      const cached = await readReceipt(receiptPath)
      const cachedExpected = { ...expected, outputSha256: await hashTaskOutputs(task.outputs) }
      if (validateReceipt(cached, cachedExpected, outputExists).valid) {
        receipts[taskId] = receiptPath
        return 'cached'
      }
    }

    const startedAt = new Date().toISOString()
    process.stderr.write(`[assurance] start ${taskId}\n`)
    const status = await new Promise((resolve) => {
      const child = spawn(task.command[0], task.command.slice(1), {
        cwd: repoRoot,
        env: buildTaskProcessEnvironment(environment.values, options),
        shell: false,
        stdio: 'inherit',
      })
      children.add(child)
      child.once('error', () => {
        children.delete(child)
        resolve('failed')
      })
      child.once('exit', (code, signal) => {
        children.delete(child)
        if (interruption.active || signal) resolve('interrupted')
        else resolve(code === 0 ? 'passed' : 'failed')
      })
    })
    const outputsPresent = task.outputs.every(outputExists)
    const finalStatus = status === 'passed' && !outputsPresent ? 'failed' : status
    const outputSha256 = await hashTaskOutputs(task.outputs)
    const receipt = {
      schema: 'bootandstrap.assurance-task/v1',
      ...expected,
      outputSha256,
      status: finalStatus,
      startedAt,
      completedAt: new Date().toISOString(),
    }
    await writeJsonAtomic(receiptPath, receipt)
    receipts[taskId] = receiptPath
    process.stderr.write(`[assurance] ${finalStatus} ${taskId}\n`)
    return finalStatus
  }

  await executeTaskGraph(graph, states, configuredWorkers, interruption, runTask)
  finalizeTaskStates(graph, states, interruption)

  const successful = Object.values(states).every((status) => status === 'passed' || status === 'cached')
  const summary = {
    schema: 'bootandstrap.assurance-summary/v1',
    profile: resolved.profile,
    claimBoundary: resolved.claimBoundary,
    executionMode,
    status: interruption.active ? 'interrupted' : successful ? 'passed' : 'failed',
    signal: interruption.signal,
    revision,
    workingTreeSha256,
    tasks: states,
    receipts: Object.fromEntries(Object.entries(receipts).map(([taskId, receiptPath]) => [
      taskId,
      path.relative(repoRoot, receiptPath).split(path.sep).join('/'),
    ])),
    deferred: resolved.deferred.map((taskId) => ({ taskId, status: 'deferred' })),
    changedFiles,
    impactReasons: impact?.reasons ?? [],
    completedAt: new Date().toISOString(),
  }
  await writeJsonAtomic(path.join(artifactRoot, 'summary.json'), summary)
  if (successful && !interruption.active) await snapshotAssuranceProfile({ rootDir: repoRoot })
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  if (!successful || interruption.active) process.exitCode = 1
}

main().catch((error) => {
  process.stderr.write(`[assurance] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
