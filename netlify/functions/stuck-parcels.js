import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'
import { getHandledMap, clearHandledEntries } from './lib/handledStore.js'
import { getSnoozedMap, clearSnoozedEntries } from './lib/snoozedStore.js'

function tagHandledStatus(parcel, handledMap, staleOrderNumbers) {
  const handled = handledMap[parcel.orderNumber]
  if (!handled) return { ...parcel, handled: null }

  const isStale = handled.snapshotStatus !== parcel.status || handled.snapshotLastUpdateDate !== parcel.lastUpdateDate
  if (isStale) {
    staleOrderNumbers.push(parcel.orderNumber)
    return { ...parcel, handled: null }
  }

  return { ...parcel, handled }
}

function tagSnoozedStatus(parcel, snoozedMap, expiredOrderNumbers) {
  const snoozed = snoozedMap[parcel.orderNumber]
  if (!snoozed) return { ...parcel, snoozed: null }

  const isExpired = new Date(snoozed.snoozedUntil).getTime() <= Date.now()
  if (isExpired) {
    expiredOrderNumbers.push(parcel.orderNumber)
    return { ...parcel, snoozed: null }
  }

  return { ...parcel, snoozed }
}

export async function handler(event) {
  try {
    connectLambda(event)
    const state = await getScanState()
    const handledMap = await getHandledMap()
    const snoozedMap = await getSnoozedMap()

    const staleOrderNumbers = []
    const expiredOrderNumbers = []
    const parcels = state.results
      .map((parcel) => tagHandledStatus(parcel, handledMap, staleOrderNumbers))
      .map((parcel) => tagSnoozedStatus(parcel, snoozedMap, expiredOrderNumbers))

    if (staleOrderNumbers.length > 0) {
      await clearHandledEntries(staleOrderNumbers)
    }

    if (expiredOrderNumbers.length > 0) {
      await clearSnoozedEntries(expiredOrderNumbers)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcels,
        status: state.status,
        lastCompletedAt: state.lastCompletedAt,
        lastCompletedOrdersScanned: state.lastCompletedOrdersScanned,
        ordersScannedThisPass: state.ordersScannedThisPass,
        // Steady-state pass progress — lets the dashboard show real movement
        // instead of looking frozen while the first full pass is still running
        // (parcels/ordersScannedThisPass don't update until the pass completes).
        processCursor: state.processCursor,
        watchlistTotal: state.watchlist.length,
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    }
  }
}
