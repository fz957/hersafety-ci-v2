import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { Icon, Card, Eyebrow, H2, Logo, Avatar, PageShell, ScrollArea, Spinner } from '../../components/ui/index.jsx';

function StatCard({ label, value, color, icon, sub }) {
  return (
    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon d={icon} size={22} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: HS.serif, fontSize: 30, lineHeight: 1, color: HS.chocolate }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: HS.textMute, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: HS.textFaint, marginTop: 1 }}>{sub}</div>}
      </div>
    </Card>
  );
}

function NavLink({ icon, label, path, badge }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)} style={{
      width: '100%', padding: '16px 18px', borderRadius: 18, background: HS.surface,
      border: `1px solid ${HS.border}`, display: 'flex', alignItems: 'center', gap: 14,
      textAlign: 'left', cursor: 'pointer', fontFamily: HS.font,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: HS.mistyRose,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon d={icon} size={20} color={HS.sakuraDeep} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>{label}</div>
      </div>
      {badge > 0 && (
        <span style={{ background: HS.danger, color: '#fff', borderRadius: 10, padding: '2px 8px',
          fontSize: 11, fontWeight: 800 }}>{badge}</span>
      )}
      <Icon d={ICONS.arrow} size={18} color={HS.textMute} />
    </button>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats').then((r) => setStats(r.data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      {/* Header */}
      <div style={{ padding: '54px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${HS.border}` }}>
        <Logo size={18} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
            background: user?.role === 'superadmin' ? HS.chocolate : HS.mistyRose,
            color: user?.role === 'superadmin' ? HS.textOnDark : HS.sakuraDeep }}>
            {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>
          <Avatar size={36} name={user?.full_name} />
        </div>
      </div>

      <ScrollArea style={{ padding: '20px 16px 40px' }}>
        <div style={{ marginBottom: 8 }}>
          <Eyebrow>Tableau de bord</Eyebrow>
          <H2 style={{ marginTop: 4 }}>{user?.organization_name || 'Organisation'}</H2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
            <StatCard label="Alertes aujourd'hui" value={stats?.alerts_today}    color={HS.danger}     icon={ICONS.alert} />
            <StatCard label="Utilisatrices actives" value={stats?.active_users}  color={HS.safe}       icon={ICONS.user} />
            <StatCard label="Signalements en attente" value={stats?.pending_reports}    color={HS.warn} icon={ICONS.flag} />
            <StatCard label="Témoignages en attente" value={stats?.pending_testimonies} color={HS.sakura} icon={ICONS.heart} />
          </div>
        )}

        <Eyebrow style={{ marginBottom: 10 }}>Navigation</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NavLink icon={ICONS.user}    label="Gérer les utilisatrices"  path="/admin/users"       badge={0} />
          <NavLink icon={ICONS.heart}   label="Témoignages en attente"   path="/admin/testimonies" badge={stats?.pending_testimonies || 0} />
          <NavLink icon={ICONS.flag}    label="Signalements en attente"  path="/admin/reports"     badge={stats?.pending_reports || 0} />
          {user?.role === 'superadmin' && (
            <NavLink icon={ICONS.shield} label="Organisations"           path="/admin/orgs"        badge={0} />
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => { navigate('/dashboard'); }}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: HS.surface,
              border: `1px solid ${HS.border}`, fontSize: 13, fontWeight: 700, color: HS.textDim,
              fontFamily: HS.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon d={ICONS.back} size={16} color={HS.textMute} />
            Retour à l'app
          </button>
          <button
            onClick={logout}
            style={{ width: '100%', marginTop: 8, padding: '14px', borderRadius: 14, background: 'transparent',
              border: 'none', fontSize: 13, fontWeight: 700, color: HS.danger, fontFamily: HS.font }}>
            Se déconnecter
          </button>
        </div>
      </ScrollArea>
    </PageShell>
  );
}
