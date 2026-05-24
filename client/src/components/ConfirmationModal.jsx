import { HS, ICONS } from '../tokens';
import { Icon } from './ui/index.jsx';

export default function ConfirmationModal({ isOpen, title, description, confirmText, cancelText, onConfirm, onCancel, isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: HS.surface, borderRadius: 20, padding: 28,
        maxWidth: 320, textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Titre */}
        <div style={{
          fontSize: 18, fontWeight: 800, color: HS.chocolate,
          marginBottom: 12, lineHeight: 1.4,
        }}>
          {title}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            fontSize: 13, color: HS.textDim, marginBottom: 24,
            lineHeight: 1.5,
          }}>
            {description}
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            onClick={onConfirm}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 14,
              background: isDanger ? HS.danger : HS.chocolate,
              border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 14, fontFamily: HS.font,
              cursor: 'pointer', transition: 'opacity .1s',
            }}
            onMouseDown={(e) => e.target.style.opacity = '0.8'}
            onMouseUp={(e) => e.target.style.opacity = '1'}
          >
            {confirmText || 'Confirmer'}
          </button>

          <button
            onClick={onCancel}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 14,
              background: HS.surface, border: `2px solid ${HS.border}`,
              color: HS.chocolate, fontWeight: 700, fontSize: 14,
              fontFamily: HS.font, cursor: 'pointer',
            }}
          >
            {cancelText || 'Annuler'}
          </button>
        </div>
      </div>
    </div>
  );
}
