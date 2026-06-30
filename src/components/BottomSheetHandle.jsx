import './BottomSheetHandle.css'

export default function BottomSheetHandle({ onClose, label = '关闭', className = '' }) {
  return (
    <button
      type="button"
      className={`bottom-sheet-handle ${className}`.trim()}
      onClick={onClose}
      aria-label={label}
    >
      <span className="bottom-sheet-handle-bar" aria-hidden />
    </button>
  )
}
