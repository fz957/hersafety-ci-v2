const knex = require('./src/db/knex');
const { v4: uuidv4 } = require('uuid');

const orgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
const userId = '927245e4-a649-4f03-a057-7a8078262999';

const testimonies = [
  { display_name: 'CourageuseEtoile', title: 'Suivi au marché', content: '👨→👩 Un homme m\'ai suivie 20 min\n🙏 Une vendeuse m\'ai aidée\n✨ Plus seule désormais!', category: 'suivi', location_label: 'Marché Adjamé' },
  { display_name: 'BraveLumiere', title: 'Agression - J\'ai crié', content: '🚨 Groupe de 3 hommes\n📱 Vol téléphone + sac\n💪 J\'ai crié → j\'ai réussi à m\'échapper\n❤️ Une dame m\'ai aidée', category: 'agression_physique', location_label: 'Plateau' },
  { display_name: 'LibreFlamme', title: 'Commentaires au travail', content: '😤 Mon patron: remarques sur mon corps\n📅 Depuis 2 ans, chaque jour\n📢 J\'ai signalé à RH\n💪 Je ne la ferme plus', category: 'harcelement_verbal', location_label: 'Centre-ville' },
  { display_name: 'FemmeForte', title: 'Taxi: détour menace', content: '🚕 Chauffeur menaçait détour\n📹 J\'ai gardé calme + enregistré\n🚔 Signalement fait\n✓ Sécurité en priorité', category: 'detour_force', location_label: 'Cocody' },
  { display_name: 'VoixLibre', title: 'Vol en minibus', content: '❌ 3e fois cette année\n📱 Téléphone + collier volés\n👊 Poussée quand j\'ai protesté\n😢 Personne n\'ai aidé', category: 'vol', location_label: 'Yopougon' },
  { display_name: 'Résiliente', title: 'Agression au bureau', content: '🤨 Collègue main sur mes hanches\n😶 J\'ai gelé\n🙅 Collègue: "c\'est juste son style"\n💜 J\'ai décidé de lutter', category: 'agression_sexuelle', location_label: 'Treichville' },
];

const articles = [
  { title: '🚩 Reconnaître un comportement toxique', content: 'Un partenaire contrôlant peut vérifier votre téléphone, vous isoler, critiquer votre apparence, menacer de partir. ⚠️ Ce n\'est PAS de l\'amour - c\'est du contrôle. Agissez: parlez à quelqu\'un, documentez, planifiez votre sécurité.' },
  { title: '💪 Techniques d\'échappement rapide', content: 'Les yeux, le nez, la gorge. Crier paralyse l\'agresseur. Vous êtes plus fortes que vous le croyez.' },
  { title: '📋 Comment documenter le harcèlement', content: 'Screenshot + date. Conservez les SMS, emails, photos de blessures. C\'est une arme légale.' },
  { title: '🆘 Ressources d\'urgence 24/7', content: 'Ligne 180: écoute. Police 110. Hôpital: dossier légal. Refuges: confidentiel. Aucune raison de ne pas appeler. C\'est GRATUIT.' },
  { title: '💜 Guérir après un trauma', content: 'Les cauchemars sont réels mais pas permanents. Yoga, sport, groupes de soutien. Vous n\'êtes pas seule. C\'est pas votre faute.' },
];

const photos = [
  { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500', description: 'Marche pour la sécurité - 500+ femmes' },
  { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500', description: 'Atelier auto-défense' },
  { url: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=500', description: 'Refuge d\'urgence 24/7' },
  { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500', description: 'Groupe de soutien' },
];

const videos = [
  { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', description: 'Témoignage: Ma guérison' },
  { url: 'https://www.youtube.com/embed/jNQXAC9IVRw', description: 'Comprendre le trauma' },
  { url: 'https://www.youtube.com/embed/9bZkp7q19f0', description: 'Vos droits légaux' },
];

(async () => {
  try {
    console.log('🌱 Suppression ancien contenu...');
    await knex('testimonies').del();
    await knex('articles').del();
    await knex('photos').del();
    await knex('videos').del();

    console.log('📝 Insertion VRAI contenu original...');

    for (const t of testimonies) {
      await knex('testimonies').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        display_name: t.display_name,
        title: t.title,
        content: t.content,
        category: t.category,
        location_label: t.location_label,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    for (const a of articles) {
      await knex('articles').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        title: a.title,
        content: a.content,
        category: 'autre',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    for (const p of photos) {
      await knex('photos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: p.url,
        description: p.description,
        category: 'autre',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    for (const v of videos) {
      await knex('videos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: v.url,
        description: v.description,
        category: 'autre',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log('\n✅ RESTAURÉ!');
    console.log(`✨ ${testimonies.length} témoignages`);
    console.log(`📄 ${articles.length} articles`);
    console.log(`📸 ${photos.length} photos`);
    console.log(`🎥 ${videos.length} vidéos`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
