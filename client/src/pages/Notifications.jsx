import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/testimonies/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (err) {
      setError('Erreur chargement notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationMessage = (notif) => {
    switch (notif.type) {
      case 'testimony_like':
        return `${notif.actor_name} a aimé votre témoignage`;
      case 'testimony_comment':
        return `${notif.actor_name} a commenté votre témoignage`;
      case 'comment_like':
        return `${notif.actor_name} a aimé votre commentaire`;
      default:
        return 'Nouvelle notification';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'testimony_like':
        return '❤️';
      case 'testimony_comment':
        return '💬';
      case 'comment_like':
        return '👍';
      default:
        return '📢';
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return notifDate.toLocaleDateString('fr-FR');
  };

  const handleNotificationClick = (notif) => {
    // Navigate to the testimony
    navigate(`/community?testimony=${notif.testimony_id}`);
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ←
        </button>
        <h1>Notifications</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <p>Aucune notification pour le moment</p>
          <p className="empty-hint">Partagez un témoignage pour recevoir des commentaires et des réactions</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notif) => (
            <div
              key={notif.notification_id}
              className="notification-item"
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="notification-content">
                <p className="notification-message">
                  {getNotificationMessage(notif)}
                </p>
                <p className="notification-testimony">
                  {notif.title}
                </p>
                {notif.comment_content && (
                  <p className="notification-comment">
                    « {notif.comment_content.substring(0, 100)}
                    {notif.comment_content.length > 100 ? '...' : ''}
                    »
                  </p>
                )}
                <p className="notification-date">
                  {formatDate(notif.created_at)}
                </p>
              </div>

              <div className="notification-arrow">›</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
