import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Edit2, Trash2, AlertTriangle, CheckCircle2, XCircle, Clock,
  Calculator, Users, Shield, Star, BarChart2, Briefcase, Heart, TrendingUp,
  Activity, DollarSign, Lock, FileCheck, Cpu, Globe, Zap, Search,
  ChevronDown, MessageSquare, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, PieChart, Pie, Cell,
} from 'recharts'
import { useAgents } from '../context/AgentsContext'
import AddEditAgentModal from '../components/AddEditAgentModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import type { AgentCategory, AgentStatus, AgentFormData, AuditEntry, Permission } from '../types/agent'

// ── Category / status config ───────────────────────────────────────────────
const catCfg: Record<AgentCategory, { icon: React.ElementType; label: string; color: string; tint: string }> = {
  payroll:     { icon: Calculator, label: 'Payroll',      color: '#3067db', tint: '#ebf0fc' },
  workforce:   { icon: Users,      label: 'Workforce',    color: '#0a9e8a', tint: '#e5f7f5' },
  compliance:  { icon: Shield,     label: 'Compliance',   color: '#c64e33', tint: '#fdf0ed' },
  talent:      { icon: Star,       label: 'Talent',       color: '#7c3aed', tint: '#f0eafb' },
  analytics:   { icon: BarChart2,  label: 'Analytics',    color: '#1d7fcc', tint: '#e8f3fc' },
  onboarding:  { icon: Briefcase,  label: 'Onboarding',   color: '#d4900a', tint: '#fdf8ec' },
  benefits:    { icon: Heart,      label: 'Benefits',     color: '#b53068', tint: '#fceef3' },
  performance: { icon: TrendingUp, label: 'Performance',  color: '#596ae1', tint: '#eef0fe' },
}

const statusCfg: Record<AgentStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active:      { label: 'Active',       icon: CheckCircle2,  color: '#078d79', bg: '#e6f5f2' },
  inactive:    { label: 'Inactive',     icon: XCircle,       color: '#5e5e62', bg: '#f2f0f0' },
  degraded:    { label: 'Degraded',     icon: AlertTriangle, color: '#985d10', bg: '#fdf8ec' },
  maintenance: { label: 'Maintenance',  icon: Clock,         color: '#3067db', bg: '#ebf0fc' },
}

// ── Helpers ────────────────────────────────────────────────────────────────
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
function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

type Tab = 'overview' | 'performance' | 'value' | 'audit' | 'governance' | 'observability'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Overview',      icon: Activity },
  { id: 'performance',    label: 'Performance',   icon: TrendingUp },
  { id: 'value',          label: 'Value',         icon: DollarSign },
  { id: 'audit',          label: 'Audit log',     icon: FileCheck },
  { id: 'governance',     label: 'Governance',    icon: Shield },
  { id: 'observability',  label: 'Observability', icon: Zap, },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-evr-border-decorative rounded-evr-md shadow-evr-04 p-3 text-xs">
      <p className="font-semibold text-evr-text-high mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-evr-text-default">{p.name}:</span>
          <span className="font-bold text-evr-text-high">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color, tint }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; tint: string
}) {
  return (
    <div className="bg-white rounded-evr-md border border-evr-border-decorative p-4" style={{ boxShadow: 'var(--evr-shadow-02)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-6 h-6 rounded-evr-sm flex items-center justify-center" style={{ backgroundColor: tint }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-evr-text-high">{value}</div>
      {sub && <div className="text-xs text-evr-text-low mt-0.5">{sub}</div>}
    </div>
  )
}

function AuditBadge({ outcome }: { outcome: AuditEntry['outcome'] }) {
  if (outcome === 'success') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ color: '#078d79', backgroundColor: '#e6f5f2' }}><CheckCircle2 size={9} />Success</span>
  if (outcome === 'failure') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ color: '#c64e33', backgroundColor: '#fdf0ed' }}><XCircle size={9} />Failed</span>
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ color: '#985d10', backgroundColor: '#fdf8ec' }}><AlertTriangle size={9} />Warning</span>
}

function ClassBadge({ cls }: { cls: Permission['dataClassification'] }) {
  const map = { public: ['#5e5e62','#f2f0f0'], internal: ['#3067db','#ebf0fc'], confidential: ['#985d10','#fdf8ec'], restricted: ['#c64e33','#fdf0ed'] } as const
  const [color, bg] = map[cls]
  return <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full capitalize" style={{ color, backgroundColor: bg }}>{cls}</span>
}

const OBS_OPERATION_COLORS: Record<string, string> = {
  invoke_agent: '#3067db', inference: '#0a9e8a', execute_tool: '#d4900a',
  invoke_workflow: '#596ae1', embeddings: '#b53068',
}
const FR_COLORS: Record<string, string> = {
  stop: '#078d79', tool_calls: '#3067db', length: '#efc056', content_filter: '#c64e33',
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAgent, updateAgent, deleteAgent } = useAgents()

  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditFilter, setAuditFilter] = useState<'all' | 'success' | 'failure' | 'warning'>('all')
  const [auditPage, setAuditPage] = useState(0)

  const agent = getAgent(id!)
  if (!agent) return (
    <div className="text-center py-32">
      <p className="text-evr-text-low text-sm">Agent not found</p>
      <button onClick={() => navigate('/')} className="mt-3 text-evr-blue-400 text-sm hover:underline">← Back to registry</button>
    </div>
  )

  const cat = catCfg[agent.category]
  const st = statusCfg[agent.status]
  const CatIcon = cat.icon
  const StatusIcon = st.icon

  function handleSave(data: AgentFormData) { updateAgent(agent!.id, data); setEditing(false) }
  function handleDelete() { deleteAgent(agent!.id); navigate('/') }

  // ── Overview: health radar ─────────────────────────────────────────────
  const avgResp = agent.performanceHistory.length > 0
    ? agent.performanceHistory.reduce((s, p) => s + p.avgResponseTimeMs, 0) / agent.performanceHistory.length : 0
  const radarData = [
    { metric: 'Task success', value: agent.successRate || 0 },
    { metric: 'Availability', value: agent.uptime },
    { metric: 'Response speed', value: Math.max(0, Math.min(100, 100 - avgResp / 50)) },
    { metric: 'User adoption', value: Math.min(100, agent.activeUsers / 5) },
    { metric: 'Compliance', value: agent.complianceStatus === 'compliant' ? 100 : agent.complianceStatus === 'review-needed' ? 65 : 20 },
  ]
  const healthScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length)

  // ── Audit filtering ───────────────────────────────────────────────────
  const filteredAudit = agent.auditLog.filter(e => {
    if (auditFilter !== 'all' && e.outcome !== auditFilter) return false
    if (auditSearch && !e.action.toLowerCase().includes(auditSearch.toLowerCase()) && !e.details.toLowerCase().includes(auditSearch.toLowerCase())) return false
    return true
  })
  const PAGE = 8
  const auditPages = Math.ceil(filteredAudit.length / PAGE)

  // ── Observability data shortcuts ──────────────────────────────────────
  const obs = agent.observability
  const cumulativeCost = obs.tokenUsageHistory.map((d, i) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cumulative: Math.round(obs.tokenUsageHistory.slice(0, i + 1).reduce((s, x) => s + x.estimatedCostUsd, 0) * 100) / 100,
    daily: d.estimatedCostUsd,
  }))

  return (
    <div className="animate-fade-in">
      {/* ── Agent hero ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-evr-md border border-evr-border-decorative mb-5 overflow-hidden"
        style={{ boxShadow: 'var(--evr-shadow-02)', borderLeft: `4px solid ${cat.color}` }}>
        {/* Header row */}
        <div className="px-6 py-5 flex items-start gap-4">
          {/* Category icon */}
          <div className="w-12 h-12 rounded-evr-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: cat.tint }}>
            <CatIcon size={24} style={{ color: cat.color }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cat.color }}>{cat.label}</span>
              <span className="text-evr-border-subtle text-[10px]">·</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                agent.source === 'dayforce' ? 'text-evr-blue-400 bg-evr-blue-tint' : 'text-evr-text-low bg-evr-surface-secondary'
              }`}>{agent.source === 'dayforce' ? 'Dayforce' : 'Custom'}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{ color: st.color, backgroundColor: st.bg }}>
                <StatusIcon size={10} />
                {st.label}
              </span>
            </div>
            <h1 className="text-lg font-bold text-evr-text-high">{agent.name}</h1>
            <p className="text-sm text-evr-text-low mt-0.5 line-clamp-1">{agent.description}</p>
            <p className="text-xs text-evr-text-low mt-1.5">
              v{agent.version} · {agent.modelVersion} · Updated {fmtDate(agent.updatedAt)}
            </p>
          </div>

          {/* Health grade */}
          <div className="shrink-0 text-center hidden sm:block">
            <div className={`w-12 h-12 rounded-evr-md flex items-center justify-center font-bold text-xl text-white`}
              style={{ backgroundColor: healthScore >= 90 ? '#078d79' : healthScore >= 75 ? '#d4900a' : '#c64e33' }}>
              {healthScore >= 90 ? 'A' : healthScore >= 80 ? 'B' : healthScore >= 70 ? 'C' : 'D'}
            </div>
            <div className="text-[10px] text-evr-text-low mt-1 font-medium">Health</div>
            <div className="text-[10px] text-evr-text-low">{healthScore}/100</div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex gap-2">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-evr-border-decorative rounded-evr-sm text-xs font-medium text-evr-text-default hover:bg-evr-surface-secondary transition-colors">
              <Edit2 size={12} />Edit
            </button>
            {agent.source === 'custom' && (
              <button onClick={() => setDeleting(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border rounded-evr-sm text-xs font-medium transition-colors"
                style={{ borderColor: '#fbd0c8', color: '#c64e33', backgroundColor: '#fdf0ed' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fbd0c8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fdf0ed')}>
                <Trash2 size={12} />Delete
              </button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-evr-border-decorative divide-x divide-evr-border-decorative">
          {[
            { label: 'Total tasks', value: fmt(agent.totalTasksCompleted) },
            { label: 'Success rate', value: agent.successRate > 0 ? `${agent.successRate}%` : 'N/A' },
            { label: 'Active users', value: agent.activeUsers > 0 ? String(agent.activeUsers) : 'N/A' },
            { label: 'Uptime', value: `${agent.uptime}%` },
          ].map(k => (
            <div key={k.label} className="px-6 py-3 text-center">
              <div className="text-base font-bold text-evr-text-high">{k.value}</div>
              <div className="text-[10px] text-evr-text-low mt-0.5 uppercase tracking-wide font-medium">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-evr-md border border-evr-border-decorative overflow-hidden"
        style={{ boxShadow: 'var(--evr-shadow-02)' }}>
        <div className="border-b border-evr-border-decorative flex overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const TIcon = t.icon
            const isObs = t.id === 'observability'
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-evr-blue-400 text-evr-blue-400 bg-evr-blue-tint/30'
                    : 'border-transparent text-evr-text-low hover:text-evr-text-default hover:bg-evr-surface-secondary'
                }`}>
                <TIcon size={13} />
                {t.label}
                {isObs && (
                  <span className="w-1.5 h-1.5 rounded-full bg-evr-success animate-pulse-dot" />
                )}
              </button>
            )
          })}
        </div>

        <div className="p-5">

          {/* ───────── OVERVIEW ───────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Radar */}
                <div>
                  <h3 className="text-xs font-semibold text-evr-text-high mb-3 flex items-center gap-1.5">
                    <Activity size={13} style={{ color: '#3067db' }} />
                    Health score breakdown
                  </h3>
                  {agent.performanceHistory.length === 0
                    ? <div className="h-56 flex items-center justify-center text-evr-text-low text-sm">No data yet</div>
                    : (
                      <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                          <PolarGrid stroke="#e1e2ed" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#5e5e62' }} />
                          <Radar name="Score" dataKey="value" stroke={cat.color} fill={cat.color} fillOpacity={0.12} strokeWidth={2} dot={{ fill: cat.color, r: 3 }} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                </div>

                {/* About + metadata */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-evr-text-high mb-2">About this agent</h3>
                    <p className="text-sm text-evr-text-default leading-relaxed">{agent.longDescription || agent.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Created by', value: agent.createdBy, icon: Cpu },
                      { label: 'Data region', value: agent.dataResidency, icon: Globe },
                      { label: 'Risk level', value: agent.riskLevel.charAt(0).toUpperCase() + agent.riskLevel.slice(1), icon: AlertTriangle },
                      { label: 'Compliance', value: agent.complianceStatus === 'compliant' ? 'Compliant' : 'Review needed', icon: Shield },
                      { label: 'Last review', value: fmtDate(agent.lastReviewedAt), icon: FileCheck },
                      { label: 'Next review', value: fmtDate(agent.nextReviewDue), icon: Clock },
                    ].map(item => {
                      const ItemIcon = item.icon
                      return (
                        <div key={item.label} className="bg-evr-surface-secondary rounded-evr-sm p-3 border border-evr-border-decorative">
                          <div className="flex items-center gap-1 text-[10px] text-evr-text-low mb-1">
                            <ItemIcon size={10} />{item.label}
                          </div>
                          <div className="text-xs font-semibold text-evr-text-high">{item.value}</div>
                        </div>
                      )
                    })}
                  </div>
                  {agent.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-evr-surface-secondary text-evr-text-low text-[11px] rounded-full border border-evr-border-decorative">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Cost savings" value={agent.totalCostSavings > 0 ? `$${fmt(agent.totalCostSavings)}` : 'N/A'} sub="Since deployment" icon={DollarSign} color="#078d79" tint="#e6f5f2" />
                <MetricCard label="Hours saved" value={agent.totalHoursSaved > 0 ? fmt(agent.totalHoursSaved) : 'N/A'} sub="Total automated" icon={Clock} color="#3067db" tint="#ebf0fc" />
                <MetricCard label="Errors avoided" value={agent.totalErrorsAvoided > 0 ? fmt(agent.totalErrorsAvoided) : 'N/A'} sub="Prevented downstream" icon={Shield} color="#596ae1" tint="#eef0fe" />
                <MetricCard label="API quota" value={`${agent.apiQuotaUsed}%`} sub={`of ${agent.apiQuotaLimit} unit limit`} icon={Zap} color="#d4900a" tint="#fdf8ec" />
              </div>
            </div>
          )}

          {/* ───────── PERFORMANCE ───────── */}
          {tab === 'performance' && (
            <div className="space-y-6">
              {agent.performanceHistory.length === 0 ? (
                <div className="py-20 text-center text-evr-text-low text-sm">No performance data yet</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const last7 = agent.performanceHistory.slice(-7)
                      const prev7 = agent.performanceHistory.slice(-14, -7)
                      const avgTasks = Math.round(last7.reduce((s, p) => s + p.tasksCompleted, 0) / last7.length)
                      const prevTasks = Math.round(prev7.reduce((s, p) => s + p.tasksCompleted, 0) / Math.max(1, prev7.length))
                      const trend = prevTasks > 0 ? ((avgTasks - prevTasks) / prevTasks * 100).toFixed(1) : '0'
                      return [
                        { label: 'Avg daily tasks (7d)', value: fmt(avgTasks), sub: `${Number(trend) >= 0 ? '↑' : '↓'} ${Math.abs(Number(trend))}% vs prior week`, icon: Zap, color: '#3067db', tint: '#ebf0fc' },
                        { label: 'Avg success rate (7d)', value: `${(last7.reduce((s, p) => s + p.successRate, 0) / last7.length).toFixed(1)}%`, sub: 'Task completion quality', icon: CheckCircle2, color: '#078d79', tint: '#e6f5f2' },
                        { label: 'Avg response time (7d)', value: fmtMs(Math.round(last7.reduce((s, p) => s + p.avgResponseTimeMs, 0) / last7.length)), sub: 'Median latency', icon: Activity, color: '#596ae1', tint: '#eef0fe' },
                        { label: 'Avg active users (7d)', value: String(Math.round(last7.reduce((s, p) => s + p.activeUsers, 0) / last7.length)), sub: 'Unique users per day', icon: Users, color: '#0a9e8a', tint: '#e5f7f5' },
                      ]
                    })().map(m => <MetricCard key={m.label} {...m} />)}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-evr-text-high mb-3">Tasks completed — last 30 days</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={agent.performanceHistory} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gradT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={cat.color} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={cat.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => fmt(v)} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="tasksCompleted" name="Tasks" stroke={cat.color} fill="url(#gradT)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="errorCount" name="Errors" stroke="#c64e33" fill="transparent" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      <h3 className="text-xs font-semibold text-evr-text-high mb-3">Success rate trend</h3>
                      <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={agent.performanceHistory} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} domain={[80, 100]} unit="%" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="successRate" name="Success %" stroke="#078d79" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-evr-text-high mb-3">Response time (ms)</h3>
                      <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={agent.performanceHistory} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="avgResponseTimeMs" name="Response ms" stroke="#596ae1" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ───────── VALUE ───────── */}
          {tab === 'value' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: DollarSign, label: 'Total cost savings', value: `$${fmt(agent.totalCostSavings)}`, sub: 'Through automated processing', color: '#078d79', tint: '#e6f5f2' },
                  { icon: Clock, label: 'Hours reclaimed', value: fmt(agent.totalHoursSaved), sub: `Equiv. ${Math.round(agent.totalHoursSaved / 2000)} FTEs/year`, color: '#3067db', tint: '#ebf0fc' },
                  { icon: Shield, label: 'Errors prevented', value: fmt(agent.totalErrorsAvoided), sub: 'Downstream corrections avoided', color: '#596ae1', tint: '#eef0fe' },
                ].map(m => (
                  <div key={m.label} className="rounded-evr-md border p-5 text-center" style={{ borderColor: m.color + '40', backgroundColor: m.tint }}>
                    <m.icon className="mx-auto mb-2" size={20} style={{ color: m.color }} />
                    <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-sm font-medium mt-1" style={{ color: m.color }}>{m.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: m.color + 'aa' }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              {agent.valueHistory.length > 0 && (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-evr-text-high mb-3">Daily cost savings — last 30 days</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={agent.valueHistory} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `$${fmt(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="costSavings" name="Cost savings ($)" fill="#078d79" radius={[3,3,0,0]} maxBarSize={18} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      <h3 className="text-xs font-semibold text-evr-text-high mb-3">Cumulative savings (30d)</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={agent.valueHistory.map((v, i) => ({ ...v, cum: agent.valueHistory.slice(0, i + 1).reduce((s, x) => s + x.costSavings, 0) }))} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                          <defs><linearGradient id="cumG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#078d79" stopOpacity={0.15} /><stop offset="95%" stopColor="#078d79" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `$${fmt(v)}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="cum" name="Cumulative ($)" stroke="#078d79" fill="url(#cumG)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-evr-text-high mb-3">Hours saved per day</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <ComposedChart data={agent.valueHistory} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={d => d.slice(5)} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="hoursSaved" name="Hours saved" fill="#3067db" radius={[3,3,0,0]} maxBarSize={18} opacity={0.8} />
                          <Line type="monotone" dataKey="errorsAvoided" name="Errors avoided" stroke="#596ae1" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ───────── AUDIT LOG ───────── */}
          {tab === 'audit' && (
            <div>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-evr-text-low" size={13} />
                  <input type="text" value={auditSearch} onChange={e => { setAuditSearch(e.target.value); setAuditPage(0) }}
                    placeholder="Search audit log…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-evr-border-decorative rounded-evr-sm bg-evr-surface-secondary focus:bg-white focus:outline-none focus:ring-2 focus:ring-evr-blue-400/25 focus:border-evr-blue-400 transition-all" />
                </div>
                <div className="relative">
                  <select value={auditFilter} onChange={e => { setAuditFilter(e.target.value as typeof auditFilter); setAuditPage(0) }}
                    className="pl-3 pr-7 py-1.5 text-sm border border-evr-border-decorative rounded-evr-sm focus:outline-none appearance-none bg-white cursor-pointer">
                    <option value="all">All outcomes</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="warning">Warning</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-evr-text-low pointer-events-none" size={12} />
                </div>
                <span className="text-xs text-evr-text-low ml-auto">{filteredAudit.length} entries</span>
              </div>
              {filteredAudit.length === 0 ? (
                <div className="py-16 text-center text-evr-text-low text-sm">No audit entries match your filters</div>
              ) : (
                <div className="border border-evr-border-decorative rounded-evr-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-evr-surface-secondary border-b border-evr-border-decorative">
                        {['Timestamp', 'Action', 'Actor', 'Module', 'Outcome'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-evr-border-decorative">
                      {filteredAudit.slice(auditPage * PAGE, (auditPage + 1) * PAGE).map(entry => (
                        <tr key={entry.id} className="hover:bg-evr-surface-secondary transition-colors">
                          <td className="px-4 py-2.5 text-xs text-evr-text-low font-mono whitespace-nowrap">{fmtDateTime(entry.timestamp)}</td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <div className="text-xs font-medium text-evr-text-high">{entry.action.replace(/_/g, ' ')}</div>
                            <div className="text-[11px] text-evr-text-low mt-0.5 line-clamp-1">{entry.details}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-xs font-medium text-evr-text-default">{entry.actor}</div>
                            <div className="text-[10px] text-evr-text-low capitalize">{entry.actorType}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 text-[10px] bg-evr-surface-secondary text-evr-text-low rounded-full border border-evr-border-decorative">{entry.module}</span>
                          </td>
                          <td className="px-4 py-2.5"><AuditBadge outcome={entry.outcome} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-evr-border-decorative bg-evr-surface-secondary">
                      <span className="text-xs text-evr-text-low">Page {auditPage + 1} of {auditPages}</span>
                      <div className="flex gap-2">
                        <button disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)}
                          className="px-3 py-1 text-xs border border-evr-border-decorative rounded-evr-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                        <button disabled={auditPage >= auditPages - 1} onClick={() => setAuditPage(p => p + 1)}
                          className="px-3 py-1 text-xs border border-evr-border-decorative rounded-evr-sm hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ───────── GOVERNANCE ───────── */}
          {tab === 'governance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-evr-md border p-4" style={{
                  borderColor: agent.riskLevel === 'high' ? '#fbd0c8' : agent.riskLevel === 'medium' ? '#fde8c0' : '#b2e8df',
                  backgroundColor: agent.riskLevel === 'high' ? '#fdf0ed' : agent.riskLevel === 'medium' ? '#fdf8ec' : '#e6f5f2',
                }}>
                  <div className="flex items-center gap-2 mb-1"><AlertTriangle size={13} style={{ color: agent.riskLevel === 'high' ? '#c64e33' : agent.riskLevel === 'medium' ? '#985d10' : '#078d79' }} />
                    <span className="text-[10px] font-bold text-evr-text-low uppercase tracking-wide">Risk level</span></div>
                  <div className="text-xl font-bold capitalize" style={{ color: agent.riskLevel === 'high' ? '#c64e33' : agent.riskLevel === 'medium' ? '#985d10' : '#078d79' }}>{agent.riskLevel}</div>
                </div>
                <div className="rounded-evr-md border p-4" style={{
                  borderColor: agent.complianceStatus === 'compliant' ? '#b2e8df' : '#fde8c0',
                  backgroundColor: agent.complianceStatus === 'compliant' ? '#e6f5f2' : '#fdf8ec',
                }}>
                  <div className="flex items-center gap-2 mb-1"><Shield size={13} style={{ color: agent.complianceStatus === 'compliant' ? '#078d79' : '#985d10' }} />
                    <span className="text-[10px] font-bold text-evr-text-low uppercase tracking-wide">Compliance</span></div>
                  <div className="text-lg font-bold" style={{ color: agent.complianceStatus === 'compliant' ? '#078d79' : '#985d10' }}>
                    {agent.complianceStatus === 'compliant' ? 'Compliant' : 'Review needed'}
                  </div>
                </div>
                <div className="bg-white rounded-evr-md border border-evr-border-decorative p-4" style={{ boxShadow: 'var(--evr-shadow-02)' }}>
                  <div className="flex items-center gap-2 mb-2"><Zap size={13} style={{ color: '#3067db' }} />
                    <span className="text-[10px] font-bold text-evr-text-low uppercase tracking-wide">API quota</span></div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-evr-surface-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, agent.apiQuotaUsed / agent.apiQuotaLimit * 100)}%`,
                        backgroundColor: agent.apiQuotaUsed > 80 ? '#c64e33' : agent.apiQuotaUsed > 60 ? '#efc056' : '#078d79',
                      }} />
                    </div>
                    <span className="text-sm font-bold text-evr-text-high">{agent.apiQuotaUsed}%</span>
                  </div>
                  <div className="text-[11px] text-evr-text-low mt-1">{agent.apiQuotaUsed} / {agent.apiQuotaLimit} units today</div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-evr-text-high mb-2 flex items-center gap-1.5"><FileCheck size={13} style={{ color: '#3067db' }} />Compliance certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {agent.certifications.map(c => (
                    <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-evr-border-decorative rounded-evr-sm text-xs font-medium text-evr-text-default" style={{ boxShadow: 'var(--evr-shadow-02)' }}>
                      <CheckCircle2 size={12} style={{ color: '#078d79' }} />{c}
                    </div>
                  ))}
                </div>
              </div>
              {agent.permissions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-evr-text-high mb-2 flex items-center gap-1.5"><Lock size={13} style={{ color: '#3067db' }} />Data access permissions</h3>
                  <div className="border border-evr-border-decorative rounded-evr-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-evr-surface-secondary border-b border-evr-border-decorative">
                        {['Resource', 'Access', 'Classification', 'Last reviewed'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-evr-border-decorative">
                        {agent.permissions.map((p, i) => (
                          <tr key={i} className="hover:bg-evr-surface-secondary transition-colors">
                            <td className="px-4 py-2.5 text-xs font-medium text-evr-text-high">{p.resource}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase" style={{
                                color: p.access === 'admin' ? '#c64e33' : p.access === 'write' ? '#985d10' : '#3067db',
                                backgroundColor: p.access === 'admin' ? '#fdf0ed' : p.access === 'write' ? '#fdf8ec' : '#ebf0fc',
                              }}>{p.access}</span>
                            </td>
                            <td className="px-4 py-2.5"><ClassBadge cls={p.dataClassification} /></td>
                            <td className="px-4 py-2.5 text-xs text-evr-text-low">{fmtDate(p.lastReviewed)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────── OBSERVABILITY ───────── */}
          {tab === 'observability' && (
            <div className="space-y-6">
              {/* OTel KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Sessions (30d)" value={fmt(obs.totalSessions30d)} sub="Unique session.id" icon={MessageSquare} color="#3067db" tint="#ebf0fc" />
                <MetricCard label="Conversations (30d)" value={fmt(obs.totalConversations30d)} sub="Unique conversation.id" icon={Users} color="#0a9e8a" tint="#e5f7f5" />
                <MetricCard label="Token cost (30d)" value={`$${obs.totalTokenCost30dUsd.toFixed(2)}`} sub="Estimated API spend" icon={DollarSign} color="#d4900a" tint="#fdf8ec" />
                <MetricCard label="CSAT score" value={`${obs.csat.toFixed(1)}/5`} sub={`${obs.escalationRate.toFixed(1)}% escalation rate`} icon={TrendingUp} color="#078d79" tint="#e6f5f2" />
              </div>

              {/* Latency percentiles */}
              <div className="bg-evr-surface-secondary rounded-evr-md border border-evr-border-decorative p-4">
                <h3 className="text-xs font-semibold text-evr-text-high mb-3">Latency percentiles (ms)</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { p: 'P50', v: obs.latencyPercentiles.p50 },
                    { p: 'P75', v: obs.latencyPercentiles.p75 },
                    { p: 'P95', v: obs.latencyPercentiles.p95 },
                    { p: 'P99', v: obs.latencyPercentiles.p99 },
                  ].map(({ p, v }) => (
                    <div key={p} className="text-center">
                      <div className="text-[10px] font-bold text-evr-text-low uppercase mb-1">{p}</div>
                      <div className={`text-lg font-bold ${v > 2000 ? 'text-evr-error' : v > 1000 ? 'text-evr-warning-text' : 'text-evr-success'}`}>{fmtMs(v)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Token usage + cost */}
                <div>
                  <h3 className="text-xs font-semibold text-evr-text-high mb-3">Token usage and cost — 30 days</h3>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={obs.tokenUsageHistory.slice(-14).map(d => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      'Input (K)': Math.round(d.inputTokens / 1000),
                      'Output (K)': Math.round(d.outputTokens / 1000),
                      'Cost ($)': d.estimatedCostUsd,
                    }))} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} />
                      <YAxis yAxisId="tok" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `${v}K`} />
                      <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `$${v.toFixed(1)}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="tok" dataKey="Input (K)" stackId="t" fill="#3067db" opacity={0.7} maxBarSize={18} />
                      <Bar yAxisId="tok" dataKey="Output (K)" stackId="t" fill="#0a9e8a" opacity={0.7} maxBarSize={18} radius={[2,2,0,0]} />
                      <Line yAxisId="cost" type="monotone" dataKey="Cost ($)" stroke="#d4900a" strokeWidth={2} dot={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Finish reasons pie */}
                <div>
                  <h3 className="text-xs font-semibold text-evr-text-high mb-3">Finish reasons</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie data={obs.finishReasonBreakdown} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={2}>
                          {obs.finishReasonBreakdown.map((fr, i) => (
                            <Cell key={fr.reason} fill={FR_COLORS[fr.reason] ?? '#aaaab5'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v.toLocaleString(), 'count']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {obs.finishReasonBreakdown.map(fr => (
                        <div key={fr.reason} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FR_COLORS[fr.reason] ?? '#aaaab5' }} />
                            <span className="text-xs text-evr-text-default capitalize">{fr.reason.replace('_', ' ')}</span>
                          </div>
                          <span className="text-xs font-bold text-evr-text-high">{fr.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool call breakdown */}
              <div>
                <h3 className="text-xs font-semibold text-evr-text-high mb-3">Tool call breakdown — gen_ai.tool.name (30d)</h3>
                <div className="space-y-2">
                  {obs.toolCallMetrics.map((t, i) => (
                    <div key={t.toolName} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-evr-text-low w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div>
                            <span className="text-xs font-medium text-evr-text-default">{t.toolName.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-evr-text-low ml-2">{t.description}</span>
                          </div>
                          <span className="text-xs font-bold text-evr-text-high ml-2 shrink-0">{fmt(t.callCount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-evr-surface-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${t.callCount / obs.toolCallMetrics[0].callCount * 100}%`,
                              backgroundColor: t.successCount / t.callCount >= 0.95 ? '#078d79' : '#efc056',
                            }} />
                          </div>
                          <span className="text-[10px] text-evr-text-low shrink-0">{Math.round(t.successCount / t.callCount * 100)}% · {fmtMs(t.avgDurationMs)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent traces */}
              <div>
                <h3 className="text-xs font-semibold text-evr-text-high mb-3">Recent OTel spans — trace_id, operation, user, duration</h3>
                <div className="border border-evr-border-decorative rounded-evr-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-evr-surface-secondary border-b border-evr-border-decorative">
                      {['Trace ID', 'Operation', 'User', 'Duration', 'Tokens', 'Tool', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-evr-border-decorative">
                      {obs.recentTraces.slice(0, 12).map(t => (
                        <tr key={t.spanId} className="hover:bg-evr-surface-secondary transition-colors">
                          <td className="px-3 py-2 font-mono text-evr-text-low">{t.traceId.slice(0, 8)}…</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{
                              color: OBS_OPERATION_COLORS[t.operation] ?? '#5e5e62',
                              backgroundColor: (OBS_OPERATION_COLORS[t.operation] ?? '#5e5e62') + '18',
                            }}>{t.operation.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="px-3 py-2 text-evr-text-default">{t.userEmail.split('@')[0]}</td>
                          <td className="px-3 py-2 font-medium text-evr-text-high tabular-nums">{fmtMs(t.durationMs)}</td>
                          <td className="px-3 py-2 text-evr-text-low tabular-nums">
                            {t.inputTokens ? `${t.inputTokens}↑ ${t.outputTokens}↓` : '—'}
                          </td>
                          <td className="px-3 py-2 text-evr-text-low">{t.toolName ? t.toolName.replace(/_/g, ' ') : '—'}</td>
                          <td className="px-3 py-2">
                            {t.status === 'ok'
                              ? <CheckCircle2 size={13} style={{ color: '#078d79' }} />
                              : <XCircle size={13} style={{ color: '#c64e33' }} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User sessions */}
              <div>
                <h3 className="text-xs font-semibold text-evr-text-high mb-3">Session analytics — user.id, session.id (30d)</h3>
                <div className="border border-evr-border-decorative rounded-evr-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-evr-surface-secondary border-b border-evr-border-decorative">
                      {['User', 'Department', 'Sessions', 'Conversations', 'Avg duration', 'CSAT', 'Last active'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-evr-border-decorative">
                      {obs.userSessionMetrics.map(u => (
                        <tr key={u.userId} className="hover:bg-evr-surface-secondary transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-medium text-evr-text-high">{u.displayName}</div>
                            <div className="text-[10px] text-evr-text-low">{u.userEmail}</div>
                          </td>
                          <td className="px-3 py-2 text-evr-text-low">{u.department}</td>
                          <td className="px-3 py-2 font-bold text-evr-text-high">{u.sessionCount}</td>
                          <td className="px-3 py-2 text-evr-text-default">{u.totalConversations}</td>
                          <td className="px-3 py-2 text-evr-text-default">{u.avgSessionDurationMin.toFixed(1)} min</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 w-10 bg-evr-surface-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${(u.avgSatisfactionScore / 5) * 100}%`,
                                  backgroundColor: u.avgSatisfactionScore >= 4 ? '#078d79' : u.avgSatisfactionScore >= 3 ? '#efc056' : '#c64e33',
                                }} />
                              </div>
                              <span className="font-bold text-evr-text-high">{u.avgSatisfactionScore.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-evr-text-low">{fmtDate(u.lastActiveAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Topic breakdown — Salesforce Agentforce topic classification */}
              <div>
                <h3 className="text-xs font-semibold text-evr-text-high mb-3">
                  Topic classification — conversation intent breakdown
                  <span className="ml-2 text-[10px] font-normal text-evr-text-low">Inspired by Salesforce Agentforce topic routing</span>
                </h3>
                <div className="space-y-2">
                  {obs.topicBreakdown.map(t => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <div className="text-xs text-evr-text-default w-36 shrink-0">{t.topic}</div>
                      <div className="flex-1 h-2 bg-evr-surface-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, backgroundColor: cat.color, opacity: 0.7 }} />
                      </div>
                      <div className="text-xs font-bold text-evr-text-high w-12 text-right">{t.pct}%</div>
                      <div className="text-xs text-evr-text-low w-12 text-right">{fmt(t.count)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {editing && <AddEditAgentModal agent={agent} onSave={handleSave} onClose={() => setEditing(false)} />}
      {deleting && <DeleteConfirmModal agent={agent} onConfirm={handleDelete} onCancel={() => setDeleting(false)} />}
    </div>
  )
}
