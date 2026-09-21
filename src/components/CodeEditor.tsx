import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import typescriptWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'

self.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    if (label === 'typescript' || label === 'javascript') return new typescriptWorker()
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}
loader.config({ monaco })
monaco.editor.defineTheme('token-lab', {
  base: 'vs-dark', inherit: true,
  rules: [{ token: 'comment', foreground: '8BA67D' }, { token: 'keyword', foreground: 'C69BD5' }, { token: 'number', foreground: 'B5CEA8' }],
  colors: { 'editor.background': '#1E1F22', 'editor.lineHighlightBackground': '#282A2E', 'editorLineNumber.foreground': '#949AA6', 'editor.selectionBackground': '#285A73' },
})

export default function CodeEditor({ value, onChange, path, readOnly = false }: { value: string; onChange?: (value: string) => void; path: string; readOnly?: boolean }) {
  return <Editor
    height="100%" theme="token-lab" path={path}
    language={path.endsWith('.md') ? 'markdown' : path.endsWith('.json') ? 'json' : 'typescript'}
    value={value} onChange={(next) => onChange?.(next ?? '')}
    loading={<div className="editor-loading">Opening editor...</div>}
    options={{
      readOnly, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 22,
      minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true,
      padding: { top: 16 }, lineNumbersMinChars: 3, glyphMargin: false, folding: false,
      wordWrap: 'on', tabSize: 2, renderLineHighlight: 'line', contextmenu: false,
      overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
      ariaLabel: `Code editor for ${path}`, tabFocusMode: true,
    }}
  />
}