import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export function sha256(parts) {
  const hash = createHash('sha256')
  for (const part of parts) hash.update(part)
  return hash.digest('hex')
}

export function runGit(repoRoot, args) {
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

export async function hashWorkingTree(repoRoot) {
  const status = runGit(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const diff = runGit(repoRoot, ['diff', '--binary', 'HEAD'])
  const untrackedOutput = runGit(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z'])
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
  if (stats.isDirectory()) throw new Error(`input file unexpectedly became a directory: ${relativePath}`)
  if (stats.isFile()) {
    parts.push(`file:${relativePath}`)
    parts.push(await fs.readFile(absolutePath))
  }
}

export async function hashInputs(repoRoot, inputs) {
  const parts = []
  const directories = []
  for (const relativePath of [...inputs].sort()) {
    const absolutePath = path.join(repoRoot, relativePath)
    let stats
    try {
      stats = await fs.lstat(absolutePath)
    } catch (error) {
      if (error?.code === 'ENOENT') {
        parts.push(`missing:${relativePath}`)
        continue
      }
      throw error
    }

    if (stats.isDirectory()) {
      parts.push(`directory:${relativePath}`)
      directories.push(relativePath)
    } else {
      await collectInputParts(absolutePath, relativePath, parts)
    }
  }

  if (directories.length > 0) {
    const listed = runGit(repoRoot, [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      ...directories,
    ]).toString('utf8').split('\0').filter(Boolean).sort()
    for (const relativePath of listed) {
      await collectInputParts(path.join(repoRoot, relativePath), relativePath, parts)
    }
  }
  return sha256(parts)
}

export async function resolveTaskIdentity(repoRoot, task) {
  return {
    revision: runGit(repoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim(),
    workingTreeSha256: await hashWorkingTree(repoRoot),
    inputsSha256: await hashInputs(repoRoot, task.inputs),
  }
}
