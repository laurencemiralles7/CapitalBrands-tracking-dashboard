import StatusBadge from './StatusBadge'
import HandleControls from './HandleControls'
import { isNoUpdateParcel } from '../utils/status'

function ActiveParcelsTable({
  paginatedParcels,
  sortDesc,
  onToggleSort,
  getHandleInput,
  onReasonChange,
  onCommentChange,
  onSubmitHandle,
  handleSubmitting,
  handleErrors,
  onSnooze,
  snoozeSubmitting,
  snoozeErrors,
}) {
  return (
    <table className="parcels-table">
      <thead>
        <tr>
          <th>Store</th>
          <th>Order #</th>
          <th className="sortable days-no-update-cell" onClick={onToggleSort}>
            No Update {sortDesc ? '↓' : '↑'}
          </th>
          <th>Status</th>
          <th>Product(s)</th>
          <th>Link</th>
          <th>Handle</th>
        </tr>
      </thead>
      <tbody>
        {paginatedParcels.map((p, i) => {
          const input = getHandleInput(p.orderNumber)
          return (
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
              <td className="days-no-update-cell">
                {p.daysNoUpdate === null ? (
                  '—'
                ) : isNoUpdateParcel(p) ? (
                  <span className="no-update-flag">⚠️ {p.daysNoUpdate}d</span>
                ) : (
                  `${p.daysNoUpdate}d`
                )}
              </td>
              <td>
                <StatusBadge status={p.statusLabel ?? p.status} />
              </td>
              <td className="products-cell" title={p.products ?? undefined}>
                {p.products ?? '—'}
              </td>
              <td>
                {p.trackingLink ? (
                  <a href={p.trackingLink} target="_blank" rel="noreferrer">
                    Track
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <HandleControls
                  reason={input.reason}
                  comment={input.comment}
                  submitting={Boolean(handleSubmitting[p.orderNumber])}
                  error={handleErrors[p.orderNumber]}
                  onReasonChange={(value) => onReasonChange(p.orderNumber, value)}
                  onCommentChange={(value) => onCommentChange(p.orderNumber, value)}
                  onSubmit={() => onSubmitHandle(p)}
                  snoozeSubmitting={Boolean(snoozeSubmitting[p.orderNumber])}
                  snoozeError={snoozeErrors[p.orderNumber]}
                  onSnooze={(days, comment) => onSnooze(p, days, comment)}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ActiveParcelsTable
