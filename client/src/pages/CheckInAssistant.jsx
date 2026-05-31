import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon } from '../components/ui/index.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

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
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const { isListening, transcript, toggleListening, clearTranscript, isSupported } = useSpeechRecognition();


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

  // Traiter la transcription vocale
  useEffect(() => {
    if (!isListening && transcript && transcript.trim() !== '🎤') {
      const cleaned = transcript.replace('🎤', '').trim();
      setUserInput(cleaned);
      clearTranscript();
    }
  }, [isListening, transcript]);

  // Initialiser la conversation
  useEffect(() => {
    console.log('========== [CheckIn INIT] Starting initialization ==========');
    const initializeConversation = async () => {
      try {
        console.log('[CheckIn INIT] Setting loading...');
        setIsLoading(true);

        // 🚨 NOTIFIER LES CONTACTS IMMÉDIATEMENT
        console.log('[CheckIn INIT] 📞 Notifying contacts via SMS...');
        await api.post('/api/sms/alert', {
          level: '2',
        }).catch(err => {
          console.warn('[CheckIn INIT] SMS notification error:', err.response?.data?.error || err.message);
        });

        // Puis commencer l'évaluation avec Lyra
        console.log('[CheckIn INIT] Calling Claude /assist...');
        const response = await api.post('/api/claude/assist', {
          level: '2',
          context: 'utilisatrice a cliqué "je vais pas bien" lors d\'un check-in',
          conversationHistory: [],
          mode: 'evaluator',
        });

        console.log('[CheckIn INIT] Claude response received');
        const data = response.data.data || {};
        const assistantMessage = data.message || 'Bonjour, je suis là pour toi.';
        console.log('[CheckIn INIT] Setting initial message:', assistantMessage.substring(0, 50) + '...');
        setMessages([{ role: 'assistant', content: assistantMessage }]);

        if (data.riskLevel) {
          console.log('[CheckIn INIT] Risk level:', data.riskLevel);
          setRiskLevel(data.riskLevel);
        }
      } catch (err) {
        console.error('[CheckIn INIT] Error:', err);
        setMessages([{ role: 'assistant', content: 'Bonjour, je suis là pour toi. Raconte-moi ce qui se passe.' }]);
      } finally {
        console.log('[CheckIn INIT] Setting loading false');
        setIsLoading(false);
        console.log('========== [CheckIn INIT] Completed ==========');
      }
    };

    initializeConversation();

    // Démarrer le timer d'inactivité
    console.log('[CheckIn INIT] Starting inactivity timer');
    startInactivityTimer();

    // Cleanup
    return () => {
      console.log('[CheckIn CLEANUP] Clearing timers');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Charger les contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const response = await api.get('/api/contacts');
        setContacts(response.data.data || []);
      } catch (err) {
        console.error('Erreur chargement contacts:', err);
        setContacts([]);
      }
    };
    loadContacts();
  }, []);


  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    console.log('[CheckIn SEND] Checking conditions - input:', !!userInput.trim(), 'loading:', isLoading, 'timeout:', hasTimeout);
    if (!userInput.trim() || isLoading || hasTimeout) {
      console.log('[CheckIn SEND] Conditions not met, returning');
      return;
    }

    console.log('[CheckIn SEND] Message:', userInput);
    // Réinitialiser le timer à chaque message
    resetInactivityTimer();

    const userMessage = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      console.log('[CheckIn SEND] Calling Claude...');
      const response = await api.post('/api/claude/assist', {
        level: '2',
        context: 'évaluation de situation lors d\'un check-in',
        conversationHistory: messages.concat(userMessage),
        mode: 'evaluator',
      });

      console.log('[CheckIn SEND] Claude response received');
      const data = response.data.data || {};
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message || 'Je comprends.' }]);

      if (data.riskLevel) {
        console.log('[CheckIn SEND] Risk level:', data.riskLevel);
        setRiskLevel(data.riskLevel);

        // Si haute risque, escalader automatiquement
        if (data.riskLevel === 'high') {
          console.log('[CheckIn SEND] High risk detected - escalating in 1s');
          setTimeout(() => handleActivateEmergency(), 1000);
        }
      }
    } catch (err) {
      console.error('[CheckIn SEND] Error:', err);
    } finally {
      console.log('[CheckIn SEND] Setting loading false');
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
        level: '3',
      }).catch(err => {
        console.warn('[CheckIn] SMS escalade error:', err.response?.data?.error || err.message);
      });

      onEmergency?.();
    } catch (err) {
      console.error('Erreur escalade:', err.response?.data?.error || err.message);
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
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '420px',
      height: '600px',
      background: '#FBF1EA',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
      overflow: 'hidden'
    }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
        padding: '24px 24px 16px',
        textAlign: 'center',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
        <h2 style={{ color: 'white', fontWeight: 'bold', fontSize: '20px', margin: 0 }}>LYRA</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '4px 0 0 0' }}>Je suis là pour toi</p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', margin: '2px 0 0 0' }}>🎤 {isSupported ? 'Voice OK' : 'Voice NOT supported'}</p>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages (Scrollable) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* DEBUG: Show mic status */}
        <div style={{
          padding: '8px 12px',
          background: isSupported ? '#D4EDDA' : '#F8D7DA',
          color: isSupported ? '#155724' : '#721C24',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          🎤 {isSupported ? '✅ MICRO OK' : '❌ MICRO NON DISPONIBLE'}
        </div>

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '280px',
                padding: '10px 16px',
                borderRadius: '16px',
                fontSize: '14px',
                lineHeight: '1.5',
                background: msg.role === 'user' ? HS.sakura : '#F0E6E6',
                color: msg.role === 'user' ? 'white' : '#333',
                fontWeight: msg.role === 'user' ? '500' : 'normal'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              background: '#F0E6E6',
              color: HS.chocolate
            }}>
              <span style={{ opacity: 0.6 }}>✨ Lyra réfléchit...</span>
            </div>
          </div>
        )}

        {/* Status inline */}
        {riskLevel && (
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #E8D7D7',
            color: riskLevel === 'low' ? '#1B5E20' : riskLevel === 'medium' ? '#FF6F00' : HS.danger
          }}>
            {riskLevel === 'low' && '✓ Situation maîtrisée'}
            {riskLevel === 'medium' && '⚠ À surveiller'}
            {riskLevel === 'high' && 'Escalade...'}
          </div>
        )}

        {/* Contacts section */}
        {contacts.length > 0 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '2px solid #E8D7D7'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: HS.chocolate,
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              📞 Veux-tu appeler l'un de tes contacts ?
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: HS.surface2 || '#F8E7DD',
                    borderRadius: '12px',
                    border: `1px solid ${HS.borderStrong || '#E8D7D7'}`
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: HS.chocolate,
                      marginBottom: '2px'
                    }}>
                      {contact.full_name}
                    </div>
                    {contact.phone && (
                      <div style={{
                        fontSize: '11px',
                        color: HS.textMute,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {contact.phone}
                      </div>
                    )}
                  </div>
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        background: HS.sakura,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#fff',
                        display: 'flex',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}>
                        <Icon d={ICONS.phone} size={16} />
                      </button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input + Buttons (Fixed) */}
      <form onSubmit={handleSendMessage} style={{
        padding: '16px 20px',
        borderTop: '1px solid #E8D7D7',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexShrink: 0
      }}>
        {/* Input */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isListening ? '🎤 Écoute...' : 'Dis-moi...'}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '20px',
              border: `1px solid ${isListening ? HS.sakura : HS.sakura + '40'}`,
              background: isListening ? HS.sakura + '10' : '#F0E6E6',
              color: '#333',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
            disabled={isLoading || hasTimeout}
          />
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading || hasTimeout}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isListening ? HS.sakura : '#E0E0E0',
                color: isListening ? 'white' : '#666',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading || hasTimeout ? 0.4 : 1,
                transition: 'all 0.2s'
              }}
              title={isListening ? 'Arrêter l\'enregistrement' : 'Parler'}
            >
              🎤
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || hasTimeout}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: HS.sakura,
              color: 'white',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading || !userInput.trim() || hasTimeout ? 0.4 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            →
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {riskLevel !== 'high' && (
            <button
              type={riskLevel === 'low' ? 'button' : 'button'}
              onClick={riskLevel === 'low' ? handleResolve : handleActivateEmergency}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '20px',
                background: riskLevel === 'low' ? '#1B5E20' : HS.danger,
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {riskLevel === 'low' ? '✓ Tout va bien' : 'J\'ai besoin d\'aide'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '20px',
              background: HS.warn,
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Ne me demande plus
          </button>
        </div>
      </form>
    </div>
  );
}
