import { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const SUGGESTIONS = [
  'Сколько налогов мне нужно заплатить в этом месяце?',
  'Что написано про штрафы в моём договоре?',
  'Стоит ли мне брать кредит на 2 млн тенге?',
  'Как оптимизировать налоги для ГПХ?',
  'Что будет с моими финансами через 3 года?',
]

export default function Chat() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [docCount, setDocCount] = useState(0)
  const bottomRef = useRef()

  useEffect(() => {
    client.get('/documents').then(r => setDocCount(r.data.length)).catch(() => {})
    loadSessions()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = async () => {
    try {
      const r = await client.get('/chat/sessions')
      setSessions(r.data)
      if (r.data.length > 0) selectSession(r.data[0])
    } catch {}
  }

  const selectSession = async (session) => {
    setCurrentSession(session)
    setMessages([])
    try {
      const r = await client.get(`/chat/history?sessionId=${session.id}`)
      const history = r.data.flatMap(m => [
        { role: 'user', content: m.userMessage, id: `u${m.id}` },
        { role: 'ai', content: m.aiResponse, id: `a${m.id}` }
      ])
      setMessages(history)
    } catch {}
  }

  const newChat = async () => {
    try {
      const r = await client.post('/chat/sessions', {})
      const session = r.data
      setSessions(prev => [session, ...prev])
      setCurrentSession(session)
      setMessages([])
    } catch {}
  }

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await client.delete(`/chat/sessions/${sessionId}`)
      const updated = sessions.filter(s => s.id !== sessionId)
      setSessions(updated)
      if (currentSession?.id === sessionId) {
        if (updated.length > 0) selectSession(updated[0])
        else { setCurrentSession(null); setMessages([]) }
      }
    } catch {}
  }

  const send = async text => {
    const msg = text || input.trim()
    if (!msg || loading) return

    let session = currentSession
    if (!session) {
      try {
        const r = await client.post('/chat/sessions', {})
        session = r.data
        setSessions(prev => [session, ...prev])
        setCurrentSession(session)
      } catch { return }
    }

    setInput('')
    setMessages(p => [...p, { role: 'user', content: msg, id: Date.now() }])
    setLoading(true)
    try {
      const res = await client.post('/chat', { message: msg, sessionId: session.id })
      const title = res.data.userMessage?.substring(0, 50) || msg.substring(0, 50)
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title } : s))
      setMessages(p => [...p, {
        role: 'ai', content: res.data.aiResponse, id: Date.now() + 1, fromRag: docCount > 0
      }])
    } catch {
      setMessages(p => [...p, { role: 'ai', content: 'Ошибка соединения с AI.', id: Date.now() + 1 }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', gap: 0 }}>
      {/* Sessions sidebar */}
      <div style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
        marginRight: 16, overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 12px 8px' }}>
          <button onClick={newChat} className="btn-primary" style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}>
            + Новый чат
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {sessions.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 16 }}>
              Нет чатов
            </div>
          )}
          {sessions.map(s => (
            <div key={s.id}
              onClick={() => selectSession(s)}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: currentSession?.id === s.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: currentSession?.id === s.id ? 'var(--accent)' : 'var(--text2)',
                fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.15s', gap: 6
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                💬 {s.title}
              </span>
              <span
                onClick={e => deleteSession(e, s.id)}
                style={{ color: 'var(--muted)', fontSize: 12, flexShrink: 0, opacity: 0.6, cursor: 'pointer' }}
                title="Удалить"
              >✕</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="page-title" style={{ margin: 0 }}>🤖 AI Финансовый советник</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {currentSession ? currentSession.title : 'Создайте новый чат'}
            </div>
          </div>
          {docCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)'
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                RAG: {docCount} {docCount === 1 ? 'документ' : 'документа'}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0', marginBottom: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Привет, {user?.name}!</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
                Задай вопрос про финансы, налоги, кредиты
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background: 'var(--card2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', padding: '7px 14px', borderRadius: 20,
                    fontSize: 12, cursor: 'pointer'
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'ai' && (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2
                }}>🤖</div>
              )}
              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--card)',
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                  fontSize: 14, lineHeight: 1.6,
                  color: m.role === 'user' ? 'white' : 'var(--text)',
                  whiteSpace: 'pre-wrap'
                }}>{m.content}</div>
                {m.role === 'ai' && m.fromRag && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', paddingLeft: 4, opacity: 0.8 }}>
                    🔍 с учётом ваших документов
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
              }}>🤖</div>
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 14
              }}>
                <ThinkingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          display: 'flex', gap: 10, background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 16, padding: '8px 8px 8px 16px'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Спроси про налоги, договор, финансовое планирование..."
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 14, color: 'var(--text)', outline: 'none' }}
            disabled={loading}
          />
          <button onClick={() => send()} className="btn-primary" disabled={!input.trim() || loading} style={{ padding: '8px 20px' }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: 'var(--muted)' }}>
      Думаю
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          background: 'var(--muted)', animation: `bounce 1.2s ${i * 0.2}s infinite`
        }} />
      ))}
    </span>
  )
}
