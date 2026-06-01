require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const knex   = require('../src/db/knex');

// Mock email service - prevent real SMTP connections in tests
jest.mock('../src/services/email.service', () => ({
  initializeTransporter: jest.fn(),
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAlertEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAlertConfirmationEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendProfileChangeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAccountDeletionEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendWeeklyReport: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendTrackNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAdminAlertNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAdminReportNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendAdminCommentNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
}));

const uid = () => Math.random().toString(36).slice(2, 10);

async function createTestOrg(overrides = {}) {
  const [org] = await knex('organizations').insert({
    name:        overrides.name        || `Org-${uid()}`,
    type:        overrides.type        || 'ong',
    email:       overrides.email       || `org-${uid()}@test.com`,
    join_code:   overrides.join_code   || `CODE-${uid()}`,
    is_active:   true,
    is_approved: true,
    ...overrides,
  }).returning('*');
  return org;
}

async function createTestUser(organizationId, overrides = {}) {
  const [user] = await knex('users').insert({
    organization_id: organizationId,
    email:           overrides.email     || `user-${uid()}@test.com`,
    password_hash:   await bcrypt.hash('Password123!', 10),
    full_name:       overrides.full_name || 'Test User',
    role:            overrides.role      || 'user',
    is_active:       true,
    ...overrides,
  }).returning('*');
  return user;
}

// Génère un cookie "token=<jwt>" utilisable dans supertest .set('Cookie', authCookie(user))
function authCookie(user) {
  const token = jwt.sign(
    { userId: user.id, organizationId: user.organization_id, role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

async function cleanupOrg(orgId) {
  // CASCADE supprime users → contacts, alerts, tracks, etc.
  await knex('organizations').where({ id: orgId }).delete();
}

module.exports = { createTestOrg, createTestUser, authCookie, cleanupOrg, knex };
