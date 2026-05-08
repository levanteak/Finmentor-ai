import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 30% 50%, #1e3a5f20, transparent 60%), var(--bg)'
      }}>
        <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontSize: 32, fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8
            }}>FinMentor</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Войдите в свой аккаунт</div>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Email</label>
                <input type="email" placeholder="you@example.com" value={form.email}
                       onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="label">Пароль</label>
                <input type="password" placeholder="••••••" value={form.password}
                       onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
            Нет аккаунта?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Зарегистрироваться</Link>
          </div>
        </div>
      </div>
  )
}
