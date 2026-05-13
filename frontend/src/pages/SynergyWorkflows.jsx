import { useEffect, useMemo, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  Badge, Button, Dropdown, Empty, Input, Modal,
  Pagination, Spin, Tag, Typography, message,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, FileTextOutlined, PrinterOutlined,
  ReloadOutlined, SaveOutlined, SearchOutlined, SendOutlined,
} from '@ant-design/icons'
import { workflowAtom } from '../synergy/store/workflowStore'
import { synergyProfileAtom } from '../synergy/store/profileStore'
import { SynergyAPI } from '../synergy/api'
import FormPlayer from '../synergy/utils/formPlayer'

const { Text } = Typography
const PAGE_SIZE = 15
const FORM_CONTAINER_ID = 'workflow-form-player-container'
const formPlayerInstance = new FormPlayer()

const SEND_VARIANTS = [
  { key: 'REASSIGN', label: 'Перепоручить' },
  { key: 'REVIEW', label: 'На согласование/рассмотрение' },
  { key: 'APPROVE', label: 'На утверждение' },
  { key: 'FAMILIARIZE', label: 'На ознакомление' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

export default function SynergyWorkflows({ isDark }) {
  const [workflowState, setWorkflowState] = useAtom(workflowAtom)
  const profile = useAtomValue(synergyProfileAtom)
  const [viewMode, setViewMode] = useState('list')
  const [loading, setLoading] = useState(false)
  const [loadingWorkId, setLoadingWorkId] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [comment, setComment] = useState('')
  const [completionModal, setCompletionModal] = useState({ open: false, title: '', needComment: false, buttons: [] })

  useEffect(() => { if (profile.id) loadWorkflows() }, [profile.id])

  useEffect(() => {
    if (viewMode !== 'detail') {
      if (formPlayerInstance.hasPlayer) formPlayerInstance.clearPlayer()
      setEditMode(false)
      return
    }
    const asfDataID = workflowState.openWork?.documentInfo?.asfDataID
    if (!asfDataID) return
    const timer = setTimeout(() => {
      formPlayerInstance.clearPlayer()
      formPlayerInstance.initPlayer(FORM_CONTAINER_ID, false)
      formPlayerInstance.showByDataUUID(asfDataID)
    }, 300)
    return () => clearTimeout(timer)
  }, [viewMode, workflowState.openWork?.work?.actionID])

  const loadWorkflows = async () => {
    if (!profile.id) return
    setLoading(true)
    try {
      const data = await SynergyAPI.getWorkflowWorksListExt({ userID: profile.id, recordsCount: 500, startRecord: 0, isAscSort: false, sortColumn: 'start_date' })
      const items = data?.items || []
      setWorkflowState(prev => ({ ...prev, works: items, list: items.map(work => ({ work, document: null, documentInfo: null, completionForm: null })) }))
    } catch { message.error('Ошибка загрузки потоков работ') }
    finally { setLoading(false) }
  }

  const handleOpenWork = async (workflow) => {
    setLoadingWorkId(workflow.work.actionID)
    try {
      const existing = workflowState.list.find(w => w.work.actionID === workflow.work.actionID)
      if (existing?.document && existing?.documentInfo) {
        setWorkflowState(prev => ({ ...prev, openWork: existing }))
        setViewMode('detail')
        return
      }
      const details = await SynergyAPI.loadWorkflowDetails(workflow.work.actionID, workflow.work.completionFormID)
      const updated = { ...workflow, document: details?.document ?? null, documentInfo: details?.documentInfo ?? null, completionForm: details?.completionForm ?? null }
      setWorkflowState(prev => ({ ...prev, list: prev.list.map(w => w.work.actionID === workflow.work.actionID ? updated : w), openWork: updated }))
      SynergyAPI.markDocumentAsRead(workflow.work.actionID).catch(() => {})
      setViewMode('detail')
    } catch { message.error('Ошибка открытия работы') }
    finally { setLoadingWorkId(null) }
  }

  const handleBack = () => {
    if (formPlayerInstance.hasPlayer) formPlayerInstance.clearPlayer()
    setWorkflowState(prev => ({ ...prev, openWork: null }))
    setViewMode('list')
    setEditMode(false)
  }

  const handleEditToggle = () => {
    const next = !editMode
    setEditMode(next)
    formPlayerInstance.setEditable(next)
  }

  const handleSaveForm = async () => {
    setCompleting(true)
    try {
      await formPlayerInstance.saveFormData()
      formPlayerInstance.setEditable(false)
      setEditMode(false)
      message.success('Сохранено')
    } catch { message.error('Ошибка сохранения') }
    finally { setCompleting(false) }
  }

  const handleComplete = async () => {
    if (completing) return
    const openWork = workflowState.openWork
    if (!openWork) return
    setCompleting(true)
    try {
      if (openWork.completionForm) {
        const { CompletionFormType } = openWork.completionForm
        if (CompletionFormType === 'COMMENT') {
          setComment('')
          setCompletionModal({ open: true, title: 'Завершить работу', needComment: true, buttons: [{ label: 'Завершить', signal: '', color: 'POSITIVE', onClick: async (cmt) => { setCompleting(true); try { await SynergyAPI.finishWork({ workID: openWork.work.actionID, completionForm: 'COMMENT', comment: cmt }); message.success('Работа завершена'); handleBack(); loadWorkflows() } catch { message.error('Ошибка') } finally { setCompleting(false) } } }] })
          setCompleting(false); return
        }
        if (CompletionFormType === 'NOTHING') {
          setCompletionModal({ open: true, title: 'Завершить работу?', needComment: false, buttons: [{ label: 'Завершить', signal: '', color: 'POSITIVE', onClick: async () => { setCompleting(true); try { await SynergyAPI.finishWork({ workID: openWork.work.actionID, completionForm: 'NOTHING' }); message.success('Работа завершена'); handleBack(); loadWorkflows() } catch { message.error('Ошибка') } finally { setCompleting(false) } } }] })
          setCompleting(false); return
        }
      }
      const processInfo = await SynergyAPI.getProcessInfo(openWork.work.actionID)
      if (processInfo?.buttons?.length) {
        const { buttons, raw_data, need_comment_input } = processInfo
        const needComment = need_comment_input === 'true'
        setComment('')
        setCompletionModal({ open: true, title: 'Завершить работу', needComment, buttons: buttons.map(btn => ({ ...btn, onClick: async (cmt) => { setCompleting(true); try { await SynergyAPI.finishProcess({ procInstID: openWork.work.procInstID, signal: btn.signal, workID: openWork.work.actionID, rawdata: raw_data, ...(cmt ? { comment: cmt } : {}) }); message.success('Работа завершена'); handleBack(); loadWorkflows() } catch { message.error('Ошибка') } finally { setCompleting(false) } } })) })
        setCompleting(false); return
      }
      setCompletionModal({ open: true, title: 'Завершить работу?', needComment: false, buttons: [{ label: 'Завершить', signal: '', color: 'POSITIVE', onClick: async () => { setCompleting(true); try { await SynergyAPI.finishWork({ workID: openWork.work.actionID }); message.success('Работа завершена'); handleBack(); loadWorkflows() } catch { message.error('Ошибка') } finally { setCompleting(false) } } }] })
      setCompleting(false)
    } catch { message.error('Ошибка'); setCompleting(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return workflowState.list.filter(w => (w.work.name || '').toLowerCase().includes(q) || (w.work.author?.name || '').toLowerCase().includes(q))
  }, [workflowState.list, search])

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const openWork = workflowState.openWork

  const card = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
  }

  if (viewMode === 'detail') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={handleBack}>Назад к списку</Button>
          {openWork && (
            <>
              <Text strong style={{ color: 'var(--accent)', fontSize: 14 }}>{openWork.work.name || 'Работа'}</Text>
              {openWork.work.is_new === 'true' && <Badge status="processing" text="Новая" />}
              {openWork.work.is_expired === 'true' && <Tag color="error">Просрочено</Tag>}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, ...card, padding: '16px 24px', overflow: 'auto', flex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {!openWork?.documentInfo?.asfDataID && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large" tip="Загрузка документа..." />
              </div>
            )}
            <div id={FORM_CONTAINER_ID} className="form-player-container" style={{ minHeight: 300 }} />
          </div>
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <Button type="primary" block size="large" loading={completing} onClick={handleComplete} style={{ background: 'var(--accent)', height: 45, fontWeight: 600 }}>Завершить работу</Button>
            <Button block size="large" icon={editMode ? <ArrowLeftOutlined /> : <EditOutlined />} onClick={handleEditToggle} style={{ height: 45, fontWeight: 600 }}>
              {editMode ? 'Отменить' : 'Редактировать'}
            </Button>
            {editMode && (
              <Button type="primary" block size="large" icon={<SaveOutlined />} loading={completing} onClick={handleSaveForm} style={{ height: 45, fontWeight: 600, background: '#15803d' }}>Сохранить</Button>
            )}
            <Dropdown menu={{ items: SEND_VARIANTS }} placement="bottom" trigger={['click']}>
              <Button block size="large" icon={<SendOutlined />} style={{ height: 45, fontWeight: 600 }}>Отправить</Button>
            </Dropdown>
            <Button block size="large" icon={<PrinterOutlined />} disabled style={{ height: 45, fontWeight: 600 }}>Печать документа</Button>
          </div>
        </div>
        <Modal
          open={completionModal.open}
          title={completionModal.title}
          onCancel={() => setCompletionModal(p => ({ ...p, open: false }))}
          confirmLoading={completing}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setCompletionModal(p => ({ ...p, open: false }))}>Отмена</Button>
              {completionModal.buttons.map((btn, i) => (
                <Button key={i} type="primary" loading={completing}
                  onClick={() => { setCompletionModal(p => ({ ...p, open: false })); btn.onClick(comment) }}
                  danger={btn.color === 'NEGATIVE'}
                  style={btn.color !== 'NEGATIVE' ? { background: 'var(--accent)' } : undefined}>
                  {btn.label}
                </Button>
              ))}
            </div>
          }
        >
          {completionModal.needComment
            ? <Input.TextArea rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий..." />
            : <Text>Вы действительно хотите завершить эту работу?</Text>
          }
        </Modal>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск работ..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          allowClear
          style={{ maxWidth: 380 }}
        />
        <Button icon={<ReloadOutlined />} onClick={loadWorkflows} loading={loading} type="text">
          Обновить ({filtered.length})
        </Button>
      </div>

      {/* Table — flex:1 so it fills remaining height */}
      <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: 60 }}>
            <Empty description="Нет доступных работ" />
          </div>
        ) : (
          <>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <Th isDark={isDark} style={{ width: 28 }} />
                    <Th isDark={isDark}>Наименование работы</Th>
                    <Th isDark={isDark} style={{ width: 180 }}>Автор</Th>
                    <Th isDark={isDark} style={{ width: 120 }}>Дата завершения</Th>
                    <Th isDark={isDark} style={{ width: 120 }}>Дата поступления</Th>
                    <Th isDark={isDark} style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(workflow => {
                    const { work } = workflow
                    const isNew = work.is_new === 'true'
                    const isExpired = work.is_expired === 'true'
                    const isLoading = loadingWorkId === work.actionID
                    const expiredBg = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(254,226,226,0.6)'
                    const hoverBg = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(30,64,175,0.04)'
                    return (
                      <tr
                        key={work.actionID}
                        style={{ height: 52, borderBottom: '1px solid var(--border)', background: isExpired ? expiredBg : undefined }}
                        onMouseEnter={e => { if (!isExpired) e.currentTarget.style.background = hoverBg }}
                        onMouseLeave={e => { e.currentTarget.style.background = isExpired ? expiredBg : '' }}
                      >
                        <td style={{ padding: '0 8px', textAlign: 'center' }}>
                          {isNew && <Badge status="processing" />}
                        </td>
                        <td style={{ padding: '8px 10px', overflow: 'hidden' }}>
                          <Text strong={isNew} style={{ fontSize: 13, color: 'var(--text)' }} ellipsis={{ tooltip: work.name }}>
                            {work.name || '—'}
                          </Text>
                        </td>
                        <td style={{ padding: '8px 10px', overflow: 'hidden' }}>
                          <Text style={{ fontSize: 13, color: 'var(--text2)' }} ellipsis>{work.author?.name || '—'}</Text>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <Text style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(work.finish_date)}</Text>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <Text style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(work.start_date)}</Text>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            loading={isLoading}
                            disabled={loadingWorkId !== null && loadingWorkId !== work.actionID}
                            onClick={() => handleOpenWork(workflow)}
                            style={{ borderRadius: 50, borderColor: 'var(--accent)', color: 'var(--accent)', paddingInline: 14 }}
                          >
                            Открыть
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <Pagination
                current={page + 1}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                showSizeChanger={false}
                showTotal={t => `Всего: ${t}`}
                size="small"
                onChange={p => setPage(p - 1)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Th({ children, style, isDark }) {
  return (
    <th style={{
      padding: '10px',
      textAlign: 'left',
      fontWeight: 600,
      fontSize: 12,
      color: 'var(--text2)',
      background: 'var(--card2)',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      borderBottom: '1px solid var(--border)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      ...style,
    }}>
      {children}
    </th>
  )
}
