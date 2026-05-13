import { useState, useEffect } from 'react'
import client from '../api/client'
import { useToast } from '../context/ToastContext'

const EMPLOYMENT_OPTIONS = [
  { value: 'FREELANCE', label: 'Фриланс / Самозанятый' },
  { value: 'GPH',       label: 'ГПХ (Договор подряда)' },
  { value: 'IP_SIMPLIFIED', label: 'ИП (Упрощённая)' },
]

const fmt = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n || 0)) + ' ₸'

export default function Finance() {
  const toast = useToast()
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({
    amount: '',
    description: '',
    incomeDate: new Date().toISOString().slice(0, 10),
    employmentType: 'FREELANCE'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/finance/income').then(r => setRecords(r.data)).catch(() => toast('Не удалось загрузить доходы'))
  }, [])

  const handleAmountChange = val => {
    setForm(p => ({ ...p, amount: val }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/finance/income', {
        ...form,
        amount: parseFloat(form.amount)
      })
      setRecords(p => [res.data, ...p])
      setForm(p => ({ ...p, amount: '', description: '' }))
    } catch {
      setError('Ошибка добавления дохода')
      toast('Не удалось сохранить доход')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title">💰 Финансы и налоги</div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        {/* Form */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Добавить доход</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Сумма (тенге)</label>
                <input type="number" placeholder="380000" value={form.amount}
                  onChange={e => handleAmountChange(e.target.value)} required min="1" />
              </div>
              <div className="form-group">
                <label className="label">Описание</label>
                <input placeholder="Проект, клиент..." value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Дата</label>
                <input type="date" value={form.incomeDate}
                  onChange={e => setForm(p => ({ ...p, incomeDate: e.target.value }))} required />
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
                {loading ? 'Сохраняем...' : 'Добавить'}
              </button>
            </form>
          </div>

          {/* Tax Preview */}
          {form.amount && (
            <TaxPreview amount={parseFloat(form.amount)} type={form.employmentType} date={form.incomeDate} />
          )}
        </div>

        {/* History */}
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>История доходов</div>
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Доходов пока нет. Добавьте первый!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 120px',
                fontSize: 11, color: 'var(--muted)', padding: '6px 12px', fontWeight: 600
              }}>
                <span>Описание</span><span>Дата</span><span>Доход</span><span>Налог</span><span>Дедлайн</span>
              </div>
              {records.map(r => (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 120px',
                  fontSize: 13, padding: '12px', borderRadius: 8,
                  background: 'var(--card2)', marginBottom: 4
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.description || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {EMPLOYMENT_OPTIONS.find(o => o.value === r.employmentType)?.label}
                    </div>
                  </div>
                  <div style={{ color: 'var(--muted)' }}>{r.incomeDate}</div>
                  <div style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(r.amount)}</div>
                  <div style={{ color: 'var(--red)' }}>{fmt(r.totalTax)}</div>
                  <div style={{ color: 'var(--yellow)', fontSize: 12 }}>{r.taxDeadline}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaxPreview({ amount, type, date }) {
  const rates = {
    GPH: { ipn: amount * 0.9 * 0.1, opv: amount * 0.1, label: 'ГПХ' },
    IP_SIMPLIFIED: { ipn: amount * 0.03, opv: amount * 0.1, label: 'ИП' },
    FREELANCE: { ipn: amount * 0.9 * 0.1, opv: amount * 0.1, label: 'Фриланс' },
  }
  const r = rates[type] || rates.FREELANCE
  const total = r.ipn + r.opv
  const net = amount - total

  return (
    <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>
        Предварительный расчёт налогов
      </div>
      {[
        { label: 'Валовый доход', value: amount, color: 'var(--text)' },
        { label: 'ИПН', value: -r.ipn, color: 'var(--red)' },
        { label: 'ОПВ (пенсионные)', value: -r.opv, color: 'var(--red)' },
        { label: 'Чистый доход', value: net, color: 'var(--green)', bold: true },
      ].map(row => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: row.bold ? 15 : 13, fontWeight: row.bold ? 700 : 400,
          color: row.color, marginBottom: 6,
          borderTop: row.bold ? '1px solid var(--border)' : 'none',
          paddingTop: row.bold ? 8 : 0
        }}>
          <span>{row.label}</span>
          <span>{Math.abs(row.value) < 1 ? '—' : (row.value < 0 ? '-' : '') + new Intl.NumberFormat('ru-KZ').format(Math.round(Math.abs(row.value))) + ' ₸'}</span>
        </div>
      ))}
    </div>
  )
}
