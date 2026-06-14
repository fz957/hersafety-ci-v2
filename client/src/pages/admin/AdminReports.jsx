import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Card, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../../components/ui/index.jsx';

export default function AdminReports() {
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [statusTab, setStatusTab] = useState('pending');  // pending, verified, refuted

  const load = (status = 'pending') => {
    setLoading(true);
    api.get('/api/reports', { params: { status } })
      .then((r) => setReports(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(statusTab); }, [statusTab]);

  const verify = async (id, action) => {
    try {
      const status = action === 'verify' ? 'verified' : 'refuted';
      console.log('[AdminReports] PATCH /api/reports/:id', { status });
      await api.patch(`/api/reports/${id}`, { status });
      // Reload the current tab after changes
      load(statusTab);
      setToast({ message: action === 'verify' ? 'Signalement vérifié ✓' : 'Signalement réfuté ✓', type: action === 'verify' ? 'success' : 'warn' });
    } catch (err) {
      console.error('[AdminReports] Erreur:', err);
      setToast({ message: 'Erreur vérification', type: 'error' });
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
          <H2 style={{ marginTop: 2, color: theme.chocolate }}>Signalements</H2>
        </div>
        {reports.length > 0 && (
          <span style={{ background: theme.warn, color: '#fff', borderRadius: 10,
            padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{reports.length}</span>
        )}
      </div>

      {/* Tabs for status filtering */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
        {[
          { id: 'pending', label: '⏳ En attente' },
          { id: 'verified', label: '✓ Vérifiés' },
          { id: 'refuted', label: '✗ Réfutés' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: statusTab === tab.id ? theme.chocolate : theme.surface,
              color: statusTab === tab.id ? '#fff' : theme.textDim,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: theme.font,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px', background: theme.bg }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          : reports.length === 0
            ? <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
                <div style={{ fontSize: 14, color: theme.textMute }}>Aucun signalement en attente.</div>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map((r) => (
                  <Card key={r.id} style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: r.report_type === 'chauffeur' ? theme.warnSoft : theme.mistyRose,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={r.report_type === 'chauffeur' ? ICONS.car : ICONS.pin} size={20}
                          color={r.report_type === 'chauffeur' ? theme.warn : theme.sakuraDeep} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: theme.chocolate }}>
                          {r.place_name || r.vtc_app || (r.report_type === 'chauffeur' ? 'Chauffeur VTC' : 'Lieu')}
                        </div>
                        {r.place_address && <div style={{ fontSize: 11, color: theme.textMute }}>📍 {r.place_address}</div>}
                        {r.vehicle_plate && <div style={{ fontSize: 11, color: theme.textMute }}>🚗 {r.vehicle_plate}</div>}
                        <div style={{ fontSize: 10, color: theme.textFaint, marginTop: 4 }}>
                          {fmtDate(r.created_at)} · {r.danger_type}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.5, marginBottom: 14 }}>
                      {r.description}
                    </div>
                    {/* Boutons d'action selon le statut */}
                    {statusTab === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => verify(r.id, 'verify')} style={{ flex: 1, padding: '12px',
                          borderRadius: 12, background: theme.safe, color: '#fff', border: 'none',
                          fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                          ✓ Vérifier
                        </button>
                        <button onClick={() => verify(r.id, 'refute')} style={{ flex: 1, padding: '12px',
                          borderRadius: 12, background: theme.dangerSoft, color: theme.danger, border: 'none',
                          fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                          ✗ Réfuter
                        </button>
                      </div>
                    )}
                    {statusTab === 'verified' && (
                      <button onClick={() => verify(r.id, 'refute')} style={{ width: '100%', padding: '12px',
                        borderRadius: 12, background: theme.dangerSoft, color: theme.danger, border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                        ✗ Réfuter (annuler vérification)
                      </button>
                    )}
                    {statusTab === 'refuted' && (
                      <button onClick={() => verify(r.id, 'verify')} style={{ width: '100%', padding: '12px',
                        borderRadius: 12, background: theme.safe, color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                        ✓ Vérifier (annuler refus)
                      </button>
                    )}
                  </Card>
                ))}
              </div>
        }
      </ScrollArea>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
