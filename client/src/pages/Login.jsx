import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../services/auth';
import { HS, ICONS } from '../tokens';
import { Logo, Icon, Button, Card, Input, H1, Petal, BackButton, PageShell, Toast } from '../components/ui/index.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [showPwd, setShowPwd]   = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiLogin(form.email, form.password);
      setUser(data.user);
      // Admin et superadmin → tableau de bord admin
      // Utilisatrice normale → app
      const isAdmin = data.user.role === 'admin' || data.user.role === 'superadmin';
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate(data.user.onboarding_done ? '/dashboard' : '/onboarding-emergency');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell style={{ position: 'relative' }}>
      {/* Décorations */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220,
        background: HS.sakura, borderRadius: '50%', opacity: 0.35 }} />
      <div style={{ position: 'absolute', top: -40, left: -80, width: 180, height: 180,
        background: HS.mistyRose, borderRadius: '50%', opacity: 0.7 }} />

      {/* Header */}
      <div style={{ position: 'relative', padding: '60px 24px 0', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton to="/" />
        <Logo size={18} withText={false} />
        <span style={{ width: 40 }} />
      </div>

      {/* Corps */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 24px', overflow: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <H1>Re-bonjour 🌸</H1>
          <div style={{ fontSize: 14, color: HS.textMute, marginTop: 8 }}>On t'attendait.</div>
        </div>

        <form onSubmit={submit}>
          <Card style={{ padding: 22, borderRadius: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <div style={{ position: 'relative' }}>
                <Input
                  label="Mot de passe"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  icon={<Icon d={ICONS.lock} size={18} />}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{ position: 'absolute', right: 14, top: 34, background: 'none', border: 'none',
                    color: HS.textMute, display: 'flex' }}
                >
                  <Icon d={ICONS.eye} size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <a style={{ fontSize: 12, color: HS.sakuraDeep, fontWeight: 700 }}>Mot de passe oublié ?</a>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </div>
          </Card>
        </form>

      </div>

      <div style={{ padding: '0 24px 50px', textAlign: 'center', position: 'relative' }}>
        <span style={{ fontSize: 13, color: HS.textMute }}>Nouvelle ici ? </span>
        <Link to="/register" style={{ fontSize: 13, color: HS.sakuraDeep, fontWeight: 800 }}>
          Créer mon compte →
        </Link>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
    </PageShell>
  );
}
