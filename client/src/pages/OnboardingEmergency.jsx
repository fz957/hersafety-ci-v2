import { useNavigate } from 'react-router-dom';
import { HS, ICONS } from '../tokens';
import { Icon, Button, Card, H1, Eyebrow, PageShell, ScrollArea } from '../components/ui/index.jsx';

// Ressources utiles - informatives, pas obligatoires à ajouter
const RESOURCES = [
  { icon: '🚔', title: 'Police', number: '110', desc: 'Sécurité & urgences' },
  { icon: '🚒', title: 'Pompiers', number: '112', desc: 'Incendies & secours' },
  { icon: '🏥', title: 'SAMU', number: '115', desc: 'Urgences médicales' },
  { icon: '📞', title: 'Violences', number: '180', desc: 'Ligne d\'écoute femmes' },
  { icon: '👧', title: 'Protection enfance', number: '1308', desc: 'Maltraitance enfants' },
  { icon: '👩‍💼', title: 'Ministère de la Femme', number: '+225 20 22 72 72', desc: 'Droits & politiques' },
  { icon: '🤝', title: 'ONG Femmes Côte d\'Ivoire', number: '+225 01 48 99 55', desc: 'Support & aide' },
  { icon: '💬', title: 'Ligne d\'écoute femmes', number: '+225 07 07 07 70', desc: 'Psychologue 24h/24' },
];

export default function OnboardingEmergency() {
  const navigate = useNavigate();

  return (
    <PageShell style={{ background: `radial-gradient(80% 50% at 50% 0%, ${HS.sakura}22, ${HS.bg})` }}>
      <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ width: 40 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[1].map((i) => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2, background: HS.sakuraDeep }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: HS.textMute }}>Info</span>
      </div>

      <ScrollArea style={{ padding: '22px 24px 24px' }}>
        <H1>Ressources<br />utiles 💙</H1>
        <div style={{ fontSize: 13.5, color: HS.textDim, marginTop: 8, lineHeight: 1.5, marginBottom: 24 }}>
          Les numéros et organisations qui peuvent t'aider. À titre informatif seulement.
        </div>

        {/* Ressources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RESOURCES.map((res, idx) => (
            <Card key={idx} style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{res.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate }}>{res.title}</div>
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>{res.desc}</div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: HS.sakuraDeep, marginTop: 6 }}>
                  {res.number}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ padding: '12px 14px', background: HS.mistyRose, borderRadius: 12, marginTop: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: HS.chocolate, marginBottom: 4 }}>
                Prochaine étape
              </div>
              <div style={{ fontSize: 11, color: HS.textDim }}>
                Ajoute maintenant tes amis proches comme contacts d'urgence (minimum 2).
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate('/onboarding')}
          icon={<Icon d={ICONS.arrow} size={20} color={HS.bg} />}
        >
          Continuer vers tes contacts d'urgence
        </Button>
      </ScrollArea>
    </PageShell>
  );
}
