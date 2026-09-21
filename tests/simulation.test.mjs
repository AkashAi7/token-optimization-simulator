import test from 'node:test'
import assert from 'node:assert/strict'
import { simulate, scenarios, emptyLevers, allLevers, savings, parseCommand } from '../src/simulation.ts'

test('all fixtures reconcile and focused levers reduce the modeled packet', () => {
  for (const scenario of scenarios) {
    const baseline = simulate(scenario, emptyLevers())
    const optimized = simulate(scenario, allLevers())
    assert.equal(baseline.input, baseline.breakdown.reduce((sum, item) => sum + item.tokens, 0))
    assert.equal(optimized.total, optimized.input + optimized.output)
    assert.ok(savings(baseline.total, optimized.total) > 60)
    assert.ok(optimized.total > 0)
    assert.equal(baseline.trace.at(-1), optimized.trace.at(-1))
  }
})

test('AI credits use Claude Sonnet 4.6 rates and Auto affects the estimate', () => {
  const baseline = simulate(scenarios[0], emptyLevers())
  const auto = simulate(scenarios[0], { ...emptyLevers(), auto: true })
  assert.equal(auto.total, baseline.total)
  assert.equal(baseline.aiCredits, ((baseline.input * 3) + (baseline.output * 15)) / 10_000)
  assert.equal(auto.aiCredits, baseline.aiCredits * 0.9)
})

test('cache reuse discounts cost without removing raw input tokens', () => {
  const levers = { ...emptyLevers(), instructions: true }
  const cold = simulate(scenarios[0], levers)
  const warm = simulate(scenarios[0], levers, { warmCache: true })
  assert.equal(cold.cached, 0)
  assert.equal(warm.cached, 480)
  assert.equal(warm.total, cold.total)
  assert.ok(warm.aiCredits < cold.aiCredits)
  assert.equal(simulate(scenarios[0], emptyLevers(), { warmCache: true }).cached, 0)
})

test('compaction retains a summary; clear removes conversation history', () => {
  const levers = { ...emptyLevers(), history: true }
  const compact = simulate(scenarios[0], levers, { sessionMode: 'compact' })
  const clear = simulate(scenarios[0], levers, { sessionMode: 'clear' })
  assert.equal(compact.input - clear.input, 1200)
})

test('each non-Auto lever changes its own modeled token category', () => {
  const baseline = simulate(scenarios[0], emptyLevers())
  for (const lever of ['scope', 'tools', 'history', 'instructions', 'reasoning']) {
    const result = simulate(scenarios[0], { ...emptyLevers(), [lever]: true })
    assert.ok(result.total < baseline.total, lever)
  }
})

test('prompt length is included and all 64 combinations stay finite', () => {
  for (let mask = 0; mask < 64; mask++) {
    const levers = Object.fromEntries(Object.keys(emptyLevers()).map((key, index) => [key, Boolean(mask & (1 << index))]))
    const result = simulate(scenarios[0], levers, { prompt: 'A longer customer prompt', warmCache: true })
    assert.ok(Number.isFinite(result.aiCredits) && result.aiCredits > 0)
    assert.equal(result.breakdown.at(-1).tokens, 6)
  }
  assert.equal(savings(0, 0), 0)
})

test('CLI parser separates slash commands from untrusted prompt text', () => {
  assert.deepEqual(parseCommand(' /model Auto '), { kind: 'command', command: '/model', argument: 'auto' })
  assert.deepEqual(parseCommand('Fix @src/cart.ts'), { kind: 'prompt', text: 'Fix @src/cart.ts' })
  assert.deepEqual(parseCommand('rm -rf /'), { kind: 'prompt', text: 'rm -rf /' })
})