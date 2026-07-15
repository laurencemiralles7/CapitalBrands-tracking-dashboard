import { normalizeStatus } from '../utils/status'

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

export default StatusBadge
