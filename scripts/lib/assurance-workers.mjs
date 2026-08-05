export function resolveAssuranceWorkerCount(value) {
  const workers = Number.parseInt(value ?? '2', 10)
  if (!Number.isInteger(workers) || workers <= 0 || String(workers) !== (value ?? '2')) {
    throw new Error('BNS_ASSURANCE_WORKERS must be a positive integer')
  }
  return workers
}
