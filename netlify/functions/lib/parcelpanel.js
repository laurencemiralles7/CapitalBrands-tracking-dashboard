const PARCELPANEL_BASE_URL = 'https://open.parcelwill.com'
export const PARCELPANEL_RATE_LIMIT_DELAY_MS = 550

export async function fetchTrackingForOrder(orderNumber) {
  const apiKey = process.env.PARCELPANEL_API_KEY

  if (!apiKey) {
    throw new Error('Missing PARCELPANEL_API_KEY env var')
  }

  const url = `${PARCELPANEL_BASE_URL}/api/v2/tracking/order?order_number=${encodeURIComponent(orderNumber)}`

  const response = await fetch(url, {
    headers: { 'x-parcelpanel-api-key': apiKey },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
