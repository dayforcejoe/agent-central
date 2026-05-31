import { useNavigate } from 'react-router-dom'
import {
  Calculator, Users, Shield, Star, BarChart2, Briefcase, Heart, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle, Clock, ArrowRight, Edit2,
} from 'lucide-react'
import type { Agent, AgentCategory, AgentStatus } from '../types/agent'

// ── Everest-aligned category config ──────────────────────────────────────
const catCfg: Record<AgentCategory, {
  icon: React.ElementType; label: string; color: string; tint: string; accent: string
}> = {
  payroll:     { icon: Calculator, label: 'Payroll',      color: '#3067db', tint: '#ebf0fc', accent: 'cat-accent-payroll' },
  workforce:   { icon: Users,      label: 'Workforce',    color: '#0a9e8a', tint: '#e5f7f5', accent: 'cat-accent-workforce' },
  compliance:  { icon: Shield,     label: 'Compliance',   color: '#c64e33', tint: '#fdf0ed', accent: 'cat-accent-compliance' },
  talent:      { icon: Star,       label: 'Talent',       color: '#7c3aed', tint: '#f0eafb', accent: 'cat-accent-talent' },
  analytics:   { icon: BarChart2,  label: 'Analytics',    color: '#1d7fcc', tint: '#e8f3fc', accent: 'cat-accent-analytics' },
  onboarding:  { icon: Briefcase,  label: 'Onboarding',   color: '#d4900a', tint: '#fdf8ec', accent: 'cat-accent-onboarding' },
  benefits:    { icon: Heart,      label: 'Benefits',     color: '#b53068', tint: '#fceef3', accent: 'cat-accent-benefits' },
  performance: { icon: TrendingUp, label: 'Performance',  color: '#596ae1', tint: '#eef0fe', accent: 'cat-accent-performance' },
}

const statusCfg: Record<AgentStatus, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  active:      { icon: CheckCircle2,  label: 'Active',       color: '#078d79', bg: '#e6f5f2' },
  inactive:    { icon: XCircle,       label: 'Inactive',     color: '#5e5e62', bg: '#f2f0f0' },
  degraded:    { icon: AlertTriangle, label: 'Degraded',     color: '#985d10', bg: '#fdf8ec' },
  maintenance: { icon: Clock,         label: 'Maintenance',  color: '#3067db', bg: '#ebf0fc' },
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
  const cat = catCfg[agent.category]
  const st = statusCfg[agent.status]
  const Icon = cat.icon
  const StatusIcon = st.icon

  return (
    <div
      className={`group relative w-60 flex-shrink-0 bg-white rounded-evr-md border border-evr-border-decorative overflow-hidden cursor-pointer
        ${cat.accent} transition-all duration-150 hover:shadow-evr-04`}
      onClick={() => navigate(`/agents/${agent.id}`)}
      style={{ borderLeft: `3px solid ${cat.color}` }}
    >
      {/* Card header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Category icon with tinted background — Everest Highlighted Icon pattern */}
          <div
            className="w-9 h-9 rounded-evr-sm flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: cat.tint }}
          >
            <Icon size={18} style={{ color: cat.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {/* Status dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: st.color,
                  boxShadow: agent.status === 'active' ? `0 0 0 3px ${cat.tint}` : undefined }}
              />
              <h3 className="text-sm font-semibold text-evr-text-high truncate leading-tight group-hover:text-evr-blue-400 transition-colors">
                {agent.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cat.color }}>
                {cat.label}
              </span>
              <span className="text-evr-border-subtle text-[10px]">·</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                agent.source === 'dayforce' ? 'text-evr-blue-400 bg-evr-blue-tint' : 'text-evr-text-low bg-evr-surface-secondary'
              }`}>
                {agent.source === 'dayforce' ? 'Dayforce' : 'Custom'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-evr-text-low mt-2.5 leading-relaxed line-clamp-2">
          {agent.description}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-evr-border-decorative mx-4" />

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        {[
          { label: 'Tasks', value: agent.totalTasksCompleted > 0 ? fmt(agent.totalTasksCompleted) : '—' },
          { label: 'Success', value: agent.successRate > 0 ? `${agent.successRate}%` : '—' },
          { label: 'Users', value: agent.activeUsers > 0 ? String(agent.activeUsers) : '—' },
          { label: 'Value', value: agent.totalCostSavings > 0 ? `$${fmt(agent.totalCostSavings)}` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-evr-surface-secondary rounded-evr-sm px-2 py-1.5">
            <div className="text-[10px] text-evr-text-low">{s.label}</div>
            <div className="text-sm font-bold text-evr-text-high leading-tight">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status badge */}
      <div className="px-4 pb-3">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: st.color, backgroundColor: st.bg }}
        >
          <StatusIcon size={10} />
          {st.label}
        </span>
      </div>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 flex border-t border-evr-border-decorative bg-white
        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={e => { e.stopPropagation(); onEdit(agent) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium
            text-evr-text-default hover:bg-evr-surface-secondary transition-colors border-r border-evr-border-decorative"
        >
          <Edit2 size={11} />
          Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/agents/${agent.id}`) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
          style={{ color: '#3067db' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ebf0fc')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          Review
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
