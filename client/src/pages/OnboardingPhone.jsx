import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Input, Button, Card, Eyebrow, PageShell, Toast } from '../components/ui/index.jsx';

export default function OnboardingPhone() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [toast, setToast] = useState(null);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 7) {
      setToast({ message: 'Numéro téléphone invalide', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/verify-phone/send', { phone });
      setStep('otp');
      setTimeRemaining(300); // 5 minutes

      // Countdown timer
      const interval = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            clearInterval(interval);
            setStep('phone');
            setToast({ message: 'Code expiré, réessaie', type: 'error' });
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      setToast({ message: 'Code envoyé par SMS', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur envoi', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setToast({ message: 'Code à 6 chiffres requis', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/verify-phone/confirm', { code: otp });
      // Refresh user data to update phone_verified in context
      const meRes = await api.get('/api/users/me');
      setUser(meRes.data.data);
      setToast({ message: 'Téléphone vérifié !', type: 'success' });
      setTimeout(() => navigate('/onboarding'), 500);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Code incorrect', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <PageShell>
      <div style={{ padding: '60px 20px 0', textAlign: 'center' }}>
        <Eyebrow style={{ marginBottom: 4 }}>Étape 2/4</Eyebrow>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: HS.chocolate, marginBottom: 8 }}>Vérifie ton téléphone</h2>
        <p style={{ fontSize: 13, color: HS.textMute, lineHeight: 1.5 }}>
          Nous vérifierons que c'est bien ton numéro pour pouvoir t'alerter en cas de danger.
        </p>
      </div>

      <div style={{ padding: '40px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {step === 'phone' ? (
          <Card style={{ width: '100%', maxWidth: 340, padding: 24 }}>
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Numéro de téléphone"
                type="tel"
                placeholder="+225 00 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <Button
                type="submit"
                disabled={loading || phone.length < 7}
                icon={<Icon d={ICONS.send} size={18} color={HS.bg} />}>
                {loading ? 'Envoi en cours…' : 'Envoyer code'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/onboarding-emergency')}
                style={{
                  padding: '12px', background: 'transparent', border: 'none',
                  color: HS.textMute, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
                }}>
                Retour
              </button>
            </form>
          </Card>
        ) : (
          <Card style={{ width: '100%', maxWidth: 340, padding: 24 }}>
            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: HS.textDim, marginBottom: 8 }}>
                  Code de vérification
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  style={{
                    width: '100%', fontSize: 24, letterSpacing: 4, textAlign: 'center',
                    padding: '12px', borderRadius: 8, border: `2px solid ${HS.border}`,
                    background: HS.surface, color: HS.chocolate, fontFamily: HS.font,
                  }}
                  required
                />
              </div>

              <div style={{ fontSize: 12, color: HS.textMute, textAlign: 'center' }}>
                Expire dans {formatTime(timeRemaining)}
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                icon={<Icon d={ICONS.check} size={18} color={HS.bg} />}>
                {loading ? 'Vérification…' : 'Confirmer'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setTimeRemaining(0);
                }}
                style={{
                  padding: '12px', background: 'transparent', border: 'none',
                  color: HS.textMute, fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
                }}>
                Envoyer un nouveau code
              </button>
            </form>
          </Card>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
