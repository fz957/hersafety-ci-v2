import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import StatsCard from '../../components/admin/StatsCard.jsx';
import AlertRow from '../../components/admin/AlertRow.jsx';
import UserRow from '../../components/admin/UserRow.jsx';
import { ICONS, HS } from '../../tokens';
import api from '../../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get('/api/admin/stats');
      setStats(statsRes.data.data);

      const alertsRes = await api.get('/api/admin/alerts/recent');
      setAlerts(alertsRes.data.data || []);

      const usersRes = await api.get('/api/admin/users/list');
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: theme.bg,
      color: theme.text,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Sidebar */}
      <AdminSidebar activeTab="dashboard" user={user} stats={stats} />

      {/* Main Content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <header style={{
          padding: '20px 32px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: theme.surface,
        }}>
          <div>
            <div style={{ fontSize: 12, color: theme.textMute }}>Bonsoir 🌙</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.chocolate }}>Tableau de bord</div>
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              width: 40,
              height: 40,
              borderRadius: 12,
              color: theme.chocolate,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.textMute }}>Chargement...</div>
          ) : (
            <>
              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 32,
              }}>
                <StatsCard
                  label="Alertes 24h"
                  value={stats?.alerts_today || 0}
                  delta="+12.4%"
                  color={HS.danger}
                  bgColor={HS.dangerSoft}
                  icon={ICONS.alert}
                />
                <StatsCard
                  label="Utilisatrices actives"
                  value={stats?.active_users || 0}
                  delta="+823"
                  color={HS.sakuraDeep}
                  bgColor={HS.mistyRose}
                  icon={ICONS.user}
                />
                <StatsCard
                  label="Temps réponse moyen"
                  value={stats?.avg_response_time || '2:18'}
                  delta="-14s"
                  color={HS.safe}
                  bgColor={HS.safeSoft}
                  icon={ICONS.clock}
                  good
                />
                <StatsCard
                  label="Signalements vérifiés"
                  value={stats?.verified_reports || 0}
                  delta="+47"
                  color="#F59E0B"
                  bgColor="#FEF3C7"
                  icon={ICONS.flag}
                />
              </div>

              {/* Alerts Table */}
              <div style={{
                background: theme.surface,
                borderRadius: 16,
                border: `1px solid ${theme.border}`,
                marginBottom: 32,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Alertes en cours</h3>
                  <span style={{ fontSize: 12, color: theme.textMute }}>{alerts.length} alertes</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: `${theme.bg}50`,
                      borderBottom: `1px solid ${theme.border}`,
                      fontWeight: 700,
                      height: 40,
                    }}>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>ID</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Utilisatrice</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Localisation</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Niveau</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Temps</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.length > 0 ? (
                      alerts.slice(0, 10).map((alert) => (
                        <AlertRow key={alert.id} alert={alert} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: theme.textMute }}>
                          Aucune alerte actuellement
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Users Table */}
              <div style={{
                background: theme.surface,
                borderRadius: 16,
                border: `1px solid ${theme.border}`,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Utilisatrices</h3>
                  <span style={{ fontSize: 12, color: theme.textMute }}>{users.length} utilisatrices</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: `${theme.bg}50`,
                      borderBottom: `1px solid ${theme.border}`,
                      fontWeight: 700,
                      height: 40,
                    }}>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Nom</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Email</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Localisation</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Alertes</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Depuis</th>
                      <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.slice(0, 10).map((u) => (
                        <UserRow key={u.id} user={u} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: theme.textMute }}>
                          Aucune utilisatrice trouvée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
