const knex = require('./src/db/knex');
const axios = require('axios');

const PHOTON_API = 'https://photon.komoot.io/reverse';

(async () => {
  try {
    console.log('=== Utiliser le LIEU DE LANCEMENT avec fallback au REFUGE ===\n');
    
    // Pour chaque alerte, trouver le meilleur nom du lieu de lancement
    const alerts = await knex('alerts')
      .select('alerts.id', 'alerts.user_id', 'alerts.location_lat', 'alerts.location_lng');
    
    let updated = 0;
    
    for (const alert of alerts) {
      // Chercher l'historique d'urgence correspondant
      const history = await knex('emergency_history')
        .where('user_id', alert.user_id)
        .where('latitude', alert.location_lat)
        .where('longitude', alert.location_lng)
        .orderBy('created_at', 'desc')
        .first();
      
      if (!history) continue;
      
      let bestName = history.location_name;
      
      // Si le nom du LANCEMENT est générique, utiliser le REFUGE
      if (!bestName || bestName === 'Position actuelle' || bestName.includes('Test')) {
        bestName = history.final_location_name;
      }
      
      // Si on n'a toujours rien, reverse-geocoder
      if (!bestName || bestName === 'Position actuelle') {
        try {
          const response = await axios.get(PHOTON_API, {
            params: {
              lat: alert.location_lat,
              lon: alert.location_lng,
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
            bestName = locationName;
          }
        } catch (err) {
          bestName = `${alert.location_lat}, ${alert.location_lng}`;
        }
      }
      
      // Mettre à jour l'alerte
      await knex('alerts')
        .where('id', alert.id)
        .update({ location_label: bestName });
      
      updated++;
    }
    
    console.log(`✅ ${updated} alertes mises à jour avec les VRAIS lieux de lancement!`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
