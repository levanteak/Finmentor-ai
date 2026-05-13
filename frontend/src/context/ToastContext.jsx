import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const colors = { error: 'var(--red)', success: 'var(--green)', info: 'var(--accent)' }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '12px 18px',
            borderRadius: 12,
            background: colors[t.type] || colors.info,
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            maxWidth: 340,
            animation: 'toastIn 0.2s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
