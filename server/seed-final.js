const knex = require('./src/db/knex');
const { v4: uuidv4 } = require('uuid');

const articles = [
  { title: '🚩 Reconnaître un partenaire contrôlant', content: 'Un partenaire contrôlant manifeste de nombreux comportements toxiques. Il vérifie constamment votre téléphone, vous isole de votre famille et vos amis, vous critique régulièrement sur votre apparence, vous menace de vous quitter si vous refusez ses demandes, et vous culpabilise pour sa propre colère. Ces signes ne sont PAS de l\'amour - c\'est du contrôle pur. Si vous reconnaissez ces comportements, parlez à quelqu\'un de confiance, documentez les incidents et planifiez votre sécurité. La ligne d\'écoute 180 est disponible 24/7.', category: 'harcelement_verbal' },
  { title: '💪 Techniques d\'auto-défense pour vous protéger', content: 'En situation d\'agression, rappelez-vous ces techniques essentielles. Criez NON! très fort pour attirer l\'attention. Frappez les zones vulnérables: yeux, nez, gorge et aine. Courez vers un endroit public et éclairé. Appelez la police au 110. Ces techniques fonctionnent car l\'agresseur ne s\'attend généralement pas à une résistance. Pratiquez avec un coach pour avoir confiance. Votre instinct a raison - ne l\'ignorez pas.', category: 'agression_physique' },
  { title: '📋 Documenter le harcèlement - votre arme légale', content: 'La documentation est votre arme légale la plus puissante. Notez les dates exactes, les heures précises, les lieux et les témoins. Prenez des screenshots de tous les SMS et messages. Photographiez les blessures avec la date et l\'heure. Conservez ces preuves en sécurité - idéalement dans un cloud privé ou envoyées par email à une amie de confiance. Cette documentation peut faire toute la différence dans une procédure légale et convaincre la police de vous prendre au sérieux.', category: 'harcelement_verbal' },
  { title: '🆘 Ressources d\'urgence 24/7 en Côte d\'Ivoire', content: 'Police: 110 pour les urgences immédiates. Ligne d\'écoute femmes: 180 - gratuit, confidentiel, 24 heures sur 24 avec des conseillers formés. Hôpital: 111 pour les soins et créer un dossier légal. Refuges d\'urgence: cherchez refuge femmes + votre ville pour les ressources locales. Tout est gratuit et confidentiel. Il n\'y a aucune honte à appeler. Vous n\'êtes pas seule.', category: 'autre' },
  { title: '💜 Guérir après un trauma - le parcours de la résilience', content: 'Après une agression, c\'est totalement normal d\'avoir des cauchemars, des flashbacks, de la peur et de la dépression. Ce n\'était PAS votre faute. Ce n\'est PAS permanent. La guérison est possible. Le yoga, le sport et la thérapie aident beaucoup. Les groupes de soutien avec d\'autres survivantes sont puissants - elles comprennent comme personne d\'autre. Cherchez une thérapeute spécialisée. Soyez patiente avec vous-même. Des milliers de femmes guérissent chaque jour - vous aussi.', category: 'autre' },
  { title: '👭 Créer des espaces sûrs - l\'union fait la force', content: 'La sécurité se crée ensemble. Créez un groupe WhatsApp d\'escorte avec vos voisines. Partagez vos itinéraires. Appelez-vous régulièrement pour confirmer que vous êtes bien arrivée. Échangez les numéros d\'urgence. Dans les familles, parlez sécurité et consentement dès que les enfants sont jeunes. Au travail, signalez le harcèlement à RH et demandez une politique anti-harcèlement. Chaque femme qui parle protège les autres.', category: 'autre' },
  { title: '⚖️ Vos droits légaux - Porter plainte avec sécurité', content: 'Viol, harcèlement, vol, agression - ce sont TOUS des crimes. Vous avez le droit de porter plainte. Allez au commissariat avec votre documentation. Demandez un rapport médical-légal si vous avez des blessures. Des avocates spécialisées existent pour vous aider gratuitement dans de nombreux cas. Vous méritez justice. Utilisez vos droits!', category: 'autre' },
  { title: '🎯 Plan de sécurité personnelle - protégez-vous tous les jours', content: 'Un bon plan de sécurité inclut: routes sûres vers le travail/l\'école, contacts d\'urgence mémorisés, géolocalisation active avec une amie de confiance, signal de code avec vos proches, lieux sûrs identifiés. Mettez à jour votre plan régulièrement. Pratiquez votre réaction d\'urgence. Un plan peut vous sauver la vie.', category: 'autre' }
];

const photos = [
  { description: '🚺 Marche pour la sécurité - Femmes unies', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop' },
  { description: '💪 Atelier d\'auto-défense', url: 'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=800&h=600&fit=crop' },
  { description: '🏠 Refuge d\'urgence sûr', url: 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=800&h=600&fit=crop' },
  { description: '👭 Groupe de soutien', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop' },
  { description: '🌱 Espace de guérison', url: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&h=600&fit=crop' },
  { description: '💜 Femmes résilientes', url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop' },
  { description: '🤝 Solidarité féminine', url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&h=600&fit=crop' },
  { description: '💎 Confiance en soi', url: 'https://images.unsplash.com/photo-1515562141207-6811ecb48b7e?w=800&h=600&fit=crop' }
];

const videos = [
  { description: '💜 Témoignage inspirant', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
  { description: '🧠 Comprendre le trauma', url: 'https://www.youtube.com/embed/LHIhuKJaHNY' },
  { description: '⚖️ Vos droits légaux', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
  { description: '🆘 Numéros d\'urgence', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  { description: '💪 Auto-défense', url: 'https://www.youtube.com/embed/yGKs4KV-MxE' },
  { description: '🌟 Guérison après agression', url: 'https://www.youtube.com/embed/pwNVf2dgSV0' }
];

const commentAuteurs = ['Issa K.', 'Maria C.', 'Fatou N.', 'Zara L.', 'Adèle M.', 'Yasmine H.', 'Ama L.', 'Nadia D.'];
const commentTextes = ['Merci!', 'Tellement important!', 'Ça m\'a aidée!', 'Bravo!', 'Ensemble plus fortes!', 'Article crucial!', 'Guide utile!', 'Vraiment!'];

(async () => {
  try {
    console.log('🗑️ Supprimer TOUT...');
    await knex('comments').del();
    await knex('articles').del();
    await knex('photos').del();
    await knex('videos').del();
    console.log('✅ Vide!\n');

    console.log('📸 Photos...');
    const photoIds = [];
    for (const p of photos) {
      const [photo] = await knex('photos').insert({
        id: uuidv4(),
        url: p.url,
        description: p.description,
        category: 'autre',
        status: 'approved',
      }).returning('id');
      photoIds.push(photo.id);
    }
    console.log(`✅ 8 photos\n`);

    console.log('🎥 Vidéos...');
    const videoIds = [];
    for (const v of videos) {
      const [video] = await knex('videos').insert({
        id: uuidv4(),
        url: v.url,
        description: v.description,
        category: 'autre',
        status: 'approved',
      }).returning('id');
      videoIds.push(video.id);
    }
    console.log(`✅ 6 vidéos\n`);

    console.log('📄 Articles...');
    const articleIds = [];
    for (const a of articles) {
      const [article] = await knex('articles').insert({
        id: uuidv4(),
        title: a.title,
        content: a.content,
        category: a.category,
        status: 'approved',
      }).returning('id');
      articleIds.push(article.id);
    }
    console.log(`✅ 8 articles\n`);

    console.log('💬 Commentaires + likes...');
    let cCount = 0;

    for (const pid of photoIds) {
      for (let i = 0; i < 7; i++) {
        await knex('comments').insert({
          id: uuidv4(),
          content_type: 'photo',
          content_id: pid,
          display_name: commentAuteurs[i % commentAuteurs.length],
          content: commentTextes[(cCount + i) % commentTextes.length],
          likes_count: Math.floor(Math.random() * 8) + 1,
        });
        cCount++;
      }
    }

    for (const vid of videoIds) {
      for (let i = 0; i < 8; i++) {
        await knex('comments').insert({
          id: uuidv4(),
          content_type: 'video',
          content_id: vid,
          display_name: commentAuteurs[i % commentAuteurs.length],
          content: commentTextes[(cCount + i) % commentTextes.length],
          likes_count: Math.floor(Math.random() * 8) + 1,
        });
        cCount++;
      }
    }

    for (const aid of articleIds) {
      for (let i = 0; i < 8; i++) {
        await knex('comments').insert({
          id: uuidv4(),
          content_type: 'article',
          content_id: aid,
          display_name: commentAuteurs[i % commentAuteurs.length],
          content: commentTextes[(cCount + i) % commentTextes.length],
          likes_count: Math.floor(Math.random() * 8) + 1,
        });
        cCount++;
      }
    }

    console.log(`✅ ${cCount} commentaires avec likes\n`);
    console.log('🎉 NOUVEAU CONTENU GÉNÉRÉ ET ENREGISTRÉ!');
    console.log(`✅ 8 articles + 8 photos + 6 vidéos + ${cCount} commentaires`);

    process.exit(0);
  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    process.exit(1);
  }
})();
