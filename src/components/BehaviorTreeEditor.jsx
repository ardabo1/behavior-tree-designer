import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  ConnectionMode,
  MarkerType,
  MiniMap,
  Panel,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import { toPng } from 'html-to-image'
import 'reactflow/dist/style.css'
import { Pause, Play, Square, Download, Upload, Trash2, Camera, Search, X, Terminal, Database, Plus, Package, FolderPlus, Edit2 } from 'lucide-react'
import { BTNode } from './BTNode'
import { SelectionInspector } from './SelectionInspector'
import { TickEdge } from './TickEdge'
import { NODE_CATEGORIES, NODE_LIBRARY } from '../lib/nodeLibrary'

const INITIAL_NODES = [
  { id: 'root-node', type: 'root', position: { x: 460, y: 50 }, deletable: false, data: { label: 'ROOT', kind: 'root', color: 'slate', runState: 'IDLE' } }
]

function canConnect(connection, nodes, edges) {
  const { source, target } = connection
  if (!source || !target || source === target) return false
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)
  
  if (!sourceNode || !targetNode || sourceNode.data.kind === 'leaf') return false
  if (targetNode.type === 'root') return false
  if (sourceNode.type === 'root') {
    if (edges.some((e) => e.source === source)) return false
  }
  if (sourceNode.data.kind === 'decorator') {
    if (edges.some((e) => e.source === source)) return false
  }
  if (sourceNode.type === 'interrupt') {
     if (edges.filter((e) => e.source === source).length >= 2) return false
  }
  if (edges.some((e) => e.target === target)) return false
  if (sourceNode.position.y >= targetNode.position.y) return false
  return true
}

export function BehaviorTreeEditor() {
  const wrapperRef = useRef(null)
  const idRef = useRef(1)
  const fileInputRef = useRef(null)
  
  const clipboardRef = useRef({ nodes: [], edges: [] })
  const historyRef = useRef({ past: [], future: [] })
  
  const simRef = useRef({ paused: false, stopped: false, running: false })
  const tickSpeedRef = useRef(800)

  const [applyByType, setApplyByType] = useState(false)
  const [tickSpeedMs, setTickSpeedMs] = useState(800)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', defaultValue: '', resolve: null })

  const requestPrompt = useCallback((title, defaultValue = '') => {
    return new Promise(resolve => {
      setModal({ isOpen: true, type: 'prompt', title, message: '', defaultValue, resolve })
    })
  }, [])

  const requestConfirm = useCallback((title, message) => {
    return new Promise(resolve => {
      setModal({ isOpen: true, type: 'confirm', title, message, defaultValue: '', resolve })
    })
  }, [])

  const showAlert = useCallback((title, message) => {
    setModal({ isOpen: true, type: 'alert', title, message, defaultValue: '', resolve: null })
  }, [])

  const handleModalAction = (isConfirm) => {
    if (modal.resolve) {
      if (modal.type === 'prompt') {
        const inputVal = document.getElementById('custom-modal-input')?.value
        modal.resolve(isConfirm ? inputVal : null)
      } else {
        modal.resolve(isConfirm)
      }
    }
    setModal(m => ({ ...m, isOpen: false }))
  }

  const [projects, setProjects] = useState(() => {
    try {
      const savedProjects = localStorage.getItem('bt-projects')
      if (savedProjects) return JSON.parse(savedProjects)
      
      const oldNodes = localStorage.getItem('bt-nodes')
      const oldEdges = localStorage.getItem('bt-edges')
      const oldBB = localStorage.getItem('bt-blackboard')
      const oldMacros = localStorage.getItem('bt-macros')
      
      const defaultProject = {
        id: `proj-${Date.now()}`,
        name: 'Default Project',
        nodes: oldNodes ? JSON.parse(oldNodes) : INITIAL_NODES,
        edges: oldEdges ? JSON.parse(oldEdges) : [],
        blackboard: oldBB ? JSON.parse(oldBB) : [{ id: 1, key: 'enemy_distance', value: '10' }],
        macros: oldMacros ? JSON.parse(oldMacros) : []
      }
      return [defaultProject]
    } catch {
      return [{ id: `proj-${Date.now()}`, name: 'Default Project', nodes: INITIAL_NODES, edges: [], blackboard: [], macros: [] }]
    }
  })

  const [currentProjectId, setCurrentProjectId] = useState(projects[0].id)

  const [nodes, setNodes, onNodesChange] = useNodesState(projects[0].nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(projects[0].edges)
  const [blackboard, setBlackboard] = useState(projects[0].blackboard || [])
  const [macros, setMacros] = useState(projects[0].macros || [])

  const [logs, setLogs] = useState([])
  const logEndRef = useRef(null)

  const { project, setCenter } = useReactFlow()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const blackboardRef = useRef(blackboard)
  const projectsRef = useRef(projects)

  nodesRef.current = nodes
  edgesRef.current = edges
  blackboardRef.current = blackboard
  projectsRef.current = projects
  tickSpeedRef.current = tickSpeedMs

  useEffect(() => {
    const activeProj = projects.find(p => p.id === currentProjectId)
    if (activeProj) {
      setNodes(activeProj.nodes || INITIAL_NODES)
      setEdges(activeProj.edges || [])
      setBlackboard(activeProj.blackboard || [])
      setMacros(activeProj.macros || [])
      historyRef.current = { past: [], future: [] } 
      
      let maxId = 1
      activeProj.nodes?.forEach(n => {
          const match = n.id.match(/-(\d+)$/)
          if (match && parseInt(match[1], 10) >= maxId) maxId = parseInt(match[1], 10) + 1
      })
      idRef.current = maxId
    }
  }, [currentProjectId, setNodes, setEdges])

  useEffect(() => {
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === currentProjectId) return { ...p, nodes, edges, blackboard, macros, lastModified: Date.now() }
      return p
    }))
  }, [nodes, edges, blackboard, macros, currentProjectId])

  useEffect(() => {
    localStorage.setItem('bt-projects', JSON.stringify(projects))
  }, [projects])

  const handleNewProject = useCallback(async () => {
    const name = await requestPrompt("Enter new project name:", "New Project")
    if (!name) return
    const newProj = { id: `proj-${Date.now()}`, name, nodes: INITIAL_NODES, edges: [], blackboard: [], macros: [] }
    setProjects(prev => [...prev, newProj])
    setCurrentProjectId(newProj.id)
  }, [requestPrompt])

  const handleRenameProject = useCallback(async () => {
    const activeProj = projects.find(p => p.id === currentProjectId)
    if (!activeProj) return
    const newName = await requestPrompt("Rename Project:", activeProj.name)
    if (newName && newName.trim() !== "") {
      setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, name: newName } : p))
    }
  }, [projects, currentProjectId, requestPrompt])

  const handleDeleteProject = useCallback(async () => {
    if (projects.length <= 1) {
      await requestConfirm("Cannot Delete", "You cannot delete the last remaining project. Please create a new one first.")
      return
    }
    const confirmed = await requestConfirm("Delete Project", "Are you sure you want to permanently delete this project?")
    if (confirmed) {
      const newProjects = projects.filter(p => p.id !== currentProjectId)
      setProjects(newProjects)
      setCurrentProjectId(newProjects[0].id)
    }
  }, [projects, currentProjectId, requestConfirm])

  const addLog = useCallback((msg, type = 'INFO') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg, type }])
  }, [])

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const takeSnapshot = useCallback(() => {
    const currentState = { nodes: JSON.parse(JSON.stringify(nodesRef.current)), edges: JSON.parse(JSON.stringify(edgesRef.current)) }
    const past = historyRef.current.past
    if (past.length > 0 && JSON.stringify(past[past.length - 1]) === JSON.stringify(currentState)) return
    past.push(currentState)
    historyRef.current.future = [] 
    if (past.length > 50) past.shift() 
  }, [])

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return
    const prev = historyRef.current.past.pop()
    historyRef.current.future.push({ nodes: JSON.parse(JSON.stringify(nodesRef.current)), edges: JSON.parse(JSON.stringify(edgesRef.current)) })
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return
    const next = historyRef.current.future.pop()
    historyRef.current.past.push({ nodes: JSON.parse(JSON.stringify(nodesRef.current)), edges: JSON.parse(JSON.stringify(edgesRef.current)) })
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [setNodes, setEdges])

  const handleCopy = useCallback(() => {
    const selNodes = nodesRef.current.filter(n => n.selected && n.type !== 'root')
    if (!selNodes.length) return
    const ids = new Set(selNodes.map(n => n.id))
    const selEdges = edgesRef.current.filter(e => ids.has(e.source) && ids.has(e.target))
    clipboardRef.current = { nodes: selNodes, edges: selEdges }
  }, [])

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current.nodes.length) return
    takeSnapshot() 
    const newNodes = [], newEdges = [], idMap = {} 
    clipboardRef.current.nodes.forEach(n => {
      const newId = `${n.type}-${idRef.current++}`
      idMap[n.id] = newId
      newNodes.push({ ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true })
    })
    clipboardRef.current.edges.forEach(e => {
      newEdges.push({ ...e, id: `e${idMap[e.source]}-${idMap[e.target]}`, source: idMap[e.source], target: idMap[e.target], selected: true })
    })
    setNodes(prev => prev.map(n => ({ ...n, selected: false })).concat(newNodes))
    setEdges(prev => prev.map(e => ({ ...e, selected: false })).concat(newEdges))
  }, [takeSnapshot, setNodes, setEdges])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); return; }
      if (e.key === 'Escape') {
        if (modal.isOpen) handleModalAction(false)
        else if (isSearchOpen) { setIsSearchOpen(false); setSearchQuery(''); }
      }
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === 'c') handleCopy()
        else if (key === 'v') handlePaste()
        else if (key === 'z') { e.shiftKey ? redo() : undo() }
        else if (key === 'y') redo() 
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCopy, handlePaste, undo, redo, isSearchOpen, modal])

  const edgeTypes = useMemo(() => ({ tick: TickEdge }), [])
  const nodeTypes = useMemo(() => {
    const types = NODE_LIBRARY.reduce((acc, node) => { acc[node.type] = BTNode; return acc }, {})
    types['root'] = BTNode
    types['custom'] = BTNode 
    types['subtree'] = BTNode 
    return types
  }, [])

  const createNode = useCallback((item, position) => ({
    id: `${item.type}-${idRef.current++}`, type: item.type, position,
    data: { label: item.label, kind: item.kind, color: item.defaultColor ?? 'blue', runState: 'IDLE', expectedOutput: 'SUCCESS', waitDuration: 1000, timeoutLimit: 3000, interruptMode: 'SUCCESS', repeatMode: 'until_success', repeatCount: 0, useBlackboard: false, bbKey: '', bbOperator: '==', bbValue: '', targetProjectId: '' }
  }), [])

  const handleCreateMacro = useCallback(async () => {
    const selected = nodesRef.current.filter(n => n.selected && n.type !== 'root')
    if (selected.length < 2) return

    const name = await requestPrompt("Enter name for Macro:", "New Macro")
    if (!name) return

    takeSnapshot()

    const ids = new Set(selected.map(n => n.id))
    const internalEdges = edgesRef.current.filter(e => ids.has(e.source) && ids.has(e.target))

    const minX = Math.min(...selected.map(n => n.position.x))
    const minY = Math.min(...selected.map(n => n.position.y))

    const normalizedNodes = selected.map(n => ({
        ...n, position: { x: n.position.x - minX, y: n.position.y - minY }, selected: false
    }))

    const macroDef = { id: `macro-${Date.now()}`, name, nodes: normalizedNodes, edges: internalEdges }
    setMacros(prev => [...prev, macroDef])

    const customNodeId = `custom-${idRef.current++}`
    const customNode = {
        id: customNodeId, type: 'custom', position: { x: minX, y: minY },
        data: { label: name, kind: 'custom', color: 'purple', runState: 'IDLE', macroDef }
    }

    const newEdges = edgesRef.current
        .filter(e => !(ids.has(e.source) && ids.has(e.target))) 
        .map(e => {
            if (ids.has(e.target)) return { ...e, target: customNodeId }
            if (ids.has(e.source)) return { ...e, source: customNodeId }
            return e
        })

    setNodes(prev => prev.filter(n => !ids.has(n.id)).concat(customNode))
    setEdges(newEdges)
  }, [setNodes, setEdges, takeSnapshot, requestPrompt])

  const handleUnravelMacro = useCallback((customNode) => {
    takeSnapshot()
    const { macroDef } = customNode.data
    const { position } = customNode
    const idMap = {}
    const newNodes = macroDef.nodes.map(n => {
        const newId = `${n.type}-${idRef.current++}`
        idMap[n.id] = newId
        return { ...n, id: newId, position: { x: position.x + n.position.x, y: position.y + n.position.y }, selected: true }
    })

    const newEdges = macroDef.edges.map(e => ({
        ...e, id: `e${idMap[e.source]}-${idMap[e.target]}`, source: idMap[e.source], target: idMap[e.target], selected: true
    }))

    const hasIncoming = new Set(macroDef.edges.map(e => e.target))
    const rootOldId = macroDef.nodes.find(n => !hasIncoming.has(n.id))?.id
    const rootNewId = rootOldId ? idMap[rootOldId] : newNodes[0].id

    const hasOutgoing = new Set(macroDef.edges.map(e => e.source))
    const leafOldIds = macroDef.nodes.filter(n => !hasOutgoing.has(n.id)).map(n => n.id)

    const updatedEdges = edgesRef.current.filter(e => e.source !== customNode.id && e.target !== customNode.id).concat(newEdges)

    edgesRef.current.forEach(e => {
        if (e.target === customNode.id) updatedEdges.push({ ...e, target: rootNewId })
        if (e.source === customNode.id) {
            const leafNewId = leafOldIds.length > 0 ? idMap[leafOldIds[0]] : newNodes[newNodes.length - 1].id
            updatedEdges.push({ ...e, source: leafNewId })
        }
    })

    setNodes(prev => prev.filter(n => n.id !== customNode.id).map(n => ({...n, selected: false})).concat(newNodes))
    setEdges(updatedEdges)
  }, [setNodes, setEdges, takeSnapshot])

  const handleDeleteMacro = useCallback(async (macroId, e) => {
    e.stopPropagation() 
    const confirmed = await requestConfirm("Delete Macro", "Are you sure you want to permanently delete this macro from the library?")
    if (confirmed) {
      setMacros(prev => prev.filter(m => m.id !== macroId))
    }
  }, [requestConfirm])

  const addNodeFromSidebar = useCallback((item) => {
    takeSnapshot()
    setNodes((prev) => [...prev, createNode(item, { x: 80 + (nodes.length % 4) * 220, y: 100 + Math.floor(nodes.length / 4) * 150 })])
  }, [createNode, nodes.length, setNodes, takeSnapshot])

  const onDragStart = useCallback((e, item) => { e.dataTransfer.setData('application/reactflow', JSON.stringify(item)); e.dataTransfer.effectAllowed = 'move' }, [])
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])
  const onDrop = useCallback((event) => {
    event.preventDefault()
    const bounds = wrapperRef.current?.getBoundingClientRect()
    if (!bounds) return
    takeSnapshot() 
    
    const macroPayload = event.dataTransfer.getData('application/reactflow-macro')
    if (macroPayload) {
        const macro = JSON.parse(macroPayload)
        const position = project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        const customNode = {
            id: `custom-${idRef.current++}`, type: 'custom', position,
            data: { label: macro.name, kind: 'custom', color: 'purple', runState: 'IDLE', macroDef: macro }
        }
        setNodes(prev => [...prev, customNode])
        return
    }

    const payload = event.dataTransfer.getData('application/reactflow')
    if (!payload) return
    const item = NODE_LIBRARY.find((n) => n.type === JSON.parse(payload).type)
    if (!item) return
    setNodes((prev) => [...prev, createNode(item, project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }))])
  }, [createNode, project, setNodes, takeSnapshot])

  const onConnect = useCallback((connection) => {
    if (!canConnect(connection, nodes, edges)) return
    takeSnapshot() 
    setEdges((eds) => addEdge({ ...connection, type: 'tick', data: { activeTick: false }, markerEnd: { type: MarkerType.ArrowClosed } }, eds))
  }, [edges, nodes, setEdges, takeSnapshot])

  const handleNodeDataChange = useCallback((nodeId, key, value) => {
    takeSnapshot()
    setNodes((prev) => prev.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, [key]: value } } : node))
  }, [setNodes, takeSnapshot])

  const handleInspectorColorChange = useCallback((color) => {
    takeSnapshot()
    const selected = nodesRef.current.filter((n) => n.selected)
    if (!selected.length) return
    setNodes((prev) => prev.map((node) => (node.selected || (applyByType && selected.length === 1 && node.type === selected[0].type)) ? { ...node, data: { ...node.data, color } } : node))
  }, [applyByType, setNodes, takeSnapshot])

  const resetSimulationVisuals = useCallback(() => {
    setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, runState: 'IDLE' } })))
    setEdges((prev) => prev.map((e) => ({ ...e, data: { ...e.data, activeTick: false } })))
  }, [setEdges, setNodes])

  const handleExportPNG = useCallback(() => {
    const flowElement = document.querySelector('.react-flow')
    if (!flowElement) return
    const uiElements = document.querySelectorAll('.react-flow__panel, .react-flow__minimap, .react-flow__controls')
    uiElements.forEach(el => el.style.display = 'none')
    toPng(flowElement, { backgroundColor: '#020617', skipFonts: true, pixelRatio: 2, width: flowElement.offsetWidth, height: flowElement.offsetHeight, style: { width: '100%', height: '100%', transform: 'translate(0, 0)' } })
    .then((dataUrl) => { const link = document.createElement('a'); link.download = `bt_${Date.now()}.png`; link.href = dataUrl; link.click() })
    .catch(() => showAlert('Export Failed', 'PNG export failed.'))
    .finally(() => uiElements.forEach(el => el.style.display = ''))
  }, [showAlert])

  const handleExportJSON = useCallback(() => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify({ projects }, null, 2)], { type: 'application/json' }))
    link.download = 'behavior_tree_projects.json'
    link.click()
  }, [projects])

  const handleImportJSON = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (parsed.projects && Array.isArray(parsed.projects)) {
          setProjects(parsed.projects)
          setCurrentProjectId(parsed.projects[0].id)
        } else if (parsed.nodes && parsed.edges) {
          const newProj = { id: `proj-${Date.now()}`, name: 'Imported Project', nodes: parsed.nodes, edges: parsed.edges, blackboard: parsed.blackboard || [], macros: parsed.macros || [] }
          setProjects(prev => [...prev, newProj])
          setCurrentProjectId(newProj.id)
        }
      } catch (err) { showAlert('Import Failed', 'Invalid JSON file.') }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }, [showAlert])

  const triggerFileInput = () => fileInputRef.current?.click()

  const handleClearBoard = useCallback(async () => {
    const confirmed = await requestConfirm("Clear Board", "Are you sure you want to delete all nodes in THIS project?")
    if (confirmed) { takeSnapshot(); setNodes(INITIAL_NODES); setEdges([]) }
  }, [setNodes, setEdges, takeSnapshot, requestConfirm])


  const runSimulation = useCallback(async () => {
    simRef.current.stopped = false
    simRef.current.paused = false
    simRef.current.running = true
    setIsPlaying(true)
    
    setLogs([])
    addLog('Simulation Started', 'INFO')

    resetSimulationVisuals()
    await new Promise((r) => setTimeout(r, 50))

    const waitMs = async (ms, signal = null) => {
      const end = Date.now() + ms
      while (Date.now() < end) {
        if (simRef.current.stopped || signal?.aborted) throw new Error('ABORTED')
        while (simRef.current.paused && !simRef.current.stopped) await new Promise((r2) => setTimeout(r2, 40))
        await new Promise((r2) => setTimeout(r2, Math.min(40, end - Date.now())))
      }
    }

    const edgeAnimDuration = () => Math.floor(tickSpeedRef.current * 0.8)

    const patchNodeRunState = (nodeId, runState) => {
      if (simRef.current.stopped) return
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, runState } } : n))
    }

    const getOrderedChildren = (parentId) => edgesRef.current.filter((e) => e.source === parentId).map((e) => ({ edge: e, node: nodesRef.current.find((n) => n.id === e.target) })).filter((x) => x.node).sort((a, b) => a.node.position.x - b.node.position.x)

    const pulseEdge = async (parentId, childId, signal = null) => {
      if (simRef.current.stopped || signal?.aborted) throw new Error('ABORTED')
      const edge = edgesRef.current.find((e) => e.source === parentId && e.target === childId)
      if (!edge) return
      const dur = edgeAnimDuration()
      setEdges((prev) => prev.map((e) => e.id === edge.id ? { ...e, data: { ...e.data, activeTick: true, tickDurationMs: dur, animKey: `tick-${Date.now()}-${Math.random()}` } } : e))
      try { await waitMs(dur, signal) } 
      catch (e) { setEdges((prev) => prev.map((e) => e.id === edge.id ? { ...e, data: { ...e.data, activeTick: false } } : e)); throw e }
      setEdges((prev) => prev.map((e) => e.id === edge.id ? { ...e, data: { ...e.data, activeTick: false } } : e))
    }

    const evaluateNode = async (nodeId, signal = null) => {
      if (simRef.current.stopped || signal?.aborted) throw new Error('ABORTED')
      while (simRef.current.paused && !simRef.current.stopped) await new Promise((r) => setTimeout(r, 40))
      
      const node = nodesRef.current.find((n) => n.id === nodeId)
      if (!node) return 'FAILURE'

      patchNodeRunState(nodeId, 'RUNNING')
      addLog(`Evaluating: ${node.data.label} [${node.type}]`, 'RUNNING') 
      
      try {
        await waitMs(tickSpeedRef.current, signal) 
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
        else if (type === 'condition') {
          if (data.useBlackboard && data.bbKey) {
            const bbVar = blackboardRef.current.find(b => b.key === data.bbKey)
            let val1 = bbVar ? bbVar.value : ''
            let val2 = data.bbValue || ''
            
            if (!isNaN(val1) && !isNaN(val2) && val1 !== '' && val2 !== '') {
              val1 = Number(val1); val2 = Number(val2);
            }
            
            let res = false
            switch(data.bbOperator) {
              case '==': res = val1 == val2; break;
              case '!=': res = val1 != val2; break;
              case '>': res = val1 > val2; break;
              case '<': res = val1 < val2; break;
              case '>=': res = val1 >= val2; break;
              case '<=': res = val1 <= val2; break;
              default: res = val1 == val2;
            }
            result = res ? 'SUCCESS' : 'FAILURE'
            addLog(`Blackboard: ${data.bbKey}(${bbVar ? bbVar.value : 'null'}) ${data.bbOperator} ${val2} => ${result}`, result)
          } else {
            result = data.expectedOutput ?? 'SUCCESS'
          }
        }
        else if (type === 'custom') {
           await waitMs(1500, signal) 
           result = 'SUCCESS'
           addLog(`[Macro: ${data.label}] Executed as Blackbox`, 'SUCCESS')
        }
        else if (type === 'subtree') {
          const targetProj = projectsRef.current.find(p => p.id === data.targetProjectId)
          if (!targetProj) {
             addLog(`[Subtree: ${data.label}] Target project not found!`, 'FAILURE')
             result = 'FAILURE'
          } else {
             addLog(`[Subtree: ${data.label}] Jumping to ${targetProj.name}...`, 'INFO')
             await waitMs(1500, signal) 
             result = 'SUCCESS'
             addLog(`[Subtree: ${data.label}] Returned SUCCESS from ${targetProj.name}`, 'SUCCESS')
          }
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
            const childPromises = childrenTuples.map(async ({ node: child }) => {
              await pulseEdge(nodeId, child.id, signal)
              return await evaluateNode(child.id, signal)
            })
            const results = await Promise.all(childPromises)
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
              try { await waitMs(limit, signal); controller.abort(); addLog(`[${data.label}] Timeout Fired!`, 'FAILURE'); return 'FAILURE' } 
              catch(e) { return 'SUCCESS' }
            }
            const childPromise = async () => {
              try { await pulseEdge(nodeId, child.id, controller.signal); return await evaluateNode(child.id, controller.signal) } 
              catch(e) { if (e.message === 'ABORTED' && !signal?.aborted) return 'FAILURE'; throw e }
            }
            try { result = await Promise.race([childPromise(), timeoutPromise()]) } 
            finally { if (signal) signal.removeEventListener('abort', parentAbortHandler) }
          }
        }
        else if (type === 'interrupt') {
          const conditionNode = childrenTuples[0]?.node
          const actionNode = childrenTuples[1]?.node
          if (!conditionNode || !actionNode) { result = 'FAILURE' } 
          else {
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
                  addLog(`[${data.label}] Interrupt Triggered!`, 'FAILURE')
                  return 'FAILURE'
                }
                try { await waitMs(Math.max(300, tickSpeedRef.current / 2), signal) } catch(e) {}
              }
              return 'SUCCESS'
            }
            const runAction = async () => {
              try { await pulseEdge(nodeId, actionNode.id, controller.signal); const r = await evaluateNode(actionNode.id, controller.signal); actionFinished = true; return r } 
              catch (e) { actionFinished = true; if (e.message === 'ABORTED') { if (signal?.aborted) throw e; return 'FAILURE' } throw e }
            }
            try { result = await Promise.race([monitorCondition(), runAction()]) } 
            finally { if (signal) signal.removeEventListener('abort', parentAbortHandler) }
          }
        }
        else if (type === 'repeater') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else {
            let count = 0, maxCount = Number(data.repeatCount) || 0
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
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : (r === 'SUCCESS' ? 'FAILURE' : 'SUCCESS') }
        }
        else if (type === 'forceSuccess') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : 'SUCCESS' }
        }
        else if (type === 'forceFailure') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'FAILURE'
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : 'FAILURE' }
        }

        if (simRef.current.stopped) return 'FAILURE'
        patchNodeRunState(nodeId, result)
        addLog(`Returned: ${result} [${node.data.label}]`, result) 
        return result
        
      } catch (error) {
        if (error.message === 'ABORTED') { patchNodeRunState(nodeId, 'IDLE'); addLog(`Aborted: [${node.data.label}]`, 'WARNING') }
        throw error 
      }
    }

    try {
      const rootNode = nodesRef.current.find(n => n.type === 'root')
      if (rootNode) {
        const finalStatus = await evaluateNode(rootNode.id)
        addLog(`Simulation Finished: ${finalStatus}`, finalStatus)
      }
    } catch (e) {
      if (e.message !== 'ABORTED') console.error("Simulation error:", e)
    } finally {
      simRef.current.running = false
      setIsPlaying(false)
    }
  }, [resetSimulationVisuals, setEdges, setNodes, addLog])

  const handlePlayPause = useCallback(() => {
    if (simRef.current.running) {
      simRef.current.paused = !simRef.current.paused
      setIsPlaying(!simRef.current.paused)
      addLog(simRef.current.paused ? 'Simulation Paused' : 'Simulation Resumed', 'INFO')
    } else {
      void runSimulation()
    }
  }, [runSimulation, addLog])

  const handleStop = useCallback(() => {
    simRef.current.stopped = true
    simRef.current.paused = false
    simRef.current.running = false
    setIsPlaying(false)
    addLog('Simulation Stopped', 'WARNING')
    resetSimulationVisuals()
  }, [resetSimulationVisuals, addLog])

  const filteredSearchNodes = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return nodes.filter(n => n.data.label.toLowerCase().includes(query) || n.type.toLowerCase().includes(query))
  }, [nodes, searchQuery])

  const focusOnNode = useCallback((node) => {
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === node.id })))
    setCenter(node.position.x + 90, node.position.y + 25, { zoom: 1.2, duration: 800 })
    setIsSearchOpen(false); setSearchQuery('')
  }, [setNodes, setCenter])

  const selectedNodes = nodes.filter((n) => n.selected)

  const getLogColor = (type) => {
    if (type === 'SUCCESS') return 'text-green-600 dark:text-green-400'
    if (type === 'FAILURE') return 'text-red-600 dark:text-red-400'
    if (type === 'RUNNING') return 'text-amber-600 dark:text-amber-400'
    if (type === 'WARNING') return 'text-orange-600 dark:text-orange-400'
    return 'text-slate-600 dark:text-slate-300' 
  }

  return (
    <div className="dark flex h-screen w-screen overflow-hidden relative font-sans bg-slate-950 text-slate-100">
      
      {modal.isOpen && (
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
      )}

      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}>
          <div className="w-[500px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 p-4">
              <Search className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              <input ref={searchInputRef} type="text" placeholder="Search nodes..." className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && filteredSearchNodes.length > 0) focusOnNode(filteredSearchNodes[0]) }} />
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
      )}

      <aside className="z-10 flex w-72 flex-col border-r border-slate-300 dark:border-blue-900/60 bg-white/90 dark:bg-slate-900/80 p-4 shadow-xl">
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
           <h1 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Project</h1>
           <div className="flex gap-1">
             <select
               className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-500"
               value={currentProjectId}
               onChange={(e) => setCurrentProjectId(e.target.value)}
             >
               {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
             <button onClick={handleNewProject} className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-300 dark:border-indigo-700/50 hover:bg-indigo-200 dark:hover:bg-indigo-800" title="New Project"><FolderPlus className="h-4 w-4"/></button>
             <button onClick={handleRenameProject} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700" title="Rename"><Edit2 className="h-4 w-4"/></button>
             <button onClick={handleDeleteProject} className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded border border-red-300 dark:border-red-700/50 hover:bg-red-200 dark:hover:bg-red-800" title="Delete"><Trash2 className="h-4 w-4"/></button>
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

      <main ref={wrapperRef} className="relative h-full flex-1" onDragOver={onDragOver} onDrop={onDrop}>

        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDragStart={takeSnapshot} onNodesDelete={takeSnapshot} onEdgesDelete={takeSnapshot} connectionMode={ConnectionMode.Loose} deleteKeyCode={['Backspace', 'Delete']} selectionKeyCode="Shift" panOnDrag selectionMode={SelectionMode.Partial} fitView 
          defaultEdgeOptions={{ type: 'tick', data: { activeTick: false }, style: { stroke: '#94a3b8', strokeWidth: 2 }, interactionWidth: 25, markerEnd: { type: MarkerType.ArrowClosed } }}
          proOptions={{ hideAttribution: true }} 
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          
          <Panel position="top-center" className="mt-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-2 shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Simulation</span>
              <button type="button" onClick={handlePlayPause} className="rounded-lg border border-cyan-300 dark:border-cyan-700/60 bg-cyan-100 dark:bg-cyan-900/40 p-2 text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-200 dark:hover:bg-cyan-800/50" title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              <button type="button" onClick={handleStop} className="rounded-lg border border-red-300 dark:border-red-800/60 bg-red-100 dark:bg-red-950/50 p-2 text-red-700 dark:text-red-300 transition hover:bg-red-200 dark:hover:bg-red-900/50" title="Stop & Reset"><Square className="h-4 w-4" /></button>
              <label className="ml-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="whitespace-nowrap">Speed</span>
                <input type="range" min={200} max={2000} step={50} value={tickSpeedMs} onChange={(e) => setTickSpeedMs(Number(e.target.value))} className="h-1 w-28 cursor-pointer accent-cyan-500" />
                <span className="w-12 tabular-nums text-slate-500 dark:text-slate-400">{tickSpeedMs}ms</span>
              </label>
            </div>
          </Panel>

          {selectedNodes.length > 0 && (
            <Panel position="bottom-left" className="mb-4 ml-24">
              <SelectionInspector 
                selectedNodes={selectedNodes} 
                onColorChange={handleInspectorColorChange} 
                applyByType={applyByType} 
                onToggleApplyByType={setApplyByType} 
                onNodeDataChange={handleNodeDataChange} 
                blackboard={blackboard} 
                onCreateMacro={handleCreateMacro}
                onUnravelMacro={handleUnravelMacro}
                projects={projects}
                currentProjectId={currentProjectId}
              />
            </Panel>
          )}

          <MiniMap nodeColor="#334155" maskColor="rgba(2, 6, 23, 0.8)" style={{ backgroundColor: '#0f172a', border: '1px solid #1e3a8a' }} />
        </ReactFlow>
      </main>

      <aside className="z-10 flex w-80 flex-col border-l border-slate-300 dark:border-blue-900/60 bg-white/90 dark:bg-slate-900/80 shadow-xl">
        
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4 shrink-0">
          <Terminal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Simulation Logs</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-600 text-center mt-10">Awaiting simulation...</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="mb-1.5 flex gap-2 border-b border-slate-200 dark:border-slate-800/50 pb-1">
                <span className="shrink-0 text-slate-400 dark:text-slate-500">[{log.time}]</span>
                <span className={`break-words ${getLogColor(log.type)}`}>{log.msg}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>

        <div className="shrink-0 border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 p-4">
          <h2 className="flex items-center gap-2 mb-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Database className="h-4 w-4" /> Blackboard
          </h2>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
            {blackboard.length === 0 && (
              <p className="text-xs text-indigo-400 dark:text-indigo-300/50 text-center py-2">No variables.</p>
            )}
            {blackboard.map((v) => (
              <div key={v.id} className="flex items-center gap-1">
                <input type="text" className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500" value={v.key} onChange={(e) => setBlackboard(b => b.map(item => item.id === v.id ? { ...item, key: e.target.value } : item))} placeholder="Key" />
                <span className="text-slate-500">=</span>
                <input type="text" className="w-1/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500" value={v.value} onChange={(e) => setBlackboard(b => b.map(item => item.id === v.id ? { ...item, value: e.target.value } : item))} placeholder="Value" />
                <button onClick={() => setBlackboard(b => b.filter(item => item.id !== v.id))} className="p-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setBlackboard(b => [...b, { id: Date.now(), key: 'new_var', value: '0' }])} className="w-full flex items-center justify-center gap-2 rounded border border-indigo-300 dark:border-indigo-700/50 bg-indigo-100 dark:bg-indigo-900/30 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition">
            <Plus className="h-4 w-4" /> Add Variable
          </button>
        </div>
      </aside>
    </div>
  )
}