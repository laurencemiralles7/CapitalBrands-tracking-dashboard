import { getStore } from '@netlify/blobs'

// Deliberately a separate blob store from scan-state (lib/store.js). CS-handled
// metadata must never be touched by the scan pipeline, which rewrites
// `watchlist`/`results` wholesale on every completed pass — sharing a store
// would risk that rewrite wiping out CS work.
const STORE_NAME = 'parcelpanel-handled'
const HANDLED_KEY = 'handled-orders'

function handledStore() {
  return getStore(STORE_NAME)
}

// Map of orderNumber -> { reason, comment, handledAt, snapshotStatus, snapshotLastUpdateDate }
export async function getHandledMap() {
  const store = handledStore()
  const map = await store.get(HANDLED_KEY, { type: 'json' })
  return map ?? {}
}

export async function markHandled(orderNumber, entry) {
  const store = handledStore()
  const map = await getHandledMap()
  const updated = { ...map, [orderNumber]: entry }
  await store.setJSON(HANDLED_KEY, updated)
  return updated
}

export async function clearHandledEntries(orderNumbers) {
  const store = handledStore()
  const map = await getHandledMap()
  const updated = { ...map }
  for (const orderNumber of orderNumbers) {
    delete updated[orderNumber]
  }
  await store.setJSON(HANDLED_KEY, updated)
  return updated
}
