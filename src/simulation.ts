export type Surface = 'vscode' | 'cli'
export type LeverId = 'scope' | 'tools' | 'history' | 'instructions' | 'reasoning' | 'auto'
export type Levers = Record<LeverId, boolean>
export type SessionMode = 'clear' | 'compact'

export const emptyLevers = (): Levers => ({ scope: false, tools: false, history: false, instructions: false, reasoning: false, auto: false })
export const allLevers = (): Levers => ({ scope: true, tools: true, history: true, instructions: true, reasoning: true, auto: true })

export const leverDefinitions: { id: LeverId; title: string; detail: string; target: string }[] = [
  { id: 'scope', title: 'Focus the context', detail: 'Attach the relevant file, not the entire repository.', target: 'Retrieved context' },
  { id: 'tools', title: 'Trim enabled tools', detail: 'Keep file editing and tests. Disable unrelated MCP tools.', target: 'Tool schemas' },
  { id: 'history', title: 'Refresh the session', detail: 'Start a new task in a clean chat, or compact ongoing work.', target: 'Conversation history' },
  { id: 'instructions', title: 'Keep instructions lean', detail: 'Use a short, stable project prefix. Cache reuse is conditional.', target: 'Instructions + cache' },
  { id: 'reasoning', title: 'Right-size reasoning', detail: 'Reserve high effort for tasks that genuinely need it.', target: 'Reasoning output' },
  { id: 'auto', title: 'Let Auto route', detail: 'Model routing can change AIC use without changing raw token count.', target: 'Modeled AIC rate' },
]

export interface Scenario {
  id: string
  title: string
  category: string
  description: string
  repo: string
  file: string
  testFile: string
  language: string
  prompt: string
  focusedPrompt: string
  code: string
  fixedCode: string
  testCode: string
  diagnosis: string
  testResult: string
  retrieved: number
  focused: number
}

export const scenarios: Scenario[] = [
  {
    id: 'checkout', title: 'Fix a checkout regression', category: 'DEBUGGING',
    description: 'A customer with a $100 basket is charged $120 after applying a 20% discount. Find and fix the regression without changing the public API.',
    repo: 'northstar-commerce', file: 'src/cart.ts', testFile: 'src/cart.test.ts', language: 'TypeScript',
    prompt: 'The checkout total is wrong when a discount is applied. Find the bug and fix it. Check the codebase.',
    focusedPrompt: 'Fix the discount calculation in #file:src/cart.ts. The failing assertion in #file:src/cart.test.ts expects 80, received 120. Keep the public API unchanged.',
    code: 'export interface CartItem {\n  id: string;\n  price: number;\n  quantity: number;\n}\n\nexport function calculateTotal(\n  items: CartItem[],\n  discountPercent: number = 0,\n): number {\n  const subtotal = items.reduce(\n    (total, item) =>\n      total + item.price * item.quantity,\n    0,\n  );\n\n  const discount =\n    subtotal * (discountPercent / 100);\n\n  return subtotal + discount;\n}\n',
    fixedCode: 'export interface CartItem {\n  id: string;\n  price: number;\n  quantity: number;\n}\n\nexport function calculateTotal(\n  items: CartItem[],\n  discountPercent: number = 0,\n): number {\n  const subtotal = items.reduce(\n    (total, item) =>\n      total + item.price * item.quantity,\n    0,\n  );\n\n  const discount =\n    subtotal * (discountPercent / 100);\n\n  return subtotal - discount;\n}\n',
    testCode: "import { expect, test } from 'vitest';\nimport { calculateTotal } from './cart';\n\ntest('applies a 20% discount', () => {\n  const items = [\n    { id: 'sku-01', price: 100, quantity: 1 },\n  ];\n\n  expect(calculateTotal(items, 20))\n    .toBe(80);\n});\n\ntest('preserves the undiscounted price', () => {\n  expect(calculateTotal([\n    { id: 'sku-01', price: 100, quantity: 1 },\n  ])).toBe(100);\n});\n",
    diagnosis: 'The discount is added to the subtotal instead of subtracted. Replace + with - in calculateTotal. The public API stays unchanged.',
    testResult: '2 assertions passed: discounted total = 80; undiscounted total = 100.', retrieved: 24800, focused: 1800,
  },
  {
    id: 'retry', title: 'Fix an API retry boundary', category: 'BACKEND',
    description: 'The inventory client makes four requests when the configured maximum is three. Fix the retry boundary while preserving the error behavior.',
    repo: 'northstar-inventory', file: 'src/retry.ts', testFile: 'src/retry.test.ts', language: 'TypeScript',
    prompt: 'Our inventory API sends too many retry requests. Investigate the project and fix the client.',
    focusedPrompt: 'Fix the off-by-one error in #file:src/retry.ts. #file:src/retry.test.ts expects 3 calls, received 4. Preserve the final error.',
    code: 'export async function retry<T>(\n  operation: () => Promise<T>,\n  maxAttempts: number = 3,\n): Promise<T> {\n  let lastError: unknown;\n\n  for (let attempt = 0;\n    attempt <= maxAttempts;\n    attempt++) {\n    try {\n      return await operation();\n    } catch (error) {\n      lastError = error;\n    }\n  }\n\n  throw lastError;\n}\n',
    fixedCode: 'export async function retry<T>(\n  operation: () => Promise<T>,\n  maxAttempts: number = 3,\n): Promise<T> {\n  let lastError: unknown;\n\n  for (let attempt = 0;\n    attempt < maxAttempts;\n    attempt++) {\n    try {\n      return await operation();\n    } catch (error) {\n      lastError = error;\n    }\n  }\n\n  throw lastError;\n}\n',
    testCode: "import { expect, test, vi } from 'vitest';\nimport { retry } from './retry';\n\ntest('honors the attempt limit', async () => {\n  const error = new Error('unavailable');\n  const request = vi.fn().mockRejectedValue(error);\n\n  await expect(retry(request, 3))\n    .rejects.toBe(error);\n  expect(request).toHaveBeenCalledTimes(3);\n});\n",
    diagnosis: 'The inclusive loop boundary allows attempts 0, 1, 2, and 3. Change <= to < so three attempts are made and the last error is preserved.',
    testResult: '2 assertions passed: exactly 3 calls; original final error preserved.', retrieved: 31200, focused: 2200,
  },
  {
    id: 'tests', title: 'Cover a shipping edge case', category: 'TEST COVERAGE',
    description: 'Orders of exactly $50 should qualify for free shipping, but they do not. Pinpoint the boundary and add regression coverage.',
    repo: 'northstar-fulfillment', file: 'src/shipping.ts', testFile: 'src/shipping.test.ts', language: 'TypeScript',
    prompt: 'Find missing shipping test coverage across the repository and fix any issues you discover.',
    focusedPrompt: 'Fix #file:src/shipping.ts and cover the $50 boundary in #file:src/shipping.test.ts. Free shipping starts at $50 inclusive.',
    code: 'export function shippingCost(\n  orderTotal: number,\n): number {\n  const freeShippingThreshold = 50;\n  const standardShipping = 5.99;\n\n  if (orderTotal > freeShippingThreshold) {\n    return 0;\n  }\n\n  return standardShipping;\n}\n',
    fixedCode: 'export function shippingCost(\n  orderTotal: number,\n): number {\n  const freeShippingThreshold = 50;\n  const standardShipping = 5.99;\n\n  if (orderTotal >= freeShippingThreshold) {\n    return 0;\n  }\n\n  return standardShipping;\n}\n',
    testCode: "import { expect, test } from 'vitest';\nimport { shippingCost } from './shipping';\n\ntest('charges below the threshold', () => {\n  expect(shippingCost(49.99)).toBe(5.99);\n});\n\ntest('ships free at the threshold', () => {\n  expect(shippingCost(50)).toBe(0);\n});\n\ntest('ships free above the threshold', () => {\n  expect(shippingCost(50.01)).toBe(0);\n});\n",
    diagnosis: 'The free-shipping threshold is exclusive. Change > to >= and verify totals just below, at, and above $50.',
    testResult: '3 assertions passed: 49.99 -> 5.99; 50 -> 0; 50.01 -> 0.', retrieved: 19600, focused: 1400,
  },
]

export const leanInstructions = '# Northstar\n\nStack: TypeScript, Node.js, Vitest.\nKeep public APIs unchanged.\nScope reads to the failing function and its tests.\nRun the relevant test after every fix.\nReturn the diagnosis and a minimal patch.\n'
export const fullInstructions = '# Northstar engineering handbook\n\nThis repository contains commerce, inventory, fulfillment, analytics,\nmarketing, billing, and internal administration services.\n\n## Organization standards\nApply the complete engineering handbook to every change.\nReview architecture across all packages before making edits.\nInclude extensive background, design alternatives, and implementation details.\n\n## Historical decisions\nRead all previous migration notes and release conventions.\nInclude context from the legacy storefront and infrastructure projects.\n\n[Demo fixture: 3,200 instruction tokens across loaded instruction files]\n'

export interface SimulationResult {
  input: number
  output: number
  total: number
  aiCredits: number
  cached: number
  breakdown: { key: string; label: string; tokens: number }[]
  trace: string[]
}

export function simulate(scenario: Scenario, levers: Levers, options: { warmCache?: boolean; sessionMode?: SessionMode; prompt?: string } = {}): SimulationResult {
  const breakdown = [
    { key: 'system', label: 'System', tokens: 1850 },
    { key: 'instructions', label: 'Instructions', tokens: levers.instructions ? 480 : 3200 },
    { key: 'tools', label: 'Tools', tokens: levers.tools ? 960 : 6800 },
    { key: 'history', label: 'History', tokens: levers.history ? (options.sessionMode === 'compact' ? 1200 : 0) : 18400 },
    { key: 'context', label: 'Files', tokens: levers.scope ? scenario.focused : scenario.retrieved },
    { key: 'prompt', label: 'Your prompt', tokens: Math.max(1, Math.ceil((options.prompt ?? scenario.prompt).length / 4)) },
  ]
  const input = breakdown.reduce((sum, segment) => sum + segment.tokens, 0)
  const output = (levers.reasoning ? 1000 : 4200) + 650
  const cached = levers.instructions && options.warmCache ? 480 : 0
  const aiCredits = (((input - cached) * 3) + (cached * 0.3) + (output * 15)) / 10_000 * (levers.auto ? 0.9 : 1)
  return {
    input, output, total: input + output, aiCredits, cached, breakdown,
    trace: [
      levers.history ? (options.sessionMode === 'compact' ? 'Loaded a compact summary of the current task' : 'Started a clean task session') : 'Loaded 24 turns from previous tasks',
      levers.tools ? 'Loaded 3 task-relevant tool schemas' : 'Loaded 28 tool schemas, including unrelated MCP servers',
      levers.scope ? `Read ${scenario.file} and ${scenario.testFile}` : 'Searched the repository and retrieved adjacent packages',
      levers.instructions ? 'Applied the short project instruction prefix' : 'Applied the full engineering instruction set',
      levers.reasoning ? 'Used medium reasoning for a bounded fix' : 'Used high reasoning and explored alternatives',
      'Prepared the same reference patch and regression checks',
    ],
  }
}

export const savings = (before: number, after: number) => before > 0 ? Math.round((1 - after / before) * 100) : 0
export const formatTokens = (value: number) => value.toLocaleString('en-US')
export const formatAIC = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function parseCommand(input: string): { kind: 'command'; command: string; argument: string } | { kind: 'prompt'; text: string } {
  const text = input.trim()
  if (!text.startsWith('/')) return { kind: 'prompt', text }
  const [command, ...args] = text.split(/\s+/)
  return { kind: 'command', command: command.toLowerCase(), argument: args.join(' ').toLowerCase() }
}