import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { Icon, Card, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../../components/ui/index.jsx';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/api/admin/reports/pending').then((r) => setReports(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const verify = async (id, action) => {
    try {
      await api.patch(`/api/reports/${id}/verify`, { action });
      setReports((list) => list.filter((r) => r.id !== id));
      setToast({ message: action === 'verify' ? 'Signalement vérifié ✓' : 'Signalement réfuté', type: action === 'verify' ? 'success' : 'warn' });
    } catch {
      setToast({ message: 'Erreur vérification', type: 'error' });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <PageShell>
      <div style={{ padding: '54px 20px 16px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${HS.border}` }}>
        <BackButton to="/admin" />
        <div style={{ flex: 1 }}>
          <Eyebrow>Modération</Eyebrow>
          <H2 style={{ marginTop: 2 }}>Signalements en attente</H2>
        </div>
        {reports.length > 0 && (
          <span style={{ background: HS.warn, color: '#fff', borderRadius: 10,
            padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{reports.length}</span>
        )}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          : reports.length === 0
            ? <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
                <div style={{ fontSize: 14, color: HS.textMute }}>Aucun signalement en attente.</div>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map((r) => (
                  <Card key={r.id} style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: r.report_type === 'chauffeur' ? HS.warnSoft : HS.mistyRose,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={r.report_type === 'chauffeur' ? ICONS.car : ICONS.pin} size={20}
                          color={r.report_type === 'chauffeur' ? HS.warn : HS.sakuraDeep} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>
                          {r.place_name || r.vtc_app || (r.report_type === 'chauffeur' ? 'Chauffeur VTC' : 'Lieu')}
                        </div>
                        {r.place_address && <div style={{ fontSize: 11, color: HS.textMute }}>📍 {r.place_address}</div>}
                        {r.vehicle_plate && <div style={{ fontSize: 11, color: HS.textMute }}>🚗 {r.vehicle_plate}</div>}
                        <div style={{ fontSize: 10, color: HS.textFaint, marginTop: 4 }}>
                          {fmtDate(r.created_at)} · {r.danger_type}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: HS.textDim, lineHeight: 1.5, marginBottom: 14 }}>
                      {r.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => verify(r.id, 'verify')} style={{ flex: 1, padding: '12px',
                        borderRadius: 12, background: HS.safe, color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                        ✓ Vérifier
                      </button>
                      <button onClick={() => verify(r.id, 'refute')} style={{ flex: 1, padding: '12px',
                        borderRadius: 12, background: HS.dangerSoft, color: HS.danger, border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: HS.font }}>
                        ✗ Réfuter
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
