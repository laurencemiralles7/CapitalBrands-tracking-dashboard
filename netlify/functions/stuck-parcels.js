import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'

export async function handler(event) {
  try {
    connectLambda(event)
    const state = await getScanState()

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcels: state.results,
        status: state.status,
        lastCompletedAt: state.lastCompletedAt,
        lastCompletedOrdersScanned: state.lastCompletedOrdersScanned,
        ordersScannedThisPass: state.ordersScannedThisPass,
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
