import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, Input, H1, Eyebrow, BackButton, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const EMERGENCY_TYPES = [
  { v: 'police', l: '🚔 Police — 110' },
  { v: 'pompiers', l: '🚒 Pompiers — 112' },
  { v: 'samu', l: '🏥 SAMU — 115' },
  { v: 'violences', l: '📞 Violences — 180' },
  { v: 'enfance', l: '👧 Protection enfance — 1308' },
  { v: 'autre', l: '📱 Autre' },
];

export default function OnboardingEmergency() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState({ type: 'police', number: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/api/emergency-numbers')
      .then((r) => setNumbers(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const addNumber = () => {
    if (!newNumber.number.trim()) {
      setToast({ message: 'Numéro requis', type: 'warn' });
      return;
    }
    if (numbers.length >= 2 && !newNumber.name) {
      setToast({ message: 'Nom requis pour le 3e numéro', type: 'warn' });
      return;
    }
    setNumbers((n) => [
      ...n,
      { ...newNumber, id: Math.random(), is_custom: true },
    ]);
    setNewNumber({ type: 'police', number: '', name: '' });
  };

  const removeNumber = (id) => {
    setNumbers((n) => n.filter((x) => x.id !== id));
  };

  const canContinue = numbers.length >= 2;

  const continueOnboarding = () => {
    if (!canContinue) {
      setToast({ message: 'Ajoute au moins 2 numéros d\'urgence', type: 'error' });
      return;
    }
    navigate('/onboarding-phone');
  };

  return (
    <PageShell style={{ background: `radial-gradient(80% 50% at 50% 0%, ${HS.sakura}22, ${HS.bg})` }}>
      <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ width: 40 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2].map((i) => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2,
              background: i === 1 ? HS.sakuraDeep : HS.mistyRose }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: HS.textMute }}>1/2</span>
      </div>

      <ScrollArea style={{ padding: '22px 24px 24px' }}>
        <H1>Tes numéros<br />d'urgence 🆘</H1>
        <div style={{ fontSize: 13.5, color: HS.textDim, marginTop: 8, lineHeight: 1.5, marginBottom: 24 }}>
          Ajoute au moins 2 numéros. Ils seront à portée de main en cas de danger.
        </div>

        {/* Numéros déjà ajoutés */}
        {numbers.length > 0 && (
          <>
            <Eyebrow style={{ marginBottom: 10 }}>Numéros ajoutés ({numbers.length}/5)</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {numbers.map((n) => (
                <Card key={n.id} style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate }}>
                      {n.name || EMERGENCY_TYPES.find((t) => t.v === n.type)?.l || n.type}
                    </div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: HS.sakuraDeep, marginTop: 4 }}>
                      {n.number}
                    </div>
                  </div>
                  <button
                    onClick={() => removeNumber(n.id)}
                    style={{ background: HS.dangerSoft, border: 'none', color: HS.danger, padding: '6px 12px',
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}
                  >
                    Retirer
                  </button>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Formulaire ajout */}
        <Eyebrow style={{ marginBottom: 10 }}>Ajouter un numéro</Eyebrow>
        <Card style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Type */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                Type d'urgence
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {EMERGENCY_TYPES.map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setNewNumber((n) => ({ ...n, type: t.v }))}
                    style={{
                      padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: newNumber.type === t.v ? HS.sakura : HS.surface,
                      color: newNumber.type === t.v ? '#fff' : HS.textDim,
                      border: `1px solid ${newNumber.type === t.v ? HS.sakura : HS.border}`,
                      fontFamily: HS.font, cursor: 'pointer',
                    }}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro */}
            <Input
              label="Numéro"
              placeholder="110, 112, ou autre"
              value={newNumber.number}
              onChange={(e) => setNewNumber((n) => ({ ...n, number: e.target.value }))}
              icon={<Icon d={ICONS.phone} size={18} />}
            />

            {/* Nom (optionnel sauf si > 2 numéros) */}
            {numbers.length >= 2 && (
              <Input
                label="Nom/Description (optionnel)"
                placeholder="Ex: Médecin de garde"
                value={newNumber.name}
                onChange={(e) => setNewNumber((n) => ({ ...n, name: e.target.value }))}
              />
            )}

            <Button
              type="button"
              variant="light"
              onClick={addNumber}
              icon={<Icon d={ICONS.plus} size={18} color={HS.sakuraDeep} />}
            >
              Ajouter ce numéro
            </Button>
          </div>
        </Card>

        {/* Prérequis */}
        <div style={{ padding: '12px 14px', background: HS.mistyRose, borderRadius: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>
              {canContinue ? '✅' : '⚠️'}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate, marginBottom: 4 }}>
                {canContinue ? 'Prêt à continuer !' : 'Ajoute 2 numéros minimum'}
              </div>
              <div style={{ fontSize: 11, color: HS.textDim }}>
                {canContinue
                  ? `Tu as ${numbers.length} numéro${numbers.length > 1 ? 's' : ''} — tu peux continuer`
                  : `${2 - numbers.length} numéro${2 - numbers.length > 1 ? 's' : ''} manquant${2 - numbers.length > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={continueOnboarding}
          disabled={!canContinue}
          icon={<Icon d={ICONS.arrow} size={18} color={canContinue ? HS.textOnDark : HS.textMute} />}
          style={{ opacity: canContinue ? 1 : 0.5 }}
        >
          Continuer vers tes contacts
        </Button>
      </ScrollArea>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
