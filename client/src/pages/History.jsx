import { useState, useEffect } from 'react';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Card, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../components/ui/index.jsx';

const LEVEL_INFO = {
  '1': { label: '🟡 Vigilance', color: HS.warn, desc: 'GPS + Check-ins' },
  '2': { label: '🟠 Malaise', color: '#FF9800', desc: 'SMS discrets' },
  '3': { label: '🔴 Danger', color: HS.danger, desc: 'SMS + GPS + Urgence' },
  '4': { label: '🆘 SOS', color: '#B71C1C', desc: 'Escalade complète' },
};

const STATUS_INFO = {
  active: { label: '🔴 Active', color: HS.danger },
  resolved: { label: '✓ Résolue', color: HS.safe },
  false_alarm: { label: '⚠️ Fausse alerte', color: HS.warn },
};

export default function History() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(null);

  // Charger l'historique au mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/emergency-history');
      const data = response.data.data || {};
      setEmergencies(data.emergencies || []);
      console.log('[History] Loaded:', data.emergencies?.length, 'emergencies');
    } catch (err) {
      console.error('[History] Error:', err);
      setToast({ message: 'Erreur chargement historique', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sameDay = date.toDateString() === today.toDateString();
    const sameYesterday = date.toDateString() === yesterday.toDateString();

    let dayStr = '';
    if (sameDay) dayStr = 'Aujourd\'hui';
    else if (sameYesterday) dayStr = 'Hier';
    else dayStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return { day: dayStr, time: timeStr, full: `${dayStr} à ${timeStr}` };
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs}s`;
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/api/emergency-history/${id}`, { status: newStatus });
      // Mettre à jour l'état local
      setEmergencies(emergencies.map(e =>
        e.id === id ? { ...e, status: newStatus } : e
      ));
      setToast({ message: 'Statut mis à jour ✓', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erreur mise à jour', type: 'error' });
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={{ padding: '54px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ padding: '54px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <BackButton to="/dashboard" />
          <div>
            <Eyebrow>Historique</Eyebrow>
            <H2 style={{ marginTop: 4 }}>Mes Urgences</H2>
          </div>
        </div>
      </div>

      <ScrollArea style={{ padding: '0 16px 90px' }}>
        {emergencies.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: HS.textMute,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>Aucune urgence enregistrée</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {emergencies.map((emergency) => {
              const { day, time } = formatDateTime(emergency.created_at);
              const levelInfo = LEVEL_INFO[emergency.level] || {};
              const statusInfo = STATUS_INFO[emergency.status] || {};

              return (
                <Card
                  key={emergency.id}
                  style={{
                    padding: 14,
                    background: selectedEmergency?.id === emergency.id ? 'rgba(194, 24, 91, 0.1)' : 'transparent',
                    border: `1px solid ${selectedEmergency?.id === emergency.id ? HS.sakura : HS.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedEmergency(selectedEmergency?.id === emergency.id ? null : emergency)}
                >
                  {/* Header: Niveau + Statut + Heure */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <div style={{ fontSize: 16 }}>{levelInfo.label}</div>
                      <div style={{ fontSize: 11, color: HS.textMute }}>
                        {emergency.location_name && `📍 ${emergency.location_name}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: HS.textDim, fontWeight: 700 }}>
                      {time}
                    </div>
                  </div>

                  {/* Date et Statut */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 8,
                  }}>
                    <div style={{ color: HS.textMute }}>{day}</div>
                    <div style={{ color: statusInfo.color, fontWeight: 700 }}>{statusInfo.label}</div>
                  </div>

                  {/* Détails étendus (quand sélectionné) */}
                  {selectedEmergency?.id === emergency.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}` }}>
                      {/* Enregistrement audio */}
                      {emergency.audio_file_path && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 6 }}>
                            🎤 Enregistrement audio
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${import.meta.env.VITE_API_URL}${emergency.audio_file_path}`;
                                if (audioPlaying === emergency.id) {
                                  setAudioPlaying(null);
                                } else {
                                  // Créer un audio player
                                  const audio = new Audio(url);
                                  audio.play().catch(err => {
                                    console.error('Erreur lecture audio:', err);
                                    setToast({ message: 'Erreur lecture audio', type: 'error' });
                                  });
                                  setAudioPlaying(emergency.id);
                                  audio.onended = () => setAudioPlaying(null);
                                }
                              }}
                              style={{
                                background: audioPlaying === emergency.id ? HS.sakura : HS.surface,
                                border: `1px solid ${HS.border}`,
                                color: audioPlaying === emergency.id ? '#fff' : HS.text,
                                padding: '8px 14px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: HS.font,
                              }}
                            >
                              {audioPlaying === emergency.id ? '⏸️ Lecture' : '▶️ Écouter'}
                            </button>
                            <div style={{ fontSize: 11, color: HS.textMute }}>
                              {emergency.audio_duration_seconds ? formatDuration(emergency.audio_duration_seconds) : 'Durée inconnue'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contacts alertés */}
                      {emergency.contacts_alerted && emergency.contacts_alerted.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 4 }}>
                            📲 Contacts alertés ({emergency.contacts_alerted.length})
                          </div>
                          {emergency.contacts_alerted.map((contact, i) => (
                            <div key={i} style={{ fontSize: 11, color: HS.textMute, paddingLeft: 12 }}>
                              • {contact.name || contact.phone}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {emergency.notes && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 4 }}>
                            📝 Notes
                          </div>
                          <div style={{ fontSize: 11, color: HS.textMute, fontStyle: 'italic' }}>
                            {emergency.notes}
                          </div>
                        </div>
                      )}

                      {/* Statut et Actions */}
                      {emergency.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(emergency.id, 'resolved');
                            }}
                            style={{
                              flex: 1,
                              background: HS.safe,
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: HS.font,
                            }}
                          >
                            ✓ Marqué résolue
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(emergency.id, 'false_alarm');
                            }}
                            style={{
                              flex: 1,
                              background: HS.warn,
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: HS.font,
                            }}
                          >
                            ⚠️ Fausse alerte
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageShell>
  );
}
