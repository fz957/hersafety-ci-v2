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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [nameFormData, setNameFormData] = useState({ full_name: user?.full_name || '' });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications_enabled !== false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/users/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      setMessage({ type: 'success', text: 'Mot de passe modifié' });
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur : ' + (err.response?.data?.error || 'Impossible de modifier') });
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = async (e) => {
    e.preventDefault();
    if (!nameFormData.full_name.trim()) {
      setMessage({ type: 'error', text: 'Le nom ne peut pas être vide' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.patch('/api/users/me', {
        full_name: nameFormData.full_name.trim(),
      });
      // Mettre à jour le contexte utilisateur
      if (response.data?.data) {
        setUser({ ...user, ...response.data.data });
      }
      setMessage({ type: 'success', text: 'Nom modifié avec succès' });
      setShowNameForm(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur : ' + (err.response?.data?.error || 'Impossible de modifier') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await api.delete('/api/users/me');
      setMessage({ type: 'success', text: 'Compte supprimé' });
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur : ' + (err.response?.data?.error || 'Impossible de supprimer') });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEmailNotificationsToggle = async () => {
    try {
      const newValue = !emailNotifications;
      await api.patch('/api/users/me', { email_notifications_enabled: newValue });
      setEmailNotifications(newValue);
      setUser({ ...user, email_notifications_enabled: newValue });
      setMessage({
        type: 'success',
        text: newValue ? '📧 Notifications activées' : '📧 Notifications désactivées'
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur : ' + (err.response?.data?.error || 'Impossible de modifier') });
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
          maxWidth: 500,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 20 }}>
            👤 Mon Profil
          </h2>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Nom</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
              {user?.full_name || 'Admin'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
              {user?.email}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: theme.textMute, marginBottom: 4 }}>Rôle</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.chocolate }}>
              Administrateur
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setShowNameForm(!showNameForm);
                setNameFormData({ full_name: user?.full_name || '' });
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
                marginTop: 8,
              }}
            >
              {showNameForm ? 'Annuler' : 'Modifier nom'}
            </button>

            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              style={{
                background: theme.chocolate,
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              {showPasswordForm ? 'Annuler' : 'Modifier le mot de passe'}
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
                marginTop: 8,
              }}
            >
              Supprimer mon compte
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
          maxWidth: 500,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 20 }}>
            📧 Notifications Email
          </h2>

          <p style={{ fontSize: 13, color: theme.textMute, marginBottom: 16, lineHeight: 1.5 }}>
            Reçois des notifications par email pour:
          </p>

          <ul style={{ fontSize: 13, color: theme.text, marginBottom: 20, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>🚨 Nouvelles alertes créées</li>
            <li>📍 Nouveaux signalements</li>
            <li>💬 Nouveaux commentaires en attente de modération</li>
          </ul>

          <button
            onClick={handleEmailNotificationsToggle}
            style={{
              background: emailNotifications ? theme.safe : theme.textMute,
              color: '#fff',
              border: 'none',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {emailNotifications ? '✓ Notifications activées' : '✗ Notifications désactivées'}
          </button>

          {message && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: message.type === 'error' ? theme.dangerSoft : theme.safeSoft,
              color: message.type === 'error' ? theme.danger : theme.safe,
              fontSize: 12,
              fontWeight: 600,
              marginTop: 12,
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Formulaire modification nom */}
        {showNameForm && (
          <div style={{
            background: theme.surface,
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
            padding: '24px',
            maxWidth: 500,
            marginBottom: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 16 }}>
              Modifier mon nom
            </h3>

            <form onSubmit={handleNameChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMute }}>Nouveau nom</label>
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={nameFormData.full_name}
                  onChange={(e) => setNameFormData({ full_name: e.target.value })}
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
                {loading ? 'En cours...' : 'Modifier'}
              </button>
            </form>
          </div>
        )}

        {/* Formulaire changement mot de passe */}
        {showPasswordForm && (
          <div style={{
            background: theme.surface,
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
            padding: '24px',
            maxWidth: 500,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 16 }}>
              Modifier le mot de passe
            </h3>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMute }}>Mot de passe actuel</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
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
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: theme.textMute }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
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
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: theme.textMute }}>Confirmer</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
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
                {loading ? 'En cours...' : 'Modifier'}
              </button>
            </form>
          </div>
        )}

        {/* Modale confirmation suppression */}
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
                Cette action est <strong>irréversible</strong>. Vous perdrez tous vos accès et données associées.
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
                  {loading ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
