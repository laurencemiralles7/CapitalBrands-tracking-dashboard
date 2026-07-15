import { getStore } from '@netlify/blobs'

// Deliberately a separate blob store from scan-state (lib/store.js) and from
// handledStore.js — same rationale: the scan pipeline's wholesale rewrites of
// `watchlist`/`results` must never be able to touch or wipe CS snooze state.
const STORE_NAME = 'parcelpanel-snoozed'
const SNOOZED_KEY = 'snoozed-orders'

function snoozedStore() {
  return getStore(STORE_NAME)
}

// Map of orderNumber -> { snoozedAt, snoozedUntil }
export async function getSnoozedMap() {
  const store = snoozedStore()
  const map = await store.get(SNOOZED_KEY, { type: 'json' })
  return map ?? {}
}

export async function setSnoozed(orderNumber, entry) {
  const store = snoozedStore()
  const map = await getSnoozedMap()
  const updated = { ...map, [orderNumber]: entry }
  await store.setJSON(SNOOZED_KEY, updated)
  return updated
}

export async function clearSnoozedEntries(orderNumbers) {
  const store = snoozedStore()
  const map = await getSnoozedMap()
  const updated = { ...map }
  for (const orderNumber of orderNumbers) {
    delete updated[orderNumber]
  }
  await store.setJSON(SNOOZED_KEY, updated)
  return updated
}
