const knex = require('./src/db/knex');
const axios = require('axios');

const PHOTON_API = 'https://photon.komoot.io/reverse';

(async () => {
  try {
    console.log('=== Reverse geocoding des vraies coordonnées d\'alerte ===\n');
    
    // Récupérer TOUTES les coordonnées uniques de emergency_history
    const uniqueCoords = await knex('emergency_history')
      .select('latitude', 'longitude', 'user_id')
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .distinct('latitude', 'longitude');
    
    console.log(`${uniqueCoords.length} coordonnées uniques trouvées\n`);
    
    const coordToLocation = {};
    
    for (const coord of uniqueCoords) {
      const key = `${coord.latitude},${coord.longitude}`;
      
      try {
        const response = await axios.get(PHOTON_API, {
          params: {
            lat: coord.latitude,
            lon: coord.longitude,
            limit: 1,
            lang: 'fr'
          },
          timeout: 5000
        });
        
        if (response.data.features?.length > 0) {
          const { properties } = response.data.features[0];
          let locationName = properties.name || '';
          if (properties.city && !locationName.includes(properties.city)) {
            locationName += (locationName ? ', ' : '') + properties.city;
          }
          
          coordToLocation[key] = locationName;
          console.log(`${key} → ${locationName}`);
        }
      } catch (err) {
        console.log(`${key} → Erreur: ${err.message}`);
      }
    }
    
    // Mettre à jour les alertes avec les vraies coordonnées et noms
    console.log('\n=== Mise à jour des alertes ===\n');
    
    for (const coord of uniqueCoords) {
      const key = `${coord.latitude},${coord.longitude}`;
      const locationName = coordToLocation[key];
      
      if (locationName) {
        const updated = await knex('alerts')
          .where('location_lat', coord.latitude)
          .where('location_lng', coord.longitude)
          .update({
            location_label: locationName
          });
        
        if (updated > 0) {
          const user = await knex('users').where('id', coord.user_id).first();
          console.log(`${user?.full_name}: ${updated} alertes → ${locationName}`);
        }
      }
    }
    
    console.log('\n✅ Alertes mises à jour avec coordonnées et noms réels!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
