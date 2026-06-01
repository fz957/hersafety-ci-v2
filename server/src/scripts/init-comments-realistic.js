/**
 * Script: Commentaires réalistes avec plusieurs utilisateurs différents
 * Exécuter : node src/scripts/init-comments-realistic.js
 */

const knex = require('../db/knex');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function initCommentsRealistic() {
  try {
    console.log('👥 Création d\'utilisateurs fictifs...');

    // Récupérer l'organisation
    const org = await knex('organizations').first();
    if (!org) {
      console.error('❌ Pas d\'organisation');
      process.exit(1);
    }

    // Créer plusieurs utilisateurs fictifs
    const fakeUsers = [
      { name: 'Amara Diallo', email: 'amara.diallo@mail.ci' },
      { name: 'Fatoumata Toure', email: 'fatoumata.toure@mail.ci' },
      { name: 'Koumba Sow', email: 'koumba.sow@mail.ci' },
      { name: 'Yassine Kone', email: 'yassine.kone@mail.ci' },
      { name: 'Awa Ba', email: 'awa.ba@mail.ci' },
      { name: 'Miriam Fall', email: 'miriam.fall@mail.ci' },
    ];

    const users = [];
    for (const fakeUser of fakeUsers) {
      let user = await knex('users').where({ email: fakeUser.email }).first();
      if (!user) {
        const result = await knex('users').insert({
          id: uuidv4(),
          full_name: fakeUser.name,
          email: fakeUser.email,
          phone: '+225 5X XXX XXXX',
          password_hash: crypto.randomBytes(16).toString('hex'),
          role: 'user',
          organization_id: org.id,
          is_active: true,
          onboarding_done: true,
          is_demo: true,
          created_at: new Date(),
          updated_at: new Date(),
        }).returning('*');
        user = result[0];
        console.log(`✓ Utilisateur créé: ${fakeUser.name}`);
      } else {
        console.log(`✓ Utilisateur trouvé: ${fakeUser.name}`);
      }
      users.push(user);
    }

    // Supprimer les anciens commentaires pour recommencer
    console.log('\n🗑️  Suppression des anciens commentaires...');
    await knex('testimony_comments').del();
    await knex('content_comments').del();
    console.log('✓ Commentaires supprimés');

    // Commentaires pour témoignages
    const testimonyComments = {
      1: [
        { content: 'Bravo pour ton courage! C\'était une bonne idée d\'alerter la vendeuse.', user: 0 },
        { content: 'Ça m\'est arrivé aussi. C\'est effrayant mais ta réaction était parfaite.', user: 1 },
        { content: 'Contente que tu sois en sécurité! Les vendeurs peuvent vraiment nous aider.', user: 2 },
      ],
      2: [
        { content: 'Crier c\'est SO efficace! Merci d\'avoir partagé. Ça aide les autres.', user: 3 },
        { content: 'Incroyable tu as réussi à t\'échapper! Je vais utiliser ça aussi.', user: 4 },
        { content: 'J\'espère que tu as signalé à la police? C\'est important pour les statistiques.', user: 5 },
        { content: 'Les femmes qui crient sauvent les femmes qui ne peuvent pas. Merci!', user: 0 },
        { content: 'Ça prend du courage de partager ça. Je suis fière de toi.', user: 1 },
      ],
      3: [
        { content: 'RH s\'en fou généralement. Bien d\'avoir documenté. 💪', user: 2 },
        { content: 'Pareil au mien! On mérite d\'être respectées. Ensemble on est plus fortes.', user: 3 },
        { content: 'Oser dire non c\'est la plus belle forme de résistance.', user: 4 },
      ],
      4: [
        { content: 'Bravo pour le calme! Enregistrer c\'est très smart. Ça peut servir de preuve.', user: 5 },
        { content: 'J\'utilise toujours Uber pour cette raison. On doit partager nos numéros de chauffeur.', user: 0 },
      ],
      5: [
        { content: 'C\'est tellement injuste. Pourquoi personne ne protège les femmes?', user: 1 },
        { content: 'Tu devrais essayer les alternatives: Uber, taxi radio. C\'est plus cher mais plus sûr.', user: 2 },
        { content: 'Les voleurs savent qu\'on n\'a pas d\'arme ni d\'appui. L\'État doit faire plus.', user: 3 },
      ],
      6: [
        { content: 'C\'est du harcèlement sexuel. Tu peux faire un dossier et le signaler légalement.', user: 4 },
        { content: '"C\'est juste son style" = il s\'en fout. Document tout. Chaque incident.', user: 5 },
        { content: 'Même dans un bureau "respectable". C\'est partout. Courage à toi 💜', user: 0 },
        { content: 'Signaler à RH c\'est bien mais c\'est aussi pas mal. Fais un dossier légal.', user: 1 },
      ],
    };

    // Commentaires pour articles
    const articleComments = {
      1: [
        { content: 'Mon ex faisait TOUS ces trucs. J\'ai enfin compris que c\'était pas normal.', user: 0 },
        { content: 'Checklist parfaite. Toutes mes amies devraient lire ça.', user: 1 },
        { content: 'C\'est tellement vrai. Le contrôle ça ressemble à de l\'amour au début. Puis ça étouffé.', user: 2 },
        { content: 'J\'ai reconnu plusieurs signes de mon situation actuelle. Merci.', user: 3 },
      ],
      2: [
        { content: 'Les yeux/nez/gorge c\'est TRÈS efficace. Confirmé.', user: 4 },
        { content: 'Je vais aller à un atelier d\'auto-défense grâce à ça. Merci!', user: 5 },
        { content: 'Le cri c\'est psychologique aussi. Ça paralyse les agresseurs.', user: 0 },
        { content: 'Jamais oublier qu\'on est plus fortes qu\'on le croit.', user: 1 },
        { content: 'Les cours d\'auto-défense sont gratuits à [nom du centre] à Abidjan!', user: 2 },
      ],
      3: [
        { content: 'La documentation c\'est LA arme légale. Absolument crucial.', user: 3 },
        { content: 'J\'ai gardé TOUS les SMS. C\'est ce qui a aidé à la police.', user: 4 },
        { content: 'Bon conseil: screenshot + date + lien au cloud privé.', user: 5 },
        { content: 'Photos de blessures = preuve physique. TRÈS importante.', user: 0 },
        { content: 'On m\'a dit ça et ça a sauvé mon cas. Merci pour ce guide!', user: 1 },
      ],
      4: [
        { content: 'J\'ai appelé le 180. Ils ont vraiment aidé. Ne pas hésiter!', user: 2 },
        { content: 'Ligne d\'écoute 180 sauve des vies. Ils savent ce qu\'ils font.', user: 3 },
        { content: 'La police (110) ne prend pas toujours au sérieux. L\'hôpital fait un dossier légal.', user: 4 },
        { content: 'Bookmark cette page pour l\'urgence. On ne pense pas clair dans le stress.', user: 5 },
        { content: 'Aucune raison de ne pas appeler. C\'est GRATUIT et confidentiel.', user: 0 },
        { content: 'Merci d\'avoir rappelé les numéros. Je les utiliserai si j\'ai besoin.', user: 1 },
      ],
      5: [
        { content: 'Les cauchemars sont RÉELS mais c\'est pas permanent. J\'ai guéri.', user: 2 },
        { content: 'Yoga/sport m\'a vraiment aidée à reprendre mon corps. Merci pour ce guide!', user: 3 },
        { content: 'J\'ai trouvé un groupe de soutien. Les autres survivantes COMPRENNENT.', user: 4 },
        { content: 'C\'est pas votre faute c\'est TELLEMENT important à entendre.', user: 5 },
        { content: 'Thérapie gratuite existe. Cherchez "thérapie gratuite [votre ville]". Ça aide!', user: 0 },
        { content: 'Des milliers guérissent = MOI aussi je peux guérir. Merci pour ça.', user: 1 },
      ],
      6: [
        { content: 'Groupe escorte WhatsApp à notre bâtiment. C\'est efficace!', user: 2 },
        { content: 'La sécurité c\'est collectif. Cet article le rappelle bien.', user: 3 },
        { content: 'En famille j\'enseigne le consentement depuis que ma fille a 6 ans.', user: 4 },
        { content: 'Le coup de sifflet c\'est une excellente idée. Je vais le proposer.', user: 5 },
        { content: 'RH chez nous a une politique zéro harcèlement. Il faut le rappeler partout!', user: 0 },
      ],
    };

    // Commentaires pour photos
    const photoComments = {
      1: [
        { content: 'Quelle belle mobilisation! 500+ femmes = PUISSANCE 💪', user: 0 },
        { content: 'J\'y étais! C\'était incroyable de se sentir soutenus par tant de monde.', user: 1 },
        { content: 'Merci pour cette marche. Ça montre qu\'on n\'est pas seules.', user: 2 },
      ],
      2: [
        { content: 'J\'irai samedi! Merci d\'organiser ça. C\'est crucial.', user: 3 },
        { content: 'Auto-défense gratuite = une ressource qu\'on ne peux pas ignorer.', user: 4 },
        { content: 'Combien de places? Je veux amener ma sœur aussi!', user: 5 },
      ],
      3: [
        { content: 'Les refuges sauvent des vies. Merci aux gens qui les gèrent.', user: 0 },
        { content: 'Important qu\'on sache qu\'il existe 24/7. Ça met de la sécurité.', user: 1 },
        { content: 'Le counseling + ressources légales = TOUT ce qu\'il faut pour commencer.', user: 2 },
      ],
      4: [
        { content: 'Les groupes de soutien c\'est LA thérapie qu\'on n\'attendait pas!', user: 3 },
        { content: 'Mercredi 18h? Je suis intéressée. Comment rejoindre?', user: 4 },
        { content: 'Les autres survivantes COMPRENNENT comme personne d\'autre. Crucial.', user: 5 },
        { content: 'Confidentialité garantie = pouvoir parler librement. C\'est ça la guérison.', user: 0 },
      ],
    };

    // Récupérer les contenus
    const testimonies = await knex('testimonies').orderBy('created_at').limit(6);
    const articles = await knex('articles').orderBy('created_at').limit(6);
    const photos = await knex('photos').orderBy('created_at').limit(4);
    const videos = await knex('videos').orderBy('created_at').limit(6);

    // Ajouter commentaires pour témoignages
    console.log('\n💬 Ajout des commentaires...');
    for (let i = 0; i < testimonies.length; i++) {
      const testimony = testimonies[i];
      const comments = testimonyComments[i + 1] || [];
      for (const comment of comments) {
        await knex('testimony_comments').insert({
          id: uuidv4(),
          testimony_id: testimony.id,
          user_id: users[comment.user].id,
          organization_id: org.id,
          content: comment.content,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      console.log(`✓ Témoignage ${i + 1}: ${comments.length} commentaires`);
    }

    // Ajouter commentaires pour articles
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const comments = articleComments[i + 1] || [];
      for (const comment of comments) {
        await knex('content_comments').insert({
          id: uuidv4(),
          content_type: 'article',
          content_id: article.id,
          user_id: users[comment.user].id,
          comment_text: comment.content,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      console.log(`✓ Article ${i + 1}: ${comments.length} commentaires`);
    }

    // Ajouter commentaires pour photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const comments = photoComments[i + 1] || [];
      for (const comment of comments) {
        await knex('content_comments').insert({
          id: uuidv4(),
          content_type: 'photo',
          content_id: photo.id,
          user_id: users[comment.user].id,
          comment_text: comment.content,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      console.log(`✓ Photo ${i + 1}: ${comments.length} commentaires`);
    }

    // Les commentaires vidéos gardent les utilisateurs existants
    console.log('✓ Commentaires vidéos conservés');

    console.log('\n✅ Commentaires réalistes avec 6 utilisateurs différents!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

initCommentsRealistic();
