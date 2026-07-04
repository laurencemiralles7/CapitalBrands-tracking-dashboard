const SHOPIFY_API_VERSION = '2024-10'

export function buildShopifyOrderLink(orderId) {
  const shop = process.env.SHOPIFY_SHOP
  return `https://${shop}/admin/orders/${orderId}`
}

function parseNextPageInfo(linkHeader) {
  if (!linkHeader) return null
  const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'))
  if (!nextLink) return null
  const match = nextLink.match(/page_info=([^&>]+)/)
  return match ? match[1] : null
}

export async function fetchFulfilledOrders({ limit = 25, createdAtMax, createdAtMin, pageInfo } = {}) {
  const shop = process.env.SHOPIFY_SHOP
  const token = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shop || !token) {
    throw new Error('Missing SHOPIFY_SHOP or SHOPIFY_ACCESS_TOKEN env vars')
  }

  const fields = 'id,name,customer,shipping_address,fulfillments,created_at,line_items'

  // Shopify only allows `limit` + `page_info` on paginated requests (no other filters).
  const url = pageInfo
    ? `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=${limit}&page_info=${pageInfo}`
    : `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&fulfillment_status=fulfilled&limit=${limit}&fields=${fields}&order=created_at+asc${
        createdAtMax ? `&created_at_max=${encodeURIComponent(createdAtMax)}` : ''
      }${createdAtMin ? `&created_at_min=${encodeURIComponent(createdAtMin)}` : ''}`

  const response = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': token },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Shopify API error: ${response.status} ${body}`)
  }

  const data = await response.json()
  const nextPageInfo = parseNextPageInfo(response.headers.get('link'))

  return { orders: data.orders, nextPageInfo }
}
