import { connectLambda } from '@netlify/blobs'
import { clearHandledEntries } from './lib/handledStore.js'

export async function handler(event) {
  connectLambda(event)

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body ?? '{}')
    const { orderNumber } = body

    if (!orderNumber) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'orderNumber is required' }),
      }
    }

    await clearHandledEntries([orderNumber])

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    }
  }
}
