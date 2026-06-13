import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import LRM from 'leaflet-routing-machine';
import { useGPS } from '../hooks/useGPS';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Card, Eyebrow, BackButton, PageShell, ScrollArea, Spinner } from '../components/ui/index.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

const NUM_COLORS = { police: '#4A6B8A', pompiers: '#C97B3B', hopital: '#5C7F4F', gendarmerie: '#5C5C8A', autre: HS.sakuraDeep };

// Routing control component
function RoutingControl({ position, selectedPlace, onClose }) {
  const map = useMap();
  const routingRef = useRef(null);

  console.log('[Routing RENDER] selectedPlace:', selectedPlace, 'position:', position);

  useEffect(() => {
    console.log('[Routing EFFECT] selectedPlace:', selectedPlace, 'position:', position, 'map:', map ? 'OK' : 'NO');
    if (!position || !selectedPlace || !map) return;

    console.log('[Routing] Creating route from', { lat: position.lat, lng: position.lng }, 'to', { lat: selectedPlace.lat, lng: selectedPlace.lng });

    // Remove old routing
    if (routingRef.current) {
      map.removeControl(routingRef.current);
    }

    // Create new routing
    try {
      console.log('[Routing] LRM available?', LRM ? 'YES' : 'NO', 'LRM.Routing?', LRM?.Routing ? 'YES' : 'NO');
      if (!LRM || !LRM.Routing) {
        console.warn('[Routing] leaflet-routing-machine not loaded, skipping route');
        return;
      }
      routingRef.current = LRM.Routing.control({
        waypoints: [
          L.latLng(position.lat, position.lng),
          L.latLng(selectedPlace.lat, selectedPlace.lng)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: HS.sakura, weight: 4, opacity: 0.8 }]
        }
      }).addTo(map);
      console.log('[Routing] ✓ Route added to map');
    } catch (err) {
      console.error('[Routing] ERROR:', err.message);
    }

    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
    };
  }, [position, selectedPlace, map]);

  if (!selectedPlace) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'white',
      padding: '12px',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxWidth: 250,
      fontSize: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>🗺️ Itinéraire vers {selectedPlace.name}</div>
      <button
        onClick={onClose}
        style={{
          width: '100%',
          padding: '8px',
          background: HS.sakura,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 700
        }}>
        Fermer
      </button>
    </div>
  );
}

// Véhicules de transport avec destination = lieu sûr le plus proche
const getVTCLinks = (safePlace) => {
  // Si on a un lieu sûr sélectionné, l'utiliser comme destination
  // Sinon utiliser le premier lieu sûr (le plus proche)
  const defaultDest = { lat: 6.8276, lng: -5.2893 }; // Fallback Abidjan
  const dest = safePlace || defaultDest;

  return [
    {
      n: 'Yango',
      est: '3 min · 1.2K F',
      url: `yango://ride?destination_lat=${dest.lat}&destination_lng=${dest.lng}`,
    },
    {
      n: 'Bolt',
      est: '5 min · 1.5K F',
      url: `https://bolt.eu/ride/?lat=${dest.lat}&lng=${dest.lng}`,
    },
    {
      n: 'InDriver',
      est: '4 min · 1.8K F',
      url: 'https://indriver.com', // Fallback web
    },
  ];
};

export default function Emergency() {
  const { state }   = useLocation();
  const navigate    = useNavigate();
  const { theme }   = useTheme();
  const { position } = useGPS({ watch: true });
  const { isListening, transcript, toggleListening, clearTranscript, isSupported } = useSpeechRecognition();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const [emergencyNums, setEmergencyNums] = useState([]);
  const [urgentContacts, setUrgentContacts] = useState([]);
  const [places, setPlaces]               = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); // For routing
  const [messages, setMessages]           = useState([]); // Conversation history
  const [userInput, setUserInput]         = useState('');
  const [loadingAI, setLoadingAI]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [loadingPOIs, setLoadingPOIs]     = useState(false);
  const initializedRef = useRef(false); // Éviter l'initialisation double de Lyra
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // DEBUG: Log on every render
  console.log('[Emergency RENDER] messages:', messages.length, 'emergencyNums:', emergencyNums.length, 'places:', places.length, 'loadingAI:', loadingAI, 'initialized:', initializedRef.current);

  // Modals de confirmation
  const [callModal, setCallModal]         = useState({ isOpen: false, number: null, name: null });
  const [vtcModal, setVtcModal]           = useState({ isOpen: false, app: null, url: null });

  // Niveaux 3 et 4 fusionnés : tout va au niveau 3 complet
  const level = '3';

  // Calcul distance EXACT (Haversine formula)
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Gestion appels d'urgence
  const handleCallClick = (number, name) => {
    setCallModal({ isOpen: true, number, name });
  };

  const confirmCall = () => {
    if (callModal.number) {
      window.location.href = `tel:${callModal.number}`;
      setCallModal({ isOpen: false, number: null, name: null });
    }
  };

  // Gestion VTC
  const handleVtcClick = (appName, url) => {
    setVtcModal({ isOpen: true, app: appName, url });
  };

  const confirmVtc = () => {
    if (vtcModal.url) {
      window.location.href = vtcModal.url;
      setVtcModal({ isOpen: false, app: null, url: null });
    }
  };

  // Reset initialization ref when component mounts
  useEffect(() => {
    initializedRef.current = false;
  }, []);

  // Chrono
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Enregistrement audio automatique en cas d'urgence
  const recordingHandledRef = useRef(false);

  useEffect(() => {
    console.log('[Emergency AUDIO] Starting audio recording');
    startRecording();

    // Arrêter l'enregistrement et sauvegarder en quittant
    return () => {
      console.log('[Emergency AUDIO] Stopping audio recording on cleanup - handled:', recordingHandledRef.current);
      // Ne sauvegarder que si pas déjà géré par le bouton "Je suis en sécurité"
      if (!recordingHandledRef.current) {
        stopRecording().then(audioBlob => {
          console.log('[Emergency AUDIO] Audio blob received:', audioBlob ? 'YES' : 'NO');
          if (audioBlob) {
            console.log('[Emergency AUDIO] Saving emergency with audio');
            saveEmergencyWithAudio(audioBlob);
          }
        });
      }
    };
  }, []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Numéros d'urgence
  useEffect(() => {
    console.log('[Emergency EFFECT] Fetching emergency numbers...');
    api.get('/api/emergency-numbers').then((r) => {
      console.log('[Emergency EFFECT] Emergency numbers loaded:', r.data.data.length);
      setEmergencyNums(r.data.data);
    }).catch((err) => {
      console.error('[Emergency EFFECT] Error fetching emergency numbers:', err);
    });
  }, []);

  // Charger contacts d'urgence
  useEffect(() => {
    console.log('[Emergency EFFECT] Fetching urgent contacts...');
    api.get('/api/contacts').then((r) => {
      console.log('[Emergency EFFECT] Urgent contacts loaded:', r.data.data.length);
      setUrgentContacts(r.data.data || []);
    }).catch((err) => {
      console.error('[Emergency EFFECT] Error fetching contacts:', err);
      setUrgentContacts([]);
    });
  }, []);

  // Traiter la transcription vocale
  useEffect(() => {
    if (!isListening && transcript && transcript.trim() !== '🎤') {
      const cleaned = transcript.replace('🎤', '').trim();
      setUserInput(cleaned);
      clearTranscript();
    }
  }, [isListening, transcript]);

  // Lieux sûrs — Charger en arrière-plan SANS BLOQUER L'AFFICHAGE
  useEffect(() => {
    if (!position) {
      console.log('[Emergency EFFECT] No position yet, using fallback Abidjan');
      // Utiliser position par défaut (Abidjan) pour charger les lieux sûrs
      api.get('/api/places', {
        params: {
          lat: 5.3405,
          lng: -4.0397,
          radius: 5000
        }
      })
        .then(res => {
          const places = res.data.data || [];
          console.log('[Emergency EFFECT] Fallback places loaded:', places.length);
          setPlaces(places);
        })
        .catch(err => {
          console.error('[Emergency EFFECT] Error loading fallback places:', err);
          setPlaces([]);
        });
      return;
    }

    // Avoir position - charger les lieux réels
    console.log('[Emergency EFFECT] Loading places for position:', position.lat.toFixed(4), position.lng.toFixed(4));
    api.get('/api/places', {
      params: {
        lat: position.lat.toFixed(6),
        lng: position.lng.toFixed(6),
        radius: 5000
      }
    })
      .then(res => {
        const places = res.data.data || [];
        console.log('[Emergency EFFECT] Real places loaded:', places.length);
        setPlaces(places);
      })
      .catch(err => {
        console.error('[Emergency EFFECT] Error loading places:', err);
        setPlaces([]);
      });
  }, [position]);

  // Init: Appel initial à Claude pour commencer la conversation (UNE SEULE FOIS - IMMÉDIAT)
  useEffect(() => {
    console.log('========== [Emergency INIT EFFECT] TRIGGERED ==========');
    console.log('  initialized:', initializedRef.current);
    console.log('  messages.length:', messages.length);
    console.log('  emergencyNums.length:', emergencyNums.length);

    if (initializedRef.current) {
      console.log('  → SKIP: Already initialized (ref=true)');
      return;
    }
    if (messages.length > 0) {
      console.log('  → SKIP: Messages already exist');
      return;
    }
    // Ne pas attendre emergencyNums - lancer immédiatement avec données partielles
    console.log('  ✓ PROCEEDING with initialization (may have partial data)');
    console.log('  Setting initializedRef.current = true');
    initializedRef.current = true;

    console.log('  Setting loadingAI = true');
    setLoadingAI(true);

    console.log('  Calling /api/claude/assist with:', {
      level,
      contextKeys: Object.keys({ position, emergencyNumbers: emergencyNums, nearbyPlaces: places })
    });

    let timeoutId = null;
    let completed = false;

    const handleSuccess = (r) => {
      if (completed) return;
      completed = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.log('  ✓ API response received');
      console.log('  Response data:', r.data.data);
      const initialMessage = { role: 'assistant', content: r.data.data.message };
      console.log('  Setting messages with initial message');
      setMessages([initialMessage]);
      console.log('  Setting loadingAI = false');
      setLoadingAI(false);
      console.log('========== [Emergency INIT EFFECT] COMPLETED ==========');
    };

    const handleError = (err) => {
      if (completed) return;
      completed = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.error('  ✗ API ERROR:', err.message);
      console.error('  Full error:', err);
      const fallback = { role: 'assistant', content: 'Reste calme. Éloigne-toi calmement si possible. Le 110 est disponible.' };
      console.log('  Setting fallback message');
      setMessages([fallback]);
      console.log('  Setting loadingAI = false');
      setLoadingAI(false);
      console.log('========== [Emergency INIT EFFECT] COMPLETED ==========');
    };

    // Timeout après 5 secondes si pas de réponse
    timeoutId = setTimeout(() => {
      if (!completed) {
        console.warn('  ⚠️ API TIMEOUT after 5s');
        handleError(new Error('API timeout'));
      }
    }, 5000);

    api.post('/api/claude/assist', {
      level,
      conversationHistory: [],
      context: {
        position,
        emergencyNumbers: emergencyNums,
        nearbyPlaces: places,
        vtcOptions: getVTCLinks(places[0])
      }
    })
      .then(handleSuccess)
      .catch(handleError);
  }, []);

  // Pas de scroll auto - chaque seconde compte en urgence

  // Sauvegarder l'urgence avec l'enregistrement audio
  const saveEmergencyWithAudio = async (audioBlob, finalLocation = null) => {
    console.log('[Emergency SAVE] saveEmergencyWithAudio called - audioBlob:', audioBlob ? 'YES' : 'NO', 'finalLocation:', finalLocation ? 'YES' : 'NO');
    try {
      if (!audioBlob) {
        console.log('[Emergency SAVE] No audioBlob, returning');
        return;
      }

      // Convertir le blob en base64
      const reader = new FileReader();
      reader.onload = async () => {
        console.log('[Emergency SAVE] FileReader onload triggered');
        const base64Audio = reader.result.split(',')[1]; // Enlever le préfixe "data:..."
        console.log('[Emergency SAVE] Base64 audio size:', base64Audio ? base64Audio.length : 0, 'bytes');

        // Chercher le lieu le plus proche pour la position finale
        let finalLocationName = 'Dernière position';
        if (finalLocation) {
          console.log('[Emergency SAVE] Looking up final location name from backend...');
          // Use backend API to get nearby safe places (will return location context)
          try {
            const response = await api.get('/api/places', {
              params: {
                lat: finalLocation.lat,
                lng: finalLocation.lng,
                radius: 500 // 500m radius to find nearby places
              }
            });
            const places = response.data.data || [];
            if (places.length > 0) {
              finalLocationName = places[0].name || 'Dernière position';
              console.log('[Emergency SAVE] Final location name:', finalLocationName);
            }
          } catch (err) {
            console.log('[Emergency SAVE] Places API request failed, using default name:', err.message);
          }
        }

        // Préparer les données
        const emergencyData = {
          level: level,
          trigger_type: 'emergency_page',
          latitude: position?.lat,
          longitude: position?.lng,
          location_name: 'Position actuelle', // Lieu d'activation = où elle était vraiment
          // Localisation finale (lieu de refuge ou dernier endroit connu)
          final_latitude: finalLocation?.lat || position?.lat,
          final_longitude: finalLocation?.lng || position?.lng,
          final_location_name: finalLocationName, // Lieu de refuge = où elle s'est arrêtée en dernier
          contacts_alerted: [], // À compléter si nécessaire
          sms_sent: [],
          audio_base64: base64Audio,
          status: finalLocation ? 'resolved' : 'active', // Mark as resolved if user pressed "Je suis en sécurité" (finalLocation provided)
        };

        console.log('[Emergency SAVE] Posting to /api/emergency-history...');
        // Envoyer à l'API
        try {
          const response = await api.post('/api/emergency-history', emergencyData);
          console.log('[Emergency SAVE] ✓ Emergency saved successfully:', response.data.data);
        } catch (err) {
          console.error('[Emergency SAVE] ✗ Error saving emergency:', err);
        }
      };

      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.error('[Emergency SAVE] ✗ Error in conversion:', err);
    }
  };

  // Envoyer message utilisateur et obtenir réponse IA
  const handleSendMessage = async (e) => {
    e.preventDefault();
    console.log('[Emergency SEND] Checking conditions - userInput:', !!userInput.trim(), 'loadingAI:', loadingAI);
    if (!userInput.trim() || loadingAI) {
      console.log('[Emergency SEND] Skipping - conditions not met');
      return;
    }

    console.log('[Emergency SEND] Sending message:', userInput);
    const userMessage = { role: 'user', content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setLoadingAI(true);

    try {
      console.log('[Emergency SEND] Calling Claude with', updatedMessages.length, 'messages in history');
      const response = await api.post('/api/claude/assist', {
        level,
        conversationHistory: updatedMessages,
        context: {
          position,
          emergencyNumbers: emergencyNums,
          nearbyPlaces: places,
          vtcOptions: getVTCLinks(places[0])
        }
      });
      console.log('[Emergency SEND] Claude response received');
      const aiMessage = { role: 'assistant', content: response.data.data.message };
      setMessages([...updatedMessages, aiMessage]);
    } catch (err) {
      console.error('[Emergency SEND] Error:', err.message);
      const fallback = { role: 'assistant', content: 'Je suis toujours là pour toi. Que puis-je faire ?' };
      setMessages([...updatedMessages, fallback]);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <PageShell style={{ background: `radial-gradient(80% 50% at 50% 0%, ${HS.dangerSoft}, ${HS.bg} 60%)` }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton to="/dashboard" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: HS.danger,
            boxShadow: `0 0 0 4px ${HS.dangerSoft}`, animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: HS.danger }}>
            ALERTE ACTIVE · {formatTime(elapsed)}
          </span>
        </div>
        <span style={{ width: 40 }} />
      </div>

      <ScrollArea style={{ padding: '20px 16px 24px' }}>
        {/* Conversation avec Lyra */}
        <Card style={{ padding: 18, marginBottom: 16,
          background: `linear-gradient(135deg, ${HS.mistyRose}, ${HS.surface})`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={ICONS.sparkle} size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: HS.sakuraDeep }}>
              LYRA · ASSISTANTE
            </span>
          </div>

          {/* Messages historique */}
          <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 12px', borderRadius: 12,
                  background: msg.role === 'user' ? HS.chocolate : HS.surface,
                  color: msg.role === 'user' ? HS.bg : HS.chocolate,
                  fontSize: 13, lineHeight: 1.4, wordWrap: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loadingAI && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 12px', borderRadius: 12, background: HS.surface }}>
                  <Spinner />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input message */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isListening ? '🎤 Écoute...' : 'Comment tu te sens ?'}
                disabled={loadingAI}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: `1px solid ${isListening ? HS.chocolate : HS.border}`,
                  background: isListening ? HS.bg + 'cc' : HS.bg, color: HS.chocolate, fontFamily: HS.font, fontSize: 13,
                  transition: 'all 0.2s'
                }}
              />
              {isSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={loadingAI}
                  style={{
                    width: 40, height: 40, borderRadius: 10, background: isListening ? HS.chocolate : '#E0E0E0', border: 'none',
                    color: isListening ? HS.bg : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: loadingAI ? 'not-allowed' : 'pointer', opacity: loadingAI ? 0.5 : 1,
                    fontSize: 18, transition: 'all 0.2s'
                  }}
                  title={isListening ? 'Arrêter l\'enregistrement' : 'Parler'}
                >
                  🎤
                </button>
              )}
              <button
                type="submit"
                disabled={!userInput.trim() || loadingAI}
                style={{
                  width: 40, height: 40, borderRadius: 10, background: HS.chocolate, border: 'none',
                  color: HS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: !userInput.trim() || loadingAI ? 'not-allowed' : 'pointer', opacity: !userInput.trim() || loadingAI ? 0.5 : 1,
                }}>
                <Icon d={ICONS.send} size={16} color={HS.bg} />
              </button>
            </form>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <a href="tel:110" style={{ flex: 1, minWidth: 100 }}>
              <button style={{ width: '100%', background: HS.chocolate, border: 'none', color: HS.bg,
                padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                Appeler le 110
              </button>
            </a>
            <button onClick={async () => {
              console.log('[Emergency SAFE] "Je suis en sécurité" clicked');
              // Marquer que on gère la sauvegarde
              recordingHandledRef.current = true;
              // Arrêter l'enregistrement et sauvegarder avec la position finale
              const audioBlob = await stopRecording();
              console.log('[Emergency SAFE] Audio blob:', audioBlob ? 'YES' : 'NO');
              if (audioBlob) {
                // Utiliser la position actuelle comme lieu final (refuge ou dernier endroit connu)
                console.log('[Emergency SAFE] Saving with final location:', position);
                await saveEmergencyWithAudio(audioBlob, position);
              }
              // Aller au dashboard
              console.log('[Emergency SAFE] Navigating to dashboard');
              navigate('/dashboard');
            }}
              style={{ flex: 1, minWidth: 100, background: 'transparent', border: `1.5px solid ${HS.chocolate}`,
                color: HS.chocolate, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 13,
                fontFamily: HS.font }}>
              Je suis en sécurité
            </button>
          </div>
        </Card>

        {/* Numéros d'urgence */}
        <Eyebrow style={{ marginBottom: 10 }}>Numéros d'urgence</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {emergencyNums.slice(0, 4).map((e) => (
            <button key={e.id} onClick={() => handleCallClick(e.number, e.name)}
              style={{ textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Card style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13,
                  background: NUM_COLORS[e.type] || HS.sakuraDeep,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={ICONS.phone} size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontFamily: HS.serif, fontSize: 24, lineHeight: 1, color: HS.chocolate }}>{e.number}</div>
                  <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>{e.name.split(' ')[0]}</div>
                </div>
              </Card>
            </button>
          ))}
        </div>

        {/* Mes contacts d'urgence */}
        {urgentContacts.length > 0 && (
          <>
            <Eyebrow style={{ marginBottom: 10 }}>Mes contacts d'urgence</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {urgentContacts.map((contact) => (
                <button key={contact.id} onClick={() => handleCallClick(contact.phone, contact.name)}
                  style={{ textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Card style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minHeight: 80, justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12,
                      background: HS.sakura,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={ICONS.phone} size={20} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: HS.chocolate, marginBottom: 4 }}>{contact.name}</div>
                      <div style={{ fontFamily: HS.serif, fontSize: 18, lineHeight: 1, color: HS.sakura }}>{contact.phone}</div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Lieux sûrs — Carte */}
        <Eyebrow style={{ marginBottom: 10 }}>Lieux sûrs autour de toi</Eyebrow>
        {places.length > 0 && (
          <div style={{ height: 280, borderRadius: 14, overflow: 'hidden', border: `1px solid ${HS.border}`, marginBottom: 16, position: 'relative' }}>
            <MapContainer
              center={position || { lat: 5.2757, lng: -3.9761 }}
              zoom={14}
              style={{ width: '100%', height: '100%' }}
              attributionControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RoutingControl position={position} selectedPlace={selectedPlace} onClose={() => setSelectedPlace(null)} />
              {/* Vous êtes ici — marqueur central */}
              {position && (
                <CircleMarker
                  center={{ lat: position.lat, lng: position.lng }}
                  radius={8}
                  fillColor={HS.chocolate}
                  fillOpacity={0.9}
                  stroke
                  weight={2}
                  color={HS.sakuraDeep}
                  opacity={1}>
                  <Popup>Tu es ici</Popup>
                </CircleMarker>
              )}
              {/* Lieux sûrs */}
              {places.map((p, i) => (
                <CircleMarker
                  key={`${p.lat}-${p.lng}-${i}`}
                  center={{ lat: p.lat, lng: p.lng }}
                  radius={10}
                  fillColor={HS.safe}
                  fillOpacity={0.7}
                  stroke
                  weight={2}
                  color={HS.safe}
                  opacity={0.9}>
                  <Popup>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: HS.textMute, marginTop: 4 }}>{p.type}</div>
                    {p.phone && <div style={{ fontSize: 11, marginTop: 4 }}><a href={`tel:${p.phone}`}>{p.phone}</a></div>}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Lieux sûrs — Liste */}
        <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {places.length === 0
            ? <div style={{ fontSize: 13, color: HS.textMute, padding: '12px 0' }}>
                {position ? 'Recherche en cours…' : 'Active le GPS pour voir les lieux proches.'}
              </div>
            : places.map((p, i) => (
              <Card key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: HS.mistyRose,
                  color: HS.sakuraDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={ICONS.pin} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: HS.chocolate,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>
                    <span style={{ color: HS.safe, fontWeight: 700 }}>● Ouvert</span> · {p.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedPlace(p)}
                    style={{ background: HS.sakura, border: 'none', color: '#fff',
                      padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: HS.font,
                      cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Itinéraire
                  </button>
                  {p.phone && (
                    <a href={`tel:${p.phone}`}>
                      <button style={{ background: HS.chocolate, border: 'none', color: HS.bg,
                        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: HS.font }}>
                        Appeler
                      </button>
                    </a>
                  )}
                </div>
              </Card>
            ))}
        </div>

        {/* VTC — deep links vers applis */}
        <Eyebrow style={{ marginBottom: 10 }}>Quitter la zone</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {getVTCLinks(position).map((v) => (
            <button key={v.n} onClick={() => handleVtcClick(v.n, v.url)}
              style={{ textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Card style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'transform .1s, opacity .1s', opacity: 0.9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: HS.mistyRose,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={ICONS.car} size={16} color={HS.sakuraDeep} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>{v.n}</div>
                  <div style={{ fontSize: 10.5, color: HS.textMute }}>{v.est}</div>
                </div>
              </Card>
            </button>
          ))}
        </div>

      </ScrollArea>

      {/* Modal confirmation appel d'urgence */}
      <ConfirmationModal
        isOpen={callModal.isOpen}
        title={`Voulez-vous appeler\nla ${callModal.name} (${callModal.number}) ?`}
        description="Un vrai appel sera composé à cette adresse."
        confirmText={`Oui, appeler le ${callModal.number}`}
        cancelText="Annuler"
        isDanger={true}
        onConfirm={confirmCall}
        onCancel={() => setCallModal({ isOpen: false, number: null, name: null })}
      />

      {/* Modal confirmation VTC */}
      <ConfirmationModal
        isOpen={vtcModal.isOpen}
        title={`Ouvrir ${vtcModal.app} ?`}
        description={`L'application ${vtcModal.app} s'ouvrira avec votre destination pré-remplie.`}
        confirmText={`Oui, ouvrir ${vtcModal.app}`}
        cancelText="Annuler"
        onConfirm={confirmVtc}
        onCancel={() => setVtcModal({ isOpen: false, app: null, url: null })}
      />
    </PageShell>
  );
}
