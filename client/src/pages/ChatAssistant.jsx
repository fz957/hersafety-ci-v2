import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { HS } from '../tokens';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

// Animations CSS
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .animate-bounce {
    animation: bounce 1s infinite;
  }
`;

/**
 * ChatAssistant - Interface girly et soignée pour discuter avec Lyra
 */
export function ChatAssistant({ activeTrack, onClose }) {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { isListening, transcript, toggleListening, clearTranscript, isSupported } = useSpeechRecognition();

  // Injecter styles
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  // Initialiser la conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setIsLoading(true);
        const response = await api.post('/api/claude/assist', {
          level: '1',
          context: 'Conversation libre avec Lyra sur ta sécurité et ton bien-être',
          conversationHistory: [],
          mode: 'default',
        });

        const data = response.data.data || {};
        const assistantMessage = data.message || 'Bonjour, je suis Lyra ✨ Comment ça va aujourd\'hui?';
        setMessages([{ role: 'assistant', content: assistantMessage }]);
      } catch (err) {
        console.error('Erreur initialisation IA:', err);
        setMessages([{ role: 'assistant', content: 'Bonjour, je suis Lyra ✨ Comment ça va aujourd\'hui?' }]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeConversation();
  }, []);

  // Scroller vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Traiter la transcription vocale
  useEffect(() => {
    if (!isListening && transcript && transcript.trim() !== '🎤') {
      const cleaned = transcript.replace('🎤', '').trim();
      setUserInput(cleaned);
      clearTranscript();
    }
  }, [isListening, transcript, clearTranscript]);

  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage = { role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/claude/assist', {
        level: '1',
        context: 'Conversation libre',
        conversationHistory: messages.concat(userMessage),
        mode: 'default',
      });

      const data = response.data.data || {};
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message || 'Je comprends.' }]);
    } catch (err) {
      console.error('Erreur:', err);
      const errorMsg = {
        role: 'assistant',
        content: 'Oups, une petite erreur. Peux-tu réessayer?',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: `linear-gradient(180deg, #FFF5F8 0%, #F5F0FF 100%)`,
      color: '#2d2d2d',
    }}>
      {/* Header - Girly & Soigné */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(194,24,91,0.1)',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 2px 12px rgba(194,24,91,0.08)',
      }}>
        {/* Avatar Girly */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, #FFB6D9 0%, #FFD4E5 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 6px 20px rgba(255,150,200,0.3)`,
          border: '2px solid rgba(255,200,230,0.6)',
        }}>
          ✨
        </div>

        {/* Infos */}
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#C2185B',
            margin: 0,
            letterSpacing: -0.3,
          }}>Lyra</h2>
          <p style={{
            fontSize: 12,
            color: '#D997B8',
            margin: '4px 0 0',
            fontWeight: 600,
          }}>Ton assistante bienveillante ✨</p>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#D997B8',
              padding: 8,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#C2185B'}
            onMouseLeave={(e) => e.target.style.color = '#D997B8'}
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages - Girly & Doux */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="animate-fadeIn"
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: '14px 18px',
                borderRadius: 24,
                fontSize: 14,
                lineHeight: 1.6,
                fontWeight: 500,
                background: msg.role === 'user'
                  ? `linear-gradient(135deg, #FFB6D9 0%, #FF9EC9 100%)`
                  : `rgba(255, 255, 255, 0.7)`,
                color: msg.role === 'user' ? '#fff' : '#2d2d2d',
                boxShadow: msg.role === 'user'
                  ? `0 4px 16px rgba(255,150,200,0.25)`
                  : `0 2px 8px rgba(194,24,91,0.1)`,
                border: msg.role === 'user'
                  ? 'none'
                  : '1px solid rgba(255,150,200,0.2)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 24,
                background: `rgba(255, 255, 255, 0.7)`,
                border: '1px solid rgba(255,150,200,0.2)',
                display: 'flex',
                gap: 6,
              }}
            >
              <div
                className="animate-bounce"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFB6D9',
                }}
              />
              <div
                className="animate-bounce"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFB6D9',
                  animationDelay: '0.1s',
                }}
              />
              <div
                className="animate-bounce"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFB6D9',
                  animationDelay: '0.2s',
                }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Girly & Soigné */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '20px 24px 32px',
          borderTop: '1px solid rgba(194,24,91,0.1)',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={isListening ? '🎤 Écoute...' : 'Dis-moi ce qui te préoccupe...'}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: 28,
            border: `1.5px solid ${isListening ? '#FFB6D9' : 'rgba(255,150,200,0.3)'}`,
            background: isListening ? 'rgba(255,182,217,0.1)' : 'rgba(255,255,255,0.9)',
            color: '#2d2d2d',
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(194,24,91,0.08)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#FFB6D9';
            e.target.style.boxShadow = '0 4px 16px rgba(255,150,200,0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,150,200,0.3)';
            e.target.style.boxShadow = '0 2px 8px rgba(194,24,91,0.08)';
          }}
          disabled={isLoading}
          autoFocus
        />
        {isSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isListening ? '#FFB6D9' : '#FFE0ED',
              color: isListening ? 'white' : '#FF7AB2',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.3s',
              boxShadow: isListening ? '0 4px 16px rgba(255,150,200,0.4)' : '0 2px 8px rgba(255,150,200,0.2)',
            }}
            title={isListening ? 'Arrêter l\'enregistrement' : 'Parler'}
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          style={{
            padding: '14px 24px',
            borderRadius: 28,
            border: 'none',
            background: isLoading || !userInput.trim()
              ? '#E8C5D5'
              : `linear-gradient(135deg, #FFB6D9 0%, #FF9EC9 100%)`,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: isLoading || !userInput.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            boxShadow: !isLoading && userInput.trim()
              ? `0 6px 20px rgba(255,150,200,0.3)`
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && userInput.trim()) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 24px rgba(255,150,200,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            if (!isLoading && userInput.trim()) {
              e.target.style.boxShadow = '0 6px 20px rgba(255,150,200,0.3)';
            }
          }}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
