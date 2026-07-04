import { connectLambda } from '@netlify/blobs'
import { fetchFulfilledOrders, buildShopifyOrderLink } from './lib/shopify.js'
import { fetchTrackingForOrder, wait, PARCELPANEL_RATE_LIMIT_DELAY_MS } from './lib/parcelpanel.js'
import { getScanState, setScanState, resetScanState } from './lib/store.js'
import { BATCH_SIZE, SCAN_START_DATE, buildStuckEntry, isTrackable } from './lib/stuckDetection.js'

export async function handler(event) {
  connectLambda(event)

  if (event.queryStringParameters?.reset) {
    await resetScanState()
    return { statusCode: 200, body: 'reset ok' }
  }

  const state = await getScanState()

  let orders, nextPageInfo
  try {
    ;({ orders, nextPageInfo } = await fetchFulfilledOrders({
      limit: BATCH_SIZE,
      pageInfo: state.pageInfo ?? undefined,
      createdAtMin: state.pageInfo ? undefined : SCAN_START_DATE,
    }))
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        debug: true,
        error: err.message,
        hasShop: !!process.env.SHOPIFY_SHOP,
        hasToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        hasPPKey: !!process.env.PARCELPANEL_API_KEY,
        priorState: state,
      }),
    }
  }

  if (event.queryStringParameters?.debug) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        debug: true,
        ordersFetched: orders.length,
        nextPageInfo,
        priorPageInfo: state.pageInfo,
        hasShop: !!process.env.SHOPIFY_SHOP,
        hasToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        hasPPKey: !!process.env.PARCELPANEL_API_KEY,
      }),
    }
  }

  const newStuckEntries = []

  for (const order of orders) {
    const tracking = await fetchTrackingForOrder(order.name)
    await wait(PARCELPANEL_RATE_LIMIT_DELAY_MS)

    const shipments = tracking?.order?.shipments ?? []

    for (const shipment of shipments) {
      if (isTrackable(shipment)) {
        newStuckEntries.push(
          buildStuckEntry(order, shipment, tracking?.order?.tracking_link, buildShopifyOrderLink(order.id)),
        )
      }
    }
  }

  const accumulator = [...state.accumulator, ...newStuckEntries]
  const ordersScannedThisPass = state.ordersScannedThisPass + orders.length

  if (nextPageInfo) {
    await setScanState({
      ...state,
      status: 'scanning',
      pageInfo: nextPageInfo,
      accumulator,
      ordersScannedThisPass,
    })
  } else {
    const results = [...accumulator].sort((a, b) => (b.daysNoUpdate ?? 0) - (a.daysNoUpdate ?? 0))

    await setScanState({
      status: 'idle',
      pageInfo: null,
      accumulator: [],
      ordersScannedThisPass: 0,
      results,
      lastCompletedAt: new Date().toISOString(),
      lastCompletedOrdersScanned: ordersScannedThisPass,
    })
  }

  return { statusCode: 200, body: 'ok' }
}
