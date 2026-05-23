// HerSafety CI — screens 1-6 (light/girly palette)
const { Logo, TestBanner, Button, Card, Input, BottomNav, Icon } = window;
const HS = window.HS;
const ICONS = window.ICONS;

function ScreenBody({ children, style }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      background: HS.bg, color: HS.text, ...style,
    }}>{children}</div>
  );
}
function H1({ children, style }) {
  return <div style={{ fontFamily: HS.serif, fontWeight: 400, fontSize: 36, lineHeight: 1.05, letterSpacing: -0.8, color: HS.chocolate, ...style }}>{children}</div>;
}
function H2({ children, style }) {
  return <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.3, color: HS.chocolate, ...style }}>{children}</div>;
}
function Eyebrow({ children, color = HS.sakuraDeep }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color }}>{children}</div>;
}

// Subtle sakura petal SVG for decorative use
function Petal({ size = 14, color = HS.sakura, opacity = 0.5, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ opacity, ...style }}>
      <path d="M10 2 C 12 6, 16 8, 14 12 C 12 16, 8 16, 6 12 C 4 8, 8 6, 10 2 Z" fill={color}/>
    </svg>
  );
}

// Avatar placeholder (warm gradient circle with initials)
function Avatar({ size = 40, name = 'A', color, ring = false }) {
  const c1 = color || HS.sakura;
  const c2 = HS.milkTea;
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      color: '#fff', fontWeight: 800, fontSize: size * 0.4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ring ? `0 0 0 3px ${HS.bg}, 0 0 0 5px ${HS.sakura}` : 'none',
      flexShrink: 0,
    }}>{name}</div>
  );
}

// ═════════════════════════════════════════════════════════════
// 1. LANDING — modern, girly, easy to understand
// ═════════════════════════════════════════════════════════════
function ScreenLanding() {
  return (
    <ScreenBody>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 24 }}>
        {/* HERO with decorative petals + sakura blob */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* decorative blob */}
          <div style={{
            position: 'absolute', top: -100, right: -80, width: 280, height: 280,
            background: HS.sakura, borderRadius: '50%', opacity: 0.45,
            filter: 'blur(2px)',
          }}/>
          <div style={{
            position: 'absolute', top: 40, right: -40, width: 180, height: 180,
            background: HS.mistyRose, borderRadius: '50%', opacity: 0.7,
          }}/>
          {/* scattered petals */}
          <Petal size={18} color={HS.sakuraDeep} opacity={0.6} style={{ position: 'absolute', top: 90, left: 30, transform: 'rotate(20deg)' }}/>
          <Petal size={12} color={HS.sakura} opacity={0.5} style={{ position: 'absolute', top: 200, left: 50, transform: 'rotate(-30deg)' }}/>
          <Petal size={16} color={HS.sakuraDeep} opacity={0.55} style={{ position: 'absolute', top: 60, right: 100, transform: 'rotate(60deg)' }}/>

          <div style={{ position: 'relative', padding: '60px 24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
              <Logo size={20}/>
              <button style={{
                background: HS.surface, border: `1px solid ${HS.border}`, color: HS.chocolate,
                padding: '8px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
              }}>FR · 🇨🇮</button>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: HS.surface, border: `1px solid ${HS.borderStrong}`,
              padding: '6px 14px', borderRadius: 100, marginBottom: 22,
              boxShadow: '0 4px 12px rgba(214,126,128,0.18)' }}>
              <Petal size={12} color={HS.sakuraDeep} opacity={1}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: HS.chocolate, letterSpacing: 0.3 }}>
                Pour toutes les femmes de Côte d'Ivoire
              </span>
            </div>

            <H1 style={{ fontSize: 42 }}>
              Tu n'es <br/>
              <span style={{ fontStyle: 'italic', color: HS.sakuraDeep }}>jamais seule.</span>
            </H1>
            <div style={{ fontSize: 15, color: HS.textDim, marginTop: 14, lineHeight: 1.5, maxWidth: 300 }}>
              Une appli douce et puissante qui veille sur toi, où que tu sois.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <Button style={{ flex: 1.4 }} icon={
                <span style={{ display: 'flex' }}><Icon d={ICONS.heart} size={16} color={HS.sakura}/></span>
              }>Je commence</Button>
              <Button variant="light" style={{ flex: 1 }}>Connexion</Button>
            </div>
          </div>
        </div>

        {/* 3 STEPS — easy to understand */}
        <div style={{ padding: '8px 20px 4px' }}>
          <Card style={{ padding: '20px 18px', position: 'relative' }}>
            <Eyebrow>Comment ça marche</Eyebrow>
            <H2 style={{ marginTop: 6, marginBottom: 16, fontSize: 18 }}>3 étapes. C'est tout.</H2>
            {[
              { n: '1', t: 'Ajoute tes proches', s: 'Maman, sœur, copines — celles à qui tu fais confiance.', c: HS.sakura },
              { n: '2', t: 'Active ton bouton SOS', s: 'Un tap, un geste — elles savent où tu es.', c: HS.milkTea },
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

        {/* SOFT STATS RIBBON */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            background: `linear-gradient(135deg, ${HS.mistyRose}, ${HS.sakura})`,
            borderRadius: 22, padding: '18px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: HS.chocolate,
          }}>
            {[
              { v: '47K', l: 'femmes' },
              { v: '2,3K', l: 'signalements' },
              { v: '180', l: 'quartiers' },
            ].map((s, i, a) => (
              <React.Fragment key={i}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: HS.serif, fontSize: 28, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.85 }}>{s.l}</div>
                </div>
                {i < a.length - 1 && <div style={{ width: 1, height: 36, background: 'rgba(68,48,37,0.18)' }}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* FEATURES GRID */}
        <div style={{ padding: '24px 20px 8px' }}>
          <Eyebrow>Tout ce qu'il te faut</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {[
              { d: ICONS.alert, t: 'SOS', s: 'Un tap, alerte envoyée', c: HS.sakuraDeep },
              { d: ICONS.loc,   t: 'GPS partagé', s: 'Trajet visible aux proches', c: HS.milkTea },
              { d: ICONS.heart, t: 'Sœurs', s: 'Témoignages anonymes', c: HS.aloewood },
              { d: ICONS.pin,   t: 'Carte', s: 'Lieux sûrs à proximité', c: HS.chocolate },
            ].map((f, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: HS.mistyRose, color: f.c,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}><Icon d={f.d} size={20}/></div>
                <div style={{ fontSize: 14, fontWeight: 800, color: HS.chocolate }}>{f.t}</div>
                <div style={{ fontSize: 11.5, color: HS.textMute, marginTop: 2, lineHeight: 1.4 }}>{f.s}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* TESTIMONIAL */}
        <div style={{ padding: '24px 20px 12px' }}>
          <Card dark style={{ padding: 22, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
            <Petal size={70} color={HS.sakura} opacity={0.18} style={{ position: 'absolute', top: -20, right: -20 }}/>
            <div style={{ fontSize: 30, color: HS.sakura, lineHeight: 1, fontFamily: HS.serif }}>"</div>
            <div style={{ fontFamily: HS.serif, fontSize: 17, lineHeight: 1.4, marginTop: 4, color: HS.bg, position: 'relative' }}>
              Hier soir, le bouton SOS m'a sauvée. Trois voisines accourues en 4 minutes.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, position: 'relative' }}>
              <Avatar size={32} name="G" color={HS.sakura}/>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: HS.bg }}>Grâce M.</div>
                <div style={{ fontSize: 10.5, color: HS.textOnDarkDim }}>Yopougon · Vérifiée</div>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 20px 24px' }}>
          <Button variant="accent" icon={<Icon d={ICONS.sparkle} size={18} color={HS.chocolate}/>}>
            Créer mon compte gratuit
          </Button>
          <div style={{ textAlign: 'center', fontSize: 11, color: HS.textMute, marginTop: 12 }}>
            Sans abonnement · Sans pub · Tes données restent en CI
          </div>
        </div>
      </div>
    </ScreenBody>
  );
}

// ═════════════════════════════════════════════════════════════
// 2. LOGIN
// ═════════════════════════════════════════════════════════════
function ScreenLogin() {
  return (
    <ScreenBody style={{ position: 'relative' }}>
      {/* decorative top */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220,
        background: HS.sakura, borderRadius: '50%', opacity: 0.35 }}/>
      <div style={{ position: 'absolute', top: -40, left: -80, width: 180, height: 180,
        background: HS.mistyRose, borderRadius: '50%', opacity: 0.7 }}/>

      <div style={{ position: 'relative', padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40, borderRadius: 12, color: HS.chocolate }}>
          <Icon d={ICONS.back} size={18}/>
        </button>
        <Logo size={18} withText={false}/>
        <span style={{ width: 40 }}/>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <H1>Re-bonjour 🌸</H1>
          <div style={{ fontSize: 14, color: HS.textMute, marginTop: 8 }}>
            On t'attendait.
          </div>
        </div>

        <Card style={{ padding: 22, borderRadius: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Email ou téléphone" value="awa.kouame@email.ci"
                   icon={<Icon d={ICONS.mail} size={18}/>} focused/>
            <Input label="Mot de passe" value="••••••••••"
                   icon={<Icon d={ICONS.lock} size={18}/>}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: HS.textDim }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: HS.chocolate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={ICONS.check} size={12} color={HS.bg}/>
                </span>
                Rester connectée
              </label>
              <a style={{ fontSize: 12, color: HS.sakuraDeep, fontWeight: 700 }}>Oublié ?</a>
            </div>
            <Button>Se connecter</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <div style={{ flex: 1, height: 1, background: HS.border }}/>
          <span style={{ fontSize: 11, color: HS.textMute, letterSpacing: 1, fontWeight: 600 }}>OU</span>
          <div style={{ flex: 1, height: 1, background: HS.border }}/>
        </div>

        <Button variant="light" icon={<span style={{ fontSize: 18 }}>📱</span>}>
          Continuer avec mobile money
        </Button>
      </div>

      <div style={{ padding: '0 24px 50px', textAlign: 'center', position: 'relative' }}>
        <span style={{ fontSize: 13, color: HS.textMute }}>Nouvelle ici ? </span>
        <a style={{ fontSize: 13, color: HS.sakuraDeep, fontWeight: 800 }}>Créer mon compte →</a>
      </div>
    </ScreenBody>
  );
}

// ═════════════════════════════════════════════════════════════
// 3. REGISTER
// ═════════════════════════════════════════════════════════════
function ScreenRegister() {
  return (
    <ScreenBody style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 240, height: 240,
        background: HS.mistyRose, borderRadius: '50%', opacity: 0.7 }}/>
      <Petal size={18} color={HS.sakuraDeep} opacity={0.5} style={{ position: 'absolute', top: 120, left: 30, transform: 'rotate(30deg)' }}/>

      <div style={{ position: 'relative', padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40, borderRadius: 12, color: HS.chocolate }}>
          <Icon d={ICONS.back} size={18}/>
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3].map(i => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i === 1 ? HS.sakuraDeep : HS.mistyRose }}/>
          ))}
        </div>
        <span style={{ width: 40, fontSize: 12, color: HS.textMute, textAlign: 'right' }}>1/3</span>
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'auto', padding: '24px 24px 24px' }}>
        <H1>Crée ton<br/>profil 🌸</H1>
        <div style={{ fontSize: 13, color: HS.textDim, marginTop: 8, marginBottom: 24 }}>
          5 champs · 30 secondes · toute une vie protégée.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Input label="Prénom" value="Awa"/>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Nom" value="Kouamé"/>
            </div>
          </div>
          <Input label="Email" value="awa.kouame@email.ci"
                 icon={<Icon d={ICONS.mail} size={18}/>}/>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>Téléphone</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                background: HS.surface, borderRadius: 16, border: `1.5px solid ${HS.border}`,
                padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 52,
              }}>
                <span style={{ fontSize: 18 }}>🇨🇮</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>+225</span>
              </div>
              <div style={{ flex: 1 }}>
                <Input value="07 12 34 56 78" focused/>
              </div>
            </div>
          </div>

          <Input label="Mot de passe" value="••••••••••"
                 icon={<Icon d={ICONS.lock} size={18}/>}
                 hint="✓ 10 caractères · ✓ chiffre · ✓ majuscule"/>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>Ville</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {['Abidjan', 'Bouaké', 'Yamous.'].map((c, i) => (
                <button key={c} style={{
                  padding: '12px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
                  background: i === 0 ? HS.sakura : HS.surface,
                  border: i === 0 ? 'none' : `1.5px solid ${HS.border}`,
                  color: i === 0 ? HS.chocolate : HS.textDim,
                }}>{c}</button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', marginTop: 4 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: HS.chocolate, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <Icon d={ICONS.check} size={13} color={HS.bg}/>
            </span>
            <span style={{ fontSize: 12, color: HS.textDim, lineHeight: 1.5 }}>
              J'accepte les conditions et la <span style={{ color: HS.sakuraDeep, fontWeight: 700 }}>charte de confidentialité</span>. Mes données ne quittent jamais la Côte d'Ivoire.
            </span>
          </label>

          <Button style={{ marginTop: 8 }} icon={<Icon d={ICONS.arrow} size={20} color={HS.bg}/>}>Continuer</Button>
        </div>
      </div>
    </ScreenBody>
  );
}

// ═════════════════════════════════════════════════════════════
// 4. DASHBOARD — 4 stacked big buttons (warmer palette)
// ═════════════════════════════════════════════════════════════
function ScreenDashboard() {
  const levels = [
    { color: '#7B9171', glow: 'rgba(123,145,113,0.35)', label: 'Je suis bien', sub: 'Tout va · Mode discret', gesture: 'Tap simple', icon: ICONS.heart },
    { color: '#D4A574', glow: 'rgba(212,165,116,0.4)', label: 'Je suis méfiante', sub: 'Quelqu\'un me suit · Alerte douce', gesture: 'Tap long · 2s', icon: ICONS.eye },
    { color: '#C97B3B', glow: 'rgba(201,123,59,0.45)', label: 'Situation tendue', sub: 'Mes proches sont notifiés', gesture: 'Double tap', icon: ICONS.alert },
    { color: '#B23A48', glow: 'rgba(178,58,72,0.5)',   label: 'Au secours', sub: 'Police · Famille · Vidéo live', gesture: 'Triple tap ou secouer', icon: ICONS.phone },
  ];
  return (
    <ScreenBody>
      <TestBanner/>
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: HS.textMute }}>Bonsoir 🌸</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: HS.chocolate }}>
            Awa <span style={{ color: HS.sakuraDeep }}>·</span> <span style={{ color: HS.textDim, fontWeight: 600 }}>Cocody</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40, borderRadius: 12, color: HS.chocolate, position: 'relative' }}>
            <Icon d={ICONS.bell} size={18}/>
            <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, background: HS.sakuraDeep, borderRadius: 4, border: `2px solid ${HS.bg}` }}/>
          </button>
          <Avatar size={40} name="A"/>
        </div>
      </div>

      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: HS.safe }}/>
        <span style={{ fontSize: 12, color: HS.textDim }}>3 contacts actifs · GPS connecté</span>
      </div>

      <div style={{ flex: 1, padding: '4px 16px 90px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <Eyebrow>Comment tu te sens ?</Eyebrow>
        {levels.map((lv, i) => (
          <button key={i} style={{
            width: '100%', textAlign: 'left', padding: '16px 18px', borderRadius: 22,
            background: `linear-gradient(135deg, ${lv.color}, ${lv.color}dd)`,
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: `0 6px 18px ${lv.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
            display: 'flex', alignItems: 'center', gap: 14, minHeight: 84,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.22)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon d={lv.icon} size={24} color="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>{lv.label}</div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>{lv.sub}</div>
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.18)', padding: '3px 10px', borderRadius: 100, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }}/>
                {lv.gesture}
              </div>
            </div>
            <Icon d={ICONS.arrow} size={20} color="rgba(255,255,255,0.7)"/>
          </button>
        ))}
      </div>

      <BottomNav active="home"/>
    </ScreenBody>
  );
}

// ═════════════════════════════════════════════════════════════
// 5. EMERGENCY
// ═════════════════════════════════════════════════════════════
function ScreenEmergency() {
  const emergencyNums = [
    { n: '170', l: 'Police', c: '#4A6B8A' },
    { n: '180', l: 'Pompiers', c: '#C97B3B' },
    { n: '185', l: 'SAMU', c: '#5C7F4F' },
    { n: '116', l: 'Femmes', c: HS.sakuraDeep },
  ];
  const places = [
    { n: 'Commissariat Cocody', d: '380 m', t: '4 min à pied' },
    { n: 'Pharmacie Riviera', d: '520 m', t: '6 min à pied' },
    { n: 'Hôpital Abobo', d: '2.1 km', t: '8 min en taxi' },
  ];
  return (
    <ScreenBody style={{ background: `radial-gradient(80% 50% at 50% 0%, ${HS.dangerSoft}, ${HS.bg} 60%)` }}>
      <div style={{ padding: '54px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40, borderRadius: 12, color: HS.chocolate }}>
          <Icon d={ICONS.back} size={18}/>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: HS.danger,
            boxShadow: `0 0 0 4px ${HS.dangerSoft}`, animation: 'pulse 1.5s infinite' }}/>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: HS.danger }}>ALERTE ACTIVE · 00:42</span>
        </div>
        <span style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px 24px' }}>
        {/* AI card */}
        <Card style={{ padding: 18, marginBottom: 16, background: `linear-gradient(135deg, ${HS.mistyRose}, ${HS.surface})` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${HS.sakura}, ${HS.sakuraDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon d={ICONS.sparkle} size={16} color="#fff"/></div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: HS.sakuraDeep }}>AÏCHA · ASSISTANTE</span>
            <span style={{ fontSize: 11, color: HS.textMute, marginLeft: 'auto' }}>il y a 3s</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: HS.chocolate }}>
            <span style={{ color: HS.sakuraDeep, fontWeight: 800 }}>Reste calme, Awa.</span> J'ai envoyé ta position à <b>Mariam, Koné & Maman</b>. Le commissariat est à <b>4 min</b>. Je passe l'appel ?
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={{ flex: 1, background: HS.chocolate, border: 'none', color: HS.bg,
              padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>Oui, appelle</button>
            <button style={{ flex: 1, background: 'transparent', border: `1.5px solid ${HS.chocolate}`, color: HS.chocolate,
              padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>Plus tard</button>
          </div>
        </Card>

        <Eyebrow>Numéros d'urgence</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, marginBottom: 18 }}>
          {emergencyNums.map(e => (
            <Card key={e.n} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: e.c,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ICONS.phone} size={18} color="#fff"/>
              </div>
              <div>
                <div style={{ fontFamily: HS.serif, fontSize: 24, lineHeight: 1, color: HS.chocolate }}>{e.n}</div>
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>{e.l}</div>
              </div>
            </Card>
          ))}
        </div>

        <Eyebrow>Lieux sûrs autour de toi</Eyebrow>
        <div style={{ marginTop: 10, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {places.map((p, i) => (
            <Card key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: HS.mistyRose, color: HS.sakuraDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ICONS.pin} size={18}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: HS.chocolate }}>{p.n}</div>
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>
                  <span style={{ color: HS.safe, fontWeight: 700 }}>● Ouvert</span> · {p.d} · {p.t}
                </div>
              </div>
              <button style={{ background: HS.chocolate, border: 'none', color: HS.bg,
                padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>Y aller</button>
            </Card>
          ))}
        </div>

        <Eyebrow>Quitter la zone</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, marginBottom: 18 }}>
          {[{ n: 'Yango', est: '3 min · 1.2K F' }, { n: 'Heetch', est: '5 min · 1.5K F' }].map(v => (
            <Card key={v.n} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: HS.mistyRose,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ICONS.car} size={16} color={HS.sakuraDeep}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: HS.chocolate }}>{v.n}</div>
                <div style={{ fontSize: 10.5, color: HS.textMute }}>{v.est}</div>
              </div>
            </Card>
          ))}
        </div>

        <button style={{
          width: '100%', minHeight: 60, borderRadius: 18,
          background: HS.danger, color: '#fff', border: 'none',
          fontWeight: 800, fontSize: 15, letterSpacing: 0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 8px 24px rgba(178,58,72,0.35)',
        }}>
          <Icon d={ICONS.alert} size={20} color="#fff"/>
          ESCALADER — Police + vidéo live
        </button>
      </div>
    </ScreenBody>
  );
}

// ═════════════════════════════════════════════════════════════
// 6. ONBOARDING — contact list + add form
// ═════════════════════════════════════════════════════════════
function ScreenOnboarding() {
  const contacts = [
    { n: 'Mariam Diallo', r: 'Sœur', p: '+225 07 88 32 14', selected: true, init: 'M', c: HS.sakura },
    { n: 'Koné Yannick', r: 'Ami(e)', p: '+225 05 12 44 90', selected: true, init: 'K', c: HS.milkTea },
    { n: 'Maman Adèle', r: 'Famille', p: '+225 01 67 23 88', selected: true, init: 'A', c: HS.aloewood },
    { n: 'Salif Touré', r: 'Voisin', p: '+225 07 91 02 55', selected: false, init: 'S', c: HS.chocolate },
  ];
  return (
    <ScreenBody>
      <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ background: HS.surface, border: `1px solid ${HS.border}`, width: 40, height: 40, borderRadius: 12, color: HS.chocolate }}>
          <Icon d={ICONS.back} size={18}/>
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3].map(i => (
            <span key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i <= 2 ? HS.sakuraDeep : HS.mistyRose }}/>
          ))}
        </div>
        <span style={{ fontSize: 12, color: HS.textMute }}>2/3</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px 24px' }}>
        <H1>Ton cercle<br/>de confiance 💕</H1>
        <div style={{ fontSize: 13.5, color: HS.textDim, marginTop: 8, lineHeight: 1.5 }}>
          Ces personnes seront notifiées en temps réel si tu actives une alerte. Au moins 3.
        </div>

        <div style={{ marginTop: 22, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>Sélectionnées · 3/5</Eyebrow>
          <span style={{ fontSize: 11, color: HS.textMute }}>Glisse pour réorganiser</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c, i) => (
            <Card key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, borderColor: c.selected ? HS.borderStrong : HS.border }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: c.c,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16,
              }}>{c.init}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: HS.chocolate }}>{c.n}</div>
                <div style={{ fontSize: 11, color: HS.textMute, marginTop: 2 }}>
                  <span style={{ color: HS.sakuraDeep, fontWeight: 600 }}>{c.r}</span> · {c.p}
                </div>
              </div>
              <span style={{
                width: 28, height: 28, borderRadius: 9,
                background: c.selected ? HS.chocolate : 'transparent',
                border: c.selected ? 'none' : `1.5px solid ${HS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.selected && <Icon d={ICONS.check} size={16} color={HS.bg}/>}
              </span>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Eyebrow>Ajouter manuellement</Eyebrow>
          <Card style={{ padding: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input label="Nom complet" placeholder="Prénom Nom"
                     icon={<Icon d={ICONS.user} size={18}/>} focused/>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input label="Téléphone" placeholder="+225 07 ..." icon={<Icon d={ICONS.phone} size={18}/>}/>
                </div>
                <div style={{ width: 110 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: HS.textDim, marginBottom: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>Relation</div>
                  <div style={{
                    background: HS.surface, border: `1.5px solid ${HS.border}`, borderRadius: 16,
                    padding: '0 12px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', minHeight: 52, fontSize: 13, color: HS.textDim, fontWeight: 600,
                  }}>
                    Famille <Icon d={ICONS.arrow} size={14} color={HS.textMute}/>
                  </div>
                </div>
              </div>
              <Button variant="soft" icon={<Icon d={ICONS.plus} size={18} color={HS.chocolate}/>} style={{ minHeight: 48 }}>
                Ajouter ce contact
              </Button>
            </div>
          </Card>
        </div>

        <Button style={{ marginTop: 22 }} icon={<Icon d={ICONS.arrow} size={20} color={HS.bg}/>}>
          Continuer — étape suivante
        </Button>
      </div>
    </ScreenBody>
  );
}

window.HSMobileScreens = { ScreenLanding, ScreenLogin, ScreenRegister, ScreenDashboard, ScreenEmergency, ScreenOnboarding };
window.HSAvatar = Avatar;
window.HSPetal = Petal;
