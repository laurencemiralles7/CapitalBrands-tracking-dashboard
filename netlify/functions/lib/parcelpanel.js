const PARCELPANEL_BASE_URL = 'https://open.parcelwill.com'
export const PARCELPANEL_RATE_LIMIT_DELAY_MS = 550

export async function fetchTrackingForOrder(orderNumber) {
  const apiKey = process.env.PARCELPANEL_API_KEY

  if (!apiKey) {
    throw new Error('Missing PARCELPANEL_API_KEY env var')
  }

  const url = `${PARCELPANEL_BASE_URL}/api/v2/tracking/order?order_number=${encodeURIComponent(orderNumber)}`

  let response
  try {
    response = await fetch(url, {
      headers: { 'x-parcelpanel-api-key': apiKey },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Timed out or network error — treat like "no shipment data" so one
    // unresponsive request doesn't hang the whole batch indefinitely.
    return null
  }

  if (!response.ok) {
    return null
  }

  return response.json()
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
