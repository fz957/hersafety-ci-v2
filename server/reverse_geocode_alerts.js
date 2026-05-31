const knex = require('./src/db/knex');
const axios = require('axios');

// API Photon (gratuit, sans authentification)
const PHOTON_API = 'https://photon.komoot.io/reverse';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    console.log('=== Reverse geocoding des alertes avec Photon ===\n');
    
    // Récupérer les alertes avec coordonnées
    const alerts = await knex('alerts')
      .whereNotNull('location_lat')
      .select('id', 'location_lat', 'location_lng', 'location_label')
      .orderBy('created_at', 'desc')
      .limit(20);
    
    console.log(`Traitement ${alerts.length} alertes...\n`);
    
    let updated = 0;
    for (const alert of alerts) {
      try {
        const lat = parseFloat(alert.location_lat);
        const lng = parseFloat(alert.location_lng);
        
        console.log(`Geocoding: ${lat}, ${lng}...`);
        
        // Call Photon API
        const response = await axios.get(PHOTON_API, {
          params: {
            lat: lat,
            lon: lng,
            limit: 1,
            lang: 'fr'
          },
          timeout: 5000
        });
        
        if (response.data.features && response.data.features.length > 0) {
          const feature = response.data.features[0];
          const properties = feature.properties;
          
          // Construire nom formaté
          let locationName = '';
          if (properties.name) locationName = properties.name;
          if (properties.city && !locationName.includes(properties.city)) {
            locationName += (locationName ? ', ' : '') + properties.city;
          }
          
          if (locationName) {
            await knex('alerts')
              .where('id', alert.id)
              .update({ location_label: locationName });
            
            console.log(`  ✓ ${locationName}\n`);
            updated++;
            
            await sleep(300);
          }
        }
      } catch (err) {
        console.log(`  ✗ Erreur: ${err.message}\n`);
      }
    }
    
    console.log(`✅ ${updated} alertes mises à jour avec vraies localisations!`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
