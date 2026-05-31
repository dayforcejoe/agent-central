import { useNavigate } from 'react-router-dom'
import {
  Calculator, Users, Shield, Star, BarChart2, Briefcase, Heart, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle, Clock, ArrowRight, Edit2, Zap,
} from 'lucide-react'
import type { Agent, AgentCategory, AgentStatus } from '../types/agent'

const categoryConfig: Record<AgentCategory, { gradient: string; icon: React.ElementType; label: string }> = {
  payroll:     { gradient: 'from-blue-500 to-blue-700',    icon: Calculator,  label: 'Payroll' },
  workforce:   { gradient: 'from-teal-500 to-teal-700',    icon: Users,       label: 'Workforce' },
  compliance:  { gradient: 'from-red-500 to-rose-700',     icon: Shield,      label: 'Compliance' },
  talent:      { gradient: 'from-purple-500 to-violet-700',icon: Star,        label: 'Talent' },
  analytics:   { gradient: 'from-emerald-500 to-green-700',icon: BarChart2,   label: 'Analytics' },
  onboarding:  { gradient: 'from-orange-500 to-amber-700', icon: Briefcase,   label: 'Onboarding' },
  benefits:    { gradient: 'from-pink-500 to-rose-700',    icon: Heart,       label: 'Benefits' },
  performance: { gradient: 'from-violet-500 to-purple-700',icon: TrendingUp,  label: 'Performance' },
}

const statusConfig: Record<AgentStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  active:      { icon: CheckCircle2,   label: 'Active',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  inactive:    { icon: XCircle,        label: 'Inactive',     color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
  degraded:    { icon: AlertTriangle,  label: 'Degraded',     color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  maintenance: { icon: Clock,          label: 'Maintenance',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface AgentCardProps {
  agent: Agent
  onEdit: (agent: Agent) => void
}

export default function AgentCard({ agent, onEdit }: AgentCardProps) {
  const navigate = useNavigate()
  const cat = categoryConfig[agent.category]
  const status = statusConfig[agent.status]
  const Icon = cat.icon
  const StatusIcon = status.icon

  return (
    <div className="group relative w-64 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-hover cursor-pointer">
      {/* Card top gradient band */}
      <div
        className={`bg-gradient-to-br ${cat.gradient} relative h-36 flex flex-col items-center justify-center`}
        onClick={() => navigate(`/agents/${agent.id}`)}
      >
        {/* Source badge */}
        <div className="absolute top-3 left-3">
          {agent.source === 'dayforce' ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm border border-white/30 tracking-wide">
              DAYFORCE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm border border-white/30 tracking-wide">
              CUSTOM
            </span>
          )}
        </div>

        {/* Status dot */}
        <div className="absolute top-3 right-3">
          <span className={`w-2.5 h-2.5 rounded-full block ${
            agent.status === 'active' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/60' :
            agent.status === 'degraded' ? 'bg-amber-400 shadow-lg shadow-amber-400/60' :
            agent.status === 'maintenance' ? 'bg-blue-300 shadow-lg shadow-blue-300/60' :
            'bg-slate-400'
          }`} />
        </div>

        {/* Category icon */}
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-2 shadow-lg">
          <Icon className="text-white" size={26} />
        </div>

        {/* Category label */}
        <span className="text-white/80 text-xs font-medium tracking-wide uppercase">{cat.label}</span>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3" onClick={() => navigate(`/agents/${agent.id}`)}>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
            {agent.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
            {agent.description}
          </p>
        </div>

        {/* Status badge */}
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium self-start ${status.bg} ${status.color}`}>
          <StatusIcon size={11} />
          {status.label}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-slate-900">{fmt(agent.totalTasksCompleted)}</div>
            <div className="text-[10px] text-slate-500 leading-tight">Tasks Done</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-slate-900">{agent.successRate > 0 ? `${agent.successRate}%` : '—'}</div>
            <div className="text-[10px] text-slate-500 leading-tight">Success Rate</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-slate-900">{agent.activeUsers > 0 ? agent.activeUsers : '—'}</div>
            <div className="text-[10px] text-slate-500 leading-tight">Active Users</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-slate-900">{agent.totalCostSavings > 0 ? `$${fmt(agent.totalCostSavings)}` : '—'}</div>
            <div className="text-[10px] text-slate-500 leading-tight">Value</div>
          </div>
        </div>
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 bg-white border-t border-slate-100 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={e => { e.stopPropagation(); onEdit(agent) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border-r border-slate-100"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/agents/${agent.id}`) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Zap size={12} />
          Review
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
