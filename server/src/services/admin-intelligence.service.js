/**
 * Admin Intelligence Service
 * Gathers data for admin AI assistant
 */

const knex = require('../db/knex');

/**
 * Get alerts data for AI analysis
 */
const getAlertsData = async () => {
  try {
    // Alertes d'aujourd'hui
    const todayAlerts = await knex('emergency_history')
      .whereRaw("DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE")
      .count('id as total')
      .first();

    // Alertes actives
    const activeAlerts = await knex('emergency_history')
      .where('status', 'active')
      .count('id as total')
      .first();

    // Distribution par niveau
    const levelDistribution = await knex('emergency_history')
      .select('level', knex.raw('count(*) as count'))
      .groupBy('level')
      .orderBy('level');

    // Alertes par utilisatrice (les plus actives)
    const topUsers = await knex('emergency_history')
      .leftJoin('users', 'emergency_history.user_id', 'users.id')
      .select('users.full_name', knex.raw('count(*) as alert_count'))
      .groupBy('users.id', 'users.full_name')
      .orderBy('alert_count', 'desc')
      .limit(5);

    return {
      today_count: parseInt(todayAlerts?.total || 0),
      active_count: parseInt(activeAlerts?.total || 0),
      level_distribution: levelDistribution.map(l => ({
        level: l.level,
        count: parseInt(l.count)
      })),
      top_alert_users: topUsers
    };
  } catch (err) {
    console.error('[ADMIN-INTELLIGENCE] getAlertsData error:', err.message);
    return { error: 'Impossible de récupérer les données d\'alertes' };
  }
};

/**
 * Get reports (signalements) data
 */
const getReportsData = async () => {
  try {
    // Signalements total
    const totalReports = await knex('reports').count('id as total').first();

    // Signalements en attente
    const pendingReports = await knex('reports')
      .where('status', 'pending')
      .count('id as total')
      .first();

    // Signalements vérifiés
    const verifiedReports = await knex('reports')
      .where('status', 'verified')
      .count('id as total')
      .first();

    // Distribution par type de danger
    const dangerTypes = await knex('reports')
      .select('danger_type', knex.raw('count(*) as count'))
      .groupBy('danger_type')
      .orderBy('count', 'desc');

    // Lieux avec le plus de signalements
    const topLocations = await knex('reports')
      .select('place_name', knex.raw('count(*) as report_count'))
      .where('status', 'verified')
      .groupBy('place_name')
      .orderBy('report_count', 'desc')
      .limit(5);

    return {
      total_count: parseInt(totalReports?.total || 0),
      pending_count: parseInt(pendingReports?.total || 0),
      verified_count: parseInt(verifiedReports?.total || 0),
      danger_types: dangerTypes.map(d => ({
        type: d.danger_type,
        count: parseInt(d.count)
      })),
      top_locations: topLocations
    };
  } catch (err) {
    console.error('[ADMIN-INTELLIGENCE] getReportsData error:', err.message);
    return { error: 'Impossible de récupérer les données de signalements' };
  }
};

/**
 * Get community data (posts, comments, users)
 */
const getCommunityData = async () => {
  try {
    // Total utilisatrices
    const totalUsers = await knex('users')
      .where({ role: 'user', is_active: true })
      .count('id as total')
      .first();

    // Vidéos
    const videoCount = await knex('videos')
      .where('status', 'approved')
      .count('id as total')
      .first();

    // Articles
    const articleCount = await knex('articles')
      .count('id as total')
      .first();

    // Photos
    const photoCount = await knex('photos')
      .count('id as total')
      .first();

    // Commentaires total
    const commentCount = await knex('content_comments')
      .count('id as total')
      .first();

    // Témoignages en attente
    const pendingTestimonies = await knex('testimonies')
      .where('status', 'pending')
      .count('id as total')
      .first();

    // Posts signalés
    const flaggedPosts = await knex('videos')
      .where('flagged', true)
      .count('id as total')
      .first();

    return {
      active_users: parseInt(totalUsers?.total || 0),
      videos: parseInt(videoCount?.total || 0),
      articles: parseInt(articleCount?.total || 0),
      photos: parseInt(photoCount?.total || 0),
      comments: parseInt(commentCount?.total || 0),
      pending_testimonies: parseInt(pendingTestimonies?.total || 0),
      flagged_posts: parseInt(flaggedPosts?.total || 0)
    };
  } catch (err) {
    console.error('[ADMIN-INTELLIGENCE] getCommunityData error:', err.message);
    return { error: 'Impossible de récupérer les données de communauté' };
  }
};

/**
 * Detect anomalies in data
 */
const detectAnomalies = async () => {
  try {
    const anomalies = [];

    // Check 1: Trop d'alertes en peu de temps
    const alertSpike = await knex('emergency_history')
      .whereRaw("created_at > NOW() - INTERVAL '1 hour'")
      .count('id as total')
      .first();

    if (parseInt(alertSpike?.total || 0) > 10) {
      anomalies.push({
        type: 'ALERT_SPIKE',
        severity: 'HIGH',
        message: `${alertSpike.total} alertes en 1 heure - Possible incident`,
        count: parseInt(alertSpike.total)
      });
    }

    // Check 2: Zone avec concentration de signalements
    const concentratedZone = await knex('reports')
      .select('place_name', knex.raw('count(*) as count'))
      .where('status', 'verified')
      .groupBy('place_name')
      .orderBy('count', 'desc')
      .first();

    if (concentratedZone && parseInt(concentratedZone.count) > 20) {
      anomalies.push({
        type: 'ZONE_CONCENTRATION',
        severity: 'MEDIUM',
        message: `${concentratedZone.place_name}: ${concentratedZone.count} signalements`,
        location: concentratedZone.place_name,
        count: parseInt(concentratedZone.count)
      });
    }

    // Check 3: Utilisateur avec trop d'alertes (possible bot/spam)
    const spamUser = await knex('emergency_history')
      .select('user_id', knex.raw('count(*) as alert_count'))
      .groupBy('user_id')
      .orderBy('alert_count', 'desc')
      .first();

    if (spamUser && parseInt(spamUser.alert_count) > 50) {
      anomalies.push({
        type: 'SPAM_USER',
        severity: 'MEDIUM',
        message: `Utilisatrice suspecte: ${spamUser.alert_count} alertes`,
        user_id: spamUser.user_id,
        count: parseInt(spamUser.alert_count)
      });
    }

    // Check 4: Beaucoup de posts signalés
    const flaggedCount = await knex('videos')
      .where('flagged', true)
      .count('id as total')
      .first();

    if (parseInt(flaggedCount?.total || 0) > 5) {
      anomalies.push({
        type: 'FLAGGED_CONTENT',
        severity: 'MEDIUM',
        message: `${flaggedCount.total} posts signalés attendant modération`,
        count: parseInt(flaggedCount.total)
      });
    }

    return {
      anomalies_found: anomalies.length,
      anomalies: anomalies
    };
  } catch (err) {
    console.error('[ADMIN-INTELLIGENCE] detectAnomalies error:', err.message);
    return { error: 'Impossible de détecter les anomalies' };
  }
};

/**
 * Generate daily report
 */
const generateDailyReport = async () => {
  try {
    const alerts = await getAlertsData();
    const reports = await getReportsData();
    const community = await getCommunityData();
    const anomalies = await detectAnomalies();

    return {
      date: new Date().toISOString().split('T')[0],
      alerts,
      reports,
      community,
      anomalies,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[ADMIN-INTELLIGENCE] generateDailyReport error:', err.message);
    return { error: 'Impossible de générer le rapport' };
  }
};

module.exports = {
  getAlertsData,
  getReportsData,
  getCommunityData,
  detectAnomalies,
  generateDailyReport
};
