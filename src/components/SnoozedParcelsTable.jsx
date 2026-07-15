import { formatCountdown } from '../utils/time'

function SnoozedParcelsTable({ paginatedParcels, onUnsnooze, unsnoozeSubmitting, unsnoozeErrors }) {
  return (
    <table className="parcels-table">
      <thead>
        <tr>
          <th>Store</th>
          <th>Order #</th>
          <th>Product(s)</th>
          <th>Snoozed Until</th>
          <th>Comment</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {paginatedParcels.map((p, i) => (
          <tr key={`${p.orderNumber}-${i}`}>
            <td>{p.storeName ?? '—'}</td>
            <td>
              {p.shopifyOrderLink ? (
                <a href={p.shopifyOrderLink} target="_blank" rel="noreferrer">
                  {p.orderNumber}
                </a>
              ) : (
                p.orderNumber
              )}
            </td>
            <td className="products-cell" title={p.products ?? undefined}>
              {p.products ?? '—'}
            </td>
            <td>{formatCountdown(p.snoozed.snoozedUntil)}</td>
            <td>{p.snoozed.comment || '—'}</td>
            <td>
              <button
                onClick={() => onUnsnooze(p)}
                disabled={Boolean(unsnoozeSubmitting[p.orderNumber])}
              >
                {unsnoozeSubmitting[p.orderNumber] ? 'Unsnoozing…' : 'Unsnooze now'}
              </button>
              {unsnoozeErrors[p.orderNumber] && <span className="handle-error">{unsnoozeErrors[p.orderNumber]}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default SnoozedParcelsTable
