import { ReactFlowProvider } from 'reactflow'
import { BehaviorTreeEditor } from './components/BehaviorTreeEditor'

function App() {
  return (
    <ReactFlowProvider>
      <BehaviorTreeEditor />
    </ReactFlowProvider>
  )
}

export default App
