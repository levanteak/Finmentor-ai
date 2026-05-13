import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { synergyProfileAtom } from '../synergy/store/profileStore'
import { SynergyAPI } from '../synergy/api'
import { getCookieSession, setCookieSession, removeCookieSession } from '../synergy/utils/cookie'

export default function SynergyGuard({ children }) {
  const [profile, setProfile] = useAtom(synergyProfileAtom)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({
    username: import.meta.env.VITE_SYNERGY_DEFAULT_USER || '',
    password: import.meta.env.VITE_SYNERGY_DEFAULT_PASS || ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { tryAutoLogin() }, [])

  const tryAutoLogin = async () => {
    const session = getCookieSession()
    if (!session) { setLoading(false); return }
    try {
      const decoded = atob(session)
      const [username, password] = decoded.split(':')
      const data = await SynergyAPI.authorize(username, password)
      if (data) {
        setProfile({ id: data.id, name: data.name, login: data.login, email: data.email, isAuthenticated: true })
        localStorage.setItem('synergy_email', data.email || data.login)
      } else {
        removeCookieSession()
      }
    } catch {
      removeCookieSession()
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      setCookieSession(loginForm.username, loginForm.password)
      const data = await SynergyAPI.authorize(loginForm.username, loginForm.password)
      if (!data) throw new Error('Неверный логин или пароль')
      setProfile({ id: data.id, name: data.name, login: data.login, email: data.email, isAuthenticated: true })
      localStorage.setItem('synergy_email', data.email || data.login)
    } catch (e) {
      removeCookieSession()
      setError(e.message || 'Ошибка авторизации')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    removeCookieSession()
    setProfile({ id: '', name: '', login: '', isAuthenticated: false })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Проверка сессии Synergy...</div>
      </div>
    )
  }

  if (!profile.isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              fontSize: 28, fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 8
            }}>FinMentor</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Добро пожаловать</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Войдите через корпоративный портал Synergy
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444'
            }}>{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Логин</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))}
                placeholder="username"
                autoComplete="username"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                  border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Пароль</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                  border: '1px solid var(--border)', background: 'var(--card2)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Вхожу...' : 'Войти в Synergy'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
