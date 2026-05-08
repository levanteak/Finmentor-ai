import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const EMPLOYMENT_OPTIONS = [
  { value: 'FREELANCE', label: 'Фриланс / Самозанятый' },
  { value: 'GPH',       label: 'ГПХ (Договор подряда)' },
  { value: 'IP_SIMPLIFIED', label: 'ИП (Упрощённая декларация)' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', employmentType: 'FREELANCE'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 70% 30%, #06403b20, transparent 60%), var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 32, fontWeight: 800,
            background: 'linear-gradient(135deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8
          }}>FinMentor</div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Создайте аккаунт</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Имя</label>
              <input placeholder="Ваше имя" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Пароль</label>
              <input type="password" placeholder="Минимум 6 символов" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="label">Тип занятости</label>
              <select value={form.employmentType}
                onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))}>
                {EMPLOYMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Войти</Link>
        </div>
      </div>
    </div>
  )
}
