import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import AlertRow from '../../components/admin/AlertRow.jsx';
import { HS } from '../../tokens';
import api from '../../services/api';

export default function AdminAlerts() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/alerts/history');
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error('Error fetching alerts history:', err);
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
      <AdminSidebar activeTab="alerts" user={user} />

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
            <div style={{ fontSize: 12, color: theme.textMute }}>Historique</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.chocolate }}>Alertes</div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme.textMute }}>
              Chargement...
            </div>
          ) : (
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
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Historique des alertes</h3>
                <span style={{ fontSize: 12, color: theme.textMute }}>
                  {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
                </span>
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
                    alerts.map((alert) => (
                      <AlertRow key={alert.id} alert={alert} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: theme.textMute }}>
                        Aucune alerte dans l'historique
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
