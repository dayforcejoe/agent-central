import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AgentCard from './AgentCard'
import type { Agent } from '../types/agent'

interface AgentRowProps {
  title: string
  subtitle?: string
  agents: Agent[]
  onEdit: (agent: Agent) => void
  action?: React.ReactNode
}

export default function AgentRow({ title, subtitle, agents, onEdit, action }: AgentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -560 : 560, behavior: 'smooth' })
  }

  if (agents.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400">
          <p className="text-sm font-medium">No agents yet</p>
          <p className="text-xs mt-1">Use the button above to add your first agent.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {title}
            <span className="ml-2 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{agents.length}</span>
          </h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div className="flex gap-1">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-3 pr-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {agents.map(agent => (
          <div key={agent.id} style={{ scrollSnapAlign: 'start' }}>
            <AgentCard agent={agent} onEdit={onEdit} />
          </div>
        ))}
      </div>
    </section>
  )
}
