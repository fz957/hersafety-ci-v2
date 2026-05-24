import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { register as apiRegister, logout as apiLogout } from '../services/auth';
import { HS, ICONS } from '../tokens';
import { Logo, Icon, Button, Card, Input, H1, Petal, BackButton, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro'];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', city: 'Abidjan',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [agreed, setAgreed]   = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError('Accepte les conditions pour continuer'); return; }
    setError(null);
    setLoading(true);
    try {
      // Logout any existing session first to ensure fresh registration
      try { await apiLogout(); } catch (_) {}

      const data = await apiRegister({
        full_name:  form.full_name.trim(),
        email:      form.email.trim(),
        phone:      form.phone.trim() || undefined,
        password:   form.password,
      });
      // Fusionne les données utilisateur et organisation
      const user = {
        ...data.user,
        organization_id: data.organization.id,
        organization_name: data.organization.name,
        organization_type: data.organization.type,
      };
      setUser(user);
      navigate('/onboarding-emergency');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 240, height: 240,
        background: HS.mistyRose, borderRadius: '50%', opacity: 0.7 }} />
      <Petal size={18} color={HS.sakuraDeep} opacity={0.5}
        style={{ position: 'absolute', top: 120, left: 30, transform: 'rotate(30deg)' }} />

      {/* Header */}
      <div style={{ position: 'relative', padding: '60px 24px 0', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton to="/login" />
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((i) => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2,
              background: i === 1 ? HS.sakuraDeep : HS.mistyRose }} />
          ))}
        </div>
        <span style={{ width: 40, fontSize: 12, color: HS.textMute, textAlign: 'right' }}>1/2</span>
      </div>

      <ScrollArea style={{ position: 'relative' }}>
        <div style={{ padding: '24px 24px 40px' }}>
          <H1>Crée ton<br />profil 🌸</H1>
          <div style={{ fontSize: 13, color: HS.textDim, marginTop: 8, marginBottom: 24 }}>
            Quelques champs · 60 secondes · toute une vie protégée.
          </div>

          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <Input
                label="Nom complet"
                placeholder="Awa Kouamé"
                value={form.full_name}
                onChange={set('full_name')}
                icon={<Icon d={ICONS.user} size={18} />}
                required
              />

              <Input
                label="Email"
                type="email"
                placeholder="awa@email.ci"
                value={form.email}
                onChange={set('email')}
                icon={<Icon d={ICONS.mail} size={18} />}
                autoComplete="email"
                required
              />

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  Téléphone
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ background: HS.surface, borderRadius: 16, border: `1.5px solid ${HS.border}`,
                    padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 52 }}>
                    <span style={{ fontSize: 18 }}>🇨🇮</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>+225</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="tel"
                      placeholder="07 12 34 56 78"
                      value={form.phone}
                      onChange={set('phone')}
                      style={{
                        width: '100%', height: 52, borderRadius: 16,
                        border: `1.5px solid ${HS.border}`, background: HS.surface,
                        padding: '0 14px', fontSize: 15, fontFamily: HS.font,
                        color: HS.text, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                icon={<Icon d={ICONS.lock} size={18} />}
                hint="Minimum 8 caractères"
                autoComplete="new-password"
                required
              />

              {/* Ville */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>Ville</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, city: c }))}
                      style={{
                        padding: '12px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
                        background: form.city === c ? HS.sakura : HS.surface,
                        border: form.city === c ? 'none' : `1.5px solid ${HS.border}`,
                        color: form.city === c ? HS.chocolate : HS.textDim,
                      }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* CGU */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', cursor: 'pointer' }}>
                <span
                  onClick={() => setAgreed((v) => !v)}
                  style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: agreed ? HS.chocolate : 'transparent',
                    border: agreed ? 'none' : `1.5px solid ${HS.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {agreed && <Icon d={ICONS.check} size={13} color={HS.bg} />}
                </span>
                <span style={{ fontSize: 12, color: HS.textDim, lineHeight: 1.5 }}>
                  J'accepte les conditions et la <span style={{ color: HS.sakuraDeep, fontWeight: 700 }}>charte de confidentialité</span>.
                  Mes données ne quittent jamais la Côte d'Ivoire.
                </span>
              </label>

              <Button type="submit" disabled={loading} style={{ marginTop: 8 }}
                icon={<Icon d={ICONS.arrow} size={20} color={HS.bg} />}>
                {loading ? 'Création…' : 'Continuer'}
              </Button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: HS.textMute }}>Déjà un compte ? </span>
            <Link to="/login" style={{ fontSize: 13, color: HS.sakuraDeep, fontWeight: 800 }}>Se connecter →</Link>
          </div>
        </div>
      </ScrollArea>

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
    </PageShell>
  );
}
