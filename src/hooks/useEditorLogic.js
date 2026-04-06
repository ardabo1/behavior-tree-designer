import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addEdge, MarkerType, useEdgesState, useNodesState, useReactFlow } from 'reactflow'
import { toPng } from 'html-to-image'
import { NODE_LIBRARY } from '../lib/nodeLibrary'

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

const ensureUniqueBBIds = (bbArray) => {
  return bbArray.map((b, i) => ({ 
    ...b, 
    id: b.id !== undefined && b.id !== null ? b.id : `bb-${Date.now()}-${i}-${Math.random()}` 
  }))
}

export function useEditorLogic({ requestPrompt, requestConfirm, showAlert }) {
  const wrapperRef = useRef(null)
  const idRef = useRef(1)
  const fileInputRef = useRef(null)
  
  const clipboardRef = useRef({ nodes: [], edges: [] })
  const historyRef = useRef({ past: [], future: [] })
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const [projects, setProjects] = useState(() => {
    try {
      const savedProjects = localStorage.getItem('bt-projects')
      if (savedProjects) {
        const parsed = JSON.parse(savedProjects)
        return parsed.map(p => ({ ...p, blackboard: ensureUniqueBBIds(p.blackboard || []) }))
      }
      return [{ id: `proj-${Date.now()}`, name: 'Default Project', nodes: INITIAL_NODES, edges: [], blackboard: [{ id: `bb-init-1`, key: 'enemy_distance', value: '10' }], macros: [] }]
    } catch {
      return [{ id: `proj-${Date.now()}`, name: 'Default Project', nodes: INITIAL_NODES, edges: [], blackboard: [], macros: [] }]
    }
  })

  const [currentProjectId, setCurrentProjectId] = useState(projects[0].id)

  const [nodes, setNodes, onNodesChange] = useNodesState(projects[0].nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(projects[0].edges)
  const [blackboard, setBlackboard] = useState(projects[0].blackboard || [])
  const [macros, setMacros] = useState(projects[0].macros || [])

  const { project, setCenter } = useReactFlow()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const blackboardRef = useRef(blackboard)
  const projectsRef = useRef(projects)

  nodesRef.current = nodes
  edgesRef.current = edges
  blackboardRef.current = blackboard
  projectsRef.current = projects

  // Sync active project state
  useEffect(() => {
    const activeProj = projects.find(p => p.id === currentProjectId)
    if (activeProj) {
      setNodes(activeProj.nodes || INITIAL_NODES)
      setEdges(activeProj.edges || [])
      setBlackboard(ensureUniqueBBIds(activeProj.blackboard || []))
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

  const handleBlackboardUpdate = useCallback((id, field, value) => {
    setBlackboard(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }, [])

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
      await showAlert("Cannot Delete", "You cannot delete the last remaining project. Please create a new one first.")
      return
    }
    const confirmed = await requestConfirm("Delete Project", "Are you sure you want to permanently delete this project?")
    if (confirmed) {
      const newProjects = projects.filter(p => p.id !== currentProjectId)
      setProjects(newProjects)
      setCurrentProjectId(newProjects[0].id)
    }
  }, [projects, currentProjectId, requestConfirm, showAlert])

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
      if (e.key === 'Escape' && isSearchOpen) { setIsSearchOpen(false); setSearchQuery(''); }
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
  }, [handleCopy, handlePaste, undo, redo, isSearchOpen])

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

    const normalizedNodes = selected.map(n => ({ ...n, position: { x: n.position.x - minX, y: n.position.y - minY }, selected: false }))
    const macroDef = { id: `macro-${Date.now()}`, name, nodes: normalizedNodes, edges: internalEdges }
    setMacros(prev => [...prev, macroDef])

    const customNodeId = `custom-${idRef.current++}`
    const customNode = { id: customNodeId, type: 'custom', position: { x: minX, y: minY }, data: { label: name, kind: 'custom', color: 'purple', runState: 'IDLE', macroDef } }

    const newEdges = edgesRef.current.filter(e => !(ids.has(e.source) && ids.has(e.target))).map(e => {
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
    const newEdges = macroDef.edges.map(e => ({ ...e, id: `e${idMap[e.source]}-${idMap[e.target]}`, source: idMap[e.source], target: idMap[e.target], selected: true }))

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
    if (confirmed) setMacros(prev => prev.filter(m => m.id !== macroId))
  }, [requestConfirm])

  const addNodeFromSidebar = useCallback((item) => {
    takeSnapshot()
    const bounds = wrapperRef.current?.getBoundingClientRect()
    let spawnPosition = { x: 0, y: 0 }
    if (bounds) {
      spawnPosition = project({ x: bounds.width / 2, y: bounds.height / 2 })
      spawnPosition.x += (Math.random() - 0.5) * 40
      spawnPosition.y += (Math.random() - 0.5) * 40
    }
    setNodes((prev) => [...prev, createNode(item, spawnPosition)])
  }, [createNode, project, setNodes, takeSnapshot])

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
        const customNode = { id: `custom-${idRef.current++}`, type: 'custom', position, data: { label: macro.name, kind: 'custom', color: 'purple', runState: 'IDLE', macroDef: macro } }
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
    setNodes((prev) => prev.map((node) => (node.selected || ( selected.length === 1 && node.type === selected[0].type)) ? { ...node, data: { ...node.data, color } } : node))
  }, [ setNodes, takeSnapshot])

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
          const sanitizedProjects = parsed.projects.map(p => ({ ...p, blackboard: ensureUniqueBBIds(p.blackboard || []) }))
          setProjects(sanitizedProjects)
          setCurrentProjectId(sanitizedProjects[0].id)
        } else if (parsed.nodes && parsed.edges) {
          const newProj = { id: `proj-${Date.now()}`, name: 'Imported Project', nodes: parsed.nodes, edges: parsed.edges, blackboard: ensureUniqueBBIds(parsed.blackboard || []), macros: parsed.macros || [] }
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

  return {
    wrapperRef, fileInputRef, searchInputRef,
    isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, filteredSearchNodes, focusOnNode,
    nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange,
    projects, currentProjectId, setCurrentProjectId,
    blackboard, setBlackboard, handleBlackboardUpdate, macros,
    nodesRef, edgesRef, blackboardRef, projectsRef,
    handleNewProject, handleRenameProject, handleDeleteProject, handleClearBoard,
    handleCreateMacro, handleUnravelMacro, handleDeleteMacro,
    addNodeFromSidebar, onDragStart, onDragOver, onDrop, onConnect,
    handleNodeDataChange, handleInspectorColorChange, takeSnapshot,
    handleExportJSON, handleImportJSON, handleExportPNG, triggerFileInput
  }
}