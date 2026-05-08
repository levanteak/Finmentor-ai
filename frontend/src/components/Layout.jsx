import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { path: '/',               icon: '📊', label: 'Дашборд' },
  { path: '/documents',      icon: '📄', label: 'Документы' },
  { path: '/finance',        icon: '💰', label: 'Финансы' },
  { path: '/chat',           icon: '🤖', label: 'AI Советник' },
  { path: '/knowledge-base', icon: '📚', label: 'База знаний' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed',
        height: '100vh', zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 22, fontWeight: 800,
            background: 'linear-gradient(135deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>FinMentor</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>AI финансовый советник</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(item => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, textDecoration: 'none',
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted)',
                fontWeight: active ? 600 : 400, fontSize: 14,
                transition: 'all 0.15s'
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>{user?.email}</div>

          <button
            onClick={toggle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
              background: 'var(--card2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 13, transition: 'all 0.2s'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
              {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
            </span>
            <span style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative',
              background: theme === 'dark' ? 'var(--accent)' : 'var(--border2)',
              transition: 'background 0.2s', flexShrink: 0
            }}>
              <span style={{
                position: 'absolute', top: 3, left: theme === 'dark' ? 18 : 3,
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </span>
          </button>

          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', textAlign: 'left', padding: '8px 0', fontSize: 13 }}>
            Выйти →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
