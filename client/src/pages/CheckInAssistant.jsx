import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { HS } from '../tokens';

/**
 * CheckInAssistant - Chat simple avec Claude pour évaluer la situation
 */
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes sans réponse

export function CheckInAssistant({ activeTrack, onClose, onEmergency, onResolve }) {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [riskLevel, setRiskLevel] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT);
  const [hasTimeout, setHasTimeout] = useState(false);
  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);

  // Gérer le timeout d'inactivité
  const handleInactivityTimeout = async () => {
    if (!activeTrack?.id || hasTimeout) return;

    console.log('⏱ Timeout inactivité: utilisatrice ne répond pas depuis 5 min');
    setHasTimeout(true);

    try {
      // Créer alerte niveau 3 (Emergency)
      await api.post('/api/alerts', {
        level: '3',
        location_lat: activeTrack.latest_lat,
        location_lng: activeTrack.latest_lng,
        notes: 'Timeout inactivité check-in assistant (5 min sans réponse)',
      });

      // Envoyer SMS d'urgence aux contacts
      await api.post('/api/sms/alert', {
        alert_id: activeTrack.id,
        level: 3,
        hasLocation: true,
      });

      // Message d'alerte à l'utilisatrice
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '⏱ Tes contacts ont été alertés parce que tu n\'as pas répondu. Ils reçoivent ta position en ce moment.'
      }]);

      // Optionnellement rediriger vers Emergency
      setTimeout(() => onEmergency?.(), 2000);
    } catch (err) {
      console.error('Erreur timeout:', err);
    }
  };

  // Démarrer le timer d'inactivité
  const startInactivityTimer = () => {
    // Arrêter le countdown s'il existe
    if (countdownRef.current) clearInterval(countdownRef.current);

    setTimeRemaining(INACTIVITY_TIMEOUT);

    // Countdown visible
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          clearInterval(countdownRef.current);
          handleInactivityTimeout();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    // Main timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT);
  };

  // Réinitialiser le timer à chaque message utilisateur
  const resetInactivityTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    startInactivityTimer();
  };

  // Initialiser la conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setIsLoading(true);

        // 🚨 NOTIFIER LES CONTACTS IMMÉDIATEMENT
        console.log('[CheckIn] 📞 Notifiant les contacts...');
        await api.post('/api/sms/alert', {
          level: '2',
        }).catch(err => console.warn('[CheckIn] SMS notification:', err.message));

        // Puis commencer l'évaluation avec Lyra
        const response = await api.post('/api/claude/assist', {
          level: '2',
          context: 'utilisatrice a cliqué "je vais pas bien" lors d\'un check-in',
          conversationHistory: [],
          mode: 'evaluator',
        });

        const data = response.data.data || {};
        const assistantMessage = data.message || 'Bonjour, je suis là pour toi.';
        setMessages([{ role: 'assistant', content: assistantMessage }]);

        if (data.riskLevel) {
          setRiskLevel(data.riskLevel);
        }
      } catch (err) {
        console.error('Erreur initialisation:', err);
        setMessages([{ role: 'assistant', content: 'Bonjour, je suis là pour toi. Raconte-moi ce qui se passe.' }]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeConversation();

    // Démarrer le timer d'inactivité
    startInactivityTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Scroller vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || hasTimeout) return;

    // Réinitialiser le timer à chaque message
    resetInactivityTimer();

    const userMessage = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/claude/assist', {
        level: '2',
        context: 'évaluation de situation lors d\'un check-in',
        conversationHistory: messages.concat(userMessage),
        mode: 'evaluator',
      });

      const data = response.data.data || {};
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message || 'Je comprends.' }]);

      if (data.riskLevel) {
        setRiskLevel(data.riskLevel);

        // Si haute risque, escalader automatiquement
        if (data.riskLevel === 'high') {
          setTimeout(() => handleActivateEmergency(), 1000);
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Escalader vers Emergency
  const handleActivateEmergency = async () => {
    if (!activeTrack?.id) return;

    try {
      await api.post('/api/alerts', {
        level: '3',
        location_lat: activeTrack.latest_lat,
        location_lng: activeTrack.latest_lng,
        notes: 'Escalade depuis check-in assistant',
      });

      await api.post('/api/sms/alert', {
        alert_id: activeTrack.id,
        level: 3,
      });

      onEmergency?.();
    } catch (err) {
      console.error('Erreur escalade:', err);
    }
  };

  // Résoudre
  const handleResolve = async () => {
    if (!activeTrack?.id) return;

    try {
      await api.patch(`/api/tracks/${activeTrack.id}/checkin`, { response: 'ok' });
      onResolve?.();
    } catch (err) {
      console.error('Erreur résolution:', err);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[420px] rounded-3xl flex flex-col z-50 shadow-xl overflow-hidden" style={{ background: '#FBF1EA', height: '600px' }}>

      {/* Header avec avatar Lyra */}
      <div className="pt-6 pb-4 px-6 text-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})` }}>
        <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <span className="text-2xl">✨</span>
        </div>
        <h2 className="text-white font-bold text-xl">LYRA</h2>
        <p className="text-white/70 text-xs mt-0.5">Je suis là pour toi</p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>

      {/* Messages + Status (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 flex flex-col">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white font-medium'
                  : 'text-[#333] font-normal'
              }`}
              style={{
                background: msg.role === 'user' ? HS.sakura : '#F0E6E6'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl text-sm" style={{ background: '#F0E6E6', color: HS.chocolate }}>
              <span className="animate-pulse">✨ Lyra réfléchit...</span>
            </div>
          </div>
        )}

        {/* Inline Status */}
        {riskLevel && (
          <div className="text-center text-xs mt-2 pt-2" style={{ borderTop: '1px solid #E8D7D7' }}>
            {riskLevel === 'low' && <span style={{ color: '#1B5E20' }}>✓ Situation maîtrisée</span>}
            {riskLevel === 'medium' && <span style={{ color: '#FF6F00' }}>⚠ À surveiller</span>}
            {riskLevel === 'high' && <span style={{ color: HS.danger }}>Escalade...</span>}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input + Actions (Fixed at bottom) */}
      <form onSubmit={handleSendMessage} className="px-5 py-4 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid #E8D7D7' }}>
        {/* Message input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Dis-moi..."
            className="flex-1 text-sm px-4 py-2 rounded-full focus:outline-none"
            style={{ background: '#F0E6E6', color: '#333', border: `1px solid ${HS.sakura}30` }}
            disabled={isLoading || hasTimeout}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || hasTimeout}
            className="w-9 h-9 rounded-full text-white font-bold flex items-center justify-center transition hover:opacity-90 disabled:opacity-40 text-lg"
            style={{ background: HS.sakura }}
          >
            →
          </button>
        </div>

        {/* Action buttons */}
        {riskLevel !== 'high' && (
          <div className="flex gap-2">
            {riskLevel === 'low' ? (
              <button
                type="button"
                onClick={handleResolve}
                className="flex-1 py-2 rounded-full font-bold text-white text-sm transition"
                style={{ background: '#1B5E20' }}
              >
                ✓ Tout va bien
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivateEmergency}
                className="flex-1 py-2 rounded-full font-bold text-white text-sm transition"
                style={{ background: HS.danger }}
              >
                J'ai besoin d'aide
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
