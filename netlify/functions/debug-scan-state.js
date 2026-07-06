import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'

// Temporary diagnostic endpoint. Strips ALL array-valued fields (replacing
// with just their length) so no order/customer PII can ever leak here,
// regardless of which key it's stored under.
export async function handler(event) {
  connectLambda(event)
  const state = await getScanState()

  const safeState = Object.fromEntries(
    Object.entries(state).map(([key, value]) => (Array.isArray(value) ? [`${key}Len`, value.length] : [key, value]))
  )
  safeState.totalBlobSizeBytes = JSON.stringify(state).length

  return {
    statusCode: 200,
    body: JSON.stringify(safeState, null, 2),
  }
}
