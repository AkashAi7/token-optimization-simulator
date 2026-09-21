import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { scenarios } from '../src/simulation'

async function command(page: Page, value: string) {
  const input = page.getByRole('textbox', { name: 'Copilot CLI command', exact: true })
  await input.fill(value)
  await input.press('Enter')
}

async function total(page: Page) {
  return Number((await page.getByTestId('aic-total').innerText()).replaceAll(',', ''))
}

test('desktop workspace loads cleanly', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI credit optimization lab.')
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('calculateTotal')
  await expect(page.getByTestId('aic-total')).toHaveText('23.80')
  const brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.complete || !image.naturalWidth).length)
  expect(brokenImages).toBe(0)
  expect(errors).toEqual([])
})

test('cancel preserves a tour and reset clears the demo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Guided tour', exact: true }).click()
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Guided tour', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Guided tour', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Run history', exact: true })).toBeVisible()
  expect(await total(page)).toBe(23.8)
})

test('guided tour produces two frozen comparable runs and a downloadable report', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Guided tour', exact: true }).click()
  const tour = page.getByRole('region', { name: 'Guided tour', exact: true })
  await expect(tour).toContainText('WITHOUT LEVERS')
  await expect(tour).toContainText('23.80 AIC')
  await expect(tour).toContainText('Observe')
  await expect(tour).toContainText('Verify')
  await tour.getByRole('button', { name: 'Run baseline', exact: true }).click()
  await expect(page.locator('.agent-response')).toBeVisible()
  await tour.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(tour).toContainText('WITHOUT THIS LEVER')
  await expect(tour).toContainText('23.80 AIC')
  for (const action of ['Attach task files', 'Trim unrelated tools', 'Start new conversation', 'Use lean instructions', 'Set medium effort', 'Select Auto']) {
    await tour.getByRole('button', { name: action, exact: true }).click()
    await tour.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  expect(await total(page)).toBe(3.61)
  await tour.getByRole('button', { name: 'Run optimized task', exact: true }).click()
  await expect(page.locator('.agent-response')).toBeVisible()
  await tour.getByRole('button', { name: 'Continue', exact: true }).click()
  await tour.getByRole('button', { name: 'Finish tour', exact: true }).click()
  await page.getByRole('button', { name: /Run history/ }).click()
  await expect(page.locator('.run-history tbody tr')).toHaveCount(2)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export run report', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('copilot-ai-credit-lab-report.json')
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(report.runs.map((run: { result: { total: number } }) => run.result.total)).toEqual([59925, 6779])
  expect(report.runs[1].aiCreditReductionPercent).toBe(85)
  expect(report.assumptions.outcome).toContain('does not demonstrate real model quality equivalence')
})

for (const scenario of scenarios) {
  test(`reference patch and checks: ${scenario.id}`, async ({ page }) => {
    await page.goto(`/?scenario=${scenario.id}`)
    await page.getByRole('button', { name: 'Send prompt', exact: true }).click()
    await expect(page.locator('.agent-response')).toContainText(scenario.diagnosis)
    await page.getByRole('button', { name: 'Apply reference patch', exact: true }).click()
    await page.getByRole('button', { name: 'Run reference checks', exact: true }).click()
    await expect(page.locator('.fixture-output')).toContainText('REFERENCE CHECKS PASSED')
    await expect(page.locator('.fixture-output')).toContainText(scenario.testResult)
  })
}

test('Auto and cache reduce modeled AI credits', async ({ page }) => {
  await page.goto('/')
  const baselineTotal = await total(page)
  const initialCost = await page.locator('.cost-index strong').innerText()
  await page.getByRole('switch', { name: 'Let Auto route' }).check()
  expect(await total(page)).toBeLessThan(baselineTotal)
  await expect(page.locator('.cost-index strong')).not.toHaveText(initialCost)
  await page.getByRole('switch', { name: 'Keep instructions lean' }).check()
  const leanTotal = await total(page)
  const cacheCost = await page.locator('.cost-index strong').innerText()
  await page.getByRole('checkbox', { name: /warm instruction cache/ }).check()
  expect(await total(page)).toBeLessThan(leanTotal)
  await expect(page.locator('.cost-index strong')).not.toHaveText(cacheCost)
})

test('CLI commands control shared levers, keep history, and reject shell execution', async ({ page }) => {
  await page.goto('/?surface=cli')
  const transcript = page.locator('pre[aria-label="Terminal transcript"]')
  await command(page, '/context')
  await expect(transcript).toContainText('55,075')
  await command(page, '/compact')
  const compactTotal = await total(page)
  await command(page, '/clear')
  expect(compactTotal - await total(page)).toBeCloseTo(0.36, 2)
  await command(page, '/mcp disable enterprise-integrations')
  await expect(page.getByRole('switch', { name: 'Trim enabled tools' })).toBeChecked()
  const beforeAuto = await total(page)
  await command(page, '/model auto')
  expect(await total(page)).toBeLessThan(beforeAuto)
  await command(page, '/model')
  await page.getByRole('combobox', { name: 'CLI reasoning effort', exact: true }).selectOption('medium')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await command(page, '/instructions')
  await page.getByRole('checkbox', { name: 'Use short, stable project instructions', exact: true }).check()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await command(page, '@src/cart.ts @src/cart.test.ts Fix the discount regression.')
  await expect(page.getByRole('button', { name: 'Apply reference patch', exact: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Focus the context' })).toBeChecked()
  await command(page, '/usage')
  await expect(transcript).toContainText('Completed demo runs: 1')
  const input = page.getByRole('textbox', { name: 'Copilot CLI command', exact: true })
  await input.press('ArrowUp')
  await expect(input).toHaveValue('/usage')
  await command(page, '!echo should-not-execute')
  await expect(transcript).toContainText('Shell execution is disabled')
  await command(page, '/unsupported')
  await expect(transcript).toContainText('outside the simulation')
  await page.getByRole('button', { name: 'VS Code', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Chat model', exact: true })).toHaveValue('auto')
})

test('HydraFusion CLI fixture orchestrates and records an optimized workflow', async ({ page }) => {
  await page.goto('/?surface=cli')
  const transcript = page.locator('pre[aria-label="Terminal transcript"]')
  await command(page, '/hydrafusion status')
  await expect(transcript).toContainText('No completed HydraFusion workflow')
  await command(page, '/hydrafusion run')
  await expect(transcript).toContainText('01 coordinator')
  await expect(transcript).toContainText('04 verifier')
  await expect(transcript).toContainText('HydraFusion workflow result [simulated]')
  await expect(page.getByRole('switch', { name: 'Let Auto route' })).toBeChecked()
  await command(page, '/hydrafusion status')
  await expect(transcript).toContainText('Latest HydraFusion workflow: completed')
  await expect(transcript).toContainText('Result: 3.61 AIC')
  await page.getByRole('button', { name: /Run history/ }).click()
  await expect(page.locator('.run-history tbody tr')).toHaveCount(1)
  await expect(page.locator('.run-history tbody tr')).toContainText('CLI')
})

test('CLI guided tour includes HydraFusion as a required task', async ({ page }) => {
  await page.goto('/?surface=cli')
  await page.getByRole('button', { name: 'Guided tour', exact: true }).click()
  const tour = page.getByRole('region', { name: 'Guided tour', exact: true })
  await tour.getByRole('button', { name: 'Run baseline', exact: true }).click()
  await tour.getByRole('button', { name: 'Continue', exact: true }).click()
  for (const action of ['Attach task files', 'Trim unrelated tools', 'Start new conversation', 'Use lean instructions', 'Set medium effort', 'Select Auto']) {
    await tour.getByRole('button', { name: action, exact: true }).click()
    await tour.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await expect(tour).toContainText('Orchestrate the task with HydraFusion.')
  await tour.getByRole('button', { name: 'Run HydraFusion', exact: true }).click()
  await expect(page.locator('pre[aria-label="Terminal transcript"]')).toContainText('HydraFusion workflow result [simulated]')
  await expect(tour.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
})

test('share links exclude custom content and restore the configured scenario', async ({ page }) => {
  await page.goto('/?scenario=retry&surface=cli&levers=scope,history,instructions,auto&cache=warm&session=compact')
  const configuredTotal = await total(page)
  await page.getByRole('button', { name: 'Share configuration', exact: true }).click()
  const link = await page.getByRole('textbox', { name: 'Configuration URL', exact: true }).inputValue()
  expect(new URL(link).searchParams.get('scenario')).toBe('retry')
  expect(new URL(link).searchParams.get('session')).toBe('compact')
  expect(new URL(link).searchParams.has('prompt')).toBe(false)
  await page.goto(link)
  expect(await total(page)).toBe(configuredTotal)
  await expect(page.getByRole('button', { name: 'Copilot CLI', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('code edits stay local and scenario switch clears stale output', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('.monaco-editor .view-lines')
  await expect(editor).toContainText('calculateTotal')
  await editor.click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.insertText('const localValue = 1;\n')
  await page.getByRole('button', { name: 'Run reference checks', exact: true }).click()
  await expect(page.locator('.fixture-output')).toContainText('CUSTOM EDIT DETECTED')
  await page.getByRole('combobox', { name: 'YOUR SCENARIO', exact: true }).selectOption('retry')
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('maxAttempts')
  await page.getByRole('button', { name: 'OUTPUT', exact: true }).click()
  await expect(page.locator('.fixture-output')).toHaveText('Reference checks have not been run.')
})

test('dialogs keep keyboard focus and Escape restores the opener', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'Open field guide', exact: true })
  await opener.click()
  await expect(page.getByRole('dialog')).toContainText('/model auto')
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(await page.getByRole('dialog').evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  await page.keyboard.press('Control+k')
  await page.getByRole('textbox', { name: 'Search files and commands', exact: true }).fill('cart.test')
  await page.getByRole('button', { name: 'src/cart.test.ts Enter', exact: true }).click()
  await expect(page.locator('.editor-tabbar')).toContainText('cart.test.ts')
})

for (const width of [320, 768, 1024, 1440]) {
  test(`accessible workspaces at ${width}px without document overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.getByTestId('aic-total')).toBeVisible()
    for (const surface of ['VS Code', 'Copilot CLI']) {
      await page.getByRole('button', { name: surface, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (surface === 'Copilot CLI') {
        await expect.poll(() => page.locator('.terminal-output').evaluate((host) => {
          const bounds = host.getBoundingClientRect()
          const screen = host.querySelector('.xterm-screen')?.getBoundingClientRect()
          return !!screen && screen.right <= bounds.right && screen.bottom <= bounds.bottom
        })).toBe(true)
      }
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`${surface === 'VS Code' ? 'vscode' : 'cli'}-${width}.png`), fullPage: true })
    }
  })
}