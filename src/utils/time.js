export function formatRelativeTime(isoString) {
  if (!isoString) return 'Never'
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

export function formatCountdown(isoString) {
  if (!isoString) return '—'
  const diffMs = new Date(isoString).getTime() - Date.now()
  if (diffMs <= 0) return 'Expiring…'
  const diffMin = Math.ceil(diffMs / 60000)
  if (diffMin < 60) return `in ${diffMin}m`
  const diffHr = Math.ceil(diffMin / 60)
  if (diffHr < 24) return `in ${diffHr}h`
  return `in ${Math.ceil(diffHr / 24)}d`
}
