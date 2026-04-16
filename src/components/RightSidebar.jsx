import React from 'react'
import { Terminal, Database, Plus, Trash2, ChevronsRight, ChevronsLeft } from 'lucide-react'

export function RightSidebar({
  isRightOpen,
  setIsRightOpen,
  logs, logEndRef, blackboard, setBlackboard, handleBlackboardUpdate
}) {
  
  if (!isRightOpen) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <button onClick={() => setIsRightOpen(true)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-cyan-400 shadow-xl transition-all hover:scale-105" title="Open Logs">
          <ChevronsLeft className="h-5 w-5" />
        </button>
      </div>
    )
  }

  const getLogColor = (type) => {
    if (type === 'SUCCESS') return 'text-green-600 dark:text-green-400'
    if (type === 'FAILURE') return 'text-red-600 dark:text-red-400'
    if (type === 'RUNNING') return 'text-amber-600 dark:text-amber-400'
    if (type === 'WARNING') return 'text-orange-600 dark:text-orange-400'
    return 'text-slate-600 dark:text-slate-300' 
  }

  return (
    <aside className="z-10 flex w-80 flex-col border-l border-slate-300 dark:border-blue-900/60 bg-white/90 dark:bg-slate-900/80 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4 shrink-0">
        <div className="flex items-center gap-2">
           <Terminal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
           <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Simulation Logs</h2>
        </div>
        <button onClick={() => setIsRightOpen(false)} className="text-slate-400 hover:text-cyan-400 transition-colors" title="Hide Sidebar">
           <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-600 text-center mt-10">Awaiting simulation...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1.5 flex gap-2 border-b border-slate-200 dark:border-slate-800/50 pb-1">
              <span className="shrink-0 text-slate-400 dark:text-slate-500">[{log.time}]</span>
              <span className={`break-words ${getLogColor(log.type)}`}>{log.msg}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      <div className="shrink-0 border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 p-4">
        <h2 className="flex items-center gap-2 mb-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <Database className="h-4 w-4" /> Blackboard
        </h2>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
          {blackboard.length === 0 && (
            <p className="text-xs text-indigo-400 dark:text-indigo-300/50 text-center py-2">No variables.</p>
          )}
          {blackboard.map((v) => (
            <div key={v.id} className="flex items-center gap-1">
              <input type="text" className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500" value={v.key} onChange={(e) => handleBlackboardUpdate(v.id, 'key', e.target.value)} placeholder="Key" />
              <span className="text-slate-500">=</span>
              <input type="text" className="w-1/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500" value={v.value} onChange={(e) => handleBlackboardUpdate(v.id, 'value', e.target.value)} placeholder="Value" />
              <button onClick={() => setBlackboard(b => b.filter(item => item.id !== v.id))} className="p-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setBlackboard(b => [...b, { id: `bb-${Date.now()}-${Math.random()}`, key: 'new_var', value: '0' }])} className="w-full flex items-center justify-center gap-2 rounded border border-indigo-300 dark:border-indigo-700/50 bg-indigo-100 dark:bg-indigo-900/30 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition">
          <Plus className="h-4 w-4" /> Add Variable
        </button>
      </div>
    </aside>
  )
}