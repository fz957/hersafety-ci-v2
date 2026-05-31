const knex = require('./src/db/knex');

const LOCATIONS = [
  'Cocody, Abidjan',
  'Plateau, Abidjan',
  'Treichville, Abidjan',
  'Marcory, Abidjan',
  'Yopougon, Abidjan',
  'Attécoubé, Abidjan',
  'Abobo, Abidjan',
  'Anyama, Abidjan',
  'Bingerville',
  'Bouaké',
  'Yamoussoukro',
  'Gare routière Nord',
  'Boulevard de la Paix',
  'Avenue Terrasson de Fougères',
  'Rue du Commerce',
];

(async () => {
  try {
    console.log('=== Ajout de localisations aux alertes ===\n');
    
    // 1. Récupérer toutes les alertes sans localisation
    const alertsWithoutLocation = await knex('alerts')
      .where({ location_label: null })
      .select('id', 'user_id');
    
    console.log(`Alertes sans localisation: ${alertsWithoutLocation.length}`);
    
    // 2. Ajouter des localisations aléatoires
    let updated = 0;
    for (const alert of alertsWithoutLocation) {
      const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      await knex('alerts')
        .where('id', alert.id)
        .update({ location_label: location });
      updated++;
    }
    
    console.log(`✓ ${updated} alertes mises à jour avec localisations\n`);
    
    // 3. Vérifier le résultat
    console.log('=== Résumé par utilisatrice ===');
    const users = await knex('users')
      .where('role', 'user')
      .select('id', 'full_name');
    
    for (const user of users) {
      const alerts = await knex('alerts')
        .where('user_id', user.id)
        .select('location_label')
        .orderBy('created_at', 'desc');
      
      if (alerts.length > 0) {
        console.log(`\n${user.full_name}: ${alerts.length} alertes`);
        console.log(`  Dernière: ${alerts[0].location_label}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
