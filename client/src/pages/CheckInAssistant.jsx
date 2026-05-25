import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

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
        if (activeTrack?.id) {
          console.log('[CheckIn] 📞 Notifiant les contacts...');
          await api.post('/api/sms/alert', {
            alert_id: activeTrack.id,
            level: '2',
          }).catch(err => console.warn('[CheckIn] SMS notification:', err.message));
        }

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
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-[#C2185B]/30 bg-[#0D0D0D] flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">Claude - Assistante</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#C2185B] text-white'
                  : 'bg-[#880E4F] text-gray-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#880E4F] text-gray-100 px-4 py-2 rounded-lg text-sm">
              <span className="animate-pulse">Claude réfléchit...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Risk Indicator + Timer */}
      <div className="px-4 py-2 text-center text-xs font-semibold bg-[#0D0D0D] border-t border-[#C2185B]/30 space-y-1">
        {riskLevel && (
          <>
            {riskLevel === 'low' && <span className="text-green-400 block">✓ Situation maîtrisée</span>}
            {riskLevel === 'medium' && <span className="text-yellow-400 block">⚠ Situation à surveiller</span>}
            {riskLevel === 'high' && <span className="text-red-500 block">🚨 Escalade vers Emergency</span>}
          </>
        )}
        {!hasTimeout && (
          <div className="text-gray-400">
            ⏱ {Math.floor(timeRemaining / 1000)}s avant notification
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#0D0D0D] border-t border-[#C2185B]/30 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={hasTimeout ? "Tes contacts ont été alertés..." : "Votre message..."}
            className="flex-1 bg-[#1a1a1a] text-white border border-[#C2185B]/30 rounded px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-[#C2185B]"
            disabled={isLoading || hasTimeout}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || hasTimeout}
            className="bg-[#C2185B] text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 hover:bg-[#880E4F] transition"
          >
            Envoyer
          </button>
        </div>

        {/* Boutons d'action */}
        {riskLevel !== 'high' && (
          <div className="flex gap-2 text-xs">
            {riskLevel === 'low' ? (
              <button
                type="button"
                onClick={handleResolve}
                className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
              >
                ✓ Tout va bien
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleActivateEmergency}
                  className="flex-1 bg-[#C2185B] text-white py-2 rounded font-semibold hover:bg-[#880E4F] transition"
                >
                  J'ai besoin d'aide
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
