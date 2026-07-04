import { getStore } from '@netlify/blobs'

const STORE_NAME = 'parcelpanel-scan'
const STATE_KEY = 'scan-state'

const DEFAULT_STATE = {
  status: 'idle',
  pageInfo: null,
  accumulator: [],
  ordersScannedThisPass: 0,
  results: [],
  lastCompletedAt: null,
  lastCompletedOrdersScanned: 0,
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

export async function resetScanState() {
  const store = scanStore()
  await store.setJSON(STATE_KEY, DEFAULT_STATE)
}
