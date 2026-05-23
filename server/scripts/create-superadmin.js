/**
 * Script de création du superadmin HerSafety CI
 * Usage : node scripts/create-superadmin.js
 *
 * Crée :
 *   1. L'organisation "HerSafety CI" (tenant racine)
 *   2. Un compte superadmin
 *   3. Un compte admin (optionnel)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const knex   = require('../src/db/knex');

// ─── Configuration — modifie ici ──────────────────────────────────────────────
const ORG = {
  name:      'HerSafety CI',
  type:      'ong',
  email:     'admin@hersafety.ci',
  join_code: 'HERSAFE1',
};

const SUPERADMIN = {
  email:     'f.zreik04@gmail.com',
  password:  'HerSafety2026!',
  full_name: 'Super Admin',
  role:      'superadmin',
};

// Ajoute d'autres comptes admin ici si besoin
const EXTRA_ADMINS = [
  // { email: 'admin@ong.ci', password: 'MotDePasse123!', full_name: 'Admin ONG', role: 'admin' },
];
// ──────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🌸 HerSafety CI — Création des comptes admin\n');

  try {
    // 1. Organisation
    let org = await knex('organizations').where({ email: ORG.email }).first();
    if (org) {
      console.log(`✓ Organisation déjà existante : ${org.name} (join_code: ${org.join_code})`);
    } else {
      [org] = await knex('organizations')
        .insert({ ...ORG, is_active: true, is_approved: true })
        .returning('*');
      console.log(`✓ Organisation créée : ${org.name}`);
      console.log(`  → join_code : ${org.join_code}`);
    }

    // 2. Comptes à créer
    const accounts = [SUPERADMIN, ...EXTRA_ADMINS];

    for (const acc of accounts) {
      const existing = await knex('users').where({ email: acc.email }).first();
      if (existing) {
        console.log(`⚠  Compte déjà existant : ${acc.email} (role: ${existing.role})`);
        continue;
      }

      const password_hash = await bcrypt.hash(acc.password, 12);
      const [user] = await knex('users')
        .insert({
          organization_id: org.id,
          email:           acc.email,
          password_hash,
          full_name:       acc.full_name,
          role:            acc.role,
          is_active:       true,
          onboarding_done: true,
        })
        .returning(['id', 'email', 'full_name', 'role']);

      console.log(`✓ Compte créé : ${user.email}`);
      console.log(`  → rôle      : ${user.role}`);
      console.log(`  → mot de passe : ${acc.password}`);
    }

    console.log('\n✅ Terminé. Tu peux maintenant te connecter sur /login\n');
  } catch (err) {
    console.error('\n❌ Erreur :', err.message);
    if (err.code) console.error('   Code PG :', err.code);
  } finally {
    await knex.destroy();
  }
}

run();
