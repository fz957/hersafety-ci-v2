import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function VerifyEmail() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token de vérification manquant');
        return;
      }

      try {
        const response = await api.get(`/api/auth/verify-email?token=${token}`);

        if (response.data?.success) {
          setStatus('success');
          setMessage('Email vérifié! Redirection...');

          // Rediriger vers dashboard après 2 secondes
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(response.data?.error || 'Erreur lors de la vérification');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Erreur vérification email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: theme.bg,
      padding: '20px',
    }}>
      <div style={{
        background: theme.surface,
        borderRadius: 16,
        border: `1px solid ${theme.border}`,
        padding: '40px',
        maxWidth: 400,
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              fontSize: 48,
              marginBottom: 20,
              animation: 'spin 2s linear infinite',
            }}>
              ⏳
            </div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: theme.text,
              marginBottom: 12,
            }}>
              Vérification en cours...
            </h2>
            <p style={{
              fontSize: 14,
              color: theme.textMute,
            }}>
              Un moment s'il vous plaît...
            </p>

            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: 48,
              marginBottom: 20,
            }}>
              ✓
            </div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: theme.safe,
              marginBottom: 12,
            }}>
              Email vérifié!
            </h2>
            <p style={{
              fontSize: 14,
              color: theme.textMute,
              marginBottom: 20,
            }}>
              Votre compte a été créé avec succès. Redirection...
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: theme.chocolate,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Aller au dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: 48,
              marginBottom: 20,
            }}>
              ✗
            </div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: theme.danger,
              marginBottom: 12,
            }}>
              Erreur de vérification
            </h2>
            <p style={{
              fontSize: 14,
              color: theme.textMute,
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: theme.chocolate,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Réessayer l'inscription
            </button>
          </>
        )}
      </div>
    </div>
  );
}
