const knex = require('./src/db/knex');
const axios = require('axios');

const PHOTON_API = 'https://photon.komoot.io/reverse';

(async () => {
  try {
    console.log('=== Reverse geocoding final des vraies localisations ===\n');
    
    const userCoords = [
      { name: 'ff', lat: 5.3469, lng: -3.8739 },
      { name: 'zreik fatme', lat: 5.35, lng: -3.9667 },
      { name: 'chaymaa', lat: 7.7, lng: -5.0333 }
    ];
    
    for (const { name, lat, lng } of userCoords) {
      try {
        console.log(`${name}: ${lat}, ${lng}...`);
        
        const response = await axios.get(PHOTON_API, {
          params: { lat, lon: lng, limit: 1, lang: 'fr' },
          timeout: 5000
        });
        
        if (response.data.features?.length > 0) {
          const { properties } = response.data.features[0];
          let locationName = properties.name || '';
          if (properties.city && !locationName.includes(properties.city)) {
            locationName += (locationName ? ', ' : '') + properties.city;
          }
          
          // Update all alerts for this user
          const user = await knex('users').where('full_name', name).first();
          if (user) {
            await knex('alerts')
              .where('user_id', user.id)
              .update({ location_label: locationName });
            
            console.log(`  ✓ ${locationName}\n`);
          }
        }
      } catch (err) {
        console.log(`  ✗ Erreur: ${err.message}\n`);
      }
    }
    
    // Vérifier le résultat
    console.log('=== Résultat ===');
    const alerts = await knex('alerts')
      .join('users', 'alerts.user_id', '=', 'users.id')
      .select('users.full_name', 'alerts.location_label')
      .distinct('users.id', 'alerts.location_label');
    
    alerts.forEach(a => {
      console.log(`${a.full_name}: ${a.location_label}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
