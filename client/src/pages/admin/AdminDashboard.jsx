import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import AdminAssistant from '../../components/admin/AdminAssistant.jsx';
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

      // Fetch only ACTIVE alerts for the dashboard (not resolved ones)
      const alertsRes = await api.get('/api/admin/alerts/active');
      setAlerts(alertsRes.data.data || []);

      const usersRes = await api.get('/api/admin/users/list');
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format alert ID (show first 8 chars uppercase)
  const formatAlertId = (id) => {
    if (!id) return '—';
    return `AL-${String(id).substring(0, 4).toUpperCase()}`;
  };

  // Get level badge
  const getLevelBadge = (level) => {
    const levels = {
      '1': { label: 'Vigilance', color: theme.safe },
      '2': { label: 'Malaise', color: theme.warn },
      '3': { label: 'Danger', color: theme.danger },
      '4': { label: 'SOS', color: theme.danger }
    };
    return levels[level] || { label: '—', color: theme.textMute };
  };

  // Format time (how long ago)
  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000 / 60); // minutes

    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(diff / 1440);
    return `${days}j`;
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
          padding: '32px 32px 20px',
          background: theme.bg,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>
                Bonjour, {user?.full_name || 'Admin'}.
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: theme.chocolate, lineHeight: 1 }}>
                Voici l'état du réseau.
              </div>
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
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}>
            <StatsCard
              label="Alertes 24h"
              value={stats?.alerts_today || 0}
              delta="+12.4%"
              color={theme.danger}
              bgColor={theme.dangerSoft}
              icon={ICONS.alert}
            />
            <StatsCard
              label="Utilisatrices actives"
              value={stats?.active_users || 0}
              delta="+823"
              color={theme.sakuraDeep}
              bgColor={theme.mistyRose}
              icon={ICONS.user}
            />
            <StatsCard
              label="Temps réponse moyen"
              value={stats?.avg_response_time || '2:18'}
              delta="-14s"
              color={theme.safe}
              bgColor={theme.safeSoft}
              icon={ICONS.clock}
              good
            />
            <StatsCard
              label="Signalements vérifiés"
              value={stats?.verified_reports || 0}
              delta="+47"
              color={theme.warn}
              bgColor={theme.warnSoft}
              icon={ICONS.flag}
            />
          </div>
        </header>

        {/* Content Area - Two Columns */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, background: theme.bg }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.textMute }}>Chargement...</div>
          ) : (
            <>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Alerts Chart */}
                <div style={{
                  background: theme.surface,
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                  padding: '20px 24px',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px 0', color: theme.text }}>
                    Alertes par heure
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-around',
                    height: 200,
                    gap: 8,
                    paddingBottom: 16,
                  }}>
                    {[40, 35, 45, 42, 50, 55, 65, 58, 45, 35, 28, 20].map((h, i) => (
                      <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{
                          height: `${(h / 70) * 150}px`,
                          background: `linear-gradient(to top, ${theme.sakura}, ${theme.sakura}80)`,
                          borderRadius: '4px 4px 0 0',
                          marginBottom: 8,
                        }} />
                        <div style={{ fontSize: 10, color: theme.textMute }}>
                          {String(i).padStart(2, '0')}h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerts Table */}
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
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Alertes actives</h3>
                    <span style={{ fontSize: 12, color: theme.textMute }}>{alerts.length} sur 47 affichages</span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{
                        background: `${theme.bg}50`,
                        borderBottom: `1px solid ${theme.border}`,
                        fontWeight: 700,
                        height: 40,
                      }}>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute, width: '70px' }}>ID</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>UTILISATRICE</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute }}>LIEU</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute, width: '100px' }}>TYPE</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute, width: '100px' }}>NIVEAU</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute, width: '80px' }}>HEURE</th>
                        <th style={{ padding: '0 12px', textAlign: 'left', color: theme.textMute, width: '80px' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.length > 0 ? (
                        alerts.slice(0, 8).map((alert) => {
                          const levelInfo = getLevelBadge(alert.level);
                          return (
                            <tr key={alert.id} style={{ borderBottom: `1px solid ${theme.border}`, height: 44 }}>
                              <td style={{ padding: '0 12px', color: theme.danger, fontWeight: 700 }}>
                                {formatAlertId(alert.id)}
                              </td>
                              <td style={{ padding: '0 12px', color: theme.text }}>
                                {alert.full_name || 'Anon.'}
                              </td>
                              <td style={{ padding: '0 12px', color: theme.textMute }}>
                                {alert.location_label || '—'}
                              </td>
                              <td style={{ padding: '0 12px', color: theme.textMute, fontSize: 12 }}>
                                {alert.status === 'active' ? 'En cours' : 'Résolu'}
                              </td>
                              <td style={{ padding: '0 12px' }}>
                                <span style={{
                                  background: levelInfo.color,
                                  color: '#fff',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'inline-block'
                                }}>
                                  {levelInfo.label}
                                </span>
                              </td>
                              <td style={{ padding: '0 12px', color: theme.textMute, fontSize: 12 }}>
                                {formatTime(alert.created_at)}
                              </td>
                              <td style={{ padding: '0 12px' }}>
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.patch(`/api/alerts/${alert.id}/resolve`, { status: 'resolved' });
                                      fetchData(); // Refresh data
                                    } catch (err) {
                                      console.error('Error resolving alert:', err);
                                    }
                                  }}
                                  style={{
                                    background: HS.chocolate,
                                    color: '#fff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}>
                                  Presser
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: theme.textMute }}>
                            Aucune alerte actuellement
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Quartiers Chart */}
                <div style={{
                  background: theme.surface,
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                  padding: '20px 24px',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px 0', color: theme.text }}>
                    Quartiers les plus actifs
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { name: 'Cocody', count: 318 },
                      { name: 'Yopougon', count: 247 },
                      { name: 'Marcory', count: 184 },
                      { name: 'Treichville', count: 142 },
                      { name: 'Abobo', count: 98 },
                    ].map((q) => (
                      <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                            {q.name}
                          </div>
                          <div style={{
                            height: 8,
                            background: theme.bg,
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              background: theme.sakura,
                              width: `${(q.count / 318) * 100}%`
                            }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMute, minWidth: 40, textAlign: 'right' }}>
                          {q.count}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: theme.text }}>
                      Modération utilisatrices
                    </h3>
                  </div>

                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {users.length > 0 ? (
                      users.slice(0, 8).map((u) => (
                        <div key={u.id} style={{
                          padding: '12px 16px',
                          borderBottom: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: theme.mistyRose,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: theme.sakuraDeep,
                            fontSize: 12,
                            flexShrink: 0
                          }}>
                            {u.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>
                              {u.full_name || u.email}
                            </div>
                            <div style={{ fontSize: 11, color: theme.textMute }}>
                              {u.email}
                            </div>
                          </div>
                          <button style={{
                            background: u.is_active ? theme.safeSoft : theme.dangerSoft,
                            color: u.is_active ? theme.safe : theme.danger,
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0
                          }}>
                            {u.is_active ? '✓ Actif' : 'Inactif'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: theme.textMute }}>
                        Aucune utilisatrice
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Assistant IA */}
      <AdminAssistant />
    </div>
  );
}
