import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'

export async function handler(event) {
  connectLambda(event)
  const state = await getScanState()
  const { watchlist, results, ...rest } = state
  return {
    statusCode: 200,
    body: JSON.stringify({ ...rest, watchlistLen: watchlist.length, resultsLen: results.length }, null, 2),
  }
}
