import { connectLambda } from '@netlify/blobs'
import { fetchFulfilledOrders } from './lib/shopify.js'
import { fetchTrackingForOrder, wait, PARCELPANEL_RATE_LIMIT_DELAY_MS } from './lib/parcelpanel.js'
import { getScanState, setScanState, isLocked } from './lib/store.js'
import { SCAN_START_DATE, isTrackable } from './lib/stuckDetection.js'

// One-time history backfill: pages through every fulfilled order since
// SCAN_START_DATE and seeds the watchlist with any that aren't delivered yet.
// Runs as a background function (15 min budget), so this batch can be much
// larger than the old 30s-synchronous scan-tick ever allowed.
const SEED_BATCH_SIZE = 500 // 500 * 550ms rate-limit delay ≈ 4.6 min, safe margin under 15 min

export async function handler(event) {
  connectLambda(event)

  const state = await getScanState()

  if (state.seedComplete) {
    return { statusCode: 200, body: 'seed already complete' }
  }

  if (isLocked(state)) {
    return { statusCode: 200, body: 'previous seed tick still running, skipping' }
  }

  // Claim the lock immediately so the next scheduled trigger (which can fire
  // before this batch finishes) doesn't start a second overlapping pass.
  await setScanState({ ...state, lockedAt: new Date().toISOString() })

  const { orders, nextPageInfo } = await fetchFulfilledOrders({
    limit: SEED_BATCH_SIZE,
    pageInfo: state.seedPageInfo ?? undefined,
    createdAtMin: state.seedPageInfo ? undefined : SCAN_START_DATE,
  })

  const watchlist = [...state.watchlist]
  const seenIds = new Set(watchlist.map((order) => order.id))

  for (const order of orders) {
    const tracking = await fetchTrackingForOrder(order.name)
    await wait(PARCELPANEL_RATE_LIMIT_DELAY_MS)

    const shipments = tracking?.order?.shipments ?? []
    const stillOpen = shipments.some((shipment) => isTrackable(shipment))

    if (stillOpen && !seenIds.has(order.id)) {
      watchlist.push(order)
      seenIds.add(order.id)
    }
  }

  await setScanState({
    ...state,
    status: nextPageInfo ? 'scanning' : 'idle',
    seedPageInfo: nextPageInfo,
    seedComplete: !nextPageInfo,
    ordersScannedThisPass: state.ordersScannedThisPass + orders.length,
    watchlist,
    lockedAt: null,
  })

  return { statusCode: 200, body: 'ok' }
}
