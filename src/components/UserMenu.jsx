import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const btnStyle = {
    position: 'fixed',
    top: '0.85rem',
    left: '1rem',
    zIndex: 200,
    background: 'var(--card)',
    border: '1.5px solid var(--border)',
    borderRadius: '50%',
    width: 40,
    height: 40,
    fontSize: '1.1rem',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }

  if (!user) {
    return (
      <button
        onClick={() => navigate('/login')}
        title="Accedi"
        style={btnStyle}
        aria-label="Accedi"
      >
        👤
      </button>
    )
  }

  const shortEmail = user.email.length > 18
    ? user.email.slice(0, 15) + '…'
    : user.email

  return (
    <div ref={menuRef} style={{ position: 'fixed', top: '0.85rem', left: '1rem', zIndex: 200 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={user.email}
        style={{ ...btnStyle, position: 'static', background: 'var(--primary)', borderColor: 'var(--primary)' }}
        aria-label="Menu utente"
      >
        <span style={{ color: '#fff', fontSize: '1rem' }}>👤</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '2.75rem',
          left: 0,
          background: 'var(--card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: 200,
          padding: '0.5rem 0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '0.5rem 1rem 0.75rem',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            {shortEmail}
          </div>
          <button
            onClick={async () => { setOpen(false); await signOut() }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.6rem 1rem',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: 'var(--error)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Esci
          </button>
        </div>
      )}
    </div>
  )
}
