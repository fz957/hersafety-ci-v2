import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useGPS } from '../hooks/useGPS';
import { useOverpassPOIs } from '../hooks/useOverpassPOIs';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Card, Eyebrow, BackButton, PageShell, ScrollArea, Spinner } from '../components/ui/index.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

const NUM_COLORS = { police: '#4A6B8A', pompiers: '#C97B3B', hopital: '#5C7F4F', gendarmerie: '#5C5C8A', autre: HS.sakuraDeep };

// Component to display routing on the map
function RoutingControl({ start, end }) {
  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    // Remove old routing if it exists
    if (routingRef.current) {
      map.removeControl(routingRef.current);
    }

    // Create new routing control
    routingRef.current = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: HS.sakura, weight: 4, opacity: 0.8 }]
      },
      altLineOptions: {
        styles: [{ color: HS.sakura, weight: 3, opacity: 0.3 }]
      }
    }).addTo(map);

    return () => {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
      }
    };
  }, [map, start, end]);

  return null;
}

// Véhicules de transport avec lieux de destination sûrs pré-remplis
const getVTCLinks = (position) => {
  const defaultDest = { lat: 6.8276, lng: -5.2893 }; // Centre-ville Abidjan par défaut
  const dest = position || defaultDest;

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
  const { position } = useGPS({ watch: true });

  const [emergencyNums, setEmergencyNums] = useState([]);
  const [places, setPlaces]               = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); // For routing
  const [messages, setMessages]           = useState([]); // Conversation history
  const [userInput, setUserInput]         = useState('');
  const [loadingAI, setLoadingAI]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [loadingPOIs, setLoadingPOIs]     = useState(false);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Charger POIs depuis Overpass
  const { pois, loading: poiLoading } = useOverpassPOIs(position?.lat, position?.lng, 10);

  // Modals de confirmation
  const [callModal, setCallModal]         = useState({ isOpen: false, number: null, name: null });
  const [vtcModal, setVtcModal]           = useState({ isOpen: false, app: null, url: null });

  // Niveaux 3 et 4 fusionnés : tout va au niveau 3 complet
  const level = '3';

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

  // Chrono
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Numéros d'urgence
  useEffect(() => {
    api.get('/api/emergency-numbers').then((r) => setEmergencyNums(r.data.data)).catch(() => {});
  }, []);

  // Lieux sûrs — /api/places primary (has distributed locations), Overpass supplemental
  useEffect(() => {
    if (!position) return;

    console.log('[Emergency] Cherchant lieux sûrs pour', position.lat.toFixed(4), position.lng.toFixed(4));

    // Primary: Use /api/places (distributed across Abidjan including Bietry)
    api.get(`/api/places?lat=${position.lat}&lng=${position.lng}&radius=10000`)
      .then((r) => {
        const apiPlaces = r.data.data || [];
        console.log('[Emergency] API places trouvés:', apiPlaces.length);

        // Combine with Overpass results if available (for areas with good OSM data)
        if (pois && pois.length > 0) {
          console.log('[Emergency] Augmentant avec', pois.length, 'Overpass POIs');
          const combined = [...apiPlaces, ...pois];
          // Remove duplicates by location
          const unique = combined.reduce((acc, p) => {
            const exists = acc.find(x => Math.abs(x.lat - p.lat) < 0.001 && Math.abs(x.lng - p.lng) < 0.001);
            return exists ? acc : [...acc, p];
          }, []);
          setPlaces(unique.slice(0, 5));
        } else {
          setPlaces(apiPlaces.slice(0, 5));
        }
      })
      .catch((err) => {
        console.error('[Emergency] Erreur places:', err.message);
        // Fallback to Overpass if API fails
        if (pois && pois.length > 0) {
          console.log('[Emergency] Fallback Overpass:', pois.length);
          setPlaces(pois.slice(0, 5));
        } else {
          setPlaces([]);
        }
      });
  }, [position, pois]);

  // Init: Appel initial à Claude pour commencer la conversation
  useEffect(() => {
    if (messages.length > 0) return; // Déjà initialisé

    setLoadingAI(true);
    api.post('/api/claude/assist', {
      level,
      conversationHistory: [],
      context: {
        position,
        emergencyNumbers: emergencyNums,
        nearbyPlaces: places,
        vtcOptions: getVTCLinks(position)
      }
    })
      .then((r) => {
        const initialMessage = { role: 'assistant', content: r.data.data.message };
        setMessages([initialMessage]);
      })
      .catch(() => {
        const fallback = { role: 'assistant', content: 'Reste calme. Éloigne-toi calmement si possible. Le 110 est disponible.' };
        setMessages([fallback]);
      })
      .finally(() => setLoadingAI(false));
  }, [position, emergencyNums, places]);

  // Pas de scroll auto - chaque seconde compte en urgence

  // Envoyer message utilisateur et obtenir réponse IA
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loadingAI) return;

    const userMessage = { role: 'user', content: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setLoadingAI(true);

    try {
      const response = await api.post('/api/claude/assist', {
        level,
        conversationHistory: updatedMessages,
        context: {
          position,
          emergencyNumbers: emergencyNums,
          nearbyPlaces: places,
          vtcOptions: getVTCLinks(position)
        }
      });
      const aiMessage = { role: 'assistant', content: response.data.data.message };
      setMessages([...updatedMessages, aiMessage]);
    } catch (err) {
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
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Comment tu te sens ?"
              disabled={loadingAI}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: `1px solid ${HS.border}`,
                background: HS.bg, color: HS.chocolate, fontFamily: HS.font, fontSize: 13,
              }}
            />
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
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <a href="tel:110" style={{ flex: 1 }}>
              <button style={{ width: '100%', background: HS.chocolate, border: 'none', color: HS.bg,
                padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                Appeler le 110
              </button>
            </a>
            <button onClick={() => navigate('/dashboard')}
              style={{ flex: 1, background: 'transparent', border: `1.5px solid ${HS.chocolate}`,
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

        {/* Lieux sûrs — Carte */}
        <Eyebrow style={{ marginBottom: 10 }}>Lieux sûrs autour de toi</Eyebrow>
        {places.length > 0 && (
          <div style={{ height: 280, borderRadius: 14, overflow: 'hidden', border: `1px solid ${HS.border}`, marginBottom: 16 }}>
            <MapContainer
              center={position || { lat: 6.8276, lng: -5.2893 }}
              zoom={14}
              style={{ width: '100%', height: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Display routing if a place is selected */}
              {selectedPlace && position && (
                <RoutingControl start={position} end={selectedPlace} />
              )}
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

        {/* Escalade */}
        <button
          onClick={() => {/* Escalade niveau supérieur */}}
          style={{
            width: '100%', minHeight: 60, borderRadius: 18,
            background: HS.danger, color: '#fff', border: 'none',
            fontWeight: 800, fontSize: 15, letterSpacing: 0.3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 24px rgba(178,58,72,0.35)', fontFamily: HS.font,
          }}
        >
          <Icon d={ICONS.alert} size={20} color="#fff" />
          ESCALADER — Police + vidéo live
        </button>
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
