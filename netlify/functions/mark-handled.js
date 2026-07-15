import { connectLambda } from '@netlify/blobs'
import { markHandled } from './lib/handledStore.js'

const VALID_REASONS = ['customer_informed', 'refund_issued', 'escalated_to_supplier', 'already_delivered', 'other']

export async function handler(event) {
  connectLambda(event)

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body ?? '{}')
    const { orderNumber, reason, comment, status, lastUpdateDate } = body

    if (!orderNumber || !VALID_REASONS.includes(reason)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'orderNumber and a valid reason are required' }),
      }
    }

    if (!comment || !comment.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Comment is required' }),
      }
    }

    await markHandled(orderNumber, {
      reason,
      comment: comment.trim(),
      handledAt: new Date().toISOString(),
      snapshotStatus: status ?? null,
      snapshotLastUpdateDate: lastUpdateDate ?? null,
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
