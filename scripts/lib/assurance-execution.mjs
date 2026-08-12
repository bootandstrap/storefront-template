export const ASSURANCE_EXECUTION_MODES = Object.freeze({
  forced: 'forced_no_cache',
  reusable: 'receipt_reuse_allowed',
})

export function assuranceExecutionMode({ noCache }) {
  return noCache ? ASSURANCE_EXECUTION_MODES.forced : ASSURANCE_EXECUTION_MODES.reusable
}

export function buildTaskProcessEnvironment(declaredEnvironment, { noCache }) {
  const environment = { ...declaredEnvironment }
  if (noCache) environment.TURBO_FORCE = 'true'
  return environment
}
