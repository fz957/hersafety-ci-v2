/**
 * Script d'initialisation : Ajoute commentaires hardcodés pour photos, articles, témoignages
 * Exécuter : node src/scripts/init-comments.js
 */

const knex = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

async function initComments() {
  try {
    console.log('💬 Initialisant les commentaires...');

    // Récupérer un utilisateur et une organisation
    const user = await knex('users').first();
    const org = await knex('organizations').first();
    if (!user || !org) {
      console.error('❌ Pas d\'utilisateur ou organisation');
      process.exit(1);
    }

    // Commentaires pour témoignages (6 premiers)
    const testimonyComments = {
      1: [ // Suivi au marché
        { content: 'Bravo pour ton courage! C\'était une bonne idée d\'alerter la vendeuse.' },
        { content: 'Ça m\'est arrivé aussi. C\'est effrayant mais ta réaction était parfaite.' },
        { content: 'Contente que tu sois en sécurité! Les vendeurs peuvent vraiment nous aider.' },
      ],
      2: [ // Agression - J'ai crié
        { content: 'Crier c\'est SO efficace! Merci d\'avoir partagé. Ça aide les autres.' },
        { content: 'Incroyable tu as réussi à t\'échapper! Je vais utiliser ça aussi.' },
        { content: 'J\'espère que tu as signalé à la police? C\'est important pour les statistiques.' },
        { content: 'Les femmes qui crient sauvent les femmes qui ne peuvent pas. Merci!' },
        { content: 'Ça prend du courage de partager ça. Je suis fière de toi.' },
      ],
      3: [ // Commentaires au travail
        { content: 'RH s\'en fou généralement. Bien d\'avoir documenté. 💪' },
        { content: 'Pareil au mien! On mérite d\'être respectées. Ensemble on est plus fortes.' },
        { content: 'Oser dire non c\'est la plus belle forme de résistance.' },
      ],
      4: [ // Taxi: détour menace
        { content: 'Bravo pour le calme! Enregistrer c\'est très smart. Ça peut servir de preuve.' },
        { content: 'J\'utilise toujours Uber pour cette raison. On doit partager nos numéros de chauffeur.' },
      ],
      5: [ // Vol en minibus
        { content: 'C\'est tellement injuste. Pourquoi personne ne protège les femmes?' },
        { content: 'Tu devrais essayer les alternatives: Uber, taxi radio. C\'est plus cher mais plus sûr.' },
        { content: 'Les voleurs savent qu\'on n\'a pas d\'arme ni d\'appui. L\'État doit faire plus.' },
      ],
      6: [ // Agression au bureau
        { content: 'C\'est du harcèlement sexuel. Tu peux faire un dossier et le signaler légalement.' },
        { content: '"C\'est juste son style" = il s\'en fout. Document tout. Chaque incident.' },
        { content: 'Même dans un bureau "respectable". C\'est partout. Courage à toi 💜' },
        { content: 'Signaler à RH c\'est bien mais c\'est aussi pas mal. Fais un dossier légal.' },
      ],
    };

    // Commentaires pour articles (6 premiers)
    const articleComments = {
      1: [ // Reconnaître un comportement toxique
        { content: 'Mon ex faisait TOUS ces trucs. J\'ai enfin compris que c\'était pas normal.' },
        { content: 'Checklist parfaite. Toutes mes amies devraient lire ça.' },
        { content: 'C\'est tellement vrai. Le contrôle ça ressemble à de l\'amour au début. Puis ça étouffé.' },
        { content: 'J\'ai reconnu plusieurs signes de mon situation actuelle. Merci.' },
      ],
      2: [ // Techniques d'échappement rapide
        { content: 'Les yeux/nez/gorge c\'est TRÈS efficace. Confirmé.' },
        { content: 'Je vais aller à un atelier d\'auto-défense grâce à ça. Merci!' },
        { content: 'Le cri c\'est psychologique aussi. Ça paralyse les agresseurs.' },
        { content: 'Jamais oublier qu\'on est plus fortes qu\'on le croit.' },
        { content: 'Les cours d\'auto-défense sont gratuits à [nom du centre] à Abidjan!' },
      ],
      3: [ // Comment documenter le harcèlement
        { content: 'La documentation c\'est LA arme légale. Absolument crucial.' },
        { content: 'J\'ai gardé TOUS les SMS. C\'est ce qui a aidé à la police.' },
        { content: 'Bon conseil: screenshot + date + lien au cloud privé.' },
        { content: 'Photos de blessures = preuve physique. TRÈS importante.' },
        { content: 'On m\'a dit ça et ça a sauvé mon cas. Merci pour ce guide!' },
      ],
      4: [ // Ressources d'urgence 24/7
        { content: 'J\'ai appelé le 180. Ils ont vraiment aidé. Ne pas hésiter!' },
        { content: 'Ligne d\'écoute 180 sauve des vies. Ils savent ce qu\'ils font.' },
        { content: 'La police (110) ne prend pas toujours au sérieux. L\'hôpital fait un dossier légal.' },
        { content: 'Bookmark cette page pour l\'urgence. On ne pense pas clair dans le stress.' },
        { content: 'Aucune raison de ne pas appeler. C\'est GRATUIT et confidentiel.' },
        { content: 'Merci d\'avoir rappelé les numéros. Je les utiliserai si j\'ai besoin.' },
      ],
      5: [ // Guérir après trauma
        { content: 'Les cauchemars sont RÉELS mais c\'est pas permanent. J\'ai guéri.' },
        { content: 'Yoga/sport m\'a vraiment aidée à reprendre mon corps. Merci pour ce guide!' },
        { content: 'J\'ai trouvé un groupe de soutien. Les autres survivantes COMPRENNENT.' },
        { content: 'C\'est pas votre faute c\'est TELLEMENT important à entendre.' },
        { content: 'Thérapie gratuite existe. Cherchez "thérapie gratuite [votre ville]". Ça aide!' },
        { content: 'Des milliers guérissent = MOI aussi je peux guérir. Merci pour ça.' },
      ],
      6: [ // Créer des espaces sûrs
        { content: 'Groupe escorte WhatsApp à notre bâtiment. C\'est efficace!' },
        { content: 'La sécurité c\'est collectif. Cet article le rappelle bien.' },
        { content: 'En famille j\'enseigne le consentement depuis que ma fille a 6 ans.' },
        { content: 'Le coup de sifflet c\'est une excellente idée. Je vais le proposer.' },
        { content: 'RH chez nous a une politique zéro harcèlement. Il faut le rappeler partout!' },
      ],
    };

    // Commentaires pour photos (4 premières)
    const photoComments = {
      1: [ // Marche pour la sécurité
        { content: 'Quelle belle mobilisation! 500+ femmes = PUISSANCE 💪' },
        { content: 'J\'y étais! C\'était incroyable de se sentir soutenus par tant de monde.' },
        { content: 'Merci pour cette marche. Ça montre qu\'on n\'est pas seules.' },
      ],
      2: [ // Atelier auto-défense
        { content: 'J\'irai samedi! Merci d\'organiser ça. C\'est crucial.' },
        { content: 'Auto-défense gratuite = une ressource qu\'on ne peux pas ignorer.' },
        { content: 'Combien de places? Je veux amener ma sœur aussi!' },
      ],
      3: [ // Refuge d'urgence 24/7
        { content: 'Les refuges sauvent des vies. Merci aux gens qui les gèrent.' },
        { content: 'Important qu\'on sache qu\'il existe 24/7. Ça met de la sécurité.' },
        { content: 'Le counseling + ressources légales = TOUT ce qu\'il faut pour commencer.' },
      ],
      4: [ // Groupe de soutien
        { content: 'Les groupes de soutien c\'est LA thérapie qu\'on n\'attendait pas!' },
        { content: 'Mercredi 18h? Je suis intéressée. Comment rejoindre?' },
        { content: 'Les autres survivantes COMPRENNENT comme personne d\'autre. Crucial.' },
        { content: 'Confidentialité garantie = pouvoir parler librement. C\'est ça la guérison.' },
      ],
    };

    // Récupérer les premiers témoignages, articles, photos
    const testimonies = await knex('testimonies').orderBy('created_at').limit(6);
    const articles = await knex('articles').orderBy('created_at').limit(6);
    const photos = await knex('photos').orderBy('created_at').limit(4);

    console.log(`Trouvé: ${testimonies.length} témoignages, ${articles.length} articles, ${photos.length} photos`);

    // Ajouter commentaires pour témoignages (table testimony_comments)
    // Note: Unique constraint sur (testimony_id, user_id) donc limité à 1 comms par user
    for (let i = 0; i < testimonies.length; i++) {
      const testimony = testimonies[i];
      const comments = testimonyComments[i + 1] || [];
      let addedCount = 0;
      for (const comment of comments) {
        const exists = await knex('testimony_comments')
          .where({ testimony_id: testimony.id, content: comment.content })
          .first();
        if (!exists) {
          try {
            await knex('testimony_comments').insert({
              id: uuidv4(),
              testimony_id: testimony.id,
              user_id: user.id,
              organization_id: org.id,
              content: comment.content,
              created_at: new Date(),
              updated_at: new Date(),
            });
            addedCount++;
          } catch(e) {
            // Skip si constraint violation (un seul comment par user par testimony)
          }
        }
      }
      console.log(`✓ Témoignage ${i + 1}: ${addedCount} commentaires ajoutés`);
    }

    // Ajouter commentaires pour articles
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const comments = articleComments[i + 1] || [];
      for (const comment of comments) {
        const exists = await knex('content_comments')
          .where({ content_type: 'article', content_id: article.id, comment_text: comment.content })
          .first();
        if (!exists) {
          await knex('content_comments').insert({
            id: uuidv4(),
            content_type: 'article',
            content_id: article.id,
            user_id: user.id,
            comment_text: comment.content,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
      console.log(`✓ Article ${i + 1}: ${comments.length} commentaires`);
    }

    // Ajouter commentaires pour photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const comments = photoComments[i + 1] || [];
      for (const comment of comments) {
        const exists = await knex('content_comments')
          .where({ content_type: 'photo', content_id: photo.id, comment_text: comment.content })
          .first();
        if (!exists) {
          await knex('content_comments').insert({
            id: uuidv4(),
            content_type: 'photo',
            content_id: photo.id,
            user_id: user.id,
            comment_text: comment.content,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
      console.log(`✓ Photo ${i + 1}: ${comments.length} commentaires`);
    }

    console.log('✅ Tous les commentaires ajoutés!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

initComments();
