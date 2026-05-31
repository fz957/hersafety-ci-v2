const knex = require('./src/db/knex');

(async () => {
  try {
    const admins = await knex('users')
      .where({ role: 'admin' })
      .orWhere({ role: 'superadmin' })
      .select('id', 'email', 'full_name', 'role');
    
    console.log('=== Administrateurs ===');
    if (admins.length === 0) {
      console.log('Aucun admin trouvé');
    } else {
      admins.forEach(a => {
        console.log(`${a.email} (${a.role}) - ${a.full_name}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
