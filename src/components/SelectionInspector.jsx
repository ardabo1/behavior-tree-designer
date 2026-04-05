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
}) {
  if (selectedNodes.length === 0) return null

  const firstSelected = selectedNodes[0]
  const showGroupLabel = selectedNodes.length > 1
  const isLeaf = firstSelected.data.kind === 'leaf'
  const isRoot = firstSelected.type === 'root'

  return (
    <div className="w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500">Node Inspector</h3>
        <p className="mt-1 text-sm font-medium text-slate-200">
          {showGroupLabel ? `${selectedNodes.length} nodes selected` : firstSelected.data.label}
        </p>
      </div>

      {!isRoot && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Theme Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onColorChange(preset.key)}
                className={[
                  'h-6 w-6 rounded-full border-2 transition-all transform hover:scale-110',
                  preset.swatch,
                  firstSelected.data.color === preset.key ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'border-transparent',
                ].join(' ')}
                title={`Set ${preset.key}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* DİNAMİK PARAMETRE ALANLARI */}
      {!showGroupLabel && (
        <div className="mt-4 border-t border-slate-700 pt-3 flex flex-col gap-3">
          
          {/* YENİ EKLENEN: Her Node İçin Label (İsim) Değiştirme Alanı */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400">Node Label</p>
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-slate-600 text-sm text-white rounded p-1.5 outline-none focus:border-cyan-500 transition-colors"
              value={firstSelected.data.label ?? ''}
              onChange={(e) => onNodeDataChange(firstSelected.id, 'label', e.target.value)}
              placeholder="E.g. Is Enemy Near?"
            />
          </div>
          
          {/* Leaf için Expected Output */}
          {isLeaf && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Expected Output</p>
              <select
                className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.expectedOutput ?? 'SUCCESS'}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'expectedOutput', e.target.value)}
              >
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="RUNNING">Running</option>
              </select>
            </div>
          )}

          {/* Wait Node Süresi */}
          {firstSelected.type === 'wait' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Wait Duration (ms)</p>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.waitDuration ?? 1000}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'waitDuration', e.target.value)}
              />
            </div>
          )}

          {/* Timeout Node Sınırı */}
          {firstSelected.type === 'timeout' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Timeout Limit (ms)</p>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.timeoutLimit ?? 3000}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'timeoutLimit', e.target.value)}
              />
            </div>
          )}

          {/* Repeater Ayarları */}
          {firstSelected.type === 'repeater' && (
            <>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Repeat Mode</p>
                <select
                  className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                  value={firstSelected.data.repeatMode ?? 'until_success'}
                  onChange={(e) => onNodeDataChange(firstSelected.id, 'repeatMode', e.target.value)}
                >
                  <option value="until_success">Until Success</option>
                  <option value="until_failure">Until Failure</option>
                  <option value="set_count">Set Number of Times</option>
                </select>
              </div>
              {firstSelected.data.repeatMode === 'set_count' && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Count (0 = Infinite)</p>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                    value={firstSelected.data.repeatCount ?? 0}
                    onChange={(e) => onNodeDataChange(firstSelected.id, 'repeatCount', e.target.value)}
                  />
                </div>
              )}
            </>
          )}

        </div>
      )}

      {!showGroupLabel && !isRoot && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300 transition hover:text-white">
          <input
            type="checkbox"
            className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            checked={applyByType}
            onChange={(e) => onToggleApplyByType(e.target.checked)}
          />
          Apply to all {firstSelected.data.label}s
        </label>
      )}

      {firstSelected.type === 'interrupt' && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Trigger Interrupt When</p>
              <select
                className="w-full bg-slate-800 border border-slate-600 text-sm text-slate-200 rounded p-1 outline-none focus:border-cyan-500"
                value={firstSelected.data.interruptMode ?? 'SUCCESS'}
                onChange={(e) => onNodeDataChange(firstSelected.id, 'interruptMode', e.target.value)}
              >
                <option value="SUCCESS">Condition is SUCCESS</option>
                <option value="FAILURE">Condition is FAILURE</option>
              </select>
              <p className="mt-2 text-[10px] text-slate-500 leading-tight">
                Connect exactly 2 children: First child is the Condition, Second child is the Action to be interrupted.
              </p>
            </div>
          )}
      
    </div>
  )
}