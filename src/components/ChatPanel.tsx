import { ArrowUp, Check, ChevronDown, CircleCheck, FileCode2, Globe2, LoaderCircle, Paperclip, Plus, SlidersHorizontal, Sparkles, Square } from 'lucide-react'
import { formatAIC } from '../simulation'
import type { Lab } from '../useLab'

export function ChatPanel({ lab, onTools }: { lab: Lab; onTools: () => void }) {
  const { scenario, levers, running, response } = lab
  return <section className="chat-panel" aria-label="Simulated Copilot chat">
    <div className="chat-heading"><span><Sparkles size={15} /> COPILOT</span><button className="icon-button dark" title="New chat" aria-label="New chat" disabled={running} onClick={() => lab.newChat()} data-tour="new-chat"><Plus size={17} /></button></div>
    <div className="chat-conversation" tabIndex={0} role="region" aria-label="Conversation" aria-live="polite" aria-busy={running}>
      {!response && !running && <>
        <div className="chat-intro"><span className="copilot-avatar"><Sparkles size={20} /></span><h3>Let&apos;s fix this together.</h3><p>{levers.history ? 'A fresh context for the task at hand.' : 'Your task context is ready.'}</p></div>
        <div className={`context-notice ${levers.history ? 'clean' : ''}`}><span className="status-dot" />{levers.history ? (lab.sessionMode === 'compact' ? 'Compacted session · task summary retained' : 'New session · no previous turns') : 'Existing session · 24 previous turns'}</div>
        <div className="chat-task"><span className="eyebrow">CURRENT TASK</span><p>{scenario.description}</p><span className="task-file"><FileCode2 size={13} /> {scenario.file}</span></div>
      </>}
      {running && <div className="agent-working"><span className="eyebrow"><LoaderCircle size={14} className="spin" /> SIMULATING AGENT TURN</span>{lab.result.trace.slice(0, lab.stage + 1).map((line, index) => <p key={line}><Check size={14} /><span>{line}</span><small>{index + 1}</small></p>)}</div>}
      {response && <div className="agent-response">
        <div className="response-byline"><Sparkles size={16} /><strong>GitHub Copilot</strong><span>SIMULATED</span></div>
        <p>{scenario.diagnosis}</p>
        <details><summary>Context used <ChevronDown size={13} /></summary><ul>{response.result.trace.slice(0, -1).map((line) => <li key={line}>{line}</li>)}</ul></details>
        <div className="patch-preview"><div><FileCode2 size={13} />{scenario.file}<span>1 change</span></div><code className="removed">- {scenario.code.split('\n').find((line, index) => line !== scenario.fixedCode.split('\n')[index])?.trim()}</code><code className="added">+ {scenario.fixedCode.split('\n').find((line, index) => line !== scenario.code.split('\n')[index])?.trim()}</code></div>
        <button className="apply-patch" disabled={lab.applied} onClick={() => { lab.setCode(scenario.fixedCode); lab.setActiveFile(scenario.file); lab.setNotice('Reference patch applied in the simulated editor.') }}><Check size={14} />{lab.applied ? 'Reference patch applied' : 'Apply reference patch'}</button>
        <div className="response-proof"><CircleCheck size={14} />Same reference fix in both runs</div>
        <small className="response-tokens">{formatAIC(response.result.aiCredits)} modeled AIC · fixture response</small>
      </div>}
    </div>
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); lab.run() }} data-tour="composer">
      <div className="attachments">
        <button type="button" disabled={running} className={levers.scope ? 'attached-file' : 'attached-codebase'} onClick={() => lab.setLever('scope', !levers.scope)} title={levers.scope ? 'Use broad repository context' : 'Attach only the task files'} data-tour="scope">{levers.scope ? <FileCode2 size={12} /> : <Globe2 size={12} />}{levers.scope ? scenario.file.split('/').at(-1) : '#codebase'}<span>{levers.scope ? '+1' : 'all files'}</span></button>
      </div>
      <textarea aria-label="Copilot chat prompt" placeholder="Ask about this task..." value={lab.prompt} disabled={running} maxLength={4000} onChange={(event) => lab.setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); lab.run() } }} />
      <div className="composer-options">
        <span className="agent-mode">Agent <ChevronDown size={10} /></span>
        <select aria-label="Chat model" disabled={running} value={levers.auto ? 'auto' : 'manual'} onChange={(event) => lab.setLever('auto', event.target.value === 'auto')} data-tour="model"><option value="manual">Claude Sonnet 4.6</option><option value="auto">Auto</option></select>
      </div>
      <div className="composer-actions">
        <button type="button" disabled={running} className="icon-button dark" aria-label="Attach task files" title="Attach task files" onClick={() => lab.setLever('scope', true)}><Paperclip size={15} /></button>
        <button type="button" disabled={running} className="icon-button dark" aria-label="Configure tools" title="Configure tools" onClick={onTools} data-tour="tools"><SlidersHorizontal size={15} /></button>
        <select aria-label="Reasoning effort" value={levers.reasoning ? 'medium' : 'high'} disabled={running} onChange={(event) => lab.setLever('reasoning', event.target.value === 'medium')}><option value="high">High effort</option><option value="medium">Medium effort</option></select>
        {running ? <button type="button" className="send-button" aria-label="Stop simulation" onClick={lab.stop}><Square size={14} /></button> : <button type="submit" className="send-button" aria-label="Send prompt" disabled={!lab.prompt.trim()}><ArrowUp size={17} /></button>}
      </div>
    </form>
    <div className="chat-disclaimer">Scenario simulation. No live model connection.</div>
  </section>
}