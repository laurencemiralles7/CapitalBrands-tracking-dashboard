export async function snoozeParcel({ orderNumber, days, comment }) {
  const response = await fetch('/api/snooze-parcel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, days, comment }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request failed: ${response.status}`)
  }
}
