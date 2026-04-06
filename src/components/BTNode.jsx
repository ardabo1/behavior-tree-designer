import {
  ArrowRight, CircleCheck, CircleX, Clock, FlipVertical, GitBranch,
  HelpCircle, Layers, RefreshCcw, Zap, PlaySquare, Timer, ShieldAlert, Package, Network
} from 'lucide-react'
import { Handle, Position } from 'reactflow'

const ICON_BY_TYPE = {
  root: PlaySquare,
  sequence: ArrowRight,
  selector: GitBranch,
  parallel: Layers,
  repeater: RefreshCcw,
  inverter: FlipVertical,
  forceSuccess: CircleCheck,
  forceFailure: CircleX,
  timeout: Timer,
  interrupt: ShieldAlert,
  custom: Package, 
  subtree: Network,
  action: Zap,
  condition: HelpCircle,
  wait: Clock,
}

const COLOR_STYLE = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
  purple: 'bg-purple-600', 
}

const RUN_STATE_RING = {
  IDLE: '',
  RUNNING: 'shadow-[0_0_18px_rgba(251,191,36,0.75)] ring-2 ring-amber-400/90',
  SUCCESS: 'shadow-[0_0_18px_rgba(74,222,128,0.8)] ring-2 ring-green-400/90',
  FAILURE: 'shadow-[0_0_20px_rgba(248,113,113,0.85)] ring-2 ring-red-400/90',
}

export function BTNode({ type, data, selected }) {
  const { label, kind, color = 'blue', runState = 'IDLE' } = data
  const Icon = ICON_BY_TYPE[type] ?? HelpCircle
  const canHaveChildren = kind !== 'leaf'
  const isRoot = type === 'root'

  const headerColor = isRoot ? 'bg-indigo-600' : (COLOR_STYLE[color] ?? COLOR_STYLE.blue)
  const runRing = RUN_STATE_RING[runState] ?? RUN_STATE_RING.IDLE

  let shapeClass = 'rounded-md'
  if (kind === 'decorator') shapeClass = 'rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm'
  if (kind === 'leaf') shapeClass = 'rounded-full px-4'
  if (type === 'custom' || type === 'subtree') shapeClass = 'rounded-xl border-dashed border-[3px] border-slate-400 dark:border-slate-500' 
  if (isRoot) shapeClass = 'rounded-lg border-indigo-400 border-2'

  return (
    <div
      className={[
        'min-w-[180px] border-2 transition-all duration-200 flex flex-col overflow-hidden',
        'bg-white dark:bg-slate-800', 
        shapeClass,
        selected ? 'border-cyan-500 dark:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10' : (isRoot ? '' : 'border-slate-300 dark:border-slate-600 shadow-md'),
        runState !== 'IDLE' ? runRing : '',
      ].join(' ')}
    >
      {!isRoot && (
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-slate-300 dark:!bg-slate-200 !border-slate-500 dark:!border-slate-800" />
      )}

      <div className={['flex items-center gap-2 px-3 py-2 text-white', headerColor, kind === 'leaf' ? 'justify-center' : ''].join(' ')}>
        <Icon className="h-4 w-4 shrink-0" />
        <div className="text-sm font-bold tracking-wider">{label}</div>
      </div>

      {kind !== 'leaf' && !isRoot && (
        <div className="bg-slate-100 dark:bg-slate-800/90 px-3 py-2 text-center text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {kind}
        </div>
      )}

      {canHaveChildren && (
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-slate-300 dark:!bg-slate-200 !border-slate-500 dark:!border-slate-800" />
      )}
    </div>
  )
}