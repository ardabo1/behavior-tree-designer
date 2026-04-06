import React from 'react'
import { Search, X } from 'lucide-react'

export function SearchModal({
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  filteredSearchNodes,
  focusOnNode
}) {
  if (!isSearchOpen) return null

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}>
      <div className="w-[500px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 p-4">
          <Search className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
          <input 
            ref={searchInputRef} 
            type="text" 
            placeholder="Search nodes..." 
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 outline-none" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && filteredSearchNodes.length > 0) focusOnNode(filteredSearchNodes[0]) }} 
          />
          <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {searchQuery && (
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredSearchNodes.length === 0 ? (
              <p className="p-3 text-center text-sm text-slate-500">No nodes found matching "{searchQuery}"</p>
            ) : (
              filteredSearchNodes.map(node => (
                <button key={node.id} onClick={() => focusOnNode(node)} className="w-full flex items-center justify-between rounded-lg p-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{node.data.label}</span>
                  <span className="text-xs uppercase tracking-wider text-slate-500">{node.type}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}