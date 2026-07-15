import { handleReasonLabel } from '../constants/handleReasons'
import { formatRelativeTime } from '../utils/time'

function HandledParcelsTable({ paginatedParcels, onReopen, reopenSubmitting, reopenErrors }) {
  return (
    <table className="parcels-table">
      <thead>
        <tr>
          <th>Store</th>
          <th>Order #</th>
          <th>Reason</th>
          <th>Comment</th>
          <th>Handled At</th>
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
            <td>{handleReasonLabel(p.handled.reason)}</td>
            <td className="products-cell" title={p.handled.comment ?? undefined}>
              {p.handled.comment ?? '—'}
            </td>
            <td>{formatRelativeTime(p.handled.handledAt)}</td>
            <td>
              <button onClick={() => onReopen(p)} disabled={Boolean(reopenSubmitting[p.orderNumber])}>
                {reopenSubmitting[p.orderNumber] ? 'Reopening…' : 'Reopen'}
              </button>
              {reopenErrors[p.orderNumber] && <span className="handle-error">{reopenErrors[p.orderNumber]}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default HandledParcelsTable
