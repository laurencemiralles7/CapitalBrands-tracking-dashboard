import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'

// Temporary read-only diagnostic endpoint to inspect the full scan state
// (including lockedAt/seedPageInfo, which stuck-parcels.js doesn't expose).
export async function handler(event) {
  connectLambda(event)
  const state = await getScanState()
  return { statusCode: 200, body: JSON.stringify(state, null, 2) }
}
