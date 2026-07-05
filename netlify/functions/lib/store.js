import { getStore } from '@netlify/blobs'

const STORE_NAME = 'parcelpanel-scan'
const STATE_KEY = 'scan-state'

export const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // self-heals if a run crashes without releasing the lock

const DEFAULT_STATE = {
  status: 'idle', // 'scanning' while the one-time history backfill is seeding the watchlist
  seedComplete: false,
  seedPageInfo: null,
  ordersScannedThisPass: 0, // orders seeded so far (only meaningful while seeding)
  watchlist: [], // fulfilled orders that are not yet delivered
  results: [],
  lastCompletedAt: null,
  lastCompletedOrdersScanned: 0, // watchlist size processed in the last completed tick
  lockedAt: null, // ISO timestamp while a background tick is running; prevents overlapping ticks
}

export function isLocked(state) {
  if (!state.lockedAt) return false
  return Date.now() - new Date(state.lockedAt).getTime() < LOCK_TIMEOUT_MS
}

function scanStore() {
  return getStore(STORE_NAME)
}

export async function getScanState() {
  const store = scanStore()
  const state = await store.get(STATE_KEY, { type: 'json' })
  return state ?? DEFAULT_STATE
}

export async function setScanState(state) {
  const store = scanStore()
  await store.setJSON(STATE_KEY, state)
}
