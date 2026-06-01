import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AdminAssistant() {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour! 👋 Comment je peux aider l\'admin aujourd\'hui?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { label: '📊 Résumé du jour', mode: 'summary', icon: '📊' },
    { label: '🚨 Alertes critiques', mode: 'alerts', icon: '🚨' },
    { label: '📍 Zones dangereuses', mode: 'reports', icon: '📍' },
    { label: '🗣️ Modération suggérée', mode: 'moderation', icon: '🗣️' },
    { label: '🔍 Anomalies détectées', mode: 'anomalies', icon: '🔍' },
  ];

  const handleQuickAction = async (mode) => {
    const action = quickActions.find(a => a.mode === mode);
    const userMessage = action.label;

    // Ajouter le message utilisateur
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/api/admin-assist', {
        mode: mode,
        question: userMessage,
        conversationHistory: messages
      });

      if (response.data?.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.message
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Erreur: ' + (response.data?.error || 'Impossible de traiter')
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erreur réseau. Vérifiez votre connexion.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/api/admin-assist', {
        mode: 'chat',
        question: userMessage,
        conversationHistory: messages
      });

      if (response.data?.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.message
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Erreur: ' + (response.data?.error || 'Impossible de traiter')
        }]);
      }
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erreur réseau. Vérifiez votre connexion.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant pour ouvrir/fermer */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: theme.chocolate,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 999,
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          title="Assistant IA"
        >
          🤖
        </button>
      )}

      {/* Chatbox */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 420,
          maxHeight: 600,
          background: theme.surface,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.chocolate,
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              🤖 Assistant IA Admin
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 18,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.4,
                  background: msg.role === 'user' ? theme.chocolate : theme.bg,
                  color: msg.role === 'user' ? '#fff' : theme.text,
                  wordWrap: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
              }}>
                <div style={{
                  padding: '10px 12px',
                  background: theme.bg,
                  borderRadius: 10,
                  color: theme.textMute,
                  fontSize: 12,
                  fontStyle: 'italic',
                }}>
                  ⏳ Traitement...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (affichés si peu de messages) */}
          {messages.length <= 1 && (
            <div style={{
              padding: '12px 16px',
              borderTop: `1px solid ${theme.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              maxHeight: 120,
              overflowY: 'auto',
            }}>
              {quickActions.map((action) => (
                <button
                  key={action.mode}
                  onClick={() => handleQuickAction(action.mode)}
                  disabled={loading}
                  style={{
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.text,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.target.style.background = theme.chocolate + '20';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = theme.bg;
                  }}
                >
                  {action.icon} {action.mode === 'summary' ? 'Résumé' : action.mode === 'alerts' ? 'Alertes' : action.mode === 'reports' ? 'Zones' : action.mode === 'moderation' ? 'Modération' : 'Anomalies'}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px',
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.bg,
                color: theme.text,
                fontSize: 12,
                fontFamily: 'inherit',
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: theme.chocolate,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 700,
                opacity: (loading || !input.trim()) ? 0.6 : 1,
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
