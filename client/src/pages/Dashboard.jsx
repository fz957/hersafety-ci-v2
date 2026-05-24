import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEmergency } from '../hooks/useEmergency';
import { useGPS } from '../hooks/useGPS';
import { useCheckInTimer } from '../hooks/useCheckInTimer';
import { HS, ICONS } from '../tokens';
import { Icon, Avatar, Eyebrow, TestBanner, BottomNav, PageShell, Toast, Card, Button } from '../components/ui/index.jsx';
import { useState, useEffect } from 'react';
import api from '../services/api';

const LEVELS = [
  { level: '1', color: '#7B9171', glow: 'rgba(123,145,113,0.35)', label: 'Je suis bien',      sub: 'Tout va · Mode discret',           gesture: 'Tap simple',           icon: ICONS.heart },
  { level: '2', color: '#D4A574', glow: 'rgba(212,165,116,0.4)', label: 'Je suis méfiante',   sub: 'Quelqu\'un me suit · Alerte douce', gesture: 'Tap long · 2s',         icon: ICONS.eye },
  { level: '3', color: '#C97B3B', glow: 'rgba(201,123,59,0.45)', label: 'Situation tendue',   sub: 'Mes proches sont notifiés',         gesture: 'Double tap',            icon: ICONS.alert },
  { level: '4', color: '#B23A48', glow: 'rgba(178,58,72,0.5)',   label: 'Au secours',         sub: 'Police · Famille · Vidéo live',    gesture: 'Triple tap ou secouer', icon: ICONS.phone },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { triggerAlert, loading } = useEmergency();
  const { position } = useGPS();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [activeTrack, setActiveTrack] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(true);

  // Hook pour les check-ins automatiques
  const {
    showCheckInModal,
    setShowCheckInModal,
    timeRemaining,
    missedCheckIns,
    handleCheckInYes,
    handleCheckInNo,
    isEscalating,
  } = useCheckInTimer(activeTrack);

  // Charger le track actif au montage
  useEffect(() => {
    const loadActiveTrack = async () => {
      try {
        const res = await api.get('/api/tracks');
        const tracks = res.data.data || [];
        const active = tracks.find((t) => t.status === 'active');
        setActiveTrack(active || null);
      } catch (err) {
        console.error('Erreur chargement track:', err.message);
      } finally {
        setLoadingTrack(false);
      }
    };

    loadActiveTrack();
    // Rafraîchir toutes les 5 secondes si un track est actif
    const interval = setInterval(loadActiveTrack, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLevel = async (lv) => {
    try {
      const extras = position
        ? { location_lat: position.lat, location_lng: position.lng }
        : {};

      if (lv.level === '1') {
        // Niveau 1 : démarre un trajet de suivi
        await api.post('/api/tracks', { checkin_interval_min: 1, ...extras });
        setToast({ message: 'Suivi GPS activé. Check-in toutes les 1 min (TEST).', type: 'success' });
        return;
      }
      await triggerAlert(lv.level, extras);
      if (!['3', '4'].includes(lv.level)) {
        setToast({ message: `Alerte niveau ${lv.level} envoyée à tes contacts.`, type: 'warn' });
      }
    } catch {
      setToast({ message: 'Erreur réseau, réessaie.', type: 'error' });
    }
  };

  const firstName = user?.full_name?.split(' ')[0] || 'Toi';

  return (
    <PageShell>
      <TestBanner />

      {/* En-tête */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: HS.textMute }}>Bonsoir 🌸</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: HS.chocolate }}>
            {firstName} <span style={{ color: HS.sakuraDeep }}>·</span>{' '}
            <span style={{ color: HS.textDim, fontWeight: 600 }}>{user?.organization_name || ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role !== 'user' && (
            <button
              onClick={() => navigate('/admin')}
              style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40,
                borderRadius: 12, color: HS.chocolate, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={ICONS.gear} size={18} />
            </button>
          )}
          <button
            style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40,
              borderRadius: 12, color: HS.chocolate, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={ICONS.bell} size={18} />
            <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8,
              background: HS.sakuraDeep, borderRadius: 4, border: `2px solid ${HS.bg}` }} />
          </button>
          <button onClick={() => navigate('/onboarding')}>
            <Avatar size={40} name={firstName} />
          </button>
        </div>
      </div>

      {/* Statut GPS */}
      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4,
          background: position ? HS.safe : HS.textFaint }} />
        <span style={{ fontSize: 12, color: HS.textDim }}>
          {position ? 'GPS connecté · Contacts actifs' : 'GPS en attente…'}
        </span>
      </div>

      {/* Boutons de niveau */}
      <div style={{ flex: 1, padding: '4px 16px 90px', display: 'flex',
        flexDirection: 'column', gap: 10 }}>
        <Eyebrow>Comment tu te sens ?</Eyebrow>

        {LEVELS.map((lv) => (
          <button
            key={lv.level}
            disabled={loading}
            onClick={() => handleLevel(lv)}
            style={{
              width: '100%', textAlign: 'left', padding: '16px 18px', borderRadius: 22,
              background: `linear-gradient(135deg, ${lv.color}, ${lv.color}dd)`,
              border: 'none', color: '#fff', cursor: loading ? 'wait' : 'pointer',
              boxShadow: `0 6px 18px ${lv.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
              display: 'flex', alignItems: 'center', gap: 14, minHeight: 84,
              transition: 'transform .1s, opacity .1s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.22)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon d={lv.icon} size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>{lv.label}</div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>{lv.sub}</div>
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.18)', padding: '3px 10px', borderRadius: 100,
                fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }} />
                {lv.gesture}
              </div>
            </div>
            <Icon d={ICONS.arrow} size={20} color="rgba(255,255,255,0.7)" />
          </button>
        ))}
      </div>

      <BottomNav />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Modal Check-in Global (Niveau 1) */}
      {showCheckInModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <Card style={{
            maxWidth: 340, padding: 28, background: `linear-gradient(135deg, ${HS.safe}, ${HS.mistyRose})`,
            display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center',
          }}>
            {/* Titre */}
            <div style={{ fontSize: 24, fontWeight: 800, color: HS.chocolate }}>
              Tout va bien ?
            </div>

            {/* Countdown circular */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 8px ${HS.mistyRose}`,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
                {Math.ceil(timeRemaining / 1000)}s
              </div>
            </div>

            {/* Message */}
            <div style={{ fontSize: 13, color: HS.textDim, lineHeight: 1.5 }}>
              {missedCheckIns === 1
                ? 'Réponds rapidement ou tes contacts seront alertés'
                : 'Tes contacts ont besoin de savoir que tu vas bien'}
            </div>

            {/* Boutons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleCheckInYes}
                disabled={isEscalating}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14,
                  background: HS.safe, border: 'none', color: '#fff',
                  fontWeight: 700, fontSize: 14, fontFamily: HS.font,
                  cursor: isEscalating ? 'not-allowed' : 'pointer',
                  opacity: isEscalating ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Icon d={ICONS.check} size={16} color="#fff" />
                Oui, je vais bien ✓
              </button>

              <button
                onClick={handleCheckInNo}
                disabled={isEscalating}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14,
                  background: HS.danger, border: 'none', color: '#fff',
                  fontWeight: 700, fontSize: 14, fontFamily: HS.font,
                  cursor: isEscalating ? 'not-allowed' : 'pointer',
                  opacity: isEscalating ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Icon d={ICONS.alert} size={16} color="#fff" />
                Non, aide-moi
              </button>
            </div>

            {/* Status */}
            {isEscalating && (
              <div style={{ fontSize: 12, color: HS.danger, fontWeight: 700 }}>
                ⏳ Alertes en cours d'envoi…
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
