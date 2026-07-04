import { useEffect, useMemo, useState } from 'react'
import './App.css'

const POLL_INTERVAL_MS = 30000
const NO_UPDATE_DAYS_THRESHOLD = 5
const NO_UPDATE_STATUS_KEYS = ['info_received', 'in_transit']
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 25

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

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never'
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function normalizeStatus(value) {
  return (value ?? '').toString().toLowerCase().replace(/[\s-]+/g, '_')
}

function parcelStatusKeys(parcel) {
  return [normalizeStatus(parcel.status), normalizeStatus(parcel.statusLabel)]
}

function isNoUpdateParcel(parcel) {
  const keys = parcelStatusKeys(parcel)
  const isTrackedStatus = NO_UPDATE_STATUS_KEYS.some((key) => keys.some((k) => k.includes(key)))
  return isTrackedStatus && (parcel.daysNoUpdate ?? 0) >= NO_UPDATE_DAYS_THRESHOLD
}

function matchesTab(parcel, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'no_update') return isNoUpdateParcel(parcel)
  const keys = parcelStatusKeys(parcel)
  return keys.some((k) => k.includes(tabKey))
}

const STATUS_ICONS = {
  ready_for_pickup: '‼️',
  exception: '⚠️',
  failed_attempt: '⚠️',
  in_transit: '✈️',
  info_received: 'ℹ️',
}

function statusIcon(status) {
  const key = normalizeStatus(status)
  const match = Object.keys(STATUS_ICONS).find((k) => key.includes(k))
  return match ? STATUS_ICONS[match] : null
}

function StatusBadge({ status }) {
  const className = `status-badge status-${normalizeStatus(status) || 'unknown'}`
  const icon = statusIcon(status)
  return (
    <span className={className}>
      {icon ? `${icon} ` : ''}
      {status ?? 'Unknown'}
    </span>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [sortDesc, setSortDesc] = useState(true)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [noUpdateStatusFilter, setNoUpdateStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/stuck-parcels')
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        const json = await response.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const parcels = data?.parcels ?? []

  const tabCounts = useMemo(() => {
    const counts = {}
    for (const tab of STATUS_TABS) {
      counts[tab.key] = parcels.filter((p) => matchesTab(p, tab.key)).length
    }
    return counts
  }, [parcels])

  const filteredParcels = useMemo(() => {
    let result = parcels.filter((p) => matchesTab(p, activeTab))
    if (activeTab === 'no_update' && noUpdateStatusFilter !== 'all') {
      result = result.filter((p) => parcelStatusKeys(p).some((k) => k.includes(noUpdateStatusFilter)))
    }
    return result
  }, [parcels, activeTab, noUpdateStatusFilter])

  const sortedParcels = [...filteredParcels].sort((a, b) =>
    sortDesc ? (b.daysNoUpdate ?? 0) - (a.daysNoUpdate ?? 0) : (a.daysNoUpdate ?? 0) - (b.daysNoUpdate ?? 0),
  )

  const totalPages = Math.max(1, Math.ceil(sortedParcels.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * pageSize
  const paginatedParcels = sortedParcels.slice(pageStart, pageStart + pageSize)

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
            {data?.status === 'scanning' ? `Scanning… (${data.ordersScannedThisPass} checked)` : 'Idle'}
          </span>
        </div>
      </div>

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

      {activeTab === 'no_update' && (
        <div className="sub-filters">
          {[
            { key: 'all', label: 'All' },
            { key: 'info_received', label: 'Info Received' },
            { key: 'in_transit', label: 'In Transit' },
          ].map((option) => (
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

      {data && filteredParcels.length === 0 && (
        <div className="empty-banner">No parcels found for this filter.</div>
      )}

      {data && filteredParcels.length > 0 && (
        <>
        <div className="table-controls">
          <span className="results-count">
            Showing {pageStart + 1}–{Math.min(pageStart + pageSize, sortedParcels.length)} of {sortedParcels.length}
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
        <table className="parcels-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Order #</th>
              <th
                className="sortable days-no-update-cell"
                onClick={() => setSortDesc((v) => !v)}
              >
                Days No Update {sortDesc ? '↓' : '↑'}
              </th>
              <th>Tracking Status</th>
              <th>Product(s)</th>
              <th>Customer Name</th>
              <th>Tracking Link</th>
            </tr>
          </thead>
          <tbody>
            {paginatedParcels.map((p, i) => (
              <tr key={`${p.orderNumber}-${i}`}>
                <td>{p.storeName ?? '—'}</td>
                <td>
                  {p.shopifyOrderLink ? (
                    <a href={p.shopifyOrderLink} target="_blank" rel="noreferrer">
                      {p.orderNumber}
                    </a>
                  ) : (
                    p.orderNumber
                  )}
                </td>
                <td className="days-no-update-cell">
                  {p.daysNoUpdate === null ? (
                    '—'
                  ) : isNoUpdateParcel(p) ? (
                    <span className="no-update-flag">⚠️ {p.daysNoUpdate}d</span>
                  ) : (
                    `${p.daysNoUpdate}d`
                  )}
                </td>
                <td><StatusBadge status={p.statusLabel ?? p.status} /></td>
                <td className="products-cell" title={p.products ?? undefined}>{p.products ?? '—'}</td>
                <td>{p.customerName ?? '—'}</td>
                <td>
                  {p.trackingLink ? (
                    <a href={p.trackingLink} target="_blank" rel="noreferrer">
                      Track
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
