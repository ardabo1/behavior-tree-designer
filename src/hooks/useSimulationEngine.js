import { useState, useRef, useCallback, useEffect } from 'react'

export function useSimulationEngine({
  nodesRef,
  edgesRef,
  blackboardRef,
  projectsRef,
  setNodes,
  setEdges
}) {
  const simRef = useRef({ paused: false, stopped: false, running: false })
  const [tickSpeedMs, setTickSpeedMs] = useState(800)
  const tickSpeedRef = useRef(tickSpeedMs)
  const [isPlaying, setIsPlaying] = useState(false)
  const [logs, setLogs] = useState([])
  const logEndRef = useRef(null)

  // Keep ref in sync with state for access inside async loops without stale closures
  useEffect(() => {
    tickSpeedRef.current = tickSpeedMs
  }, [tickSpeedMs])

  

  const addLog = useCallback((msg, type = 'INFO') => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg, type }])
  }, [])

  const resetSimulationVisuals = useCallback(() => {
    setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, runState: 'IDLE' } })))
    setEdges((prev) => prev.map((e) => ({ ...e, data: { ...e.data, activeTick: false } })))
  }, [setEdges, setNodes])

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

    // Helper function for safe blackboard evaluation
    const evaluateBlackboard = (data) => {
      if (!data.bbKey) return false;

      const bbVar = blackboardRef.current.find(b => b.key === data.bbKey)
      
      let val1 = bbVar ? String(bbVar.value) : ''
      let val2 = data.bbValue ? String(data.bbValue) : ''
      
      const num1 = Number(val1)
      const num2 = Number(val2)
      
      const isNum = !isNaN(num1) && !isNaN(num2) && val1.trim() !== '' && val2.trim() !== ''
      
      if (isNum) {
        switch(data.bbOperator) {
          case '==': return num1 === num2;
          case '!=': return num1 !== num2;
          case '>': return num1 > num2;
          case '<': return num1 < num2;
          case '>=': return num1 >= num2;
          case '<=': return num1 <= num2;
          default: return num1 === num2;
        }
      } else {
        switch(data.bbOperator) {
          case '==': return val1 === val2;
          case '!=': return val1 !== val2;
          default: return val1 === val2;
        }
      }
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
        const nType = String(type).toLowerCase()
        const nKind = String(kind).toLowerCase()
        
        const childrenTuples = getOrderedChildren(nodeId)
        let result = 'SUCCESS'

        if (nType === 'root') {
          if (childrenTuples.length === 0) result = 'FAILURE'
          else {
            const child = childrenTuples[0].node
            await pulseEdge(nodeId, child.id, signal)
            result = await evaluateNode(child.id, signal)
          }
        }
        else if (nType === 'wait') {
          if (data.useBlackboard && data.bbKey) {
             if (!evaluateBlackboard(data)) {
               addLog(`[Wait] Blackboard condition failed: ${data.bbKey} ${data.bbOperator} ${data.bbValue}`, 'FAILURE')
               return 'FAILURE'
             }
          }
          await waitMs(Number(data.waitDuration) || 1000, signal)
          result = data.expectedOutput ?? 'SUCCESS'
        } 
        else if (nType === 'custom') {
           await waitMs(1500, signal) 
           result = 'SUCCESS'
           addLog(`[Macro: ${data.label}] Executed as Blackbox`, 'SUCCESS')
        }
        else if (nType === 'subtree') {
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
        // COMPOSITE NODES
        else if (nType === 'sequence') {
          for (const { node: child } of childrenTuples) {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            if (r === 'FAILURE' || r === 'RUNNING') { result = r; break; }
          }
        } 
        else if (nType === 'selector') {
          result = 'FAILURE'
          for (const { node: child } of childrenTuples) {
            await pulseEdge(nodeId, child.id, signal)
            const r = await evaluateNode(child.id, signal)
            if (r === 'SUCCESS' || r === 'RUNNING') { result = r; break; }
          }
        } 
        else if (nType === 'parallel') {
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
        // DECORATOR NODES
        else if (nType === 'timeout') {
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
        else if (nType === 'interrupt') {
          const conditionNode = childrenTuples[0]?.node
          const actionNode = (data.useBlackboard && data.bbKey) ? childrenTuples[0]?.node : childrenTuples[1]?.node
          
          if (!actionNode) { result = 'FAILURE' } 
          else {
            const controller = new AbortController()
            const parentAbortHandler = () => controller.abort()
            if (signal) signal.addEventListener('abort', parentAbortHandler)
            let actionFinished = false

            const monitorCondition = async () => {
              while (!simRef.current.stopped && !controller.signal.aborted && !actionFinished) {
                let condResult = 'FAILURE'
                
                if (data.useBlackboard && data.bbKey) {
                   condResult = evaluateBlackboard(data) ? 'SUCCESS' : 'FAILURE'
                } else if (conditionNode) {
                   await pulseEdge(nodeId, conditionNode.id, signal)
                   condResult = await evaluateNode(conditionNode.id, signal)
                }

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
              try { 
                await pulseEdge(nodeId, actionNode.id, controller.signal)
                const r = await evaluateNode(actionNode.id, controller.signal)
                actionFinished = true
                return r 
              } 
              catch (e) { 
                actionFinished = true
                if (e.message === 'ABORTED') { if (signal?.aborted) throw e; return 'FAILURE' } 
                throw e 
              }
            }
            try { result = await Promise.race([monitorCondition(), runAction()]) } 
            finally { if (signal) signal.removeEventListener('abort', parentAbortHandler) }
          }
        }
        else if (nType === 'repeater') {
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
        else if (nType === 'inverter') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'FAILURE'
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : (r === 'SUCCESS' ? 'FAILURE' : 'SUCCESS') }
        }
        else if (nType === 'forcesuccess' || nType === 'force_success') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'SUCCESS'
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : 'SUCCESS' }
        }
        else if (nType === 'forcefailure' || nType === 'force_failure') {
          const child = childrenTuples[0]?.node
          if (!child) result = 'FAILURE'
          else { await pulseEdge(nodeId, child.id, signal); const r = await evaluateNode(child.id, signal); result = r === 'RUNNING' ? 'RUNNING' : 'FAILURE' }
        }
        // LEAF FALLBACK
        else if (nType === 'condition' || nType === 'action' || nKind === 'leaf') { 
          if (data.useBlackboard && data.bbKey) {
            result = evaluateBlackboard(data) ? 'SUCCESS' : 'FAILURE'
            const bbVar = blackboardRef.current.find(b => b.key === data.bbKey)
            addLog(`Blackboard: ${data.bbKey}(${bbVar ? bbVar.value : 'null'}) ${data.bbOperator} ${data.bbValue} => ${result}`, result)
          } else {
            result = data.expectedOutput ?? 'SUCCESS'
          }
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
  }, [resetSimulationVisuals, setEdges, setNodes, addLog, blackboardRef, edgesRef, nodesRef, projectsRef, tickSpeedRef])

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

  return {
    logs,
    isPlaying,
    tickSpeedMs,
    setTickSpeedMs,
    handlePlayPause,
    handleStop,
    runSimulation
  }
}