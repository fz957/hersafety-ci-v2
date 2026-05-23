import { useNavigate } from 'react-router-dom';
import { HS, ICONS } from '../tokens';
import { Logo, Petal, Icon, Button, Card, Eyebrow, H1, H2, Avatar, PageShell, ScrollArea } from '../components/ui/index.jsx';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <ScrollArea>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Blobs décoratifs */}
          <div style={{ position: 'absolute', top: -100, right: -80, width: 280, height: 280,
            background: HS.sakura, borderRadius: '50%', opacity: 0.45, filter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', top: 40, right: -40, width: 180, height: 180,
            background: HS.mistyRose, borderRadius: '50%', opacity: 0.7 }} />
          <Petal size={18} color={HS.sakuraDeep} opacity={0.6}
            style={{ position: 'absolute', top: 90, left: 30, transform: 'rotate(20deg)' }} />
          <Petal size={12} color={HS.sakura} opacity={0.5}
            style={{ position: 'absolute', top: 200, left: 50, transform: 'rotate(-30deg)' }} />
          <Petal size={16} color={HS.sakuraDeep} opacity={0.55}
            style={{ position: 'absolute', top: 60, right: 100, transform: 'rotate(60deg)' }} />

          <div style={{ position: 'relative', padding: '60px 24px 28px' }}>
            {/* Navbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
              <Logo size={20} />
              <button style={{
                background: HS.surface, border: `1px solid ${HS.border}`,
                color: HS.chocolate, padding: '8px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
              }}>FR · 🇨🇮</button>
            </div>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: HS.surface, border: `1px solid ${HS.borderStrong}`,
              padding: '6px 14px', borderRadius: 100, marginBottom: 22,
              boxShadow: '0 4px 12px rgba(214,126,128,0.18)',
            }}>
              <Petal size={12} color={HS.sakuraDeep} opacity={1} />
              <span style={{ fontSize: 11, fontWeight: 700, color: HS.chocolate, letterSpacing: 0.3 }}>
                Pour toutes les femmes de Côte d'Ivoire
              </span>
            </div>

            {/* Titre */}
            <H1 style={{ fontSize: 42 }}>
              Tu n'es <br />
              <span style={{ fontStyle: 'italic', color: HS.sakuraDeep }}>jamais seule.</span>
            </H1>
            <div style={{ fontSize: 15, color: HS.textDim, marginTop: 14, lineHeight: 1.5, maxWidth: 300 }}>
              Une appli douce et puissante qui veille sur toi, où que tu sois.
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <Button
                onClick={() => navigate('/register')}
                style={{ flex: 1.4 }}
                icon={<Icon d={ICONS.heart} size={16} color={HS.sakura} />}
              >Je commence</Button>
              <Button variant="light" onClick={() => navigate('/login')} style={{ flex: 1 }}>
                Connexion
              </Button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            COMMENT ÇA MARCHE
        ══════════════════════════════════════ */}
        <div style={{ padding: '8px 20px 4px' }}>
          <Card style={{ padding: '20px 18px' }}>
            <Eyebrow>Comment ça marche</Eyebrow>
            <H2 style={{ marginTop: 6, marginBottom: 16, fontSize: 18 }}>3 étapes. C'est tout.</H2>
            {[
              { n: '1', t: 'Ajoute tes proches', s: "Maman, sœur, copines — celles à qui tu fais confiance.", c: HS.sakura },
              { n: '2', t: 'Active ton bouton SOS', s: "Un tap, un geste — elles savent où tu es.", c: HS.milkTea },
              { n: '3', t: 'Rentre tranquille', s: 'Suivi GPS, lieux sûrs et taxis, communauté à l\'écoute.', c: HS.aloewood },
            ].map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0',
                borderTop: i > 0 ? `1px dashed ${HS.border}` : 'none' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, background: st.c, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HS.serif, fontSize: 18, flexShrink: 0,
                }}>{st.n}</div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>{st.t}</div>
                  <div style={{ fontSize: 12, color: HS.textDim, marginTop: 2, lineHeight: 1.4 }}>{st.s}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* ══════════════════════════════════════
            STATS
        ══════════════════════════════════════ */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            background: `linear-gradient(135deg, ${HS.mistyRose}, ${HS.sakura})`,
            borderRadius: 22, padding: '18px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {[{ v: '47K', l: 'femmes protégées' }, { v: '2,3K', l: 'signalements' }, { v: '180', l: 'quartiers' }]
              .map((s, i, a) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: HS.serif, fontSize: 28, lineHeight: 1, color: HS.chocolate }}>{s.v}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: HS.textDim }}>{s.l}</div>
                  </div>
                  {i < a.length - 1 && <div style={{ width: 1, height: 36, background: 'rgba(68,48,37,0.18)' }} />}
                </div>
              ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            FONCTIONNALITÉS
        ══════════════════════════════════════ */}
        <div style={{ padding: '24px 20px 8px' }}>
          <Eyebrow>Tout ce qu'il te faut</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {[
              { d: ICONS.alert, t: 'SOS instantané',   s: 'Un tap, alerte envoyée',        c: HS.sakuraDeep },
              { d: ICONS.loc,   t: 'GPS partagé',       s: 'Trajet visible aux proches',    c: HS.milkTea },
              { d: ICONS.heart, t: 'Communauté',        s: 'Témoignages anonymes',          c: HS.aloewood },
              { d: ICONS.pin,   t: 'Lieux sûrs',        s: 'Commissariats, pharmacies…',   c: HS.chocolate },
            ].map((f, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: HS.mistyRose,
                  color: f.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon d={f.d} size={20} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: HS.chocolate }}>{f.t}</div>
                <div style={{ fontSize: 11.5, color: HS.textMute, marginTop: 2, lineHeight: 1.4 }}>{f.s}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            TÉMOIGNAGE
        ══════════════════════════════════════ */}
        <div style={{ padding: '24px 20px 12px' }}>
          <Card dark style={{ padding: 22, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
            <Petal size={70} color={HS.sakura} opacity={0.18}
              style={{ position: 'absolute', top: -20, right: -20 }} />
            <div style={{ fontSize: 30, color: HS.sakura, lineHeight: 1, fontFamily: HS.serif }}>"</div>
            <div style={{ fontFamily: HS.serif, fontSize: 17, lineHeight: 1.4, marginTop: 4, color: HS.bg, position: 'relative' }}>
              Hier soir, le bouton SOS m'a sauvée. Trois voisines accourues en 4 minutes.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, position: 'relative' }}>
              <Avatar size={32} name="G" color={HS.sakura} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: HS.bg }}>Grâce M.</div>
                <div style={{ fontSize: 10.5, color: HS.textOnDarkDim }}>Yopougon · Vérifiée</div>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ padding: '12px 20px 48px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: HS.textMute }}>
            Sans abonnement · Sans pub · Tes données restent en CI
          </div>
        </div>

      </ScrollArea>
    </PageShell>
  );
}
