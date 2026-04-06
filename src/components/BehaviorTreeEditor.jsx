import React, { useMemo } from 'react'
import ReactFlow, { Background, ConnectionMode, MarkerType, MiniMap, Panel, SelectionMode } from 'reactflow'
import 'reactflow/dist/style.css'

import { BTNode } from './BTNode'
import { SelectionInspector } from './SelectionInspector'
import { TickEdge } from './TickEdge'
import { NODE_LIBRARY } from '../lib/nodeLibrary'

// Kendi yazdığımız Custom Hook'lar (Yolların doğru olduğundan emin ol)
import { useModal } from '../hooks/useModal'
import { useEditorLogic } from '../hooks/useEditorLogic'
import { useSimulationEngine } from '../hooks/useSimulationEngine'

// Parçaladığımız UI (Arayüz) Bileşenleri
import { CustomModal } from './CustomModal'
import { SearchModal } from './SearchModal'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { TopSimulationBar } from './TopSimulationBar'

export function BehaviorTreeEditor() {
  // 1. Modalları Yöneten Hook
  const { modal, requestPrompt, requestConfirm, showAlert, handleModalAction } = useModal()
  
  // 2. Editör Mantığı (Sürükle bırak, undo/redo, projeler, makrolar vs.)
  const logic = useEditorLogic({ requestPrompt, requestConfirm, showAlert })
  
  // 3. Simülasyon Motoru
  const engine = useSimulationEngine({
    nodesRef: logic.nodesRef,
    edgesRef: logic.edgesRef,
    blackboardRef: logic.blackboardRef,
    projectsRef: logic.projectsRef,
    setNodes: logic.setNodes,
    setEdges: logic.setEdges
  })

  // ReactFlow için Node ve Edge tanımlamaları
  const edgeTypes = useMemo(() => ({ tick: TickEdge }), [])
  const nodeTypes = useMemo(() => {
    const types = NODE_LIBRARY.reduce((acc, node) => { acc[node.type] = BTNode; return acc }, {})
    types['root'] = BTNode
    types['custom'] = BTNode 
    types['subtree'] = BTNode 
    return types
  }, [])

  const selectedNodes = logic.nodes.filter((n) => n.selected)

  return (
    <div className="dark flex h-screen w-screen overflow-hidden relative font-sans bg-slate-950 text-slate-100">
      
      {/* Pop-up Penceleri */}
      <CustomModal modal={modal} handleModalAction={handleModalAction} />
      <SearchModal {...logic} />

      {/* Sol Menü: Projeler & Kütüphane */}
      <LeftSidebar {...logic} />

      {/* Ana Tuval (Canvas) */}
      <main ref={logic.wrapperRef} className="relative h-full flex-1" onDragOver={logic.onDragOver} onDrop={logic.onDrop}>
        <ReactFlow
          nodes={logic.nodes} edges={logic.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} 
          onNodesChange={logic.onNodesChange} onEdgesChange={logic.onEdgesChange} onConnect={logic.onConnect} 
          onNodeDragStart={logic.takeSnapshot} onNodesDelete={logic.takeSnapshot} onEdgesDelete={logic.takeSnapshot} 
          connectionMode={ConnectionMode.Loose} deleteKeyCode={['Backspace', 'Delete']} selectionKeyCode="Shift" 
          panOnDrag selectionMode={SelectionMode.Partial} fitView 
          defaultEdgeOptions={{ type: 'tick', data: { activeTick: false }, style: { stroke: '#94a3b8', strokeWidth: 2 }, interactionWidth: 25, markerEnd: { type: MarkerType.ArrowClosed } }}
          proOptions={{ hideAttribution: true }} 
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          
          <TopSimulationBar {...engine} />

          {selectedNodes.length > 0 && (
            <Panel position="bottom-left" className="mb-4 ml-24">
              <SelectionInspector 
                selectedNodes={selectedNodes} onColorChange={logic.handleInspectorColorChange} 
                onNodeDataChange={logic.handleNodeDataChange} blackboard={logic.blackboard} 
                onCreateMacro={logic.handleCreateMacro} onUnravelMacro={logic.handleUnravelMacro}
                projects={logic.projects} currentProjectId={logic.currentProjectId}
              />
            </Panel>
          )}

          <MiniMap nodeColor="#334155" maskColor="rgba(2, 6, 23, 0.8)" style={{ backgroundColor: '#0f172a', border: '1px solid #1e3a8a' }} />
        </ReactFlow>
      </main>

      {/* Sağ Menü: Loglar & Blackboard */}
      <RightSidebar 
        {...engine} 
        blackboard={logic.blackboard} 
        setBlackboard={logic.setBlackboard} 
        handleBlackboardUpdate={logic.handleBlackboardUpdate} 
      />
      
    </div>
  )
}