import { useEffect, useState } from 'react'
import { Button, Card, Input, message, Pagination, Space, Table, Tag, Typography, Popconfirm, Spin } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, DeleteOutlined, EyeOutlined, ArrowLeftOutlined, SaveOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons'
import { SynergyAPI } from '../synergy/api'
import FormPlayer from '../synergy/utils/formPlayer'

const { Text, Title } = Typography
const COLUMN_PREFIXES = ['textbox', 'combo', 'date', 'checkbox', 'textarea', 'number', 'lookup', 'editor']
const FORM_CONTAINER_ID = 'registry-form-player-container'
const formPlayerInstance = new FormPlayer()

function humanizeColumnId(id) {
  let result = id
  for (const prefix of COLUMN_PREFIXES) {
    if (result.startsWith(prefix + '_')) { result = result.slice(prefix.length + 1); break }
  }
  return result.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function SynergyRegistry({ registryCode, formCode, registryName, buttonCreateLabel, isDark }) {
  const [records, setRecords] = useState([])
  const [registryInfo, setRegistryInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [total, setTotal] = useState(0)
  const [formMode, setFormMode] = useState('list')
  const [viewRecord, setViewRecord] = useState(null)
  const [formReady, setFormReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [createDocUUID, setCreateDocUUID] = useState(null)

  useEffect(() => { setPage(1); setSearch(''); setFormMode('list'); loadRegistryInfo() }, [registryCode])
  useEffect(() => { if (formMode === 'list') loadRecords() }, [registryCode, page, pageSize, search, formMode])

  useEffect(() => {
    if (formMode === 'list') { if (formPlayerInstance.hasPlayer) formPlayerInstance.clearPlayer(); setFormReady(false); return }
    setFormReady(false)
    let cancelled = false
    const init = async () => {
      try {
        if (formMode === 'create') {
          const doc = await SynergyAPI.createRegistryDocument({ registryCode })
          if (cancelled) return
          if (!doc?.dataUUID) throw new Error('dataUUID пустой')
          setCreateDocUUID(doc.dataUUID)
          await formPlayerInstance.initPlayerAsync(FORM_CONTAINER_ID, true)
          if (cancelled) return
          formPlayerInstance.showByDataUUID(doc.dataUUID)
          setFormReady(true)
        } else if (formMode === 'view' && viewRecord?.dataUUID) {
          await formPlayerInstance.initPlayerAsync(FORM_CONTAINER_ID, false)
          if (cancelled) return
          formPlayerInstance.showByDataUUID(viewRecord.dataUUID)
          setFormReady(true)
        }
      } catch (e) { if (!cancelled) { console.error(e); message.error('Ошибка загрузки формы') } }
    }
    init()
    return () => { cancelled = true }
  }, [formMode, viewRecord?.dataUUID, registryCode])

  const loadRegistryInfo = async () => {
    try { const info = await SynergyAPI.getRegistryInfo({ registryCode }); setRegistryInfo(info ?? null) } catch {}
  }

  const loadRecords = async () => {
    setLoading(true)
    try {
      const data = await SynergyAPI.getRegistryDataExt({ registryCode, countInPart: pageSize, pageNumber: page - 1, searchString: search || undefined })
      setRecords(data?.result || [])
      setTotal(data?.recordsCount || 0)
    } catch { message.error('Ошибка загрузки данных реестра') }
    finally { setLoading(false) }
  }

  const handleDelete = async (dataUUID) => {
    try { await SynergyAPI.deleteDocument(dataUUID); message.success('Запись удалена'); loadRecords() }
    catch { message.error('Ошибка удаления') }
  }

  const handleBack = () => { if (formPlayerInstance.hasPlayer) formPlayerInstance.clearPlayer(); setFormMode('list'); setViewRecord(null); setFormReady(false); setEditMode(false); setCreateDocUUID(null) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (formMode === 'create') {
        if (!createDocUUID) throw new Error('dataUUID не найден')
        await formPlayerInstance.saveFormData()
        await SynergyAPI.activateDocument({ dataUUID: createDocUUID })
        message.success('Запись создана')
        handleBack(); loadRecords()
      } else {
        await formPlayerInstance.saveFormData()
        message.success('Изменения сохранены')
        setEditMode(false); formPlayerInstance.setEditable(false)
      }
    } catch { message.error('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const visibleColumns = (registryInfo?.columns || [])
    .filter(c => { const v = String(c.visible || ''); return v === '1' || v.toLowerCase() === 'true' })
    .sort((a, b) => a.order - b.order)

  const tableColumns = [
    ...visibleColumns.map(col => ({
      title: <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.label || humanizeColumnId(col.columnID)}</span>,
      dataIndex: ['fieldValue', col.columnID],
      key: col.columnID,
      ellipsis: true,
      render: (value) => col.columnID.toLowerCase().includes('status')
        ? <Tag color="blue" style={{ fontSize: 12 }}>{value || '—'}</Tag>
        : <Text style={{ fontSize: 13, color: 'var(--text)' }}>{value || '—'}</Text>,
    })),
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} type="text" onClick={e => { e.stopPropagation(); setEditMode(false); setViewRecord(record); setFormMode('view') }} />
          <Popconfirm title="Удалить запись?" onConfirm={e => { e?.stopPropagation(); handleDelete(record.dataUUID) }} okText="Да" cancelText="Нет">
            <Button size="small" icon={<DeleteOutlined />} type="text" danger onClick={e => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const pageTitle = registryName || registryInfo?.name || registryCode

  if (formMode !== 'list') {
    const isEditing = formMode === 'create' || editMode
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--card)',
          borderBottom: '1px solid var(--border)', borderRadius: '8px 8px 0 0', flexShrink: 0,
        }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} type="text">Назад</Button>
            <Title level={5} style={{ margin: 0, color: 'var(--accent)' }}>
              {formMode === 'create' ? `Создать: ${pageTitle}` : editMode ? `Редактировать: ${pageTitle}` : `Просмотр: ${pageTitle}`}
            </Title>
          </Space>
          <Space>
            {formMode === 'view' && !editMode && <Button icon={<EditOutlined />} onClick={() => { formPlayerInstance.setEditable(true); setEditMode(true) }} disabled={!formReady}>Редактировать</Button>}
            {editMode && <Button icon={<CloseOutlined />} onClick={() => { formPlayerInstance.setEditable(false); setEditMode(false) }} disabled={saving}>Отменить</Button>}
            {isEditing && <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!formReady} onClick={handleSave} style={{ background: 'var(--accent)' }}>Сохранить</Button>}
          </Space>
        </div>
        <div style={{ flex: 1, background: 'var(--card)', borderRadius: '0 0 8px 8px', position: 'relative', overflow: 'auto', minHeight: 400 }}>
          {!formReady && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin size="large" tip="Загрузка формы..." /></div>}
          <div id={FORM_CONTAINER_ID} className="form-player-container" style={{ padding: formReady ? 16 : 0, display: formReady ? 'block' : 'none', minHeight: 300 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadRecords} loading={loading} type="text" />
          <Text type="secondary" style={{ fontSize: 12 }}>Всего: {total}</Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormMode('create')} style={{ background: 'var(--accent)' }}>
          {buttonCreateLabel || 'Создать запись'}
        </Button>
      </div>
      <Input prefix={<SearchOutlined />} placeholder="Поиск..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} allowClear style={{ maxWidth: 400 }} />
      <Card style={{ borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}>
        <Table
          dataSource={records}
          columns={tableColumns}
          rowKey="dataUUID"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={false}
          style={{ flex: 1 }}
          onRow={record => ({ style: { cursor: 'pointer' }, onDoubleClick: () => { setEditMode(false); setViewRecord(record); setFormMode('view') } })}
        />
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger pageSizeOptions={['10', '30', '50', '100']} onChange={(p, ps) => { setPage(p); setPageSize(ps) }} showTotal={t => `Всего: ${t}`} size="small" />
        </div>
      </Card>
    </div>
  )
}
