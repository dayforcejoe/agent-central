import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Activity } from 'lucide-react'

interface LayoutProps { children: ReactNode }

// Dayforce "d" brand mark — reproduced from Everest DS (df-logo-blue400.svg geometry)
function DayforceMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      height={size}
      viewBox="0 0 75 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <mask id="dfm">
          {/* Outer d shape */}
          <circle cx="38" cy="67" r="37" fill="white" />
          <rect x="57" y="0" width="18" height="67" fill="white" />
          {/* Counter — circular hole */}
          <circle cx="38" cy="67" r="19" fill="black" />
          {/* Notch — top-right corner removed from stem */}
          <rect x="64" y="0" width="11" height="22" fill="black" />
        </mask>
      </defs>
      <rect x="0" y="0" width="75" height="100" fill="#3067db" mask="url(#dfm)" />
    </svg>
  )
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // "Overview" (observability) is the primary tab — listed first
  const navItems = [
    { label: 'Overview', path: '/observability', live: true },
    { label: 'Agents',   path: '/' },
  ]

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const isDetailPage = location.pathname.startsWith('/agents/')

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--evr-surface-root)' }}>
      {/* ── Global header — 48px per Everest spec ───────────────────────── */}
      <header
        className="bg-white border-b border-evr-border-decorative sticky top-0 z-40"
        style={{ boxShadow: 'var(--evr-shadow-02)' }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 h-12 flex items-center gap-5">

          {/* Brand lockup: d mark  |  Agent Command Center */}
          <button
            onClick={() => navigate('/observability')}
            className="shrink-0 flex items-center gap-2.5 group"
            aria-label="Agent Command Center home"
          >
            <DayforceMark size={22} />
            <span className="text-evr-border-subtle text-base leading-none select-none">|</span>
            <div className="leading-tight">
              <span className="text-sm font-bold text-evr-text-high tracking-tight group-hover:text-evr-blue-400 transition-colors">
                Agent Command Center
              </span>
            </div>
          </button>

          {/* Feature nav */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2">
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

          {/* Right side: notifications + user */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-evr-sm hover:bg-evr-surface-secondary text-evr-text-default transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-evr-error rounded-full border border-white" />
            </button>
            <button className="flex items-center gap-2 px-2 py-1 rounded-evr-sm hover:bg-evr-surface-secondary transition-colors">
              <div className="w-6 h-6 rounded-full bg-evr-blue-400 flex items-center justify-center text-white text-[10px] font-bold">
                SC
              </div>
              <span className="text-sm font-medium text-evr-text-default hidden sm:block">Sarah Chen</span>
              <ChevronDown size={12} className="text-evr-text-low hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb strip — agent detail only */}
      {isDetailPage && (
        <div className="bg-white border-b border-evr-border-decorative">
          <div className="max-w-screen-2xl mx-auto px-6 h-9 flex items-center gap-2 text-xs text-evr-text-low">
            <button
              onClick={() => navigate('/')}
              className="hover:text-evr-blue-400 transition-colors"
            >
              Agents
            </button>
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
