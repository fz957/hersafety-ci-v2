const knex = require('./src/db/knex');
const axios = require('axios');

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

(async () => {
  try {
    console.log('=== Reverse-geocode TOUTES les alertes avec Nominatim ===\n');
    
    const alerts = await knex('alerts')
      .select('id', 'location_lat', 'location_lng')
      .whereNotNull('location_lat')
      .whereNotNull('location_lng');
    
    const coordMap = {};
    
    // Reverse-geocoder chaque coordonnée unique
    for (const alert of alerts) {
      const key = `${alert.location_lat},${alert.location_lng}`;
      
      if (coordMap[key]) {
        continue; // Déjà reverse-geocodée
      }
      
      try {
        const response = await axios.get(NOMINATIM_API, {
          params: {
            lat: alert.location_lat,
            lon: alert.location_lng,
            format: 'json',
            zoom: 18,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'HerSafety-CI'
          },
          timeout: 5000
        });
        
        const addr = response.data.address;
        const name = addr.neighbourhood || addr.suburb || addr.city_district || addr.city || 'Position actuelle';
        
        coordMap[key] = name;
        console.log(`${key} → ${name}`);
      } catch (err) {
        console.log(`${key} → Erreur: ${err.message}`);
        coordMap[key] = `${alert.location_lat}, ${alert.location_lng}`;
      }
    }
    
    console.log('\n=== Mise à jour des alertes ===\n');
    
    let updated = 0;
    for (const alert of alerts) {
      const key = `${alert.location_lat},${alert.location_lng}`;
      const newName = coordMap[key];
      
      await knex('alerts')
        .where('id', alert.id)
        .update({ location_label: newName });
      
      updated++;
    }
    
    console.log(`✅ ${updated} alertes mises à jour!`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
