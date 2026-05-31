import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Zap, Clock, AlertTriangle, DollarSign, Users, CheckCircle2,
  XCircle, ChevronRight, Cpu, Globe, MessageSquare, TrendingUp,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useAgents } from '../context/AgentsContext'
import type { OTelSpan } from '../types/observability'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals + 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals + 1)}K`
  return n.toFixed(decimals)
}
function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TIME_RANGES = ['1h', '24h', '7d', '30d'] as const
type TimeRange = typeof TIME_RANGES[number]

const OP_COLORS: Record<string, string> = {
  invoke_agent: '#3067db', inference: '#0a9e8a', execute_tool: '#d4900a',
  invoke_workflow: '#596ae1', embeddings: '#b53068', create_agent: '#078d79',
  invoke_agent_internal: '#1d7fcc', retrieval: '#7c3aed',
}

const PIE_COLORS = ['#3067db', '#0a9e8a', '#efc056', '#c64e33', '#596ae1', '#b53068']

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

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-evr-md border border-evr-border-decorative" style={{ boxShadow: 'var(--evr-shadow-02)' }}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-evr-border-decorative">
        <div>
          <h3 className="text-sm font-semibold text-evr-text-high">{title}</h3>
          {subtitle && <p className="text-xs text-evr-text-low mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, tint, trend }: {
  label: string; value: string; sub: string; icon: React.ElementType;
  color: string; tint: string; trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-white rounded-evr-md border border-evr-border-decorative p-4" style={{ boxShadow: 'var(--evr-shadow-02)', borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-evr-text-low uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-evr-text-high leading-none">{value}</p>
          <p className="text-[11px] text-evr-text-low mt-1">{sub}</p>
          {trend && (
            <p className={`text-[11px] font-medium mt-1 ${trend.value >= 0 ? 'text-evr-success' : 'text-evr-error'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className="w-8 h-8 rounded-evr-sm flex items-center justify-center shrink-0" style={{ backgroundColor: tint }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function SpanOperationBadge({ op }: { op: OTelSpan['operation'] }) {
  const color = OP_COLORS[op] ?? '#5e5e62'
  const labels: Record<string, string> = {
    invoke_agent: 'Invoke', inference: 'Inference', execute_tool: 'Tool',
    invoke_workflow: 'Workflow', embeddings: 'Embed', create_agent: 'Create',
    invoke_agent_internal: 'Internal', retrieval: 'Retrieval',
  }
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{ color, backgroundColor: `${color}18` }}>
      {labels[op] ?? op}
    </span>
  )
}

export default function Observability() {
  const { agents } = useAgents()
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')

  // ── Aggregate metrics across all agents ───────────────────────────────
  const allTraces: OTelSpan[] = agents
    .flatMap(a => a.observability.recentTraces)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 40)

  const totalInvocations = agents.reduce((s, a) => s + a.observability.hourlyInvocations.reduce((h, x) => h + x.total, 0), 0)
  const totalErrors = agents.reduce((s, a) => s + a.observability.hourlyInvocations.reduce((h, x) => h + x.errors, 0), 0)
  const errorRate = totalInvocations > 0 ? (totalErrors / totalInvocations * 100) : 0
  const activeSessions = agents.reduce((s, a) => s + (a.observability.userSessionMetrics.length), 0)
  const totalCost30d = agents.reduce((s, a) => s + a.observability.totalTokenCost30dUsd, 0)
  const avgCsat = agents.filter(a => a.observability.csat > 0)
    .reduce((s, a, _, arr) => s + a.observability.csat / arr.length, 0)
  const avgLatency = agents.filter(a => a.status === 'active' && a.observability.latencyPercentiles.p50 > 0)
    .reduce((s, a, _, arr) => s + a.observability.latencyPercentiles.p50 / arr.length, 0)
  const avgEscalation = agents.filter(a => a.status === 'active')
    .reduce((s, a, _, arr) => s + a.observability.escalationRate / arr.length, 0)

  // ── Hourly invocation chart data (sum across all agents) ──────────────
  const hourlyData = agents[0].observability.hourlyInvocations.map((h, i) => ({
    label: h.label,
    total: agents.reduce((s, a) => s + (a.observability.hourlyInvocations[i]?.total ?? 0), 0),
    success: agents.reduce((s, a) => s + (a.observability.hourlyInvocations[i]?.success ?? 0), 0),
    errors: agents.reduce((s, a) => s + (a.observability.hourlyInvocations[i]?.errors ?? 0), 0),
  }))

  // ── Token cost trend (last 14 days for chart) ─────────────────────────
  const tokenData = agents[0].observability.tokenUsageHistory.slice(-14).map((d, i) => ({
    date: fmtDate(d.date),
    cost: agents.reduce((s, a) => s + (a.observability.tokenUsageHistory.slice(-14)[i]?.estimatedCostUsd ?? 0), 0),
    inputTokens: agents.reduce((s, a) => {
      const entry = a.observability.tokenUsageHistory.slice(-14)[i]
      return s + (entry?.inputTokens ?? 0) / 1000
    }, 0),
    outputTokens: agents.reduce((s, a) => {
      const entry = a.observability.tokenUsageHistory.slice(-14)[i]
      return s + (entry?.outputTokens ?? 0) / 1000
    }, 0),
  }))

  // ── Tool call leaderboard (top 10 across all agents) ──────────────────
  const toolMap: Map<string, { callCount: number; successCount: number; avgDurationMs: number }> = new Map()
  agents.forEach(a => {
    a.observability.toolCallMetrics.forEach(t => {
      const existing = toolMap.get(t.toolName)
      if (existing) {
        existing.callCount += t.callCount
        existing.successCount += t.successCount
      } else {
        toolMap.set(t.toolName, { callCount: t.callCount, successCount: t.successCount, avgDurationMs: t.avgDurationMs })
      }
    })
  })
  const topTools = Array.from(toolMap.entries())
    .map(([name, m]) => ({
      name: name.replace(/_/g, ' '),
      calls: m.callCount,
      successRate: Math.round(m.successCount / m.callCount * 100),
      avgMs: m.avgDurationMs,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 8)

  // ── Finish reason aggregate ────────────────────────────────────────────
  const frMap: Record<string, number> = {}
  agents.forEach(a => {
    a.observability.finishReasonBreakdown.forEach(fr => {
      frMap[fr.reason] = (frMap[fr.reason] ?? 0) + fr.count
    })
  })
  const frTotal = Object.values(frMap).reduce((s, v) => s + v, 0)
  const finishReasons = Object.entries(frMap)
    .map(([reason, count]) => ({ reason, count, pct: Math.round(count / frTotal * 1000) / 10 }))
    .sort((a, b) => b.count - a.count)

  // ── Top users across all agents ───────────────────────────────────────
  const userMap: Map<string, { sessions: number; convs: number; avgSat: number; agents: number; dept: string }> = new Map()
  agents.forEach(a => {
    a.observability.userSessionMetrics.forEach(u => {
      const existing = userMap.get(u.userEmail)
      if (existing) {
        existing.sessions += u.sessionCount
        existing.convs += u.totalConversations
        existing.agents += 1
      } else {
        userMap.set(u.userEmail, {
          sessions: u.sessionCount, convs: u.totalConversations,
          avgSat: u.avgSatisfactionScore, agents: 1, dept: u.department,
        })
      }
    })
  })
  const topUsers = Array.from(userMap.entries())
    .map(([email, m]) => ({ email, ...m }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6)

  // ── Agent-level health summary ────────────────────────────────────────
  const agentHealth = agents.map(a => ({
    id: a.id,
    name: a.name,
    status: a.status,
    p50: a.observability.latencyPercentiles.p50,
    errorRate: a.observability.hourlyInvocations.length > 0
      ? (a.observability.hourlyInvocations.reduce((s, h) => s + h.errors, 0) /
         Math.max(1, a.observability.hourlyInvocations.reduce((s, h) => s + h.total, 0)) * 100)
      : 0,
    costToday: a.observability.tokenUsageHistory.slice(-1)[0]?.estimatedCostUsd ?? 0,
    sessions: a.observability.totalSessions30d,
    csat: a.observability.csat,
    escalation: a.observability.escalationRate,
  }))

  const finishReasonColors: Record<string, string> = {
    stop: '#078d79', tool_calls: '#3067db', length: '#efc056', content_filter: '#c64e33', error: '#c64e33',
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-evr-text-high">Agent observability</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-evr-success/10 border border-evr-success/20 rounded-full text-[10px] font-bold text-evr-success uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-evr-success animate-pulse-dot" />
              Live
            </span>
          </div>
          <p className="text-sm text-evr-text-low">
            OTel-aligned monitoring across {agents.length} agents
          </p>
        </div>
        {/* Time range selector */}
        <div className="flex gap-0.5 bg-evr-surface-secondary border border-evr-border-decorative rounded-evr-sm p-0.5">
          {TIME_RANGES.map(r => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-evr-sm transition-colors ${
                timeRange === r ? 'bg-white text-evr-blue-400 shadow-evr-02' : 'text-evr-text-low hover:text-evr-text-default'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── System KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Invocations today" value={fmt(totalInvocations)} sub="Across all agents" icon={Zap} color="#3067db" tint="#ebf0fc" trend={{ value: 12.4, label: 'vs yesterday' }} />
        <KpiCard label="Active sessions" value={String(activeSessions)} sub="Unique user sessions" icon={Users} color="#0a9e8a" tint="#e5f7f5" />
        <KpiCard label="Avg latency P50" value={fmtMs(Math.round(avgLatency))} sub="Median response time" icon={Clock} color="#596ae1" tint="#eef0fe" />
        <KpiCard label="Error rate" value={`${errorRate.toFixed(2)}%`} sub={`${totalErrors} errors total`} icon={AlertTriangle} color={errorRate > 2 ? '#c64e33' : '#078d79'} tint={errorRate > 2 ? '#fdf0ed' : '#e6f5f2'} />
        <KpiCard label="Token cost (30d)" value={`$${fmt(totalCost30d, 2)}`} sub="Estimated API spend" icon={DollarSign} color="#d4900a" tint="#fdf8ec" />
        <KpiCard label="Avg CSAT" value={`${avgCsat.toFixed(1)}/5`} sub={`${avgEscalation.toFixed(1)}% escalation rate`} icon={TrendingUp} color="#078d79" tint="#e6f5f2" />
      </div>

      {/* ── Row 2: invocation volume + tool leaderboard ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Invocation volume chart — last 24h */}
        <div className="xl:col-span-2">
          <SectionCard title="Invocation volume" subtitle="Last 24 hours across all agents (OTel invoke_agent spans)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3067db" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3067db" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c64e33" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#c64e33" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5e5e62' }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="success" name="Success" stroke="#3067db" fill="url(#gradSuccess)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="errors" name="Errors" stroke="#c64e33" fill="url(#gradError)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Top tool calls */}
        <SectionCard title="Tool call leaderboard" subtitle="gen_ai.tool.name — all agents, 30d">
          <div className="space-y-2">
            {topTools.slice(0, 6).map((t, i) => (
              <div key={t.name} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-evr-text-low w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-evr-text-default truncate">{t.name}</span>
                    <span className="text-[10px] font-bold text-evr-text-high ml-2 shrink-0">{fmt(t.calls)}</span>
                  </div>
                  <div className="h-1.5 bg-evr-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(t.calls / topTools[0].calls * 100)}%`,
                        backgroundColor: t.successRate >= 95 ? '#078d79' : t.successRate >= 88 ? '#efc056' : '#c64e33',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-evr-text-low">{t.successRate}% success · {fmtMs(t.avgMs)} avg</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 3: token cost trend + finish reasons ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Token cost & volume */}
        <div className="xl:col-span-2">
          <SectionCard title="Token usage and cost" subtitle="gen_ai.usage.input_tokens + output_tokens — last 14 days">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={tokenData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e2ed" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5e5e62' }} />
                <YAxis yAxisId="tokens" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `${v}K`} />
                <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 10, fill: '#5e5e62' }} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="tokens" dataKey="inputTokens" name="Input (K)" stackId="tokens" fill="#3067db" opacity={0.7} maxBarSize={20} />
                <Bar yAxisId="tokens" dataKey="outputTokens" name="Output (K)" stackId="tokens" fill="#0a9e8a" opacity={0.7} maxBarSize={20} radius={[3,3,0,0]} />
                <Line yAxisId="cost" type="monotone" dataKey="cost" name="Cost ($)" stroke="#d4900a" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Finish reason breakdown */}
        <SectionCard title="Finish reasons" subtitle="gen_ai.response.finish_reasons distribution">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={finishReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%"
                outerRadius={55} innerRadius={30} paddingAngle={2}>
                {finishReasons.map((fr, i) => (
                  <Cell key={fr.reason} fill={finishReasonColors[fr.reason] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v.toLocaleString(), 'count']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {finishReasons.map((fr, i) => (
              <div key={fr.reason} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: finishReasonColors[fr.reason] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-evr-text-default capitalize">{fr.reason.replace('_', ' ')}</span>
                </div>
                <span className="text-xs font-bold text-evr-text-high">{fr.pct}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 4: recent trace stream + top users ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent trace stream — Salesforce Agentforce-style */}
        <div className="xl:col-span-2">
          <SectionCard
            title="Recent trace stream"
            subtitle="Live OTel spans — trace_id, gen_ai.operation.name, user.email, duration, status"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-evr-border-decorative">
                    {['Trace ID', 'Operation', 'Agent', 'User', 'Duration', 'Status', 'Time'].map(h => (
                      <th key={h} className="text-left pb-2 pr-3 font-semibold text-evr-text-low uppercase tracking-wide text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-evr-border-decorative">
                  {allTraces.slice(0, 15).map(t => (
                    <tr key={t.spanId} className="hover:bg-evr-surface-secondary transition-colors">
                      <td className="py-2 pr-3 font-mono text-evr-text-low">{t.traceId.slice(0, 8)}…</td>
                      <td className="py-2 pr-3"><SpanOperationBadge op={t.operation} /></td>
                      <td className="py-2 pr-3 font-medium text-evr-text-default max-w-[120px] truncate">{t.agentName.split(' ').slice(0, 2).join(' ')}</td>
                      <td className="py-2 pr-3 text-evr-text-low">{t.userEmail.split('@')[0]}</td>
                      <td className="py-2 pr-3 font-medium text-evr-text-high tabular-nums">{fmtMs(t.durationMs)}</td>
                      <td className="py-2 pr-3">
                        {t.status === 'ok'
                          ? <CheckCircle2 size={13} style={{ color: '#078d79' }} />
                          : <XCircle size={13} style={{ color: '#c64e33' }} />
                        }
                      </td>
                      <td className="py-2 text-evr-text-low tabular-nums">{fmtDateTime(t.startTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Top users — Google AgentSpace-style adoption view */}
        <SectionCard title="Top users by session count" subtitle="session.id, user.email — 30 days">
          <div className="space-y-3">
            {topUsers.map((u, i) => (
              <div key={u.email} className="flex items-center gap-3">
                <span className="text-xs font-bold text-evr-text-low w-4 shrink-0">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-evr-blue-tint flex items-center justify-center text-evr-blue-400 text-[11px] font-bold shrink-0">
                  {u.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-evr-text-high truncate">{u.email.split('@')[0].replace('.', ' ')}</div>
                  <div className="text-[10px] text-evr-text-low">{u.dept}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-evr-text-high">{u.sessions}</div>
                  <div className="text-[10px] text-evr-text-low">{u.agents} agents</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 5: per-agent health matrix ──────────────────────────── */}
      <SectionCard
        title="Per-agent health matrix"
        subtitle="Latency P50, error rate, token cost, CSAT, and escalation rate"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-evr-border-decorative">
                {['Agent', 'Status', 'P50 latency', 'Error rate', 'Cost (today)', 'Sessions (30d)', 'CSAT', 'Escalation', ''].map(h => (
                  <th key={h} className="text-left pb-2.5 pr-4 text-[10px] font-semibold text-evr-text-low uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-evr-border-decorative">
              {agentHealth.map(a => {
                const statusColor = a.status === 'active' ? '#078d79' : a.status === 'degraded' ? '#985d10' : a.status === 'maintenance' ? '#3067db' : '#5e5e62'
                const statusBg = a.status === 'active' ? '#e6f5f2' : a.status === 'degraded' ? '#fdf8ec' : a.status === 'maintenance' ? '#ebf0fc' : '#f2f0f0'
                const errBad = a.errorRate > 5
                const latBad = a.p50 > 2000
                return (
                  <tr key={a.id} className="hover:bg-evr-surface-secondary transition-colors">
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => navigate(`/agents/${a.id}`)}
                        className="font-medium text-evr-text-high hover:text-evr-blue-400 transition-colors text-left"
                      >
                        {a.name}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize"
                        style={{ color: statusColor, backgroundColor: statusBg }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                        {a.status}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 font-mono text-xs font-medium ${latBad ? 'text-evr-error' : 'text-evr-text-high'}`}>
                      {fmtMs(a.p50)}
                    </td>
                    <td className={`py-3 pr-4 text-xs font-medium ${errBad ? 'text-evr-error' : 'text-evr-success'}`}>
                      {a.errorRate.toFixed(2)}%
                    </td>
                    <td className="py-3 pr-4 text-xs text-evr-text-high font-medium">${a.costToday.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-xs text-evr-text-high">{fmt(a.sessions)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-12 bg-evr-surface-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${(a.csat / 5) * 100}%`,
                            backgroundColor: a.csat >= 4 ? '#078d79' : a.csat >= 3 ? '#efc056' : '#c64e33',
                          }} />
                        </div>
                        <span className="text-xs font-bold text-evr-text-high">{a.csat.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-evr-text-default">{a.escalation.toFixed(1)}%</td>
                    <td className="py-3">
                      <button onClick={() => navigate(`/agents/${a.id}`)}
                        className="flex items-center gap-1 text-xs font-medium hover:text-evr-blue-400 transition-colors text-evr-text-low">
                        Detail <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

    </div>
  )
}
