export async function markHandled({ orderNumber, reason, comment, status, lastUpdateDate }) {
  const response = await fetch('/api/mark-handled', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, reason, comment, status, lastUpdateDate }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request failed: ${response.status}`)
  }
}
