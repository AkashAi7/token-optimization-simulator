import { Download, History, Monitor, TerminalSquare } from 'lucide-react'
import { exportReport } from '../reports'
import { formatAIC, leverDefinitions, savings, scenarios } from '../simulation'
import type { Lab } from '../useLab'

export function RunHistory({ lab, onBack }: { lab: Lab; onBack: () => void }) {
  return <section className="run-history" aria-labelledby="history-heading">
    <div className="section-heading">
      <div><History size={19} /><h2 id="history-heading">Your demo runs</h2><span className="active-count">{lab.runs.length}</span></div>
      <button className="button" disabled={!lab.runs.length} onClick={() => exportReport(lab)}><Download size={15} />Export report</button>
    </div>
    {lab.runs.length ? <>
      <div className="table-scroll"><table>
        <thead><tr><th>Run / scenario</th><th>Workspace</th><th>Levers</th><th>Baseline AIC</th><th>Configured AIC</th><th>AIC reduction</th></tr></thead>
        <tbody>{[...lab.runs].reverse().map((run) => <tr key={run.id}>
          <td><strong>#{run.id} {scenarios.find((scenario) => scenario.id === run.scenario)?.title}</strong><small>{run.warmCache ? 'Warm cache assumed' : 'Cold cache'} · {run.sessionMode === 'compact' ? 'Compaction preset' : 'New-chat preset'}</small></td>
          <td><span className="history-surface">{run.surface === 'vscode' ? <Monitor size={14} /> : <TerminalSquare size={14} />}{run.surface === 'vscode' ? 'VS Code' : 'CLI'}</span></td>
          <td title={leverDefinitions.filter((lever) => run.levers[lever.id]).map((lever) => lever.title).join(', ')}>{Object.values(run.levers).filter(Boolean).length} / 6</td>
          <td>{formatAIC(run.baseline.aiCredits)}</td><td>{formatAIC(run.result.aiCredits)}</td>
          <td><span className="reduction-badge">{savings(run.baseline.aiCredits, run.result.aiCredits)}%</span></td>
        </tr>)}</tbody>
      </table></div>
      <p className="history-note">Each row compares the same scenario and prompt with all levers off versus the captured configuration. AIC estimates are frozen when a run completes and are not billing telemetry.</p>
    </> : <div className="history-empty"><History size={32} /><h3>No completed runs yet</h3><p>Complete a task in either workspace to capture a comparison.</p><button className="button button-primary" onClick={onBack}>Open simulator</button></div>}
  </section>
}
