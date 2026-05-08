import { useState, useEffect, useRef } from 'react'
import client from '../api/client'

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [selected, setSelected] = useState(null)
  const [uploadStep, setUploadStep] = useState(null)
  const [error, setError] = useState('')
  const [criteriaModal, setCriteriaModal] = useState(null)
  const [matchingTemplate, setMatchingTemplate] = useState(false)
  const [templateSelectorModal, setTemplateSelectorModal] = useState(null)
  const [templates, setTemplates] = useState([])
  const fileRef = useRef()
  const stepTimers = useRef([])

  useEffect(() => {
    client.get('/documents').then(r => setDocs(r.data)).catch(() => {})
    client.get('/templates').then(r => setTemplates(r.data)).catch(() => {})
  }, [])

  const STEPS = [
    { key: 'extract', label: '📄 Извлекаем текст из документа...' },
    { key: 'analyze', label: '🧠 AI анализирует условия договора...' },
    { key: 'metadata', label: '🗂️ Извлекаем метаданные договора...' },
    { key: 'index',   label: '🔍 Индексируем чанки для RAG поиска...' },
  ]

  const handleUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setError('Поддерживаются только PDF и DOCX файлы')
      return
    }
    setError('')

    setUploadStep(0)
    stepTimers.current.push(setTimeout(() => setUploadStep(1), 2000))
    stepTimers.current.push(setTimeout(() => setUploadStep(2), 5000))
    stepTimers.current.push(setTimeout(() => setUploadStep(3), 8000))

    const form = new FormData()
    form.append('file', file)
    try {
      const res = await client.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDocs(p => [res.data, ...p])
      setSelected(res.data)
    } catch {
      setError('Ошибка загрузки. Проверьте размер файла (макс. 15MB)')
    } finally {
      stepTimers.current.forEach(clearTimeout)
      stepTimers.current = []
      setUploadStep(null)
      fileRef.current.value = ''
    }
  }

  const parseJson = json => {
    try { return JSON.parse(json) } catch { return null }
  }

  const handleAnalyzeWithTemplate = async (doc, templateId) => {
    setTemplateSelectorModal(null)
    setMatchingTemplate(true)
    try {
      const r = await client.post(`/templates/documents/${doc.id}/analyze-criteria`, { templateId })
      setCriteriaModal({ docName: doc.originalFilename, values: r.data })
    } catch (e) {
      const msg = e?.response?.data?.message || 'Ошибка при анализе документа'
      alert(msg)
    } finally {
      setMatchingTemplate(false)
    }
  }

  const handleLoadExistingCriteria = async (doc) => {
    if (matchingTemplate) return
    setMatchingTemplate(true)
    try {
      const r = await client.get(`/templates/documents/${doc.id}/criteria-values`)
      if (r.data.length > 0) {
        setCriteriaModal({ docName: doc.originalFilename, values: r.data })
        return
      }
    } catch {
      // fall through to selector
    } finally {
      setMatchingTemplate(false)
    }
    setTemplateSelectorModal({ doc })
  }

  const uploading = uploadStep !== null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="page-title" style={{ margin: 0 }}>📄 Анализ документов</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            PDF и DOCX — метаданные, анализ рисков, RAG поиск в чате
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleUpload} />
          <button className="btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}>
            {uploading ? '⏳ Обрабатывается...' : '+ Загрузить PDF / DOCX'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)',
          borderRadius: 10, padding: '10px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 16
        }}>{error}</div>
      )}

      {uploading && (
        <div className="card" style={{ marginBottom: 16, padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEPS.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i < uploadStep ? 'var(--green)' : i === uploadStep ? 'var(--accent)' : 'var(--card2)',
                  border: `2px solid ${i < uploadStep ? 'var(--green)' : i === uploadStep ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
                }}>
                  {i < uploadStep ? '✓' : i === uploadStep ? <SpinDot /> : ''}
                </div>
                <span style={{
                  fontSize: 13,
                  color: i <= uploadStep ? 'var(--text)' : 'var(--muted)',
                  fontWeight: i === uploadStep ? 600 : 400
                }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: docs.length > 0 ? '280px 1fr' : '1fr', gap: 16 }}>
        {docs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{
                background: selected?.id === d.id ? 'rgba(59,130,246,0.1)' : 'var(--card)',
                border: `1px solid ${selected?.id === d.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, wordBreak: 'break-word' }}>
                  {d.originalFilename}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.uploadedAt?.slice(0, 10)}</span>
                  {d.analyzed && (
                    <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 7px' }}>RAG ✓</span>
                  )}
                  {d.metadataJson && (
                    <span className="badge" style={{
                      fontSize: 10, padding: '2px 7px',
                      background: 'rgba(16,185,129,0.15)', color: 'var(--green)',
                      border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6
                    }}>Метаданные ✓</span>
                  )}
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 8, padding: '12px 14px', background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                💡 Как использовать
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                Загрузи договор (PDF/DOCX) — AI извлечёт метаданные и проиндексирует для RAG.
                Затем спроси в чате: «Что написано про штрафы?»
              </div>
            </div>
          </div>
        )}

        {selected ? (
          <DocView
            doc={selected}
            parseJson={parseJson}
            onCheckTemplate={() => handleLoadExistingCriteria(selected)}
            matchingTemplate={matchingTemplate}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Загрузите договор</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 360, margin: '0 auto' }}>
              AI извлечёт все метаданные (стороны, суммы, сроки, условия),
              проанализирует риски и сделает документ доступным для поиска в чате
            </div>
          </div>
        )}
      </div>

      {criteriaModal && (
        <CriteriaModal
          modal={criteriaModal}
          onClose={() => setCriteriaModal(null)}
          onReanalyze={() => { setCriteriaModal(null); setTemplateSelectorModal({ doc: selected }) }}
        />
      )}

      {templateSelectorModal && (
        <TemplateSelectorModal
          modal={templateSelectorModal}
          templates={templates}
          onSelect={handleAnalyzeWithTemplate}
          onClose={() => setTemplateSelectorModal(null)}
        />
      )}
    </div>
  )
}

function SpinDot() {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: 'var(--accent)',
      animation: 'pulse 1s infinite'
    }} />
  )
}

function DocView({ doc, parseJson, onCheckTemplate, matchingTemplate }) {
  const [tab, setTab] = useState('metadata')
  const analysis = parseJson(doc.analysisJson)
  const metadata = parseJson(doc.metadataJson)

  const hasMetadata = metadata && Object.keys(metadata).length > 0
  const hasAnalysis = !!analysis

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)', paddingBottom: 0
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasMetadata && (
            <TabBtn active={tab === 'metadata'} onClick={() => setTab('metadata')}>
              Метаданные
            </TabBtn>
          )}
          {hasAnalysis && (
            <TabBtn active={tab === 'analysis'} onClick={() => setTab('analysis')}>
              Анализ рисков
            </TabBtn>
          )}
        </div>
        <button
          onClick={onCheckTemplate}
          disabled={matchingTemplate}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            color: 'var(--accent)', fontWeight: 600, marginBottom: 2,
            opacity: matchingTemplate ? 0.6 : 1
          }}
        >
          {matchingTemplate ? '⏳ Ищу шаблон...' : '🔍 Проверить по шаблону'}
        </button>
      </div>

      {tab === 'metadata' && hasMetadata && <MetadataView metadata={metadata} doc={doc} />}
      {tab === 'analysis' && hasAnalysis && <AnalysisView analysis={analysis} doc={doc} />}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? 'var(--accent)' : 'var(--muted)',
      background: 'none', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s'
    }}>{children}</button>
  )
}

function MetadataView({ metadata, doc }) {
  const field = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null
    return (
      <div key={label} style={{
        display: 'flex', gap: 12, padding: '10px 0',
        borderBottom: '1px solid var(--border)', alignItems: 'flex-start'
      }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', minWidth: 160, flexShrink: 0, paddingTop: 1 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, flex: 1 }}>
          {Array.isArray(value)
            ? <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {value.map((v, i) => <li key={i} style={{ lineHeight: 1.5 }}>{v}</li>)}
              </ul>
            : value
          }
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>{doc.originalFilename}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{metadata.contractType || 'Договор'}</div>
          </div>
          {metadata.contractNumber && (
            <div style={{
              padding: '6px 14px', background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: 'var(--accent)'
            }}>{metadata.contractNumber}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {metadata.totalAmount && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Сумма договора</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{metadata.totalAmount}</div>
            </div>
          )}
          {metadata.contractDate && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Дата заключения</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{metadata.contractDate}</div>
            </div>
          )}
          {metadata.validUntil && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Срок действия до</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{metadata.validUntil}</div>
            </div>
          )}
          {metadata.documentLanguage && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Язык</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{metadata.documentLanguage}</div>
            </div>
          )}
        </div>

        {metadata.subject && (
          <div style={{
            padding: '10px 14px', background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8,
            fontSize: 13, color: 'var(--text2)', lineHeight: 1.6
          }}>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Предмет: </span>
            {metadata.subject}
          </div>
        )}
      </div>

      {metadata.parties?.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Стороны договора</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {metadata.parties.map((party, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px' }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8
                }}>{party.role}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{party.name || '—'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {party.bin_iin && <MetaRow label="БИН/ИИН" value={party.bin_iin} />}
                  {party.address && <MetaRow label="Адрес" value={party.address} />}
                  {party.iban && <MetaRow label="IBAN" value={party.iban} mono />}
                  {party.bik && <MetaRow label="БИК" value={party.bik} mono />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Детали договора</div>
        {field('Применимое право', metadata.governingLaw)}
        {field('Разрешение споров', metadata.disputeResolution)}
        {field('Условия расторжения', metadata.terminationConditions)}
        {field('Особые условия', metadata.specialConditions)}
        {field('Подписанты', metadata.signatories)}
      </div>

      <div style={{
        padding: '10px 14px', background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
        fontSize: 12, color: 'var(--accent)'
      }}>
        🔍 Документ проиндексирован — спроси о нём в AI чате
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--muted)', minWidth: 60 }}>{label}</span>
      <span style={{
        color: 'var(--text2)', fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 11 : 12, wordBreak: 'break-all'
      }}>{value}</span>
    </div>
  )
}

function AnalysisView({ analysis, doc }) {
  const recColor = {
    SIGN: 'var(--green)',
    DONT_SIGN: 'var(--red)',
    NEGOTIATE: 'var(--yellow)'
  }
  const recLabel = {
    SIGN: '✅ Можно подписать',
    DONT_SIGN: '❌ Не подписывать',
    NEGOTIATE: '⚠️ Требует переговоров'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ borderTop: `3px solid ${recColor[analysis.recommendation] || 'var(--accent)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{doc.originalFilename}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: recColor[analysis.recommendation] }}>
              {recLabel[analysis.recommendation] || analysis.recommendation}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Реальная ставка</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{analysis.realAnnualRate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Рекламируемая</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--muted)' }}>{analysis.advertisedRate}</div>
            </div>
          </div>
        </div>
        <hr className="divider" />
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{analysis.summary}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <FlagSection title="🚩 Красные флаги" items={analysis.redFlags} color="var(--red)" />
        <FlagSection title="💸 Скрытые комиссии" items={analysis.hiddenFees} color="var(--yellow)" />
        <FlagSection title="⚠️ Штрафы и пени" items={analysis.penalties} color="var(--purple)" />
      </div>

      {analysis.monthlyPayment && analysis.monthlyPayment !== 'Не указан' && (
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Ежемесячный платёж</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{analysis.monthlyPayment}</div>
        </div>
      )}
    </div>
  )
}

function FlagSection({ title, items, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color }}>{title}</div>
      {items?.length > 0 ? (
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Не найдено</div>
      )}
    </div>
  )
}

function TemplateSelectorModal({ modal, templates, onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 480,
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Выберите тип договора</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {modal.doc.originalFilename}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: 'var(--muted)', lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
              Нет типов договоров.<br />Добавьте их в разделе «База знаний».
            </div>
          ) : templates.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(modal.doc, t.id)}
              style={{
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: 'var(--card2)', border: '1px solid var(--border)',
                color: 'var(--text)', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.contractType}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {t.criteria?.filter(c => c.criteriaType === 'MANDATORY').length || 0} обязательных ·{' '}
                {t.criteria?.filter(c => c.criteriaType === 'ADDITIONAL').length || 0} дополнительных
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            background: 'none', border: '1px solid var(--border)', color: 'var(--muted)'
          }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

function CriteriaModal({ modal, onClose, onReanalyze }) {
  const [values, setValues] = useState(modal.values.map(v => ({
    ...v,
    current: v.editedValue ?? v.extractedValue ?? ''
  })))
  const [saving, setSaving] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  const mandatory = values.filter(v => v.criteriaType === 'MANDATORY' && !v.autoDiscovered)
  const additional = values.filter(v => v.criteriaType === 'ADDITIONAL' && !v.autoDiscovered)
  const discovered = values.filter(v => v.autoDiscovered)

  const updateValue = (id, val) => {
    setValues(prev => prev.map(v => v.id === id ? { ...v, current: val } : v))
  }

  const saveValue = async (item) => {
    setSaving(item.id)
    try {
      await client.put(`/templates/criteria-values/${item.id}`, { editedValue: item.current })
      setSavedIds(prev => new Set([...prev, item.id]))
    } catch {
      alert('Ошибка при сохранении')
    } finally {
      setSaving(null)
    }
  }

  const saveAll = async () => {
    for (const item of values) {
      if (!savedIds.has(item.id)) {
        await saveValue(item)
      }
    }
  }

  const templateName = modal.values[0]?.templateName || 'Шаблон'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Критерии по шаблону</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {templateName} · {modal.docName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onReanalyze} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              color: 'var(--accent)'
            }}>
              Другой тип
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              color: 'var(--muted)', lineHeight: 1
            }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {mandatory.length > 0 && (
            <CriteriaGroup
              title="Обязательные критерии"
              accent="var(--red)"
              items={mandatory}
              saving={saving}
              savedIds={savedIds}
              onUpdate={updateValue}
              onSave={saveValue}
            />
          )}
          {additional.length > 0 && (
            <CriteriaGroup
              title="Дополнительные критерии"
              accent="var(--accent)"
              items={additional}
              saving={saving}
              savedIds={savedIds}
              onUpdate={updateValue}
              onSave={saveValue}
              style={{ marginTop: mandatory.length > 0 ? 24 : 0 }}
            />
          )}
          {discovered.length > 0 && (
            <CriteriaGroup
              title="Доп. поля из документа (авто)"
              accent="var(--purple, #a855f7)"
              items={discovered}
              saving={saving}
              savedIds={savedIds}
              onUpdate={updateValue}
              onSave={saveValue}
              style={{ marginTop: (mandatory.length > 0 || additional.length > 0) ? 24 : 0 }}
            />
          )}
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 12, justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            background: 'none', border: '1px solid var(--border)', color: 'var(--muted)'
          }}>
            Закрыть
          </button>
          <button onClick={saveAll} className="btn-primary" style={{ minWidth: 140 }}>
            Сохранить всё
          </button>
        </div>
      </div>
    </div>
  )
}

function CriteriaGroup({ title, accent, items, saving, savedIds, onUpdate, onSave, style }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 13, fontWeight: 600, color: accent, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--card2)', border: '1px solid var(--border)'
          }}>
            <div style={{
              fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 500
            }}>
              {item.criteriaLabel}
              {savedIds.has(item.id) && (
                <span style={{ marginLeft: 8, color: 'var(--green)', fontSize: 11 }}>✓ сохранено</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <textarea
                value={item.current}
                onChange={e => onUpdate(item.id, e.target.value)}
                rows={2}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 7, resize: 'vertical',
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit'
                }}
              />
              <button
                onClick={() => onSave(item)}
                disabled={saving === item.id}
                style={{
                  padding: '8px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                  background: savedIds.has(item.id) ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                  border: `1px solid ${savedIds.has(item.id) ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                  color: savedIds.has(item.id) ? 'var(--green)' : 'var(--accent)',
                  whiteSpace: 'nowrap', opacity: saving === item.id ? 0.6 : 1
                }}
              >
                {saving === item.id ? '...' : savedIds.has(item.id) ? '✓' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
