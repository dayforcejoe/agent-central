export type AgentStatus = 'active' | 'inactive' | 'degraded' | 'maintenance';
export type AgentSource = 'dayforce' | 'custom';
export type AgentCategory =
  | 'payroll'
  | 'workforce'
  | 'compliance'
  | 'talent'
  | 'analytics'
  | 'onboarding'
  | 'benefits'
  | 'performance';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ComplianceStatus = 'compliant' | 'review-needed' | 'non-compliant';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type AccessLevel = 'read' | 'write' | 'admin';

export interface Permission {
  resource: string;
  access: AccessLevel;
  dataClassification: DataClassification;
  lastReviewed: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorType: 'user' | 'system' | 'agent';
  details: string;
  outcome: 'success' | 'failure' | 'warning';
  ipAddress: string;
  module: string;
}

export interface PerformanceMetric {
  date: string;
  tasksCompleted: number;
  successRate: number;
  avgResponseTimeMs: number;
  activeUsers: number;
  errorCount: number;
}

export interface ValueMetric {
  date: string;
  costSavings: number;
  hoursSaved: number;
  errorsAvoided: number;
  automationRate: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  source: AgentSource;
  category: AgentCategory;
  status: AgentStatus;
  version: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastReviewedAt: string;
  nextReviewDue: string;
  riskLevel: RiskLevel;
  complianceStatus: ComplianceStatus;
  certifications: string[];
  dataResidency: string;
  tags: string[];

  totalTasksCompleted: number;
  successRate: number;
  avgResponseTimeMs: number;
  activeUsers: number;
  uptime: number;
  totalCostSavings: number;
  totalHoursSaved: number;
  totalErrorsAvoided: number;
  avgDailyCalls: number;
  apiQuotaUsed: number;
  apiQuotaLimit: number;

  permissions: Permission[];
  performanceHistory: PerformanceMetric[];
  valueHistory: ValueMetric[];
  auditLog: AuditEntry[];
}

export interface AgentFormData {
  name: string;
  description: string;
  longDescription: string;
  category: AgentCategory;
  status: AgentStatus;
  riskLevel: RiskLevel;
  tags: string;
  modelVersion: string;
  dataResidency: string;
}
