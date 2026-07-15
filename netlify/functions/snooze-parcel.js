import { connectLambda } from '@netlify/blobs'
import { setSnoozed } from './lib/snoozedStore.js'

const VALID_DAYS = [1, 3, 7]

export async function handler(event) {
  connectLambda(event)

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body ?? '{}')
    const { orderNumber, days, comment } = body

    if (!orderNumber || !VALID_DAYS.includes(days)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'orderNumber and a valid days value (1, 3, or 7) are required' }),
      }
    }

    const snoozedAt = new Date()
    const snoozedUntil = new Date(snoozedAt.getTime() + days * 24 * 60 * 60 * 1000)

    await setSnoozed(orderNumber, {
      snoozedAt: snoozedAt.toISOString(),
      snoozedUntil: snoozedUntil.toISOString(),
      comment: typeof comment === 'string' ? comment.trim() : '',
    })

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    }
  }
}
