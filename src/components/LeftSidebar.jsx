import React from 'react'
import { Search, FolderPlus, Edit2, Trash2, Package, Download, Upload, Camera } from 'lucide-react'
import { NODE_CATEGORIES } from '../lib/nodeLibrary'

export function LeftSidebar({
  projects,
  currentProjectId,
  setCurrentProjectId,
  handleNewProject,
  handleRenameProject,
  handleDeleteProject,
  setIsSearchOpen,
  searchInputRef,
  macros,
  handleDeleteMacro,
  onDragStart,
  addNodeFromSidebar,
  handleExportJSON,
  triggerFileInput,
  fileInputRef,
  handleImportJSON,
  handleExportPNG,
  handleClearBoard
}) {
  return (
    <aside className="z-10 flex w-72 flex-col border-r border-slate-300 dark:border-blue-900/60 bg-white/90 dark:bg-slate-900/80 p-4 shadow-xl">
      <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Project</h1>
        <div className="flex gap-1">
          <select
            className="min-w-0 flex-1 truncate bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-500"
            value={currentProjectId}
            onChange={(e) => setCurrentProjectId(e.target.value)}
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={handleNewProject} className="shrink-0 p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-300 dark:border-indigo-700/50 hover:bg-indigo-200 dark:hover:bg-indigo-800" title="New Project"><FolderPlus className="h-4 w-4"/></button>
          <button onClick={handleRenameProject} className="shrink-0 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700" title="Rename"><Edit2 className="h-4 w-4"/></button>
          <button onClick={handleDeleteProject} className="shrink-0 p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded border border-red-300 dark:border-red-700/50 hover:bg-red-200 dark:hover:bg-red-800" title="Delete"><Trash2 className="h-4 w-4"/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Node Library</h2>
          <button onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }} className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 dark:text-slate-400 transition hover:text-cyan-500 dark:hover:text-cyan-400" title="Search (Cmd+K)"><Search className="h-4 w-4" /></button>
        </div>

        <details className="group rounded-lg border border-purple-300 dark:border-purple-700/80 bg-purple-50 dark:bg-purple-900/20 mb-2" open>
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 marker:text-purple-600 dark:marker:text-purple-500">
            Custom Macros
          </summary>
          <div className="space-y-2 border-t border-purple-200 dark:border-purple-700/80 p-2">
            {macros.length === 0 ? (
              <p className="text-xs text-purple-400 dark:text-purple-300/50 text-center py-2">No macros yet.</p>
            ) : (
              macros.map((macro) => (
                <div
                  key={macro.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow-macro', JSON.stringify(macro))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="group/macro flex w-full cursor-grab active:cursor-grabbing items-center justify-between rounded-lg border border-purple-300 dark:border-purple-800/50 bg-purple-100 dark:bg-purple-900/40 px-3 py-2 text-left text-sm transition hover:border-purple-500 dark:hover:border-purple-400"
                >
                  <div className="flex flex-1 items-center gap-2 pointer-events-none">
                    <Package className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-purple-800 dark:text-purple-100 truncate">{macro.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteMacro(macro.id, e)}
                    className="p-1 text-purple-400 hover:text-red-500 dark:text-purple-400/40 dark:hover:text-red-400 transition-all opacity-0 group-hover/macro:opacity-100"
                    title="Delete Macro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </details>
        
        <div className="space-y-2">
          {NODE_CATEGORIES.map((category) => (
            <details key={category.id} className="group rounded-lg border border-slate-300 dark:border-slate-700/80 bg-slate-100/50 dark:bg-slate-800/40" open>
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 marker:text-cyan-600 dark:marker:text-cyan-500">{category.title}</summary>
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700/80 p-2">
                {category.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.type} type="button" draggable onDragStart={(e) => onDragStart(e, item)} onClick={() => addNodeFromSidebar(item)} className="flex w-full items-center justify-between rounded-lg border border-slate-300 dark:border-blue-800/50 bg-white dark:bg-slate-800/50 px-3 py-2.5 text-left text-sm transition hover:border-cyan-500 dark:hover:border-cyan-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white"><span className="font-medium">{item.label}</span><Icon className="h-4 w-4 shrink-0 text-cyan-500 dark:text-cyan-400" /></button>
                  )
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-4 shrink-0 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="flex gap-2">
          <button onClick={handleExportJSON} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700/60 bg-blue-100 dark:bg-blue-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 transition hover:bg-blue-200 dark:hover:bg-blue-800/50"><Download className="h-4 w-4" /> Save</button>
          <button onClick={triggerFileInput} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700/60 bg-blue-100 dark:bg-blue-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 transition hover:bg-blue-200 dark:hover:bg-blue-800/50"><Upload className="h-4 w-4" /> Load</button>
          <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportPNG} className="flex w-1/3 items-center justify-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-200 dark:hover:bg-emerald-800/50" title="Export as PNG"><Camera className="h-4 w-4" /></button>
            <button onClick={handleClearBoard} className="flex w-2/3 items-center justify-center gap-2 rounded-lg border border-red-300 dark:border-red-800/60 bg-red-100 dark:bg-red-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 transition hover:bg-red-200 dark:hover:bg-red-900/50"><Trash2 className="h-4 w-4" /> Clear</button>
        </div>
      </div>
    </aside>
  )
}