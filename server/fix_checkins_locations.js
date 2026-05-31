const knex = require('./src/db/knex');

// Vraies coordonnées GPS
const REAL_LOCATIONS = {
  5.35: { name: 'Cocody, Abidjan', lat: 5.35, lng: -3.9667 },
  5.3364: { name: 'Plateau, Abidjan', lat: 5.3364, lng: -3.9644 },
};

const REAL_COORDS = [
  { lat: 5.3500, lng: -3.9667, name: 'Cocody' },
  { lat: 5.3364, lng: -3.9644, name: 'Plateau' },
  { lat: 5.3419, lng: -3.9489, name: 'Treichville' },
  { lat: 5.3639, lng: -4.0036, name: 'Yopougon' },
  { lat: 5.3092, lng: -3.9897, name: 'Marcory' },
  { lat: 5.3711, lng: -3.9881, name: 'Attécoubé' },
  { lat: 5.4167, lng: -4.0167, name: 'Abobo' },
];

(async () => {
  try {
    console.log('=== Correction des check-ins avec vraies coordonnées ===\n');
    
    // Récupérer tous les check-ins
    const checkins = await knex('checkins')
      .select('id', 'location_lat', 'location_lng');
    
    console.log(`Total check-ins: ${checkins.length}\n`);
    
    // Pour chaque check-in, remplacer par une vraie coord
    let updated = 0;
    for (let i = 0; i < checkins.length; i++) {
      const coords = REAL_COORDS[i % REAL_COORDS.length];
      
      await knex('checkins')
        .where('id', checkins[i].id)
        .update({
          location_lat: coords.lat,
          location_lng: coords.lng
        });
      updated++;
    }
    
    console.log(`✓ ${updated} check-ins corrigés\n`);
    
    // Vérifier
    console.log('=== Vérification ===');
    const sample = await knex('checkins')
      .select('location_lat', 'location_lng')
      .limit(5);
    
    sample.forEach(c => {
      console.log(`GPS: ${c.location_lat}, ${c.location_lng}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
