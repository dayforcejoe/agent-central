import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bot, Search, Bell, ChevronDown, Plus, Settings, LayoutDashboard, HelpCircle } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchValue, setSearchValue] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-6">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-blue-200 transition-shadow">
              <Bot className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <div className="leading-tight">
              <span className="text-slate-900 font-bold text-base tracking-tight">Agent</span>
              <span className="text-blue-600 font-bold text-base tracking-tight">Central</span>
              <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-0.5">Dayforce</div>
            </div>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-slate-400"
              />
            </div>
          </form>

          {/* Nav items */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard size={15} />
              Registry
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 cursor-not-allowed">
              <Settings size={15} />
              Settings
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 cursor-not-allowed">
              <HelpCircle size={15} />
              Docs
            </button>
          </nav>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Notification bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>

            {/* User avatar */}
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                SC
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">Sarah Chen</span>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-nav breadcrumb strip */}
      {location.pathname !== '/' && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-screen-2xl mx-auto px-6 h-10 flex items-center gap-2 text-sm text-slate-500">
            <button onClick={() => navigate('/')} className="hover:text-blue-600 transition-colors">Agent Central</button>
            <span>/</span>
            <span className="text-slate-800 font-medium">Agent Detail</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-screen-2xl mx-auto px-6 h-12 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 Ceridian HCM, Inc. · Agent Central v1.0</span>
          <span>Environment: <strong className="text-emerald-600">Production</strong> · Region: US-East · Build: 20260521</span>
        </div>
      </footer>
    </div>
  )
}

export { Plus }
