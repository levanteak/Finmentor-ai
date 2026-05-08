import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const fmt = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n || 0)) + ' ₸'

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState({ totalIncome: 0, totalTax: 0, netIncome: 0 })
  const [income, setIncome] = useState([])
  const [docs, setDocs] = useState([])

  useEffect(() => {
    client.get('/finance/summary').then(r => setSummary(r.data)).catch(() => {})
    client.get('/finance/income').then(r => setIncome(r.data.slice(0, 6))).catch(() => {})
    client.get('/documents').then(r => setDocs(r.data.slice(0, 5))).catch(() => {})
  }, [])

  const chartData = income.map(r => ({
    date: r.incomeDate,
    Доход: r.amount,
    Налог: r.totalTax
  })).reverse()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Привет, {user?.name} 👋</div>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Вот твой финансовый обзор</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Общий доход', value: fmt(summary.totalIncome), color: 'var(--green)', icon: '💰' },
          { label: 'Налоги', value: fmt(summary.totalTax), color: 'var(--red)', icon: '🧾' },
          { label: 'Чистый доход', value: fmt(summary.netIncome), color: 'var(--accent)', icon: '✨' },
        ].map(s => (
          <div key={s.label} className="card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Chart */}
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Доходы и налоги</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="Доход" fill="var(--accent)" radius={[4,4,0,0]} />
                <Bar dataKey="Налог" fill="var(--red)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              Добавь доходы чтобы увидеть график
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Быстрые действия</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/documents', label: '📄 Загрузить договор', desc: 'AI анализ + RAG индексация' },
                { to: '/finance', label: '💰 Добавить доход', desc: 'Расчёт ИПН и ОПВ' },
                { to: '/chat', label: '🤖 Спросить AI', desc: 'Ищет по документам автоматически' },
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--card2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                    transition: 'border-color 0.15s'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RAG Status */}
      <div className="card" style={{
        marginBottom: 16,
        borderLeft: `3px solid ${docs.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
        padding: '16px 20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              🔍 RAG база знаний
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {docs.length === 0
                ? 'Загрузи договор — AI сможет отвечать на вопросы по его содержимому'
                : `${docs.length} ${docs.length === 1 ? 'документ проиндексирован' : 'документа проиндексировано'} — спроси AI о содержимом`}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20, flexShrink: 0,
            background: docs.length > 0 ? 'rgba(59,130,246,0.1)' : 'var(--card2)',
            border: `1px solid ${docs.length > 0 ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: docs.length > 0 ? 'var(--green)' : 'var(--muted)'
            }} />
            <span style={{ fontSize: 12, color: docs.length > 0 ? 'var(--accent)' : 'var(--muted)', fontWeight: 500 }}>
              {docs.length > 0 ? 'Активен' : 'Нет данных'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent docs */}
      {docs.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Последние документы</div>
          {docs.map(d => (
            <div key={d.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{d.originalFilename}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.uploadedAt?.slice(0, 10)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-green">Проанализирован</span>
                {d.analyzed && <span className="badge badge-blue">RAG ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
