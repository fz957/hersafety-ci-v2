import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import { ICONS } from '../../tokens';
import { Icon } from '../../components/ui/index.jsx';
import api from '../../services/api';

export default function AdminAdmins() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '' });
  const [message, setMessage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Charger les admins
  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/admins');
      setAdmins(res.data.data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
      setMessage({ type: 'error', text: 'Erreur chargement admins' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      setMessage({ type: 'error', text: 'Email et nom requis' });
      return;
    }

    try {
      setIsCreating(true);
      await api.post('/api/admin/create-admin', {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
      });

      setMessage({ type: 'success', text: '✅ Admin créé! Email de setup envoyé' });
      setFormData({ email: '', full_name: '' });
      setShowForm(false);

      // Recharger la liste
      setTimeout(() => fetchAdmins(), 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur création admin';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text }}>
      <AdminSidebar activeTab="admins" />

      <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.chocolate, margin: 0 }}>
            👥 Gestion des Admins
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: theme.chocolate,
              color: '#fff',
              border: 'none',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showForm ? 'Annuler' : '+ Créer un nouvel admin'}
          </button>
        </div>

        {/* Formulaire création */}
        {showForm && (
          <div style={{
            background: theme.surface,
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
            padding: '24px',
            marginBottom: 32,
            maxWidth: 500,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 16 }}>
              Créer un nouvel admin
            </h3>

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: theme.textMute, display: 'block', marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="admin@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    background: theme.bg,
                    color: theme.text,
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: theme.textMute, display: 'block', marginBottom: 4 }}>
                  Nom complet
                </label>
                <input
                  type="text"
                  placeholder="Nom et prénom"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    background: theme.bg,
                    color: theme.text,
                    fontSize: 14,
                    fontFamily: 'inherit',
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
                disabled={isCreating}
                style={{
                  background: theme.chocolate,
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  opacity: isCreating ? 0.6 : 1,
                }}
              >
                {isCreating ? 'Création...' : 'Créer l\'admin'}
              </button>
            </form>
          </div>
        )}

        {/* Liste des admins */}
        <div style={{
          background: theme.surface,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMute, flex: 1 }}>
              {loading ? 'Chargement...' : `${admins.length} admin${admins.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: theme.textMute }}>
              Chargement...
            </div>
          ) : admins.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: theme.textMute }}>
              Aucun admin trouvé
            </div>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* Avatar initial */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: theme.chocolate,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                }}>
                  {admin.full_name?.charAt(0).toUpperCase() || 'A'}
                </div>

                {/* Info admin */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                    {admin.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMute, marginTop: 2 }}>
                    {admin.email}
                  </div>
                </div>

                {/* Badge "Toi" si c'est l'utilisateur actuel */}
                {admin.id === user?.id && (
                  <div style={{
                    background: theme.safeSoft,
                    color: theme.safe,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    ✓ C'est toi
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
