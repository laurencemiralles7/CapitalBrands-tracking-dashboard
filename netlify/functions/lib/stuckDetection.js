export const MS_PER_DAY = 1000 * 60 * 60 * 24
export const STORE_NAME = 'Cozey Maison'
export const SCAN_START_DATE = '2026-05-15T00:00:00Z'

export function daysSince(dateString) {
  if (!dateString) return null
  const then = new Date(dateString).getTime()
  return Math.floor((Date.now() - then) / MS_PER_DAY)
}

function getLastCheckpointDate(shipment) {
  const checkpoints = shipment?.checkpoints ?? []
  if (checkpoints.length === 0) return null
  return checkpoints[0]?.checkpoint_time ?? null
}

function buildProductsSummary(order) {
  const items = order.line_items ?? []
  if (items.length === 0) return null
  return items.map((item) => (item.quantity > 1 ? `${item.title} ×${item.quantity}` : item.title)).join(', ')
}

export function buildStuckEntry(order, shipment, trackingLink, shopifyOrderLink) {
  const lastUpdateDate = getLastCheckpointDate(shipment)
  const customer = order.customer

  return {
    storeName: STORE_NAME,
    orderNumber: order.name,
    customerName: customer ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() : null,
    products: buildProductsSummary(order),
    status: shipment.status ?? null,
    statusLabel: shipment.status_label ?? null,
    lastUpdateDate,
    daysNoUpdate: daysSince(lastUpdateDate),
    trackingLink: trackingLink ?? null,
    shopifyOrderLink: shopifyOrderLink ?? null,
  }
}

// Track everything except delivered orders: info received, in transit,
// out for delivery, ready for pickup, exception, failed attempt, etc.
export function isTrackable(shipment) {
  return shipment.status !== 'DELIVERED'
}

// The watchlist is persisted in full on every tick, so it must only carry the
// fields buildStuckEntry/buildShopifyOrderLink actually use — not the full
// raw Shopify order (shipping_address, fulfillments, etc). Storing full
// orders let the persisted blob balloon to 100+ MB with a few thousand
// entries, which made every read/write slow enough to look like a hang.
export function trimOrderForWatchlist(order) {
  return {
    id: order.id,
    name: order.name,
    customer: order.customer ? { first_name: order.customer.first_name, last_name: order.customer.last_name } : null,
    line_items: (order.line_items ?? []).map((item) => ({ title: item.title, quantity: item.quantity })),
  }
}
