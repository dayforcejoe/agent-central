import { HashRouter, Routes, Route } from 'react-router-dom'
import { AgentsProvider } from './context/AgentsContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AgentDetail from './pages/AgentDetail'

export default function App() {
  return (
    <HashRouter>
      <AgentsProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
          </Routes>
        </Layout>
      </AgentsProvider>
    </HashRouter>
  )
}
