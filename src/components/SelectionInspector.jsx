import React from 'react'

const COLOR_PRESETS = [
  { key: 'emerald', swatch: 'bg-emerald-500 hover:bg-emerald-400' },
  { key: 'rose', swatch: 'bg-rose-500 hover:bg-rose-400' },
  { key: 'amber', swatch: 'bg-amber-500 hover:bg-amber-400' },
  { key: 'blue', swatch: 'bg-blue-500 hover:bg-blue-400' },
  { key: 'cyan', swatch: 'bg-cyan-500 hover:bg-cyan-400' },
  { key: 'slate', swatch: 'bg-slate-500 hover:bg-slate-400' },
]

export function SelectionInspector({
  selectedNodes,
  onColorChange,
  applyByType,
  onToggleApplyByType,
  onNodeDataChange,
  blackboard = [],
  onCreateMacro,
  onUnravelMacro,
  projects = [],
  currentProjectId = ''
}) {
  if (selectedNodes.length === 0) return null

  const firstSelected = selectedNodes[0]
  const showGroupLabel = selectedNodes.length > 1
  const isLeaf = firstSelected.data.kind === 'leaf'
  const isRoot = firstSelected.type === 'root'

  return (
    <div className="w-64 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500">Node Inspector</h3>
        <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
          {showGroupLabel ? `${selectedNodes.length} nodes selected` : firstSelected.data.label}
        </p>
      </div>

      {!isRoot && !showGroupLabel && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Theme Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onColorChange(preset.key)}
                className={[
                  'h-6 w-6 rounded-full border-2 transition-all transform hover:scale-110',
                  preset.swatch,
                  firstSelected.data.color === preset.key ? 'border-slate-800 dark:border-white shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'border-transparent',
                ].join(' ')}
                title={`Set ${preset.key}`}
              />
            ))}
          </div>
        </div>
      )}

      {showGroupLabel && (
        <div className="mt-2 flex flex-col gap-2">
          <button 
            onClick={onCreateMacro}
            className="w-full rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700/50 py-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 transition hover:bg-purple-200 dark:hover:bg-purple-800/60"
          >
            Package into Macro
          </button>
        </div>
      )}

      {!showGroupLabel && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3 flex flex-col gap-3">
          
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Node Label</p>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white rounded p-1.5 outline-none focus:border-cyan-500 transition-colors"
              value={firstSelected.data.label ?? ''}
              onChange={(e) => onNodeDataChange(firstSelected.id, 'label', e.target.value)}
              placeholder="E.g. Is Enemy Near?"
            />
          </div>

          {firstSelected.type === 'custom' && (
            <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-3">
              <button 
                onClick={() => onUnravelMacro(firstSelected)}
                className="w-full flex justify-center rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/50 py-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 transition hover:bg-amber-200 dark:hover:bg-amber-800/60"
              >
                Expand to Nodes
              </button>
            </div>
          )}

          {firstSelected.type === 'subtree' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Project</p>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.targetProjectId ?? ''}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'targetProjectId', e.target.value)}
              >
                <option value="">-- Select Project --</option>
                {projects.filter(p => p.id !== currentProjectId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {firstSelected.type === 'condition' && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/20 p-2">
              <label className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <input 
                  type="checkbox" 
                  checked={firstSelected.data.useBlackboard || false}
                  onChange={(e) => onNodeDataChange(firstSelected.id, 'useBlackboard', e.target.checked)}
                  className="rounded border-indigo-300 dark:border-indigo-500 bg-white dark:bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                Use Blackboard Variable
              </label>

              {firstSelected.data.useBlackboard ? (
                <div className="flex flex-col gap-2">
                  <select
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-indigo-400"
                    value={firstSelected.data.bbKey || ''}
                    onChange={(e) => onNodeDataChange(firstSelected.id, 'bbKey', e.target.value)}
                  >
                    <option value="">-- Select Variable --</option>
                    {blackboard.map(b => (
                      <option key={b.id} value={b.key}>{b.key}</option>
                    ))}
                  </select>
                  
                  <div className="flex gap-1">
                    <select
                      className="w-1/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-indigo-400"
                      value={firstSelected.data.bbOperator || '=='}
                      onChange={(e) => onNodeDataChange(firstSelected.id, 'bbOperator', e.target.value)}
                    >
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                    </select>
                    <input
                      type="text"
                      className="w-2/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-indigo-400"
                      placeholder="Target Value"
                      value={firstSelected.data.bbValue || ''}
                      onChange={(e) => onNodeDataChange(firstSelected.id, 'bbValue', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expected Output</p>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                    value={firstSelected.data.expectedOutput ?? 'SUCCESS'}
                    onChange={(e) => onNodeDataChange(firstSelected.id, 'expectedOutput', e.target.value)}
                  >
                    <option value="SUCCESS">Success</option>
                    <option value="FAILURE">Failure</option>
                    <option value="RUNNING">Running</option>
                  </select>
                </div>
              )}
            </div>
          )}
          
          {isLeaf && firstSelected.type !== 'condition' && firstSelected.type !== 'subtree' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Expected Output</p>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.expectedOutput ?? 'SUCCESS'}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'expectedOutput', e.target.value)}
              >
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="RUNNING">Running</option>
              </select>
            </div>
          )}

          {firstSelected.type === 'wait' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Wait Duration (ms)</p>
              <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500" value={firstSelected.data.waitDuration ?? 1000} onChange={(e) => onNodeDataChange(firstSelected.id, 'waitDuration', e.target.value)} />
            </div>
          )}

          {firstSelected.type === 'timeout' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timeout Limit (ms)</p>
              <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500" value={firstSelected.data.timeoutLimit ?? 3000} onChange={(e) => onNodeDataChange(firstSelected.id, 'timeoutLimit', e.target.value)} />
            </div>
          )}

          {firstSelected.type === 'repeater' && (
            <>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Repeat Mode</p>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500" value={firstSelected.data.repeatMode ?? 'until_success'} onChange={(e) => onNodeDataChange(firstSelected.id, 'repeatMode', e.target.value)}>
                  <option value="until_success">Until Success</option>
                  <option value="until_failure">Until Failure</option>
                  <option value="set_count">Set Number of Times</option>
                </select>
              </div>
              {firstSelected.data.repeatMode === 'set_count' && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Count</p>
                  <input type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500" value={firstSelected.data.repeatCount ?? 0} onChange={(e) => onNodeDataChange(firstSelected.id, 'repeatCount', e.target.value)} />
                </div>
              )}
            </>
          )}

        </div>
      )}

      {!showGroupLabel && !isRoot && firstSelected.type !== 'custom' && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white">
          <input
            type="checkbox"
            className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500"
            checked={applyByType}
            onChange={(e) => onToggleApplyByType(e.target.checked)}
          />
          Apply to all {firstSelected.data.label}s
        </label>
      )}

      {firstSelected.type === 'interrupt' && (
        <div>
          <p className="mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trigger Interrupt When</p>
          <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-200 rounded p-1 outline-none focus:border-cyan-500" value={firstSelected.data.interruptMode ?? 'SUCCESS'} onChange={(e) => onNodeDataChange(firstSelected.id, 'interruptMode', e.target.value)}>
            <option value="SUCCESS">Condition is SUCCESS</option>
            <option value="FAILURE">Condition is FAILURE</option>
          </select>
        </div>
      )}
    </div>
  )
}