export const MS_PER_DAY = 1000 * 60 * 60 * 24
export const BATCH_SIZE = 18
export const STORE_NAME = 'Cozey Maison'

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
