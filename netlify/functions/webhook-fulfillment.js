import crypto from 'node:crypto'
import { connectLambda } from '@netlify/blobs'
import { getScanState, setScanState } from './lib/store.js'

function verifyShopifyHmac(rawBody, hmacHeader, secret) {
  if (!rawBody || !hmacHeader || !secret) return false

  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const digestBuffer = Buffer.from(digest)
  const headerBuffer = Buffer.from(hmacHeader)

  if (digestBuffer.length !== headerBuffer.length) return false
  return crypto.timingSafeEqual(digestBuffer, headerBuffer)
}

// Shopify webhook receiver for the "orders/fulfilled" topic. Adds each newly
// fulfilled order to the watchlist so the next tick starts tracking it —
// this is what keeps the working set small instead of re-scanning full order history.
export async function handler(event) {
  connectLambda(event)

  const hmacHeader = event.headers['x-shopify-hmac-sha256']
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET

  if (!verifyShopifyHmac(event.body, hmacHeader, secret)) {
    return { statusCode: 401, body: 'invalid signature' }
  }

  let order
  try {
    order = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'invalid payload' }
  }

  const state = await getScanState()
  const alreadyTracked = state.watchlist.some((watched) => watched.id === order.id)

  if (!alreadyTracked) {
    await setScanState({
      ...state,
      watchlist: [...state.watchlist, order],
    })
  }

  return { statusCode: 200, body: 'ok' }
}
