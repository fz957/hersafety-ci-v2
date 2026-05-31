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

export default function History() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [audioRef, setAudioRef] = useState(null); // Store audio element to stop it on delete

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

  const handleDeleteAudio = async (id) => {
    if (!window.confirm('Supprimer cet enregistrement audio ?')) return;

    try {
      setDeleting(id);

      // STOP and cleanup audio element if it's playing
      if (audioPlaying === id && audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        setAudioRef(null);
      }
      setAudioPlaying(null);

      await api.delete(`/api/emergency-history/${id}/audio`);
      // Mettre à jour l'état local
      setEmergencies(emergencies.map(e =>
        e.id === id ? { ...e, audio_file_path: null, audio_duration_seconds: null } : e
      ));
      setToast({ message: 'Enregistrement audio supprimé ✓', type: 'success' });
    } catch (err) {
      console.error('[History] Error deleting audio:', err);
      setToast({ message: 'Erreur suppression audio', type: 'error' });
    } finally {
      setDeleting(null);
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
              const isExpanded = selectedEmergency?.id === emergency.id;

              return (
                <Card
                  key={emergency.id}
                  style={{
                    padding: 14,
                    background: isExpanded ? 'rgba(194, 24, 91, 0.1)' : 'transparent',
                    border: `1px solid ${isExpanded ? HS.sakura : HS.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedEmergency(isExpanded ? null : emergency)}
                >
                  {/* Header: Niveau + Location + Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 16 }}>{levelInfo.label}</div>
                    <div style={{ flex: 1 }}>
                      {emergency.location_name && (
                        <div style={{ fontSize: 11, color: HS.textMute }}>
                          📍 {emergency.location_name}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: HS.textDim, fontWeight: 700, minWidth: 45, textAlign: 'right' }}>
                      {time}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 12, color: HS.textMute, marginBottom: 8 }}>
                    {day}
                  </div>

                  {/* Détails étendus (quand sélectionné) */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}` }}>

                      {/* Lieux d'activation et de refuge */}
                      <div style={{ marginBottom: 12 }}>
                        {/* Lieu d'activation */}
                        {emergency.location_name && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 3 }}>
                              📍 Lieu d'activation
                            </div>
                            <div style={{ fontSize: 12, color: HS.text, paddingLeft: 12 }}>
                              {emergency.location_name}
                            </div>
                            {emergency.latitude && emergency.longitude && (
                              <div style={{ fontSize: 10, color: HS.textMute, paddingLeft: 12, marginTop: 2 }}>
                                {Number(emergency.latitude).toFixed(4)}, {Number(emergency.longitude).toFixed(4)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Lieu de refuge / Dernier endroit connu */}
                        {(emergency.final_location_name || emergency.final_latitude) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 3 }}>
                              🛡️ Lieu de refuge
                            </div>
                            <div style={{ fontSize: 12, color: HS.text, paddingLeft: 12 }}>
                              {emergency.final_location_name || 'Position finale'}
                            </div>
                            {emergency.final_latitude && emergency.final_longitude && (
                              <div style={{ fontSize: 10, color: HS.textMute, paddingLeft: 12, marginTop: 2 }}>
                                {Number(emergency.final_latitude).toFixed(4)}, {Number(emergency.final_longitude).toFixed(4)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

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
                                if (audioPlaying === emergency.id) {
                                  // Stop audio
                                  if (audioRef) {
                                    audioRef.pause();
                                    audioRef.currentTime = 0;
                                  }
                                  setAudioPlaying(null);
                                  setAudioRef(null);
                                } else {
                                  // Préférer le base64 de la DB, sinon fallback fichier statique
                                  let audioUrl;
                                  if (emergency.audio_base64) {
                                    audioUrl = `data:audio/webm;base64,${emergency.audio_base64}`;
                                  } else {
                                    audioUrl = `${import.meta.env.VITE_API_URL}${emergency.audio_file_path}`;
                                  }

                                  // Créer un audio player
                                  const audio = new Audio(audioUrl);
                                  audio.play().catch(err => {
                                    console.error('Erreur lecture audio:', err);
                                    setToast({ message: 'Erreur lecture audio', type: 'error' });
                                  });
                                  setAudioPlaying(emergency.id);
                                  setAudioRef(audio); // STORE the audio element
                                  audio.onended = () => {
                                    setAudioPlaying(null);
                                    setAudioRef(null);
                                  };
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAudio(emergency.id);
                              }}
                              disabled={deleting === emergency.id}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${HS.danger}`,
                                color: HS.danger,
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: deleting === emergency.id ? 'not-allowed' : 'pointer',
                                fontFamily: HS.font,
                                opacity: deleting === emergency.id ? 0.5 : 1,
                                transition: 'all 0.2s',
                              }}
                            >
                              {deleting === emergency.id ? '⏳...' : '✕ Supprimer'}
                            </button>
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

                      {/* Messages Lyra */}
                      {emergency.lyra_messages && emergency.lyra_messages.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 6 }}>
                            💬 Conversation avec Lyra
                          </div>
                          <div style={{ fontSize: 11, color: HS.textMute, lineHeight: 1.6 }}>
                            {emergency.lyra_messages.map((msg, i) => (
                              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${HS.border}` }}>
                                <div style={{ fontWeight: 600, color: msg.role === 'user' ? HS.chocolate : HS.sakura, marginBottom: 2 }}>
                                  {msg.role === 'user' ? '👤 Toi' : '🎀 Lyra'}:
                                </div>
                                <div style={{ fontStyle: 'italic', color: HS.text }}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                          </div>
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
