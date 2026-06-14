import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import { ICONS } from '../../tokens';
import { Icon } from '../../components/ui/index.jsx';
import api from '../../services/api';

export default function AdminSettings() {
  const { user, logout, setUser } = useAuth();
  const { theme } = useTheme();
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTab, setEditTab] = useState('profile'); // 'profile' or 'password'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    notify_alerts: user?.notify_alerts !== false,
    notify_reports: user?.notify_reports !== false,
    notify_comments: user?.notify_comments !== false,
  });

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleProfileChange = async (e) => {
    e.preventDefault();
    if (!profileData.full_name.trim() || !profileData.email.trim()) {
      setMessage({ type: 'error', text: 'Tous les champs sont requis' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.patch('/api/users/me', {
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim(),
      });
      if (response.data?.data) {
        setUser({ ...user, ...response.data.data });
      }
      setMessage({ type: 'success', text: '✅ Profil modifié' });
      setTimeout(() => setShowEditForm(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur modification' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/users/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setMessage({ type: 'success', text: '✅ Mot de passe modifié' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setShowEditForm(false), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur modification' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await api.delete('/api/users/me');
      setMessage({ type: 'success', text: 'Compte supprimé' });
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur suppression' });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleNotificationChange = async (key) => {
    try {
      const newValue = !notificationPrefs[key];
      await api.patch('/api/users/me', { [key]: newValue });
      setNotificationPrefs({ ...notificationPrefs, [key]: newValue });
      setUser({ ...user, [key]: newValue });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur modification notification' });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text }}>
      <AdminSidebar activeTab="settings" />

      <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.chocolate, marginBottom: 32 }}>
          Paramètres
        </h1>

        {/* Profil */}
        <div style={{
          background: theme.surface,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          padding: '24px',
          marginBottom: 24,
          maxWidth: 600,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 20 }}>
            👤 Mon Profil
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Nom</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                {user?.full_name || 'Admin'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                {user?.email}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Rôle</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.chocolate }}>
                Administrateur
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setShowEditForm(!showEditForm);
                setEditTab('profile');
                setProfileData({ full_name: user?.full_name || '', email: user?.email || '' });
              }}
              style={{
                background: theme.chocolate,
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showEditForm ? 'Annuler' : '✏️ Modifier'}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: theme.danger,
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🗑️ Supprimer mon compte
            </button>
          </div>
        </div>

        {/* Notifications Email */}
        <div style={{
          background: theme.surface,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          padding: '24px',
          marginBottom: 24,
          maxWidth: 600,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 20 }}>
            📧 Notifications Email
          </h2>

          <p style={{ fontSize: 13, color: theme.textMute, marginBottom: 16 }}>
            Reçois des notifications par email pour:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notificationPrefs.notify_alerts}
                onChange={() => handleNotificationChange('notify_alerts')}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: theme.text }}>
                🚨 Nouvelles alertes créées
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notificationPrefs.notify_reports}
                onChange={() => handleNotificationChange('notify_reports')}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: theme.text }}>
                📍 Nouveaux signalements
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notificationPrefs.notify_comments}
                onChange={() => handleNotificationChange('notify_comments')}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: theme.text }}>
                💬 Nouveaux commentaires en attente de modération
              </span>
            </label>
          </div>

          {message && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: message.type === 'error' ? theme.dangerSoft : theme.safeSoft,
              color: message.type === 'error' ? theme.danger : theme.safe,
              fontSize: 12,
              fontWeight: 600,
              marginTop: 16,
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Modal Modification Profil/Mot de passe */}
        {showEditForm && (
          <div style={{
            background: theme.surface,
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
            padding: '24px',
            maxWidth: 500,
            marginBottom: 24,
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 }}>
              <button
                onClick={() => setEditTab('profile')}
                style={{
                  background: editTab === 'profile' ? theme.chocolate : 'transparent',
                  color: editTab === 'profile' ? '#fff' : theme.textMute,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👤 Profil
              </button>
              <button
                onClick={() => setEditTab('password')}
                style={{
                  background: editTab === 'password' ? theme.chocolate : 'transparent',
                  color: editTab === 'password' ? '#fff' : theme.textMute,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔐 Mot de passe
              </button>
            </div>

            {/* Profile Form */}
            {editTab === 'profile' && (
              <form onSubmit={handleProfileChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: theme.textMute }}>Nom complet</label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: theme.textMute }}>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                {message && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: message.type === 'error' ? theme.dangerSoft : theme.safeSoft,
                    color: message.type === 'error' ? theme.danger : theme.safe,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: theme.chocolate,
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'En cours...' : 'Enregistrer'}
                </button>
              </form>
            )}

            {/* Password Form */}
            {editTab === 'password' && (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: theme.textMute }}>Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: theme.textMute }}>Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: theme.textMute }}>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      color: theme.text,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      marginTop: 4,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                {message && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: message.type === 'error' ? theme.dangerSoft : theme.safeSoft,
                    color: message.type === 'error' ? theme.danger : theme.safe,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: theme.chocolate,
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'En cours...' : 'Enregistrer'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Modal suppression compte */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: theme.surface,
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              padding: '32px',
              maxWidth: 400,
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.danger, marginBottom: 12 }}>
                ⚠️ Supprimer mon compte
              </h3>

              <p style={{ fontSize: 14, color: theme.textMute, marginBottom: 24, lineHeight: 1.5 }}>
                Cette action est <strong>irréversible</strong>. Vous perdrez tous vos accès et données.
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: theme.bg,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    padding: '12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  Annuler
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: theme.danger,
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
