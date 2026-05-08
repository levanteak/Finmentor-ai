import { useState, useEffect } from 'react'
import client from '../api/client'

export default function KnowledgeBase() {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit'

  const [contractType, setContractType] = useState('')
  const [mandatory, setMandatory] = useState([''])
  const [additional, setAdditional] = useState([''])
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    try {
      const r = await client.get('/templates')
      setTemplates(r.data)
    } catch {}
  }

  const openCreate = () => {
    setSelected(null)
    setContractType('')
    setMandatory([''])
    setAdditional([''])
    setSaveResult(null)
    setMode('create')
  }

  const openEdit = (template) => {
    setSelected(template)
    setContractType(template.contractType)
    const man = template.criteria?.filter(c => c.criteriaType === 'MANDATORY').map(c => c.label) || []
    const add = template.criteria?.filter(c => c.criteriaType === 'ADDITIONAL').map(c => c.label) || []
    setMandatory(man.length > 0 ? man : [''])
    setAdditional(add.length > 0 ? add : [''])
    setSaveResult(null)
    setMode('edit')
  }

  const handleSave = async () => {
    const allCriteria = [
      ...mandatory.filter(l => l.trim()).map(label => ({ label: label.trim(), type: 'MANDATORY' })),
      ...additional.filter(l => l.trim()).map(label => ({ label: label.trim(), type: 'ADDITIONAL' })),
    ]
    if (!contractType.trim()) { alert('Укажите тип договора'); return }
    if (allCriteria.length === 0) { alert('Добавьте хотя бы один критерий'); return }

    setSaving(true)
    setSaveResult(null)
    try {
      const payload = { contractType: contractType.trim(), criteria: allCriteria }
      if (mode === 'create') {
        await client.post('/templates', payload)
        setSaveResult({ success: true, msg: 'Тип договора создан' })
      } else {
        await client.put(`/templates/${selected.id}`, payload)
        setSaveResult({ success: true, msg: 'Тип договора обновлён' })
      }
      await loadTemplates()
      setTimeout(() => setMode('list'), 1200)
    } catch {
      setSaveResult({ success: false, msg: 'Ошибка при сохранении' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template, e) => {
    e.stopPropagation()
    if (!confirm(`Удалить тип договора "${template.contractType}"?`)) return
    try {
      await client.delete(`/templates/${template.id}`)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
      if (selected?.id === template.id) setMode('list')
    } catch {}
  }

  const addItem = (list, setList) => setList([...list, ''])
  const updateItem = (list, setList, idx, val) => {
    const next = [...list]; next[idx] = val; setList(next)
  }
  const removeItem = (list, setList, idx) => {
    if (list.length === 1) return
    setList(list.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="page-title" style={{ margin: 0 }}>База знаний</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Справочник типов договоров и критериев для анализа документов
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Добавить тип</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)', fontSize: 14 }}>
              Нет типов договоров.<br />Добавьте первый.
            </div>
          ) : templates.map(t => (
            <div
              key={t.id}
              onClick={() => openEdit(t)}
              style={{
                background: selected?.id === t.id ? 'rgba(59,130,246,0.1)' : 'var(--card)',
                border: `1px solid ${selected?.id === t.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, wordBreak: 'break-word' }}>
                  {t.contractType}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {t.criteria?.length || 0} критериев
                </div>
              </div>
              <button
                onClick={e => handleDelete(t, e)}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', padding: '4px 8px', borderRadius: 6,
                  fontSize: 11, cursor: 'pointer', flexShrink: 0, lineHeight: 1.4
                }}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>

        {mode === 'list' ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Выберите тип или создайте новый</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Типы договоров используются при анализе реальных документов
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              {mode === 'create' ? 'Новый тип договора' : `Редактировать: ${selected?.contractType}`}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Тип договора <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={contractType}
                onChange={e => setContractType(e.target.value)}
                placeholder="Например: ДОГОВОР ПОДРЯДА"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                  border: '1px solid var(--border)', background: 'var(--card2)',
                  color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <CriteriaSection
                title="Обязательные критерии"
                accent="var(--red)"
                items={mandatory}
                onChange={(idx, val) => updateItem(mandatory, setMandatory, idx, val)}
                onAdd={() => addItem(mandatory, setMandatory)}
                onRemove={idx => removeItem(mandatory, setMandatory, idx)}
              />
              <CriteriaSection
                title="Дополнительные критерии"
                accent="var(--accent)"
                items={additional}
                onChange={(idx, val) => updateItem(additional, setAdditional, idx, val)}
                onAdd={() => addItem(additional, setAdditional)}
                onRemove={idx => removeItem(additional, setAdditional, idx)}
              />
            </div>

            {saveResult && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: saveResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: saveResult.success ? 'var(--green)' : '#ef4444',
                border: `1px solid ${saveResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`
              }}>
                {saveResult.success ? '✅ ' : '❌ '}{saveResult.msg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 140 }}>
                {saving ? 'Сохраняю...' : mode === 'create' ? 'Создать' : 'Сохранить'}
              </button>
              <button
                onClick={() => setMode('list')}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                  background: 'none', border: '1px solid var(--border)', color: 'var(--muted)'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CriteriaSection({ title, accent, items, onChange, onAdd, onRemove }) {
  return (
    <div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: accent,
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={item}
              onChange={e => onChange(idx, e.target.value)}
              placeholder={`Критерий ${idx + 1}...`}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--card2)',
                color: 'var(--text)', fontSize: 13, outline: 'none'
              }}
            />
            <button
              onClick={() => onRemove(idx)}
              disabled={items.length === 1}
              style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: items.length === 1 ? 0.4 : 1
              }}
            >×</button>
          </div>
        ))}
        <button
          onClick={onAdd}
          style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'none', border: `1px dashed ${accent}`,
            color: accent, textAlign: 'left', marginTop: 4
          }}
        >
          + Добавить критерий
        </button>
      </div>
    </div>
  )
}
