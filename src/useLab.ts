import { useEffect, useRef, useState } from 'react'
import { allLevers, emptyLevers, scenarios, simulate } from './simulation'
import type { LeverId, Levers, Scenario, SessionMode, SimulationResult, Surface } from './simulation'

export interface RunRecord {
  id: number
  scenario: string
  surface: Surface
  prompt: string
  levers: Levers
  baseline: SimulationResult
  result: SimulationResult
  warmCache: boolean
  sessionMode: SessionMode
}

function initialConfiguration() {
  const query = new URLSearchParams(window.location.search)
  const levers = emptyLevers()
  for (const key of Object.keys(levers) as LeverId[]) levers[key] = query.get('levers')?.split(',').includes(key) ?? false
  return {
    scenario: scenarios.find((item) => item.id === query.get('scenario')) ?? scenarios[0],
    surface: (query.get('surface') === 'cli' ? 'cli' : 'vscode') as Surface,
    levers,
    warm: query.get('cache') === 'warm',
    session: (query.get('session') === 'compact' ? 'compact' : 'clear') as SessionMode,
  }
}

export function useLab() {
  const [initial] = useState(initialConfiguration)
  const [scenario, setScenario] = useState(initial.scenario)
  const [surface, setSurface] = useState<Surface>(initial.surface)
  const [levers, setLevers] = useState<Levers>(initial.levers)
  const [warmCache, setWarmCache] = useState(initial.warm)
  const [sessionMode, setSessionMode] = useState<SessionMode>(initial.session)
  const [prompt, setPrompt] = useState(initial.levers.scope ? initial.scenario.focusedPrompt : initial.scenario.prompt)
  const [code, setCode] = useState(initial.scenario.code)
  const [activeFile, setActiveFile] = useState(initial.scenario.file)
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(-1)
  const [response, setResponse] = useState<RunRecord | null>(null)
  const [notice, setNotice] = useState('')
  const [workspaceVersion, setWorkspaceVersion] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const serial = useRef(0)
  const baseline = simulate(scenario, emptyLevers(), { prompt })
  const result = simulate(scenario, levers, { prompt, warmCache, sessionMode })

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 4500)
    return () => clearTimeout(timeout)
  }, [notice])

  function stop() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setRunning(false)
    setStage(-1)
  }

  function setLever(key: LeverId, enabled: boolean) {
    if (running) return
    setLevers((current) => ({ ...current, [key]: enabled }))
    if (key === 'scope') setPrompt(enabled ? scenario.focusedPrompt : scenario.prompt)
  }

  function setPreset(optimized: boolean) {
    if (running) return
    setLevers(optimized ? allLevers() : emptyLevers())
    setPrompt(optimized ? scenario.focusedPrompt : scenario.prompt)
    if (!optimized) setWarmCache(false)
  }

  function selectScenario(next: Scenario) {
    stop()
    setScenario(next)
    setCode(next.code)
    setActiveFile(next.file)
    setPrompt(levers.scope ? next.focusedPrompt : next.prompt)
    setResponse(null)
  }

  function newChat(mode: SessionMode = 'clear') {
    if (running) return
    setLever('history', true)
    setSessionMode(mode)
    setResponse(null)
    setNotice(mode === 'clear' ? 'New conversation. Previous task history removed.' : 'Conversation compacted. A 1,200-token task summary remains.')
  }

  function run(overrides?: { prompt?: string; levers?: Levers }) {
    if (running) return
    const runPrompt = overrides?.prompt ?? prompt
    if (!runPrompt.trim()) { setNotice('Add a task prompt before running.'); return }
    const runLevers = overrides?.levers ?? levers
    setPrompt(runPrompt)
    setLevers(runLevers)
    const record: RunRecord = {
      id: ++serial.current, scenario: scenario.id, surface, prompt: runPrompt, levers: { ...runLevers },
      baseline: simulate(scenario, emptyLevers(), { prompt: runPrompt }),
      result: simulate(scenario, runLevers, { prompt: runPrompt, warmCache, sessionMode }), warmCache, sessionMode,
    }
    setResponse(null)
    setStage(0)
    setRunning(true)
    let nextStage = 0
    timer.current = setInterval(() => {
      nextStage++
      if (nextStage < record.result.trace.length) setStage(nextStage)
      else {
        stop()
        setRuns((current) => [...current, record])
        setResponse(record)
      }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 300)
  }

  function reset() {
    stop()
    setWorkspaceVersion((current) => current + 1)
    setLevers(emptyLevers())
    setWarmCache(false)
    setSessionMode('clear')
    setPrompt(scenario.prompt)
    setCode(scenario.code)
    setActiveFile(scenario.file)
    setResponse(null)
    setRuns([])
    setNotice('Demo reset. All levers are off.')
  }

  const enabled = Object.values(levers).filter(Boolean).length
  const applied = code === scenario.fixedCode

  return { scenario, surface, setSurface, levers, setLever, setPreset, warmCache, setWarmCache,
    sessionMode, setSessionMode, prompt, setPrompt, code, setCode, activeFile, setActiveFile,
    runs, running, stage, response, notice, setNotice, baseline, result, enabled, applied, workspaceVersion,
    run, stop, reset, selectScenario, newChat }
}

export type Lab = ReturnType<typeof useLab>