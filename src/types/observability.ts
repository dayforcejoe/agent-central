// ── OTel-aligned observability types ──────────────────────────────────────
// Based on the Dayforce Agent Analytics Data Schema (observability.md)
// Spans follow the OpenTelemetry GenAI semantic conventions.

export type SpanOperation =
  | 'create_agent'
  | 'invoke_agent'
  | 'invoke_agent_internal'
  | 'invoke_workflow'
  | 'inference'
  | 'execute_tool'
  | 'embeddings'
  | 'retrieval'

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'

export interface OTelSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operation: SpanOperation
  agentId: string
  agentName: string
  userId: string
  userEmail: string
  userDisplayName: string
  department: string
  conversationId: string
  sessionId: string
  startTime: string               // ISO-8601
  durationMs: number
  status: 'ok' | 'error'
  errorType?: string              // OTel error.type
  finishReason?: FinishReason     // gen_ai.response.finish_reasons
  inputTokens?: number            // gen_ai.usage.input_tokens
  outputTokens?: number           // gen_ai.usage.output_tokens
  toolName?: string               // gen_ai.tool.name
  toolCallId?: string             // gen_ai.tool.call.id
  workflowName?: string           // gen_ai.workflow.name
  isMobile?: boolean
  responseId?: string             // gen_ai.response.id
}

export interface TokenUsageDaily {
  date: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  sessions: number
}

export interface ToolCallMetric {
  toolName: string
  description: string
  callCount: number
  successCount: number
  avgDurationMs: number
  p95DurationMs: number
}

export interface UserSessionMetric {
  userId: string
  userEmail: string
  displayName: string
  department: string
  sessionCount: number
  totalConversations: number
  avgSessionDurationMin: number
  avgSatisfactionScore: number    // 1–5
  lastActiveAt: string
  topOperation: string
}

export interface HourlyInvocation {
  hour: string   // 'YYYY-MM-DD HH:00'
  label: string  // display: 'HH:00'
  total: number
  success: number
  errors: number
  avgDurationMs: number
}

export interface FinishReasonBreakdown {
  reason: FinishReason
  count: number
  pct: number
}

export interface LatencyPercentiles {
  p50: number
  p75: number
  p95: number
  p99: number
}

// Aggregated per-agent observability snapshot
export interface AgentObservability {
  recentTraces: OTelSpan[]
  tokenUsageHistory: TokenUsageDaily[]   // last 30 days
  toolCallMetrics: ToolCallMetric[]
  userSessionMetrics: UserSessionMetric[]
  hourlyInvocations: HourlyInvocation[]  // last 24 hours
  finishReasonBreakdown: FinishReasonBreakdown[]
  latencyPercentiles: LatencyPercentiles
  totalSessions30d: number
  totalConversations30d: number
  totalTokenCost30dUsd: number
  escalationRate: number   // % conversations handed off to human
  csat: number             // avg satisfaction 1-5
  topicBreakdown: { topic: string; count: number; pct: number }[]
}
