import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HANDLE_REASONS } from '../constants/handleReasons'

const SNOOZE_OPTIONS = [
  { days: 1, label: 'Snooze 24 hours' },
  { days: 3, label: 'Snooze 72 hours' },
  { days: 7, label: 'Snooze 7 days' },
]

function HandleControls({
  reason,
  comment,
  submitting,
  error,
  onReasonChange,
  onCommentChange,
  onSubmit,
  snoozeSubmitting,
  snoozeError,
  onSnooze,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState('menu')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [pendingSnoozeDays, setPendingSnoozeDays] = useState(null)
  const [snoozeComment, setSnoozeComment] = useState('')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const commentMissing = comment.trim() === ''

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event) {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target)
      const clickedMenu = menuRef.current && menuRef.current.contains(event.target)
      if (!clickedTrigger && !clickedMenu) {
        closeMenu()
      }
    }

    function handleScroll() {
      closeMenu()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [menuOpen])

  function openMenu() {
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, left: rect.right })
    setMenuOpen(true)
  }

  function closeMenu() {
    setMenuOpen(false)
    setView('menu')
    setPendingSnoozeDays(null)
    setSnoozeComment('')
  }

  function selectSnooze(days) {
    setPendingSnoozeDays(days)
    setView('snooze')
  }

  function confirmSnooze() {
    onSnooze(pendingSnoozeDays, snoozeComment.trim())
    closeMenu()
  }

  return (
    <div className="handle-controls">
      <button
        type="button"
        ref={triggerRef}
        className="handle-menu-trigger"
        onClick={() => (menuOpen ? closeMenu() : openMenu())}
        aria-label="Handle options"
      >
        ⋯
      </button>

      {menuOpen &&
        createPortal(
          <div
            className="handle-menu"
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left, transform: 'translateX(-100%)' }}
          >
            {view === 'menu' && (
            <>
              {SNOOZE_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  className="handle-menu-item"
                  onClick={() => selectSnooze(option.days)}
                  disabled={snoozeSubmitting}
                >
                  {snoozeSubmitting ? 'Snoozing…' : option.label}
                </button>
              ))}
              <div className="handle-menu-divider" />
              <button type="button" className="handle-menu-item" onClick={() => setView('review')}>
                <span className="check-icon">✓</span> Mark as reviewed
              </button>
              {snoozeError && <span className="handle-error">{snoozeError}</span>}
            </>
          )}

          {view === 'snooze' && (
            <div className="handle-review-form">
              <span className="handle-menu-label">
                {SNOOZE_OPTIONS.find((option) => option.days === pendingSnoozeDays)?.label}
              </span>
              <input
                type="text"
                placeholder="Comment (optional)"
                value={snoozeComment}
                onChange={(e) => setSnoozeComment(e.target.value)}
                disabled={snoozeSubmitting}
              />
              {snoozeError && <span className="handle-error">{snoozeError}</span>}
              <div className="handle-review-actions">
                <button type="button" onClick={() => setView('menu')} disabled={snoozeSubmitting}>
                  Back
                </button>
                <button type="button" onClick={confirmSnooze} disabled={snoozeSubmitting}>
                  {snoozeSubmitting ? 'Snoozing…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {view === 'review' && (
            <div className="handle-review-form">
              <select value={reason} onChange={(e) => onReasonChange(e.target.value)} disabled={submitting}>
                {HANDLE_REASONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Comment (e.g. already delivered, refund #123)"
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                disabled={submitting}
              />
              {commentMissing && <span className="handle-hint">Comment is required</span>}
              {error && <span className="handle-error">{error}</span>}
              <div className="handle-review-actions">
                <button type="button" onClick={() => setView('menu')} disabled={submitting}>
                  Back
                </button>
                <button type="button" onClick={onSubmit} disabled={submitting || commentMissing}>
                  {submitting ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default HandleControls
