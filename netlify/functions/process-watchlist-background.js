import { connectLambda } from '@netlify/blobs'
import { buildShopifyOrderLink } from './lib/shopify.js'
import { fetchTrackingForOrder, wait, PARCELPANEL_RATE_LIMIT_DELAY_MS } from './lib/parcelpanel.js'
import { getScanState, setScanState } from './lib/store.js'
import { buildStuckEntry, isTrackable } from './lib/stuckDetection.js'

// Steady-state tick: only re-checks orders already on the watchlist (fulfilled,
// not yet delivered). New fulfillments are added by the webhook, not here, so
// this stays small (tens/hundreds of orders) no matter how big the store is.
export async function handler(event) {
  connectLambda(event)

  const state = await getScanState()

  const remainingWatchlist = []
  const results = []

  for (const order of state.watchlist) {
    const tracking = await fetchTrackingForOrder(order.name)
    await wait(PARCELPANEL_RATE_LIMIT_DELAY_MS)

    const shipments = tracking?.order?.shipments ?? []
    const openShipments = shipments.filter(isTrackable)

    if (openShipments.length > 0) {
      remainingWatchlist.push(order)

      for (const shipment of openShipments) {
        results.push(
          buildStuckEntry(order, shipment, tracking?.order?.tracking_link, buildShopifyOrderLink(order.id)),
        )
      }
    }
    // else: every shipment is delivered (or ParcelPanel has no record) — drop it from the watchlist.
  }

  results.sort((a, b) => (b.daysNoUpdate ?? 0) - (a.daysNoUpdate ?? 0))

  await setScanState({
    ...state,
    status: 'idle',
    watchlist: remainingWatchlist,
    results,
    lastCompletedAt: new Date().toISOString(),
    lastCompletedOrdersScanned: state.watchlist.length,
  })

  return { statusCode: 200, body: 'ok' }
}
