/**
 * Script d'initialisation : Ajoute les 6 vidéos hardcodées + commentaires à la BD
 * Exécuter : node src/scripts/init-videos.js
 */

const knex = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

async function initVideos() {
  try {
    console.log('🎬 Initialisant les vidéos...');

    // Récupérer une organisation existante
    let org = await knex('organizations').first();
    if (!org) {
      console.error('❌ Aucune organisation trouvée. Créer une organisation d\'abord.');
      process.exit(1);
    }
    console.log(`✓ Organisation: ${org.id}`);

    // Récupérer un utilisateur existant
    let user = await knex('users').first();
    if (!user) {
      console.error('❌ Aucun utilisateur trouvé. Créer un utilisateur d\'abord.');
      process.exit(1);
    }
    console.log(`✓ Utilisateur: ${user.id}`);

    // Map IDs numériques → UUIDs stables
    const videoIds = {
      300: '00000000-0000-0000-0000-000000000300',
      301: '00000000-0000-0000-0000-000000000301',
      302: '00000000-0000-0000-0000-000000000302',
      303: '00000000-0000-0000-0000-000000000303',
      304: '00000000-0000-0000-0000-000000000304',
      305: '00000000-0000-0000-0000-000000000305',
    };

    // 6 vidéos hardcodées
    const videos = [
      { numId: 300, description: '💜 Vidéo Sécurité 1 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/Ki3yfkj4Yls', support_count: 8 },
      { numId: 301, description: '🧠 Vidéo Sécurité 2 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/Ac9jgayoOGk', support_count: 6 },
      { numId: 302, description: '⚖️ Vidéo Sécurité 3 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/VF4ZyJRUxk8', support_count: 5 },
      { numId: 303, description: '👩‍⚖️ Vidéo Sécurité 4 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/gkjW9PZBRfk', support_count: 7 },
      { numId: 304, description: '💪 Vidéo Sécurité 5 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/UpgZ5PCuf8A', support_count: 9 },
      { numId: 305, description: '🛡️ Vidéo Sécurité 6 - Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/m_UjYOfmkn8', support_count: 10 },
    ];

    // Insérer les vidéos
    for (const video of videos) {
      const uuidId = videoIds[video.numId];
      const exists = await knex('videos').where({ id: uuidId }).first();
      if (!exists) {
        await knex('videos').insert({
          id: uuidId,
          url: video.url,
          description: video.description,
          category: 'autre',
          status: 'approved',
          organization_id: org.id,
          user_id: null,
          moderated_by: null,
          moderated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✓ Vidéo ${video.numId} ajoutée`);
      }
    }

    // Commentaires hardcodés
    const videoComments = {
      300: [
        { content: 'Très utile et informatif! 👍', display_name: 'ForteFemme123' },
        { content: 'Merci pour ce contenu important.', display_name: 'BraveCourage456' },
        { content: 'Je partage avec mes amies!', display_name: 'SageAide789' },
      ],
      301: [
        { content: 'Excellente ressource! 💪', display_name: 'FortePhoenix234' },
        { content: 'Très bien expliqué.', display_name: 'BraveLotus567' },
      ],
      302: [
        { content: 'Information cruciale! 🙌', display_name: 'SageVoix123' },
        { content: 'À regarder absolument.', display_name: 'CourageuseLotus456' },
      ],
      303: [
        { content: 'Très important à savoir!', display_name: 'ForteLumiere789' },
        { content: 'Merci beaucoup.', display_name: 'BraveAurore123' },
      ],
      304: [
        { content: 'Contenu utile et clair! ✨', display_name: 'SageFemme234' },
        { content: 'Bien produit.', display_name: 'ForteVoix567' },
      ],
      305: [
        { content: 'Super ressource! 👏', display_name: 'BraveLotus890' },
        { content: 'À connaître absolument.', display_name: 'SagePhoenix123' },
      ],
    };

    // Insérer les commentaires (noter : affichage avec display_name au lieu d'user_id pour les commentaires générés)
    for (const numVideoId of Object.keys(videoComments)) {
      const uuidVideoId = videoIds[numVideoId];
      const comments = videoComments[numVideoId];
      for (const comment of comments) {
        const exists = await knex('content_comments')
          .where({ content_type: 'video', content_id: uuidVideoId, comment_text: comment.content })
          .first();

        if (!exists) {
          await knex('content_comments').insert({
            id: uuidv4(),
            content_type: 'video',
            content_id: uuidVideoId,
            user_id: user.id,
            comment_text: comment.content,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`✓ Commentaire vidéo ${numVideoId}: "${comment.content.substring(0, 30)}..."`);
        }
      }
    }

    console.log('✅ Initialisation réussie! 6 vidéos + commentaires en BD.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error(err);
    process.exit(1);
  }
}

initVideos();
