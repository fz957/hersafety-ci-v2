import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import {
  Icon, Button, Card, Input, Eyebrow, H2,
  BackButton, PageShell, ScrollArea, Toast, Spinner,
} from '../../components/ui/index.jsx';

const TYPE_LABELS = { ong: 'ONG', entreprise: 'Entreprise', universite: 'Université' };

function getTypeColors(theme) {
  return { ong: theme.sakura, entreprise: theme.milkTea, universite: theme.aloewood };
}

// ─── Carte organisation ──────────────────────────────────────────────────────
function OrgCard({ org, onApprove, onToggle, theme }) {
  const [expanded, setExpanded] = useState(false);
  const TYPE_COLORS = getTypeColors(theme);

  return (
    <Card style={{ padding: 14, opacity: org.is_active ? 1 : 0.6 }}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: 0,
          display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Icône type */}
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: (TYPE_COLORS[org.type] || theme.mistyRose) + '28',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={ICONS.shield} size={20} color={TYPE_COLORS[org.type] || theme.sakura} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nom + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: theme.chocolate }}>{org.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
              background: (TYPE_COLORS[org.type] || theme.mistyRose) + '28',
              color: TYPE_COLORS[org.type] || theme.sakura,
            }}>{TYPE_LABELS[org.type] || org.type}</span>
            {!org.is_approved && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                background: theme.warnSoft, color: theme.warn,
              }}>⏳ En attente</span>
            )}
            {!org.is_active && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                background: theme.dangerSoft, color: theme.danger,
              }}>Suspendue</span>
            )}
          </div>

          <div style={{ fontSize: 11, color: theme.textMute, marginTop: 3 }}>{org.email}</div>

          {/* Code invitation */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 6, background: theme.surface2, borderRadius: 8, padding: '4px 10px',
          }}>
            <Icon d={ICONS.share} size={12} color={theme.aloewood} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: theme.aloewood, fontWeight: 800, letterSpacing: 2 }}>
              {org.join_code}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <Icon
          d={ICONS.arrow}
          size={18}
          color={theme.textMute}
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .2s' }}
        />
      </button>

      {/* Panel d'actions (expandé) */}
      {expanded && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${theme.border}`,
        }}>
          {org.phone && (
            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 10 }}>
              📞 {org.phone}
            </div>
          )}
          {org.address && (
            <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 10 }}>
              📍 {org.address}
            </div>
          )}
          <div style={{ fontSize: 10, color: theme.textFaint, marginBottom: 12 }}>
            Créée le {new Date(org.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Approuver si pas encore approuvée */}
            {!org.is_approved && (
              <button
                onClick={() => onApprove(org.id)}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12,
                  background: theme.safe, color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: 13, fontFamily: theme.font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Icon d={ICONS.check} size={16} color="#fff" />
                Approuver
              </button>
            )}

            {/* Activer / Suspendre */}
            <button
              onClick={() => onToggle(org)}
              style={{
                flex: 1, padding: '11px', borderRadius: 12,
                background: org.is_active ? theme.dangerSoft : theme.safeSoft,
                color: org.is_active ? theme.danger : theme.safe,
                border: 'none', fontWeight: 700, fontSize: 13, fontFamily: theme.font,
              }}
            >
              {org.is_active ? 'Suspendre' : 'Réactiver'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Formulaire de création ──────────────────────────────────────────────────
function CreateForm({ onCreated, theme }) {
  const [form, setForm] = useState({ name: '', type: 'ong', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/organizations', form);
      setToast({ message: `Organisation créée ✓ — code : ${res.data.data.join_code}`, type: 'success' });
      setForm({ name: '', type: 'ong', email: '', phone: '', address: '' });
      onCreated(res.data.data);
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur création', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit}>
        <Card style={{ padding: 18 }}>
          <Eyebrow style={{ marginBottom: 14 }}>Nouvelle organisation</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Nom de l'organisation"
              placeholder="ONG Solidarité CI"
              value={form.name}
              onChange={setF('name')}
              required
            />

            {/* Type */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: theme.textDim, marginBottom: 8,
                letterSpacing: 0.6, textTransform: 'uppercase',
              }}>Type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: v }))}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 12, fontWeight: 700,
                      background: form.type === v ? TYPE_COLORS[v] : theme.surface,
                      color: form.type === v ? (v === 'universite' ? '#fff' : theme.chocolate) : theme.textDim,
                      border: `1.5px solid ${form.type === v ? TYPE_COLORS[v] : theme.border}`,
                      fontFamily: theme.font,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>

            <Input label="Email de contact" type="email" placeholder="contact@ong.ci"
              value={form.email} onChange={setF('email')} required />

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Input label="Téléphone" placeholder="+225 …" value={form.phone} onChange={setF('phone')}
                  icon={<Icon d={ICONS.phone} size={18} />} />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Adresse" placeholder="Abidjan…" value={form.address} onChange={setF('address')} />
              </div>
            </div>

            <Button type="submit" disabled={loading}
              icon={<Icon d={ICONS.plus} size={18} color={theme.bg} />}>
              {loading ? 'Création…' : 'Créer l\'organisation'}
            </Button>

            {/* Explication code */}
            <div style={{
              background: theme.surface2, borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Icon d={ICONS.share} size={16} color={theme.aloewood} style={{ marginTop: 1 }} />
              <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>
                Un code d'invitation de <b>8 caractères</b> sera généré automatiquement.
                Partagez-le avec les membres pour qu'ils puissent s'inscrire.
              </div>
            </div>
          </div>
        </Card>
      </form>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function SuperAdminOrgs() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [orgs, setOrgs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('list');
  const [query, setQuery]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/api/organizations').then((r) => setOrgs(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Filtre local
  const filtered = orgs.filter((o) => {
    const matchQ = !query
      || o.name.toLowerCase().includes(query.toLowerCase())
      || o.email.toLowerCase().includes(query.toLowerCase());
    const matchS = filterStatus === 'all'
      || (filterStatus === 'pending'  && !o.is_approved)
      || (filterStatus === 'active'   &&  o.is_approved && o.is_active)
      || (filterStatus === 'inactive' && !o.is_active);
    return matchQ && matchS;
  });

  const approve = async (id) => {
    try {
      await api.patch(`/api/organizations/${id}/approve`);
      setOrgs((list) => list.map((o) => o.id === id ? { ...o, is_approved: true } : o));
      setToast({ message: 'Organisation approuvée ✓', type: 'success' });
    } catch {
      setToast({ message: 'Erreur approbation', type: 'error' });
    }
  };

  const toggleStatus = async (org) => {
    try {
      await api.patch(`/api/organizations/${org.id}/status`, { is_active: !org.is_active });
      setOrgs((list) => list.map((o) => o.id === org.id ? { ...o, is_active: !o.is_active } : o));
      setToast({ message: org.is_active ? 'Organisation suspendue' : 'Organisation réactivée ✓', type: 'success' });
    } catch {
      setToast({ message: 'Erreur mise à jour', type: 'error' });
    }
  };

  const pendingCount = orgs.filter((o) => !o.is_approved).length;

  return (
    <PageShell>
      {/* Header */}
      <div style={{
        padding: '54px 20px 0', borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <BackButton to="/admin" />
          <div style={{ flex: 1 }}>
            <Eyebrow>Super Administration</Eyebrow>
            <H2 style={{ marginTop: 2, color: theme.chocolate }}>Organisations</H2>
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
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: theme.serif, fontSize: 26, color: theme.chocolate, lineHeight: 1, fontWeight: 800 }}>
              {orgs.length}
            </div>
            <div style={{ fontSize: 10, color: theme.textMute }}>tenants</div>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[{ id: 'list', l: 'Liste' }, { id: 'new', l: '+ Créer' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700,
              background: tab === t.id ? theme.chocolate : theme.surface,
              color: tab === t.id ? theme.textOnDark : theme.textDim,
              border: tab === t.id ? 'none' : `1px solid ${theme.border}`,
              fontFamily: theme.font,
            }}>{t.l}</button>
          ))}
          {pendingCount > 0 && (
            <span style={{
              marginLeft: 'auto', alignSelf: 'center',
              background: theme.warn, color: '#fff', borderRadius: 10,
              padding: '4px 10px', fontSize: 11, fontWeight: 800,
            }}>
              {pendingCount} en attente
            </span>
          )}
        </div>

        {tab === 'list' && (
          <>
            {/* Recherche */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: theme.surface, borderRadius: 14, border: `1.5px solid ${theme.border}`,
              padding: '0 14px', height: 46, marginBottom: 10,
            }}>
              <Icon d={ICONS.search} size={18} color={theme.textMute} />
              <input
                type="text"
                placeholder="Rechercher une organisation…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 14, color: theme.text, fontFamily: theme.font,
                }}
              />
              {query && (
                <button onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', color: theme.textMute, display: 'flex' }}>
                  <Icon d={ICONS.x} size={16} />
                </button>
              )}
            </div>

            {/* Filtres statut */}
            <div style={{ display: 'flex', gap: 6, paddingBottom: 14, overflowX: 'auto' }}>
              {[
                { v: 'all',      l: 'Toutes' },
                { v: 'pending',  l: 'En attente' },
                { v: 'active',   l: 'Actives' },
                { v: 'inactive', l: 'Suspendues' },
              ].map((f) => (
                <button key={f.v} onClick={() => setFilterStatus(f.v)} style={{
                  padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                  background: filterStatus === f.v ? theme.chocolate : theme.surface,
                  color: filterStatus === f.v ? theme.textOnDark : theme.textDim,
                  border: filterStatus === f.v ? 'none' : `1px solid ${theme.border}`,
                  fontFamily: theme.font,
                }}>{f.l}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <ScrollArea style={{ padding: '12px 16px 40px', background: theme.bg }}>
        {tab === 'list' ? (
          loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
              <div style={{ fontSize: 14, color: theme.textMute }}>
                {query ? `Aucun résultat pour « ${query} »` : 'Aucune organisation.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Bannière d'approbation si des orgs attendent */}
              {filtered.some((o) => !o.is_approved) && (
                <div style={{
                  background: `linear-gradient(135deg, ${theme.warnSoft}, ${theme.surface})`,
                  borderRadius: 16, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: `1px solid ${theme.warn}40`,
                }}>
                  <Icon d={ICONS.clock} size={20} color={theme.warn} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.chocolate }}>
                      {filtered.filter((o) => !o.is_approved).length} organisation(s) en attente d'approbation
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMute, marginTop: 2 }}>
                      Développe une carte pour approuver
                    </div>
                  </div>
                </div>
              )}

              {filtered.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  onApprove={approve}
                  onToggle={toggleStatus}
                  theme={theme}
                />
              ))}
            </div>
          )
        ) : (
          <CreateForm onCreated={(newOrg) => { setOrgs((list) => [newOrg, ...list]); setTab('list'); }} theme={theme} />
        )}
      </ScrollArea>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
