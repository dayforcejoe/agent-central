import { useState } from 'react'
import { Plus, Filter, Search, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useAgents } from '../context/AgentsContext'
import StatsBar from '../components/StatsBar'
import AgentRow from '../components/AgentRow'
import AgentCard from '../components/AgentCard'
import AddEditAgentModal from '../components/AddEditAgentModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import type { Agent, AgentCategory, AgentStatus, AgentFormData } from '../types/agent'

type ViewMode = 'rows' | 'grid'
type SortKey = 'name' | 'tasks' | 'success' | 'savings' | 'updatedAt'

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  payroll: 'Payroll',
  workforce: 'Workforce',
  compliance: 'Compliance',
  talent: 'Talent',
  analytics: 'Analytics',
  onboarding: 'Onboarding',
  benefits: 'Benefits',
  performance: 'Performance',
}

export default function Dashboard() {
  const { agents, addAgent, updateAgent, deleteAgent } = useAgents()

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('rows')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<AgentCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'dayforce' | 'custom'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('tasks')

  function handleSave(data: AgentFormData) {
    if (editingAgent) {
      updateAgent(editingAgent.id, data)
    } else {
      addAgent(data)
    }
    setEditingAgent(null)
    setAddingNew(false)
  }

  function handleDelete() {
    if (deletingAgent) {
      deleteAgent(deletingAgent.id)
      setDeletingAgent(null)
    }
  }

  function handleEdit(agent: Agent) {
    setEditingAgent(agent)
    setAddingNew(false)
  }

  const filtered = agents.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterSource !== 'all' && a.source !== filterSource) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name)
      case 'tasks': return b.totalTasksCompleted - a.totalTasksCompleted
      case 'success': return b.successRate - a.successRate
      case 'savings': return b.totalCostSavings - a.totalCostSavings
      case 'updatedAt': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      default: return 0
    }
  })

  const dayforceAgents = sorted.filter(a => a.source === 'dayforce')
  const customAgents = sorted.filter(a => a.source === 'custom')
  const isFiltered = search || filterCategory !== 'all' || filterStatus !== 'all' || filterSource !== 'all'

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Registry</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage, monitor, and govern all AI agents in your Dayforce environment</p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditingAgent(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-200 transition-all hover:shadow-md hover:shadow-blue-200"
        >
          <Plus size={16} />
          Add Custom Agent
        </button>
      </div>

      {/* Stats */}
      <StatsBar agents={agents} />

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter agents..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as AgentCategory | 'all')}
              className="pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as AgentStatus | 'all')}
              className="pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="degraded">Degraded</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>

          <div className="relative">
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value as 'all' | 'dayforce' | 'custom')}
              className="pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="dayforce">Dayforce</option>
              <option value="custom">Custom</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer"
            >
              <option value="tasks">Sort: Most Tasks</option>
              <option value="success">Sort: Success Rate</option>
              <option value="savings">Sort: Value Generated</option>
              <option value="name">Sort: Name A–Z</option>
              <option value="updatedAt">Sort: Recently Updated</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
          </div>
        </div>

        <div className="flex gap-1 ml-auto border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button
            onClick={() => setViewMode('rows')}
            title="Row view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'rows' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Filter size={15} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Agent listing */}
      {isFiltered || viewMode === 'grid' ? (
        /* Flat grid when filtering or in grid mode */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              {sorted.length} Agent{sorted.length !== 1 ? 's' : ''}
              {isFiltered && <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Filtered</span>}
            </h2>
            {isFiltered && (
              <button
                onClick={() => { setSearch(''); setFilterCategory('all'); setFilterStatus('all'); setFilterSource('all') }}
                className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
          {sorted.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <Filter className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-sm font-medium text-slate-500">No agents match your filters</p>
              <button onClick={() => { setSearch(''); setFilterCategory('all'); setFilterStatus('all'); setFilterSource('all') }} className="text-xs text-blue-600 hover:underline mt-2">Clear all filters</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {sorted.map(agent => (
                <AgentCard key={agent.id} agent={agent} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Netflix rows */
        <>
          <AgentRow
            title="Dayforce Agents"
            subtitle="Managed and maintained by the Dayforce platform"
            agents={dayforceAgents}
            onEdit={handleEdit}
          />
          <AgentRow
            title="Custom Agents"
            subtitle="Built and managed by your organization"
            agents={customAgents}
            onEdit={handleEdit}
            action={
              <button
                onClick={() => { setAddingNew(true); setEditingAgent(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={13} />
                Add Custom
              </button>
            }
          />
        </>
      )}

      {/* Modals */}
      {(addingNew || editingAgent) && (
        <AddEditAgentModal
          agent={editingAgent}
          onSave={handleSave}
          onClose={() => { setAddingNew(false); setEditingAgent(null) }}
        />
      )}
      {deletingAgent && (
        <DeleteConfirmModal
          agent={deletingAgent}
          onConfirm={handleDelete}
          onCancel={() => setDeletingAgent(null)}
        />
      )}
    </div>
  )
}
