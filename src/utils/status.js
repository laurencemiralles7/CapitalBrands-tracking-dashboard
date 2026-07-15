export const NO_UPDATE_DAYS_THRESHOLD = 5
export const NO_UPDATE_STATUS_KEYS = ['info_received', 'in_transit']

export function normalizeStatus(value) {
  return (value ?? '').toString().toLowerCase().replace(/[\s-]+/g, '_')
}

export function parcelStatusKeys(parcel) {
  return [normalizeStatus(parcel.status), normalizeStatus(parcel.statusLabel)]
}

export function isNoUpdateParcel(parcel) {
  const keys = parcelStatusKeys(parcel)
  const isTrackedStatus = NO_UPDATE_STATUS_KEYS.some((key) => keys.some((k) => k.includes(key)))
  return isTrackedStatus && (parcel.daysNoUpdate ?? 0) >= NO_UPDATE_DAYS_THRESHOLD
}

export function matchesTab(parcel, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'no_update') return isNoUpdateParcel(parcel)
  const keys = parcelStatusKeys(parcel)
  return keys.some((k) => k.includes(tabKey))
}
