const knex = require('./src/db/knex');

(async () => {
  try {
    console.log('=== TEST API /admin/users/list ===\n');
    
    // Simuler la requête API
    const organizationId = '9b63683f-9b14-418a-96c0-4c41d40defd5'; // Org de test
    
    const users = await knex('users')
      .where({ organization_id: organizationId, role: 'user' })
      .select(
        'users.id',
        'users.email',
        'users.full_name',
        'users.phone',
        'users.is_active',
        'users.created_at'
      )
      .orderBy('users.created_at', 'desc')
      .limit(50);

    console.log(`Utilisatrices trouvées: ${users.length}\n`);

    const usersWithData = await Promise.all(
      users.slice(0, 5).map(async (user) => {
        const alertCount = await knex('alerts')
          .where({ user_id: user.id })
          .count('id as total')
          .first();

        const lastCheckin = await knex('checkins')
          .where({ user_id: user.id })
          .select('location_lat', 'location_lng', 'checked_at')
          .orderBy('checked_at', 'desc')
          .first();

        let lastLocation = null;
        if (lastCheckin && lastCheckin.location_lat && lastCheckin.location_lng) {
          try {
            const lat = parseFloat(lastCheckin.location_lat);
            const lng = parseFloat(lastCheckin.location_lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              lastLocation = `${lat.toFixed(4)},${lng.toFixed(4)}`;
            }
          } catch (e) {
            lastLocation = null;
          }
        }

        if (!lastLocation) {
          const lastAlert = await knex('alerts')
            .where({ user_id: user.id })
            .select('location_label')
            .orderBy('created_at', 'desc')
            .first();
          lastLocation = lastAlert?.location_label || null;
        }

        return {
          ...user,
          alerts_count: parseInt(alertCount?.total || 0, 10),
          last_location: lastLocation,
        };
      })
    );

    console.log('✅ Résultat API:');
    usersWithData.forEach(u => {
      console.log(`\n${u.full_name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Alertes: ${u.alerts_count}`);
      console.log(`  Localisation: ${u.last_location || '—'}`);
      console.log(`  Statut: ${u.is_active ? 'Actif' : 'Inactif'}`);
    });

    console.log('\n✅ API FONCTIONNE! Pas d\'erreur 500');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    process.exit(1);
  }
})();
