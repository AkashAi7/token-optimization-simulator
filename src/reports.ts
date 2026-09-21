import { leverDefinitions, savings } from './simulation'
import type { Lab } from './useLab'

export const assumptions = {
  classification: 'Deterministic educational fixture. Not measured telemetry, a benchmark, or a billing quote.',
  tokenCounting: 'Fixed category budgets; user prompt estimated as ceil(characters / 4). Tokens remain an internal input to the AIC estimate; no model-specific tokenizer is used.',
  aiCredits: 'Claude Sonnet 4.6 rates: $3/M input, $0.30/M cached input, and $15/M output. USD is converted at $0.01 per AI credit. Auto uses an illustrative 10% lower blended rate; the actual routed model and price can vary.',
  cache: 'Warm cache is an explicit assumption for 480 shortened instruction tokens. Real eligibility, prefix matching, thresholds, TTLs and discounts vary.',
  tools: 'The fixture assumes 28 eagerly loaded schemas. Deferred tool loading can reduce or eliminate the modeled savings.',
  history: 'Baseline: 24 previous turns / 18,400 tokens. New chat: 0. Compact summary: 1,200. Compaction-generation overhead is excluded.',
  output: '650 answer tokens plus 4,200 high-effort or 1,000 medium-effort tokens. These are illustrative, not exposed model reasoning.',
  outcome: 'Both approaches return the same supplied reference patch by design. This does not demonstrate real model quality equivalence.',
  exclusions: 'No real API calls, shell execution, billing, latency prediction, organization policy enforcement, or arbitrary-code test execution.',
}

export function configurationLink(lab: Lab) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('scenario', lab.scenario.id)
  url.searchParams.set('surface', lab.surface)
  url.searchParams.set('levers', (Object.keys(lab.levers) as (keyof typeof lab.levers)[]).filter((key) => lab.levers[key]).join(','))
  if (lab.warmCache) url.searchParams.set('cache', 'warm')
  if (lab.sessionMode === 'compact') url.searchParams.set('session', 'compact')
  return url.toString()
}

export function exportReport(lab: Lab) {
  const report = {
    title: 'Copilot AI Credit Lab - Simulation Report', schemaVersion: 2, generatedAt: new Date().toISOString(),
    assumptions, guide: 'https://aka.ms/ghcp-tkn-opt',
    runs: lab.runs.map((run) => ({ ...run, aiCreditReductionPercent: savings(run.baseline.aiCredits, run.result.aiCredits),
      estimatedUsd: run.result.aiCredits * 0.01,
      activeLevers: leverDefinitions.filter((lever) => run.levers[lever.id]).map((lever) => lever.title) })),
  }
  downloadText(JSON.stringify(report, null, 2), 'copilot-ai-credit-lab-report.json', 'application/json')
}

export function downloadText(content: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}