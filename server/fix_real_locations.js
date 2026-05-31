const knex = require('./src/db/knex');

// Vraies coordonnées GPS des quartiers d'Abidjan et villes
const REAL_LOCATIONS = [
  { name: 'Cocody, Abidjan', lat: 5.3500, lng: -3.9667 },
  { name: 'Plateau, Abidjan', lat: 5.3364, lng: -3.9644 },
  { name: 'Treichville, Abidjan', lat: 5.3419, lng: -3.9489 },
  { name: 'Yopougon, Abidjan', lat: 5.3639, lng: -4.0036 },
  { name: 'Marcory, Abidjan', lat: 5.3092, lng: -3.9897 },
  { name: 'Attécoubé, Abidjan', lat: 5.3711, lng: -3.9881 },
  { name: 'Abobo, Abidjan', lat: 5.4167, lng: -4.0167 },
  { name: 'Anyama, Abidjan', lat: 5.4667, lng: -4.0833 },
  { name: 'Bingerville', lat: 5.3469, lng: -3.8739 },
  { name: 'Bouaké', lat: 7.7000, lng: -5.0333 },
  { name: 'Yamoussoukro', lat: 6.8276, lng: -5.2893 },
  { name: 'Gare routière Nord', lat: 5.3850, lng: -4.0150 },
  { name: 'Boulevard de la Paix', lat: 5.3500, lng: -3.9600 },
  { name: 'Avenue Terrasson de Fougères', lat: 5.3300, lng: -3.9700 },
  { name: 'Rue du Commerce', lat: 5.3350, lng: -3.9650 },
];

(async () => {
  try {
    console.log('=== Correction des vraies localisations GPS ===\n');
    
    // Récupérer toutes les alertes
    const alerts = await knex('alerts')
      .select('id', 'location_label');
    
    console.log(`Total d'alertes: ${alerts.length}\n`);
    
    // Pour chaque alerte, mettre à jour avec les vraies coords
    let updated = 0;
    for (const alert of alerts) {
      // Trouver la localisation correspondante
      const location = REAL_LOCATIONS.find(l => 
        l.name.toLowerCase() === (alert.location_label || '').toLowerCase()
      );
      
      if (location) {
        await knex('alerts')
          .where('id', alert.id)
          .update({ 
            location_lat: location.lat,
            location_lng: location.lng 
          });
        updated++;
      }
    }
    
    console.log(`✓ ${updated} alertes mises à jour avec vraies coordonnées\n`);
    
    // Vérifier le résultat
    console.log('=== Vérification ===');
    const sample = await knex('alerts')
      .select('location_label', 'location_lat', 'location_lng')
      .limit(5);
    
    sample.forEach(a => {
      console.log(`${a.location_label}: ${a.location_lat}, ${a.location_lng}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
