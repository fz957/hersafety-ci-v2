import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Input, H1, Eyebrow, BackButton, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const RELATIONS = ['famille', 'ami', 'collegue', 'autre'];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts]   = useState([]);
  const [newContact, setNewContact] = useState({ full_name: '', phone: '', relation: 'famille' });
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/api/contacts').then((r) => setContacts(r.data.data)).finally(() => setLoading(false));
  }, []);

  const addContact = async () => {
    if (!newContact.full_name || !newContact.phone) {
      setToast({ message: 'Nom et téléphone requis', type: 'warn' });
      return;
    }
    try {
      const res = await api.post('/api/contacts', newContact);
      setContacts((c) => [...c, res.data.data]);
      setNewContact({ full_name: '', phone: '', relation: 'famille' });
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur ajout contact', type: 'error' });
    }
  };

  const removeContact = async (id) => {
    await api.delete(`/api/contacts/${id}`);
    setContacts((c) => c.filter((x) => x.id !== id));
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me', { onboarding_done: true });
      setUser((u) => ({ ...u, onboarding_done: true }));
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const INIT_COLORS = [HS.sakura, HS.milkTea, HS.aloewood, HS.chocolate];

  return (
    <PageShell>
      <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton to="/onboarding-phone" />
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2].map((i) => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2,
              background: i <= 2 ? HS.sakuraDeep : HS.mistyRose }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: HS.textMute }}>2/2</span>
      </div>

      <ScrollArea style={{ padding: '22px 24px 24px' }}>
        <H1>Ton cercle<br />de confiance 💕</H1>
        <div style={{ fontSize: 13.5, color: HS.textDim, marginTop: 8, lineHeight: 1.5 }}>
          Ces personnes seront notifiées en temps réel si tu actives une alerte. Au moins une.
        </div>

        {/* Compteur */}
        <div style={{ marginTop: 22, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>Sélectionnées · {contacts.length}/5</Eyebrow>
          <span style={{ fontSize: 11, color: HS.textMute }}>Max 5 contacts</span>
        </div>

        {/* Liste des contacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c, i) => (
            <Card key={c.id} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12,
              borderColor: HS.borderStrong }}>
              <div style={{ width: 44, height: 44, borderRadius: 14,
                background: INIT_COLORS[i % INIT_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16 }}>
                {(c.full_name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>{c.full_name}</div>
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>
                  <span style={{ color: HS.sakuraDeep, fontWeight: 600 }}>{c.relation}</span> · {c.phone}
                </div>
              </div>
              <button onClick={() => removeContact(c.id)}
                style={{ background: HS.dangerSoft, border: 'none', borderRadius: 8, padding: 8,
                  color: HS.danger, display: 'flex' }}>
                <Icon d={ICONS.trash} size={16} />
              </button>
            </Card>
          ))}
          {loading && <div style={{ textAlign: 'center', color: HS.textMute, padding: 12, fontSize: 13 }}>
            Chargement…
          </div>}
        </div>

        {/* Formulaire ajout */}
        {contacts.length < 5 && (
          <div style={{ marginTop: 22 }}>
            <Eyebrow>Ajouter manuellement</Eyebrow>
            <Card style={{ padding: 16, marginTop: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input
                  label="Nom complet"
                  placeholder="Prénom Nom"
                  value={newContact.full_name}
                  onChange={(e) => setNewContact((n) => ({ ...n, full_name: e.target.value }))}
                  icon={<Icon d={ICONS.user} size={18} />}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      label="Téléphone"
                      placeholder="+225 07 …"
                      value={newContact.phone}
                      onChange={(e) => setNewContact((n) => ({ ...n, phone: e.target.value }))}
                      icon={<Icon d={ICONS.phone} size={18} />}
                    />
                  </div>
                  <div style={{ width: 110 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8,
                      letterSpacing: 0.6, textTransform: 'uppercase' }}>Relation</div>
                    <select
                      value={newContact.relation}
                      onChange={(e) => setNewContact((n) => ({ ...n, relation: e.target.value }))}
                      style={{ width: '100%', height: 52, borderRadius: 16, border: `1.5px solid ${HS.border}`,
                        background: HS.surface, padding: '0 12px', fontSize: 13, fontFamily: HS.font,
                        color: HS.textDim, fontWeight: 600, outline: 'none' }}>
                      {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <Button variant="soft" onClick={addContact}
                  icon={<Icon d={ICONS.plus} size={18} color={HS.chocolate} />}
                  style={{ minHeight: 48 }}>
                  Ajouter ce contact
                </Button>
              </div>
            </Card>
          </div>
        )}

        <Button
          onClick={finish}
          disabled={saving || contacts.length === 0}
          style={{ marginTop: 22 }}
          icon={<Icon d={ICONS.arrow} size={20} color={HS.bg} />}
        >
          {saving ? 'Enregistrement…' : 'Terminer la configuration'}
        </Button>

        {contacts.length === 0 && !loading && (
          <div style={{ textAlign: 'center', fontSize: 12, color: HS.textMute, marginTop: 8 }}>
            Ajoute au moins un contact pour continuer.
          </div>
        )}
      </ScrollArea>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
