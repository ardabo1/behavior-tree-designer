import React from 'react'

const COLOR_PRESETS = [
  { key: 'emerald', swatch: 'bg-emerald-500 hover:bg-emerald-400' },
  { key: 'rose', swatch: 'bg-rose-500 hover:bg-rose-400' },
  { key: 'amber', swatch: 'bg-amber-500 hover:bg-amber-400' },
  { key: 'blue', swatch: 'bg-blue-500 hover:bg-blue-400' },
  { key: 'cyan', swatch: 'bg-cyan-500 hover:bg-cyan-400' },
  { key: 'slate', swatch: 'bg-slate-500 hover:bg-slate-400' },
]

export function SelectionInspector({ selectedNodes, onColorChange, applyByType, onToggleApplyByType }) {
  if (selectedNodes.length === 0) return null

  const firstSelected = selectedNodes[0]
  const showGroupLabel = selectedNodes.length > 1

  return (
    <div className="w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-500">
          Node Inspector
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-200">
          {showGroupLabel ? `${selectedNodes.length} nodes selected` : firstSelected.data.label}
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Theme Color
        </p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onColorChange(preset.key)}
              className={[
                'h-6 w-6 rounded-full border-2 transition-all transform hover:scale-110',
                preset.swatch,
                firstSelected.data.color === preset.key 
                  ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
                  : 'border-transparent'
              ].join(' ')}
              title={`Set ${preset.key}`}
            />
          ))}
        </div>
      </div>

      {!showGroupLabel && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300 transition hover:text-white">
          <input
            type="checkbox"
            className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            checked={applyByType}
            onChange={(event) => onToggleApplyByType(event.target.checked)}
          />
          Apply to all {firstSelected.data.label}s
        </label>
      )}
    </div>
  )
}