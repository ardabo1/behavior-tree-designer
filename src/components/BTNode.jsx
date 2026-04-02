import { ArrowRight, FlipVertical, GitBranch, HelpCircle, RefreshCcw, Zap } from 'lucide-react'
import { Handle, Position } from 'reactflow'

const ICON_BY_TYPE = {
  sequence: ArrowRight,
  selector: GitBranch,
  repeater: RefreshCcw,
  inverter: FlipVertical,
  action: Zap,
  condition: HelpCircle,
}

const COLOR_STYLE = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
}

export function BTNode({ type, data, selected }) {
  const { label, kind, color = 'blue' } = data
  const Icon = ICON_BY_TYPE[type] ?? HelpCircle
  const canHaveChildren = kind !== 'leaf'
  
  const headerColor = COLOR_STYLE[color] ?? COLOR_STYLE.blue

  // Shape belirleme
  let shapeClass = 'rounded-md' // Composite varsayılan (Dikdörtgen)
  if (kind === 'decorator') shapeClass = 'rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm' // Çapraz köşeli
  if (kind === 'leaf') shapeClass = 'rounded-full px-4' // Kapsül (Pill)

  return (
    <div
      className={[
        'min-w-[180px] bg-slate-800 border-2 transition-all duration-200 flex flex-col overflow-hidden',
        shapeClass,
        selected 
          ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10' 
          : 'border-slate-600 shadow-md hover:border-slate-400'
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-200 !border-slate-800" />
      
      {/* Header Bandı */}
      <div className={['flex items-center gap-2 px-3 py-2 text-slate-50', headerColor, kind === 'leaf' ? 'justify-center' : ''].join(' ')}>
        <Icon className="h-4 w-4" />
        <div className="text-sm font-bold tracking-wider">{label}</div>
      </div>
      
      {/* Gövde kısmı - Sadece composite ve decorator'da gösteriyoruz kapsülü bozmamak için */}
      {kind !== 'leaf' && (
        <div className="bg-slate-800/90 px-3 py-2 text-center text-xs font-medium uppercase tracking-widest text-slate-400">
          {kind}
        </div>
      )}

      {canHaveChildren && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-200 !border-slate-800" />
      )}
    </div>
  )
}
