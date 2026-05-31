import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, ChevronDown, Activity } from 'lucide-react'

interface LayoutProps { children: ReactNode }

// Dayforce wordmark — recreated from Everest brand guide
function DayforceWordmark({ size = 'default' }: { size?: 'default' | 'sm' }) {
  const h = size === 'sm' ? 18 : 22
  return (
    <svg height={h} viewBox="0 0 140 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Dayforce">
      {/* D mark */}
      <rect x="0" y="2" width="20" height="24" rx="3" fill="#3067db"/>
      <text x="3" y="20" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="18" fill="white">D</text>
      {/* Wordmark */}
      <text x="26" y="20" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="16" fill="#1f1f23">Dayforce</text>
    </svg>
  )
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchValue, setSearchValue] = useState('')

  const navItems = [
    { label: 'Agent registry', path: '/' },
    { label: 'Observability', path: '/observability', live: true },
  ]

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--evr-surface-root)' }}>
      {/* ── Global header — 48px per Everest spec ─────────────────────── */}
      <header className="bg-white border-b border-evr-border-decorative sticky top-0 z-40"
        style={{ boxShadow: 'var(--evr-shadow-02)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 h-12 flex items-center gap-5">
          {/* Wordmark */}
          <button onClick={() => navigate('/')} className="shrink-0 flex items-center gap-2 group">
            <DayforceWordmark />
            <span className="text-[11px] font-semibold text-evr-text-low border-l border-evr-border-decorative pl-2 leading-none">
              Agent Central
            </span>
          </button>

          {/* Search */}
          <form className="flex-1 max-w-md" onSubmit={e => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-evr-text-low pointer-events-none" size={14} />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder="Search agents…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-evr-border-decorative rounded-evr-sm bg-evr-surface-secondary focus:bg-white focus:outline-none focus:ring-2 focus:ring-evr-blue-400/25 focus:border-evr-blue-400 transition-all placeholder:text-evr-text-low"
              />
            </div>
          </form>

          {/* Feature nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-evr-sm transition-colors duration-150 ${
                  isActive(item.path)
                    ? 'text-evr-blue-400 bg-evr-blue-tint'
                    : 'text-evr-text-default hover:text-evr-text-high hover:bg-evr-surface-secondary'
                }`}
              >
                {item.live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-evr-success animate-pulse-dot" />
                )}
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 bg-evr-blue-400 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-evr-sm hover:bg-evr-surface-secondary text-evr-text-default transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-evr-error rounded-full border border-white" />
            </button>
            <button className="flex items-center gap-2 px-2 py-1 rounded-evr-sm hover:bg-evr-surface-secondary transition-colors">
              <div className="w-6 h-6 rounded-full bg-evr-blue-400 flex items-center justify-center text-white text-[10px] font-bold">SC</div>
              <span className="text-sm font-medium text-evr-text-default hidden sm:block">Sarah Chen</span>
              <ChevronDown size={12} className="text-evr-text-low hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb strip — detail pages only */}
      {location.pathname !== '/' && location.pathname !== '/observability' && (
        <div className="bg-white border-b border-evr-border-decorative">
          <div className="max-w-screen-2xl mx-auto px-6 h-9 flex items-center gap-2 text-xs text-evr-text-low">
            <button onClick={() => navigate('/')} className="hover:text-evr-blue-400 transition-colors">Agent registry</button>
            <span className="text-evr-border-subtle">/</span>
            <span className="text-evr-text-high font-medium">Agent detail</span>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-evr-border-decorative bg-white mt-8">
        <div className="max-w-screen-2xl mx-auto px-6 h-10 flex items-center justify-between text-[11px] text-evr-text-low">
          <span>© 2026 Dayforce, Inc.</span>
          <span className="flex items-center gap-1.5">
            <Activity size={11} className="text-evr-success" />
            Production · US-East · Build 20260521
          </span>
        </div>
      </footer>
    </div>
  )
}
