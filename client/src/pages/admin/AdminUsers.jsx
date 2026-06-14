import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import {
  Icon, Card, Eyebrow, H2, Avatar,
  BackButton, PageShell, ScrollArea, Toast, Spinner,
} from '../../components/ui/index.jsx';

function getRoleStyle(theme) {
  return {
    user:       { bg: theme.mistyRose, color: theme.sakuraDeep, label: 'Utilisatrice' },
    superadmin: { bg: theme.chocolate, color: theme.textOnDark,  label: 'Admin' },
  };
}

// ─── Modale de confirmation ──────────────────────────────────────────────────
function ConfirmModal({ user, onConfirm, onCancel, theme }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(42,26,17,0.45)',
      display: 'flex', alignItems: 'flex-end', zIndex: 200,
    }}>
      <div className="animate-slide" style={{
        width: '100%', background: theme.surface, borderRadius: '24px 24px 0 0',
        padding: '24px 20px 40px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.border,
          margin: '0 auto 20px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: theme.chocolate, marginBottom: 8 }}>
          Supprimer le compte ?
        </div>
        <div style={{ fontSize: 14, color: theme.textDim, lineHeight: 1.5, marginBottom: 24 }}>
          Le compte de <b>{user.full_name || user.email}</b> sera définitivement désactivé.
          Cette action ne peut pas être annulée.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12,
            background: theme.surface, border: `1px solid ${theme.border}`, fontWeight: 700,
            fontSize: 14, color: theme.textDim, fontFamily: theme.font }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 12,
            background: theme.danger, color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, fontFamily: theme.font }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { theme } = useTheme();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [toast, setToast]         = useState(null);
  const [confirmUser, setConfirmUser] = useState(null); // utilisatrice à supprimer
  const ROLE_STYLE = getRoleStyle(theme);

  const load = (searchQuery = '') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    params.append('limit', '100'); // Augmenter la limite pour tous les utilisateurs

    api.get(`/api/admin/users/list?${params.toString()}`)
      .then((r) => setUsers(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Recharger avec la recherche quand le query change
  useEffect(() => {
    const timer = setTimeout(() => load(query), 300); // Délai pour éviter trop de requêtes
    return () => clearTimeout(timer);
  }, [query]);

  // Filtre local : rôle seulement (recherche se fait backend)
  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchRole;
  });

  const toggleStatus = async (u, newStatus) => {
    try {
      await api.patch(`/api/admin/users/${u.id}/status`, { is_active: newStatus });
      setUsers((list) => list.map((x) => x.id === u.id ? { ...x, is_active: newStatus } : x));
      setToast({ message: `Compte ${newStatus ? 'activé' : 'désactivé'} ✓`, type: 'success' });
    } catch {
      setToast({ message: 'Erreur mise à jour', type: 'error' });
    }
  };

  // La suppression = désactivation permanente (pas de DELETE API côté backend)
  const handleDelete = async () => {
    if (!confirmUser) return;
    try {
      await api.patch(`/api/admin/users/${confirmUser.id}/status`, { is_active: false });
      setUsers((list) => list.map((x) => x.id === confirmUser.id ? { ...x, is_active: false } : x));
      setToast({ message: 'Compte supprimé (désactivé définitivement)', type: 'success' });
    } catch {
      setToast({ message: 'Erreur suppression', type: 'error' });
    } finally {
      setConfirmUser(null);
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <PageShell>
      {/* Header */}
      <div style={{
        padding: '54px 20px 0', borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <BackButton to="/admin" />
          <div style={{ flex: 1 }}>
            <Eyebrow>Administration</Eyebrow>
            <H2 style={{ marginTop: 2, color: theme.chocolate }}>Utilisatrices</H2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: theme.serif, fontSize: 26, color: theme.chocolate, lineHeight: 1, fontWeight: 800 }}>
              {users.length}
            </div>
            <div style={{ fontSize: 10, color: theme.textMute }}>comptes</div>
          </div>
        </div>

        {/* Compteurs rapides */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Actives',     count: activeCount,   color: theme.safe,   bg: theme.safeSoft   },
            { label: 'Inactives',   count: inactiveCount, color: theme.danger, bg: theme.dangerSoft },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Barre de recherche */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: theme.surface, borderRadius: 12, border: `1.5px solid ${theme.border}`,
          padding: '0 14px', height: 46, marginBottom: 12,
        }}>
          <Icon d={ICONS.search} size={18} color={theme.textMute} />
          <input
            type="text"
            placeholder="Rechercher un nom ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: theme.text, fontFamily: theme.font,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: theme.textMute, display: 'flex', cursor: 'pointer' }}>
              <Icon d={ICONS.x} size={16} />
            </button>
          )}
        </div>

        {/* Filtre par rôle */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 14, overflowX: 'auto' }}>
          {[
            { v: 'all',       l: 'Toutes' },
            { v: 'user',      l: 'Utilisatrices' },
            { v: 'superadmin',l: 'Admin' },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilterRole(f.v)} style={{
              padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              background: filterRole === f.v ? theme.chocolate : theme.surface,
              color: filterRole === f.v ? theme.textOnDark : theme.textDim,
              border: filterRole === f.v ? 'none' : `1px solid ${theme.border}`,
              fontFamily: theme.font,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      <ScrollArea style={{ padding: '12px 16px 40px', background: theme.bg }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, color: theme.textMute }}>Aucun résultat pour « {query} »</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((u) => {
              const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user;
              return (
                <Card key={u.id} style={{ padding: 14, opacity: u.is_active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={44} name={u.full_name || u.email} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: theme.chocolate,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u.role === 'superadmin' ? 'Admin' : (u.full_name || '—')}
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMute, marginTop: 1 }}>{u.email}</div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                          background: rs.bg, color: rs.color,
                        }}>{rs.label || (u.role === 'superadmin' ? 'Admin' : u.role)}</span>
                        {!u.is_active && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                            background: theme.dangerSoft, color: theme.danger,
                          }}>Désactivé</span>
                        )}
                        {u.onboarding_done && (
                          <span style={{ fontSize: 10, color: theme.textFaint }}>✓ Onboarding</span>
                        )}
                        <span style={{ fontSize: 10, color: theme.textFaint }}>{fmtDate(u.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={() => toggleStatus(u, !u.is_active)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: u.is_active ? theme.warnSoft : theme.safeSoft,
                        color: u.is_active ? theme.warn : theme.safe,
                        border: 'none', fontWeight: 700, fontSize: 12, fontFamily: theme.font,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      {u.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                    {u.is_active && (
                      <button
                        onClick={() => setConfirmUser(u)}
                        style={{
                          padding: '9px 14px', borderRadius: 10,
                          background: theme.dangerSoft, color: theme.danger,
                          border: 'none', fontWeight: 700, fontSize: 12,
                          fontFamily: theme.font, display: 'flex', alignItems: 'center', gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Icon d={ICONS.trash} size={14} color={theme.danger} />
                        Supprimer
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Modale de confirmation suppression */}
      {confirmUser && (
        <ConfirmModal
          user={confirmUser}
          onConfirm={handleDelete}
          onCancel={() => setConfirmUser(null)}
          theme={theme}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
