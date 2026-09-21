import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard, ExternalLink, FileCode2, FileText, Search, Settings2, X } from 'lucide-react'
import { assumptions, configurationLink, downloadText } from '../reports'
import { fullInstructions, leanInstructions } from '../simulation'
import type { Lab } from '../useLab'

export type DialogType = 'tools' | 'instructions' | 'methodology' | 'palette' | 'scenario' | 'share' | 'reset' | 'fieldguide' | null

function Methodology() {
  return <div className="methodology-content"><p className="dialog-intro">A transparent teaching model, not a savings calculator for your bill.</p><dl>{Object.entries(assumptions).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl><div className="source-links"><a href="https://aka.ms/ghcp-tkn-opt" target="_blank" rel="noreferrer">Token optimization playbook<ExternalLink size={14} /></a><a href="https://docs.github.com/en/copilot/reference/cli-command-reference" target="_blank" rel="noreferrer">Official Copilot CLI reference<ExternalLink size={14} /></a><a href="https://code.visualstudio.com/docs/copilot/copilot-customization" target="_blank" rel="noreferrer">VS Code customization<ExternalLink size={14} /></a></div></div>
}

function FieldGuide() {
  const rows = [
    ['Context', 'Attach the relevant files or selection in Chat.', '@src/cart.ts @src/cart.test.ts'],
    ['Tools', 'Chat > Configure tools. Keep task-relevant tools.', '/mcp disable enterprise-integrations'],
    ['History', 'Use New Chat for a new task.', '/clear  or  /compact'],
    ['Instructions', 'Keep .github/copilot-instructions.md short and stable.', '/instructions'],
    ['Reasoning', 'Select medium effort on a supporting model.', '/model (effort picker)'],
    ['Model', 'Choose Auto in the Chat model picker.', '/model auto'],
  ]
  return <div className="field-guide"><p className="dialog-intro">The same habits, in your real workspace. Features vary by client version, plan, model, and organization policy.</p><div className="table-scroll"><table><thead><tr><th>Lever</th><th>VS Code</th><th>Copilot CLI</th></tr></thead><tbody>{rows.map(([lever, vscode, cli]) => <tr key={lever}><th>{lever}</th><td>{vscode}</td><td><code>{cli}</code></td></tr>)}</tbody></table></div><p><strong>Verify with your own usage.</strong> In Copilot CLI, use <code>/context</code> and <code>/usage</code>. Enterprise monitoring can use OpenTelemetry. Compare like-for-like tasks, inspect actual billed metrics, and validate answer quality.</p><p><code>enterprise-integrations</code> is this demo&apos;s fictional MCP server. Substitute the actual server name in your environment. This simulator uses the current standalone <code>copilot</code> CLI, not the retired <code>gh copilot</code> extension.</p><a className="button button-primary" href="https://aka.ms/ghcp-tkn-opt" target="_blank" rel="noreferrer">Open the full playbook<ExternalLink size={14} /></a></div>
}

export function LabDialogs({ type, lab, onClose, onReset }: { type: DialogType; lab: Lab; onClose: () => void; onReset: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement as HTMLElement | null
    if (type) element?.showModal()
    return () => { element?.close(); previousFocus?.focus() }
  }, [type])
  if (!type) return null
  const titles = { tools: 'Configure tools', instructions: 'Project instructions', methodology: 'Behind the numbers', palette: 'Command palette', scenario: 'Your task brief', share: 'Share this configuration', reset: 'Reset this demo?', fieldguide: 'From the lab to your workspace' }
  const actions = [
    { label: lab.scenario.file, icon: FileCode2, run: () => lab.setActiveFile(lab.scenario.file) },
    { label: lab.scenario.testFile, icon: FileCode2, run: () => lab.setActiveFile(lab.scenario.testFile) },
    { label: '.github/copilot-instructions.md', icon: FileText, run: () => lab.setActiveFile('.github/copilot-instructions.md') },
    { label: 'Chat: New Chat', icon: Settings2, run: () => lab.newChat('clear') },
    { label: 'Chat: Use Auto Model', icon: Settings2, run: () => lab.setLever('auto', true) },
    { label: 'Chat: Use Focused Context', icon: Settings2, run: () => lab.setLever('scope', true) },
  ].filter((action) => action.label.toLowerCase().includes(search.toLowerCase()))

  return <dialog ref={dialog} className={`lab-dialog dialog-${type}`} aria-labelledby="dialog-heading" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === dialog.current) onClose() }} onKeyDown={(event) => {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0)
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }}><div className="dialog-heading"><h2 id="dialog-heading">{titles[type]}</h2><button className="icon-button" aria-label="Close dialog" title="Close" onClick={onClose}><X size={19} /></button></div><div className="dialog-body">
    {type === 'methodology' && <Methodology />}
    {type === 'fieldguide' && <FieldGuide />}
    {type === 'tools' && <><p className="dialog-intro">Available tool schemas in this demo workspace. Availability is different from permission to execute a tool.</p><div className="tool-group"><div><strong>Core workspace tools</strong><span>3 tools · retained</span></div><p>Read files, edit files, run fixture checks</p><span className="tool-check"><Check size={15} />Enabled</span></div><label className="tool-group optional"><div><strong>enterprise-integrations</strong><span>25 tools · fictional MCP server</span><p>CRM, cloud inventory, design exports, and analytics</p></div><input type="checkbox" checked={!lab.levers.tools} disabled={lab.running} onChange={(event) => lab.setLever('tools', !event.target.checked)} aria-label="Enable enterprise integrations" /></label><p className="dialog-note">This fixture assumes eager schema loading. Deferred loading in real clients can make the saving smaller or zero.</p><button className="button button-primary" onClick={onClose}>Done</button></>}
    {type === 'instructions' && <><p className="dialog-intro"><code>.github/copilot-instructions.md</code></p><label className="inline-checkbox"><input type="checkbox" checked={lab.levers.instructions} disabled={lab.running} onChange={(event) => lab.setLever('instructions', event.target.checked)} />Use short, stable project instructions</label><pre className="instructions-preview">{lab.levers.instructions ? leanInstructions : fullInstructions}</pre><p className="dialog-note">The long version is an excerpt representing a 3,200-token fixture, not the token count of the text shown here.</p><button className="button" onClick={() => downloadText(leanInstructions, 'copilot-instructions.md')}><FileText size={15} />Download lean instructions</button></>}
    {type === 'palette' && <><div className="palette-search"><Search size={17} /><input aria-label="Search files and commands" autoFocus value={search} placeholder="Search files and commands..." onChange={(event) => setSearch(event.target.value)} /></div><div className="palette-results">{actions.length ? actions.map((action) => <button key={action.label} onClick={() => { action.run(); onClose() }}><action.icon size={16} /><span>{action.label}</span><kbd>Enter</kbd></button>) : <p>No matching files or commands.</p>}</div></>}
    {type === 'scenario' && <><span className="eyebrow">{lab.scenario.category} · TYPESCRIPT / VITEST</span><h3>{lab.scenario.title}</h3><p className="dialog-intro">{lab.scenario.description}</p><dl className="scenario-facts"><div><dt>Repository</dt><dd>{lab.scenario.repo}</dd></div><div><dt>Implementation</dt><dd>{lab.scenario.file}</dd></div><div><dt>Regression test</dt><dd>{lab.scenario.testFile}</dd></div></dl><p>All files are demo fixtures. Both approaches have the same reference fix. Keep the task constant while changing the request context.</p></>}
    {type === 'share' && <><p className="dialog-intro">The link includes the scenario, workspace, levers, and cache assumption. It does not include prompts, code edits, or run history.</p><label className="share-label">Configuration URL<input readOnly value={configurationLink(lab)} onFocus={(event) => event.target.select()} /></label><button className="button button-primary" onClick={async () => { try { await navigator.clipboard.writeText(configurationLink(lab)); setCopied(true) } catch { lab.setNotice('Clipboard unavailable. Select the configuration URL to copy it manually.') } }}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'Link copied' : 'Copy link'}</button><p className="dialog-note">Localhost links only work on the machine hosting the app. Publish the static build for a customer-accessible URL.</p></>}
    {type === 'reset' && <><p className="dialog-intro">This clears run history, code edits, terminal commands, and lever selections for this browser demo. No real files are affected.</p><div className="dialog-actions"><button className="button" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => { onReset(); onClose() }}>Reset demo</button></div></>}
  </div></dialog>
}