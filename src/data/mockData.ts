import type { Agent, AuditEntry, PerformanceMetric, ValueMetric, Permission } from '../types/agent'
import type {
  AgentObservability, OTelSpan, TokenUsageDaily, ToolCallMetric,
  UserSessionMetric, HourlyInvocation, FinishReasonBreakdown, SpanOperation,
} from '../types/observability'

// ── Deterministic pseudo-RNG ──────────────────────────────────────────────
function createRng(seed: number) {
  let s = seed
  return () => {
    s = ((s * 1664525) + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967295
  }
}

// ── Time series generators ─────────────────────────────────────────────────
function genPerf(seed: number, baseTasks: number, baseRate: number, baseUsers: number): PerformanceMetric[] {
  const r = createRng(seed)
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date('2026-05-21'); d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toISOString().split('T')[0],
      tasksCompleted: Math.round(baseTasks * (0.78 + r() * 0.44)),
      successRate: Math.round(Math.min(100, Math.max(84, baseRate + (r() - 0.5) * 7)) * 10) / 10,
      avgResponseTimeMs: Math.round(600 + r() * 1200),
      activeUsers: Math.round(baseUsers * (0.7 + r() * 0.6)),
      errorCount: Math.round(r() * 12),
    }
  })
}

function genValue(seed: number, baseSavings: number, baseHours: number): ValueMetric[] {
  const r = createRng(seed)
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date('2026-05-21'); d.setDate(d.getDate() - (29 - i))
    return {
      date: d.toISOString().split('T')[0],
      costSavings: Math.round(baseSavings * (0.75 + r() * 0.5)),
      hoursSaved: Math.round(baseHours * (0.7 + r() * 0.6)),
      errorsAvoided: Math.round(8 + r() * 35),
      automationRate: Math.round(Math.min(100, 70 + r() * 28) * 10) / 10,
    }
  })
}

// ── OTel observability generators ─────────────────────────────────────────
const USERS = [
  { id: 'u-001', email: 'sarah.chen@acme.com',   name: 'Sarah Chen',   dept: 'Human Resources' },
  { id: 'u-002', email: 'mike.torres@acme.com',   name: 'Mike Torres',  dept: 'Payroll' },
  { id: 'u-003', email: 'linda.park@acme.com',    name: 'Linda Park',   dept: 'Legal & Compliance' },
  { id: 'u-004', email: 'james.wu@acme.com',      name: 'James Wu',     dept: 'Finance' },
  { id: 'u-005', email: 'priya.patel@acme.com',   name: 'Priya Patel',  dept: 'Workforce Ops' },
  { id: 'u-006', email: 'tom.davis@acme.com',     name: 'Tom Davis',    dept: 'IT Operations' },
]

const TOOL_SETS: Record<string, { name: string; desc: string }[]> = {
  payroll: [
    { name: 'calculate_taxes',        desc: 'Computes federal/state tax withholdings' },
    { name: 'fetch_employee_records', desc: 'Retrieves pay group and deduction data' },
    { name: 'submit_payroll_run',     desc: 'Submits approved payroll for processing' },
    { name: 'validate_deductions',    desc: 'Validates garnishment and benefit deductions' },
    { name: 'generate_pay_summary',   desc: 'Produces employee pay statement preview' },
  ],
  workforce: [
    { name: 'query_schedule',         desc: 'Reads current scheduling matrix' },
    { name: 'check_availability',     desc: 'Validates employee availability windows' },
    { name: 'create_shift',           desc: 'Publishes new shift to schedule' },
    { name: 'notify_employee',        desc: 'Sends schedule change notification' },
  ],
  compliance: [
    { name: 'fetch_regulation_db',    desc: 'Queries regulatory update database' },
    { name: 'flag_violation',         desc: 'Creates compliance risk flag' },
    { name: 'generate_compliance_report', desc: 'Produces compliance status report' },
    { name: 'map_regulation_impact',  desc: 'Maps regulatory change to affected policies' },
  ],
  talent: [
    { name: 'parse_resume',           desc: 'Extracts structured data from CV' },
    { name: 'score_candidate',        desc: 'Ranks applicant against job requirements' },
    { name: 'schedule_interview',     desc: 'Books interview slot with panel' },
    { name: 'send_candidate_update',  desc: 'Sends status notification to applicant' },
  ],
  analytics: [
    { name: 'query_workforce_data',   desc: 'Executes WQL query on workforce dataset' },
    { name: 'generate_forecast',      desc: 'Runs predictive labor model' },
    { name: 'export_report',          desc: 'Serializes results to CSV/PDF' },
    { name: 'refresh_dashboard',      desc: 'Triggers metric recalculation' },
  ],
  onboarding: [
    { name: 'create_onboarding_task', desc: 'Creates task in onboarding workflow' },
    { name: 'provision_access',       desc: 'Initiates IT access provisioning request' },
    { name: 'send_welcome_message',   desc: 'Sends personalized welcome to new hire' },
    { name: 'schedule_checkin',       desc: 'Books 30/60/90-day check-in' },
  ],
  benefits: [
    { name: 'fetch_plan_options',     desc: 'Retrieves available benefit plans' },
    { name: 'compare_plans',          desc: 'Generates side-by-side plan comparison' },
    { name: 'submit_election',        desc: 'Submits benefits election' },
    { name: 'update_dependent',       desc: 'Adds or modifies dependent record' },
  ],
  performance: [
    { name: 'fetch_goal_data',        desc: 'Reads employee goal and progress data' },
    { name: 'draft_review',           desc: 'Auto-drafts performance summary' },
    { name: 'send_feedback_nudge',    desc: 'Sends manager feedback reminder' },
    { name: 'log_achievement',        desc: 'Records achievement against goal' },
  ],
}

function genTraceId(seed: number, i: number): string {
  const r = createRng(seed * 100 + i)
  return Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16)).join('')
}

function genSpanId(seed: number, i: number): string {
  const r = createRng(seed * 1000 + i)
  return Array.from({ length: 16 }, () => Math.floor(r() * 16).toString(16)).join('')
}

function genObs(
  agentId: string, agentName: string, category: string,
  modelVersion: string, seed: number,
  baseDailyCalls: number, baseSuccessRate: number,
): AgentObservability {
  const r = createRng(seed)
  const tools = TOOL_SETS[category] ?? TOOL_SETS.analytics
  const ops: SpanOperation[] = ['invoke_agent', 'inference', 'execute_tool', 'invoke_workflow']
  const finishReasons: FinishReasonBreakdown['reason'][] = ['stop', 'tool_calls', 'length', 'content_filter']

  // Cost per token by model
  const tokenCost = modelVersion.includes('opus')
    ? { in: 15 / 1e6, out: 75 / 1e6 }
    : modelVersion.includes('haiku')
    ? { in: 0.25 / 1e6, out: 1.25 / 1e6 }
    : { in: 3 / 1e6, out: 15 / 1e6 }

  // ── Recent traces (24 entries, last ~3 hours) ───────────────────────────
  const recentTraces: OTelSpan[] = Array.from({ length: 24 }, (_, i) => {
    const user = USERS[Math.floor(r() * USERS.length)]
    const op = ops[Math.floor(r() * ops.length)]
    const isError = r() > (baseSuccessRate / 100)
    const tool = op === 'execute_tool' ? tools[Math.floor(r() * tools.length)].name : undefined
    const ts = new Date('2026-05-21T18:30:00Z')
    ts.setMinutes(ts.getMinutes() - Math.round(r() * 180))
    const inTok = op === 'inference' ? Math.round(800 + r() * 2400) : undefined
    const outTok = op === 'inference' ? Math.round(200 + r() * 800) : undefined
    return {
      traceId: genTraceId(seed, i),
      spanId: genSpanId(seed, i),
      operation: op,
      agentId,
      agentName,
      userId: user.id,
      userEmail: user.email,
      userDisplayName: user.name,
      department: user.dept,
      conversationId: `conv-${genSpanId(seed + 1, i).slice(0, 12)}`,
      sessionId: `sess-${genSpanId(seed + 2, i).slice(0, 8)}`,
      startTime: ts.toISOString(),
      durationMs: Math.round(300 + r() * 2800),
      status: (isError ? 'error' : 'ok') as 'ok' | 'error',
      errorType: isError ? ['timeout', 'rate_limit', 'upstream_error', 'context_length'][Math.floor(r() * 4)] : undefined,
      finishReason: !isError ? finishReasons[Math.floor(r() * 4)] : undefined,
      inputTokens: inTok,
      outputTokens: outTok,
      toolName: tool,
      toolCallId: tool ? `call-${genSpanId(seed + 3, i).slice(0, 8)}` : undefined,
      isMobile: r() > 0.85,
    }
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  // ── Token usage — 30 days ──────────────────────────────────────────────
  const tokenUsageHistory: TokenUsageDaily[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date('2026-05-21'); d.setDate(d.getDate() - (29 - i))
    const calls = Math.round(baseDailyCalls * (0.7 + r() * 0.6))
    const inTok = Math.round(calls * (1200 + r() * 800))
    const outTok = Math.round(calls * (300 + r() * 200))
    return {
      date: d.toISOString().split('T')[0],
      inputTokens: inTok,
      outputTokens: outTok,
      estimatedCostUsd: Math.round((inTok * tokenCost.in + outTok * tokenCost.out) * 100) / 100,
      sessions: Math.round(calls * 0.15 + r() * 10),
    }
  })

  // ── Tool call metrics ──────────────────────────────────────────────────
  const toolCallMetrics: ToolCallMetric[] = tools.map((t, i) => {
    const calls = Math.round(baseDailyCalls * 30 * (0.08 + r() * 0.25))
    return {
      toolName: t.name,
      description: t.desc,
      callCount: calls,
      successCount: Math.round(calls * (0.88 + r() * 0.11)),
      avgDurationMs: Math.round(180 + r() * 420),
      p95DurationMs: Math.round(600 + r() * 1200),
    }
  }).sort((a, b) => b.callCount - a.callCount)

  // ── User session metrics ───────────────────────────────────────────────
  const userSessionMetrics: UserSessionMetric[] = USERS.slice(0, 4 + Math.floor(r() * 2)).map(u => ({
    userId: u.id,
    userEmail: u.email,
    displayName: u.name,
    department: u.dept,
    sessionCount: Math.round(8 + r() * 40),
    totalConversations: Math.round(15 + r() * 80),
    avgSessionDurationMin: Math.round((3 + r() * 12) * 10) / 10,
    avgSatisfactionScore: Math.round((3.2 + r() * 1.7) * 10) / 10,
    lastActiveAt: new Date(new Date('2026-05-21').getTime() - r() * 3 * 24 * 60 * 60 * 1000).toISOString(),
    topOperation: ops[Math.floor(r() * ops.length)],
  }))

  // ── Hourly invocations — last 24 hours ────────────────────────────────
  const hourlyInvocations: HourlyInvocation[] = Array.from({ length: 24 }, (_, i) => {
    const h = 23 - i
    const hour = h.toString().padStart(2, '0')
    // Business hours curve: low overnight, peak 9-17
    const hourFactor = h >= 9 && h <= 17 ? 1.0 : h >= 7 && h <= 20 ? 0.5 : 0.15
    const total = Math.round(baseDailyCalls / 24 * hourFactor * (0.6 + r() * 0.8))
    const errors = Math.round(total * (1 - baseSuccessRate / 100) * (0.5 + r()))
    return {
      hour: `2026-05-21 ${hour}:00`,
      label: `${hour}:00`,
      total,
      success: total - errors,
      errors,
      avgDurationMs: Math.round(600 + r() * 1400),
    }
  }).reverse()

  // ── Finish reason breakdown ────────────────────────────────────────────
  const frBase = [0.72, 0.18, 0.07, 0.03].map(p => Math.max(1, Math.round(p * 1000 * (0.8 + r() * 0.4))))
  const frTotal = frBase.reduce((s, v) => s + v, 0)
  const finishReasonBreakdown: FinishReasonBreakdown[] = [
    { reason: 'stop', count: frBase[0], pct: Math.round(frBase[0] / frTotal * 1000) / 10 },
    { reason: 'tool_calls', count: frBase[1], pct: Math.round(frBase[1] / frTotal * 1000) / 10 },
    { reason: 'length', count: frBase[2], pct: Math.round(frBase[2] / frTotal * 1000) / 10 },
    { reason: 'content_filter', count: frBase[3], pct: Math.round(frBase[3] / frTotal * 1000) / 10 },
  ]

  // ── Latency percentiles ────────────────────────────────────────────────
  const baseLatency = modelVersion.includes('haiku') ? 380 : modelVersion.includes('opus') ? 1800 : 920
  const latencyPercentiles = {
    p50: Math.round(baseLatency * (0.7 + r() * 0.3)),
    p75: Math.round(baseLatency * (1.0 + r() * 0.4)),
    p95: Math.round(baseLatency * (1.6 + r() * 0.6)),
    p99: Math.round(baseLatency * (2.4 + r() * 0.8)),
  }

  // ── Topic breakdown (Salesforce Agentforce concept) ────────────────────
  const topicMap: Record<string, string[]> = {
    payroll: ['Tax calculation', 'Retroactive pay', 'Deduction query', 'Payslip request', 'Garnishment'],
    workforce: ['Schedule change', 'Coverage gap', 'Overtime approval', 'Availability update', 'Shift swap'],
    compliance: ['Regulatory update', 'Violation flag', 'Policy question', 'Audit request', 'Risk assessment'],
    talent: ['Resume screening', 'Interview scheduling', 'Candidate status', 'Offer generation', 'Job matching'],
    analytics: ['Labor cost forecast', 'Headcount report', 'Turnover analysis', 'Scenario planning', 'OT prediction'],
    onboarding: ['Task completion', 'Access request', 'Welcome setup', 'Policy review', 'Equipment order'],
    benefits: ['Plan comparison', 'Enrollment help', 'Dependent add', 'Qualifying event', 'Cost estimate'],
    performance: ['Goal update', 'Feedback request', 'Review draft', 'Check-in schedule', 'Recognition'],
  }
  const topics = topicMap[category] ?? topicMap.analytics
  const topicCounts = topics.map(() => Math.round(100 + r() * 400))
  const topicTotal = topicCounts.reduce((s, v) => s + v, 0)
  const topicBreakdown = topics.map((topic, i) => ({
    topic,
    count: topicCounts[i],
    pct: Math.round(topicCounts[i] / topicTotal * 1000) / 10,
  })).sort((a, b) => b.count - a.count)

  const totalCost30d = tokenUsageHistory.reduce((s, d) => s + d.estimatedCostUsd, 0)

  return {
    recentTraces,
    tokenUsageHistory,
    toolCallMetrics,
    userSessionMetrics,
    hourlyInvocations,
    finishReasonBreakdown,
    latencyPercentiles,
    totalSessions30d: tokenUsageHistory.reduce((s, d) => s + d.sessions, 0),
    totalConversations30d: Math.round(tokenUsageHistory.reduce((s, d) => s + d.sessions, 0) * 2.4),
    totalTokenCost30dUsd: Math.round(totalCost30d * 100) / 100,
    escalationRate: Math.round((2 + r() * 8) * 10) / 10,
    csat: Math.round((3.4 + r() * 1.5) * 10) / 10,
    topicBreakdown,
  }
}

// ── Reuse helpers from previous version ───────────────────────────────────
const PERMS: Permission[] = [
  { resource: 'Employee records', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-03-15' },
  { resource: 'Payroll data', access: 'write', dataClassification: 'restricted', lastReviewed: '2026-03-15' },
  { resource: 'Org chart', access: 'read', dataClassification: 'internal', lastReviewed: '2026-04-01' },
]
const PERMS_RO: Permission[] = [
  { resource: 'Employee records', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-03-01' },
  { resource: 'Scheduling data', access: 'read', dataClassification: 'internal', lastReviewed: '2026-03-01' },
]
const PERMS_TALENT: Permission[] = [
  { resource: 'Applicant data', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-04-10' },
  { resource: 'Job requisitions', access: 'write', dataClassification: 'internal', lastReviewed: '2026-04-10' },
  { resource: 'Compensation bands', access: 'read', dataClassification: 'restricted', lastReviewed: '2026-04-10' },
]

function makeAuditLog(agentName: string, seed: number): AuditEntry[] {
  const r = createRng(seed)
  const ips = ['10.0.12.44', '10.0.15.102', '192.168.1.55', '10.0.0.1']
  return [
    { id: `${seed}-1`,  timestamp: '2026-05-21T09:14:22Z', action: 'TASK_COMPLETED', actor: agentName, actorType: 'agent', details: 'Successfully processed 1,247 records in batch run', outcome: 'success', ipAddress: '10.0.0.1', module: 'Core engine' },
    { id: `${seed}-2`,  timestamp: '2026-05-21T08:55:10Z', action: 'CONFIG_UPDATED', actor: 'sarah.chen@acme.com', actorType: 'user', details: 'Confidence threshold updated from 0.82 to 0.88', outcome: 'success', ipAddress: '10.0.12.44', module: 'Configuration' },
    { id: `${seed}-3`,  timestamp: '2026-05-20T16:30:05Z', action: 'TASK_FAILED', actor: agentName, actorType: 'agent', details: 'Upstream data source timeout after 30s — retried 3 times', outcome: 'failure', ipAddress: '10.0.0.1', module: 'Data ingestion' },
    { id: `${seed}-4`,  timestamp: '2026-05-20T14:12:44Z', action: 'PERMISSION_REVIEWED', actor: 'linda.park@acme.com', actorType: 'user', details: 'Quarterly permission audit completed — no changes required', outcome: 'success', ipAddress: '10.0.15.102', module: 'Governance' },
    { id: `${seed}-5`,  timestamp: '2026-05-20T11:05:33Z', action: 'TASK_COMPLETED', actor: agentName, actorType: 'agent', details: 'Processed end-of-day reconciliation report', outcome: 'success', ipAddress: '10.0.0.1', module: 'Core engine' },
    { id: `${seed}-6`,  timestamp: '2026-05-19T17:48:19Z', action: 'RATE_LIMIT_WARNING', actor: 'System', actorType: 'system', details: 'API quota reached 89% of daily limit — alert sent to administrators', outcome: 'warning', ipAddress: '10.0.0.1', module: 'API gateway' },
    { id: `${seed}-7`,  timestamp: '2026-05-19T10:22:07Z', action: 'MODEL_VERSION_UPDATED', actor: 'mike.torres@acme.com', actorType: 'user', details: 'Model updated from v2.3.1 to v2.4.0 — performance improvements applied', outcome: 'success', ipAddress: '10.0.15.102', module: 'Deployment' },
    { id: `${seed}-8`,  timestamp: '2026-05-18T15:55:44Z', action: 'ACCESS_GRANTED', actor: 'linda.park@acme.com', actorType: 'user', details: 'Read access to Benefits module granted after approval workflow', outcome: 'success', ipAddress: '10.0.15.102', module: 'Access control' },
    { id: `${seed}-9`,  timestamp: '2026-05-17T09:30:00Z', action: 'SCHEDULED_RUN_COMPLETED', actor: agentName, actorType: 'agent', details: `Nightly batch completed — ${Math.round(r() * 5000 + 1000)} records processed`, outcome: 'success', ipAddress: '10.0.0.1', module: 'Scheduler' },
    { id: `${seed}-10`, timestamp: '2026-05-16T14:00:12Z', action: 'COMPLIANCE_SCAN', actor: 'System', actorType: 'system', details: 'Weekly compliance scan completed — 0 violations detected', outcome: 'success', ipAddress: '10.0.0.1', module: 'Compliance' },
    { id: `${seed}-11`, timestamp: '2026-05-15T11:45:30Z', action: 'TASK_COMPLETED', actor: agentName, actorType: 'agent', details: 'On-demand analysis request fulfilled in 1.2s', outcome: 'success', ipAddress: '10.0.0.1', module: 'Core engine' },
    { id: `${seed}-12`, timestamp: '2026-05-14T09:00:00Z', action: 'AGENT_DEPLOYED', actor: 'mike.torres@acme.com', actorType: 'user', details: 'New version deployed to production after staging validation', outcome: 'success', ipAddress: '10.0.15.102', module: 'Deployment' },
    { id: `${seed}-13`, timestamp: '2026-05-13T16:22:15Z', action: 'DATA_EXPORT', actor: 'sarah.chen@acme.com', actorType: 'user', details: 'Performance report exported to CSV for Q2 review', outcome: 'success', ipAddress: ips[Math.floor(r() * ips.length)], module: 'Reporting' },
    { id: `${seed}-14`, timestamp: '2026-05-12T10:10:10Z', action: 'ANOMALY_DETECTED', actor: agentName, actorType: 'agent', details: 'Unusual data pattern flagged — escalated to compliance team for review', outcome: 'warning', ipAddress: '10.0.0.1', module: 'Anomaly detection' },
    { id: `${seed}-15`, timestamp: '2026-05-10T08:00:00Z', action: 'MAINTENANCE_COMPLETED', actor: 'System', actorType: 'system', details: 'Scheduled maintenance window completed — all health checks passing', outcome: 'success', ipAddress: '10.0.0.1', module: 'Infrastructure' },
  ]
}

// ── Agent definitions ──────────────────────────────────────────────────────
export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'df-001', name: 'Payroll Calculation Engine',
    description: 'Automates complex payroll calculations including taxes, deductions, and garnishments across all pay groups.',
    longDescription: 'The Payroll Calculation Engine is Dayforce\'s flagship AI agent for payroll automation. It continuously monitors pay rules, tax legislation changes, and employee data to ensure every payroll run is accurate, compliant, and auditable. The agent handles multi-jurisdiction tax calculations, garnishment processing, retro-pay adjustments, and provides plain-language explanations for complex deductions.',
    source: 'dayforce', category: 'payroll', status: 'active',
    version: '4.2.1', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2024-01-15T00:00:00Z', updatedAt: '2026-05-10T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-04-01T00:00:00Z', nextReviewDue: '2026-07-01T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'CCPA'],
    dataResidency: 'US-East', tags: ['payroll', 'tax', 'compliance', 'automation'],
    totalTasksCompleted: 2847392, successRate: 99.4, avgResponseTimeMs: 820,
    activeUsers: 312, uptime: 99.97, totalCostSavings: 1840000,
    totalHoursSaved: 18400, totalErrorsAvoided: 9240, avgDailyCalls: 4200,
    apiQuotaUsed: 68, apiQuotaLimit: 100, permissions: PERMS,
    performanceHistory: genPerf(1001, 4200, 99.4, 312),
    valueHistory: genValue(1001, 9800, 62),
    auditLog: makeAuditLog('Payroll Calculation Engine', 1001),
    observability: genObs('df-001', 'Payroll Calculation Engine', 'payroll', 'claude-sonnet-4-6', 1001, 4200, 99.4),
  },
  {
    id: 'df-002', name: 'Workforce Scheduler',
    description: 'AI-driven scheduling that balances coverage requirements, employee preferences, and labor law constraints.',
    longDescription: 'The Workforce Scheduler uses predictive algorithms to generate optimal shift schedules that satisfy business coverage needs, comply with labor regulations, respect employee availability, and minimize overtime costs. It adapts in real-time to call-outs, demand surges, and last-minute changes while keeping managers informed.',
    source: 'dayforce', category: 'workforce', status: 'active',
    version: '3.8.0', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-05-08T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-03-15T00:00:00Z', nextReviewDue: '2026-06-15T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'ISO 27001'],
    dataResidency: 'US-East', tags: ['scheduling', 'workforce', 'labor-law', 'optimization'],
    totalTasksCompleted: 1923847, successRate: 98.1, avgResponseTimeMs: 1240,
    activeUsers: 486, uptime: 99.91, totalCostSavings: 920000,
    totalHoursSaved: 11500, totalErrorsAvoided: 4800, avgDailyCalls: 3800,
    apiQuotaUsed: 54, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Schedule data', access: 'write', dataClassification: 'internal', lastReviewed: '2026-03-15' },
      { resource: 'Employee availability', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-03-15' },
      { resource: 'Labor rules', access: 'read', dataClassification: 'internal', lastReviewed: '2026-03-15' },
    ],
    performanceHistory: genPerf(1002, 3800, 98.1, 486),
    valueHistory: genValue(1002, 5200, 48),
    auditLog: makeAuditLog('Workforce Scheduler', 1002),
    observability: genObs('df-002', 'Workforce Scheduler', 'workforce', 'claude-sonnet-4-6', 1002, 3800, 98.1),
  },
  {
    id: 'df-003', name: 'Compliance Sentinel',
    description: 'Real-time monitoring of federal, state, and local labor law changes with automated risk flagging.',
    longDescription: 'Compliance Sentinel continuously scans regulatory databases, government publications, and legal updates to identify changes that affect your organization. It automatically maps regulatory changes to impacted policies, employees, and processes, then generates remediation recommendations before compliance deadlines.',
    source: 'dayforce', category: 'compliance', status: 'active',
    version: '2.5.3', modelVersion: 'claude-opus-4-7',
    createdAt: '2024-06-01T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-04-15T00:00:00Z', nextReviewDue: '2026-07-15T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'HIPAA'],
    dataResidency: 'US-East', tags: ['compliance', 'regulatory', 'risk', 'labor-law'],
    totalTasksCompleted: 847203, successRate: 97.8, avgResponseTimeMs: 1850,
    activeUsers: 128, uptime: 99.88, totalCostSavings: 2100000,
    totalHoursSaved: 8400, totalErrorsAvoided: 1240, avgDailyCalls: 1400,
    apiQuotaUsed: 42, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Policy documents', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-04-15' },
      { resource: 'Employee records', access: 'read', dataClassification: 'restricted', lastReviewed: '2026-04-15' },
      { resource: 'Regulatory DB', access: 'admin', dataClassification: 'internal', lastReviewed: '2026-04-15' },
    ],
    performanceHistory: genPerf(1003, 1400, 97.8, 128),
    valueHistory: genValue(1003, 11000, 35),
    auditLog: makeAuditLog('Compliance Sentinel', 1003),
    observability: genObs('df-003', 'Compliance Sentinel', 'compliance', 'claude-opus-4-7', 1003, 1400, 97.8),
  },
  {
    id: 'df-004', name: 'Benefits Enrollment Guide',
    description: 'Conversational AI that guides employees through open enrollment, explains plan options, and processes elections.',
    longDescription: 'The Benefits Enrollment Guide provides personalized, plain-language guidance through the complex benefits enrollment process. It analyzes each employee\'s family situation, health history (where permitted), and financial goals to recommend optimal plan combinations. It handles mid-year qualifying events, explains cost differences, and submits elections automatically.',
    source: 'dayforce', category: 'benefits', status: 'active',
    version: '3.1.0', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2024-08-01T00:00:00Z', updatedAt: '2026-04-20T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-02-01T00:00:00Z', nextReviewDue: '2026-08-01T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'HIPAA', 'CCPA'],
    dataResidency: 'US-East', tags: ['benefits', 'enrollment', 'employee-experience', 'open-enrollment'],
    totalTasksCompleted: 498340, successRate: 96.7, avgResponseTimeMs: 940,
    activeUsers: 1847, uptime: 99.82, totalCostSavings: 380000,
    totalHoursSaved: 6200, totalErrorsAvoided: 2940, avgDailyCalls: 2100,
    apiQuotaUsed: 38, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Benefits plans', access: 'read', dataClassification: 'internal', lastReviewed: '2026-02-01' },
      { resource: 'Employee elections', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-02-01' },
      { resource: 'Dependent data', access: 'write', dataClassification: 'restricted', lastReviewed: '2026-02-01' },
    ],
    performanceHistory: genPerf(1004, 2100, 96.7, 1847),
    valueHistory: genValue(1004, 2400, 26),
    auditLog: makeAuditLog('Benefits Enrollment Guide', 1004),
    observability: genObs('df-004', 'Benefits Enrollment Guide', 'benefits', 'claude-sonnet-4-6', 1004, 2100, 96.7),
  },
  {
    id: 'df-005', name: 'Time & Attendance Auditor',
    description: 'Detects punch anomalies, time theft patterns, and absenteeism trends using behavioral analytics.',
    longDescription: 'The Time & Attendance Auditor applies machine learning to identify deviations from established patterns in employee timekeeping. It flags potential buddy punching, unauthorized overtime, missed meal breaks, and attendance risk patterns before they escalate. Managers receive proactive alerts with evidence and recommended actions.',
    source: 'dayforce', category: 'analytics', status: 'active',
    version: '2.9.1', modelVersion: 'claude-haiku-4-5',
    createdAt: '2024-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-03-01T00:00:00Z', nextReviewDue: '2026-09-01T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'ISO 27001'],
    dataResidency: 'US-East', tags: ['time', 'attendance', 'fraud-detection', 'analytics'],
    totalTasksCompleted: 3281044, successRate: 99.1, avgResponseTimeMs: 420,
    activeUsers: 892, uptime: 99.99, totalCostSavings: 1240000,
    totalHoursSaved: 4800, totalErrorsAvoided: 8400, avgDailyCalls: 8400,
    apiQuotaUsed: 82, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Time records', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-03-01' },
      { resource: 'Biometric data', access: 'read', dataClassification: 'restricted', lastReviewed: '2026-03-01' },
      { resource: 'Audit reports', access: 'write', dataClassification: 'internal', lastReviewed: '2026-03-01' },
    ],
    performanceHistory: genPerf(1005, 8400, 99.1, 892),
    valueHistory: genValue(1005, 6800, 20),
    auditLog: makeAuditLog('Time & Attendance Auditor', 1005),
    observability: genObs('df-005', 'Time & Attendance Auditor', 'analytics', 'claude-haiku-4-5', 1005, 8400, 99.1),
  },
  {
    id: 'df-006', name: 'Talent Acquisition Bot',
    description: 'Screens resumes, ranks candidates against job requirements, and schedules interviews at scale.',
    longDescription: 'The Talent Acquisition Bot accelerates hiring by automating the high-volume, repetitive tasks in talent acquisition. It parses and scores resumes against structured competency frameworks, conducts preliminary screening conversations, coordinates interview scheduling, and ensures consistent candidate communication throughout the process.',
    source: 'dayforce', category: 'talent', status: 'active',
    version: '2.1.4', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2024-09-01T00:00:00Z', updatedAt: '2026-04-15T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-03-20T00:00:00Z', nextReviewDue: '2026-06-20T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'GDPR', 'EEOC-Compliant'],
    dataResidency: 'US-East', tags: ['recruiting', 'screening', 'hiring', 'talent'],
    totalTasksCompleted: 284920, successRate: 94.2, avgResponseTimeMs: 1620,
    activeUsers: 74, uptime: 99.74, totalCostSavings: 640000,
    totalHoursSaved: 9800, totalErrorsAvoided: 1840, avgDailyCalls: 920,
    apiQuotaUsed: 29, apiQuotaLimit: 100, permissions: PERMS_TALENT,
    performanceHistory: genPerf(1006, 920, 94.2, 74),
    valueHistory: genValue(1006, 3400, 41),
    auditLog: makeAuditLog('Talent Acquisition Bot', 1006),
    observability: genObs('df-006', 'Talent Acquisition Bot', 'talent', 'claude-sonnet-4-6', 1006, 920, 94.2),
  },
  {
    id: 'df-007', name: 'Onboarding Concierge',
    description: 'Manages end-to-end new hire onboarding workflows from offer acceptance to 90-day check-in.',
    longDescription: 'The Onboarding Concierge orchestrates the full pre- and post-hire onboarding experience. It coordinates paperwork, equipment provisioning, IT access, training assignments, and introduces new hires to key stakeholders. The agent proactively surfaces blockers to HR and managers, and conducts structured check-ins at 30, 60, and 90 days.',
    source: 'dayforce', category: 'onboarding', status: 'active',
    version: '1.8.2', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2026-04-30T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-04-01T00:00:00Z', nextReviewDue: '2026-10-01T00:00:00Z',
    riskLevel: 'low', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'GDPR'],
    dataResidency: 'US-East', tags: ['onboarding', 'new-hire', 'employee-experience', 'automation'],
    totalTasksCompleted: 124840, successRate: 97.3, avgResponseTimeMs: 720,
    activeUsers: 218, uptime: 99.85, totalCostSavings: 290000,
    totalHoursSaved: 5800, totalErrorsAvoided: 920, avgDailyCalls: 640,
    apiQuotaUsed: 18, apiQuotaLimit: 100, permissions: PERMS_RO,
    performanceHistory: genPerf(1007, 640, 97.3, 218),
    valueHistory: genValue(1007, 1600, 24),
    auditLog: makeAuditLog('Onboarding Concierge', 1007),
    observability: genObs('df-007', 'Onboarding Concierge', 'onboarding', 'claude-sonnet-4-6', 1007, 640, 97.3),
  },
  {
    id: 'df-008', name: 'Performance Coach',
    description: 'Facilitates continuous performance management with goal tracking, feedback nudges, and review automation.',
    longDescription: 'The Performance Coach transforms annual review cycles into continuous conversations. It reminds managers and employees to document feedback in the moment, tracks goal progress with weekly nudges, identifies coaching opportunities from engagement signals, and auto-drafts balanced performance summaries from documented touchpoints.',
    source: 'dayforce', category: 'performance', status: 'maintenance',
    version: '1.4.0', modelVersion: 'claude-opus-4-7',
    createdAt: '2025-03-01T00:00:00Z', updatedAt: '2026-05-19T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-04-20T00:00:00Z', nextReviewDue: '2026-07-20T00:00:00Z',
    riskLevel: 'low', complianceStatus: 'review-needed',
    certifications: ['SOC 2 Type II'],
    dataResidency: 'US-East', tags: ['performance', 'feedback', 'goals', 'coaching'],
    totalTasksCompleted: 48200, successRate: 91.2, avgResponseTimeMs: 2200,
    activeUsers: 540, uptime: 97.40, totalCostSavings: 180000,
    totalHoursSaved: 3600, totalErrorsAvoided: 480, avgDailyCalls: 280,
    apiQuotaUsed: 12, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Performance reviews', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-04-20' },
      { resource: 'Goal data', access: 'write', dataClassification: 'internal', lastReviewed: '2026-04-20' },
    ],
    performanceHistory: genPerf(1008, 280, 91.2, 540),
    valueHistory: genValue(1008, 1000, 15),
    auditLog: makeAuditLog('Performance Coach', 1008),
    observability: genObs('df-008', 'Performance Coach', 'performance', 'claude-opus-4-7', 1008, 280, 91.2),
  },
  {
    id: 'df-009', name: 'Leave & Absence Coordinator',
    description: 'Enforces complex leave policies, tracks FMLA/ADA entitlements, and manages return-to-work workflows.',
    longDescription: 'The Leave & Absence Coordinator handles the full lifecycle of employee leave requests — from initial submission through approval, tracking, and return-to-work. It automatically applies the correct policy based on leave reason, jurisdiction, and employment type, while managing FMLA certification, ADA accommodation, and integration with payroll for leave pay calculations.',
    source: 'dayforce', category: 'workforce', status: 'active',
    version: '3.3.2', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-05-12T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-03-10T00:00:00Z', nextReviewDue: '2026-09-10T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'HIPAA', 'ISO 27001'],
    dataResidency: 'US-East', tags: ['leave', 'absence', 'FMLA', 'compliance', 'ADA'],
    totalTasksCompleted: 924100, successRate: 98.6, avgResponseTimeMs: 980,
    activeUsers: 648, uptime: 99.92, totalCostSavings: 620000,
    totalHoursSaved: 7800, totalErrorsAvoided: 3240, avgDailyCalls: 2400,
    apiQuotaUsed: 47, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Leave records', access: 'write', dataClassification: 'restricted', lastReviewed: '2026-03-10' },
      { resource: 'Medical certifications', access: 'write', dataClassification: 'restricted', lastReviewed: '2026-03-10' },
      { resource: 'Payroll integration', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-03-10' },
    ],
    performanceHistory: genPerf(1009, 2400, 98.6, 648),
    valueHistory: genValue(1009, 3600, 32),
    auditLog: makeAuditLog('Leave & Absence Coordinator', 1009),
    observability: genObs('df-009', 'Leave & Absence Coordinator', 'workforce', 'claude-sonnet-4-6', 1009, 2400, 98.6),
  },
  {
    id: 'df-010', name: 'Labor Analytics Engine',
    description: 'Predictive labor cost modeling, headcount forecasting, and what-if scenario planning for finance and HR.',
    longDescription: 'The Labor Analytics Engine synthesizes workforce data to produce forward-looking insights that inform strategic decisions. It generates predictive headcount models, labor cost forecasts, span-of-control analysis, and productivity benchmarks. Business leaders can run interactive what-if scenarios to evaluate the financial impact of org changes, wage adjustments, or hiring plans.',
    source: 'dayforce', category: 'analytics', status: 'active',
    version: '2.7.0', modelVersion: 'claude-opus-4-7',
    createdAt: '2024-07-01T00:00:00Z', updatedAt: '2026-05-05T00:00:00Z',
    createdBy: 'Dayforce Platform', lastReviewedAt: '2026-04-05T00:00:00Z', nextReviewDue: '2026-07-05T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'compliant',
    certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
    dataResidency: 'US-East', tags: ['analytics', 'forecasting', 'labor-cost', 'workforce-planning'],
    totalTasksCompleted: 182400, successRate: 96.4, avgResponseTimeMs: 3200,
    activeUsers: 94, uptime: 99.78, totalCostSavings: 1480000,
    totalHoursSaved: 12400, totalErrorsAvoided: 2100, avgDailyCalls: 680,
    apiQuotaUsed: 35, apiQuotaLimit: 100,
    permissions: [
      { resource: 'Compensation data', access: 'read', dataClassification: 'restricted', lastReviewed: '2026-04-05' },
      { resource: 'Headcount reports', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-04-05' },
      { resource: 'Budget data', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-04-05' },
    ],
    performanceHistory: genPerf(1010, 680, 96.4, 94),
    valueHistory: genValue(1010, 8200, 52),
    auditLog: makeAuditLog('Labor Analytics Engine', 1010),
    observability: genObs('df-010', 'Labor Analytics Engine', 'analytics', 'claude-opus-4-7', 1010, 680, 96.4),
  },
  {
    id: 'cust-001', name: 'Overtime Predictor',
    description: 'Predicts department-level overtime risk 2 weeks ahead using historical patterns and approved schedule data.',
    longDescription: 'Built by ACME Corp\'s Workforce Operations team, the Overtime Predictor uses 3 years of historical overtime data combined with upcoming approved schedules, seasonal demand curves, and known absences to forecast overtime risk by department. Finance and HR use the 14-day outlook to take proactive action before overtime costs are incurred.',
    source: 'custom', category: 'analytics', status: 'active',
    version: '1.2.0', modelVersion: 'claude-haiku-4-5',
    createdAt: '2025-06-01T00:00:00Z', updatedAt: '2026-05-18T00:00:00Z',
    createdBy: 'workforce-ops@acme.com', lastReviewedAt: '2026-04-01T00:00:00Z', nextReviewDue: '2026-10-01T00:00:00Z',
    riskLevel: 'low', complianceStatus: 'compliant',
    certifications: ['Internal security review'],
    dataResidency: 'US-East', tags: ['overtime', 'forecasting', 'custom', 'cost-control'],
    totalTasksCompleted: 18240, successRate: 93.8, avgResponseTimeMs: 2100,
    activeUsers: 32, uptime: 98.92, totalCostSavings: 420000,
    totalHoursSaved: 1800, totalErrorsAvoided: 620, avgDailyCalls: 120,
    apiQuotaUsed: 8, apiQuotaLimit: 50,
    permissions: [
      { resource: 'Schedule data', access: 'read', dataClassification: 'internal', lastReviewed: '2026-04-01' },
      { resource: 'Historical OT records', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-04-01' },
    ],
    performanceHistory: genPerf(2001, 120, 93.8, 32),
    valueHistory: genValue(2001, 2200, 8),
    auditLog: makeAuditLog('Overtime Predictor', 2001),
    observability: genObs('cust-001', 'Overtime Predictor', 'analytics', 'claude-haiku-4-5', 2001, 120, 93.8),
  },
  {
    id: 'cust-002', name: 'Union Contract Monitor',
    description: 'Validates all scheduling and payroll actions against CBA (Collective Bargaining Agreement) rules in real time.',
    longDescription: 'Developed by ACME Corp\'s Labor Relations team, the Union Contract Monitor interprets the 380-page CBA across 12 union locals and validates workforce actions against contract rules before they are committed. It flags violations, suggests compliant alternatives, and maintains a grievance-ready audit trail.',
    source: 'custom', category: 'compliance', status: 'active',
    version: '2.0.1', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2025-02-01T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z',
    createdBy: 'labor-relations@acme.com', lastReviewedAt: '2026-05-01T00:00:00Z', nextReviewDue: '2026-08-01T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'compliant',
    certifications: ['Internal security review', 'Legal review approved'],
    dataResidency: 'US-East', tags: ['union', 'CBA', 'compliance', 'labor-relations', 'custom'],
    totalTasksCompleted: 84200, successRate: 99.7, avgResponseTimeMs: 540,
    activeUsers: 18, uptime: 99.95, totalCostSavings: 1800000,
    totalHoursSaved: 3200, totalErrorsAvoided: 4800, avgDailyCalls: 840,
    apiQuotaUsed: 22, apiQuotaLimit: 50,
    permissions: [
      { resource: 'CBA documents', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-05-01' },
      { resource: 'Grievance records', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-05-01' },
      { resource: 'Schedule data', access: 'read', dataClassification: 'internal', lastReviewed: '2026-05-01' },
    ],
    performanceHistory: genPerf(2002, 840, 99.7, 18),
    valueHistory: genValue(2002, 9800, 14),
    auditLog: makeAuditLog('Union Contract Monitor', 2002),
    observability: genObs('cust-002', 'Union Contract Monitor', 'compliance', 'claude-sonnet-4-6', 2002, 840, 99.7),
  },
  {
    id: 'cust-003', name: 'DEI Hiring Tracker',
    description: 'Monitors diversity representation across each hiring funnel stage and surfaces bias risk signals.',
    longDescription: 'The DEI Hiring Tracker provides ACME Corp\'s Talent & Inclusion team with real-time visibility into demographic representation at every stage of the hiring funnel. It compares representation against workforce and market benchmarks, identifies where funnel attrition disproportionately affects protected groups, and generates Board-ready quarterly reports.',
    source: 'custom', category: 'talent', status: 'inactive',
    version: '1.0.3', modelVersion: 'claude-haiku-4-5',
    createdAt: '2025-08-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
    createdBy: 'dei-team@acme.com', lastReviewedAt: '2026-03-01T00:00:00Z', nextReviewDue: '2026-06-01T00:00:00Z',
    riskLevel: 'high', complianceStatus: 'review-needed',
    certifications: ['Internal security review', 'Legal review pending'],
    dataResidency: 'US-East', tags: ['DEI', 'hiring', 'diversity', 'custom', 'reporting'],
    totalTasksCompleted: 4820, successRate: 88.4, avgResponseTimeMs: 3400,
    activeUsers: 8, uptime: 96.20, totalCostSavings: 0,
    totalHoursSaved: 480, totalErrorsAvoided: 140, avgDailyCalls: 0,
    apiQuotaUsed: 0, apiQuotaLimit: 20,
    permissions: [
      { resource: 'Applicant demographics', access: 'read', dataClassification: 'restricted', lastReviewed: '2026-03-01' },
      { resource: 'Hiring decisions', access: 'read', dataClassification: 'confidential', lastReviewed: '2026-03-01' },
    ],
    performanceHistory: genPerf(2003, 40, 88.4, 8),
    valueHistory: genValue(2003, 0, 2),
    auditLog: makeAuditLog('DEI Hiring Tracker', 2003),
    observability: genObs('cust-003', 'DEI Hiring Tracker', 'talent', 'claude-haiku-4-5', 2003, 40, 88.4),
  },
  {
    id: 'cust-004', name: 'Seasonal Ramp Planner',
    description: 'Automates the end-to-end seasonal hiring and ramp-down plan for 1,200+ temporary workers each peak season.',
    longDescription: 'Each year ACME Corp hires 1,200+ seasonal workers across 14 distribution centers for peak season. The Seasonal Ramp Planner generates the complete hiring timeline, candidate pipeline targets by location, onboarding capacity plans, and ramp-down schedules — adjusting weekly based on demand signal changes.',
    source: 'custom', category: 'workforce', status: 'active',
    version: '1.5.1', modelVersion: 'claude-sonnet-4-6',
    createdAt: '2025-04-01T00:00:00Z', updatedAt: '2026-05-20T00:00:00Z',
    createdBy: 'hr-ops@acme.com', lastReviewedAt: '2026-05-01T00:00:00Z', nextReviewDue: '2026-11-01T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'compliant',
    certifications: ['Internal security review'],
    dataResidency: 'US-East', tags: ['seasonal', 'hiring-plan', 'workforce', 'custom'],
    totalTasksCompleted: 24600, successRate: 96.1, avgResponseTimeMs: 1840,
    activeUsers: 28, uptime: 99.10, totalCostSavings: 840000,
    totalHoursSaved: 4200, totalErrorsAvoided: 1240, avgDailyCalls: 240,
    apiQuotaUsed: 14, apiQuotaLimit: 50,
    permissions: [
      { resource: 'Requisitions', access: 'write', dataClassification: 'internal', lastReviewed: '2026-05-01' },
      { resource: 'Headcount plans', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-05-01' },
      { resource: 'Location data', access: 'read', dataClassification: 'internal', lastReviewed: '2026-05-01' },
    ],
    performanceHistory: genPerf(2004, 240, 96.1, 28),
    valueHistory: genValue(2004, 4600, 18),
    auditLog: makeAuditLog('Seasonal Ramp Planner', 2004),
    observability: genObs('cust-004', 'Seasonal Ramp Planner', 'workforce', 'claude-sonnet-4-6', 2004, 240, 96.1),
  },
  {
    id: 'cust-005', name: 'Expense Policy Bot',
    description: 'Validates submitted expense reports against company policy and flags violations before manager approval.',
    longDescription: 'The Expense Policy Bot pre-screens every expense report submission against ACME Corp\'s 84-page travel and expense policy. It catches policy violations (receipt missing, above meal limit, non-approved vendor, personal expense), explains the specific violation to the employee, and routes borderline items to the appropriate approver with a risk score.',
    source: 'custom', category: 'compliance', status: 'degraded',
    version: '1.1.0', modelVersion: 'claude-haiku-4-5',
    createdAt: '2025-09-01T00:00:00Z', updatedAt: '2026-05-21T00:00:00Z',
    createdBy: 'finance@acme.com', lastReviewedAt: '2026-04-10T00:00:00Z', nextReviewDue: '2026-07-10T00:00:00Z',
    riskLevel: 'medium', complianceStatus: 'review-needed',
    certifications: ['Internal security review'],
    dataResidency: 'US-East', tags: ['expense', 'compliance', 'finance', 'custom', 'policy'],
    totalTasksCompleted: 12840, successRate: 84.2, avgResponseTimeMs: 4200,
    activeUsers: 142, uptime: 94.80, totalCostSavings: 180000,
    totalHoursSaved: 1200, totalErrorsAvoided: 840, avgDailyCalls: 180,
    apiQuotaUsed: 6, apiQuotaLimit: 20,
    permissions: [
      { resource: 'Expense reports', access: 'write', dataClassification: 'confidential', lastReviewed: '2026-04-10' },
      { resource: 'Policy documents', access: 'read', dataClassification: 'internal', lastReviewed: '2026-04-10' },
    ],
    performanceHistory: genPerf(2005, 180, 84.2, 142),
    valueHistory: genValue(2005, 900, 5),
    auditLog: makeAuditLog('Expense Policy Bot', 2005),
    observability: genObs('cust-005', 'Expense Policy Bot', 'compliance', 'claude-haiku-4-5', 2005, 180, 84.2),
  },
]
