const knex = require('./src/db/knex');
const { v4: uuidv4 } = require('uuid');

const orgId = '9b63683f-9b14-418a-96c0-4c41d40defd5';
const userId = '927245e4-a649-4f03-a057-7a8078262999';

const testimonies = [
  {
    display_name: 'Adèle M.',
    title: 'J\'ai reconnu les signes avant qu\'il ne soit trop tard',
    content: 'J\'ai commencé à remarquer que mon ami me "suivait" partout. Il prétendait que c\'était par amour, mais c\'était du harcèlement. Grâce à HerSafety, j\'ai pu documenter et signaler le comportement. Aujourd\'hui je suis libre.',
    category: 'suivi',
    location_label: 'Abidjan - Plateau',
  },
  {
    display_name: 'Yvonne K.',
    title: 'Agression dans le transport',
    content: 'Un homme m\'a agressée sexuellement dans un minibus à Abidjan. J\'ai alerté d\'autres femmes et nous avons signalé. Maintenant je partage mon histoire pour que d\'autres ne se sentent pas seules.',
    category: 'agression_sexuelle',
    location_label: 'Abidjan - Yopougon',
  },
  {
    display_name: 'Zara L.',
    title: 'Le harcèlement verbal m\'a blessée mais j\'ai trouvé de l\'aide',
    content: 'Mon collègue au travail me disait des choses humiliantes tous les jours. J\'ai eu peur de dénoncer. Mais en parlant à d\'autres femmes, j\'ai découvert que je n\'étais pas seule.',
    category: 'harcelement_verbal',
    location_label: 'Cocody',
  },
  {
    display_name: 'Marie-Claire S.',
    title: 'Reste vigilante - ma sécurité c\'est ma priorité',
    content: 'Je suis mère de trois enfants. Je m\'inquiète pour leur sécurité. HerSafety m\'a aidée à créer un plan de sécurité et à apprendre à mes enfants à reconnaître les situations dangereuses.',
    category: 'autre',
    location_label: 'Treichville',
  },
  {
    display_name: 'Oumou D.',
    title: 'Vol à main armée - j\'ai survécu',
    content: 'J\'ai été victime d\'un vol à main armée en sortant du travail. C\'était traumatisant. Mais j\'ai reçu du soutien et j\'ai appris à reprendre confiance en moi. Je veux que les femmes sachent qu\'on peut se rétablir.',
    category: 'vol',
    location_label: 'Marcory',
  },
  {
    display_name: 'Francie N.',
    title: 'Agression physique - la peur a cédé à la force',
    content: 'Un homme a essayé de me frapper parce que j\'ai refusé ses avances. J\'ai crié, je me suis défendue et des gens m\'ont aidée. Maintenant je suis plus forte.',
    category: 'agression_physique',
    location_label: 'Cocody',
  },
];

const articles = [
  {
    title: '10 conseils pour rester vigilante en sortant seule',
    content: '1. Toujours informer quelqu\'un de vos plans. 2. Vérifier votre environnement. 3. Avoir votre téléphone chargé. 4. Eviter les trajets solitaires la nuit. 5. Faire confiance à votre instinct. 6. Documenter tout comportement suspect. 7. Avoir les numéros d\'urgence à portée. 8. Portez des chaussures confortables. 9. Restez alerte aux transports. 10. Créez un réseau de confiance.',
    category: 'autre',
  },
  {
    title: 'Reconnaître le harcèlement de rue',
    content: 'Le harcèlement de rue est une violation de votre espace. Ce n\'est pas normal. Les comentaires non-demandés, les sifflements, les touches non-consentis - tout ça est du harcèlement. Vous avez le droit de dire NON et de demander de l\'aide.',
    category: 'harcelement_verbal',
  },
  {
    title: 'Créer un plan de sécurité personnelle efficace',
    content: 'Un bon plan inclut: routes sûres identifiées, contacts d\'urgence mémorisés, un signal d\'alerte avec amis/famille, une position de géolocalisation active, une phrase de code pour signaler le danger, et une liste de refuges sûrs.',
    category: 'autre',
  },
  {
    title: 'Comment soutenir une amie victime d\'agression',
    content: 'Écoutez sans jugement. Croyez-la. Ne blâmez jamais la victime. Offrez du soutien pratique. Aidez-la à signaler si elle le souhaite. Restez à ses côtés. Le rétablissement prend du temps.',
    category: 'agression_sexuelle',
  },
  {
    title: 'Les droits légaux des femmes victimes de vol',
    content: 'En Côte d\'Ivoire, le vol est un crime. Vous avez le droit de déposer plainte auprès de la police. Documentez tout: date, heure, description, témoins, blessures. Cherchez du soutien auprès des organisations de défense des droits.',
    category: 'vol',
  },
];

const photos = [
  {
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop',
    description: 'Femmes se soutenant les unes les autres',
    category: 'autre',
  },
  {
    url: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=500&h=500&fit=crop',
    description: 'Sécurité personnelle et vigilance',
    category: 'autre',
  },
  {
    url: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=500&h=500&fit=crop',
    description: 'Femme forte et confiante',
    category: 'autre',
  },
  {
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500&h=500&fit=crop',
    description: 'Communauté de soutien',
    category: 'autre',
  },
];

const videos = [
  {
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Comment rester vigilante dans la rue',
    category: 'autre',
  },
  {
    url: 'https://www.youtube.com/embed/9bZkp7q19f0',
    description: 'Autodéfense et confiance en soi',
    category: 'autre',
  },
  {
    url: 'https://www.youtube.com/embed/jNQXAC9IVRw',
    description: 'Témoignages de survivantes',
    category: 'autre',
  },
];

(async () => {
  try {
    console.log('🌱 Suppression ancien contenu...');
    await knex('testimonies').del();
    await knex('articles').del();
    await knex('photos').del();
    await knex('videos').del();

    console.log('📝 Insertion témoignages...');
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

    console.log('📄 Insertion articles...');
    for (const a of articles) {
      await knex('articles').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        title: a.title,
        content: a.content,
        category: a.category,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log('📸 Insertion photos...');
    for (const p of photos) {
      await knex('photos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: p.url,
        description: p.description,
        category: p.category,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log('🎥 Insertion vidéos...');
    for (const v of videos) {
      await knex('videos').insert({
        id: uuidv4(),
        user_id: userId,
        organization_id: orgId,
        url: v.url,
        description: v.description,
        category: v.category,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log('\n✅ DONE!');
    console.log(`✨ ${testimonies.length} témoignages`);
    console.log(`📄 ${articles.length} articles`);
    console.log(`📸 ${photos.length} photos`);
    console.log(`🎥 ${videos.length} vidéos`);
    console.log(`\n📊 Total: ${testimonies.length + articles.length + photos.length + videos.length} items`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
