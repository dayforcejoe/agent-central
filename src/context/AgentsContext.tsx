import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Agent, AgentFormData } from '../types/agent'
import { INITIAL_AGENTS } from '../data/mockData'

interface AgentsContextType {
  agents: Agent[]
  addAgent: (data: AgentFormData) => Agent
  updateAgent: (id: string, data: AgentFormData) => void
  deleteAgent: (id: string) => void
  getAgent: (id: string) => Agent | undefined
}

const AgentsContext = createContext<AgentsContextType | null>(null)

function buildNewAgent(data: AgentFormData, id: string): Agent {
  const now = new Date().toISOString()
  return {
    id,
    name: data.name,
    description: data.description,
    longDescription: data.longDescription,
    source: 'custom',
    category: data.category,
    status: data.status,
    version: '1.0.0',
    modelVersion: data.modelVersion,
    createdAt: now,
    updatedAt: now,
    createdBy: 'current.user@acme.com',
    lastReviewedAt: now,
    nextReviewDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    riskLevel: data.riskLevel,
    complianceStatus: 'review-needed',
    certifications: ['Pending Review'],
    dataResidency: data.dataResidency,
    tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
    totalTasksCompleted: 0,
    successRate: 0,
    avgResponseTimeMs: 0,
    activeUsers: 0,
    uptime: 100,
    totalCostSavings: 0,
    totalHoursSaved: 0,
    totalErrorsAvoided: 0,
    avgDailyCalls: 0,
    apiQuotaUsed: 0,
    apiQuotaLimit: 20,
    permissions: [],
    performanceHistory: [],
    valueHistory: [],
    auditLog: [
      {
        id: `${id}-create`,
        timestamp: now,
        action: 'AGENT_CREATED',
        actor: 'current.user@acme.com',
        actorType: 'user',
        details: `Agent "${data.name}" created and pending compliance review`,
        outcome: 'success',
        ipAddress: '10.0.12.44',
        module: 'Agent Registry',
      },
    ],
  }
}

export function AgentsProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)

  function addAgent(data: AgentFormData): Agent {
    const id = `cust-${Date.now()}`
    const newAgent = buildNewAgent(data, id)
    setAgents(prev => [...prev, newAgent])
    return newAgent
  }

  function updateAgent(id: string, data: AgentFormData) {
    setAgents(prev => prev.map(a => a.id === id
      ? {
        ...a,
        name: data.name,
        description: data.description,
        longDescription: data.longDescription,
        category: data.category,
        status: data.status,
        riskLevel: data.riskLevel,
        modelVersion: data.modelVersion,
        dataResidency: data.dataResidency,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
        auditLog: [
          {
            id: `${id}-update-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CONFIG_UPDATED',
            actor: 'current.user@acme.com',
            actorType: 'user' as const,
            details: `Agent configuration updated`,
            outcome: 'success' as const,
            ipAddress: '10.0.12.44',
            module: 'Agent Registry',
          },
          ...a.auditLog,
        ],
      }
      : a
    ))
  }

  function deleteAgent(id: string) {
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  function getAgent(id: string) {
    return agents.find(a => a.id === id)
  }

  return (
    <AgentsContext.Provider value={{ agents, addAgent, updateAgent, deleteAgent, getAgent }}>
      {children}
    </AgentsContext.Provider>
  )
}

export function useAgents() {
  const ctx = useContext(AgentsContext)
  if (!ctx) throw new Error('useAgents must be used within AgentsProvider')
  return ctx
}
