import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Button, Card, Input, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../../components/ui/index.jsx';

const TYPE_LABELS = { ong: 'ONG', entreprise: 'Entreprise', universite: 'Université' };

function getTypeColors(theme) {
  return { ong: theme.sakura, entreprise: theme.milkTea, universite: theme.aloewood };
}

export default function AdminOrgs() {
  const { theme } = useTheme();
  const TYPE_COLORS = getTypeColors(theme);
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('list');
  const [toast, setToast]     = useState(null);
  const [form, setForm]       = useState({ name: '', type: 'ong', email: '', phone: '', address: '' });

  const load = () => {
    setLoading(true);
    api.get('/api/organizations').then((r) => setOrgs(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/organizations', form);
      setToast({ message: 'Organisation créée ✓', type: 'success' });
      setForm({ name: '', type: 'ong', email: '', phone: '', address: '' });
      setTab('list');
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur création', type: 'error' });
    }
  };

  const approve = async (id) => {
    await api.patch(`/api/organizations/${id}/approve`);
    setOrgs((list) => list.map((o) => o.id === id ? { ...o, is_approved: true } : o));
    setToast({ message: 'Organisation approuvée ✓', type: 'success' });
  };

  const toggleStatus = async (org) => {
    await api.patch(`/api/organizations/${org.id}/status`, { is_active: !org.is_active });
    setOrgs((list) => list.map((o) => o.id === org.id ? { ...o, is_active: !o.is_active } : o));
  };

  return (
    <PageShell>
      <div style={{ padding: '54px 20px 16px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${theme.border}` }}>
        <BackButton to="/admin" />
        <div style={{ flex: 1 }}>
          <Eyebrow>Super Admin</Eyebrow>
          <H2 style={{ marginTop: 2 }}>Organisations</H2>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
        {[{ id: 'list', l: 'Liste' }, { id: 'new', l: '+ Créer' }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700,
            background: tab === t.id ? theme.chocolate : theme.surface,
            color: tab === t.id ? theme.textOnDark : theme.textDim,
            border: tab === t.id ? 'none' : `1px solid ${theme.border}`,
            fontFamily: theme.font,
          }}>{t.l}</button>
        ))}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px' }}>
        {tab === 'list'
          ? loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orgs.map((org) => (
                  <Card key={org.id} style={{ padding: 14, opacity: org.is_active ? 1 : 0.55 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        background: TYPE_COLORS[org.type] + '30',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={ICONS.shield} size={20} color={TYPE_COLORS[org.type]} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: theme.chocolate }}>{org.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                            background: TYPE_COLORS[org.type] + '25', color: TYPE_COLORS[org.type] }}>
                            {TYPE_LABELS[org.type]}
                          </span>
                          {!org.is_approved && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                              background: theme.warnSoft, color: theme.warn }}>En attente</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: theme.textMute, marginTop: 3 }}>{org.email}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: theme.aloewood,
                          fontWeight: 700, marginTop: 4, letterSpacing: 2 }}>
                          Code : {org.join_code}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      {!org.is_approved && (
                        <button onClick={() => approve(org.id)} style={{ flex: 1, padding: '9px',
                          borderRadius: 10, background: theme.safe, color: '#fff', border: 'none',
                          fontWeight: 700, fontSize: 12, fontFamily: theme.font }}>
                          Approuver
                        </button>
                      )}
                      <button onClick={() => toggleStatus(org)} style={{ flex: 1, padding: '9px',
                        borderRadius: 10, background: org.is_active ? theme.dangerSoft : theme.safeSoft,
                        color: org.is_active ? theme.danger : theme.safe, border: 'none',
                        fontWeight: 700, fontSize: 12, fontFamily: theme.font }}>
                        {org.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
          : <form onSubmit={create}>
              <Card style={{ padding: 18 }}>
                <Eyebrow style={{ marginBottom: 14 }}>Nouvelle organisation</Eyebrow>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Input label="Nom de l'organisation" placeholder="ONG Solidarité CI" value={form.name} onChange={setF('name')} required />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.textDim, marginBottom: 8,
                      letterSpacing: 0.6, textTransform: 'uppercase' }}>Type</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, type: v }))}
                          style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
                            background: form.type === v ? theme.chocolate : theme.surface,
                            color: form.type === v ? theme.textOnDark : theme.textDim,
                            border: `1px solid ${form.type === v ? theme.chocolate : theme.border}`,
                            fontFamily: theme.font }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Email de contact" type="email" placeholder="contact@ong.ci" value={form.email} onChange={setF('email')} required />
                  <Input label="Téléphone" placeholder="+225 …" value={form.phone} onChange={setF('phone')}
                    icon={<Icon d={ICONS.phone} size={18} />} />
                  <Input label="Adresse" placeholder="Abidjan, Plateau" value={form.address} onChange={setF('address')} />
                  <Button type="submit" icon={<Icon d={ICONS.plus} size={18} color={theme.bg} />}>
                    Créer l'organisation
                  </Button>
                  <div style={{ fontSize: 11, color: theme.textMute, textAlign: 'center' }}>
                    Un code d'invitation sera généré automatiquement.
                  </div>
                </div>
              </Card>
            </form>
        }
      </ScrollArea>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
