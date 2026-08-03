#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
import { resolveProfile } from './lib/assurance-profile.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const artifactRoot = path.join(repoRoot, '.artifacts', 'assurance')
const taskReceiptRoot = path.join(artifactRoot, 'tasks')
const ignoredInputDirectories = new Set(['.artifacts', '.git', '.next', 'coverage', 'node_modules'])
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

function parseArguments(argv) {
  const options = { profile: undefined, dryRun: false, noCache: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--') continue
    if (argument === '--profile') {
      options.profile = argv[index + 1]
      index += 1
    } else if (argument === '--dry-run') {
      options.dryRun = true
    } else if (argument === '--no-cache') {
      options.noCache = true
    } else {
      throw new Error(`unknown argument: ${argument}`)
    }
  }
  if (!options.profile) throw new Error('--profile is required')
  return options
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function sha256(parts) {
  const hash = createHash('sha256')
  for (const part of parts) hash.update(part)
  return hash.digest('hex')
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: null,
    shell: false,
  })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed with exit ${result.status}`)
  }
  return result.stdout
}

async function hashWorkingTree() {
  const status = runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const diff = runGit(['diff', '--binary', 'HEAD'])
  const untrackedOutput = runGit(['ls-files', '--others', '--exclude-standard', '-z'])
  const untracked = untrackedOutput.toString('utf8').split('\0').filter(Boolean).sort()
  const parts = [status, diff]
  for (const relativePath of untracked) {
    parts.push(relativePath)
    const absolutePath = path.join(repoRoot, relativePath)
    const stats = await fs.lstat(absolutePath)
    parts.push(stats.isSymbolicLink() ? await fs.readlink(absolutePath) : await fs.readFile(absolutePath))
  }
  return sha256(parts)
}

async function collectInputParts(absolutePath, relativePath, parts) {
  let stats
  try {
    stats = await fs.lstat(absolutePath)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      parts.push(`missing:${relativePath}`)
      return
    }
    throw error
  }

  if (stats.isSymbolicLink()) {
    parts.push(`link:${relativePath}:${await fs.readlink(absolutePath)}`)
    return
  }
  if (stats.isDirectory()) {
    parts.push(`directory:${relativePath}`)
    const entries = await fs.readdir(absolutePath, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isDirectory() && ignoredInputDirectories.has(entry.name)) continue
      await collectInputParts(
        path.join(absolutePath, entry.name),
        path.posix.join(relativePath, entry.name),
        parts,
      )
    }
    return
  }
  if (stats.isFile()) {
    parts.push(`file:${relativePath}`)
    parts.push(await fs.readFile(absolutePath))
  }
}

async function hashInputs(inputs) {
  const parts = []
  for (const relativePath of [...inputs].sort()) {
    await collectInputParts(path.join(repoRoot, relativePath), relativePath, parts)
  }
  return sha256(parts)
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

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const profiles = await readJson(path.join(scriptDir, 'assurance-profiles.json'))
  const taskConfig = await readJson(path.join(scriptDir, 'assurance-tasks.json'))
  const resolved = resolveProfile(profiles, options.profile, [])
  const graph = buildTaskGraph(taskConfig, resolved.tasks)

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify({
      schema: 'bootandstrap.assurance-plan/v1',
      dryRun: true,
      status: 'planned',
      profile: resolved.profile,
      claimBoundary: resolved.claimBoundary,
      tasks: graph.ids,
      batches: topologicalBatches(graph),
      deferred: resolved.deferred.map((taskId) => ({ taskId, status: 'deferred' })),
    })}\n`)
    return
  }

  const configuredWorkers = Number.parseInt(process.env.BNS_ASSURANCE_WORKERS ?? '4', 10)
  if (!Number.isInteger(configuredWorkers) || configuredWorkers <= 0) {
    throw new Error('BNS_ASSURANCE_WORKERS must be a positive integer')
  }

  const revision = runGit(['rev-parse', 'HEAD']).toString('utf8').trim()
  const workingTreeSha256 = await hashWorkingTree()
  const packageJson = await readJson(path.join(repoRoot, 'package.json'))
  const states = {}
  const receipts = {}
  const children = new Set()
  let interrupted = false
  let receivedSignal = null

  const stopChildren = (signal) => {
    interrupted = true
    receivedSignal = signal
    for (const child of children) child.kill('SIGTERM')
  }
  process.once('SIGINT', () => stopChildren('SIGINT'))
  process.once('SIGTERM', () => stopChildren('SIGTERM'))

  async function runTask(taskId) {
    const task = graph.tasks.get(taskId)
    const environment = taskEnvironment(task)
    const inputsSha256 = await hashInputs(task.inputs)
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
      profile: resolved.profile,
      claimBoundary: resolved.claimBoundary,
      taskId,
      revision,
      workingTreeSha256,
      inputsSha256,
      toolchainSha256,
      profileSha256,
      outputs: task.outputs,
      environmentKeys: environment.names,
    }
    const receiptPath = path.join(taskReceiptRoot, `${taskId}.json`)

    if (!options.noCache) {
      const cached = await readReceipt(receiptPath)
      if (validateReceipt(cached, expected, outputExists).valid) {
        receipts[taskId] = receiptPath
        return 'cached'
      }
    }

    const startedAt = new Date().toISOString()
    process.stderr.write(`[assurance] start ${taskId}\n`)
    const status = await new Promise((resolve) => {
      const child = spawn(task.command[0], task.command.slice(1), {
        cwd: repoRoot,
        env: environment.values,
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
        if (interrupted || signal) resolve('interrupted')
        else resolve(code === 0 ? 'passed' : 'failed')
      })
    })
    const outputsPresent = task.outputs.every(outputExists)
    const finalStatus = status === 'passed' && !outputsPresent ? 'failed' : status
    const receipt = {
      schema: 'bootandstrap.assurance-task/v1',
      ...expected,
      status: finalStatus,
      startedAt,
      completedAt: new Date().toISOString(),
    }
    await writeJsonAtomic(receiptPath, receipt)
    receipts[taskId] = receiptPath
    process.stderr.write(`[assurance] ${finalStatus} ${taskId}\n`)
    return finalStatus
  }

  while (Object.keys(states).length < graph.ids.length) {
    if (interrupted) {
      for (const taskId of graph.ids) {
        if (states[taskId] === undefined) states[taskId] = 'interrupted'
      }
      break
    }

    Object.assign(states, propagateDependencyFailures(graph, states))
    const ready = nextReadyBatch(graph, states, configuredWorkers)
    if (ready.length === 0) break
    const results = await Promise.all(ready.map(async (taskId) => [taskId, await runTask(taskId)]))
    for (const [taskId, status] of results) states[taskId] = status
  }

  Object.assign(states, propagateDependencyFailures(graph, states))
  for (const taskId of graph.ids) {
    if (states[taskId] === undefined) states[taskId] = interrupted ? 'interrupted' : 'blocked'
  }

  const successful = Object.values(states).every((status) => status === 'passed' || status === 'cached')
  const summary = {
    schema: 'bootandstrap.assurance-summary/v1',
    profile: resolved.profile,
    claimBoundary: resolved.claimBoundary,
    status: interrupted ? 'interrupted' : successful ? 'passed' : 'failed',
    signal: receivedSignal,
    revision,
    workingTreeSha256,
    tasks: states,
    receipts: Object.fromEntries(Object.entries(receipts).map(([taskId, receiptPath]) => [
      taskId,
      path.relative(repoRoot, receiptPath).split(path.sep).join('/'),
    ])),
    deferred: resolved.deferred.map((taskId) => ({ taskId, status: 'deferred' })),
    completedAt: new Date().toISOString(),
  }
  await writeJsonAtomic(path.join(artifactRoot, 'summary.json'), summary)
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  if (!successful || interrupted) process.exitCode = 1
}

main().catch((error) => {
  process.stderr.write(`[assurance] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
