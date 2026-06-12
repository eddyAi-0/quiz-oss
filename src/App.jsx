import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'

function SyncStatus() {
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    let timer = null
    function handler(e) {
      if (e.detail.pending > 0) {
        setStatus('syncing')
      } else if (e.detail.error) {
        setStatus('error')
        clearTimeout(timer)
        timer = setTimeout(() => setStatus('idle'), 5000)
      } else {
        setStatus('idle')
      }
    }
    window.addEventListener('quiz-sync', handler)
    return () => { window.removeEventListener('quiz-sync', handler); clearTimeout(timer) }
  }, [])

  if (status === 'idle') return null

  return (
    <span
      title={status === 'error' ? 'Sincronizzazione fallita — dati salvati in locale' : 'Sincronizzazione in corso...'}
      onClick={status === 'error' ? () => setStatus('idle') : undefined}
      style={{
        position: 'fixed',
        top: '1.1rem',
        left: '3.75rem',
        zIndex: 200,
        fontSize: '0.85rem',
        cursor: status === 'error' ? 'pointer' : 'default',
        color: status === 'error' ? 'var(--warning)' : 'var(--text-muted)'
      }}
    >
      {status === 'error' ? <IconAlert size={15} /> : <IconLoader size={15} className="spin" />}
    </span>
  )
}
import { Navigate } from 'react-router-dom'
import Home from './components/Home'
import Quiz from './components/Quiz'
import SimulationMode from './components/SimulationMode'
import ProvaOrale from './components/ProvaOrale'
import OraliSvolte from './components/OraliSvolte'
import Dashboard from './components/Dashboard'
import TutorAI from './components/TutorAI'
import ErrorBoundary from './components/ErrorBoundary'
import AuthPage from './components/AuthPage'
import UserMenu from './components/UserMenu'
import { IconHome, IconPratica, IconOrale, IconProgressi, IconTutor, IconSun, IconMoon, IconLoader, IconAlert } from './components/icons'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

const NAV = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/quiz', label: 'Quiz', Icon: IconPratica },
  { to: '/orale', label: 'Orale', Icon: IconOrale },
  { to: '/progressi', label: 'Progressi', Icon: IconProgressi },
  { to: '/tutor', label: 'Tutor', Icon: IconTutor },
]

function AppContent({ dark, setDark }) {
  const { user } = useAuth()
  const [navHidden, setNavHidden] = useState(false)

  // Nasconde la bottom-nav scorrendo verso il basso, la rimostra scorrendo su
  useEffect(() => {
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (y > last + 4 && y > 60) setNavHidden(true)
      else if (y < last - 4) setNavHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="app-container">
      <UserMenu />
      <SyncStatus />

      <button
        onClick={() => setDark(d => !d)}
        title={dark ? 'Modalità chiara' : 'Modalità notturna'}
        style={{
          position: 'fixed',
          top: '0.85rem',
          right: '1rem',
          zIndex: 200,
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          borderRadius: '50%',
          width: 40,
          height: 40,
          fontSize: '1.2rem',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
      </button>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/quiz" element={<RequireAuth><Quiz /></RequireAuth>} />
          <Route path="/simulazione" element={<RequireAuth><SimulationMode /></RequireAuth>} />
          <Route path="/orale" element={<RequireAuth><ProvaOrale /></RequireAuth>} />
          <Route path="/orale/svolte" element={<RequireAuth><OraliSvolte /></RequireAuth>} />
          <Route path="/progressi" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/tutor" element={<RequireAuth><TutorAI /></RequireAuth>} />
          <Route path="/tutor/:sezione" element={<RequireAuth><TutorAI /></RequireAuth>} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </ErrorBoundary>

      {user && (
        <nav className={`bottom-nav${navHidden ? ' bottom-nav--hidden' : ''}`}>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon"><Icon size={24} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <AuthProvider>
      <AppContent dark={dark} setDark={setDark} />
    </AuthProvider>
  )
}
