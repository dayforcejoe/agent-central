import { Bot, CheckCircle2, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Agent } from '../types/agent'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function StatsBar({ agents }: { agents: Agent[] }) {
  const total = agents.length
  const active = agents.filter(a => a.status === 'active').length
  const degraded = agents.filter(a => a.status === 'degraded').length
  const totalTasks = agents.reduce((s, a) => s + a.totalTasksCompleted, 0)
  const todayTasks = agents.reduce((s, a) => {
    const h = a.performanceHistory
    return s + (h.length > 0 ? h[h.length - 1].tasksCompleted : 0)
  }, 0)
  const avgSuccess = agents.filter(a => a.successRate > 0)
    .reduce((s, a, _, arr) => s + a.successRate / arr.length, 0)

  const stats = [
    {
      label: 'Total agents',
      value: String(total),
      sub: `${active} active`,
      icon: Bot,
      color: '#3067db',
      tint: '#ebf0fc',
      accent: '#3067db',
    },
    {
      label: 'Health status',
      value: `${active}/${total}`,
      sub: degraded > 0 ? `${degraded} degraded — action needed` : 'All systems nominal',
      icon: degraded > 0 ? AlertTriangle : CheckCircle2,
      color: degraded > 0 ? '#985d10' : '#078d79',
      tint: degraded > 0 ? '#fdf8ec' : '#e6f5f2',
      accent: degraded > 0 ? '#efc056' : '#078d79',
    },
    {
      label: 'Tasks today',
      value: fmt(todayTasks),
      sub: `${fmt(totalTasks)} total`,
      icon: Zap,
      color: '#596ae1',
      tint: '#eef0fe',
      accent: '#596ae1',
    },
    {
      label: 'Avg success rate',
      value: `${avgSuccess.toFixed(1)}%`,
      sub: 'Across active agents',
      icon: TrendingUp,
      color: '#0a9e8a',
      tint: '#e5f7f5',
      accent: '#0a9e8a',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map(stat => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-white rounded-evr-md border border-evr-border-decorative p-4"
            style={{
              boxShadow: 'var(--evr-shadow-02)',
              borderLeft: `3px solid ${stat.accent}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-evr-text-low uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-evr-text-high leading-none">{stat.value}</p>
                <p className="text-[11px] text-evr-text-low mt-1 leading-snug">{stat.sub}</p>
              </div>
              <div
                className="w-8 h-8 rounded-evr-sm flex items-center justify-center shrink-0"
                style={{ backgroundColor: stat.tint }}
              >
                <Icon size={16} style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
