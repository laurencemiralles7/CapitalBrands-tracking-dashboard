import { useEffect, useMemo, useState } from 'react'
import './App.css'
import ActiveParcelsTable from './components/ActiveParcelsTable'
import HandledParcelsTable from './components/HandledParcelsTable'
import SnoozedParcelsTable from './components/SnoozedParcelsTable'
import { HANDLE_REASONS } from './constants/handleReasons'
import { markHandled } from './api/markHandled'
import { snoozeParcel } from './api/snoozeParcel'
import { unsnoozeParcel } from './api/unsnoozeParcel'
import { reopenHandled } from './api/reopenHandled'
import { formatRelativeTime } from './utils/time'
import { matchesTab } from './utils/status'

const POLL_INTERVAL_MS = 30000
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 25
const DEFAULT_HANDLE_INPUT = { reason: HANDLE_REASONS[0].key, comment: '' }

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'info_received', label: 'Info Received' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'exception', label: 'Exception' },
  { key: 'failed_attempt', label: 'Failed Attempt' },
  { key: 'no_update', label: 'No Update' },
]

const SUB_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'info_received', label: 'Info Received' },
  { key: 'in_transit', label: 'In Transit' },
]

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('active')
  const [activeTab, setActiveTab] = useState('all')
  const [sortDesc, setSortDesc] = useState(true)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [noUpdateStatusFilter, setNoUpdateStatusFilter] = useState('all')
  const [handleInputs, setHandleInputs] = useState({})
  const [handleSubmitting, setHandleSubmitting] = useState({})
  const [handleErrors, setHandleErrors] = useState({})
  const [snoozeSubmitting, setSnoozeSubmitting] = useState({})
  const [snoozeErrors, setSnoozeErrors] = useState({})
  const [unsnoozeSubmitting, setUnsnoozeSubmitting] = useState({})
  const [unsnoozeErrors, setUnsnoozeErrors] = useState({})
  const [reopenSubmitting, setReopenSubmitting] = useState({})
  const [reopenErrors, setReopenErrors] = useState({})

  async function loadData() {
    try {
      const response = await fetch('/api/stuck-parcels')
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const json = await response.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const parcels = data?.parcels ?? []
  const activeParcels = useMemo(() => parcels.filter((p) => !p.handled && !p.snoozed), [parcels])
  const snoozedParcels = useMemo(() => parcels.filter((p) => p.snoozed && !p.handled), [parcels])
  const handledParcels = useMemo(() => parcels.filter((p) => p.handled), [parcels])

  const tabCounts = useMemo(() => {
    const counts = {}
    for (const tab of STATUS_TABS) {
      counts[tab.key] = activeParcels.filter((p) => matchesTab(p, tab.key)).length
    }
    return counts
  }, [activeParcels])

  const filteredActiveParcels = useMemo(() => {
    let result = activeParcels.filter((p) => matchesTab(p, activeTab))
    if (activeTab === 'no_update' && noUpdateStatusFilter !== 'all') {
      result = result.filter((p) => matchesTab(p, noUpdateStatusFilter))
    }
    return result
  }, [activeParcels, activeTab, noUpdateStatusFilter])

  const sortedActiveParcels = useMemo(
    () =>
      [...filteredActiveParcels].sort((a, b) =>
        sortDesc ? (b.daysNoUpdate ?? 0) - (a.daysNoUpdate ?? 0) : (a.daysNoUpdate ?? 0) - (b.daysNoUpdate ?? 0),
      ),
    [filteredActiveParcels, sortDesc],
  )

  const sortedHandledParcels = useMemo(
    () => [...handledParcels].sort((a, b) => new Date(b.handled.handledAt) - new Date(a.handled.handledAt)),
    [handledParcels],
  )

  const sortedSnoozedParcels = useMemo(
    () => [...snoozedParcels].sort((a, b) => new Date(a.snoozed.snoozedUntil) - new Date(b.snoozed.snoozedUntil)),
    [snoozedParcels],
  )

  const currentList =
    viewMode === 'active' ? sortedActiveParcels : viewMode === 'snoozed' ? sortedSnoozedParcels : sortedHandledParcels
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * pageSize
  const paginatedList = currentList.slice(pageStart, pageStart + pageSize)

  function changeViewMode(mode) {
    setViewMode(mode)
    setCurrentPage(1)
  }

  function changeTab(tabKey) {
    setActiveTab(tabKey)
    setNoUpdateStatusFilter('all')
    setCurrentPage(1)
  }

  function changeNoUpdateStatusFilter(key) {
    setNoUpdateStatusFilter(key)
    setCurrentPage(1)
  }

  function changePageSize(size) {
    setPageSize(size)
    setCurrentPage(1)
  }

  function getHandleInput(orderNumber) {
    return handleInputs[orderNumber] ?? DEFAULT_HANDLE_INPUT
  }

  function updateHandleReason(orderNumber, reason) {
    setHandleInputs((prev) => ({ ...prev, [orderNumber]: { ...getHandleInput(orderNumber), reason } }))
  }

  function updateHandleComment(orderNumber, comment) {
    setHandleInputs((prev) => ({ ...prev, [orderNumber]: { ...getHandleInput(orderNumber), comment } }))
  }

  async function submitHandle(parcel) {
    const input = getHandleInput(parcel.orderNumber)
    setHandleSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: true }))
    setHandleErrors((prev) => ({ ...prev, [parcel.orderNumber]: null }))

    try {
      await markHandled({
        orderNumber: parcel.orderNumber,
        reason: input.reason,
        comment: input.comment,
        status: parcel.status,
        lastUpdateDate: parcel.lastUpdateDate,
      })
      await loadData()
    } catch (err) {
      setHandleErrors((prev) => ({ ...prev, [parcel.orderNumber]: err.message }))
    } finally {
      setHandleSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: false }))
    }
  }

  async function submitSnooze(parcel, days, comment) {
    setSnoozeSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: true }))
    setSnoozeErrors((prev) => ({ ...prev, [parcel.orderNumber]: null }))

    try {
      await snoozeParcel({ orderNumber: parcel.orderNumber, days, comment })
      await loadData()
    } catch (err) {
      setSnoozeErrors((prev) => ({ ...prev, [parcel.orderNumber]: err.message }))
    } finally {
      setSnoozeSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: false }))
    }
  }

  async function submitUnsnooze(parcel) {
    setUnsnoozeSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: true }))
    setUnsnoozeErrors((prev) => ({ ...prev, [parcel.orderNumber]: null }))

    try {
      await unsnoozeParcel({ orderNumber: parcel.orderNumber })
      await loadData()
    } catch (err) {
      setUnsnoozeErrors((prev) => ({ ...prev, [parcel.orderNumber]: err.message }))
    } finally {
      setUnsnoozeSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: false }))
    }
  }

  async function submitReopen(parcel) {
    setReopenSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: true }))
    setReopenErrors((prev) => ({ ...prev, [parcel.orderNumber]: null }))

    try {
      await reopenHandled({ orderNumber: parcel.orderNumber })
      await loadData()
    } catch (err) {
      setReopenErrors((prev) => ({ ...prev, [parcel.orderNumber]: err.message }))
    } finally {
      setReopenSubmitting((prev) => ({ ...prev, [parcel.orderNumber]: false }))
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>ParcelPanel Monitoring</h1>
        <p className="subtitle">Cozey Maison &middot; Tracking status for non-delivered orders</p>
      </header>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-label">Non-delivered parcels</span>
          <span className="summary-value">{data ? parcels.length : '—'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Last full scan</span>
          <span className="summary-value">{data ? formatRelativeTime(data.lastCompletedAt) : '—'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Orders scanned (last pass)</span>
          <span className="summary-value">{data ? data.lastCompletedOrdersScanned : '—'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Scan status</span>
          <span className="summary-value">
            {data?.status === 'scanning'
              ? `Scanning… (${data.ordersScannedThisPass} checked)`
              : data?.watchlistTotal
                ? `Idle (${data.processCursor}/${data.watchlistTotal} this pass)`
                : 'Idle'}
          </span>
        </div>
      </div>

      <div className="view-mode-toggle">
        <button
          className={`view-mode-tab ${viewMode === 'active' ? 'active' : ''}`}
          onClick={() => changeViewMode('active')}
        >
          Active ({activeParcels.length})
        </button>
        <button
          className={`view-mode-tab ${viewMode === 'snoozed' ? 'active' : ''}`}
          onClick={() => changeViewMode('snoozed')}
        >
          Snoozed ({snoozedParcels.length})
        </button>
        <button
          className={`view-mode-tab ${viewMode === 'handled' ? 'active' : ''}`}
          onClick={() => changeViewMode('handled')}
        >
          Handled ({handledParcels.length})
        </button>
      </div>

      {viewMode === 'active' && (
        <div className="status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`status-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => changeTab(tab.key)}
            >
              {tab.label}
              <span className="status-tab-count">{data ? tabCounts[tab.key] : '—'}</span>
            </button>
          ))}
        </div>
      )}

      {viewMode === 'active' && activeTab === 'no_update' && (
        <div className="sub-filters">
          {SUB_FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`sub-filter-tab ${noUpdateStatusFilter === option.key ? 'active' : ''}`}
              onClick={() => changeNoUpdateStatusFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-banner">Failed to load data: {error}</div>}

      {!data && !error && <div className="loading-banner">Loading…</div>}

      {data && currentList.length === 0 && (
        <div className="empty-banner">
          {viewMode === 'active'
            ? 'No parcels found for this filter.'
            : viewMode === 'snoozed'
              ? 'No snoozed parcels.'
              : 'No handled parcels yet.'}
        </div>
      )}

      {data && currentList.length > 0 && (
        <>
          <div className="table-controls">
            <span className="results-count">
              Showing {pageStart + 1}–{Math.min(pageStart + pageSize, currentList.length)} of {currentList.length}
            </span>
            <label className="page-size-select">
              Per page:
              <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-scroll">
            {viewMode === 'active' ? (
              <ActiveParcelsTable
                paginatedParcels={paginatedList}
                sortDesc={sortDesc}
                onToggleSort={() => setSortDesc((v) => !v)}
                getHandleInput={getHandleInput}
                onReasonChange={updateHandleReason}
                onCommentChange={updateHandleComment}
                onSubmitHandle={submitHandle}
                handleSubmitting={handleSubmitting}
                handleErrors={handleErrors}
                onSnooze={submitSnooze}
                snoozeSubmitting={snoozeSubmitting}
                snoozeErrors={snoozeErrors}
              />
            ) : viewMode === 'snoozed' ? (
              <SnoozedParcelsTable
                paginatedParcels={paginatedList}
                onUnsnooze={submitUnsnooze}
                unsnoozeSubmitting={unsnoozeSubmitting}
                unsnoozeErrors={unsnoozeErrors}
              />
            ) : (
              <HandledParcelsTable
                paginatedParcels={paginatedList}
                onReopen={submitReopen}
                reopenSubmitting={reopenSubmitting}
                reopenErrors={reopenErrors}
              />
            )}
          </div>

          <div className="pagination">
            <button disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Previous
            </button>
            <span className="pagination-status">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
