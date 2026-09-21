import { ArrowDown, ArrowRight, BarChart3, CircleHelp, Layers3, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { formatAIC, savings } from '../simulation'
import type { Lab } from '../useLab'

export function Inspector({ lab, onMethodology }: { lab: Lab; onMethodology: () => void }) {
  const [tab, setTab] = useState('breakdown')
  const reduction = savings(lab.baseline.aiCredits, lab.result.aiCredits)
  const creditForInput = (tokens: number) => tokens * 3 / 10_000 * (lab.levers.auto ? 0.9 : 1)
  return <aside className="inspector" aria-label="AI credit inspector" data-tour="inspector">
    <div className="inspector-heading"><span><Layers3 size={15} />AI CREDIT INSPECTOR</span><span className="live-badge"><i />MODELED AIC</span></div>
    <div className="token-total"><span className="eyebrow">YOUR CURRENT REQUEST</span><strong data-testid="aic-total">{formatAIC(lab.result.aiCredits)}</strong><span>modeled AI credits (AIC)</span></div>
    <div className={`savings-band ${lab.enabled ? 'has-savings' : ''}`}><span className="savings-number"><ArrowDown size={21} />{reduction}%</span><div><strong>fewer AI credits</strong><small>vs. the unoptimized fixture</small></div></div>
    <div className="inspector-tabs" role="group" aria-label="Inspector view"><button aria-pressed={tab === 'breakdown'} onClick={() => setTab('breakdown')}>Breakdown</button><button aria-pressed={tab === 'compare'} onClick={() => setTab('compare')}>Comparison</button></div>
    {tab === 'breakdown' ? <div className="token-breakdown">{lab.result.breakdown.map((part) => <div key={part.key}><span><i className={`segment-${part.key}`} />{part.label}</span><strong>{formatAIC(part.key === 'instructions' ? creditForInput(part.tokens - lab.result.cached) + lab.result.cached * 0.3 / 10_000 * (lab.levers.auto ? 0.9 : 1) : creditForInput(part.tokens))} AIC</strong></div>)}<div className="output-row"><span><i className="segment-output" />Output + reasoning</span><strong>{formatAIC(lab.result.output * 15 / 10_000 * (lab.levers.auto ? 0.9 : 1))} AIC</strong></div></div> : <div className="comparison-detail"><div><span>No levers</span><strong>{formatAIC(lab.baseline.aiCredits)} AIC</strong></div><div><span>Your configuration</span><strong>{formatAIC(lab.result.aiCredits)} AIC</strong></div><div className="tokens-removed"><span>AI credits avoided</span><strong>{formatAIC(lab.baseline.aiCredits - lab.result.aiCredits)} AIC</strong></div><p>Identical scenario and reference fix. These modeled credits are not billing telemetry or a guarantee of answer quality.</p></div>}
    <div className="cost-index"><span>Estimated AI credit use <button className="icon-button" aria-label="Explain AI credit assumptions" title="Calculation assumptions" onClick={onMethodology}><CircleHelp size={13} /></button></span><div><span>{formatAIC(lab.baseline.aiCredits)}</span><ArrowRight size={13} /><strong>{formatAIC(lab.result.aiCredits)} AIC</strong></div></div>
    <label className="cache-assumption"><input type="checkbox" checked={lab.warmCache} disabled={lab.running || !lab.levers.instructions} onChange={(event) => lab.setWarmCache(event.target.checked)} /><span>Assume warm instruction cache</span></label>
    <button className="button button-primary run-comparison" onClick={() => lab.running ? lab.stop() : lab.run()} data-tour="run">{lab.running ? <Square size={14} /> : <Play size={14} />}{lab.running ? 'Stop simulation' : 'Run comparison'}{!lab.running && <BarChart3 size={15} />}</button>
    <p className="inspector-footnote">Modeled AIC, not measured billing usage.<button onClick={onMethodology}>View assumptions <ArrowRight size={11} /></button></p>
  </aside>
}