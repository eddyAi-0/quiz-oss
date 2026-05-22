import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!isLogin && password !== confirm) {
      setError('Le password non corrispondono.')
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await signIn(email, password)
        navigate('/')
      } else {
        await signUp(email, password)
        setSuccessMsg('Registrazione avvenuta! Controlla la tua email per confermare l\'account.')
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'var(--bg)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        padding: '2rem',
        border: '1.5px solid var(--border)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.5rem' }}>
          Quiz OSS
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
          {isLogin ? 'Accedi al tuo account' : 'Crea un account'}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setSuccessMsg('') }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)',
              background: isLogin ? 'var(--primary)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setSuccessMsg('') }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)',
              background: !isLogin ? 'var(--primary)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Registrati
          </button>
        </div>

        {successMsg && (
          <div style={{
            background: 'var(--success-light)',
            border: '1.5px solid var(--success-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: 'var(--success)',
            fontSize: '0.875rem'
          }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--error-light)',
            border: '1.5px solid var(--error-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            marginBottom: '1rem',
            color: 'var(--error)',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nome@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="Minimo 6 caratteri"
              style={inputStyle}
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Conferma password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Ripeti la password"
                style={inputStyle}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.25rem'
            }}
          >
            {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Crea account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Continua come ospite
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '1rem',
  outline: 'none'
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email o password errati.'
  if (msg.includes('Email not confirmed')) return 'Conferma la tua email prima di accedere.'
  if (msg.includes('User already registered')) return 'Questa email è già registrata.'
  if (msg.includes('Password should be at least')) return 'La password deve essere di almeno 6 caratteri.'
  if (msg.includes('Unable to validate email')) return 'Indirizzo email non valido.'
  return msg
}
