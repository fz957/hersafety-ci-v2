import { useState, useEffect } from 'react';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Input, Eyebrow, H2, BottomNav, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';
// import { DangerousPlacesMap } from '../components/maps/PlacesMap'; // Désactivée pour performance
import { useGPS } from '../hooks/useGPS';

const DANGER_TYPES = [
  { v: 'harcelement_verbal',  l: 'Harcèlement verbal' },
  { v: 'agression_physique',  l: 'Agression physique' },
  { v: 'agression_sexuelle',  l: 'Agression sexuelle' },
  { v: 'vol',                 l: 'Vol' },
  { v: 'suivi',               l: 'Suivi' },
  { v: 'detour_force',        l: 'Détour forcé' },
  { v: 'autre',               l: 'Autre' },
];

const STATUS_STYLE = {
  verified: { bg: HS.safeSoft,   color: HS.safe,   label: '✓ Vérifié' },
  pending:  { bg: HS.warnSoft,   color: HS.warn,   label: '⏳ En attente' },
  refuted:  { bg: HS.dangerSoft, color: HS.danger,  label: '✗ Réfuté' },
};

export default function Reports() {
  const { position } = useGPS();
  const [tab, setTab]       = useState('map');
  const [reports, setReports] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState(null);
  const [form, setForm]     = useState({
    report_type: 'lieu', danger_type: 'harcelement_verbal',
    description: '', place_name: '', place_address: '',
    vehicle_plate: '', vtc_app: '', is_anonymous: true,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/reports'),
      api.get('/api/reports/danger-zones'),
    ])
      .then(([reportsRes, zonesRes]) => {
        setReports(reportsRes.data.data);
        setDangerZones(zonesRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (position && form.report_type === 'lieu') {
        payload.place_lat = position.lat;
        payload.place_lng = position.lng;
      }
      await api.post('/api/reports', payload);
      setToast({ message: 'Signalement soumis ✓ — merci pour ta vigilance.', type: 'success' });
      setForm({ report_type: 'lieu', danger_type: 'harcelement_verbal', description: '',
        place_name: '', place_address: '', vehicle_plate: '', vtc_app: '', is_anonymous: true });
      setTab('map');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur envoi', type: 'error' });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <PageShell>
      <div style={{ padding: '54px 20px 0' }}>
        <Eyebrow>Signalements</Eyebrow>
        <H2 style={{ marginTop: 4, marginBottom: 16 }}>Zones à risque</H2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'map', l: 'Signalements' }, { id: 'new', l: '+ Signaler' }].map((t) => (
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
        {tab === 'map' ? (
          <>
            {loading && <div style={{ textAlign: 'center', padding: 24, color: HS.textMute, fontSize: 13 }}>Chargement…</div>}
            {/* Carte zones dangereuses désactivée pour performance */}
            {!loading && dangerZones.length > 0 && (
              <Eyebrow style={{ marginBottom: 10 }}>Zones dangereuses ({dangerZones.length})</Eyebrow>
            )}
            {!loading && reports.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
                <div style={{ fontSize: 14, color: HS.textMute }}>Aucun signalement vérifié pour l'instant.</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map((r) => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                return (
                  <Card key={r.id} style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: r.report_type === 'chauffeur' ? HS.warnSoft : HS.mistyRose,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={r.report_type === 'chauffeur' ? ICONS.car : ICONS.pin} size={20}
                          color={r.report_type === 'chauffeur' ? HS.warn : HS.sakuraDeep} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>
                            {r.place_name || r.vtc_app || (r.report_type === 'chauffeur' ? 'VTC' : 'Lieu signalé')}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                            background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        {r.place_address && (
                          <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>📍 {r.place_address}</div>
                        )}
                        <div style={{ fontSize: 12, color: HS.textDim, marginTop: 6, lineHeight: 1.5 }}>
                          {r.description}
                        </div>
                        <div style={{ fontSize: 10, color: HS.textFaint, marginTop: 6 }}>
                          {fmtDate(r.created_at)} ·{' '}
                          {DANGER_TYPES.find((d) => d.v === r.danger_type)?.l || r.danger_type}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <Card style={{ padding: 18 }}>
              <Eyebrow style={{ marginBottom: 14 }}>Nouveau signalement</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Type de signalement */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8,
                    letterSpacing: 0.6, textTransform: 'uppercase' }}>Type</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: 'lieu', l: '📍 Lieu dangereux' }, { v: 'chauffeur', l: '🚕 Chauffeur/VTC' }].map((t) => (
                      <button key={t.v} type="button" onClick={() => setForm((f) => ({ ...f, report_type: t.v }))}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 14, fontSize: 13, fontWeight: 700,
                          background: form.report_type === t.v ? HS.chocolate : HS.surface,
                          color: form.report_type === t.v ? HS.textOnDark : HS.textDim,
                          border: `1px solid ${form.report_type === t.v ? HS.chocolate : HS.border}`,
                          fontFamily: HS.font }}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Champs selon le type */}
                {form.report_type === 'lieu' ? (
                  <>
                    <Input label="Nom du lieu" placeholder="Ex: Marché Adjamé" value={form.place_name} onChange={setF('place_name')}
                      icon={<Icon d={ICONS.pin} size={18} />} />
                    <Input label="Adresse" placeholder="Quartier, commune…" value={form.place_address} onChange={setF('place_address')} />
                  </>
                ) : (
                  <>
                    <Input label="Plaque / immatriculation" placeholder="CI-0123-AB" value={form.vehicle_plate} onChange={setF('vehicle_plate')} />
                    <Input label="Application VTC" placeholder="Yango, Heetch, Uber…" value={form.vtc_app} onChange={setF('vtc_app')} />
                  </>
                )}

                {/* Danger */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8,
                    letterSpacing: 0.6, textTransform: 'uppercase' }}>Type de danger</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DANGER_TYPES.map((d) => (
                      <button key={d.v} type="button" onClick={() => setForm((f) => ({ ...f, danger_type: d.v }))}
                        style={{ padding: '7px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: form.danger_type === d.v ? HS.danger : HS.surface,
                          color: form.danger_type === d.v ? '#fff' : HS.textDim,
                          border: `1px solid ${form.danger_type === d.v ? HS.danger : HS.border}`,
                          fontFamily: HS.font }}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Description" placeholder="Décris l'incident…" value={form.description}
                  onChange={setF('description')} multiline required />

                {/* Anonymat */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span onClick={() => setForm((f) => ({ ...f, is_anonymous: !f.is_anonymous }))}
                    style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: form.is_anonymous ? HS.chocolate : 'transparent',
                      border: form.is_anonymous ? 'none' : `1.5px solid ${HS.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.is_anonymous && <Icon d={ICONS.check} size={13} color={HS.bg} />}
                  </span>
                  <span style={{ fontSize: 13, color: HS.textDim }}>Signalement anonyme</span>
                </label>

                <Button type="submit" variant="danger"
                  icon={<Icon d={ICONS.flag} size={18} color="#fff" />}>
                  Envoyer le signalement
                </Button>
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
