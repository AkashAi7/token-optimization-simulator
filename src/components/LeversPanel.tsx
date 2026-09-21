import { BrainCircuit, FileText, Focus, RotateCcw, SlidersHorizontal, Unplug, WandSparkles, Workflow } from 'lucide-react'
import { leverDefinitions } from '../simulation'
import type { Lab } from '../useLab'

const icons = { scope: Focus, tools: Unplug, history: RotateCcw, instructions: FileText, reasoning: BrainCircuit, auto: Workflow }

export function LeversPanel({ lab }: { lab: Lab }) {
  return <section className="levers-panel" aria-labelledby="levers-heading" data-tour="levers">
    <div className="section-heading"><div><SlidersHorizontal size={17} /><h2 id="levers-heading">Your optimization levers</h2><span className="active-count">{lab.enabled} / 6 active</span></div><button className="text-button" disabled={lab.running} onClick={() => lab.setPreset(lab.enabled !== 6)}><WandSparkles size={14} />{lab.enabled === 6 ? 'Disable all' : 'Enable all'}</button></div>
    <div className="lever-grid">{leverDefinitions.map((lever, index) => {
      const Icon = icons[lever.id]
      return <label className={`lever-row ${lab.levers[lever.id] ? 'enabled' : ''}`} key={lever.id} data-tour={`lever-${lever.id}`}><span className="lever-icon"><Icon size={18} /></span><span className="lever-copy"><strong>{lever.title}</strong><small>{lever.detail}</small><span className="lever-target"><span>0{index + 1}</span>{lever.target}</span></span><input type="checkbox" role="switch" aria-label={lever.title} checked={lab.levers[lever.id]} disabled={lab.running} onChange={(event) => lab.setLever(lever.id, event.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>
    })}</div>
  </section>
}