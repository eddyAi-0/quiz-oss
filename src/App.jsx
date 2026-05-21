import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Quiz from './components/Quiz'
import SimulationMode from './components/SimulationMode'
import Dashboard from './components/Dashboard'
import TutorAI from './components/TutorAI'

const NAV = [
  { to: '/', label: 'Quiz', icon: '📚' },
  { to: '/simulazione', label: 'Simulazione', icon: '⏱️' },
  { to: '/progressi', label: 'Progressi', icon: '📊' },
  { to: '/tutor', label: 'Tutor AI', icon: '🤖' },
]

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="app-container">
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
        {dark ? '☀️' : '🌙'}
      </button>

      <Routes>
        <Route path="/" element={<Quiz />} />
        <Route path="/simulazione" element={<SimulationMode />} />
        <Route path="/progressi" element={<Dashboard />} />
        <Route path="/tutor" element={<TutorAI />} />
        <Route path="/tutor/:sezione" element={<TutorAI />} />
      </Routes>

      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
