import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ArrowUp, ChevronRight, ClipboardPaste, Eraser, TerminalSquare } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import { allLevers, formatAIC, formatTokens, parseCommand } from '../simulation'
import type { Lab } from '../useLab'

const commands = [
  ['/help', 'Available demo commands'], ['/context', 'Inspect the context packet'],
  ['/compact', 'Summarize the conversation'], ['/clear', 'Start a new conversation'],
  ['/model', 'Select model and reasoning effort'], ['/model auto', 'Enable Auto routing'],
  ['/mcp', 'Configure enabled tools'], ['/mcp disable enterprise-integrations', 'Disable 25 unrelated tools'],
  ['/instructions', 'View project instructions'], ['/usage', 'Inspect modeled usage'], ['/diff', 'Review the reference change'],
  ['/hydrafusion run', 'Simulate a multi-agent workflow'], ['/hydrafusion status', 'Inspect the latest workflow'],
]

export function CliTerminal({ lab, onTools, onInstructions }: { lab: Lab; onTools: () => void; onInstructions: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const term = useRef<Terminal | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [modelPicker, setModelPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [hydraFusionRun, setHydraFusionRun] = useState(false)
  const suggestions = input.startsWith('/') && showMenu ? commands.filter(([command]) => command.startsWith(input)).slice(0, 5) : []
  const { scenario, levers, running, response } = lab
  const transcript = [
    '', '  GitHub Copilot', '  ------------------------------', '',
    `  ~/projects/${scenario.repo}  [fix/${scenario.id}]`,
    `  Model: ${levers.auto ? 'Auto' : 'Claude Sonnet 4.6'}  |  Effort: ${levers.reasoning ? 'medium' : 'high'}`,
    `  Tools: ${levers.tools ? '3 active' : '28 active'}  |  History: ${levers.history ? lab.sessionMode === 'compact' ? 'compacted' : 'new session' : '24 previous turns'}`,
    '', '  Browser simulation. No shell or live AI connection.', '',
    ...entries,
    ...(running ? ['  > Simulating task...', ...lab.result.trace.slice(0, lab.stage + 1).map((line) => `    + ${line}`)] : []),
    ...(response ? ['', `  > ${hydraFusionRun ? 'HydraFusion workflow result' : 'Scenario response'} [simulated]`, '', `  ${scenario.diagnosis}`, '',
      `  Reference patch: ${scenario.file}`, `  ${scenario.testResult}`, '  The checks above describe the supplied reference patch.', '',
      `  Estimated usage: ${formatAIC(response.result.aiCredits)} AIC`,
      `  USD equivalent:  $${formatAIC(response.result.aiCredits * 0.01)}`, '', '  Use /usage or /context to inspect this simulation.', ''] : []),
  ].join('\r\n')

  useEffect(() => {
    if (!host.current) return
    const terminal = new Terminal({ convertEol: true, disableStdin: true, cursorBlink: false, cursorInactiveStyle: 'none',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5, scrollback: 2000,
      theme: { background: '#18191C', foreground: '#CCCFD5', green: '#8BC6A7', cyan: '#76C9D0', selectionBackground: '#3B535A' },
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(host.current)
    if (terminal.textarea) terminal.textarea.tabIndex = -1
    term.current = terminal
    const fitTerminal = () => { if (host.current && host.current.clientWidth > 0 && host.current.clientHeight > 0) fit.fit() }
    fitTerminal()
    const observer = new ResizeObserver(fitTerminal)
    observer.observe(host.current)
    const renderSubscription = terminal.onRender(fitTerminal)
    void document.fonts.ready.then(() => { if (term.current === terminal) fitTerminal() })
    return () => { observer.disconnect(); renderSubscription.dispose(); term.current = null; terminal.dispose() }
  }, [])

  useEffect(() => {
    term.current?.reset()
    term.current?.write(transcript)
  }, [transcript])

  function submit(value: string) {
    if (!value.trim() || running) return
    setHistory((current) => [...current, value])
    setHistoryIndex(-1)
    setInput('')
    setShowMenu(false)
    const parsed = parseCommand(value)
    const echo = (message: string) => setEntries((current) => [...current, `  > ${value}`, ...message.split('\n').map((line) => `  ${line}`), ''])
    if (parsed.kind === 'prompt') {
      setHydraFusionRun(false)
      if (parsed.text === 'copilot') { echo('Session ready. Enter the scenario task or /help.'); return }
      if (parsed.text.startsWith('!') || parsed.text === '$') { echo('Shell execution is disabled in this browser simulation.'); return }
      const scoped = parsed.text.includes(`@${scenario.file}`) || parsed.text.includes(`#file:${scenario.file}`)
      lab.run({ prompt: parsed.text, levers: { ...levers, scope: scoped || levers.scope } })
      echo('Running the selected scenario fixture. Custom text affects prompt size, not the reference answer.')
      return
    }
    switch (parsed.command) {
      case '/help': echo(commands.map(([command, description]) => `${command}\n    ${description}`).join('\n')); break
      case '/compact': lab.newChat('compact'); echo('Compacted: 18,400 -> 1,200 modeled history tokens.\nTask summary retained. Compaction overhead is not modeled.'); break
      case '/clear': case '/new': setEntries([]); lab.newChat('clear'); break
      case '/context': echo(`Context packet: ${formatTokens(lab.result.input)} modeled input tokens\n${lab.result.breakdown.map((item) => `${item.label.padEnd(15)} ${formatTokens(item.tokens)}`).join('\n')}`); break
      case '/usage': echo(`Current configuration (modeled turn):\nEstimated usage: ${formatAIC(lab.result.aiCredits)} AIC\nUSD equivalent: $${formatAIC(lab.result.aiCredits * 0.01)}\nCompleted demo runs: ${lab.runs.length}\nThis is a fixture estimate, not GitHub billing telemetry.`); break
      case '/model':
        if (!parsed.argument) { setModelPicker(true); echo('Model and effort picker opened below. Availability varies by plan.'); }
        else if (['auto', 'claude-sonnet-4.6'].includes(parsed.argument)) { lab.setLever('auto', parsed.argument === 'auto'); echo(`Model set to ${parsed.argument}.`); }
        else echo('Demo models: auto, claude-sonnet-4.6. Use /model to open the picker.')
        break
      case '/mcp':
        if (parsed.argument === 'disable enterprise-integrations') { lab.setLever('tools', true); echo('Disabled enterprise-integrations. 3 core tool schemas remain.'); }
        else if (parsed.argument === 'enable enterprise-integrations') { lab.setLever('tools', false); echo('Enabled enterprise-integrations. 28 tool schemas available.'); }
        else if (parsed.argument === 'list') echo(`Core tools: 3 enabled\nenterprise-integrations: ${levers.tools ? 'disabled' : '25 enabled'}`)
        else if (!parsed.argument) onTools()
        else echo('Use /mcp, /mcp list, or /mcp disable enterprise-integrations.')
        break
      case '/instructions': onInstructions(); break
      case '/diff': echo(lab.applied ? `Reference change applied in ${scenario.file}.\n${scenario.diagnosis}` : 'No applied changes. Run the scenario, then apply its reference patch.'); break
      case '/hydrafusion':
        if (parsed.argument === 'run') {
          setHydraFusionRun(true)
          lab.run({ prompt: scenario.focusedPrompt, levers: allLevers() })
          echo(`HydraFusion workflow [simulated]\n01 coordinator  Scoped ${scenario.file} and ${scenario.testFile}\n02 explorer     Isolated the failing behavior\n03 implementer  Prepared the reference patch\n04 verifier     Scheduled focused regression checks\nAgents share a compact task brief; no live agents or external tools are invoked.`)
        } else if (parsed.argument === 'status') {
          echo(hydraFusionRun && response
            ? `Latest HydraFusion workflow: completed\nScenario: ${scenario.title}\nResult: ${formatAIC(response.result.aiCredits)} AIC\nChecks: ${scenario.testResult}`
            : 'No completed HydraFusion workflow in this session. Use /hydrafusion run.')
        } else echo('Use /hydrafusion run or /hydrafusion status.')
        break
      default: echo('This command is outside the simulation. /help lists the supported subset.')
    }
  }

  return <section className="cli-workspace" aria-label="Copilot CLI replica">
    <div className="window-titlebar"><TerminalSquare size={16} /><span className="terminal-window-name">GitHub Copilot CLI</span><span className="replica-tag">SIMULATED TERMINAL</span><button className="icon-button dark" aria-label="Clear terminal display" title="Clear terminal display" onClick={() => setEntries([])}><Eraser size={14} /></button></div>
    <div className="terminal-session"><span className="status-dot" />{scenario.repo}<span>~/projects</span><span className="session-local">local</span></div>
    <div className="terminal-output" ref={host} aria-hidden="true" /><pre className="sr-only" aria-live="polite" aria-label="Terminal transcript">{transcript}</pre>
    {response && <div className="terminal-patch-actions"><button className="apply-patch" disabled={lab.applied} onClick={() => { lab.setCode(scenario.fixedCode); lab.setNotice('Reference patch applied to the shared simulated workspace.') }}>{lab.applied ? 'Reference patch applied' : 'Apply reference patch'}</button><span>Shared with the VS Code editor</span></div>}
    {modelPicker && <div className="terminal-model-picker"><label>Model<select aria-label="CLI model" value={levers.auto ? 'auto' : 'manual'} onChange={(event) => lab.setLever('auto', event.target.value === 'auto')}><option value="manual">Claude Sonnet 4.6</option><option value="auto">Auto</option></select></label><label>Effort<select aria-label="CLI reasoning effort" value={levers.reasoning ? 'medium' : 'high'} onChange={(event) => lab.setLever('reasoning', event.target.value === 'medium')}><option value="high">High</option><option value="medium">Medium</option></select></label><button onClick={() => setModelPicker(false)}>Done</button></div>}
    <form className="terminal-input-form" onSubmit={(event) => { event.preventDefault(); submit(input) }}>
      {suggestions.length > 0 && <div className="slash-suggestions" aria-label="Slash command suggestions">{suggestions.map(([command, description]) => <button type="button" key={command} onClick={() => submit(command)}><code>{command}</code><span>{description}</span></button>)}</div>}
      <ChevronRight size={17} /><input ref={inputRef} aria-label="Copilot CLI command" autoComplete="off" spellCheck={false} disabled={running} value={input} maxLength={4000} placeholder={running ? 'Simulating agent turn...' : 'Enter a task or /help'} onChange={(event) => { setInput(event.target.value); setShowMenu(true) }} onKeyDown={(event) => {
        if (event.key === 'Escape') setShowMenu(false)
        if (event.key === 'Tab' && suggestions.length) { event.preventDefault(); setInput(suggestions[0][0]); setShowMenu(false) }
        if (event.key === 'ArrowUp') { event.preventDefault(); const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(next); setInput(history[next] ?? '') }
        if (event.key === 'ArrowDown') { event.preventDefault(); const next = historyIndex + 1; setHistoryIndex(next >= history.length ? -1 : next); setInput(history[next] ?? '') }
        if (event.ctrlKey && event.key === 'l') { event.preventDefault(); setEntries([]) }
      }} /><button type="button" className="icon-button dark" aria-label="Insert scenario prompt" title="Insert scenario prompt" disabled={running} onClick={() => { setInput(lab.prompt.replaceAll('#file:', '@')); inputRef.current?.focus() }}><ClipboardPaste size={15} /></button><button type="submit" className="send-button" aria-label="Execute CLI command" disabled={running || !input.trim()}><ArrowUp size={16} /></button>
    </form>
    <div className="terminal-footer" data-tour="hydrafusion"><span>{levers.auto ? 'Auto' : 'Claude Sonnet 4.6'} · {levers.reasoning ? 'medium' : 'high'}</span><span>{formatAIC(lab.result.aiCredits)} estimated AIC</span><button data-hydrafusion-run onClick={() => submit('/hydrafusion run')} disabled={running}>HydraFusion</button><button onClick={() => submit('/help')} disabled={running}>/help</button></div>
  </section>
}