import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, GraduationCap, MousePointerClick, X } from 'lucide-react'
import { allLevers, emptyLevers, formatAIC, simulate } from '../simulation'
import type { LeverId } from '../simulation'
import type { Lab } from '../useLab'

type TourStep = {
  title: string
  body: string
  observe: string
  verify: string
  target: string
  action: string
  run: () => void
  ready: boolean
  lever?: LeverId
}

export function Tour({ lab, step, setStep, onClose }: { lab: Lab; step: number; setStep: (step: number) => void; onClose: () => void }) {
  const optimizationSteps: TourStep[] = [
    { title: 'First, establish the baseline.', body: 'Send the task with all levers off. A short question can still carry a large packet of files, tools, and old conversations.', observe: 'Confirm all six switches are off and the inspector shows the broad request.', verify: 'A baseline run is saved for the final comparison.', target: 'run', action: 'Run baseline', run: () => lab.run({ levers: emptyLevers(), prompt: lab.scenario.prompt }), ready: lab.runs.some((run) => !Object.values(run.levers).some(Boolean)) },
    { title: 'Attach the smallest useful context.', body: lab.surface === 'cli' ? `Reference @${lab.scenario.file} and the failing test instead of asking for a repository-wide investigation.` : 'Attach only the source and failing test instead of searching the whole repository.', observe: 'Without this lever, Copilot retrieves neighboring packages and unrelated files.', verify: 'The Files category falls while the failing source and test remain attached.', lever: 'scope' as LeverId, target: 'lever-scope', action: 'Attach task files', run: () => lab.setLever('scope', true), ready: lab.levers.scope },
    { title: 'Keep only the tools this task needs.', body: lab.surface === 'cli' ? 'Run /mcp disable enterprise-integrations. The local file and test tools remain.' : 'Disable unrelated enterprise integrations while retaining the three core tools.', observe: 'Without this lever, schemas for all 28 available tools enter the request.', verify: 'Only 3 task-relevant tool schemas remain available.', lever: 'tools' as LeverId, target: 'lever-tools', action: 'Trim unrelated tools', run: () => lab.setLever('tools', true), ready: lab.levers.tools },
    { title: 'Give a new task a fresh conversation.', body: lab.surface === 'cli' ? 'Use /clear for a new task, or /compact to keep a summary of ongoing work.' : 'Select the + icon in Copilot Chat to start a clean conversation.', observe: 'Without this lever, 24 turns from previous tasks accompany the new request.', verify: 'A clear session removes old history. Compact would retain a 1,200-token summary.', lever: 'history' as LeverId, target: 'lever-history', action: 'Start new conversation', run: () => lab.newChat('clear'), ready: lab.levers.history },
    { title: 'Short instructions. Stable prefix.', body: 'Keep only essential project rules in copilot-instructions.md.', observe: 'Without this lever, the full engineering handbook is included on every request.', verify: 'The lean project prefix keeps the required stack, API, scope, and test rules.', lever: 'instructions' as LeverId, target: 'lever-instructions', action: 'Use lean instructions', run: () => { lab.setLever('instructions', true); lab.setActiveFile('.github/copilot-instructions.md') }, ready: lab.levers.instructions },
    { title: 'Match reasoning effort to the task.', body: 'This is a bounded regression with an explicit failing assertion, so medium effort is appropriate.', observe: 'Without this lever, the fixture spends a high reasoning budget exploring alternatives.', verify: 'Medium effort lowers modeled output while preserving the supplied reference fix.', lever: 'reasoning' as LeverId, target: 'lever-reasoning', action: 'Set medium effort', run: () => lab.setLever('reasoning', true), ready: lab.levers.reasoning },
    { title: 'Let Auto choose an eligible model.', body: 'Select Auto in the model picker. Actual AIC depends on the model selected for each request.', observe: 'Without this lever, the fixture uses Claude Sonnet 4.6 pricing.', verify: 'This demo assumes a 10% lower blended AIC rate for Auto; actual routing and pricing vary.', lever: 'auto' as LeverId, target: 'lever-auto', action: 'Select Auto', run: () => lab.setLever('auto', true), ready: lab.levers.auto },
  ]
  const hydraFusionStep: TourStep = { title: 'Orchestrate the task with HydraFusion.', body: 'Run /hydrafusion run to simulate coordinator, explorer, implementer, and verifier stages sharing a compact task brief.', observe: 'The CLI shows each simulated agent stage and explicitly identifies the workflow as a fixture.', verify: 'A completed HydraFusion workflow saves the optimized CLI run and reports its modeled AIC.', target: 'hydrafusion', action: 'Run HydraFusion', run: () => { document.querySelector<HTMLButtonElement>('[data-hydrafusion-run]')?.click() }, ready: lab.runs.some((run) => run.surface === 'cli' && Object.values(run.levers).every(Boolean)) }
  const steps: TourStep[] = [
    ...optimizationSteps,
    ...(lab.surface === 'cli' ? [hydraFusionStep] : []),
    { title: 'Same task. Now run it lean.', body: 'Rerun the same scenario with all six levers. Compare the packet and reference patch, not just the headline percentage.', observe: 'The saved baseline shows how this task looked without optimization.', verify: 'The optimized run is saved beside the baseline with the same reference outcome.', target: 'run', action: 'Run optimized task', run: () => lab.run(), ready: lab.runs.some((run) => Object.values(run.levers).every(Boolean)) },
    { title: 'Take the habit back to your workspace.', body: 'You have compared two modeled approaches to the same task. Export the run report, then validate gains with your own usage and quality checks.', observe: 'Review each category rather than treating the headline reduction as a guarantee.', verify: 'Run history now contains a reproducible before-and-after comparison.', target: 'inspector', action: 'Finish tour', run: onClose, ready: true },
  ]
  const current = steps[step]
  const withoutLevers = current.lever ? { ...lab.levers, [current.lever]: false } : emptyLevers()
  const withLevers = current.lever ? { ...lab.levers, [current.lever]: true } : allLevers()
  const without = simulate(lab.scenario, withoutLevers, { prompt: current.lever === 'scope' ? lab.scenario.prompt : lab.prompt, warmCache: lab.warmCache, sessionMode: lab.sessionMode })
  const withLever = simulate(lab.scenario, withLevers, { prompt: current.lever === 'scope' ? lab.scenario.focusedPrompt : lab.prompt, warmCache: lab.warmCache, sessionMode: lab.sessionMode })
  const comparisonLabel = 'Modeled AI credits'
  const comparisonValue = (result: typeof without) => `${formatAIC(result.aiCredits)} AIC`
  useEffect(() => {
    const target = document.querySelector(`[data-tour="${current.target}"]`)
    target?.setAttribute('data-tour-active', 'true')
    return () => { target?.removeAttribute('data-tour-active') }
  }, [current.target])

  function handlePrimaryAction() {
    if (current.ready && step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    current.run()
  }

  return <section className="tour-panel" aria-label="Guided tour" aria-live="polite">
    <div className="tour-step-number"><GraduationCap size={18} /><span>{step + 1} / {steps.length}</span></div><div className="tour-copy"><span className="eyebrow">GUIDED QUICK LAB</span><h2>{current.title}</h2><p>{current.body}</p><div className="tour-instructions"><div><Eye size={13} /><span><strong>Observe</strong>{current.observe}</span></div><div><MousePointerClick size={13} /><span><strong>Do</strong>Select <b>{current.action}</b>.</span></div><div><Check size={13} /><span><strong>Verify</strong>{current.verify}</span></div></div><div className="tour-comparison" aria-label="Step comparison"><div className="without"><span>WITHOUT {current.lever ? 'THIS LEVER' : 'LEVERS'}</span><strong>{comparisonValue(without)}</strong><small>{comparisonLabel}</small></div><ArrowRight size={15} aria-hidden="true" /><div className="with"><span>{current.lever ? 'WITH THIS LEVER' : 'LAB GOAL'}</span><strong>{comparisonValue(withLever)}</strong><small>{comparisonLabel}</small></div></div><div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((item, index) => <span key={item.title} className={index <= step ? 'complete' : ''} />)}</div></div><div className="tour-actions"><button className="icon-button tour-close" aria-label="Exit guided tour" title="Exit guided tour" onClick={onClose}><X size={16} /></button><button className="button button-primary" onClick={handlePrimaryAction} disabled={lab.running}>{current.ready && step < steps.length - 1 ? <>Continue<ArrowRight size={14} /></> : current.action}</button><button className="text-button tour-back" disabled={step === 0 || lab.running} onClick={() => setStep(step - 1)}><ArrowLeft size={14} />Back</button></div>
  </section>
}