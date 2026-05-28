import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useGPS } from '../hooks/useGPS';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Eyebrow, H2, BottomNav, PageShell, ScrollArea, Toast, BackButton } from '../components/ui/index.jsx';
import { TrackingMap } from '../components/maps/TrackingMap';

export default function Tracking() {
  const { token } = useParams(); // Pour accès public via /track/:token
  const isPublic = !!token;

  const { position, error: gpsError } = useGPS({ watch: true, enabled: !isPublic });
  const [track, setTrack]   = useState(null);
  const [publicTrack, setPublicTrack] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [checkins, setCheckins] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const timerRef = useRef(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Charger le trajet public si token fourni
  useEffect(() => {
    if (!isPublic || !token) return;

    const loadPublicTrack = async () => {
      try {
        const res = await api.get(`/api/tracks/share/${token}`);
        if (res.data.success) {
          setPublicTrack(res.data.data);
        } else {
          setToast({ message: 'Trajet introuvable', type: 'error' });
        }
      } catch (err) {
        console.error('Error loading public track:', err);
        setToast({ message: 'Erreur chargement trajet', type: 'error' });
      }
    };

    loadPublicTrack();

    // Recharger toutes les 5 secondes pour les updates
    const interval = setInterval(loadPublicTrack, 5000);
    return () => clearInterval(interval);
  }, [token, isPublic]);

  // Timer for elapsed time
  useEffect(() => {
    if (track || publicTrack) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [track, publicTrack]);

  // Send GPS position to server every 10 seconds while tracking
  useEffect(() => {
    if (!track || !position) return;

    const updateLocation = async () => {
      try {
        const res = await api.patch(`/api/tracks/${track.id}`, {
          location_lat: position.lat,
          location_lng: position.lng,
        });
        // Update track with new waypoints from server
        if (res.data.success) {
          setTrack(res.data.data);
        }
      } catch (err) {
        // Silently fail - don't disrupt UX with error toast
        console.debug('Location update failed:', err.message);
      }
    };

    // Send immediately first
    updateLocation();

    // Then every 10 seconds
    const interval = setInterval(updateLocation, 10000);
    return () => clearInterval(interval);
  }, [track?.id, position?.lat, position?.lng]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const startTrack = async () => {
    setLoading(true);
    try {
      const body = position ? { location_lat: position.lat, location_lng: position.lng } : {};
      const res  = await api.post('/api/tracks', body);
      setTrack(res.data.data);
      setCheckins(0);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur démarrage', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkin = async () => {
    if (!track) return;
    try {
      const body = {
        response: 'ok',
        ...(position && { location_lat: position.lat, location_lng: position.lng })
      };
      const res = await api.patch(`/api/tracks/${track.id}/checkin`, body);
      setCheckins((n) => n + 1);
      if (res.data.success) {
        setTrack(prev => ({ ...prev, waypoints: res.data.data.waypoints || prev.waypoints }));
      }
      setToast({ message: '✓ Check-in envoyé — tes proches savent que tu vas bien.', type: 'success' });
    } catch (err) {
      console.error('Checkin error:', err.response?.data);
      setToast({ message: 'Erreur check-in', type: 'error' });
    }
  };

  const endTrack = async () => {
    if (!track) return;
    setLoading(true);
    try {
      await api.patch(`/api/tracks/${track.id}/end`);
      setTrack(null);
      setToast({ message: 'Trajet terminé 🌸', type: 'success' });
    } finally {
      setLoading(false);
    }
  };

  const currentTrack = isPublic ? publicTrack : track;
  const currentPosition = isPublic && publicTrack && publicTrack.waypoints && publicTrack.waypoints.length > 0
    ? { lat: publicTrack.waypoints[publicTrack.waypoints.length - 1].lat, lng: publicTrack.waypoints[publicTrack.waypoints.length - 1].lng }
    : position;

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '54px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isPublic && <BackButton to="/dashboard" />}
        <div style={{ flex: 1 }}>
          <Eyebrow>{isPublic ? 'Suivi en direct' : 'Suivi de trajet'}</Eyebrow>
          <H2 style={{ marginTop: 4 }}>
            {isPublic ? publicTrack?.userName || '...' : 'GPS en direct'}
          </H2>
        </div>
        {!isPublic && <span style={{ width: 40 }} />}
      </div>

      <ScrollArea style={{ padding: '0 16px 90px' }}>
        {/* Carte statut GPS */}
        <Card style={{ padding: 18, marginBottom: 16, background: currentTrack
          ? `linear-gradient(135deg, ${HS.safeSoft}, ${HS.surface})`
          : HS.surface }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: currentTrack ? HS.safe : HS.mistyRose,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={ICONS.loc} size={24} color={currentTrack ? '#fff' : HS.sakuraDeep} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: HS.chocolate }}>
                {currentTrack ? (isPublic ? 'Trajet en cours' : 'Trajet en cours') : 'Aucun trajet actif'}
              </div>
              <div style={{ fontSize: 12, color: HS.textMute, marginTop: 2 }}>
                {currentPosition
                  ? `${currentPosition.lat.toFixed(4)}°, ${currentPosition.lng.toFixed(4)}°`
                  : isPublic ? 'Chargement...' : gpsError ? 'GPS indisponible' : 'Recherche GPS…'}
              </div>
            </div>
            {currentTrack && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: HS.serif, fontSize: 26, color: HS.safe, lineHeight: 1 }}>{fmt(elapsed)}</div>
                {!isPublic && <div style={{ fontSize: 10, color: HS.textMute }}>{checkins} check-ins</div>}
              </div>
            )}
          </div>
        </Card>

        {/* Carte du trajet */}
        {isPublic && publicTrack ? (
          <TrackingMap userPosition={publicTrack.waypoints && publicTrack.waypoints.length > 0
            ? { lat: publicTrack.waypoints[publicTrack.waypoints.length - 1].lat, lng: publicTrack.waypoints[publicTrack.waypoints.length - 1].lng }
            : null}
            track={publicTrack}
            checkins={0} />
        ) : (
          <TrackingMap userPosition={position} track={track} checkins={checkins} />
        )}

        {/* Actions - Only for private mode */}
        {!isPublic && (
          <>
            {!track ? (
              <Button onClick={startTrack} disabled={loading} variant="safe"
                icon={<Icon d={ICONS.play} size={20} color="#fff" />}>
                {loading ? 'Démarrage…' : 'Démarrer le suivi'}
              </Button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={checkin}
                  style={{ width: '100%', minHeight: 72, borderRadius: 22,
                    background: `linear-gradient(135deg, ${HS.safe}, #3d6b30)`,
                    border: 'none', color: '#fff', fontFamily: HS.font, fontWeight: 800,
                    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 12, boxShadow: '0 6px 20px rgba(92,127,79,0.4)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 28 }}>✅</span>
                  Je suis en sécurité
                </button>
                <Button onClick={endTrack} disabled={loading} variant="ghost"
                  icon={<Icon d={ICONS.stop} size={18} color={HS.chocolate} />}>
                  {loading ? 'Arrêt…' : 'Terminer le trajet'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Info publique */}
        {isPublic && publicTrack && (
          <Card style={{ padding: 16, marginTop: 20, background: HS.safeSoft }}>
            <div style={{ fontSize: 12, color: HS.textMute }}>
              <p><strong>📍 Suivi en direct</strong></p>
              <p style={{ marginTop: 8 }}>Vous suivez la position de <strong>{publicTrack.userName}</strong> en temps réel.</p>
              <p style={{ marginTop: 8, fontSize: 11 }}>Cette page se met à jour automatiquement.</p>
            </div>
          </Card>
        )}

        {/* Info */}
        {!track && (
          <div style={{ marginTop: 24 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Comment ça marche</Eyebrow>
            {[
              { icon: ICONS.play,  t: 'Démarre le suivi',   s: 'Tes contacts voient que tu es en route.' },
              { icon: ICONS.check, t: 'Check-in régulier',  s: 'Confirme que tu vas bien toutes les 10 min.' },
              { icon: ICONS.alert, t: 'Pas de réponse ?',   s: 'Tes proches sont alertés automatiquement.' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0',
                borderTop: i > 0 ? `1px dashed ${HS.border}` : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: HS.mistyRose,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon d={it.icon} size={18} color={HS.sakuraDeep} />
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>{it.t}</div>
                  <div style={{ fontSize: 12, color: HS.textDim, marginTop: 2 }}>{it.s}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <BottomNav />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
