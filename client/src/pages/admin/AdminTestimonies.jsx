import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Card, Eyebrow, H2, Avatar, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../../components/ui/index.jsx';

function getCatColors(theme) {
  return {
    harcelement_verbal: theme.warn, agression_physique: theme.danger, vol: '#5A6B8A',
    suivi: theme.aloewood, detour_force: '#C97B3B', autre: theme.milkTea,
  };
}

export default function AdminTestimonies() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const CAT_COLORS = getCatColors(theme);

  const CATEGORIES = [
    { id: 'all', label: 'Tous' },
    { id: 'harcelement_verbal', label: 'Harcèlement verbal' },
    { id: 'agression_physique', label: 'Agression physique' },
    { id: 'agression_sexuelle', label: 'Agression sexuelle' },
    { id: 'suivi', label: 'Suivi' },
    { id: 'vol', label: 'Vol' },
    { id: 'autre', label: 'Autre' },
  ];

  const load = () => {
    setLoading(true);
    api.get('/api/admin/testimonies/pending').then((r) => setTestimonies(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Filtrer par catégorie
  const filtered = categoryFilter === 'all'
    ? testimonies
    : testimonies.filter((t) => t.category === categoryFilter);

  const moderate = async (id, action) => {
    try {
      await api.patch(`/api/testimonies/${id}`, { action });
      setTestimonies((list) => list.filter((t) => t.id !== id));
      setToast({ message: action === 'approve' ? 'Témoignage approuvé ✓' : 'Témoignage rejeté', type: action === 'approve' ? 'success' : 'warn' });
    } catch {
      setToast({ message: 'Erreur modération', type: 'error' });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <PageShell>
      <div style={{ padding: '54px 20px 16px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${theme.border}` }}>
        <BackButton to="/admin" />
        <div style={{ flex: 1 }}>
          <Eyebrow>Modération</Eyebrow>
          <H2 style={{ marginTop: 2, color: theme.chocolate }}>Témoignages en attente</H2>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: '6px 10px',
            color: theme.text,
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        {testimonies.length > 0 && (
          <span style={{ background: theme.sakura, color: theme.chocolate, borderRadius: 10,
            padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{filtered.length}</span>
        )}
      </div>

      {/* Onglets par catégorie */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: categoryFilter === cat.id ? theme.chocolate : theme.surface,
              color: categoryFilter === cat.id ? '#fff' : theme.textDim,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: theme.font,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px', background: theme.bg }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 14, color: HS.textMute }}>Aucun témoignage en attente.</div>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map((t) => (
                  <Card key={t.id} style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Avatar size={36} name={t.display_name || 'A'} color={CAT_COLORS[t.category]} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate }}>
                          {t.is_anonymous ? (t.display_name || 'Anonyme') : t.display_name}
                        </div>
                        <div style={{ fontSize: 11, color: HS.textMute }}>{fmtDate(t.created_at)}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                        background: HS.mistyRose, color: CAT_COLORS[t.category] || HS.sakuraDeep }}>
                        {t.category}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate, marginBottom: 6 }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: HS.textDim, lineHeight: 1.55, marginBottom: 14 }}>{t.content}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => moderate(t.id, 'approve')} style={{ flex: 1, padding: '12px',
                        borderRadius: 12, background: HS.safe, color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                        ✓ Approuver
                      </button>
                      <button onClick={() => moderate(t.id, 'reject')} style={{ flex: 1, padding: '12px',
                        borderRadius: 12, background: HS.dangerSoft, color: HS.danger, border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                        ✗ Rejeter
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
        }
      </ScrollArea>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
