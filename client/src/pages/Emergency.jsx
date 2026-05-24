import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGPS } from '../hooks/useGPS';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Card, Eyebrow, BackButton, PageShell, ScrollArea, Spinner } from '../components/ui/index.jsx';
// Cartes enlever pour performance — garder juste les listes

const NUM_COLORS = { police: '#4A6B8A', pompiers: '#C97B3B', hopital: '#5C7F4F', gendarmerie: '#5C5C8A', autre: HS.sakuraDeep };
const VTC = [{ n: 'Yango', est: '3 min · 1.2K F' }, { n: 'Heetch', est: '5 min · 1.5K F' }];

export default function Emergency() {
  const { state }   = useLocation();
  const navigate    = useNavigate();
  const { position } = useGPS();

  const [emergencyNums, setEmergencyNums] = useState([]);
  const [places, setPlaces]               = useState([]);
  const [messages, setMessages]           = useState([]); // Conversation history
  const [userInput, setUserInput]         = useState('');
  const [loadingAI, setLoadingAI]         = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Niveaux 3 et 4 fusionnés : tout va au niveau 3 complet
  const level = '3';

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

  // Lieux sûrs — désactivé pour performance (Overpass trop lent)
  // useEffect(() => {
  //   if (!position) return;
  //   api.get(`/api/places?lat=${position.lat}&lng=${position.lng}&radius=1000`)
  //     .then((r) => {
  //       const data = r.data.data || [];
  //       setPlaces(data.slice(0, 3));
  //     })
  //     .catch((err) => {
  //       console.error('Erreur lieux sûrs:', err.message);
  //       setPlaces([]);
  //     });
  // }, [position]);

  // Init: Appel initial à Claude pour commencer la conversation
  useEffect(() => {
    if (messages.length > 0) return; // Déjà initialisé

    setLoadingAI(true);
    api.post('/api/claude/assist', { level, conversationHistory: [] })
      .then((r) => {
        const initialMessage = { role: 'assistant', content: r.data.data.message };
        setMessages([initialMessage]);
      })
      .catch(() => {
        const fallback = { role: 'assistant', content: 'Reste calme. Éloigne-toi calmement si possible. Le 110 est disponible.' };
        setMessages([fallback]);
      })
      .finally(() => setLoadingAI(false));
  }, []);

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        {/* Conversation avec Aïcha */}
        <Card style={{ padding: 18, marginBottom: 16,
          background: `linear-gradient(135deg, ${HS.mistyRose}, ${HS.surface})`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={ICONS.sparkle} size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: HS.sakuraDeep }}>
              AÏCHA · ASSISTANTE
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
            <a key={e.id} href={`tel:${e.number}`} style={{ textDecoration: 'none' }}>
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
            </a>
          ))}
        </div>

        {/* Lieux sûrs */}
        <Eyebrow style={{ marginBottom: 10 }}>Lieux sûrs autour de toi</Eyebrow>
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
                {p.phone && (
                  <a href={`tel:${p.phone}`}>
                    <button style={{ background: HS.chocolate, border: 'none', color: HS.bg,
                      padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: HS.font }}>
                      Appeler
                    </button>
                  </a>
                )}
              </Card>
            ))}
        </div>

        {/* VTC */}
        <Eyebrow style={{ marginBottom: 10 }}>Quitter la zone</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {VTC.map((v) => (
            <Card key={v.n} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: HS.mistyRose,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ICONS.car} size={16} color={HS.sakuraDeep} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>{v.n}</div>
                <div style={{ fontSize: 10.5, color: HS.textMute }}>{v.est}</div>
              </div>
            </Card>
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
    </PageShell>
  );
}
