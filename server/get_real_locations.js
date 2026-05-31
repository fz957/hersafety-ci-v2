const knex = require('./src/db/knex');
const axios = require('axios');

const PHOTON_API = 'https://photon.komoot.io/reverse';

(async () => {
  try {
    console.log('=== Vraies localisations de l\'historique des utilisatrices ===\n');
    
    // Récupérer les localisations uniques par utilisatrice de emergency_history
    const history = await knex('emergency_history')
      .select('user_id', 'latitude', 'longitude')
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .distinct('user_id', 'latitude', 'longitude');
    
    // Grouper par user
    const byUser = {};
    for (const h of history) {
      if (!byUser[h.user_id]) byUser[h.user_id] = [];
      byUser[h.user_id].push({ lat: h.latitude, lng: h.longitude });
    }
    
    console.log('Localisations uniques par utilisatrice:\n');
    
    for (const userId in byUser) {
      const user = await knex('users').where('id', userId).first();
      if (!user) continue;
      
      console.log(`${user.full_name}: ${byUser[userId].length} localisation(s)`);
      
      // Reverse geocode chaque coordonnée
      for (const coord of byUser[userId]) {
        try {
          const response = await axios.get(PHOTON_API, {
            params: {
              lat: coord.lat,
              lon: coord.lng,
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
            
            console.log(`  ${coord.lat}, ${coord.lng} → ${locationName}`);
            
            // Mettre à jour TOUTES les alertes de cet utilisateur
            await knex('alerts')
              .where('user_id', userId)
              .update({
                location_lat: coord.lat,
                location_lng: coord.lng,
                location_label: locationName
              });
          }
        } catch (err) {
          console.log(`  ✗ Erreur: ${err.message}`);
        }
      }
      console.log('');
    }
    
    console.log('✅ Alertes mises à jour avec vraies localisations!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
