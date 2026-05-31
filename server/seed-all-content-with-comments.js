const knex = require('./src/db/knex');
const { v4: uuidv4 } = require('uuid');

const orgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
const userId = '927245e4-a649-4f03-a057-7a8078262999';

const articles = [
  {
    title: '🚩 7 signes d\'un partenaire contrôlant',
    content: 'Un partenaire contrôlant peut vérifier votre téléphone, vous isoler, critiquer votre apparence, vous menacer. ⚠️ Ce n\'est PAS l\'amour - c\'est du contrôle. Agissez: parlez à quelqu\'un, documentez, planifiez votre sécurité.',
    category: 'harcelement_verbal',
  },
  {
    title: '💪 Techniques d\'auto-défense rapide',
    content: 'En agression: CRIEZ fort, frappez yeux/nez/gorge/aine, courez vers un endroit public, appelez 110. Votre instinct a raison - n\'hésitez jamais!',
    category: 'agression_physique',
  },
  {
    title: '📋 Documenter le harcèlement',
    content: 'Dates, heures, lieux, témoins, SMS/messages, photos. Stockez en sécurité. La documentation = preuve légale FORTE.',
    category: 'harcelement_verbal',
  },
  {
    title: '🆘 Ressources d\'urgence 24/7',
    content: 'Police: 110 | Ligne écoute: 180 | Hôpital: 111 | Refuges: cherchez en ligne. Aucune honte à appeler. Tout est gratuit et confidentiel.',
    category: 'autre',
  },
  {
    title: '💜 Guérir après un trauma',
    content: 'Yoga, sport, groupes de soutien, thérapie. La guérison prend du temps. Vous n\'êtes pas seule. Ce n\'était pas votre faute.',
    category: 'autre',
  },
  {
    title: '👭 Réseau de soutien entre femmes',
    content: 'Échangez numéros, partagez itinéraires, appelez-vous régulièrement, prenez transport ensemble. Ensemble nous sommes INÉVITABLES.',
    category: 'autre',
  },
  {
    title: '⚖️ Vos droits légaux',
    content: 'Viol, harcèlement, vol = CRIMES. Portez plainte au commissariat. Documentez tout. Cherchez aide légale. Vous avez des DROITS.',
    category: 'autre',
  },
];

const photos = [
  { description: '🚺 Marche sécurité: 500+ femmes unies', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500', category: 'autre' },
  { description: '💪 Auto-défense: techniques efficaces', url: 'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=500', category: 'agression_physique' },
  { description: '🏠 Refuge urgent 24/7', url: 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=500', category: 'autre' },
  { description: '👭 Groupe soutien femmes', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500', category: 'autre' },
  { description: '🌱 Jardin guérison', url: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=500', category: 'autre' },
  { description: '💜 Communauté résiliente', url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=500', category: 'autre' },
];

const videos = [
  { description: '💜 Témoignage: De survivante à militante', url: 'https://www.youtube.com/embed/jNQXAC9IVRw?t=3', category: 'autre' },
  { description: '🧠 Comprendre le trauma', url: 'https://www.youtube.com/embed/LHIhuKJaHNY', category: 'autre' },
  { description: '⚖️ Vos droits légaux', url: 'https://www.youtube.com/embed/9bZkp7q19f0', category: 'autre' },
  { description: '🆘 Numéros urgence', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', category: 'autre' },
];

const articleComments = [
  ['Cet article m\'a aidée à reconnaître les signes 💜', 'Partagé avec mes amies!', 'Enfin du contenu utile!', 'Je sauve cet article.'],
  ['Les techniques marchent vraiment!', 'Où trouver un coach?', 'Clair et sans peur!', 'Chaque femme doit lire!'],
  ['J\'ai commencé à documenter!', 'C\'est TRÈS important.', 'Ma documentation a aidé!', 'Guide brillant et simple.'],
  ['Merci de lister les numéros!', 'Ligne 180 m\'a aidée.', 'Je partage avec amies.', 'C\'est rassurant. 💜'],
  ['Cet article m\'a donné espoir.', 'Yoga + communauté = guérison 🌱', 'Ça devient mieux.', 'Pas seule ce sentiment.'],
  ['Mon groupe WhatsApp utilise ça!', 'Ensemble c\'est mieux! 💪', 'On se sent moins seule.', 'Puissance vraie! 💜'],
  ['Besoin de connaître mes droits!', 'J\'ai porté plainte grâce!', 'TOUT LE MONDE doit savoir!', 'Savoir = puissance 💜'],
];

const photoComments = ['Tellement inspirant! 💪', 'Ça fait du bien!', 'Je veux y aller!'];
const videoComments = ['Vraiment utile! Merci!', 'J\'ai appris beaucoup.', 'Du courage! 💜'];

(async () => {
  try {
    console.log('🌱 SEED CONTENU COMPLET\n');

    // ARTICLES
    console.log('📄 Insertion 7 articles...');
    const articleIds = [];
    for (const a of articles) {
      const [article] = await knex('articles').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        title: a.title,
        content: a.content,
        category: a.category,
        status: 'approved',
      }).returning('id');
      articleIds.push(article.id);
    }

    // PHOTOS
    console.log('📸 Insertion 6 photos...');
    const photoIds = [];
    for (const p of photos) {
      const [photo] = await knex('photos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: p.url,
        description: p.description,
        category: p.category,
        status: 'approved',
      }).returning('id');
      photoIds.push(photo.id);
    }

    // VIDEOS
    console.log('🎥 Insertion 4 vidéos...');
    const videoIds = [];
    for (const v of videos) {
      const [video] = await knex('videos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: v.url,
        description: v.description,
        category: v.category,
        status: 'approved',
      }).returning('id');
      videoIds.push(video.id);
    }

    // D'ABORD, RÉCUPÉRER LES IDS DE TESTIMONIES EXISTANTES
    const existingTestimonies = await knex('testimonies').select('id').orderBy('created_at', 'desc').limit(7);
    const testimonyIds = existingTestimonies.map(t => t.id);

    // COMMENTAIRES TESTIMONIES
    console.log('💬 Insertion commentaires témoignages...');
    const testimonyComments = [
      'Tellement courageux! Merci de partager 💜',
      'Ça m\'a inspirée. Merci!',
      'Femme forte! Bravo!',
      'J\'ai vécu pareil. Pas seule! 💕',
    ];
    for (const testimonyId of testimonyIds) {
      for (const comment of testimonyComments) {
        await knex('comments').insert({
          id: uuidv4(),
          user_id: userId,
          organization_id: orgId,
          content_type: 'testimony',
          content_id: testimonyId,
          display_name: ['Survivor K.', 'Strong L.', 'Brave M.', 'Hope N.'][Math.floor(Math.random() * 4)],
          content: comment,
          likes_count: Math.floor(Math.random() * 5) + 1,
        });
      }
    }

    // COMMENTAIRES ARTICLES
    console.log('💬 Insertion commentaires articles...');
    for (let i = 0; i < articleIds.length; i++) {
      const comments = articleComments[i] || [];
      for (const comment of comments) {
        await knex('comments').insert({
          id: uuidv4(),
          user_id: userId,
          organization_id: orgId,
          content_type: 'article',
          content_id: articleIds[i],
          display_name: ['Maria C.', 'Issa K.', 'Belle D.', 'Fatou N.'][Math.floor(Math.random() * 4)],
          content: comment,
          likes_count: Math.floor(Math.random() * 10) + 1,
        });
      }
    }

    // COMMENTAIRES PHOTOS
    console.log('💬 Insertion commentaires photos...');
    for (const photoId of photoIds) {
      for (const comment of photoComments) {
        await knex('comments').insert({
          id: uuidv4(),
          user_id: userId,
          organization_id: orgId,
          content_type: 'photo',
          content_id: photoId,
          display_name: ['Ama L.', 'Zoe T.', 'Yasmine H.'][Math.floor(Math.random() * 3)],
          content: comment,
          likes_count: Math.floor(Math.random() * 8) + 1,
        });
      }
    }

    // COMMENTAIRES VIDEOS
    console.log('💬 Insertion commentaires vidéos...');
    for (const videoId of videoIds) {
      for (const comment of videoComments) {
        await knex('comments').insert({
          id: uuidv4(),
          user_id: userId,
          organization_id: orgId,
          content_type: 'video',
          content_id: videoId,
          display_name: ['Hope M.', 'Strength R.', 'Voice L.'][Math.floor(Math.random() * 3)],
          content: comment,
          likes_count: Math.floor(Math.random() * 8) + 1,
        });
      }
    }

    console.log('\n✅ SEED COMPLET! ✨');
    console.log(`📄 7 articles`);
    console.log(`📸 6 photos`);
    console.log(`🎥 4 vidéos`);
    console.log(`💬 Commentaires partout!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
