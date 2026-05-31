import { useState, useEffect } from 'react'
import { X, Bot, ChevronDown } from 'lucide-react'
import type { Agent, AgentFormData, AgentCategory, AgentStatus, RiskLevel } from '../types/agent'

interface AddEditAgentModalProps {
  agent?: Agent | null
  onSave: (data: AgentFormData) => void
  onClose: () => void
}

const CATEGORIES: { value: AgentCategory; label: string }[] = [
  { value: 'payroll', label: 'Payroll' },
  { value: 'workforce', label: 'Workforce Management' },
  { value: 'compliance', label: 'Compliance & Risk' },
  { value: 'talent', label: 'Talent Acquisition' },
  { value: 'analytics', label: 'Analytics & Reporting' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'benefits', label: 'Benefits Administration' },
  { value: 'performance', label: 'Performance Management' },
]

const MODELS = [
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 — Most capable' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — Balanced (Recommended)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — Fast & lightweight' },
]

const RESIDENCY = ['US-East', 'US-West', 'EU-Central', 'CA-Central', 'AP-Southeast']

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white placeholder:text-slate-400'
const selectCls = `${inputCls} appearance-none cursor-pointer`

export default function AddEditAgentModal({ agent, onSave, onClose }: AddEditAgentModalProps) {
  const isEdit = !!agent
  const isEditingDayforceAgent = isEdit && agent!.source === 'dayforce'

  const [form, setForm] = useState<AgentFormData>({
    name: '',
    description: '',
    longDescription: '',
    category: 'analytics',
    status: 'active',
    riskLevel: 'medium',
    tags: '',
    modelVersion: 'claude-sonnet-4-6',
    dataResidency: 'US-East',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({})
  const [section, setSection] = useState<'general' | 'config'>('general')

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name,
        description: agent.description,
        longDescription: agent.longDescription,
        category: agent.category,
        status: agent.status,
        riskLevel: agent.riskLevel,
        tags: agent.tags.join(', '),
        modelVersion: agent.modelVersion,
        dataResidency: agent.dataResidency,
      })
    }
  }, [agent])

  function set<K extends keyof AgentFormData>(key: K, val: AgentFormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof AgentFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bot className="text-blue-600" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? `Edit Agent` : 'Add Custom Agent'}
            </h2>
            {isEdit && <p className="text-xs text-slate-500 mt-0.5">{agent!.name}</p>}
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Section tabs */}
        <div className="px-6 flex gap-4 border-b border-slate-200 bg-slate-50 shrink-0">
          {(['general', 'config'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                section === s ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {s === 'general' ? 'General Info' : 'Configuration'}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {section === 'general' && (
              <>
                <Field label="Agent Name" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Overtime Predictor"
                    className={`${inputCls} ${errors.name ? 'border-red-300 focus:border-red-400' : ''}`}
                    disabled={isEditingDayforceAgent}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </Field>

                <Field label="Short Description" required hint="Shown on the agent card. Keep it under 120 characters.">
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Brief summary of what this agent does"
                    className={`${inputCls} ${errors.description ? 'border-red-300' : ''}`}
                    maxLength={140}
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </Field>

                <Field label="Full Description" hint="Used on the agent detail page.">
                  <textarea
                    value={form.longDescription}
                    onChange={e => set('longDescription', e.target.value)}
                    placeholder="Detailed description of the agent's capabilities, data sources, and business value..."
                    className={`${inputCls} min-h-[80px] resize-y`}
                    rows={3}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category" required>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={e => set('category', e.target.value as AgentCategory)}
                        className={selectCls}
                      >
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </Field>

                  <Field label="Status">
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={e => set('status', e.target.value as AgentStatus)}
                        className={selectCls}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </Field>
                </div>

                <Field label="Tags" hint="Comma-separated list for search and filtering">
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => set('tags', e.target.value)}
                    placeholder="e.g. overtime, forecasting, custom"
                    className={inputCls}
                  />
                </Field>
              </>
            )}

            {section === 'config' && (
              <>
                <Field label="Risk Level" required>
                  <div className="relative">
                    <select
                      value={form.riskLevel}
                      onChange={e => set('riskLevel', e.target.value as RiskLevel)}
                      className={selectCls}
                    >
                      <option value="low">Low — Read-only data access, no automated actions</option>
                      <option value="medium">Medium — Limited write access, human-in-the-loop</option>
                      <option value="high">High — Broad data access or direct system actions</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </Field>

                <Field label="Model Version" required hint="The Claude model that powers this agent.">
                  <div className="relative">
                    <select
                      value={form.modelVersion}
                      onChange={e => set('modelVersion', e.target.value)}
                      className={selectCls}
                      disabled={isEditingDayforceAgent}
                    >
                      {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </Field>

                <Field label="Data Residency" required hint="Geographic region where this agent processes and stores data.">
                  <div className="relative">
                    <select
                      value={form.dataResidency}
                      onChange={e => set('dataResidency', e.target.value)}
                      className={selectCls}
                      disabled={isEditingDayforceAgent}
                    >
                      {RESIDENCY.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </Field>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                  <strong>Compliance Note:</strong> New agents are placed in <em>review-needed</em> status until an administrator completes the governance review. The agent will be available immediately but will be flagged until review is complete.
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3 bg-slate-50 shrink-0">
            {section === 'general' ? (
              <>
                <button type="button" onClick={onClose} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => setSection('config')} className="ml-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition-colors">
                  Next: Configuration →
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setSection('general')} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white transition-colors">
                  ← Back
                </button>
                <button type="submit" className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition-colors">
                  {isEdit ? 'Save Changes' : 'Create Agent'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
