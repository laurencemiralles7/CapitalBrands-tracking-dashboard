export const HANDLE_REASONS = [
  { key: 'customer_informed', label: 'Customer informed' },
  { key: 'refund_issued', label: 'Refund issued' },
  { key: 'escalated_to_supplier', label: 'Escalated to supplier' },
  { key: 'already_delivered', label: 'Already delivered (manual)' },
  { key: 'other', label: 'Other' },
]

export function handleReasonLabel(reasonKey) {
  return HANDLE_REASONS.find((option) => option.key === reasonKey)?.label ?? reasonKey
}
