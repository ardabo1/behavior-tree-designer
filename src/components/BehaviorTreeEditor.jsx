import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css' // BU SATIR ÇOK ÖNEMLİ (React Flow stilleri için)
import {
  ArrowRight,
  FlipVertical,
  GitBranch,
  HelpCircle,
  RefreshCcw,
  Zap,
} from 'lucide-react'
import { BTNode } from './BTNode'
import { SelectionInspector } from './SelectionInspector'

const NODE_LIBRARY = [
  { type: 'selector', label: 'Selector', kind: 'composite', icon: GitBranch, defaultColor: 'blue' },
  { type: 'sequence', label: 'Sequence', kind: 'composite', icon: ArrowRight, defaultColor: 'emerald' },
  { type: 'inverter', label: 'Inverter', kind: 'decorator', icon: FlipVertical, defaultColor: 'amber' },
  { type: 'repeater', label: 'Repeater', kind: 'decorator', icon: RefreshCcw, defaultColor: 'rose' },
  { type: 'action', label: 'Action', kind: 'leaf', icon: Zap, defaultColor: 'cyan' },
  { type: 'condition', label: 'Condition', kind: 'leaf', icon: HelpCircle, defaultColor: 'slate' },
]

const INITIAL_NODES = [
  {
    id: 'root-sequence',
    type: 'sequence',
    position: { x: 460, y: 90 },
    data: NODE_LIBRARY.find((node) => node.type === 'sequence'),
  },
]

// ... (canConnect ve buildNestedTree fonksiyonları senin yazdığın haliyle aynı kalabilir, burayı kısaltıyorum)
function canConnect(connection, nodes, edges) {
  const { source, target } = connection
  if (!source || !target || source === target) return false
  const sourceNode = nodes.find((node) => node.id === source)
  const targetNode = nodes.find((node) => node.id === target)
  if (!sourceNode || !targetNode || sourceNode.data.kind === 'leaf') return false
  const targetHasParent = edges.some((edge) => edge.target === target)
  if (targetHasParent || sourceNode.position.y >= targetNode.position.y) return false
  return true
}

export function BehaviorTreeEditor() {
  const wrapperRef = useRef(null)
  const idRef = useRef(1)
  const [applyByType, setApplyByType] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { project } = useReactFlow()

  // Node tiplerini useMemo ile tanımlıyoruz
  const nodeTypes = useMemo(() => {
    return NODE_LIBRARY.reduce((acc, node) => {
      acc[node.type] = BTNode
      return acc
    }, {})
  }, [])

  const createNode = useCallback((item, position) => {
    const id = `${item.type}-${idRef.current++}`
    return {
      id,
      type: item.type,
      position,
      data: { ...item, color: item.defaultColor ?? 'blue' },
    }
  }, [])

  const addNodeFromSidebar = useCallback((item) => {
    const xOffset = (nodes.length % 4) * 220
    const yOffset = Math.floor(nodes.length / 4) * 150
    const newNode = createNode(item, { x: 80 + xOffset, y: 100 + yOffset })
    setNodes((prev) => [...prev, newNode])
  }, [createNode, nodes.length, setNodes])

  const onDragStart = useCallback((event, item) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    const bounds = wrapperRef.current?.getBoundingClientRect()
    if (!bounds) return
    const payload = event.dataTransfer.getData('application/reactflow')
    if (!payload) return
    const item = JSON.parse(payload)
    const position = project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
    setNodes((prev) => [...prev, createNode(item, position)])
  }, [createNode, project, setNodes])

  const onConnect = useCallback((connection) => {
    if (!canConnect(connection, nodes, edges)) return
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds))
  }, [edges, nodes, setEdges])

  // Renk değişimi tetikleyicisi
  const handleInspectorColorChange = useCallback((color) => {
    const selectedNodes = nodes.filter(n => n.selected)
    if (selectedNodes.length === 0) return

    setNodes((prevNodes) => prevNodes.map((node) => {
      const isSelected = node.selected
      const isSameType = applyByType && selectedNodes.length === 1 && node.type === selectedNodes[0].type
      
      if (isSelected || isSameType) {
        return { ...node, data: { ...node.data, color } }
      }
      return node
    }))
  }, [nodes, applyByType, setNodes])

  const selectedNodes = nodes.filter((node) => node.selected)

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans">
      <aside className="w-72 border-r border-blue-900/60 bg-slate-900/80 p-4 z-10 shadow-xl">
        <h1 className="mb-1 text-lg font-bold text-slate-100">Node Library</h1>
        <p className="mb-6 text-xs text-slate-400">Click or drag nodes into the canvas.</p>
        <div className="space-y-3">
          {NODE_LIBRARY.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(event) => onDragStart(event, item)}
                onClick={() => addNodeFromSidebar(item)}
                className="flex w-full items-center justify-between rounded-lg border border-blue-800/50 bg-slate-800/50 px-4 py-3 text-left text-sm transition hover:border-cyan-500 hover:bg-slate-700/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                <span className="font-medium">{item.label}</span>
                <Icon className="h-4 w-4 text-cyan-400" />
              </button>
            )
          })}
        </div>
      </aside>

      <main ref={wrapperRef} className="h-full flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']} // Seçili nodeları silme
          selectionKeyCode="Shift" // Shift + Sol Tık sürükleme ile Lasso çoklu seçim
          panOnDrag={true} // Sol tık normal sürükleme ile kaydırma
          selectionMode={SelectionMode.Partial}
          fitView
          defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 2 } }}
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          <Controls className="!bg-slate-800 !border-blue-900 !fill-slate-200 shadow-lg" />
          
          {selectedNodes.length > 0 && (
            <Panel position="bottom-left" className="ml-14 mb-4">
              <SelectionInspector
                selectedNodes={selectedNodes}
                onColorChange={handleInspectorColorChange}
                applyByType={applyByType}
                onToggleApplyByType={setApplyByType}
              />
            </Panel>
          )}
          
          <MiniMap nodeColor="#334155" maskColor="rgba(2, 6, 23, 0.8)" style={{ backgroundColor: '#0f172a', border: '1px solid #1e3a8a' }} />
        </ReactFlow>
      </main>
    </div>
  )
}