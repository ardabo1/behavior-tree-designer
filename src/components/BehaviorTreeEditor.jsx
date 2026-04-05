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
import 'reactflow/dist/style.css'
import { Pause, Play, Square, Download, Upload, Trash2 } from 'lucide-react'
import { BTNode } from './BTNode'
import { SelectionInspector } from './SelectionInspector'
import { TickEdge } from './TickEdge'
import { NODE_CATEGORIES, NODE_LIBRARY } from '../lib/nodeLibrary'

const INITIAL_NODES = [
  {
    id: 'root-node',
    type: 'root',
    position: { x: 460, y: 50 },
    deletable: false, // Root silinemez
    data: {
      label: 'ROOT',
      kind: 'root',
      color: 'slate',
      runState: 'IDLE',
    },
  },
]

function canConnect(connection, nodes, edges) {
  const { source, target } = connection
  if (!source || !target || source === target) return false
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)
  
  if (!sourceNode || !targetNode || sourceNode.data.kind === 'leaf') return false
  if (targetNode.type === 'root') return false
  
  if (sourceNode.type === 'root') {
    const rootHasChild = edges.some((e) => e.source === source)
    if (rootHasChild) return false
  }

  if (edges.some((e) => e.target === target)) return false
  if (sourceNode.position.y >= targetNode.position.y) return false
  return true
}

export function BehaviorTreeEditor() {
  const wrapperRef = useRef(null)
  const idRef = useRef(1)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const fileInputRef = useRef(null)
  
  // YENİ: Kopyalama Panosu ve Undo/Redo Geçmişi
  const clipboardRef = useRef({ nodes: [], edges: [] })
  const historyRef = useRef({ past: [], future: [] })
  
  const simRef = useRef({ paused: false, stopped: false, running: false })
  const tickSpeedRef = useRef(800)

  const [applyByType, setApplyByType] = useState(false)
  const [tickSpeedMs, setTickSpeedMs] = useState(800)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const initialData = useMemo(() => {
    try {
      const savedNodes = localStorage.getItem('bt-nodes')
      const savedEdges = localStorage.getItem('bt-edges')
      return {
        nodes: savedNodes ? JSON.parse(savedNodes) : INITIAL_NODES,
        edges: savedEdges ? JSON.parse(savedEdges) : []
      }
    } catch (error) {
      console.error("Local storage error, falling back to defaults", error)
      return { nodes: INITIAL_NODES, edges: [] }
    }
  }, [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges)

  const { project } = useReactFlow()

  // Ref'leri güncel tut
  nodesRef.current = nodes
  edgesRef.current = edges
  tickSpeedRef.current = tickSpeedMs

  // YENİ: State değişmeden hemen önce anlık görüntü alan fonksiyon (Undo için)
  const takeSnapshot = useCallback(() => {
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    }
    
    const past = historyRef.current.past
    if (past.length > 0) {
        const lastState = past[past.length - 1]
        // Eğer hiçbir şey değişmediyse boşuna snapshot alma
        if (JSON.stringify(lastState) === JSON.stringify(currentState)) return
    }

    past.push(currentState)
    historyRef.current.future = [] // Yeni bir işlem yapılınca ileri al (Redo) listesi sıfırlanır
    if (past.length > 50) past.shift() // Maksimum 50 adım geri alınabilsin (Performans için)
  }, [])

  useEffect(() => {
    localStorage.setItem('bt-nodes', JSON.stringify(nodes))
    localStorage.setItem('bt-edges', JSON.stringify(edges))
    
    let maxId = 1
    nodes.forEach(n => {
        const match = n.id.match(/-(\d+)$/)
        if (match) {
            const num = parseInt(match[1], 10)
            if (num >= maxId) maxId = num + 1
        }
    })
    idRef.current = maxId
  }, [nodes, edges])

  // --- YENİ: KLAVYE KISAYOLLARI (Undo, Redo, Copy, Paste) ---
  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return
    const previousState = historyRef.current.past.pop()
    
    historyRef.current.future.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    })
    
    setNodes(previousState.nodes)
    setEdges(previousState.edges)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return
    const nextState = historyRef.current.future.pop()
    
    historyRef.current.past.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current))
    })
    
    setNodes(nextState.nodes)
    setEdges(nextState.edges)
  }, [setNodes, setEdges])

  const handleCopy = useCallback(() => {
    // Sadece seçili olanları al (Root kopyalanamaz)
    const selectedNodes = nodesRef.current.filter(n => n.selected && n.type !== 'root')
    if (selectedNodes.length === 0) return

    // Seçilen node'lar arasındaki kenarları (edge) da kopyala
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
    const selectedEdges = edgesRef.current.filter(e => 
      selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    )

    clipboardRef.current = { nodes: selectedNodes, edges: selectedEdges }
  }, [])

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current.nodes.length) return
    takeSnapshot() // Yapıştırmadan önce geri almak için snapshot al

    const newNodes = []
    const newEdges = []
    const idMap = {} // Eski ID'yi yeni ID'ye eşlemek için

    clipboardRef.current.nodes.forEach(node => {
      const newId = `${node.type}-${idRef.current++}`
      idMap[node.id] = newId

      newNodes.push({
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 }, // Üst üste binmemesi için hafif kaydır
        selected: true // Yapıştırılanları otomatik seç
      })
    })

    clipboardRef.current.edges.forEach(edge => {
      newEdges.push({
        ...edge,
        id: `e${idMap[edge.source]}-${idMap[edge.target]}`,
        source: idMap[edge.source],
        target: idMap[edge.target],
        selected: true
      })
    })

    // Mevcut seçimleri iptal et ve yenilerini ekle
    setNodes(prev => prev.map(n => ({ ...n, selected: false })).concat(newNodes))
    setEdges(prev => prev.map(e => ({ ...e, selected: false })).concat(newEdges))
  }, [takeSnapshot, setNodes, setEdges])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Kullanıcı input (isim, süre vs.) giriyorsa kısayolları iptal et
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === 'c') handleCopy()
        else if (key === 'v') handlePaste()
        else if (key === 'z') {
          if (e.shiftKey) redo() // Ctrl+Shift+Z
          else undo() // Ctrl+Z
        }
        else if (key === 'y') redo() // Ctrl+Y
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCopy, handlePaste, undo, redo])


  const edgeTypes = useMemo(() => ({ tick: TickEdge }), [])
  const nodeTypes = useMemo(() => {
    const types = NODE_LIBRARY.reduce((acc, node) => {
      acc[node.type] = BTNode
      return acc
    }, {})
    types['root'] = BTNode
    return types
  }, [])

  const createNode = useCallback((item, position) => {
    const id = `${item.type}-${idRef.current++}`
    return {
      id,
      type: item.type,
      position,
      data: {
        label: item.label,
        kind: item.kind,
        color: item.defaultColor ?? 'blue',
        runState: 'IDLE',
        expectedOutput: 'SUCCESS',
        waitDuration: 1000,
        timeoutLimit: 3000,
        interruptMode: 'SUCCESS',
        repeatMode: 'until_success',
        repeatCount: 0
      },
    }
  }, [])

  const addNodeFromSidebar = useCallback((item) => {
    takeSnapshot()
    const xOffset = (nodes.length % 4) * 220
    const yOffset = Math.floor(nodes.length / 4) * 150
    const newNode = createNode(item, { x: 80 + xOffset, y: 100 + yOffset })
    setNodes((prev) => [...prev, newNode])
  }, [createNode, nodes.length, setNodes, takeSnapshot])

  const onDragStart = useCallback((event, item) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    const bounds = wrapperRef.current?.getBoundingClientRect()
    if (!bounds) return
    const payload = event.dataTransfer.getData('application/reactflow')
    if (!payload) return
    takeSnapshot() // Snapshot al
    const meta = JSON.parse(payload)
    const item = NODE_LIBRARY.find((n) => n.type === meta.type)
    if (!item) return
    const position = project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
    setNodes((prev) => [...prev, createNode(item, position)])
  }, [createNode, project, setNodes, takeSnapshot])

  const onConnect = useCallback((connection) => {
    if (!canConnect(connection, nodes, edges)) return
    takeSnapshot() // Snapshot al
    setEdges((eds) => addEdge({
      ...connection,
      type: 'tick',
      data: { activeTick: false },
      markerEnd: { type: MarkerType.ArrowClosed },
    }, eds))
  }, [edges, nodes, setEdges, takeSnapshot])

  const handleNodeDataChange = useCallback((nodeId, key, value) => {
    takeSnapshot()
    setNodes((prev) => prev.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, [key]: value } }
      }
      return node
    }))
  }, [setNodes, takeSnapshot])

  const handleInspectorColorChange = useCallback((color) => {
    takeSnapshot()
    const selected = nodesRef.current.filter((n) => n.selected)
    if (selected.length === 0) return
    setNodes((prev) => prev.map((node) => {
      const isSelected = node.selected
      const isSameType = applyByType && selected.length === 1 && node.type === selected[0].type
      if (isSelected || isSameType) return { ...node, data: { ...node.data, color } }
      return node
    }))
  }, [applyByType, setNodes, takeSnapshot])

  const resetSimulationVisuals = useCallback(() => {
    setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, runState: 'IDLE' } })))
    setEdges((prev) => prev.map((e) => ({ ...e, data: { ...e.data, activeTick: false } })))
  }, [setEdges, setNodes])

  const handleExportJSON = useCallback(() => {
    const flowData = { nodes, edges }
    const jsonString = JSON.stringify(flowData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'behavior_tree.json'
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const handleImportJSON = useCallback((event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target.result)
        if (parsedData.nodes && parsedData.edges) {
          takeSnapshot()
          setNodes(parsedData.nodes)
          setEdges(parsedData.edges)
        } else {
          alert('Invalid JSON format.')
        }
      } catch (error) {
        alert('Failed to parse JSON file.')
      }
      if(fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }, [setNodes, setEdges, takeSnapshot])

  const triggerFileInput = () => fileInputRef.current?.click()

  const handleClearBoard = useCallback(() => {
    if (window.confirm('Ekrondaki tüm node\'ları silmek istediğine emin misin?')) {
      takeSnapshot()
      setNodes(INITIAL_NODES)
      setEdges([])
    }
  }, [setNodes, setEdges, takeSnapshot])


  const runSimulation = useCallback(async () => {
    simRef.current.stopped = false
    simRef.current.paused = false
    simRef.current.running = true
    setIsPlaying(true)

    resetSimulationVisuals()
    await new Promise((r) => setTimeout(r, 50))

    const waitMs = async (ms, signal = null) => {
      const end = Date.now() + ms
      while (Date.now() < end) {
        if (simRef.current.stopped || signal?.aborted) {
          throw new Error('ABORTED')
        }
        while (simRef.current.paused && !simRef.current.stopped) {
          await new Promise((r2) => setTimeout(r2, 40))
        }
        await new Promise((r2) => setTimeout(r2, Math.min(40, end - Date.now())))
      }
    }

    const edgeAnimDuration = () => Math.floor(tickSpeedRef.current * 0.8)

    const patchNodeRunState = (nodeId, runState) => {
      if (simRef.current.stopped) return
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, runState } } : n))
    }

    const getOrderedChildren = (parentId) => {
      return edgesRef.current
        .filter((e) => e.source === parentId)
        .map((e) => ({ edge: e, node: nodesRef.current.find((n) => n.id === e.target) }))
        .filter((x) => x.node)
        .sort((a, b) => a.node.position.x - b.node.position.x)
    }

    const pulseEdge = async (parentId, childId, signal = null) => {
      if (simRef.current.stopped || signal?.aborted) throw new Error('ABORTED')
      const edge = edgesRef.current.find((e) => e.source === parentId && e.target === childId)
      if (!edge) return
      
      const dur = edgeAnimDuration()
      const animKey = `tick-${Date.now()}-${Math.random()}`

      setEdges((prev) => prev.map((e) => 
        e.id === edge.id ? { ...e, data: { ...e.data, activeTick: true, tickDurationMs: dur, animKey } } : e
      ))

      try {
        await waitMs(dur, signal)
      } catch (e) {
        setEdges((prev) => prev.map((e) => e.id === edge.id ? { ...e, data: { ...e.data, activeTick: false } } : e))
        throw e
      }

      setEdges((prev) => prev.map((e) => 
        e.id === edge.id ? { ...e, data: { ...e.data, activeTick: false } } : e
      ))
    }

    const evaluateNode = async (nodeId, signal = null) => {
      if (simRef.current.stopped || signal?.aborted) throw new Error('ABORTED')
      while (simRef.current.paused && !simRef.current.stopped) await new Promise((r) => setTimeout(r, 40))
      
      const node = nodesRef.current.find((n) => n.id === nodeId)
      if (!node) return 'FAILURE'

      patchNodeRunState(nodeId, 'RUNNING')
      
      try {
        await waitMs(tickSpeedRef.current, signal) // Düşünme süresi
        if (simRef.current.stopped) return 'FAILURE'

        const { type, kind, data } = node
        const childrenTuples = getOrderedChildren(nodeId)
        let result = 'SUCCESS'

        if (type === 'root') {
          if (childrenTuples.length === 0) result = 'FAILURE'
          else {
            const child = childrenTuples[0].node
            await pulseEdge(nodeId, child.id, signal)
            result = await evaluateNode(child.id, signal)
          }
        }
        else if (type === 'wait') {
          await waitMs(Number(data.waitDuration) || 1000, signal)
          result = data.expectedOutput ?? 'SUCCESS'
        } 
        else if (kind === 'leaf') {
          result = data.expectedOutput ?? 'SUCCESS'
        } 
        else if (type === 'sequence') {
          for (const { node: child } of childrenTuples) {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            if (r === 'FAILURE' || r === 'RUNNING') { result = r; break; }
          }
        } 
        else if (type === 'selector') {
          result = 'FAILURE'
          for (const { node: child } of childrenTuples) {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            if (r === 'SUCCESS' || r === 'RUNNING') { result = r; break; }
          }
        } 
        else if (type === 'parallel') {
          if (childrenTuples.length === 0) result = 'SUCCESS'
          else {
            // YENİ: Tüm çocukları aynı anda (paralel olarak) ateşleyen yapı
            const childPromises = childrenTuples.map(async ({ node: child }) => {
              await pulseEdge(nodeId, child.id, signal)
              return await evaluateNode(child.id, signal)
            })
            
            // Promise.all ile hepsinin aynı anda bitmesini/değer dönmesini bekle
            const results = await Promise.all(childPromises)
            
            // Sonuçları değerlendir: Biri bile FAILURE ise FAILURE, biri bile RUNNING ise RUNNING, hepsi SUCCESS ise SUCCESS.
            if (results.includes('FAILURE')) result = 'FAILURE'
            else if (results.includes('RUNNING')) result = 'RUNNING'
            else result = 'SUCCESS'
          }
        }
        else if (type === 'timeout') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else {
            const controller = new AbortController()
            const parentAbortHandler = () => controller.abort()
            if (signal) signal.addEventListener('abort', parentAbortHandler)
            
            const limit = Number(data.timeoutLimit) || 3000
            
            const timeoutPromise = async () => {
              try {
                await waitMs(limit, signal)
                controller.abort() 
                return 'FAILURE'
              } catch(e) {
                return 'SUCCESS' 
              }
            }

            const childPromise = async () => {
              try {
                await pulseEdge(nodeId, child.id, controller.signal)
                return await evaluateNode(child.id, controller.signal)
              } catch(e) {
                if (e.message === 'ABORTED' && !signal?.aborted) return 'FAILURE'
                throw e
              }
            }

            try {
              result = await Promise.race([childPromise(), timeoutPromise()])
            } finally {
              if (signal) signal.removeEventListener('abort', parentAbortHandler)
            }
          }
        }
        else if (type === 'interrupt') {
          const conditionNode = childrenTuples[0]?.node
          const actionNode = childrenTuples[1]?.node
          
          if (!conditionNode || !actionNode) {
            result = 'FAILURE'
          } else {
            const controller = new AbortController()
            const parentAbortHandler = () => controller.abort()
            if (signal) signal.addEventListener('abort', parentAbortHandler)
            
            let actionFinished = false

            const monitorCondition = async () => {
              while (!simRef.current.stopped && !controller.signal.aborted && !actionFinished) {
                await pulseEdge(nodeId, conditionNode.id, signal)
                const condResult = await evaluateNode(conditionNode.id, signal)
                
                const triggerMode = data.interruptMode || 'SUCCESS'
                
                if (condResult === triggerMode && !actionFinished) {
                  controller.abort() 
                  return 'FAILURE'
                }
                
                try {
                   await waitMs(Math.max(300, tickSpeedRef.current / 2), signal)
                } catch(e) {}
              }
              return 'SUCCESS'
            }

            const runAction = async () => {
              try {
                await pulseEdge(nodeId, actionNode.id, controller.signal)
                const r = await evaluateNode(actionNode.id, controller.signal)
                actionFinished = true
                return r
              } catch (e) {
                actionFinished = true
                if (e.message === 'ABORTED') {
                  if (signal?.aborted) throw e 
                  return 'FAILURE'
                }
                throw e
              }
            }

            try {
              result = await Promise.race([monitorCondition(), runAction()])
            } finally {
              if (signal) signal.removeEventListener('abort', parentAbortHandler)
            }
          }
        }
        else if (type === 'repeater') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else {
            let count = 0
            let maxCount = Number(data.repeatCount) || 0
            while (!simRef.current.stopped) {
              await pulseEdge(nodeId, child.id, signal)
              result = await evaluateNode(child.id, signal)
              count++
              if (data.repeatMode === 'until_success' && result === 'SUCCESS') break
              if (data.repeatMode === 'until_failure' && result === 'FAILURE') break
              if (data.repeatMode === 'set_count' && maxCount > 0 && count >= maxCount) break
            }
          }
        }
        else if (type === 'inverter') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'FAILURE'
          else {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            result = r === 'RUNNING' ? 'RUNNING' : (r === 'SUCCESS' ? 'FAILURE' : 'SUCCESS')
          }
        }
        else if (type === 'forceSuccess') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            result = r === 'RUNNING' ? 'RUNNING' : 'SUCCESS'
          }
        }
        else if (type === 'forceFailure') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'FAILURE'
          else {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            result = r === 'RUNNING' ? 'RUNNING' : 'FAILURE'
          }
        }

        if (simRef.current.stopped) return 'FAILURE'
        patchNodeRunState(nodeId, result)
        return result
        
      } catch (error) {
        if (error.message === 'ABORTED') {
          patchNodeRunState(nodeId, 'IDLE')
        }
        throw error 
      }
    }

    try {
      const rootNode = nodesRef.current.find(n => n.type === 'root')
      if (rootNode) await evaluateNode(rootNode.id)
    } catch (e) {
      if (e.message !== 'ABORTED') console.error("Simulation error:", e)
    } finally {
      simRef.current.running = false
      setIsPlaying(false)
    }
  }, [resetSimulationVisuals, setEdges, setNodes])

  const handlePlayPause = useCallback(() => {
    if (simRef.current.running) {
      simRef.current.paused = !simRef.current.paused
      setIsPlaying(!simRef.current.paused)
    } else {
      void runSimulation()
    }
  }, [runSimulation])

  const handleStop = useCallback(() => {
    simRef.current.stopped = true
    simRef.current.paused = false
    simRef.current.running = false
    setIsPlaying(false)
    resetSimulationVisuals()
  }, [resetSimulationVisuals])

  const selectedNodes = nodes.filter((n) => n.selected)

  return (
    <div className="flex h-screen w-screen bg-slate-950 font-sans text-slate-100">
      <aside className="z-10 flex w-72 flex-col border-r border-blue-900/60 bg-slate-900/80 p-4 shadow-xl">
        <div className="flex-1 overflow-y-auto pr-1">
          <h1 className="mb-1 text-lg font-bold text-slate-100">Node Library</h1>
          <p className="mb-4 text-xs text-slate-400">Click or drag nodes into the canvas.</p>
          <div className="space-y-2">
            {NODE_CATEGORIES.map((category) => (
              <details key={category.id} className="group rounded-lg border border-slate-700/80 bg-slate-800/40" open>
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-cyan-400 marker:text-cyan-500">
                  {category.title}
                </summary>
                <div className="space-y-2 border-t border-slate-700/80 p-2">
                  {category.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.type}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onClick={() => addNodeFromSidebar(item)}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-800/50 bg-slate-800/50 px-3 py-2.5 text-left text-sm transition hover:border-cyan-500 hover:bg-slate-700/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                      >
                        <span className="font-medium">{item.label}</span>
                        <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
                      </button>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-4 shrink-0 space-y-2 border-t border-slate-700 pt-4">
          <div className="flex gap-2">
            <button onClick={handleExportJSON} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-700/60 bg-blue-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-300 transition hover:bg-blue-800/50">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={triggerFileInput} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-700/60 bg-blue-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-300 transition hover:bg-blue-800/50">
              <Upload className="h-4 w-4" /> Import
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
          </div>
          <button onClick={handleClearBoard} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-800/60 bg-red-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-900/50">
            <Trash2 className="h-4 w-4" /> Clear Board
          </button>
        </div>
      </aside>

      <main ref={wrapperRef} className="relative h-full flex-1" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          // YENİ: Node sürüklenmeden ve silinmeden önce history'ye kaydet
          onNodeDragStart={() => takeSnapshot()}
          onNodesDelete={() => takeSnapshot()}
          onEdgesDelete={() => takeSnapshot()}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          selectionKeyCode="Shift"
          panOnDrag
          selectionMode={SelectionMode.Partial}
          fitView
          defaultEdgeOptions={{ 
            type: 'tick', 
            data: { activeTick: false }, 
            style: { stroke: '#94a3b8', strokeWidth: 2 }, 
            interactionWidth: 25, // YENİ: Okların seçilebilirliğini/tıklanabilirliğini devasa oranda artırır
            markerEnd: { type: MarkerType.ArrowClosed } 
          }}
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          <Controls className="!border-blue-900 !bg-slate-800 !fill-slate-200 shadow-lg" />

          <Panel position="top-center" className="mt-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-2 shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Simulation</span>
              <button type="button" onClick={handlePlayPause} className="rounded-lg border border-cyan-700/60 bg-cyan-900/40 p-2 text-cyan-300 transition hover:bg-cyan-800/50" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={handleStop} className="rounded-lg border border-red-800/60 bg-red-950/50 p-2 text-red-300 transition hover:bg-red-900/50" title="Stop & Reset">
                <Square className="h-4 w-4" />
              </button>
              <label className="ml-2 flex items-center gap-2 text-xs text-slate-300">
                <span className="whitespace-nowrap">Speed</span>
                <input type="range" min={200} max={2000} step={50} value={tickSpeedMs} onChange={(e) => setTickSpeedMs(Number(e.target.value))} className="h-1 w-28 cursor-pointer accent-cyan-500" />
                <span className="w-12 tabular-nums text-slate-400">{tickSpeedMs}ms</span>
              </label>
            </div>
          </Panel>

          {selectedNodes.length > 0 && (
            <Panel position="bottom-left" className="mb-4 ml-14">
              <SelectionInspector
                selectedNodes={selectedNodes}
                onColorChange={handleInspectorColorChange}
                applyByType={applyByType}
                onToggleApplyByType={setApplyByType}
                onNodeDataChange={handleNodeDataChange}
              />
            </Panel>
          )}

          <MiniMap nodeColor="#334155" maskColor="rgba(2, 6, 23, 0.8)" style={{ backgroundColor: '#0f172a', border: '1px solid #1e3a8a' }} />
        </ReactFlow>
      </main>
    </div>
  )
}