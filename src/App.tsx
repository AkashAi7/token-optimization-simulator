import { useEffect, useState } from 'react'
import {
  ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Download,
  ExternalLink, FlaskConical, GraduationCap, History, Layers3,
  Maximize2, Minimize2, RotateCcw, Share2, ShieldCheck, TerminalSquare,
} from 'lucide-react'
import vscodeIcon from './assets/vscode.png'
import { Workbench } from './components/Workbench'
import { CliTerminal } from './components/CliTerminal'
import { Inspector } from './components/Inspector'
import { LeversPanel } from './components/LeversPanel'
import { Tour } from './components/Tour'
import { LabDialogs } from './components/LabDialogs'
import type { DialogType } from './components/LabDialogs'
import { RunHistory } from './components/RunHistory'
import { useLab } from './useLab'
import { scenarios } from './simulation'
import { exportReport } from './reports'

function App() {
  const lab = useLab()
  const [view, setView] = useState<'lab' | 'history'>('lab')
  const [dialog, setDialog] = useState<DialogType>(null)
  const [tourStep, setTourStep] = useState(-1)
  const [presenter, setPresenter] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setDialog('palette')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function startTour() {
    setView('lab')
    lab.reset()
    setTourStep(0)
  }

  return (
    <div className={`application ${presenter ? 'presenter-view' : ''}`}>
      <a className="skip-link" href="#main">Skip to simulator</a>
      <header className="app-header">
        <a className="brand" href="./" aria-label="Copilot AI Credit Lab home">
          <span className="brand-mark"><Layers3 size={21} /></span>
          <span>Copilot <strong>AI Credit Lab</strong></span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <button aria-current={view === 'lab' ? 'page' : undefined} onClick={() => setView('lab')}>
            <FlaskConical size={15} />Simulator
          </button>
          <button aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')}>
            <History size={15} />Run history
            {lab.runs.length > 0 && <span>{lab.runs.length}</span>}
          </button>
        </nav>
        <div className="header-actions">
          <a className="header-playbook" href="https://aka.ms/ghcp-tkn-opt" target="_blank" rel="noreferrer">
            The playbook<ExternalLink size={13} />
          </a>
          <button className="button tour-start-button" disabled={lab.running} onClick={startTour} title="Start a fresh guided demo">
            <GraduationCap size={16} /><span>Guided tour</span>
          </button>
        </div>
      </header>

      <main id="main" className="app-main">
        <div className="page-heading">
          <div>
            <div className="page-eyebrow">
              <span className="status-dot" />GITHUB COPILOT<ChevronRight size={12} /><span>HANDS-ON LAB</span>
            </div>
            <h1>AI credit optimization lab<span className="heading-period">.</span></h1>
            <p>Same task. Same reference fix. A more intentional request.</p>
          </div>
          <div className="page-actions">
            <span className="sandbox-badge"><ShieldCheck size={13} />No credentials needed</span>
            <div>
              <button className="icon-button" title="Real-workspace field guide" aria-label="Open field guide" onClick={() => setDialog('fieldguide')}>
                <BookOpen size={18} />
              </button>
              <button className="icon-button" title="Share configuration" aria-label="Share configuration" onClick={() => setDialog('share')}>
                <Share2 size={17} />
              </button>
              <button className="icon-button" title="Export run report" aria-label="Export run report" disabled={!lab.runs.length} onClick={() => exportReport(lab)}>
                <Download size={17} />
              </button>
              <button
                className="icon-button"
                title={presenter ? 'Exit presenter view' : 'Presenter view'}
                aria-label={presenter ? 'Exit presenter view' : 'Presenter view'}
                aria-pressed={presenter}
                onClick={() => setPresenter(!presenter)}
              >
                {presenter ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button className="icon-button" title="Reset demo" aria-label="Reset demo" disabled={lab.running} onClick={() => setDialog('reset')}>
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
        </div>

        <div hidden={view !== 'lab'}>
          <section className="scenario-bar" aria-label="Scenario selection">
            <span className="scenario-number">0{scenarios.indexOf(lab.scenario) + 1}</span>
            <div className="scenario-select">
              <label htmlFor="scenario">YOUR SCENARIO</label>
              <select
                id="scenario"
                value={lab.scenario.id}
                disabled={lab.running || tourStep >= 0}
                onChange={(event) => lab.selectScenario(scenarios.find((scenario) => scenario.id === event.target.value)!)}
              >
                {scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.title}</option>)}
              </select>
            </div>
            <span className="scenario-stack"><span className="typescript-icon">TS</span>TypeScript<span className="stack-divider" />Vitest</span>
            <button className="text-button task-brief-button" onClick={() => setDialog('scenario')}>
              Task brief<CircleHelp size={15} />
            </button>
          </section>

          <div className="lab-grid">
            <div className="workspace-column">
              <div className="workspace-toolbar">
                <div className="workspace-tabs" role="group" aria-label="Simulated environment">
                  <button aria-pressed={lab.surface === 'vscode'} disabled={lab.running} onClick={() => lab.setSurface('vscode')}>
                    <img src={vscodeIcon} alt="" width="17" height="17" />VS Code
                  </button>
                  <button aria-pressed={lab.surface === 'cli'} disabled={lab.running} onClick={() => lab.setSurface('cli')}>
                    <TerminalSquare size={17} />Copilot CLI
                  </button>
                </div>
                <span className="workspace-sandbox"><ShieldCheck size={12} />Browser sandbox</span>
              </div>

              {tourStep >= 0 ? (
                <Tour lab={lab} step={tourStep} setStep={setTourStep} onClose={() => setTourStep(-1)} />
              ) : (
                <div className="tour-ribbon">
                  <span className="tour-ribbon-icon"><GraduationCap size={18} /></span>
                  <span>
                    <strong>Your first comparison</strong>
                    <small>Baseline to optimized, one lever at a time.</small>
                  </span>
                  <button className="text-button" disabled={lab.running} onClick={startTour}>
                    Start the tour<ArrowRight size={15} />
                  </button>
                </div>
              )}

              <div key={`${lab.scenario.id}-${lab.workspaceVersion}`} className="replica-stage">
                <div hidden={lab.surface !== 'vscode'}>
                  <Workbench lab={lab} onTools={() => setDialog('tools')} onPalette={() => setDialog('palette')} />
                </div>
                <div hidden={lab.surface !== 'cli'}>
                  <CliTerminal lab={lab} onTools={() => setDialog('tools')} onInstructions={() => setDialog('instructions')} />
                </div>
              </div>

              <div className="workspace-caption">
                <span className="status-dot" />
                <span>{lab.enabled === 0 ? 'Baseline configuration' : `${lab.enabled} optimization levers active`}</span>
                <span className="caption-right">{lab.surface === 'vscode' ? 'Monaco editor' : 'xterm terminal'} / local fixtures</span>
              </div>
            </div>
            <Inspector lab={lab} onMethodology={() => setDialog('methodology')} />
            <LeversPanel lab={lab} />
          </div>
        </div>
        {view === 'history' && <RunHistory lab={lab} onBack={() => setView('lab')} />}
      </main>

      <footer className="app-footer">
        <span><FlaskConical size={13} />An educational simulation, not the actual VS Code or Copilot CLI.</span>
        <button onClick={() => setDialog('methodology')}>Estimates, not benchmarks<ArrowRight size={12} /></button>
        <a href="https://aka.ms/ghcp-tkn-opt" target="_blank" rel="noreferrer">
          Built around the token optimization playbook<ExternalLink size={12} />
        </a>
      </footer>
      {presenter && (
        <button className="presenter-exit button" onClick={() => setPresenter(false)}>
          <Minimize2 size={15} />Exit presenter view
        </button>
      )}
      {lab.notice && <div className="toast" role="status"><Check size={16} /><span>{lab.notice}</span></div>}
      {dialog && (
        <LabDialogs
          key={dialog}
          type={dialog}
          lab={lab}
          onReset={() => {
            lab.reset()
            setTourStep(-1)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

export default App
