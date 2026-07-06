import { connectLambda } from '@netlify/blobs'
import { buildShopifyOrderLink } from './lib/shopify.js'
import { fetchTrackingForOrder, wait, PARCELPANEL_RATE_LIMIT_DELAY_MS } from './lib/parcelpanel.js'
import { getScanState, setScanState, isLocked } from './lib/store.js'
import { buildStuckEntry, isTrackable, trimOrderForWatchlist } from './lib/stuckDetection.js'

// Steady-state tick: only re-checks orders already on the watchlist (fulfilled,
// not yet delivered). New fulfillments are added by the webhook, not here, so
// this normally stays small — but right after seeding finishes the watchlist
// can be large, so this batches like the seed pass to stay under the 15 min
// background function budget instead of trying the whole watchlist in one go.
const PROCESS_BATCH_SIZE = 500 // ~500 orders * ~0.9s/order (rate-limit delay + request) ≈ 7.5 min in the typical case
// Hard wall-clock cutoff, well under Netlify's 15 min background function limit. A handful of slow
// ParcelPanel requests (each up to the 5s fetch timeout) can otherwise push a 500-order batch past
// the platform's hard kill — which happens with zero warning (no thrown error, lock never clears
// until the 10 min self-heal) and previously wiped out an entire batch's progress every time it hit.
// Checking elapsed time and bailing out early means an invocation always persists whatever it managed
// to process instead of gambling the whole batch on favorable response times.
const TIME_BUDGET_MS = 12 * 60 * 1000

export async function handler(event) {
  connectLambda(event)
  const startedAt = Date.now()

  const state = await getScanState()

  if (isLocked(state)) {
    return { statusCode: 200, body: 'previous watchlist tick still running, skipping' }
  }

  await setScanState({ ...state, lockedAt: new Date().toISOString() })

  const batch = state.watchlist.slice(state.processCursor, state.processCursor + PROCESS_BATCH_SIZE)
  const remainingWatchlist = [...state.processingRemainingWatchlist]
  const results = [...state.processingResults]

  try {
    let ordersProcessed = 0

    for (const order of batch) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break // out of time this tick; persist progress and finish the rest next tick

      const tracking = await fetchTrackingForOrder(order.name)
      await wait(PARCELPANEL_RATE_LIMIT_DELAY_MS)

      const shipments = tracking?.order?.shipments ?? []
      const openShipments = shipments.filter(isTrackable)

      if (openShipments.length > 0) {
        remainingWatchlist.push(trimOrderForWatchlist(order))

        for (const shipment of openShipments) {
          results.push(
            buildStuckEntry(order, shipment, tracking?.order?.tracking_link, buildShopifyOrderLink(order.id)),
          )
        }
      }
      // else: every shipment is delivered (or ParcelPanel has no record) — drop it from the watchlist.

      ordersProcessed += 1
    }

    const nextCursor = state.processCursor + ordersProcessed
    const passComplete = nextCursor >= state.watchlist.length

    if (passComplete) {
      results.sort((a, b) => (b.daysNoUpdate ?? 0) - (a.daysNoUpdate ?? 0))
      await setScanState({
        ...state,
        status: 'idle',
        watchlist: remainingWatchlist,
        results,
        processCursor: 0,
        processingResults: [],
        processingRemainingWatchlist: [],
        lastCompletedAt: new Date().toISOString(),
        lastCompletedOrdersScanned: state.watchlist.length,
        lockedAt: null,
        lastError: null,
      })
    } else {
      await setScanState({
        ...state,
        status: 'scanning',
        processCursor: nextCursor,
        processingResults: results,
        processingRemainingWatchlist: remainingWatchlist,
        lockedAt: null,
        lastError: null,
      })
    }

    return { statusCode: 200, body: 'ok' }
  } catch (err) {
    // Same safety net as the seed pass: never leave the lock stuck with no
    // visibility into why a batch failed.
    await setScanState({ ...state, lockedAt: null, lastError: `${err.message}\n${err.stack ?? ''}` })
    return { statusCode: 200, body: 'error captured' }
  }
}
