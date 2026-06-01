const crypto = require('crypto');

exports.up = async (knex) => {
  try {
    // Check if videos table exists
    const tableExists = await knex.schema.hasTable('videos');
    if (!tableExists) {
      console.log('- videos table does not exist, skipping migration');
      return;
    }

    // Supprimer les vidéos de test
    await knex('videos').del();

    // Ajouter les vraies vidéos pertinentes
    const videos = [
      {
        id: crypto.randomUUID(),
        url: 'https://www.youtube.com/embed/e6G9Px8g0-I',
        description: '💪 Techniques d\'auto-défense pour femmes\nFormation pratique • 12 min • Efficace et accessible',
        category: 'auto_defense',
        status: 'approved',
        flagged: false,
        support_count: 142,
      },
      {
        id: crypto.randomUUID(),
        url: 'https://www.youtube.com/embed/3HjVzLi4-Xs',
        description: '🆘 Guide de sécurité personnelle pour femmes\nSituations du quotidien • 15 min • Conseils pratiques',
        category: 'securite_personnelle',
        status: 'approved',
        flagged: false,
        support_count: 95,
      },
      {
        id: crypto.randomUUID(),
        url: 'https://www.youtube.com/embed/1HfqKF5pXOE',
        description: '💬 Témoignage de résilience et récupération\nHistoire inspirante • 8 min • Message d\'espoir',
        category: 'temoignage',
        status: 'approved',
        flagged: false,
        support_count: 128,
      },
      {
        id: crypto.randomUUID(),
        url: 'https://www.youtube.com/embed/P0SjCqLXrnY',
        description: '⚖️ Connaître vos droits légaux\nInformations juridiques • 10 min • Ressources essentielles',
        category: 'droits_legaux',
        status: 'approved',
        flagged: false,
        support_count: 110,
      },
    ];

    await knex('videos').insert(videos);
    console.log('✓ Updated videos with real content');
  } catch (err) {
    console.error('Error updating videos:', err.message);
  }
};

exports.down = async (knex) => {
  const tableExists = await knex.schema.hasTable('videos');
  if (tableExists) {
    await knex('videos').del();
  }
};
