import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock,
  FlipVertical,
  GitBranch,
  HelpCircle,
  Layers,
  RefreshCcw,
  Zap,
  ShieldAlert,
} from 'lucide-react'

export const NODE_CATEGORIES = [
  {
    id: 'composite',
    title: 'Composite Nodes',
    items: [
      { type: 'selector', label: 'Selector', kind: 'composite', icon: GitBranch, defaultColor: 'blue' },
      { type: 'sequence', label: 'Sequence', kind: 'composite', icon: ArrowRight, defaultColor: 'emerald' },
      { type: 'parallel', label: 'Parallel', kind: 'composite', icon: Layers, defaultColor: 'cyan' },
    ],
  },
  {
    id: 'decorator',
    title: 'Decorator Nodes',
    items: [
      { type: 'inverter', label: 'Inverter', kind: 'decorator', icon: FlipVertical, defaultColor: 'amber' },
      { type: 'repeater', label: 'Repeater', kind: 'decorator', icon: RefreshCcw, defaultColor: 'rose' },
      { type: 'forceSuccess', label: 'Force Success', kind: 'decorator', icon: CircleCheck, defaultColor: 'emerald' },
      { type: 'forceFailure', label: 'Force Failure', kind: 'decorator', icon: CircleX, defaultColor: 'rose' },
      { type: 'interrupt', label: 'Interrupt', kind: 'decorator', icon: ShieldAlert } 
    ],
  },
  {
    id: 'leaf',
    title: 'Leaf Nodes',
    items: [
      { type: 'action', label: 'Action', kind: 'leaf', icon: Zap, defaultColor: 'cyan' },
      { type: 'condition', label: 'Condition', kind: 'leaf', icon: HelpCircle, defaultColor: 'slate' },
      { type: 'wait', label: 'Wait', kind: 'leaf', icon: Clock, defaultColor: 'amber' },
    ],
  },
]

export const NODE_LIBRARY = NODE_CATEGORIES.flatMap((c) => c.items)

export const NODE_TYPES = NODE_LIBRARY.map((n) => n.type)
