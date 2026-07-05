import { connectLambda } from '@netlify/blobs'
import { getScanState } from './lib/store.js'

const FALLBACK_BASE_URL = 'https://capitalbrands-tracking-dashboard.netlify.app'

// Lightweight scheduled trigger (30s budget). It never does the actual
// Shopify/ParcelPanel work itself — it just decides which background
// function (15 min budget) should run next and fires it off.
export async function handler(event) {
  connectLambda(event)

  const state = await getScanState()
  const baseUrl = process.env.URL || FALLBACK_BASE_URL
  const target = state.seedComplete ? 'process-watchlist-background' : 'seed-watchlist-background'

  await fetch(`${baseUrl}/.netlify/functions/${target}`)

  return { statusCode: 200, body: `triggered ${target}` }
}
