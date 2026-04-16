import React, { useState, useRef, useEffect } from 'react'
import { Panel } from 'reactflow'
import { Pause, Play, Square, ChevronDown } from 'lucide-react'

export function TopSimulationBar({
  isPlaying,
  handlePlayPause,
  handleStop,
  tickSpeedMs,
  setTickSpeedMs,
  selectedNodes
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Sadece Sequence, Selector veya Parallel seçiliyse menüyü aktif et
  const selectedComposite = selectedNodes?.length === 1 &&
    ['sequence', 'selector', 'parallel'].includes(selectedNodes[0].type.toLowerCase())
    ? selectedNodes[0] : null;

  // Dışarı tıklayınca menüyü kapatma
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onPlayClick = () => {
    if (!isPlaying && selectedComposite) {
      setIsMenuOpen(!isMenuOpen)
    } else {
      handlePlayPause()
    }
  }

  return (
    <Panel position="top-center" className="mt-3">
      <div className="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-2 shadow-xl backdrop-blur-md">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Simulation</span>
        
        {/* Play Menu Container */}
        <div className="relative flex items-center" ref={menuRef}>
          <button 
            type="button" 
            onClick={onPlayClick} 
            className="flex items-center justify-center gap-1 rounded-lg border border-cyan-300 dark:border-cyan-700/60 bg-cyan-100 dark:bg-cyan-900/40 px-3 py-2 text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-200 dark:hover:bg-cyan-800/50" 
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {(!isPlaying && selectedComposite) && <ChevronDown className="h-3 w-3 ml-1 opacity-70" />}
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
             <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl py-2 z-50 overflow-hidden">
                <button 
                  onClick={() => { setIsMenuOpen(false); handlePlayPause(); }} 
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-cyan-900/60 hover:text-cyan-300 transition-colors"
                >
                  Run the Tree
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); handlePlayPause(selectedComposite.id); }} 
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-cyan-900/60 hover:text-cyan-300 transition-colors"
                >
                  Run the Branch <span className="text-xs text-slate-500 block">({selectedComposite.data.label})</span>
                </button>
             </div>
          )}
        </div>

        <button 
          type="button" 
          onClick={handleStop} 
          className="rounded-lg border border-red-300 dark:border-red-800/60 bg-red-100 dark:bg-red-950/50 p-2 text-red-700 dark:text-red-300 transition hover:bg-red-200 dark:hover:bg-red-900/50" 
          title="Stop & Reset"
        >
          <Square className="h-4 w-4" />
        </button>
        <label className="ml-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="whitespace-nowrap">Speed</span>
          <input 
            type="range" min={200} max={2000} step={50} 
            value={tickSpeedMs} 
            onChange={(e) => setTickSpeedMs(Number(e.target.value))} 
            className="h-1 w-28 cursor-pointer accent-cyan-500" 
          />
          <span className="w-12 tabular-nums text-slate-500 dark:text-slate-400">{tickSpeedMs}ms</span>
        </label>
      </div>
    </Panel>
  )
}