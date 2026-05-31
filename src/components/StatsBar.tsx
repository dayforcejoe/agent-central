import { Bot, CheckCircle2, Zap, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Agent } from '../types/agent'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface StatsBarProps {
  agents: Agent[]
}

export default function StatsBar({ agents }: StatsBarProps) {
  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.status === 'active').length
  const degradedAgents = agents.filter(a => a.status === 'degraded').length
  const totalTasks = agents.reduce((s, a) => s + a.totalTasksCompleted, 0)
  const totalSavings = agents.reduce((s, a) => s + a.totalCostSavings, 0)
  const totalHours = agents.reduce((s, a) => s + a.totalHoursSaved, 0)
  const avgSuccess = agents.filter(a => a.successRate > 0).reduce((s, a, _, arr) => s + a.successRate / arr.length, 0)

  const todayTasks = agents.reduce((s, a) => {
    const hist = a.performanceHistory
    return s + (hist.length > 0 ? hist[hist.length - 1].tasksCompleted : 0)
  }, 0)

  const stats = [
    {
      label: 'Total Agents',
      value: String(totalAgents),
      sub: `${activeAgents} active`,
      icon: Bot,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'border-l-blue-500',
    },
    {
      label: 'Active / Healthy',
      value: `${activeAgents}/${totalAgents}`,
      sub: degradedAgents > 0 ? `${degradedAgents} degraded` : 'All systems nominal',
      icon: degradedAgents > 0 ? AlertTriangle : CheckCircle2,
      iconBg: degradedAgents > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      iconColor: degradedAgents > 0 ? 'text-amber-600' : 'text-emerald-600',
      accent: degradedAgents > 0 ? 'border-l-amber-500' : 'border-l-emerald-500',
    },
    {
      label: 'Tasks Today',
      value: fmt(todayTasks),
      sub: `${fmt(totalTasks)} total`,
      icon: Zap,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      accent: 'border-l-violet-500',
    },
    {
      label: 'Avg Success Rate',
      value: `${avgSuccess.toFixed(1)}%`,
      sub: 'Across active agents',
      icon: TrendingUp,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      accent: 'border-l-teal-500',
    },
    {
      label: 'Total Value Generated',
      value: `$${fmt(totalSavings)}`,
      sub: `${fmt(totalHours)} hrs saved`,
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accent: 'border-l-emerald-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      {stats.map(stat => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${stat.accent} p-4 shadow-sm`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={stat.iconColor} size={18} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
