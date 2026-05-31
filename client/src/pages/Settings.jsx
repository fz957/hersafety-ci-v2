import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Input } from '../components/ui/index.jsx';

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications_enabled !== false);
  const [showModal, setShowModal] = useState(null); // 'privacy', 'terms', 'about'

  const handleLogout = async () => {
    if (!window.confirm('Confirmer la déconnexion?')) return;
    try {
      await api.post('/api/auth/logout');
      logout();
      navigate('/login');
    } catch (err) {
      setToast({ message: 'Erreur déconnexion', type: 'error' });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/api/users/me');
      setToast({ message: 'Compte supprimé', type: 'success' });
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1000);
    } catch (err) {
      setToast({ message: 'Erreur suppression compte', type: 'error' });
      setShowDeleteConfirm(false);
    }
  };

  const handleEmailNotificationsToggle = async () => {
    try {
      const newValue = !emailNotifications;
      await api.patch('/api/users/me', { email_notifications_enabled: newValue });
      setEmailNotifications(newValue);
      setToast({
        message: newValue ? 'Notifications Gmail activées' : 'Notifications Gmail désactivées',
        type: 'success'
      });
    } catch (err) {
      setToast({ message: 'Erreur mise à jour notifications', type: 'error' });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/users/me', formData);
      setUser({ ...user, ...formData });
      setIsEditing(false);
      setToast({ message: 'Profil mis à jour', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erreur mise à jour profil', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const firstName = formData.full_name?.split(' ')[0] || 'Toi';

  return (
    <PageShell style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div style={{ padding: '54px 20px 0', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${theme.border}` }}>
        <BackButton to="/dashboard" />
        <div style={{ flex: 1 }}>
          <Eyebrow style={{ color: theme.textMute }}>Paramètres</Eyebrow>
          <H2 style={{ marginTop: 2, color: theme.text }}>Réglages</H2>
        </div>
      </div>

      <ScrollArea style={{ padding: '24px 16px 80px', background: theme.bg }}>
        {/* Profil */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow style={{ marginBottom: 14, color: theme.textDim }}>Profil</Eyebrow>
          <Card style={{ padding: 16, background: theme.surface, border: `1px solid ${theme.border}` }}>
            {!isEditing ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16,
                    background: `linear-gradient(135deg, ${theme.sakura}, ${theme.sakuraDeep})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 22, fontWeight: 800, cursor: 'pointer' }}>
                    {firstName[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                      {formData.full_name || 'Utilisateur'}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textMute, marginTop: 2 }}>
                      {formData.email}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 2 }}>
                      {formData.phone || 'Pas de numéro'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsEditing(true)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                    background: theme.mistyRose, color: theme.chocolate, fontSize: 12, fontWeight: 700,
                    fontFamily: theme.font, cursor: 'pointer'
                  }}>
                  ✏️ Modifier profil
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Nom complet" value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                <Input label="Email" type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <Input label="Téléphone" type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleSaveProfile} disabled={isSaving}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                      background: theme.safe, color: '#fff', fontSize: 12, fontWeight: 700,
                      fontFamily: theme.font, cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}>
                    {isSaving ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: user?.full_name || '',
                      email: user?.email || '',
                      phone: user?.phone || '',
                    });
                  }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                      background: theme.textMute, color: '#fff', fontSize: 12, fontWeight: 700,
                      fontFamily: theme.font, cursor: 'pointer'
                    }}>
                    ✕ Annuler
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow style={{ marginBottom: 14, color: theme.textDim }}>Notifications</Eyebrow>
          <Card style={{ padding: 16, background: theme.surface, border: `1px solid ${theme.border}` }}>
            {/* SMS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Alertes SMS</div>
                <div style={{ fontSize: 12, color: theme.textMute, marginTop: 2 }}>
                  Notifier les contacts par SMS
                </div>
              </div>
              <button onClick={() => setSmsEnabled(!smsEnabled)}
                style={{
                  background: smsEnabled ? theme.sakura : theme.surface2,
                  border: `2px solid ${theme.border}`,
                  width: 56, height: 32, borderRadius: 16,
                  display: 'flex', alignItems: 'center',
                  padding: smsEnabled ? '2px 2px 2px 26px' : '2px 26px 2px 2px',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 14,
                  background: theme.bg, transition: 'all 0.3s' }} />
              </button>
            </div>

            {/* Gmail Notifications */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Notifications Gmail</div>
                <div style={{ fontSize: 12, color: theme.textMute, marginTop: 2 }}>
                  Recevoir les confirmations et rapports
                </div>
              </div>
              <button onClick={handleEmailNotificationsToggle}
                style={{
                  background: emailNotifications ? theme.sakura : theme.surface2,
                  border: `2px solid ${theme.border}`,
                  width: 56, height: 32, borderRadius: 16,
                  display: 'flex', alignItems: 'center',
                  padding: emailNotifications ? '2px 2px 2px 26px' : '2px 26px 2px 2px',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 14,
                  background: theme.bg, transition: 'all 0.3s' }} />
              </button>
            </div>
          </Card>
        </div>

        {/* Confidentialité & Sécurité */}
        <div style={{ marginBottom: 28 }}>
          <Eyebrow style={{ marginBottom: 14, color: theme.textDim }}>Confidentialité</Eyebrow>
          <Card style={{ padding: 16, background: theme.surface, border: `1px solid ${theme.border}` }}>
            <button onClick={() => setShowModal('privacy')} style={{
              width: '100%', textAlign: 'left', padding: '12px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.text, fontSize: 14, fontWeight: 700,
              borderBottom: `1px solid ${theme.border}`, marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔒 Charte de confidentialité</span>
                <Icon d={ICONS.arrow} size={16} color={theme.textMute} />
              </div>
            </button>

            <button onClick={() => setShowModal('terms')} style={{
              width: '100%', textAlign: 'left', padding: '12px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.text, fontSize: 14, fontWeight: 700,
              borderBottom: `1px solid ${theme.border}`, marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📋 Conditions d'utilisation</span>
                <Icon d={ICONS.arrow} size={16} color={theme.textMute} />
              </div>
            </button>

            <button onClick={() => setShowModal('about')} style={{
              width: '100%', textAlign: 'left', padding: '12px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.text, fontSize: 14, fontWeight: 700,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>ℹ️ À propos</span>
                <Icon d={ICONS.arrow} size={16} color={theme.textMute} />
              </div>
            </button>
          </Card>
        </div>

        {/* Supprimer le compte */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: theme.danger, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: theme.font, transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            🗑️ Supprimer mon compte
          </button>
        </div>

        {/* Déconnexion */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={handleLogout}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: theme.chocolate, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: theme.font, transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            🚪 Se déconnecter
          </button>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '20px 0', color: theme.textFaint }}>
          <div style={{ fontSize: 12 }}>HerSafety CI v1.0.0</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>© 2026 · Pour toutes les femmes de Côte d'Ivoire</div>
        </div>
      </ScrollArea>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Modal Charte de Confidentialité */}
      {showModal === 'privacy' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: theme.surface, borderRadius: 16, padding: 24,
            maxWidth: 600, maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h2 style={{ color: theme.text, marginTop: 0 }}>🔒 Charte de Confidentialité</h2>
            <div style={{ color: theme.textMute, lineHeight: 1.8, fontSize: 14 }}>
              <p>
                <strong>HerSafety CI</strong> respecte ta vie privée et s'engage à protéger tes données personnelles.
              </p>

              <h3 style={{ color: theme.text }}>Données collectées</h3>
              <ul>
                <li>Nom complet, email, numéro de téléphone</li>
                <li>Position GPS (uniquement pendant les trajets actifs)</li>
                <li>Contacts de confiance</li>
                <li>Historique des alertes et trajectoires</li>
              </ul>

              <h3 style={{ color: theme.text }}>Utilisation des données</h3>
              <ul>
                <li>Assurer ta sécurité pendant les trajets</li>
                <li>Notifier tes contacts en cas d'urgence</li>
                <li>Améliorer nos services</li>
                <li>Respecter les obligations légales</li>
              </ul>

              <h3 style={{ color: theme.text }}>Sécurité</h3>
              <p>Toutes les données sont chiffrées et stockées de manière sécurisée. Tes mots de passe ne sont jamais stockés en clair.</p>

              <h3 style={{ color: theme.text }}>Droits</h3>
              <p>Tu as le droit d'accéder, modifier ou supprimer tes données à tout moment. Contacte-nous pour exercer ces droits.</p>

              <p style={{ fontSize: 12, color: theme.textFaint }}>Dernière mise à jour: Mai 2026</p>
            </div>
            <button onClick={() => setShowModal(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: theme.chocolate, color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: theme.font, cursor: 'pointer', marginTop: 16
              }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Conditions d'Utilisation */}
      {showModal === 'terms' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: theme.surface, borderRadius: 16, padding: 24,
            maxWidth: 600, maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h2 style={{ color: theme.text, marginTop: 0 }}>📋 Conditions d'Utilisation</h2>
            <div style={{ color: theme.textMute, lineHeight: 1.8, fontSize: 14 }}>
              <h3 style={{ color: theme.text }}>1. Acceptation des conditions</h3>
              <p>En utilisant HerSafety CI, tu acceptes ces conditions d'utilisation.</p>

              <h3 style={{ color: theme.text }}>2. Responsabilité de l'utilisateur</h3>
              <p>Tu es responsable de la sécurité de ton compte et de tes données. Tu dois fournir des informations exactes.</p>

              <h3 style={{ color: theme.text }}>3. Utilisation autorisée</h3>
              <p>L'application est destinée à ta sécurité personnelle. Elle ne doit pas être utilisée de manière frauduleuse ou illégale.</p>

              <h3 style={{ color: theme.text }}>4. Limitation de responsabilité</h3>
              <p>HerSafety CI n'est pas responsable des dommages directs ou indirects résultant de l'utilisation de l'application.</p>

              <h3 style={{ color: theme.text }}>5. Modifications</h3>
              <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications seront notifiées aux utilisateurs.</p>

              <p style={{ fontSize: 12, color: theme.textFaint }}>Dernière mise à jour: Mai 2026</p>
            </div>
            <button onClick={() => setShowModal(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: theme.chocolate, color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: theme.font, cursor: 'pointer', marginTop: 16
              }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal À Propos */}
      {showModal === 'about' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: theme.surface, borderRadius: 16, padding: 24,
            maxWidth: 600, textAlign: 'center'
          }}>
            <h2 style={{ color: theme.text, marginTop: 0 }}>ℹ️ À Propos</h2>
            <div style={{ color: theme.textMute, lineHeight: 1.8, fontSize: 14 }}>
              <h3 style={{ color: theme.sakura, fontSize: 24 }}>HerSafety CI</h3>
              <p style={{ fontSize: 12, color: theme.textFaint }}>Version 1.0.0</p>

              <p>
                <strong>HerSafety CI</strong> est une application de sécurité personnelle pour les femmes en Côte d'Ivoire.
              </p>

              <p>
                Nous mettons à disposition une plateforme douce et puissante qui veille sur toi, où que tu sois.
              </p>

              <div style={{ background: theme.mistyRose, padding: 16, borderRadius: 8, margin: '16px 0', color: theme.chocolate }}>
                <p style={{ margin: 0 }}>💙 Créée pour toutes les femmes de Côte d'Ivoire</p>
              </div>

              <h3 style={{ color: theme.text }}>Notre Mission</h3>
              <p>
                Assurer la sécurité et l'autonomisation des femmes par la technologie et la solidarité communautaire.
              </p>

              <h3 style={{ color: theme.text }}>Contact</h3>
              <p>support@hersafety.ci</p>

              <p style={{ fontSize: 12, color: theme.textFaint }}>© 2026 HerSafety CI · Tous droits réservés</p>
            </div>
            <button onClick={() => setShowModal(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: theme.chocolate, color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: theme.font, cursor: 'pointer', marginTop: 16
              }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Confirmation dialog pour supprimer le compte */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000
        }}>
          <div style={{
            background: theme.surface, borderRadius: 16, padding: 24,
            maxWidth: 400, textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
              Supprimer mon compte?
            </div>
            <div style={{ fontSize: 14, color: theme.textMute, marginBottom: 24, lineHeight: 1.5 }}>
              Cette action est permanente. Toutes tes données seront supprimées.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: theme.textMute, color: '#fff', fontSize: 14, fontWeight: 700,
                  fontFamily: theme.font, cursor: 'pointer'
                }}>
                Non, garder mon compte
              </button>
              <button onClick={handleDeleteAccount}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: theme.danger, color: '#fff', fontSize: 14, fontWeight: 700,
                  fontFamily: theme.font, cursor: 'pointer'
                }}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
