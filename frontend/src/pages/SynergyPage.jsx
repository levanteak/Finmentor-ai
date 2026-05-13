import { useState } from 'react'
import { ConfigProvider, theme as antTheme } from 'antd'
import { useTheme } from '../context/ThemeContext'
import SynergyWorkflows from './SynergyWorkflows'
import SynergyRegistry from './SynergyRegistry'
import routes from '../synergy/config/routes.json'

const ICON_MAP = {
  branches: '🔀',
  'file-text': '📄',
  tool: '🔧',
  build: '🏗️',
  car: '🚗',
  'file-done': '✅',
}

export default function SynergyPage() {
  const { theme } = useTheme()
  const [activeId, setActiveId] = useState('MAIN')
  const activeRoute = routes.leftSideBarMenu.find(r => r.id === activeId)

  const isDark = theme === 'dark'

  const antConfig = {
    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: isDark ? {
      colorBgContainer: '#111827',
      colorBgElevated: '#1a2235',
      colorBorderSecondary: '#1f2937',
      colorBorder: '#1f2937',
      colorText: '#f9fafb',
      colorTextSecondary: '#d1d5db',
      colorTextTertiary: '#6b7280',
      colorFill: 'rgba(59,130,246,0.1)',
      colorFillSecondary: 'rgba(59,130,246,0.06)',
      colorPrimary: '#3b82f6',
      colorSuccess: '#10b981',
      colorError: '#ef4444',
      colorWarning: '#f59e0b',
    } : {
      colorPrimary: '#3b82f6',
    },
    components: isDark ? {
      Table: {
        headerBg: '#1a2235',
        rowHoverBg: 'rgba(59,130,246,0.06)',
        borderColor: '#1f2937',
        headerSortActiveBg: '#1a2235',
      },
      Card: {
        colorBgContainer: '#111827',
        colorBorderSecondary: '#1f2937',
      },
      Input: {
        colorBgContainer: '#1a2235',
        colorBorder: '#1f2937',
        colorText: '#f9fafb',
        colorTextPlaceholder: '#6b7280',
      },
      Pagination: {
        colorText: '#d1d5db',
        colorTextDisabled: '#4b5563',
      },
      Modal: {
        colorBgElevated: '#1a2235',
        colorText: '#f9fafb',
      },
    } : {},
  }

  const renderContent = () => {
    if (!activeRoute || activeRoute.type === 'WORKFLOWS') return <SynergyWorkflows isDark={isDark} />
    if (activeRoute.type === 'REGISTRY' && activeRoute.config) {
      return (
        <SynergyRegistry
          key={activeRoute.config.registryCode}
          registryCode={activeRoute.config.registryCode}
          formCode={activeRoute.config.formCode}
          registryName={activeRoute.label}
          buttonCreateLabel={activeRoute.config.buttonCreate}
          isDark={isDark}
        />
      )
    }
    return <SynergyWorkflows isDark={isDark} />
  }

  return (
    <ConfigProvider theme={antConfig}>
      <div style={{ display: 'flex', gap: 16, flex: 1 }}>

        {/* Synergy sidebar nav */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '0 10px', marginBottom: 8,
          }}>
            Разделы
          </div>
          {routes.leftSideBarMenu.map(item => {
            const active = activeId === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: active ? 600 : 400, fontSize: 13,
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{ICON_MAP[item.icon] || '📋'}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Content area — fills remaining height */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: 'var(--text)' }}>
            {activeRoute?.label || 'Потоки работ'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
