export async function unsnoozeParcel({ orderNumber }) {
  const response = await fetch('/api/unsnooze-parcel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request failed: ${response.status}`)
  }
}
