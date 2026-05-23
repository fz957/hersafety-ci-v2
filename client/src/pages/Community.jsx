import { useState, useEffect } from 'react';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Input, Eyebrow, H2, Avatar, BottomNav, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const CATEGORIES = [
  { v: 'harcelement_verbal',  l: 'Harcèlement verbal' },
  { v: 'agression_physique',  l: 'Agression physique' },
  { v: 'agression_sexuelle',  l: 'Agression sexuelle' },
  { v: 'vol',                 l: 'Vol' },
  { v: 'suivi',               l: 'Suivi / filature' },
  { v: 'detour_force',        l: 'Détour forcé' },
  { v: 'autre',               l: 'Autre' },
];

const CAT_COLORS = {
  harcelement_verbal: HS.warn, agression_physique: HS.danger, agression_sexuelle: '#8B3A5C',
  vol: '#5A6B8A', suivi: HS.aloewood, detour_force: '#C97B3B', autre: HS.milkTea,
};

export default function Community() {
  const [tab, setTab]         = useState('feed');
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const [form, setForm]       = useState({ title: '', content: '', category: 'harcelement_verbal',
    location_label: '', is_anonymous: true });

  const load = () => {
    setLoading(true);
    api.get('/api/testimonies').then((r) => setTestimonies(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/testimonies', form);
      setToast({ message: 'Témoignage soumis ✓ — il sera visible après modération.', type: 'success' });
      setForm({ title: '', content: '', category: 'harcelement_verbal', location_label: '', is_anonymous: true });
      setTab('feed');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur envoi', type: 'error' });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '54px 20px 0' }}>
        <Eyebrow>Sœurs</Eyebrow>
        <H2 style={{ marginTop: 4, marginBottom: 16 }}>La communauté</H2>
        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'feed', l: 'Témoignages' }, { id: 'new', l: '+ Partager' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700,
              background: tab === t.id ? HS.chocolate : HS.surface,
              color: tab === t.id ? HS.textOnDark : HS.textDim,
              border: tab === t.id ? 'none' : `1px solid ${HS.border}`,
              fontFamily: HS.font,
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <ScrollArea style={{ padding: '16px 16px 90px' }}>
        {tab === 'feed' ? (
          <>
            {loading && <div style={{ textAlign: 'center', padding: 24, color: HS.textMute, fontSize: 13 }}>Chargement…</div>}
            {!loading && testimonies.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌸</div>
                <div style={{ fontSize: 14, color: HS.textMute }}>Sois la première à partager.</div>
                <Button variant="accent" onClick={() => setTab('new')} style={{ marginTop: 16, maxWidth: 200, margin: '16px auto 0' }}>
                  Partager
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testimonies.map((t) => (
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
                      {CATEGORIES.find((c) => c.v === t.category)?.l || t.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate, marginBottom: 6 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: HS.textDim, lineHeight: 1.55 }}>{t.content}</div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button style={{ background: HS.mistyRose, border: 'none', borderRadius: 8,
                      padding: '6px 12px', fontSize: 12, fontWeight: 700, color: HS.sakuraDeep,
                      display: 'flex', alignItems: 'center', gap: 6, fontFamily: HS.font }}>
                      <Icon d={ICONS.heart} size={14} color={HS.sakuraDeep} />
                      {t.support_count} soutiens
                    </button>
                    {t.location_label && (
                      <span style={{ fontSize: 11, color: HS.textMute }}>
                        📍 {t.location_label}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <Card style={{ padding: 18, marginBottom: 12 }}>
              <Eyebrow style={{ marginBottom: 12 }}>Ton témoignage</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Catégorie */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8,
                    letterSpacing: 0.6, textTransform: 'uppercase' }}>Catégorie</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.v} type="button" onClick={() => setForm((f) => ({ ...f, category: c.v }))}
                        style={{ padding: '7px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: form.category === c.v ? CAT_COLORS[c.v] : HS.surface,
                          color: form.category === c.v ? '#fff' : HS.textDim,
                          border: `1px solid ${form.category === c.v ? CAT_COLORS[c.v] : HS.border}`,
                          fontFamily: HS.font }}>
                        {c.l}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Titre" placeholder="En une phrase…" value={form.title} onChange={setF('title')} required />
                <Input label="Témoignage" placeholder="Raconte ce qui s'est passé…" value={form.content} onChange={setF('content')}
                  multiline required />
                <Input label="Lieu (optionnel)" placeholder="Ex: Marché Adjamé" value={form.location_label} onChange={setF('location_label')}
                  icon={<Icon d={ICONS.pin} size={18} />} />

                {/* Anonymat */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span onClick={() => setForm((f) => ({ ...f, is_anonymous: !f.is_anonymous }))}
                    style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: form.is_anonymous ? HS.chocolate : 'transparent',
                      border: form.is_anonymous ? 'none' : `1.5px solid ${HS.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.is_anonymous && <Icon d={ICONS.check} size={13} color={HS.bg} />}
                  </span>
                  <span style={{ fontSize: 13, color: HS.textDim }}>
                    Publier anonymement (un pseudo sera généré)
                  </span>
                </label>

                <Button type="submit" icon={<Icon d={ICONS.send} size={18} color={HS.bg} />}>
                  Soumettre le témoignage
                </Button>
                <div style={{ fontSize: 11, color: HS.textMute, textAlign: 'center' }}>
                  Ton témoignage sera visible après modération par ton organisation.
                </div>
              </div>
            </Card>
          </form>
        )}
      </ScrollArea>

      <BottomNav />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
