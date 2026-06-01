const WebSocket = require('ws');

let wss = null;
const clients = new Set();

/**
 * Initialiser le serveur WebSocket
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connecté');
    clients.add(ws);

    ws.on('close', () => {
      console.log('[WebSocket] Client déconnecté');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Erreur:', err.message);
    });
  });

  console.log('[WebSocket] Serveur WebSocket initialisé sur /ws');
}

/**
 * Émettre un événement à tous les clients connectés
 */
function broadcast(event, data) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized');
    return;
  }

  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  console.log(`[WebSocket] Broadcasting: ${event}`, data);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Événement: Commentaire supprimé
 */
function notifyCommentDeleted(contentType, contentId, commentId) {
  broadcast('COMMENT_DELETED', {
    contentType,
    contentId,
    commentId,
  });
}

/**
 * Événement: Commentaire ajouté
 */
function notifyCommentAdded(contentType, contentId, comment) {
  broadcast('COMMENT_ADDED', {
    contentType,
    contentId,
    comment,
  });
}

/**
 * Événement: Réponse supprimée
 */
function notifyReplyDeleted(commentId, replyId) {
  broadcast('REPLY_DELETED', {
    commentId,
    replyId,
  });
}

module.exports = {
  initWebSocket,
  broadcast,
  notifyCommentDeleted,
  notifyCommentAdded,
  notifyReplyDeleted,
};
