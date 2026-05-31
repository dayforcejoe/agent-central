import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Trash2, Play, Pause, AlertTriangle, CheckCircle2, XCircle, Clock,
  Calculator, Users, Shield, Star, BarChart2, Briefcase, Heart, TrendingUp,
  Activity, DollarSign, Lock, FileCheck, Cpu, Globe, Zap, Search,
  ChevronDown, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart,
} from 'recharts'
import { useAgents } from '../context/AgentsContext'
import AddEditAgentModal from '../components/AddEditAgentModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import type { AgentCategory, AgentStatus, AgentFormData, AuditEntry, Permission } from '../types/agent'

const categoryGradient: Record<AgentCategory, string> = {
  payroll:     'from-blue-500 to-blue-700',
  workforce:   'from-teal-500 to-teal-700',
  compliance:  'from-red-500 to-rose-700',
  talent:      'from-purple-500 to-violet-700',
  analytics:   'from-emerald-500 to-green-700',
  onboarding:  'from-orange-500 to-amber-700',
  benefits:    'from-pink-500 to-rose-700',
  performance: 'from-violet-500 to-purple-700',
}

const categoryIcon: Record<AgentCategory, React.ElementType> = {
  payroll: Calculator, workforce: Users, compliance: Shield, talent: Star,
  analytics: BarChart2, onboarding: Briefcase, benefits: Heart, performance: TrendingUp,
}

const categoryLabel: Record<AgentCategory, string> = {
  payroll: 'Payroll', workforce: 'Workforce', compliance: 'Compliance', talent: 'Talent',
  analytics: 'Analytics', onboarding: 'Onboarding', benefits: 'Benefits', performance: 'Performance',
}

const statusConfig: Record<AgentStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active:      { label: 'Active',       icon: CheckCircle2,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  inactive:    { label: 'Inactive',     icon: XCircle,       color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200' },
  degraded:    { label: 'Degraded',     icon: AlertTriangle, color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  maintenance: { label: 'Maintenance',  icon: Clock,         color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Tab = 'overview' | 'performance' | 'value' | 'audit' | 'governance'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',         icon: Activity },
  { id: 'performance', label: 'Performance',       icon: TrendingUp },
  { id: 'value',       label: 'Value Metrics',     icon: DollarSign },
  { id: 'audit',       label: 'Audit Log',         icon: FileCheck },
  { id: 'governance',  label: 'Governance',        icon: Shield },
]

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={color} size={15} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function AuditBadge({ outcome }: { outcome: AuditEntry['outcome'] }) {
  if (outcome === 'success') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"><CheckCircle2 size={10} />Success</span>
  if (outcome === 'failure') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-full"><XCircle size={10} />Failed</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full"><AlertTriangle size={10} />Warning</span>
}

function ClassBadge({ cls }: { cls: Permission['dataClassification'] }) {
  const map = {
    public:       'bg-slate-50 text-slate-600 border-slate-200',
    internal:     'bg-blue-50 text-blue-700 border-blue-200',
    confidential: 'bg-amber-50 text-amber-700 border-amber-200',
    restricted:   'bg-red-50 text-red-700 border-red-200',
  } as const
  return <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${map[cls]}`}>{cls}</span>
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold text-slate-900">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAgent, updateAgent, deleteAgent } = useAgents()

  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState<'all' | 'success' | 'failure' | 'warning'>('all')
  const [auditPage, setAuditPage] = useState(0)

  const agent = getAgent(id!)
  if (!agent) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">Agent not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 text-sm hover:underline">← Back to Registry</button>
      </div>
    )
  }

  const cat = categoryIcon[agent.category]
  const catLabel = categoryLabel[agent.category]
  const gradient = categoryGradient[agent.category]
  const status = statusConfig[agent.status]
  const StatusIcon = status.icon
  const CatIcon = cat

  function handleSave(data: AgentFormData) {
    updateAgent(agent!.id, data)
    setEditing(false)
  }

  function handleDelete() {
    deleteAgent(agent!.id)
    navigate('/')
  }

  // Radar data for health overview
  const avgResp = agent.performanceHistory.length > 0
    ? agent.performanceHistory.reduce((s, p) => s + p.avgResponseTimeMs, 0) / agent.performanceHistory.length
    : 0
  const responseScore = Math.max(0, Math.min(100, 100 - (avgResp / 50)))

  const radarData = [
    { metric: 'Task Success', value: agent.successRate || 0 },
    { metric: 'Availability', value: agent.uptime },
    { metric: 'Response Speed', value: Math.round(responseScore) },
    { metric: 'User Adoption', value: Math.min(100, agent.activeUsers / 5) },
    { metric: 'Compliance', value: agent.complianceStatus === 'compliant' ? 100 : agent.complianceStatus === 'review-needed' ? 65 : 20 },
  ]

  const healthScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length)

  // Audit log filtering
  const filteredAudit = agent.auditLog.filter(entry => {
    if (auditOutcomeFilter !== 'all' && entry.outcome !== auditOutcomeFilter) return false
    if (auditSearch && !entry.action.toLowerCase().includes(auditSearch.toLowerCase()) && !entry.details.toLowerCase().includes(auditSearch.toLowerCase())) return false
    return true
  })
  const PAGE_SIZE = 8
  const auditPages = Math.ceil(filteredAudit.length / PAGE_SIZE)
  const pagedAudit = filteredAudit.slice(auditPage * PAGE_SIZE, (auditPage + 1) * PAGE_SIZE)

  // Cumulative value for value tab
  const cumulativeValue = agent.valueHistory.map((v, i) => ({
    ...v,
    cumulative: agent.valueHistory.slice(0, i + 1).reduce((s, x) => s + x.costSavings, 0),
  }))

  return (
    <div className="animate-fade-in">
      {/* Hero banner */}
      <div className={`bg-gradient-to-r ${gradient} rounded-2xl overflow-hidden mb-6 shadow-lg`}>
        <div className="px-6 py-6 flex items-center gap-5">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-xl">
            <CatIcon className="text-white" size={30} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 tracking-wide">
                {agent.source === 'dayforce' ? 'DAYFORCE' : 'CUSTOM'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                {catLabel}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                <StatusIcon size={11} />
                {status.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1.5 truncate">{agent.name}</h1>
            <p className="text-white/75 text-sm mt-0.5 line-clamp-1">{agent.description}</p>
            <p className="text-white/60 text-xs mt-1.5">
              v{agent.version} · {agent.modelVersion} · Updated {fmtDate(agent.updatedAt)}
            </p>
          </div>

          {/* Health score */}
          <div className="shrink-0 text-center hidden md:block">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl font-bold text-2xl ${
              healthScore >= 90 ? 'bg-emerald-400/90 text-white' :
              healthScore >= 75 ? 'bg-amber-400/90 text-white' :
              'bg-red-400/90 text-white'
            }`}>
              {healthScore >= 90 ? 'A' : healthScore >= 80 ? 'B' : healthScore >= 70 ? 'C' : 'D'}
            </div>
            <div className="text-white/80 text-xs mt-1.5 font-medium">Health</div>
            <div className="text-white/60 text-xs">{healthScore}/100</div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Edit2 size={13} />
              Edit
            </button>
            {agent.source === 'custom' && (
              <button
                onClick={() => setDeleting(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-sm border border-red-300/30 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Top-level KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/20 divide-x divide-white/20">
          {[
            { label: 'Total Tasks', value: fmt(agent.totalTasksCompleted) },
            { label: 'Success Rate', value: agent.successRate > 0 ? `${agent.successRate}%` : 'N/A' },
            { label: 'Active Users', value: agent.activeUsers > 0 ? String(agent.activeUsers) : 'N/A' },
            { label: 'Uptime', value: `${agent.uptime}%` },
          ].map(kpi => (
            <div key={kpi.label} className="px-6 py-3 text-center">
              <div className="text-lg font-bold text-white">{kpi.value}</div>
              <div className="text-white/60 text-xs mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const TIcon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <TIcon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {/* ─────────── OVERVIEW TAB ─────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health radar */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={15} className="text-blue-600" />
                    Health Score Breakdown
                  </h3>
                  {agent.performanceHistory.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No performance data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Description + metadata */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">About this Agent</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {agent.longDescription || agent.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Created By', value: agent.createdBy, icon: Cpu },
                      { label: 'Data Region', value: agent.dataResidency, icon: Globe },
                      { label: 'Risk Level', value: agent.riskLevel.charAt(0).toUpperCase() + agent.riskLevel.slice(1), icon: AlertTriangle },
                      { label: 'Compliance', value: agent.complianceStatus === 'compliant' ? 'Compliant' : agent.complianceStatus === 'review-needed' ? 'Review Needed' : 'Non-Compliant', icon: Shield },
                      { label: 'Last Review', value: fmtDate(agent.lastReviewedAt), icon: FileCheck },
                      { label: 'Next Review Due', value: fmtDate(agent.nextReviewDue), icon: Clock },
                    ].map(item => {
                      const ItemIcon = item.icon
                      return (
                        <div key={item.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                            <ItemIcon size={11} />
                            {item.label}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{item.value}</div>
                        </div>
                      )
                    })}
                  </div>

                  {agent.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total Cost Savings" value={agent.totalCostSavings > 0 ? `$${fmt(agent.totalCostSavings)}` : 'N/A'} sub="Since deployment" icon={DollarSign} color="text-emerald-600" />
                <MetricCard label="Hours Saved" value={agent.totalHoursSaved > 0 ? fmt(agent.totalHoursSaved) : 'N/A'} sub="Total hours automated" icon={Clock} color="text-blue-600" />
                <MetricCard label="Errors Avoided" value={agent.totalErrorsAvoided > 0 ? fmt(agent.totalErrorsAvoided) : 'N/A'} sub="Prevented downstream" icon={Shield} color="text-violet-600" />
                <MetricCard label="API Quota" value={`${agent.apiQuotaUsed}%`} sub={`of ${agent.apiQuotaLimit} unit limit used`} icon={Zap} color="text-amber-600" />
              </div>
            </div>
          )}

          {/* ─────────── PERFORMANCE TAB ─────────── */}
          {tab === 'performance' && (
            <div className="space-y-8">
              {agent.performanceHistory.length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                  <Activity size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No performance history yet</p>
                  <p className="text-xs mt-1">Data will appear after the agent starts processing tasks.</p>
                </div>
              ) : (
                <>
                  {/* 30-day summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const last7 = agent.performanceHistory.slice(-7)
                      const prev7 = agent.performanceHistory.slice(-14, -7)
                      const avgTasks = Math.round(last7.reduce((s, p) => s + p.tasksCompleted, 0) / last7.length)
                      const prevTasks = Math.round(prev7.reduce((s, p) => s + p.tasksCompleted, 0) / prev7.length)
                      const avgRate = (last7.reduce((s, p) => s + p.successRate, 0) / last7.length).toFixed(1)
                      const avgResp7 = Math.round(last7.reduce((s, p) => s + p.avgResponseTimeMs, 0) / last7.length)
                      const avgUsers7 = Math.round(last7.reduce((s, p) => s + p.activeUsers, 0) / last7.length)
                      const trend = prevTasks > 0 ? ((avgTasks - prevTasks) / prevTasks * 100).toFixed(1) : '0'
                      return [
                        { label: 'Avg Daily Tasks (7d)', value: fmt(avgTasks), sub: `${Number(trend) >= 0 ? '↑' : '↓'} ${Math.abs(Number(trend))}% vs prior week`, icon: Zap, color: 'text-blue-600' },
                        { label: 'Avg Success Rate (7d)', value: `${avgRate}%`, sub: 'Task completion quality', icon: CheckCircle2, color: 'text-emerald-600' },
                        { label: 'Avg Response Time (7d)', value: `${avgResp7}ms`, sub: avgResp7 < 1000 ? 'Excellent' : avgResp7 < 2000 ? 'Good' : 'Needs attention', icon: Activity, color: 'text-violet-600' },
                        { label: 'Avg Active Users (7d)', value: String(avgUsers7), sub: 'Unique users per day', icon: Users, color: 'text-teal-600' },
                      ]
                    })().map(m => <MetricCard key={m.label} {...m} />)}
                  </div>

                  {/* Tasks over time */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Tasks Completed — Last 30 Days</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={agent.performanceHistory} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="tasksCompleted" name="Tasks" stroke="#3b82f6" fill="url(#tasksGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Area type="monotone" dataKey="errorCount" name="Errors" stroke="#ef4444" fill="url(#errorGrad)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Success rate + Response time side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Success Rate Trend</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={agent.performanceHistory} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[80, 100]} unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="successRate" name="Success %" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Response Time (ms)</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={agent.performanceHistory} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="avgResponseTimeMs" name="Response ms" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─────────── VALUE METRICS TAB ─────────── */}
          {tab === 'value' && (
            <div className="space-y-8">
              {/* Lifetime totals */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4">Lifetime Value Generated</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <DollarSign className="mx-auto text-emerald-600 mb-2" size={22} />
                    <div className="text-3xl font-bold text-emerald-900">${fmt(agent.totalCostSavings)}</div>
                    <div className="text-sm text-emerald-700 mt-1">Total Cost Savings</div>
                    <div className="text-xs text-emerald-600/70 mt-0.5">Through automated processing</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
                    <Clock className="mx-auto text-blue-600 mb-2" size={22} />
                    <div className="text-3xl font-bold text-blue-900">{fmt(agent.totalHoursSaved)}</div>
                    <div className="text-sm text-blue-700 mt-1">Hours Reclaimed</div>
                    <div className="text-xs text-blue-600/70 mt-0.5">Equivalent to {Math.round(agent.totalHoursSaved / 2000)} FTEs / year</div>
                  </div>
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 text-center">
                    <Shield className="mx-auto text-violet-600 mb-2" size={22} />
                    <div className="text-3xl font-bold text-violet-900">{fmt(agent.totalErrorsAvoided)}</div>
                    <div className="text-sm text-violet-700 mt-1">Errors Prevented</div>
                    <div className="text-xs text-violet-600/70 mt-0.5">Avoided downstream corrections</div>
                  </div>
                </div>
              </div>

              {agent.valueHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No value history yet.</p>
                </div>
              ) : (
                <>
                  {/* Daily cost savings bar chart */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Daily Cost Savings — Last 30 Days</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={agent.valueHistory} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${fmt(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="costSavings" name="Cost Savings ($)" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cumulative value area + hours saved */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Cumulative Savings (30d)</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={cumulativeValue} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${fmt(v)}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="cumulative" name="Cumulative ($)" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Hours Saved per Day</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart data={agent.valueHistory} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="hoursSaved" name="Hours Saved" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} opacity={0.8} />
                          <Line type="monotone" dataKey="errorsAvoided" name="Errors Avoided" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─────────── AUDIT LOG TAB ─────────── */}
          {tab === 'audit' && (
            <div>
              <div className="flex flex-wrap gap-3 items-center mb-5">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={e => { setAuditSearch(e.target.value); setAuditPage(0) }}
                    placeholder="Search audit log..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={auditOutcomeFilter}
                    onChange={e => { setAuditOutcomeFilter(e.target.value as typeof auditOutcomeFilter); setAuditPage(0) }}
                    className="pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="warning">Warning</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                </div>
                <span className="text-xs text-slate-500 ml-auto">{filteredAudit.length} entries</span>
              </div>

              {pagedAudit.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileCheck size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No audit entries match your filters.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Timestamp</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden md:table-cell">Actor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden lg:table-cell">Module</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedAudit.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">{fmtDateTime(entry.timestamp)}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-medium text-slate-800 text-xs">{entry.action.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{entry.details}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="text-xs text-slate-700 font-medium">{entry.actor}</div>
                            <div className="text-xs text-slate-400 capitalize">{entry.actorType}</div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full border border-slate-200">{entry.module}</span>
                          </td>
                          <td className="px-4 py-3">
                            <AuditBadge outcome={entry.outcome} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {auditPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                      <span className="text-xs text-slate-500">Page {auditPage + 1} of {auditPages}</span>
                      <div className="flex gap-2">
                        <button
                          disabled={auditPage === 0}
                          onClick={() => setAuditPage(p => p - 1)}
                          className="px-3 py-1 text-xs border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >← Prev</button>
                        <button
                          disabled={auditPage >= auditPages - 1}
                          onClick={() => setAuditPage(p => p + 1)}
                          className="px-3 py-1 text-xs border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─────────── GOVERNANCE TAB ─────────── */}
          {tab === 'governance' && (
            <div className="space-y-6">
              {/* Risk + Compliance header row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-xl border p-4 ${
                  agent.riskLevel === 'low' ? 'bg-emerald-50 border-emerald-200' :
                  agent.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className={agent.riskLevel === 'low' ? 'text-emerald-600' : agent.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'} />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Risk Level</span>
                  </div>
                  <div className={`text-xl font-bold capitalize ${
                    agent.riskLevel === 'low' ? 'text-emerald-800' :
                    agent.riskLevel === 'medium' ? 'text-amber-800' : 'text-red-800'
                  }`}>{agent.riskLevel}</div>
                </div>

                <div className={`rounded-xl border p-4 ${
                  agent.complianceStatus === 'compliant' ? 'bg-emerald-50 border-emerald-200' :
                  agent.complianceStatus === 'review-needed' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className={agent.complianceStatus === 'compliant' ? 'text-emerald-600' : agent.complianceStatus === 'review-needed' ? 'text-amber-600' : 'text-red-600'} />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Compliance</span>
                  </div>
                  <div className={`text-base font-bold ${
                    agent.complianceStatus === 'compliant' ? 'text-emerald-800' :
                    agent.complianceStatus === 'review-needed' ? 'text-amber-800' : 'text-red-800'
                  }`}>{agent.complianceStatus === 'compliant' ? 'Compliant' : agent.complianceStatus === 'review-needed' ? 'Review Needed' : 'Non-Compliant'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">API Quota Usage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          agent.apiQuotaUsed > 80 ? 'bg-red-500' :
                          agent.apiQuotaUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (agent.apiQuotaUsed / agent.apiQuotaLimit) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{agent.apiQuotaUsed}%</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{agent.apiQuotaUsed} / {agent.apiQuotaLimit} units used today</div>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileCheck size={15} className="text-blue-600" />
                  Compliance Certifications
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.certifications.map(cert => (
                    <div key={cert} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock size={15} className="text-blue-600" />
                    Review Schedule
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Last Reviewed', value: fmtDate(agent.lastReviewedAt) },
                      { label: 'Next Review Due', value: fmtDate(agent.nextReviewDue) },
                      { label: 'Data Residency', value: agent.dataResidency },
                      { label: 'Model Version', value: agent.modelVersion },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs text-slate-500">{item.label}</span>
                        <span className="text-xs font-semibold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Lock size={15} className="text-blue-600" />
                    Security Settings
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Encryption at Rest', value: 'AES-256', ok: true },
                      { label: 'Encryption in Transit', value: 'TLS 1.3', ok: true },
                      { label: 'Audit Logging', value: 'Enabled', ok: true },
                      { label: 'MFA Required', value: 'Enforced', ok: true },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs text-slate-500">{item.label}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={11} />
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data access permissions table */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Lock size={15} className="text-blue-600" />
                  Data Access Permissions
                </h3>
                {agent.permissions.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                    No permissions configured. {agent.source === 'custom' ? 'Add permissions in the Edit panel.' : ''}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Resource</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Access Level</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Classification</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden md:table-cell">Last Reviewed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agent.permissions.map((perm, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 text-sm">{perm.resource}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                                perm.access === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                perm.access === 'write' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>{perm.access.toUpperCase()}</span>
                            </td>
                            <td className="px-4 py-3"><ClassBadge cls={perm.dataClassification} /></td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{fmtDate(perm.lastReviewed)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editing && (
        <AddEditAgentModal agent={agent} onSave={handleSave} onClose={() => setEditing(false)} />
      )}
      {deleting && (
        <DeleteConfirmModal agent={agent} onConfirm={handleDelete} onCancel={() => setDeleting(false)} />
      )}
    </div>
  )
}
