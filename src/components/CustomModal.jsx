import React from 'react'

export function CustomModal({ modal, handleModalAction }) {
  if (!modal.isOpen) return null

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="w-[400px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5">
        <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-2">{modal.title}</h3>
        {modal.message && <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{modal.message}</p>}
        {modal.type === 'prompt' && (
          <input
            autoFocus
            id="custom-modal-input"
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 mb-4 transition-colors"
            defaultValue={modal.defaultValue}
            onKeyDown={(e) => { if(e.key === 'Enter') handleModalAction(true) }}
          />
        )}
        <div className="flex justify-end gap-2">
          {modal.type !== 'alert' && (
            <button onClick={() => handleModalAction(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition">Cancel</button>
          )}
          <button onClick={() => handleModalAction(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition">
            {modal.type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}