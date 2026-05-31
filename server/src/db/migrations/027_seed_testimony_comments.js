const crypto = require('crypto');

const commentTexts = [
  'Merci de partager votre histoire',
  'Vous êtes très courageuse',
  'C\'est inspirant!',
  'Ensemble plus fortes',
  'Votre témoignage aide beaucoup',
  'Bravo pour votre résilience',
  'Un message puissant',
  'Continuez à vous battre!',
  'Votre force m\'inspire',
  'Merci pour ce partage',
  'Vous méritez la sécurité',
  'Un témoignage touchant',
  'Solidarité avec vous',
  'Votre voix compte',
  'Merci d\'avoir parlé',
];

const anonymousNames = [
  'CourageuseFemme', 'VoixLibre', 'BraveLumiere', 'FemmeForte', 'Résiliente',
  'SolidaireEtoile', 'FemmeUnique', 'ForceFéminine', 'NouveauDépart', 'CœurPur',
  'VictorieuseFemme', 'HéroïneSilencieuse', 'GuerriéreDouce', 'EspoirRenaît', 'TémoignagePuissant',
];

exports.up = async (knex) => {
  try {
    // Récupérer tous les témoignages approuvés
    const testimonies = await knex('testimonies').where({ status: 'approved' });

    if (testimonies.length === 0) {
      console.log('No testimonies found');
      return;
    }

    // Pour chaque témoignage, créer 3-5 commentaires
    const allComments = [];

    testimonies.forEach((testimony) => {
      const numComments = Math.floor(Math.random() * 3) + 3; // 3-5 commentaires

      for (let i = 0; i < numComments; i++) {
        allComments.push({
          id: crypto.randomUUID(),
          user_id: null,
          organization_id: null,
          content_type: 'testimony',
          content_id: testimony.id,
          display_name: anonymousNames[Math.floor(Math.random() * anonymousNames.length)],
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          likes_count: Math.floor(Math.random() * 15) + 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    });

    // Insérer tous les commentaires
    if (allComments.length > 0) {
      await knex('comments').insert(allComments);
      console.log(`✓ Inserted ${allComments.length} testimony comments`);
    }
  } catch (err) {
    console.error('Error seeding testimony comments:', err.message);
  }
};

exports.down = async (knex) => {
  // Supprimer tous les commentaires de témoignages
  await knex('comments').where({ content_type: 'testimony' }).del();
};
