import React from 'react'
import { Panel } from 'reactflow'
import { Pause, Play, Square } from 'lucide-react'

export function TopSimulationBar({
  isPlaying,
  handlePlayPause,
  handleStop,
  tickSpeedMs,
  setTickSpeedMs
}) {
  return (
    <Panel position="top-center" className="mt-3">
      <div className="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-2 shadow-xl backdrop-blur-md">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Simulation</span>
        <button 
          type="button" 
          onClick={handlePlayPause} 
          className="rounded-lg border border-cyan-300 dark:border-cyan-700/60 bg-cyan-100 dark:bg-cyan-900/40 p-2 text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-200 dark:hover:bg-cyan-800/50" 
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
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
            type="range" 
            min={200} 
            max={2000} 
            step={50} 
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